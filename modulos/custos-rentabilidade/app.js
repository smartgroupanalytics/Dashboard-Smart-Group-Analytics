import { protegerModulo } from '../../module-guard.js?v=3';

const $ = id => document.getElementById(id);
const PAGE_SIZE = 100;
let base = null;
let records = [];
let filtered = [];
let groupedProducts = [];
let billingPage = 1;
let productsPage = 1;
let selectedProduct = null;
let productionBase = null;
let setupBase = null;
let moByOp = new Map();

const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const number = value => Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const percent = value => `${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const dateBR = value => {
  if (!value) return '—';
  const [y,m,d] = String(value).slice(0,10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : String(value);
};
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const meaningful = value => String(value ?? '').trim() && String(value).trim() !== '0';
const displayRef = value => meaningful(value) ? esc(value) : '—';
const optionalMoney = (value, mapped) => mapped ? money(value) : '—';

function sum(list, field){ return list.reduce((acc, item) => acc + Number(item[field] || 0), 0); }
function unique(list, field){ return [...new Set(list.map(r => String(r[field] ?? '').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR',{numeric:true})); }
function marginClass(value){ return Number(value) < 0 ? 'money-negative' : 'money-positive'; }

function normalizeOp(value){
  const text = String(value ?? '').trim();
  if(!meaningful(text)) return '';
  return text.replace(/^0+(?=\d)/,'');
}

function durationToMinutes(value){
  if(value === null || value === undefined || value === '') return 0;
  if(typeof value === 'number' && Number.isFinite(value)){
    // Caso futuro venha como fração de dia do Excel.
    return value > 0 && value < 1 ? value * 24 * 60 : value;
  }
  const text = String(value).trim();
  const parts = text.split(':').map(Number);
  if(parts.length === 2 && parts.every(Number.isFinite)) return (parts[0] * 60) + parts[1];
  if(parts.length === 3 && parts.every(Number.isFinite)) return (parts[0] * 60) + parts[1] + (parts[2] / 60);
  const numeric = Number(text.replace(',','.'));
  return Number.isFinite(numeric) ? numeric : 0;
}

function minutesToHHMM(value){
  const minutes = Math.max(0, Math.round(Number(value || 0)));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

function resourceKey(value){
  return String(value ?? '').trim().toLocaleUpperCase('pt-BR');
}

function buildMaoObraMap(productionRows=[],setupRows=[]){
  const groups = new Map();

  productionRows.forEach(row=>{
    const op = normalizeOp(row.op);
    if(!op) return;
    if(!groups.has(op)){
      groups.set(op,{
        op,
        producao:[],
        setups:[],
        qtdOP:0,
        qtdAprovada:0,
        tempoProducaoMin:0,
        tempoSetupMin:0,
        custoProducaoTotal:0,
        custoSetupTotal:0,
        custoMaoObraTotal:0,
        custoMaoObraUnitario:0,
        completo:true,
        pendencias:[]
      });
    }
    const g = groups.get(op);
    const minutos = durationToMinutes(row.tempoProducao);
    const custoMinutoInformado = Number(row.custoMinuto || 0);
    const custoHora = Number(row.vlrHoraHomem || 0);
    const custoMinuto = custoMinutoInformado > 0 ? custoMinutoInformado : (custoHora > 0 ? custoHora / 60 : 0);
    const custo = minutos * custoMinuto;
    const qtdOP = Number(row.qtdOP || 0);
    if(qtdOP > 0) g.qtdOP = Math.max(g.qtdOP,qtdOP);
    // A quantidade aprovada é a base correta para ratear a M.O. da OP.
    // Como a planilha pode trazer uma quantidade aprovada por etapa, usamos
    // o último valor positivo da OP (ordem original do relatório), que
    // representa a quantidade aprovada da operação final.
    const qtdAprovada = Number(row.qtdAprovada || 0);
    if(qtdAprovada > 0) g.qtdAprovada = qtdAprovada;
    if(minutos > 0 && custoMinuto <= 0){
      g.completo=false;
      g.pendencias.push(`Produção ${row.recurso || row.centroCusto || ''}: custo/minuto não encontrado`);
    }
    g.tempoProducaoMin += minutos;
    g.custoProducaoTotal += custo;
    g.producao.push({
      tipo:'Produção',
      centroCusto:String(row.centroCusto ?? ''),
      recurso:String(row.recurso ?? ''),
      minutos,
      tempo:minutesToHHMM(minutos),
      custoMinuto,
      custo
    });
  });

  groups.forEach(g=>{
    const rateByCenter = new Map();
    const rateByResource = new Map();
    g.producao.forEach(item=>{
      if(item.custoMinuto > 0){
        if(item.centroCusto) rateByCenter.set(String(item.centroCusto),item.custoMinuto);
        if(item.recurso) rateByResource.set(resourceKey(item.recurso),item.custoMinuto);
      }
    });

    setupRows
      .filter(row=>normalizeOp(row.op)===g.op && resourceKey(row.motivo)==='SETUP')
      .forEach(row=>{
        const minutos = durationToMinutes(row.duracao);
        const custoMinuto = rateByCenter.get(String(row.centroCusto ?? ''))
          || rateByResource.get(resourceKey(row.recurso))
          || 0;
        const custo = minutos * custoMinuto;
        if(minutos > 0 && custoMinuto <= 0){
          g.completo=false;
          g.pendencias.push(`Setup ${row.recurso || row.centroCusto || ''}: não foi possível localizar o custo/minuto da operação`);
        }
        g.tempoSetupMin += minutos;
        g.custoSetupTotal += custo;
        g.setups.push({
          tipo:'Setup',
          centroCusto:String(row.centroCusto ?? ''),
          recurso:String(row.recurso ?? ''),
          minutos,
          tempo:minutesToHHMM(minutos),
          custoMinuto,
          custo
        });
      });

    g.tempoTotalMin = g.tempoProducaoMin + g.tempoSetupMin;
    g.custoMaoObraTotal = g.custoProducaoTotal + g.custoSetupTotal;
    if(g.qtdAprovada > 0){
      g.custoMaoObraUnitario = g.custoMaoObraTotal / g.qtdAprovada;
    }else{
      g.completo=false;
      g.pendencias.push('Quantidade aprovada não encontrada para ratear o custo total');
    }
    g.tempoProducao = minutesToHHMM(g.tempoProducaoMin);
    g.tempoSetup = minutesToHHMM(g.tempoSetupMin);
    g.tempoTotal = minutesToHHMM(g.tempoTotalMin);
    g.etapas = [...g.setups,...g.producao];
  });

  return groups;
}

function getMaoObraByOp(value){
  return moByOp.get(normalizeOp(value)) || null;
}

function normalizeRecord(r){
  const qtd = Number(r.quantidade || 0);
  const venda = Number(r.valorVenda || 0);
  const custoUnit = Number(r.custoUnitario || 0);
  const comissaoUnit = Number(r.comissaoUnitario || 0);

  // Campos preparados para as próximas integrações. Se ainda não vierem na base,
  // permanecem como não mapeados e são exibidos como “—” na tabela.
  const hasValue = value => value !== undefined && value !== null && String(value).trim() !== '';
  const moResumo = getMaoObraByOp(r.op);
  const custoMaoObraInformado = r.custoMaoObraUnitario ?? r.custoMOUnitario ?? r.custoMO;
  const custoMaoObraRaw = hasValue(custoMaoObraInformado)
    ? custoMaoObraInformado
    : (moResumo?.completo ? moResumo.custoMaoObraUnitario : undefined);
  const impostoRaw = r.impostoUnitario ?? r.imposto;
  const freteRaw = r.freteUnitario ?? r.frete;
  const custoMaoObraMapeado = hasValue(custoMaoObraRaw);
  const impostoMapeado = hasValue(impostoRaw);
  const freteMapeado = hasValue(freteRaw);
  const custoMaoObraUnitario = Number(custoMaoObraRaw || 0);
  const impostoUnitario = Number(impostoRaw || 0);
  const freteUnitario = Number(freteRaw || 0);

  const custoTotal = qtd * custoUnit;
  const custoMaoObraTotal = qtd * custoMaoObraUnitario;
  const impostoTotal = qtd * impostoUnitario;
  const freteTotal = qtd * freteUnitario;
  const comissaoTotal = qtd * comissaoUnit;
  const margemBase = venda - custoTotal - custoMaoObraTotal - impostoTotal - freteTotal - comissaoTotal;
  const lucroUnitario = qtd ? margemBase / qtd : margemBase;

  return {
    ...r,
    quantidade: qtd,
    valorVenda: venda,
    valorMetro: Number(r.valorMetro || 0),
    custoUnitario: custoUnit,
    custoMaoObraUnitario,
    impostoUnitario,
    freteUnitario,
    custoMaoObraMapeado,
    custoMaoObraFonte: hasValue(custoMaoObraInformado) ? 'base faturamento' : (moResumo?.completo ? `OP ${moResumo.op}` : ''),
    moResumo,
    impostoMapeado,
    freteMapeado,
    comissaoUnitario: comissaoUnit,
    percentualComissao: Number(r.percentualComissao || 0),
    custoTotal,
    custoMaoObraTotal,
    impostoTotal,
    freteTotal,
    comissaoTotal,
    lucroUnitario,
    margemBase,
    margemBasePercentual: venda ? (margemBase / venda) * 100 : 0
  };
}

function fillSelect(id, values, allText){
  const el = $(id);
  el.innerHTML = `<option value="">${allText}</option>` + values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
}

function setupFilters(){
  fillSelect('companyFilter', unique(records,'sigla'), 'Todas');
  fillSelect('invoiceFilter', unique(records,'nota'), 'Todas');
  fillSelect('orderFilter', unique(records,'pedido'), 'Todos');
  fillSelect('opFilter', unique(records,'op').filter(meaningful), 'Todas');
  const dates = records.map(r=>r.dataFaturamento).filter(Boolean).sort();
  if(dates.length){
    $('startDate').min = dates[0]; $('startDate').max = dates.at(-1); $('startDate').value = dates[0];
    $('endDate').min = dates[0]; $('endDate').max = dates.at(-1); $('endDate').value = dates.at(-1);
  }
}

function getFilters(){
  return {
    company: $('companyFilter').value,
    start: $('startDate').value,
    end: $('endDate').value,
    invoice: $('invoiceFilter').value,
    order: $('orderFilter').value,
    op: $('opFilter').value,
    search: $('productSearch').value.trim().toLocaleLowerCase('pt-BR')
  };
}

function applyFilters(){
  const f = getFilters();
  filtered = records.filter(r => {
    if(f.company && String(r.sigla) !== f.company) return false;
    if(f.start && r.dataFaturamento < f.start) return false;
    if(f.end && r.dataFaturamento > f.end) return false;
    if(f.invoice && String(r.nota) !== f.invoice) return false;
    if(f.order && String(r.pedido) !== f.order) return false;
    if(f.op && String(r.op) !== f.op) return false;
    if(f.search){
      const haystack = `${r.produto} ${r.descricaoCompleta}`.toLocaleLowerCase('pt-BR');
      if(!haystack.includes(f.search)) return false;
    }
    return true;
  });
  billingPage = 1;
  productsPage = 1;
  renderAll();
}

function renderKpis(){
  const revenue = sum(filtered,'valorVenda');
  const cost = sum(filtered,'custoTotal');
  const commission = sum(filtered,'comissaoTotal');
  const margin = sum(filtered,'margemBase');
  const marginPct = revenue ? margin / revenue * 100 : 0;
  $('kpiInvoices').textContent = unique(filtered,'nota').length.toLocaleString('pt-BR');
  $('kpiRows').textContent = `${filtered.length.toLocaleString('pt-BR')} ${filtered.length === 1 ? 'item faturado' : 'itens faturados'}`;
  $('kpiRevenue').textContent = money(revenue);
  $('kpiCost').textContent = money(cost);
  $('kpiCommission').textContent = money(commission);
  $('kpiMargin').textContent = money(margin);
  $('kpiMargin').className = marginClass(margin);
  $('kpiMarginPct').textContent = `${percent(marginPct)} do faturamento`;
}

function renderBilling(){
  const totalPages = Math.max(1, Math.ceil(filtered.length/PAGE_SIZE));
  billingPage = Math.min(billingPage,totalPages);
  const start = (billingPage-1)*PAGE_SIZE;
  const pageRows = filtered.slice(start,start+PAGE_SIZE);
  $('billingRows').innerHTML = pageRows.length ? pageRows.map(r => `
    <tr class="${r.margemBase <= 0 ? 'row-loss' : ''}">
      <td>${dateBR(r.dataFaturamento)}</td>
      <td><strong>${esc(r.sigla)}</strong></td>
      <td><strong>${esc(r.produto)}</strong></td>
      <td class="description-cell" title="${esc(r.descricaoCompleta)}">${esc(r.descricaoCompleta)}</td>
      <td>${displayRef(r.pedido)}</td><td>${displayRef(r.op)}</td><td>${displayRef(r.nota)}</td>
      <td class="num">${number(r.quantidade)}</td>
      <td class="num">${money(r.valorVenda)}</td>
      <td class="num">${money(r.valorMetro)}</td>
      <td class="num">${money(r.custoUnitario)}</td>
      <td class="num optional-cost">${optionalMoney(r.custoMaoObraUnitario,r.custoMaoObraMapeado)}</td>
      <td class="num optional-cost">${optionalMoney(r.impostoUnitario,r.impostoMapeado)}</td>
      <td class="num optional-cost">${optionalMoney(r.freteUnitario,r.freteMapeado)}</td>
      <td class="num">${money(r.comissaoUnitario)}</td>
      <td class="num">${percent(r.percentualComissao)}</td>
      <td class="num">${money(r.custoTotal)}</td>
      <td class="num ${marginClass(r.lucroUnitario)}">${money(r.lucroUnitario)}</td>
      <td class="num ${marginClass(r.margemBase)}">${money(r.margemBase)}</td>
      <td class="num ${marginClass(r.margemBase)}">${percent(r.margemBasePercentual)}</td>
      <td><button class="detail-button" type="button" data-detail-product="${esc(r.produto)}"><i class="fa-solid fa-magnifying-glass-chart"></i> Detalhar</button></td>
    </tr>`).join('') : '<tr class="empty-row"><td colspan="21">Nenhum registro encontrado para os filtros selecionados.</td></tr>';
  $('billingCount').textContent = `${filtered.length.toLocaleString('pt-BR')} registros`;
  $('billingPage').textContent = `Página ${billingPage} de ${totalPages}`;
  $('billingPrev').disabled = billingPage <= 1;
  $('billingNext').disabled = billingPage >= totalPages;
}

function buildProductGroups(){
  const map = new Map();
  filtered.forEach(r => {
    const key = `${r.produto}¦${r.descricaoCompleta}`;
    if(!map.has(key)) map.set(key,{produto:r.produto,descricaoCompleta:r.descricaoCompleta,quantidade:0,valorVenda:0,custoTotal:0,comissaoTotal:0,margemBase:0,rows:[]});
    const g = map.get(key);
    g.quantidade += r.quantidade;
    g.valorVenda += r.valorVenda;
    g.custoTotal += r.custoTotal;
    g.comissaoTotal += r.comissaoTotal;
    g.margemBase += r.margemBase;
    g.rows.push(r);
  });
  groupedProducts = [...map.values()].map(g => ({...g,margemBasePercentual:g.valorVenda?g.margemBase/g.valorVenda*100:0})).sort((a,b)=>b.valorVenda-a.valorVenda);
}

function renderProducts(){
  buildProductGroups();
  const revenue = sum(groupedProducts,'valorVenda');
  const margin = sum(groupedProducts,'margemBase');
  $('sumProducts').textContent = groupedProducts.length.toLocaleString('pt-BR');
  $('sumQty').textContent = number(sum(groupedProducts,'quantidade'));
  $('sumRevenue').textContent = money(revenue);
  $('sumMarginPct').textContent = percent(revenue ? margin/revenue*100 : 0);
  $('productsCount').textContent = `${groupedProducts.length.toLocaleString('pt-BR')} produtos`;
  const totalPages = Math.max(1,Math.ceil(groupedProducts.length/PAGE_SIZE));
  productsPage = Math.min(productsPage,totalPages);
  const start = (productsPage-1)*PAGE_SIZE;
  const pageRows = groupedProducts.slice(start,start+PAGE_SIZE);
  $('productRows').innerHTML = pageRows.length ? pageRows.map(g => `
    <tr class="${g.margemBase <= 0 ? 'row-loss' : ''}"><td><strong>${esc(g.produto)}</strong></td><td class="description-cell" title="${esc(g.descricaoCompleta)}">${esc(g.descricaoCompleta)}</td><td class="num">${number(g.quantidade)}</td><td class="num">${money(g.valorVenda)}</td><td class="num">${money(g.custoTotal)}</td><td class="num">${money(g.comissaoTotal)}</td><td class="num ${marginClass(g.margemBase)}">${money(g.margemBase)}</td><td class="num ${marginClass(g.margemBase)}">${percent(g.margemBasePercentual)}</td><td><button class="detail-button" type="button" data-detail-product="${esc(g.produto)}"><i class="fa-solid fa-magnifying-glass-chart"></i> Detalhar</button></td></tr>`).join('') : '<tr class="empty-row"><td colspan="9">Nenhum produto encontrado.</td></tr>';
  $('productsPage').textContent = `Página ${productsPage} de ${totalPages}`;
  $('productsPrev').disabled = productsPage <= 1;
  $('productsNext').disabled = productsPage >= totalPages;
}


function renderProductionMO(rows){
  const container = $('detailProduction');
  if(!container) return;
  const ops = unique(rows,'op').filter(meaningful);
  const summaries = ops.map(op=>getMaoObraByOp(op)).filter(Boolean);

  if(!summaries.length){
    container.innerHTML = `<div class="pending-box"><i class="fa-solid fa-link-slash"></i><div><strong>Nenhum cálculo de M.O. vinculado às OPs deste item</strong><p>As bases de produção e setup estão carregadas, mas as OPs deste faturamento ainda não possuem correspondência nelas.</p></div></div>`;
    return;
  }

  container.innerHTML = summaries.map(g=>`
    <div class="mo-op-card ${g.completo ? '' : 'incomplete'}">
      <div class="mo-op-head">
        <div><span>ORDEM DE PRODUÇÃO</span><strong>OP ${esc(g.op)}</strong></div>
        <div class="mo-op-qty"><span>Qtd. Aprovada</span><strong>${number(g.qtdAprovada)}</strong></div>
        <span class="mo-status ${g.completo ? 'ok' : 'warn'}">${g.completo ? 'Cálculo completo' : 'Revisar cálculo'}</span>
      </div>
      <div class="mo-metrics">
        <article><span>Tempo Setup</span><strong>${esc(g.tempoSetup)}</strong><small>${money(g.custoSetupTotal)}</small></article>
        <article><span>Tempo Produção</span><strong>${esc(g.tempoProducao)}</strong><small>${money(g.custoProducaoTotal)}</small></article>
        <article><span>Tempo Total</span><strong>${esc(g.tempoTotal)}</strong><small>Setup + produção</small></article>
        <article class="highlight"><span>Custo M.O. total</span><strong>${money(g.custoMaoObraTotal)}</strong><small>Custo total da OP</small></article>
        <article class="highlight"><span>Cst MO unit.</span><strong>${money(g.custoMaoObraUnitario)}</strong><small>Total M.O. ÷ Qtd. aprovada</small></article>
      </div>
      <div class="mo-formula"><i class="fa-solid fa-calculator"></i><span><strong>Regra:</strong> Σ (tempo produção × custo/minuto) + Σ (tempo setup × custo/minuto da mesma operação) = Custo M.O. total. Depois, Custo M.O. total ÷ Quantidade Aprovada = Cst MO unitário.</span></div>
      <div class="mo-table-wrap">
        <table class="mo-table">
          <thead><tr><th>Tipo</th><th>Centro</th><th>Recurso</th><th class="num">Tempo</th><th class="num">R$/min</th><th class="num">Custo</th></tr></thead>
          <tbody>${g.etapas.map(item=>`<tr><td><span class="mo-type ${item.tipo==='Setup'?'setup':'production'}">${esc(item.tipo)}</span></td><td>${esc(item.centroCusto || '—')}</td><td>${esc(item.recurso || '—')}</td><td class="num">${esc(item.tempo)}</td><td class="num">${money(item.custoMinuto)}</td><td class="num">${money(item.custo)}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      ${g.pendencias.length ? `<div class="mo-pending">${g.pendencias.map(p=>`<span><i class="fa-solid fa-triangle-exclamation"></i> ${esc(p)}</span>`).join('')}</div>` : ''}
    </div>
  `).join('');
}

