// SMART GROUP ANALYTICS — ANÁLISE DE FORNECEDORES
// Entrada independente; nunca publica a base de fornecedores no GitHub.
// Firebase Auth + perfil Compras; upload: UIDs de compras_config/permissoes ou admin principal.
import { protegerModulo } from '../../../module-guard.js?v=3';
import { auth, db } from '../../../firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {
  doc, collection, setDoc, getDocs, onSnapshot, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const ADMIN_PRINCIPAL_UID = 'IYjFcuc0PXYvkq7vt97NtkUknQD3'; // igual ao módulo original de Compras
const BASE_REF = doc(db, 'compras_fornecedores', 'atual');
const EDITORES_REF = doc(db, 'compras_config', 'permissoes');
const MAX_MB = 15;
const CHUNK_LIMIT = 180;
const CHUNK_MAX_BYTES = 200_000;
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const NUMBER = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const PERCENT = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const $ = id => document.getElementById(id);
const money = value => BRL.format(Number(value) || 0);
const fmt = value => NUMBER.format(Number(value) || 0);
const pct = v => `${PERCENT.format((v || 0) * 100)}%`;
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const clean = value => String(value ?? '').trim().slice(0, 250);
const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);

let base = [];
let currentUser = null;
let canUpload = false;
let uploading = false;
let requestId = 0;
let currentVersion = '';
let charts = [];
let ready = false;

function showStatus(message, kind='') {
  $('sgf-state').className = 'sgf-state' + (kind ? ' ' + kind : '');
  $('sgf-state').textContent = message;
}
function updateUploadUI() {
  $('sgf-import-label').hidden = !canUpload;
  $('sgf-upload').disabled = !canUpload || uploading;
}
function clearSensitive() {
  ++requestId;
  currentVersion = '';
  base = [];
  renderPeriods();
  render();
  document.documentElement.style.visibility = 'hidden';
}
function redirect(path) {
  clearSensitive();
  window.location.replace(path);
}
function isAuthorizedProfile(d) {
  return d?.ativo === true && (
    normalize(d?.perfil) === 'administrador' || d?.modulos?.compras === true
  );
}
function limitNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const text = String(value ?? '').trim().replace(/\s/g, '').replace(/^R\$/i, '');
  if (!text) return 0;
  // Formato brasileiro: 1.234,56. Também aceita número com ponto decimal.
  const numeric = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text;
  const v = Number(numeric);
  return Number.isFinite(v) ? v : 0;
}
function normalOrigin(value) {
  const s = normalize(value);
  if (s.includes('nacion') || s === 'brasil') return 'Nacional';
  if (s.includes('import') || s.includes('exterior')) return 'Importado';
  return 'Não informado';
}
function validData(data) {
  if (!Array.isArray(data) || !data.length || data.length > 30) {
    throw new Error('A base deve conter entre 1 e 30 períodos.');
  }
  let total = 0;
  const normalized = data.map((period, i) => {
    const name = clean(period?.period);
    if (!name || !Array.isArray(period?.suppliers)) throw new Error('Período inválido na base.');
    const suppliers = period.suppliers.map(s => {
      const supplier = clean(s?.supplier);
      const quantity = Number(s?.quantity);
      const value = Number(s?.value);
      if (!supplier || supplier.length > 250 || !Number.isFinite(value) || !Number.isFinite(quantity) || value < 0 || quantity < 0) {
        throw new Error(`Fornecedor inválido no período ${i + 1}.`);
      }
      return { supplier, quantity, value, origin:normalOrigin(s?.origin) };
    });
    total += suppliers.length;
    if (!suppliers.length) throw new Error(`O período ${name} não contém fornecedores.`);
    return { period: name, suppliers };
  });
  if (total > 100_000) throw new Error('A planilha excede o limite de 100 mil linhas de fornecedores.');
  if (new Set(normalized.map(v => normalize(v.period))).size !== normalized.length) {
    throw new Error('Existem períodos duplicados na planilha.');
  }
  return normalized;
}

