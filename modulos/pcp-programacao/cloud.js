/**
 * SMART GROUP ANALYTICS — PCP PROGRAMAÇÃO
 * Cache compartilhado (persistente) no Cloud Firestore.
 * Não altera os módulos de Produção ou de Estoque.
 */
import { protegerModulo } from '../../module-guard.js';
import { auth, db } from '../../firebase-config.js';
import {
  doc, getDocFromServer, setDoc, onSnapshot, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const CAMINHO_ATUAL = doc(db, 'pcp_programacao', 'atual');
const TAMANHO_PARTE = 145000; // Cada documento fica bem abaixo de 1 MiB.
const MAX_PARTES = 200;
const $ = id => document.getElementById(id);
let autorizado = false;
let podeCarregar = false;
let salvando = false;
let ultimoId = '';
let versaoVisualizada = 0;
let envioAtual = 0;

function status(titulo, detalhe = '', tipo = '') {
  // A ausência de um elemento visual não pode interromper a gravação no Firestore.
  const box = $('syncBox');
  const tituloEl = $('syncTitulo');
  const detalheEl = $('syncDetalhe');
  if (box) box.dataset.tipo = tipo || 'aguardando';
  if (tituloEl) tituloEl.textContent = titulo;
  if (detalheEl) detalheEl.textContent = detalhe;
  if (!box || !tituloEl || !detalheEl) {
    console.warn('PCP: indicador de sincronização incompleto:', titulo, detalhe);
  }
}
function mensagemErro(err) {
  const code = String(err?.code || '');
  if (code.includes('permission-denied')) {
    return 'Permissão negada pelo Firestore. Publique as regras PCP e confira as permissões de acesso/carregamento.';
  }
  if (code.includes('unavailable') || !navigator.onLine) {
    return 'Sem conexão com o Firestore. A programação não foi confirmada na nuvem.';
  }
  return String(err?.message || err || 'Erro desconhecido');
}

// O formato JSON preserva todas as informações do Excel já interpretadas pelo layout:
// linhas, datas, formatos de células, colunas extras, ordem dos setores e período.
async function serializar(payload) {
  const txt = JSON.stringify(payload);
  if (new TextEncoder().encode(txt).length > 28 * 1024 * 1024) {
    throw new Error('Programação muito grande para o cache PCP (limite: 28 MB de dados).');
  }
  if (!('CompressionStream' in window)) return { formato: 'json', conteudo: txt };
  const fluxo = new Blob([txt]).stream().pipeThrough(new CompressionStream('gzip'));
  const bytes = new Uint8Array(await new Response(fluxo).arrayBuffer());
  const blocos = [];
  for (let p = 0; p < bytes.length; p += 32768) {
    blocos.push(String.fromCharCode(...bytes.subarray(p, p + 32768)));
  }
  return { formato: 'gzip-base64', conteudo: btoa(blocos.join('')) };
}
async function deserializar(formato, conteudo) {
  if (formato === 'json') return JSON.parse(conteudo);
  if (formato !== 'gzip-base64') throw new Error('Formato de cache não reconhecido.');
  if (!('DecompressionStream' in window)) {
    throw new Error('Atualize o Chrome/Edge para descompactar a programação do PCP.');
  }
  const binario = atob(conteudo);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  const texto = await new Response(
    new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
  ).text();
  return JSON.parse(texto);
}
function rotulo(meta) {
  const data = meta.atualizadoEm?.toDate?.();
  const quando = data ? data.toLocaleString('pt-BR') : 'agora';
  const por = meta.atualizadoPor || 'usuário autorizado';
  return `${Number(meta.total || 0).toLocaleString('pt-BR')} OPs · ${meta.arquivo || 'Programação'} · ${quando} · ${por}`;
}
async function restaurar(meta) {
  if (salvando) return;
  if (!meta?.cargaId) {
    status('PCP pronto', 'Nenhuma planilha compartilhada foi cadastrada ainda.', '');
    return;
  }
  if (meta.cargaId === ultimoId) return;
  const token = ++versaoVisualizada;
  status('Carregando programação', `${meta.total || 0} OPs armazenadas no Firestore.`, '');
  if (!Number.isInteger(meta.partes) || meta.partes < 1 || meta.partes > MAX_PARTES) {
    throw new Error('Quantidade de partes do cache inválida.');
  }
  const partes = new Array(meta.partes);
  for (let inicio = 0; inicio < meta.partes; inicio += 8) {
    const indices = Array.from({ length: Math.min(8, meta.partes - inicio) }, (_, i) => i + inicio);
    const documentos = await Promise.all(indices.map(i =>
      getDocFromServer(doc(db, 'pcp_programacao_cargas', meta.cargaId, 'partes', String(i)))
    ));
    if (token !== versaoVisualizada || salvando) return; // Importação local ou nova versão venceu.
    documentos.forEach((snap, n) => {
      if (!snap.exists() || typeof snap.data()?.conteudo !== 'string') {
        throw new Error(`Parte ${indices[n] + 1} ausente na programação compartilhada.`);
      }
      partes[indices[n]] = snap.data().conteudo;
    });
  }
  const pacote = await deserializar(meta.formato, partes.join(''));
  if (token !== versaoVisualizada || salvando) return;
  if (!pacote || pacote.versao !== 1 || !Array.isArray(pacote.rows) || pacote.rows.length !== meta.total) {
    throw new Error('O cache da programação está incompleto ou em versão incompatível.');
  }
  window.PCP_restaurar(pacote);
  ultimoId = meta.cargaId;
  status('Programação sincronizada', rotulo(meta), 'salvo');
}

async function gravar(arquivo) {
  if (!autorizado || !podeCarregar || salvando) return;
  salvando = true;
  ++versaoVisualizada; // Descarta qualquer carregamento anterior em andamento.
  const turno = ++envioAtual;
  $('file').disabled = true;
  status('Salvando programação...', 'Enviando os dados ao Firestore. Não feche esta página antes da confirmação.', '');
  try {
    const pacote = window.PCP_extrair();
    if (!Array.isArray(pacote.rows) || !pacote.rows.length) throw new Error('Nenhuma OP válida para salvar.');
    const compactado = await serializar(pacote);
    const texto = compactado.conteudo;
    const partes = [];
    for (let i = 0; i < texto.length; i += TAMANHO_PARTE) partes.push(texto.slice(i, i + TAMANHO_PARTE));
    if (!partes.length || partes.length > MAX_PARTES) {
      throw new Error('A programação ultrapassa a capacidade do cache. Divida a planilha em cargas menores.');
    }
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Sua sessão expirou. Entre no Analytics novamente.');
    const cargaId = `${Date.now()}_${uid.slice(0, 12)}_${crypto.randomUUID().slice(0, 8)}`;

    // Publicação atômica: somente depois de salvar TODAS as partes o ponteiro
    // /pcp_programacao/atual é atualizado. A versão anterior permanece utilizável
    // caso haja falha na importação.
    for (let i = 0; i < partes.length; i += 8) {
      await Promise.all(partes.slice(i, i + 8).map((conteudo, n) => {
        const indice = i + n;
        return setDoc(doc(db, 'pcp_programacao_cargas', cargaId, 'partes', String(indice)), {
          conteudo, indice, enviadoPor: uid, criadoEm: serverTimestamp()
        });
      }));
      status('Salvando programação...', `${Math.min(i + 8, partes.length)} de ${partes.length} partes enviadas ao Firestore.`, '');
    }
    const meta = {
      versao: 1, cargaId, partes: partes.length, formato: compactado.formato,
      total: pacote.rows.length,
      arquivo: String(arquivo || 'programacao.xlsx').slice(0, 180),
      atualizadoPor: String(window.usuarioAnalytics?.nome || auth.currentUser?.email || 'PCP').slice(0, 150),
      atualizadoPorUID: uid,
      atualizadoEm: serverTimestamp()
    };
    await setDoc(CAMINHO_ATUAL, meta);
    ultimoId = cargaId;
    status('Programação salva no Firestore', `${meta.total} OPs · ${meta.arquivo} · Disponível para todos os usuários PCP autorizados.`, 'salvo');
  } catch (err) {
    console.error('PCP: erro ao salvar a programação:', err);
    status('Falha ao salvar na nuvem', mensagemErro(err) + ' A planilha permanece aberta nesta aba, mas NÃO foi compartilhada.', 'erro');
  } finally {
    if (turno === envioAtual) {
      salvando = false;
      $('file').disabled = false;
    }
  }
}

async function iniciar() {
  try {
    const usuario = await protegerModulo('pcp-programacao');
    autorizado = true;
    const adm = String(usuario.perfil || '').trim().toLowerCase() === 'administrador';
    podeCarregar = adm || (usuario.modulos?.['pcp-programacao'] === true && usuario.modulos?.pcpCarga === true);
    window.PCP_podeImportar = podeCarregar;
    $('fileWrap').hidden = !podeCarregar;
    if (!podeCarregar) {
      $('msg').textContent = 'Consulta autorizada. A importação de planilhas está reservada aos responsáveis pelo PCP; é possível filtrar, imprimir e exportar.';
    }
    // Observador inicia antes da primeira leitura: garante atualização no F5
    // e mostra eventuais falhas de permissão mesmo para quem só consulta.
    onSnapshot(CAMINHO_ATUAL, snapshot => {
      if (!snapshot.exists()) {
        if (!salvando && !ultimoId) status('PCP pronto', 'Nenhuma programação publicada no Firestore.','');
        return;
      }
      if (salvando) return;
      const meta = snapshot.data();
      if (meta.cargaId && meta.cargaId !== ultimoId) {
        restaurar(meta).catch(err => {
          console.error('PCP: falha na atualização em tempo real', err);
          status('Erro ao atualizar programação', mensagemErro(err), 'erro');
        });
      }
    }, err => status('Sincronização interrompida', mensagemErro(err), 'erro'));
    // Confere o estado no servidor mesmo se o navegador tiver cache local.
    const atual = await getDocFromServer(CAMINHO_ATUAL);
    if (atual.exists()) await restaurar(atual.data());
    else if (!ultimoId) status('PCP pronto', 'Nenhuma programação compartilhada no Firestore ainda.','');
  } catch (err) {
    // protegerModulo redireciona acessos indevidos; para erros de leitura
    // mantenha a tela aberta SOMENTE quando a autenticação já foi validada.
    console.error('PCP: inicialização:', err);
    if (autorizado) status('Falha ao consultar o Firestore', mensagemErro(err), 'erro');
  }
}

window.addEventListener('pcp:importar', e => {
  if (!podeCarregar) {
    status('Acesso somente leitura', 'Seu usuário não pode substituir a programação compartilhada.','erro');
    return;
  }
  void gravar(e.detail?.arquivo);
});
void iniciar();