function renderDetail(){
  if(!selectedProduct){
    $('detailEmpty').hidden = false;
    $('detailContent').hidden = true;
    $('detailTitle').textContent = 'Selecione um item ou produto';
    $('detailSubtitle').textContent = 'Clique em “Detalhar” nas tabelas para abrir esta visão.';
    return;
  }
  const allProductRows = records.filter(r => String(r.produto) === String(selectedProduct));
  const rows = allProductRows.length ? allProductRows : filtered.filter(r => String(r.produto) === String(selectedProduct));
  if(!rows.length){ selectedProduct=null; renderDetail(); return; }
  const first=rows[0], revenue=sum(rows,'valorVenda'), cost=sum(rows,'custoTotal'), commission=sum(rows,'comissaoTotal'), margin=sum(rows,'margemBase'), qty=sum(rows,'quantidade');
  const weightedUnitCost = qty ? cost/qty : 0;
  const avgCommissionPct = revenue ? commission/revenue*100 : 0;
  const marginPct = revenue ? margin/revenue*100 : 0;
  $('detailEmpty').hidden = true;
  $('detailContent').hidden = false;
  $('detailTitle').textContent = `${first.produto} · ${first.descricaoCompleta}`;
  $('detailSubtitle').textContent = `${rows.length} ${rows.length===1?'registro':'registros'} encontrados na base publicada`;
  $('detailProduct').textContent = first.produto;
  $('detailDescription').textContent = first.descricaoCompleta;
  $('detailRevenue').textContent = money(revenue);
  $('detailQty').textContent = `${number(qty)} de quantidade faturada`;
  $('detailCost').textContent = money(cost);
  $('detailUnitCost').textContent = `${money(weightedUnitCost)} / un.`;
  $('detailCommission').textContent = money(commission);
  $('detailCommissionPct').textContent = `${percent(avgCommissionPct)} sobre o faturamento`;
  $('detailMargin').textContent = money(margin);
  $('detailMargin').className = marginClass(margin);
  $('detailMarginPct').textContent = percent(marginPct);
  const refs=[
    ['Pedidos',unique(rows,'pedido').filter(meaningful).join(', ')||'—'],
    ['Notas Fiscais',unique(rows,'nota').filter(meaningful).join(', ')||'—'],
    ['OPs',unique(rows,'op').filter(meaningful).join(', ')||'—'],
    ['Empresas',unique(rows,'sigla').join(', ')||'—'],
    ['Primeiro faturamento',dateBR([...rows].sort((a,b)=>a.dataFaturamento.localeCompare(b.dataFaturamento))[0]?.dataFaturamento)],
    ['Último faturamento',dateBR([...rows].sort((a,b)=>b.dataFaturamento.localeCompare(a.dataFaturamento))[0]?.dataFaturamento)]
  ];
  $('detailReferences').innerHTML = refs.map(([label,value])=>`<div class="reference-group"><span>${label}</span><strong>${esc(value)}</strong></div>`).join('');
  renderProductionMO(rows);
}