function parseFile(file) {
  if (/\.json$/i.test(file.name)) {
    return file.text().then(text => validData(JSON.parse(text)));
  }
  return new Promise((resolve, reject) => {
    if (!window.XLSX) { reject(new Error('Leitor Excel indisponível. Confira a conexão e recarregue a página.')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler o Excel.'));
    reader.onload = () => {
      try {
        const wb = XLSX.read(reader.result, {type:'array'});
        const periods = [];
        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          const grid = XLSX.utils.sheet_to_json(ws, {header:1, defval:null});
          if (!grid.length) continue;
          const header = grid[0] || [];
          // Formato de origem: tabela geral em A:E e nacionais em F:J ou G:K.
          const hasNationalF = normalize(header[5]).includes('rotulos de linha') || normalize(header[5]).includes('razao social');
          const hasNationalG = normalize(header[6]).includes('razao social') || normalize(header[6]).includes('rotulos de linha');
          const rightColumn = hasNationalG ? 6 : hasNationalF ? 5 : null;
          const national = new Set();
          if (rightColumn !== null) {
            for (const row of grid.slice(1)) {
              const sup = clean(row[rightColumn]);
              if (sup && !/^(total|rotulos|razao social)/i.test(normalize(sup))) national.add(normalize(sup));
            }
          }
          const records = new Map();
          for (const row of grid.slice(1)) {
            const supplier = clean(row[0]);
            if (!supplier || /^(total( geral)?|rotulos de linha|razao social|fornecedor)$/i.test(normalize(supplier))) continue;
            const value = limitNumber(row[2]);
            const quantity = limitNumber(row[1]);
            if (value < 0 || quantity < 0 || (!value && !quantity)) continue;
            const explicitOrigin = normalOrigin(row[4]);
            const origin = explicitOrigin !== 'Não informado' ? explicitOrigin :
              national.has(normalize(supplier)) ? 'Nacional' : 'Não informado';
            const key = normalize(supplier);
            const found = records.get(key);
            if (found) {
              found.value += value;
              found.quantity += quantity;
              if (origin === 'Importado' || (found.origin === 'Não informado' && origin === 'Nacional')) found.origin = origin;
            } else {
              records.set(key, {supplier, quantity, value, origin});
            }
          }
          if (!records.size) continue;
          const period = /1\s*[ºo°]?\s*semestre/i.test(sheetName) ? '1º Semestre' :
            /2\s*[ºo°]?\s*semestre/i.test(sheetName) ? '2º Semestre' : sheetName;
          periods.push({period, suppliers:[...records.values()]});
        }
        if (!periods.length) throw new Error('Não encontrei tabela válida de fornecedores nas abas. Confirme o modelo ABC FORNECEDORES.xlsx.');
        resolve(validData(periods));
      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
}

function splitChunks(periods) {
  // Mantém período com a linha; suporta diferentes abas e grandes volumes.
  const flat = periods.flatMap(p => p.suppliers.map(s => ({...s, period:p.period})));
  const chunks = [];
  const encoder = new TextEncoder();
  let current = [];
  for (const item of flat) {
    const candidate = [...current, item];
    if (candidate.length > CHUNK_LIMIT || encoder.encode(JSON.stringify(candidate)).length > CHUNK_MAX_BYTES) {
      if (!current.length) throw new Error('Um registro excede o limite permitido.');
      chunks.push(current);
      current = [item];
    } else { current = candidate; }
  }
  if (current.length) chunks.push(current);
  if (chunks.length > 1000) throw new Error('Quantidade de registros acima do limite suportado para importação.');
  return chunks;
}

function unpackChunks(snapshot, expectedRecords) {
  const docs = snapshot.docs.slice().sort((a,b) => Number(a.data().indice)-Number(b.data().indice));
  if (docs.some((d,i) => Number(d.data().indice) !== i)) throw new Error('Sequência incompleta de partes da base.');
  const flat = docs.flatMap(d => d.data().fornecedores || []);
  if (flat.length !== expectedRecords) throw new Error('Contagem da base publicada não corresponde às partes.');
  const periods = new Map();
  for (const row of flat) {
    const name = clean(row.period);
    if (!periods.has(name)) periods.set(name, {period:name, suppliers:[]});
    periods.get(name).suppliers.push(row);
  }
  return validData([...periods.values()]);
}

async function onUpload(file) {
  if (!file || !canUpload || uploading) return;
  if (!/\.(xlsx|xls|json)$/i.test(file.name)) { showStatus('Selecione .xlsx, .xls ou .json.', 'error'); return; }
  if (file.size > MAX_MB * 1024 * 1024) { showStatus(`Arquivo maior que ${MAX_MB} MB.`, 'error'); return; }
  uploading = true; updateUploadUI();
  try {
    showStatus('Conferindo estrutura da planilha...');
    const parsed = await parseFile(file);
    const confirmMessage = `Publicar ${parsed.reduce((n,p)=>n+p.suppliers.length,0)} fornecedores de ${parsed.length} período(s) para os usuários de Compras?\nA nova base substituirá a versão exibida.`;
    if (!window.confirm(confirmMessage)) { showStatus('Importação cancelada. A base anterior foi preservada.'); return; }
    const chunks = splitChunks(parsed);
    const id = 'v' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    const parts = collection(db, 'compras_fornecedores', 'atual', 'versoes', id, 'partes');
    const rows = parsed.reduce((sum,p) => sum + p.suppliers.length, 0);
    for (let i = 0; i < chunks.length; i++) {
      showStatus(`Gravando parte ${i + 1} de ${chunks.length} no Firebase...`);
      await setDoc(doc(parts, String(i).padStart(5, '0')), { indice:i, fornecedores:chunks[i] });
    }
    // Publicar a nova versão apenas depois de TODAS as partes terem sido confirmadas.
    await setDoc(BASE_REF, {
      versaoAtiva:id, partes:chunks.length, registros:rows,
      arquivo:clean(file.name), atualizadoEm:serverTimestamp(),
      atualizadoPorUid:currentUser.uid,
      atualizadoPorNome:clean(currentUser.displayName || currentUser.email || 'Usuário autorizado')
    });
    showStatus(`Importação concluída: ${rows} linhas de fornecedores de ${parsed.length} período(s).`, 'ok');
  } catch (e) { console.error('Erro na importação de fornecedores:',e); showStatus('Falha na importação: ' + (e?.message || 'erro desconhecido'), 'error'); }
  finally { uploading=false; $('sgf-upload').value=''; updateUploadUI(); }
}

function getRows() {
  const period = $('sgf-period').value;
  const origin = $('sgf-origin').value;
  const search = normalize($('sgf-search').value);
  const selected = period === 'Todos' ? base : base.filter(p => p.period === period);
  const merged = new Map();
  for (const p of selected) for (const supplier of p.suppliers) {
    const key = normalize(supplier.supplier);
    const prev = merged.get(key) || {supplier:supplier.supplier, value:0, quantity:0, origin:'Não informado'};
    prev.value += supplier.value;
    prev.quantity += supplier.quantity;
    if (supplier.origin === 'Importado') prev.origin = 'Importado';
    else if (prev.origin !== 'Importado' && supplier.origin === 'Nacional') prev.origin = 'Nacional';
    merged.set(key, prev);
  }
  return [...merged.values()].filter(r => (origin === 'Todas' || r.origin === origin) && normalize(r.supplier).includes(search));
}
function abcRows(rows) {
  const ordered = [...rows].sort((a,b) => b.value-a.value);
  const total = ordered.reduce((a,b) => a+b.value,0);
  let running = 0;
  return ordered.map(r => {
    const share = total ? r.value/total : 0;
    const cls = running < .8 ? 'A' : running < .95 ? 'B' : 'C';
    running += share;
    return {...r, share, abc:cls};
  });
}
function semesterComparison() {
  const first = base.find(p => p.period === '1º Semestre') || base[0];
  const second = base.find(p => p.period === '2º Semestre') || base[1];
  if (!first || !second || first === second) return {labels:[],left:[],right:[],a:'1º Semestre',b:'2º Semestre'};
  const suppliers = new Map();
  for (const p of [first,second]) for (const s of p.suppliers) {
    const key = normalize(s.supplier);
    const cur = suppliers.get(key) || {supplier:s.supplier,a:0,b:0};
    cur[p === first ? 'a':'b'] += s.value;
    suppliers.set(key,cur);
  }
  const ordered = [...suppliers.values()].sort((a,b) => Math.max(b.a,b.b)-Math.max(a.a,a.b)).slice(0,8);
  return {labels:ordered.map(r=>r.supplier),left:ordered.map(r=>r.a),right:ordered.map(r=>r.b),a:first.period,b:second.period};
}
function formatShortMoney(value) {
  return Math.abs(value) >= 1e6 ? `R$ ${(value/1e6).toFixed(1)} mi` :
    Math.abs(value) >= 1000 ? `R$ ${(value/1000).toFixed(0)} mil` : money(value);
}
function buildChart(id, type, labels, datasets, extra={}) {
  const canvas = $(id);
  if (!window.Chart) { canvas.style.display='none'; return; }
  canvas.style.display='block';
  const chart = new window.Chart(canvas, {
    type, data:{labels, datasets}, options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:type!=='bar'||datasets.length>1,labels:{color:'#b4cde9',boxWidth:12}},
        tooltip:{callbacks:{label:ctx => `${ctx.dataset.label || ctx.label}: ${money(ctx.dataset.data[ctx.dataIndex])}`}}},
      scales:type==='doughnut'?{}:extra.indexAxis==='y' ? {x:{ticks:{color:'#98b8da',callback:formatShortMoney},grid:{color:'#274264'},beginAtZero:true},y:{ticks:{color:'#98b8da',font:{size:10}},grid:{display:false}}} : {x:{ticks:{color:'#98b8da',maxRotation:30,minRotation:10,font:{size:10}},grid:{display:false}},y:{ticks:{color:'#98b8da',callback:formatShortMoney},grid:{color:'#274264'},beginAtZero:true}},
      ...extra
    }
  });
  charts.push(chart);
}
function renderCharts(rows,total) {
  charts.forEach(c=>c.destroy()); charts=[];
  const top = [...rows].sort((a,b)=>b.value-a.value).slice(0,8);
  const abc = abcRows(rows);
  const cats = ['A','B','C'].map(k => abc.filter(r=>r.abc===k).reduce((sum,r)=>sum+r.value,0));
  buildChart('sgf-bar','bar',top.map(r=>r.supplier),[{label:'Valor comprado',data:top.map(r=>r.value),backgroundColor:'#3191ff',borderRadius:5}],{indexAxis:'y'});
  buildChart('sgf-pie','doughnut',['Classe A','Classe B','Classe C'],[{label:'Valor',data:cats,backgroundColor:['#2686f6','#edbc54','#758cae'],borderWidth:0}],{cutout:'65%',scales:{}});
  const compare = semesterComparison();
  buildChart('sgf-compare','bar',compare.labels,[
    {label:compare.a,data:compare.left,backgroundColor:'#3191ff',borderRadius:4},
    {label:compare.b,data:compare.right,backgroundColor:'#48c7ab',borderRadius:4}
  ]);
  $('sgf-abc-summary').innerHTML = cats.map((value,i)=>`<span><b>${'ABC'[i]}</b> ${pct(total ? value/total : 0)}</span>`).join('');
}
function renderPeriods() {
  const current = $('sgf-period').value;
  $('sgf-period').replaceChildren(new Option('Todos','Todos'));
  for (const p of base) $('sgf-period').add(new Option(p.period,p.period));
  $('sgf-period').value = [...$('sgf-period').options].some(o=>o.value===current) ? current : 'Todos';
}
function render() {
  const rows = getRows();
  const total = rows.reduce((sum,r)=>sum+r.value,0);
  const quantity = rows.reduce((sum,r)=>sum+r.quantity,0);
  const top = [...rows].sort((a,b)=>b.value-a.value);
  const sorted = abcRows(rows);
  const top5 = total ? top.slice(0,5).reduce((sum,r)=>sum+r.value,0)/total : 0;
  $('sgf-total').textContent=money(total);
  $('sgf-qty').textContent=fmt(quantity);
  $('sgf-count').textContent=fmt(rows.length);
  $('sgf-top5').textContent=pct(top5);
  $('sgf-largest').textContent=top[0]?.supplier || '—';
  $('sgf-largest-detail').textContent=top[0] ? `${money(top[0].value)} · ${pct(top[0].value/total)} do total` : 'Sem fornecedor para o filtro';
  $('sgf-table-info').textContent=`${rows.length} fornecedor(es) · classificação ABC recalculada`;
  const key = $('sgf-sort').value;
  sorted.sort((a,b)=>(b[key]||0)-(a[key]||0));
  $('sgf-tbody').innerHTML=sorted.length ? sorted.map((r,i)=>{
    const originClass = r.origin === 'Nacional' ? 'nacional' : r.origin === 'Importado' ? 'importado' : 'desconhecido';
    return `<tr><td>${i+1}</td><td class="sgf-supplier">${html(r.supplier)}</td><td><span class="sgf-origin ${originClass}">${html(r.origin)}</span></td><td class="numeric">${fmt(r.quantity)}</td><td class="numeric sgf-value">${money(r.value)}</td><td class="numeric">${pct(r.share)}<span class="sgf-share-track"><i style="width:${Math.min(r.share*100,100)}%"></i></span></td><td><span class="sgf-abc ${r.abc}">${r.abc}</span></td></tr>`;
  }).join('') : '<tr><td colspan="7" class="sgf-empty">Nenhum fornecedor encontrado para os filtros selecionados.</td></tr>';
  renderCharts(rows,total);
  requestAnimationFrame(sendHeight);
}
function downloadCSV() {
  const rows = abcRows(getRows()).sort((a,b)=>(b[$('sgf-sort').value]||0)-(a[$('sgf-sort').value]||0));
  const table = [['Fornecedor','Origem','Quantidade','Valor (R$)','Participação (%)','Classe ABC'],
    ...rows.map(r=>[r.supplier,r.origin,r.quantity,r.value,Number((r.share*100).toFixed(4)),r.abc])];
  const str='\uFEFF'+table.map(row=>row.map(cell=>'"'+String(cell).replaceAll('"','""')+'"').join(';')).join('\r\n');
  const uri=URL.createObjectURL(new Blob([str], {type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=uri;a.download='ranking-fornecedores-smart-group.csv';a.click();
  setTimeout(()=>URL.revokeObjectURL(uri),1000);
}
function sendHeight() {
  if (window.parent===window) return;
  window.parent.postMessage({type:'sgf:height',height:document.body.scrollHeight},window.location.origin);
}
function initEvents() {
  ['sgf-period','sgf-origin','sgf-search','sgf-sort'].forEach(id=>$(id).addEventListener(id==='sgf-search'?'input':'change',render));
  $('sgf-reset').addEventListener('click',()=>{$('sgf-period').value='Todos';$('sgf-origin').value='Todas';$('sgf-search').value='';render();});
  $('sgf-export').addEventListener('click',downloadCSV);
  $('sgf-upload').addEventListener('change',e=>onUpload(e.target.files?.[0]));
  if ('ResizeObserver' in window) new ResizeObserver(sendHeight).observe(document.body);
  window.addEventListener('load',sendHeight);
}

async function boot() {
  initEvents();
  try { await protegerModulo('compras'); }
  catch (e) { console.warn('Compras: autenticação/permissão negada.',e); redirect('../../../index.html'); return; }
  currentUser = auth.currentUser;
  if (!currentUser) { redirect('../../../login.html'); return; }
  ready = true;
  document.documentElement.style.visibility='visible';
  render(); sendHeight();

  // A assinatura individual revoga imediatamente a visualização em caso de logout.
  onAuthStateChanged(auth, u => { if (!u || u.uid!==currentUser.uid) redirect('../../../login.html'); });
  onSnapshot(doc(db,'usuarios',currentUser.uid),snap=>{
    if (!snap.exists() || !isAuthorizedProfile(snap.data())) redirect('../../../index.html');
  }, e => { console.warn('Perfil não disponível:',e); redirect('../../../index.html'); });

  onSnapshot(EDITORES_REF,{includeMetadataChanges:true},snap=>{
    const editorUids=snap.data()?.editorUids;
    const isEditor = !snap.metadata.fromCache && Array.isArray(editorUids) && editorUids.includes(currentUser.uid);
    canUpload=currentUser.uid===ADMIN_PRINCIPAL_UID || isEditor;
    updateUploadUI();
  },err=>{
    canUpload=currentUser.uid===ADMIN_PRINCIPAL_UID;
    updateUploadUI();
    console.warn('Não foi possível confirmar importadores:',err);
  });

  onSnapshot(BASE_REF,{includeMetadataChanges:true},async snap=>{
    const token=++requestId;
    if (!snap.exists()) {
      if(snap.metadata.fromCache){showStatus('Consultando a base compartilhada...');return;}
      base=[];currentVersion='';renderPeriods();render();
      $('sgf-meta').textContent='Ainda não há planilha de fornecedores publicada no Firebase.';
      showStatus('A base de fornecedores está vazia. Um usuário autorizado pode importar a primeira planilha.');
      return;
    }
    const info=snap.data();
    if (!info.versaoAtiva || !Number.isInteger(info.partes) || !Number.isInteger(info.registros)){
      showStatus('Metadados da planilha inválidos.','error');return;
    }
    if (currentVersion===info.versaoAtiva && base.length) return;
    try {
      showStatus('Carregando fornecedores do Firebase...');
      const parts=collection(db,'compras_fornecedores','atual','versoes',info.versaoAtiva,'partes');
      const snapshot=await getDocs(parts);
      if (token!==requestId) return;
      if (snapshot.size!==info.partes) throw new Error('Nem todas as partes da versão publicada estão disponíveis.');
      const validated=unpackChunks(snapshot,info.registros);
      if (token!==requestId) return;
      base=validated;currentVersion=info.versaoAtiva;
      renderPeriods();render();
      const time=info.atualizadoEm?.toDate?.()?.toLocaleString('pt-BR') || 'aguardando servidor';
      $('sgf-meta').textContent=`Base compartilhada: ${info.arquivo || 'planilha'} · ${info.registros} linhas · ${base.length} período(s) · Atualizado em ${time} por ${info.atualizadoPorNome||'usuário autorizado'}`;
      if (!uploading) showStatus('Dados sincronizados do Firebase.','ok');
    } catch(e) {
      if(token!==requestId) return;
      // Uma falha não mostra números da nova versão nem dados que perderam autorização.
      base=[];currentVersion='';renderPeriods();render();
      showStatus('Não foi possível carregar a base: '+(e?.message||'Erro de leitura'),'error');
      console.error('Leitura de fornecedores:',e);
    }
  },err=>{
    base=[];currentVersion='';renderPeriods();render();
    showStatus('Falha na leitura do Firebase: '+(err.code||err.message),'error');
  });
}
boot().catch(err=>{console.error('Módulo de fornecedores não iniciou:',err);showStatus('Erro ao iniciar o módulo de fornecedores.','error');});
