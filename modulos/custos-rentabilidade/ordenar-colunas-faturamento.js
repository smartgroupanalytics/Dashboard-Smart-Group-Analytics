/* Smart Group Analytics — personalização de colunas APENAS em Custos e Rentabilidade / Faturamento.
   Os TH/TD são movidos juntos, sem recalcular dados ou alterar exportações e outras tabelas.
   Preferência isolada por UID: Firestore (compartilhada entre aparelhos) e cache local de contingência. */
import { auth, db } from '../../firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

(() => {
  'use strict';

  const TABLE_SELECTOR = '#billingView > .table-wrap > table';
  const COLLECTION = 'custos_rentabilidade_preferencias';
  const STORAGE_PREFIX = 'smartgroup-analytics:custos-rentabilidade:faturamento:ordem-colunas:v2:';
  const COLUMN_KEYS = Object.freeze([
    'data', 'empresa', 'produto', 'descricao', 'pedido', 'op', 'nota',
    'quantidade', 'venda', 'valor-produto', 'valor-tabela', 'materia-prima',
    'mao-obra', 'imposto', 'frete', 'comissao', 'percentual-comissao',
    'custo-total', 'lucro', 'margem-base', 'percentual-margem', 'detalhar'
  ]);
  const DEFAULT_ORDER = [...COLUMN_KEYS];

  let table;
  let headings;
  let tbody;
  let order = [...DEFAULT_ORDER];
  let uid = null;
  let draggedKey = null;
  let scheduled = false;
  let changes = 0;
  let authEpoch = 0;
  let saveChain = Promise.resolve();
  let statusEl = null;

  function validOrder(value) {
    return Array.isArray(value) && value.length === COLUMN_KEYS.length
      && new Set(value).size === COLUMN_KEYS.length
      && COLUMN_KEYS.every(key => value.includes(key));
  }

  function localKey(currentUid) {
    return `${STORAGE_PREFIX}${currentUid}`;
  }

  function getLocal(currentUid) {
    if (!currentUid) return null;
    try {
      const entry = JSON.parse(localStorage.getItem(localKey(currentUid)) || 'null');
      if (!entry || !validOrder(entry.order)) return null;
      return { order: entry.order, updatedAtMs: Number(entry.updatedAtMs || 0) };
    } catch (_error) {
      return null;
    }
  }

  function putLocal(currentUid, newOrder, updatedAtMs) {
    if (!currentUid) return;
    try {
      localStorage.setItem(localKey(currentUid), JSON.stringify({
        order: newOrder,
        updatedAtMs: updatedAtMs || Date.now()
      }));
    } catch (_error) { /* Ex.: modo privado. O funcionamento da tabela é preservado. */ }
  }

  function status(message, warning = false) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.title = message;
    statusEl.classList.toggle('billing-column-warning', warning);
  }

  function moveCells(row, cells) {
    if (cells.length !== COLUMN_KEYS.length || cells.some(cell => !cell)) return;
    if (cells.every((cell, i) => row.children[i] === cell)) return;
    row.append(...cells); // move os elementos existentes, com conteúdos, estilos e eventos.
  }

  function applyRow(row) {
    // Linhas informativas com colspan ("Nenhum registro") permanecem intactas.
    if (row.cells.length !== COLUMN_KEYS.length) return;
    const cells = Array.from(row.cells);
    // As linhas geradas por renderBilling() sempre chegam na ordem padrão.
    if (!cells.every(cell => COLUMN_KEYS.includes(cell.dataset.faturamentoColuna))) {
      cells.forEach((cell, i) => { cell.dataset.faturamentoColuna = COLUMN_KEYS[i]; });
    }
    const byKey = new Map(Array.from(row.cells, cell => [cell.dataset.faturamentoColuna, cell]));
    moveCells(row, order.map(key => byKey.get(key)));
  }

  function applyOrder() {
    if (!headings || !tbody) return;
    const keyed = new Map(Array.from(headings.cells, th => [th.dataset.faturamentoColuna, th]));
    moveCells(headings, order.map(key => keyed.get(key)));
    Array.from(tbody.rows).forEach(applyRow);
  }

  function scheduleRows() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applyOrder();
    });
  }

  function clearDrag() {
    if (!headings) return;
    headings.querySelectorAll('th').forEach(th => {
      th.classList.remove('billing-col-dragging', 'billing-col-drop-target');
      th.removeAttribute('aria-grabbed');
    });
    draggedKey = null;
  }

  function prefRef(currentUid) {
    return doc(db, COLLECTION, currentUid);
  }

  function persistOrder() {
    if (!uid) {
      status('Entre com seu usuário para salvar a ordem das colunas.', true);
      return;
    }
    const forUid = uid;
    const snapshot = [...order];
    const changeToken = changes;
    const timestamp = Date.now();
    putLocal(forUid, snapshot, timestamp);
    status('Salvando ordem para seu usuário…');

    // Enfileira para não deixar um arraste anterior sobrescrever o mais recente na nuvem.
    saveChain = saveChain.catch(() => {}).then(async () => {
      if (uid !== forUid) return;
      try {
        await setDoc(prefRef(forUid), {
          ordemColunasFaturamento: snapshot,
          atualizadoEm: serverTimestamp()
        }, { merge: true });
        if (uid === forUid && changes === changeToken) status('Ordem salva no seu usuário.');
      } catch (error) {
        console.warn('[Custos e Rentabilidade] Não foi possível sincronizar a ordem no Firestore:', error);
        if (uid === forUid && changes === changeToken) {
          status('Salvo neste navegador. Ative a regra de preferências para sincronizar outros computadores.', true);
        }
      }
    });
  }

  function reorder(source, target) {
    if (!uid || !COLUMN_KEYS.includes(source) || !COLUMN_KEYS.includes(target) || source === target) return;
    const next = [...order];
    const sourceIndex = next.indexOf(source);
    const targetIndex = next.indexOf(target);
    next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, source);
    order = next;
    changes++;
    applyOrder();
    persistOrder();
  }

  async function restoreForUser(user) {
    const epoch = ++authEpoch;
    uid = user?.uid || null;
    changes = 0;
    clearDrag();
    if (!uid) {
      order = [...DEFAULT_ORDER];
      applyOrder();
      status('Entre para personalizar as colunas.', true);
      return;
    }
    const currentUid = uid;
    const local = getLocal(currentUid);
    order = local ? [...local.order] : [...DEFAULT_ORDER];
    applyOrder();
    status('Sincronizando sua preferência de colunas…');
    const startedAtChange = changes;

    try {
      const saved = await getDoc(prefRef(currentUid));
      if (epoch !== authEpoch || uid !== currentUid || changes !== startedAtChange) return;
      const value = saved.exists() ? saved.data() : null;
      const cloudOrder = value?.ordemColunasFaturamento;
      const cloudTime = typeof value?.atualizadoEm?.toMillis === 'function'
        ? value.atualizadoEm.toMillis() : Number(value?.atualizadoEmMs || 0);

      if (validOrder(cloudOrder) && (!local || cloudTime >= local.updatedAtMs)) {
        order = [...cloudOrder];
        putLocal(currentUid, order, cloudTime || Date.now());
        applyOrder();
        status('Ordem salva no seu usuário.');
      } else if (local) {
        // Após uso offline, preserva a preferência local mais recente e sincroniza.
        order = [...local.order];
        applyOrder();
        persistOrder();
      } else {
        status('Ordem padrão. Arraste um título para personalizar.');
      }
    } catch (error) {
      console.warn('[Custos e Rentabilidade] Leitura da preferência indisponível:', error);
      if (epoch === authEpoch && uid === currentUid && changes === startedAtChange) {
        status('Ordem local disponível. Para sincronizar em outros PCs, configure a regra de preferências.', true);
      }
    }
  }

  function init() {
    table = document.querySelector(TABLE_SELECTOR);
    if (!table) return;
    headings = table.tHead?.rows?.[0];
    tbody = table.tBodies?.[0];
    statusEl = document.getElementById('statusColunasFaturamento');
    if (!headings || !tbody || headings.cells.length !== COLUMN_KEYS.length) {
      console.warn('[Custos e Rentabilidade] Ordenação desativada: tabela com estrutura diferente da versão esperada.');
      status('A ordenação não está disponível para esta versão da tabela.', true);
      return;
    }

    Array.from(headings.cells).forEach((th, index) => {
      th.dataset.faturamentoColuna = COLUMN_KEYS[index];
      th.draggable = true;
      th.tabIndex = 0;
      th.classList.add('billing-col-movable');
      th.setAttribute('aria-label', `${th.textContent.trim() || 'Ações'}. Arraste para outra posição. Também é possível usar Alt + setas.`);
    });

    headings.addEventListener('dragstart', event => {
      const th = event.target.closest?.('th[data-faturamento-coluna]');
      if (!uid || !th) return;
      draggedKey = th.dataset.faturamentoColuna;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', draggedKey);
      th.classList.add('billing-col-dragging');
      th.setAttribute('aria-grabbed', 'true');
    });

    headings.addEventListener('dragover', event => {
      const th = event.target.closest?.('th[data-faturamento-coluna]');
      if (!uid || !draggedKey || !th) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      headings.querySelectorAll('.billing-col-drop-target').forEach(el => el.classList.remove('billing-col-drop-target'));
      if (th.dataset.faturamentoColuna !== draggedKey) th.classList.add('billing-col-drop-target');
    });

    headings.addEventListener('drop', event => {
      const th = event.target.closest?.('th[data-faturamento-coluna]');
      if (!uid || !draggedKey || !th) return;
      event.preventDefault();
      const source = draggedKey;
      const destination = th.dataset.faturamentoColuna;
      clearDrag();
      reorder(source, destination);
    });
    headings.addEventListener('dragend', clearDrag);

    // Acessível pelo teclado, inclusive quando os cabeçalhos já foram movidos.
    headings.addEventListener('keydown', event => {
      if (!event.altKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
      const th = event.target.closest?.('th[data-faturamento-coluna]');
      const source = th?.dataset.faturamentoColuna;
      if (!uid || !COLUMN_KEYS.includes(source)) return;
      const position = order.indexOf(source);
      const destination = order[position + (event.key === 'ArrowLeft' ? -1 : 1)];
      if (!destination) return;
      event.preventDefault();
      reorder(source, destination);
      th.focus();
    });

    document.getElementById('restaurarColunasFaturamento')?.addEventListener('click', () => {
      if (!uid) return;
      order = [...DEFAULT_ORDER];
      changes++;
      clearDrag();
      applyOrder();
      persistOrder(); // grava o padrão na conta; impede que a ordem antiga reapareça.
    });

    // Filtragem, paginação e importação recriam o tbody. Mantemos todas as células alinhadas.
    new MutationObserver(scheduleRows).observe(tbody, { childList: true });
    applyOrder();
    onAuthStateChanged(auth, restoreForUser, error => {
      console.warn('[Custos e Rentabilidade] Não foi possível identificar o usuário:', error);
      status('Não foi possível identificar o usuário. Personalização indisponível.', true);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