function renderAll(){ renderKpis(); renderBilling(); renderProducts(); renderDetail(); }

function switchView(view){
  document.querySelectorAll('.tab').forEach(btn => btn.classList.toggle('active',btn.dataset.view===view));
  document.querySelectorAll('.view').forEach(el=>el.classList.remove('active'));
  $(`${view}View`).classList.add('active');
  if(view==='production') renderDetail();
}

function selectDetail(product){ selectedProduct = product; switchView('production'); document.querySelector('.tabs')?.scrollIntoView({behavior:'smooth',block:'start'}); }

const EXCELJS_URLS = [
  'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',
  'https://unpkg.com/exceljs@4.4.0/dist/exceljs.min.js'
];
let excelJsPromise = null;

function ensureExcelJS(){
  if(window.ExcelJS) return Promise.resolve(window.ExcelJS);
  if(excelJsPromise) return excelJsPromise;

  excelJsPromise = new Promise((resolve,reject)=>{
    let index = 0;
    const tryNext = () => {
      if(index >= EXCELJS_URLS.length){
        reject(new Error('Não foi possível carregar o gerador de Excel. Verifique a conexão com a internet e tente novamente.'));
        return;
      }
      const script = document.createElement('script');
      script.src = EXCELJS_URLS[index++];
      script.async = true;
      script.onload = () => window.ExcelJS ? resolve(window.ExcelJS) : tryNext();
      script.onerror = () => { script.remove(); tryNext(); };
      document.head.appendChild(script);
    };
    tryNext();
  });

  return excelJsPromise;
}

function downloadBlob(filename, blob){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function excelDate(value){
  if(!value) return null;
  const [y,m,d] = String(value).slice(0,10).split('-').map(Number);
  return y && m && d ? new Date(y,m-1,d) : null;
}

function exportStamp(){
  const now = new Date();
  const p = n => String(n).padStart(2,'0');
  return `${now.getFullYear()}${p(now.getMonth()+1)}${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}`;
}

function filterSummary(){
  const f = getFilters();
  const parts = [
    `Empresa: ${f.company || 'Todas'}`,
    `Período: ${f.start ? dateBR(f.start) : '—'} a ${f.end ? dateBR(f.end) : '—'}`,
    `NF: ${f.invoice || 'Todas'}`,
    `Pedido: ${f.order || 'Todos'}`,
    `OP: ${f.op || 'Todas'}`
  ];
  if(f.search) parts.push(`Produto: ${$('productSearch').value.trim()}`);
  return parts.join('   |   ');
}

const XLS_COLORS = {
  navy: 'FF071C3C',
  navy2: 'FF0B2B57',
  blue: 'FF0C63CE',
  blue2: 'FF0B4E9B',
  cyan: 'FF0AAFC6',
  green: 'FF12A36D',
  purple: 'FF6C56D9',
  orange: 'FFF29A38',
  white: 'FFFFFFFF',
  text: 'FF10233F',
  muted: 'FF5F738E',
  line: 'FFD7E2F0',
  zebra: 'FFF3F7FC',
  negative: 'FFD64545',
  positive: 'FF078553',
  lightBlue: 'FFEAF3FF'
};

function excelBorder(){
  return {
    top:{style:'thin',color:{argb:XLS_COLORS.line}},
    left:{style:'thin',color:{argb:XLS_COLORS.line}},
    bottom:{style:'thin',color:{argb:XLS_COLORS.line}},
    right:{style:'thin',color:{argb:XLS_COLORS.line}}
  };
}

function styleRange(ws,r1,c1,r2,c2,style){
  for(let r=r1;r<=r2;r++){
    for(let c=c1;c<=c2;c++){
      const cell = ws.getCell(r,c);
      if(style.fill) cell.fill = style.fill;
      if(style.font) cell.font = style.font;
      if(style.alignment) cell.alignment = style.alignment;
      if(style.border) cell.border = style.border;
    }
  }
}

function mergeStyled(ws,r1,c1,r2,c2,value,style){
  ws.mergeCells(r1,c1,r2,c2);
  styleRange(ws,r1,c1,r2,c2,style);
  ws.getCell(r1,c1).value = value;
}

function addKpiCard(ws,startCol,endCol,label,value,fillColor,numFmt){
  const border = excelBorder();
  mergeStyled(ws,4,startCol,4,endCol,label,{
    fill:{type:'pattern',pattern:'solid',fgColor:{argb:fillColor}},
    font:{name:'Aptos',size:9,bold:true,color:{argb:'FFDCEAFF'}},
    alignment:{vertical:'middle',horizontal:'left'},border
  });
  mergeStyled(ws,5,startCol,5,endCol,value,{
    fill:{type:'pattern',pattern:'solid',fgColor:{argb:fillColor}},
    font:{name:'Aptos Display',size:16,bold:true,color:{argb:XLS_COLORS.white}},
    alignment:{vertical:'middle',horizontal:'left'},border
  });
  if(numFmt) ws.getCell(5,startCol).numFmt = numFmt;
}

function setupReportHeader(ws,title,subtitle,kpis,columnCount=17){
  ws.sheetViews = [{showGridLines:false}];
  mergeStyled(ws,1,1,1,columnCount,'SMART GROUP ANALYTICS',{
    fill:{type:'pattern',pattern:'solid',fgColor:{argb:XLS_COLORS.navy}},
    font:{name:'Aptos Display',size:12,bold:true,color:{argb:'FF59B8FF'}},
    alignment:{vertical:'middle',horizontal:'left'}
  });
  mergeStyled(ws,2,1,2,columnCount,title,{
    fill:{type:'pattern',pattern:'solid',fgColor:{argb:XLS_COLORS.navy}},
    font:{name:'Aptos Display',size:22,bold:true,color:{argb:XLS_COLORS.white}},
    alignment:{vertical:'middle',horizontal:'left'}
  });
  mergeStyled(ws,3,1,3,columnCount,subtitle,{
    fill:{type:'pattern',pattern:'solid',fgColor:{argb:XLS_COLORS.navy}},
    font:{name:'Aptos',size:10,color:{argb:'FFB9D4F4'}},
    alignment:{vertical:'middle',horizontal:'left'}
  });
  ws.getRow(1).height = 21;
  ws.getRow(2).height = 33;
  ws.getRow(3).height = 24;

  addKpiCard(ws,1,3,kpis[0].label,kpis[0].value,kpis[0].color,kpis[0].numFmt);
  addKpiCard(ws,4,6,kpis[1].label,kpis[1].value,kpis[1].color,kpis[1].numFmt);
  addKpiCard(ws,7,9,kpis[2].label,kpis[2].value,kpis[2].color,kpis[2].numFmt);
  addKpiCard(ws,10,13,kpis[3].label,kpis[3].value,kpis[3].color,kpis[3].numFmt);
  addKpiCard(ws,14,17,kpis[4].label,kpis[4].value,kpis[4].color,kpis[4].numFmt);
  ws.getRow(4).height = 18;
  ws.getRow(5).height = 28;

  mergeStyled(ws,7,1,7,columnCount,filterSummary(),{
    fill:{type:'pattern',pattern:'solid',fgColor:{argb:XLS_COLORS.lightBlue}},
    font:{name:'Aptos',size:9,bold:true,color:{argb:XLS_COLORS.text}},
    alignment:{vertical:'middle',horizontal:'left'},border:excelBorder()
  });
  const source = base?.meta?.fonte || 'SIGER';
  const updated = base?.meta?.geradoEm ? new Date(base.meta.geradoEm).toLocaleString('pt-BR') : '—';
  mergeStyled(ws,8,1,8,columnCount,`Fonte: ${source}   |   Base atualizada em: ${updated}   |   Exportado em: ${new Date().toLocaleString('pt-BR')}`,{
    font:{name:'Aptos',size:9,color:{argb:XLS_COLORS.muted}},
    alignment:{vertical:'middle',horizontal:'left'}
  });
  ws.getRow(7).height = 24;
  ws.getRow(8).height = 20;
}

function setupSheetColumns(ws,widths){
  widths.forEach((width,index)=>ws.getColumn(index+1).width=width);
  ws.properties.defaultRowHeight = 18;
  ws.pageSetup = {orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,paperSize:9,margins:{left:0.25,right:0.25,top:0.5,bottom:0.5,header:0.2,footer:0.2}};
}

function styleTableHeader(ws,rowNumber,columnCount){
  const row = ws.getRow(rowNumber);
  row.height = 26;
  for(let c=1;c<=columnCount;c++){
    const cell = row.getCell(c);
    cell.fill = {type:'pattern',pattern:'solid',fgColor:{argb:XLS_COLORS.blue2}};
    cell.font = {name:'Aptos',size:9,bold:true,color:{argb:XLS_COLORS.white}};
    cell.alignment = {vertical:'middle',horizontal:c>=8?'right':'left',wrapText:true};
    cell.border = excelBorder();
  }
}

function styleDataRows(ws,startRow,endRow,columnCount,numericCols=[]){
  for(let r=startRow;r<=endRow;r++){
    const row = ws.getRow(r);
    row.height = 20;
    for(let c=1;c<=columnCount;c++){
      const cell = row.getCell(c);
      if(r % 2 === 0) cell.fill = {type:'pattern',pattern:'solid',fgColor:{argb:XLS_COLORS.zebra}};
      cell.font = {name:'Aptos',size:9,color:{argb:XLS_COLORS.text}};
      cell.alignment = {vertical:'middle',horizontal:numericCols.includes(c)?'right':'left',wrapText:c===4};
      cell.border = excelBorder();
    }
  }
}

function styleTotalRow(ws,rowNumber,columnCount){
  const row=ws.getRow(rowNumber);
  row.height=24;
  for(let c=1;c<=columnCount;c++){
    const cell=row.getCell(c);
    cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:XLS_COLORS.navy2}};
    cell.font={name:'Aptos',size:9,bold:true,color:{argb:XLS_COLORS.white}};
    cell.border=excelBorder();
    cell.alignment={vertical:'middle',horizontal:c>=8?'right':'left'};
  }
}

function applyProfitColors(ws,startRow,endRow,amountCol,pctCol){
  for(let r=startRow;r<=endRow;r++){
    const amount = ws.getCell(r,amountCol);
    const pct = ws.getCell(r,pctCol);
    const result = amount.value?.result ?? amount.value;
    const color = Number(result) < 0 ? XLS_COLORS.negative : XLS_COLORS.positive;
    amount.font = {...amount.font,bold:true,color:{argb:color}};
    pct.font = {...pct.font,bold:true,color:{argb:color}};
  }
}

function styleLossRows(ws,startRow,endRow,profitCol,columnCount){
  for(let r=startRow;r<=endRow;r++){
    const profitCell = ws.getCell(r,profitCol);
    const result = profitCell.value?.result ?? profitCell.value;
    if(Number(result) <= 0){
      for(let c=1;c<=columnCount;c++){
        const cell=ws.getCell(r,c);
        cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFE7EA'}};
        cell.font={...(cell.font||{}),bold:true,color:{argb:XLS_COLORS.negative}};
      }
    }
  }
}

async function exportBilling(){
  const button = $('exportBilling');
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando Excel…';
  try{
    const ExcelJS = await ensureExcelJS();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Smart Group Analytics';
    workbook.lastModifiedBy = 'Smart Group Analytics';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.calculation = {fullCalcOnLoad:true,forceFullCalc:true};

    const ws = workbook.addWorksheet('Faturamento',{views:[{state:'frozen',ySplit:10,xSplit:0,showGridLines:false}]});
    setupSheetColumns(ws,[12,9,12,38,11,10,11,10,15,13,13,13,13,13,13,11,15,14,15,12]);

    const revenue = sum(filtered,'valorVenda');
    const cost = sum(filtered,'custoTotal');
    const commission = sum(filtered,'comissaoTotal');
    const margin = sum(filtered,'margemBase');
    const marginPct = revenue ? margin/revenue : 0;
    setupReportHeader(ws,'CUSTOS E RENTABILIDADE — FATURAMENTO','Relatório detalhado por item faturado.',[
      {label:'FATURAMENTO',value:revenue,color:XLS_COLORS.blue,numFmt:'R$ #,##0.00'},
      {label:'CUSTO TOTAL',value:cost,color:XLS_COLORS.purple,numFmt:'R$ #,##0.00'},
      {label:'COMISSÕES',value:commission,color:XLS_COLORS.orange,numFmt:'R$ #,##0.00'},
      {label:'MARGEM BASE',value:margin,color:XLS_COLORS.green,numFmt:'R$ #,##0.00'},
      {label:'% MARGEM',value:marginPct,color:XLS_COLORS.cyan,numFmt:'0.00%'}
    ],20);

    const headers=['Dt. Fat.','Sigla','Produto','Desc. completa','Pedido','OP','Nota','Qtd','Vlr Venda','Vlr Metro','Cst Unit','Cst MO','Imposto','Frete','Comissão','% Comis','Custo Total','Lucro','Margem Base','% Margem'];
    const headerRow = 10;
    ws.getRow(headerRow).values = headers;
    styleTableHeader(ws,headerRow,headers.length);

    const startRow=headerRow+1;
    filtered.forEach((r,index)=>{
      const rowNumber=startRow+index;
      const row=ws.getRow(rowNumber);
      row.values=[
        excelDate(r.dataFaturamento), String(r.sigla??''), String(r.produto??''), String(r.descricaoCompleta??''),
        meaningful(r.pedido)?String(r.pedido):'', meaningful(r.op)?String(r.op):'', meaningful(r.nota)?String(r.nota):'',
        Number(r.quantidade||0), Number(r.valorVenda||0), Number(r.valorMetro||0), Number(r.custoUnitario||0),
        r.custoMaoObraMapeado ? Number(r.custoMaoObraUnitario||0) : '',
        r.impostoMapeado ? Number(r.impostoUnitario||0) : '',
        r.freteMapeado ? Number(r.freteUnitario||0) : '',
        Number(r.comissaoUnitario||0), Number(r.percentualComissao||0)/100,
        {formula:`H${rowNumber}*K${rowNumber}`,result:Number(r.custoTotal||0)},
        {formula:`IFERROR(S${rowNumber}/H${rowNumber},0)`,result:Number(r.lucroUnitario||0)},
        {formula:`I${rowNumber}-Q${rowNumber}-(H${rowNumber}*IF(L${rowNumber}="",0,L${rowNumber}))-(H${rowNumber}*IF(M${rowNumber}="",0,M${rowNumber}))-(H${rowNumber}*IF(N${rowNumber}="",0,N${rowNumber}))-(H${rowNumber}*O${rowNumber})`,result:Number(r.margemBase||0)},
        {formula:`IFERROR(S${rowNumber}/I${rowNumber},0)`,result:Number(r.margemBasePercentual||0)/100}
      ];
    });

    const endRow=Math.max(startRow,startRow+filtered.length-1);
    if(filtered.length){
      styleDataRows(ws,startRow,endRow,headers.length,[8,9,10,11,12,13,14,15,16,17,18,19,20]);
      for(let r=startRow;r<=endRow;r++){
        ws.getCell(r,1).numFmt='dd/mm/yyyy';
        ws.getCell(r,8).numFmt='#,##0.00';
        [9,10,11,12,13,14,15,17,18,19].forEach(c=>ws.getCell(r,c).numFmt='R$ #,##0.00;[Red]-R$ #,##0.00');
        [16,20].forEach(c=>ws.getCell(r,c).numFmt='0.00%');
      }
      applyProfitColors(ws,startRow,endRow,19,20);
      styleLossRows(ws,startRow,endRow,19,headers.length);
    }

    const totalRow=(filtered.length?endRow:headerRow)+1;
    ws.mergeCells(totalRow,1,totalRow,7);
    ws.getCell(totalRow,1).value='TOTAIS DO PERÍODO FILTRADO';
    if(filtered.length){
      ws.getCell(totalRow,8).value={formula:`SUM(H${startRow}:H${endRow})`,result:sum(filtered,'quantidade')};
      ws.getCell(totalRow,9).value={formula:`SUM(I${startRow}:I${endRow})`,result:revenue};
      ws.getCell(totalRow,17).value={formula:`SUM(Q${startRow}:Q${endRow})`,result:cost};
      ws.getCell(totalRow,19).value={formula:`SUM(S${startRow}:S${endRow})`,result:margin};
      ws.getCell(totalRow,20).value={formula:`IFERROR(S${totalRow}/I${totalRow},0)`,result:marginPct};
    }else{
      [8,9,17,19,20].forEach(c=>ws.getCell(totalRow,c).value=0);
    }
    styleTotalRow(ws,totalRow,headers.length);
    ws.getCell(totalRow,8).numFmt='#,##0.00';
    [9,17,19].forEach(c=>ws.getCell(totalRow,c).numFmt='R$ #,##0.00;[Red]-R$ #,##0.00');
    ws.getCell(totalRow,20).numFmt='0.00%';

    ws.autoFilter={from:{row:headerRow,column:1},to:{row:headerRow,column:headers.length}};

    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(`Custos-Rentabilidade-Faturamento-XLSX-${exportStamp()}.xlsx`,new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  }catch(error){
    console.error('Exportação Excel:',error);
    alert(`Não foi possível gerar o Excel. ${error?.message || error}`);
  }finally{
    button.disabled=false;
    button.innerHTML=original;
  }
}

async function exportProducts(){
  const button = $('exportProducts');
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando Excel…';
  try{
    buildProductGroups();
    const ExcelJS = await ensureExcelJS();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Smart Group Analytics';
    workbook.lastModifiedBy = 'Smart Group Analytics';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.calculation = {fullCalcOnLoad:true,forceFullCalc:true};

    const ws = workbook.addWorksheet('Total por Produto',{views:[{state:'frozen',ySplit:10,xSplit:0,showGridLines:false}]});
    setupSheetColumns(ws,[14,44,12,17,17,17,17,13,12,12,12,12,12,12,12,12,12]);

    const revenue=sum(groupedProducts,'valorVenda');
    const cost=sum(groupedProducts,'custoTotal');
    const commission=sum(groupedProducts,'comissaoTotal');
    const margin=sum(groupedProducts,'margemBase');
    const marginPct=revenue?margin/revenue:0;
    setupReportHeader(ws,'CUSTOS E RENTABILIDADE — TOTAL POR PRODUTO','Consolidação dos registros do período e filtros selecionados.',[
      {label:'PRODUTOS',value:groupedProducts.length,color:XLS_COLORS.blue,numFmt:'#,##0'},
      {label:'FATURAMENTO',value:revenue,color:XLS_COLORS.cyan,numFmt:'R$ #,##0.00'},
      {label:'CUSTO TOTAL',value:cost,color:XLS_COLORS.purple,numFmt:'R$ #,##0.00'},
      {label:'MARGEM BASE',value:margin,color:XLS_COLORS.green,numFmt:'R$ #,##0.00'},
      {label:'% MARGEM',value:marginPct,color:XLS_COLORS.orange,numFmt:'0.00%'}
    ]);

    const headers=['Produto','Desc. completa','Qtd','Faturamento','Custo Total','Comissão Total','Margem Base','% Margem'];
    const headerRow=10;
    ws.getRow(headerRow).values=headers;
    styleTableHeader(ws,headerRow,headers.length);

    const startRow=headerRow+1;
    groupedProducts.forEach((g,index)=>{
      const rn=startRow+index;
      ws.getRow(rn).values=[
        String(g.produto??''),String(g.descricaoCompleta??''),Number(g.quantidade||0),Number(g.valorVenda||0),
        Number(g.custoTotal||0),Number(g.comissaoTotal||0),
        {formula:`D${rn}-E${rn}-F${rn}`,result:Number(g.margemBase||0)},
        {formula:`IFERROR(G${rn}/D${rn},0)`,result:Number(g.margemBasePercentual||0)/100}
      ];
    });

    const endRow=Math.max(startRow,startRow+groupedProducts.length-1);
    if(groupedProducts.length){
      styleDataRows(ws,startRow,endRow,headers.length,[3,4,5,6,7,8]);
      for(let r=startRow;r<=endRow;r++){
        ws.getCell(r,3).numFmt='#,##0.00';
        [4,5,6,7].forEach(c=>ws.getCell(r,c).numFmt='R$ #,##0.00;[Red]-R$ #,##0.00');
        ws.getCell(r,8).numFmt='0.00%';
      }
      applyProfitColors(ws,startRow,endRow,7,8);
      styleLossRows(ws,startRow,endRow,7,headers.length);
    }

    const totalRow=(groupedProducts.length?endRow:headerRow)+1;
    ws.mergeCells(totalRow,1,totalRow,2);
    ws.getCell(totalRow,1).value='TOTAIS DO PERÍODO FILTRADO';
    if(groupedProducts.length){
      ws.getCell(totalRow,3).value={formula:`SUM(C${startRow}:C${endRow})`,result:sum(groupedProducts,'quantidade')};
      ws.getCell(totalRow,4).value={formula:`SUM(D${startRow}:D${endRow})`,result:revenue};
      ws.getCell(totalRow,5).value={formula:`SUM(E${startRow}:E${endRow})`,result:cost};
      ws.getCell(totalRow,6).value={formula:`SUM(F${startRow}:F${endRow})`,result:commission};
      ws.getCell(totalRow,7).value={formula:`SUM(G${startRow}:G${endRow})`,result:margin};
      ws.getCell(totalRow,8).value={formula:`IFERROR(G${totalRow}/D${totalRow},0)`,result:marginPct};
    }else{
      [3,4,5,6,7,8].forEach(c=>ws.getCell(totalRow,c).value=0);
    }
    styleTotalRow(ws,totalRow,headers.length);
    ws.getCell(totalRow,3).numFmt='#,##0.00';
    [4,5,6,7].forEach(c=>ws.getCell(totalRow,c).numFmt='R$ #,##0.00;[Red]-R$ #,##0.00');
    ws.getCell(totalRow,8).numFmt='0.00%';
    ws.autoFilter={from:{row:headerRow,column:1},to:{row:headerRow,column:headers.length}};

    const buffer=await workbook.xlsx.writeBuffer();
    downloadBlob(`Custos-Rentabilidade-Produtos-XLSX-${exportStamp()}.xlsx`,new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  }catch(error){
    console.error('Exportação Excel:',error);
    alert(`Não foi possível gerar o Excel. ${error?.message || error}`);
  }finally{
    button.disabled=false;
    button.innerHTML=original;
  }
}

function bindEvents(){
  ['companyFilter','startDate','endDate','invoiceFilter','orderFilter','opFilter'].forEach(id=>$(id).addEventListener('change',applyFilters));
  let timer; $('productSearch').addEventListener('input',()=>{clearTimeout(timer); timer=setTimeout(applyFilters,180)});
  $('clearFilters').addEventListener('click',()=>{['companyFilter','invoiceFilter','orderFilter','opFilter'].forEach(id=>$(id).value=''); $('productSearch').value=''; const dates=records.map(r=>r.dataFaturamento).filter(Boolean).sort(); if(dates.length){$('startDate').value=dates[0];$('endDate').value=dates.at(-1)} applyFilters();});
  document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.view)));
  document.addEventListener('click',event=>{const btn=event.target.closest('[data-detail-product]'); if(btn) selectDetail(btn.dataset.detailProduct);});
  $('billingPrev').addEventListener('click',()=>{if(billingPage>1){billingPage--;renderBilling()}}); $('billingNext').addEventListener('click',()=>{if(billingPage*PAGE_SIZE<filtered.length){billingPage++;renderBilling()}});
  $('productsPrev').addEventListener('click',()=>{if(productsPage>1){productsPage--;renderProducts()}}); $('productsNext').addEventListener('click',()=>{if(productsPage*PAGE_SIZE<groupedProducts.length){productsPage++;renderProducts()}});
  $('backToBilling').addEventListener('click',()=>switchView('billing'));
  $('exportBilling').addEventListener('click',exportBilling); $('exportProducts').addEventListener('click',exportProducts);
}

async function fetchOptionalJson(url){
  try{
    const response = await fetch(`${url}?v=${Date.now()}`,{cache:'no-store'});
    if(!response.ok) return null;
    return await response.json();
  }catch(error){
    console.warn(`Base opcional não carregada: ${url}`,error);
    return null;
  }
}

async function loadData(){
  const [response,prodData,setupData] = await Promise.all([
    fetch(`data/base.json?v=${Date.now()}`,{cache:'no-store'}),
    fetchOptionalJson('data/producao.json'),
    fetchOptionalJson('data/setup.json')
  ]);
  if(!response.ok) throw new Error(`Base não encontrada (${response.status})`);
  base=await response.json();
  productionBase=prodData;
  setupBase=setupData;
  moByOp=buildMaoObraMap(productionBase?.registros||[],setupBase?.registros||[]);

  records=(base.registros||[]).map(normalizeRecord).sort((a,b)=>String(b.dataFaturamento).localeCompare(String(a.dataFaturamento)) || String(b.nota).localeCompare(String(a.nota),undefined,{numeric:true}));
  filtered=[...records];

  $('sourceFile').textContent=`Base: ${base.meta?.fonte || 'SIGER'} · M.O.: ${moByOp.size.toLocaleString('pt-BR')} OP${moByOp.size===1?'':'s'}`;
  const updated=base.meta?.geradoEm ? new Date(base.meta.geradoEm).toLocaleString('pt-BR') : '—';
  $('updatedAt').textContent=`Atualizado em ${updated}`;
  const linkedRows = records.filter(r=>r.custoMaoObraMapeado).length;
  $('footerStatus').textContent=`${records.length.toLocaleString('pt-BR')} registros carregados · M.O. calculada para ${moByOp.size.toLocaleString('pt-BR')} OP${moByOp.size===1?'':'s'} · ${linkedRows.toLocaleString('pt-BR')} item(ns) do faturamento vinculados`;
  const moStatus=$('moIntegrationStatus');
  if(moStatus){
    moStatus.innerHTML = moByOp.size
      ? `<strong>M.O. integrada:</strong> ${moByOp.size.toLocaleString('pt-BR')} OP${moByOp.size===1?'':'s'} calculada(s) a partir de Setup + Produção. O valor aparece em Cst MO quando a OP do faturamento tiver correspondência. Imposto e Frete continuam pendentes.`
      : `<strong>M.O.:</strong> bases de produção/setup não encontradas. Imposto e Frete continuam pendentes.`;
  }
  setupFilters();
  bindEvents();
  renderAll();
}

(async()=>{
  try{
    await protegerModulo('custos-rentabilidade');
    $('access-status').hidden=true;
    $('dashboard').hidden=false;
    await loadData();
  }catch(error){
    console.error('Custos e Rentabilidade:',error);
    const status=$('access-status');
    if(status){status.hidden=false;status.innerHTML=`<div style="max-width:620px;text-align:center;padding:24px"><strong>Não foi possível carregar o módulo.</strong><br><small style="color:#9fc0e7">${esc(error?.message || error)}</small></div>`;}
  }
})();
