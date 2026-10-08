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
let consumptionBase = null;
let printingBase = null;
let moByOp = new Map();
let eventsBound = false;
let currentDataOrigin = 'published';
let allCfops = [];
let selectedCfops = new Set();
const IMPORT_STORAGE_KEY = 'smartgroup.custosRentabilidade.import.v12';

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

function isTechnicalGridRow(row){
  const desc = normalizeHeader(row?.descricaoCompleta || '');
  return desc.startsWith('impressao uv')
    || desc.startsWith('impressao solvente')
    || desc.startsWith('insumos');
}

function getGridRows(){
  return filtered.filter(row=>!isTechnicalGridRow(row));
}

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

function buildMaoObraMap(productionRows=[],setupRows=[],printingRows=[]){
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
        custoImpressaoTotal:0,
        custoImpressaoUnitario:0,
        impressoes:[],
        custoMaoObraTotal:0,
        custoMaoObraUnitario:0,
        completo:true,
        pendencias:[],
        qtdAprovadaPorOperacao:new Map()
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
    // Um mesmo centro/recurso pode ter vários apontamentos (ex.: rolos).
    // Primeiro somamos a quantidade aprovada de cada operação e, ao final,
    // usamos o maior total aprovado entre as operações da OP. Assim a OP 8361
    // continua em 206 m, enquanto operações divididas em vários apontamentos
    // não ficam limitadas à maior linha individual.
    const qtdAprovada = Number(row.qtdAprovada || 0);
    if(qtdAprovada > 0){
      const qtdKey=`${String(row.centroCusto ?? '')}¦${resourceKey(row.recurso)}`;
      g.qtdAprovadaPorOperacao.set(qtdKey,(g.qtdAprovadaPorOperacao.get(qtdKey)||0)+qtdAprovada);
    }
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
    const approvedTotals=[...g.qtdAprovadaPorOperacao.values()].filter(value=>Number(value)>0);
    g.qtdAprovada=approvedTotals.length ? Math.max(...approvedTotals) : 0;
    delete g.qtdAprovadaPorOperacao;

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

    // IMPRESSAO UV e IMPRESSAO SOLVENTE não fazem mais parte da M.O.
    // Elas compõem a matéria-prima da mesma OP. O custo total de impressão é
    // Preço ven (coluna F) × Qtd. aprovada do item e depois é rateado pela
    // Quantidade Aprovada da OP para obter o adicional unitário de matéria-prima.
    printingRows
      .filter(row=>normalizeOp(row.op)===g.op && row.ehImpressao)
      .forEach(row=>{
        const valorUnitario=Number(row.valorImpressaoUnitario||0);
        const qtdImpressao=Number(row.qtdAprovada||0);
        const custo=qtdImpressao>0 ? valorUnitario*qtdImpressao : valorUnitario;
        g.custoImpressaoTotal += custo;
        g.impressoes.push({
          tipo:'Matéria-prima impressão',
          centroCusto:String(row.centroCusto ?? ''),
          recurso:String(row.descricao ?? ''),
          minutos:0,
          tempo:'—',
          custoMinuto:0,
          valorUnitario,
          quantidade:qtdImpressao,
          custo
        });
      });

    g.tempoTotalMin = g.tempoProducaoMin + g.tempoSetupMin;
    // A M.O. permanece exclusivamente Setup + tempo/máquina de Produção.
    // Recursos de IMPRESSAO DIGITAL apontados no relatório 201 continuam aqui
    // normalmente, pois são operações/máquina e já estão dentro de g.producao.
    g.custoMaoObraTotal = g.custoProducaoTotal + g.custoSetupTotal;
    if(g.qtdAprovada > 0){
      g.custoMaoObraUnitario = g.custoMaoObraTotal / g.qtdAprovada;
      g.custoImpressaoUnitario = g.custoImpressaoTotal / g.qtdAprovada;
    }else{
      g.completo=false;
      g.custoImpressaoUnitario = 0;
      g.pendencias.push('Quantidade aprovada não encontrada para ratear os custos unitários');
    }
    g.tempoProducao = minutesToHHMM(g.tempoProducaoMin);
    g.tempoSetup = minutesToHHMM(g.tempoSetupMin);
    g.tempoTotal = minutesToHHMM(g.tempoTotalMin);
    // UV/Solvente ficam fora da tabela de etapas de M.O.; são exibidos à parte
    // como adicional de matéria-prima.
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
  const custoMateriaPrimaBaseUnitario = Number(r.custoUnitario || 0);
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
  // UV/Solvente é custo adicional de matéria-prima. IMPRESSAO DIGITAL do
  // relatório de produção continua dentro da M.O. e não entra neste adicional.
  const custoImpressaoMateriaPrimaUnitario = Number(moResumo?.custoImpressaoUnitario || 0);
  const custoMateriaPrimaUnitario = custoMateriaPrimaBaseUnitario + custoImpressaoMateriaPrimaUnitario;

  const custoTotal = qtd * custoMateriaPrimaUnitario;
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
    custoUnitario: custoMateriaPrimaUnitario,
    custoMateriaPrimaUnitario,
    custoMateriaPrimaBaseUnitario,
    custoImpressaoMateriaPrimaUnitario,
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

function updateCfopLabel(){
  const label=$('cfopLabel');
  const allBox=$('cfopAll');
  if(!label || !allBox) return;
  const count=selectedCfops.size;
  const total=allCfops.length;
  allBox.checked=total>0 && count===total;
  allBox.indeterminate=count>0 && count<total;
  label.textContent = count===total ? 'Todos' : count===0 ? 'Nenhum' : count===1 ? [...selectedCfops][0] : `${count} selecionados`;
  $('cfopOptions')?.querySelectorAll('input[data-cfop]').forEach(input=>{ input.checked=selectedCfops.has(input.dataset.cfop); });
}

function setupCfopFilter(){
  allCfops=unique(records,'cfop').filter(meaningful);
  selectedCfops=new Set(allCfops);
  const wrap=$('cfopOptions');
  if(wrap){
    wrap.innerHTML=allCfops.length
      ? allCfops.map(value=>`<label class="multi-option"><input type="checkbox" data-cfop="${esc(value)}" checked><span>${esc(value)}</span></label>`).join('')
      : '<div class="multi-empty">Nenhum CFOP disponível</div>';
  }
  updateCfopLabel();
}

function setupFilters(){
  fillSelect('companyFilter', unique(records,'sigla'), 'Todas');
  fillSelect('invoiceFilter', unique(records,'nota'), 'Todas');
  fillSelect('orderFilter', unique(records,'pedido'), 'Todos');
  fillSelect('opFilter', unique(records,'op').filter(meaningful), 'Todas');
  setupCfopFilter();
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
    cfops: [...selectedCfops],
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
    if(allCfops.length && selectedCfops.size < allCfops.length && !selectedCfops.has(String(r.cfop))) return false;
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
  // Linhas técnicas (IMPRESSAO UV/SOLVENTE e INSUMOS) são fonte de custo e
  // não devem aparecer nem ser somadas como faturamento independente nos KPIs.
  const visibleRows=getGridRows();
  const revenue = sum(visibleRows,'valorVenda');
  const cost = sum(visibleRows,'custoTotal');
  const commission = sum(visibleRows,'comissaoTotal');
  const margin = sum(visibleRows,'margemBase');
  const marginPct = revenue ? margin / revenue * 100 : 0;
  $('kpiInvoices').textContent = unique(visibleRows,'nota').length.toLocaleString('pt-BR');
  const hiddenTechnical=filtered.length-visibleRows.length;
  $('kpiRows').textContent = hiddenTechnical
    ? `${visibleRows.length.toLocaleString('pt-BR')} exibidos · ${hiddenTechnical.toLocaleString('pt-BR')} técnicos ocultos`
    : `${visibleRows.length.toLocaleString('pt-BR')} ${visibleRows.length === 1 ? 'item faturado' : 'itens faturados'}`;
  $('kpiRevenue').textContent = money(revenue);
  $('kpiCost').textContent = money(cost);
  $('kpiCommission').textContent = money(commission);
  $('kpiMargin').textContent = money(margin);
  $('kpiMargin').className = marginClass(margin);
  $('kpiMarginPct').textContent = `${percent(marginPct)} do faturamento`;
}

function renderBilling(){
  const gridRows=getGridRows();
  const totalPages = Math.max(1, Math.ceil(gridRows.length/PAGE_SIZE));
  billingPage = Math.min(billingPage,totalPages);
  const start = (billingPage-1)*PAGE_SIZE;
  const pageRows = gridRows.slice(start,start+PAGE_SIZE);
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
      <td class="num material-cost-col" title="Base: ${money(r.custoMateriaPrimaBaseUnitario)}${r.custoImpressaoMateriaPrimaUnitario ? ` + Impressão UV/Solvente: ${money(r.custoImpressaoMateriaPrimaUnitario)}` : ''}">${money(r.custoMateriaPrimaUnitario)}</td>
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
  const hiddenTechnical=filtered.length-gridRows.length;
  $('billingCount').textContent = hiddenTechnical ? `${gridRows.length.toLocaleString('pt-BR')} registros · ${hiddenTechnical.toLocaleString('pt-BR')} técnicos ocultos` : `${gridRows.length.toLocaleString('pt-BR')} registros`;
  $('billingPage').textContent = `Página ${billingPage} de ${totalPages}`;
  $('billingPrev').disabled = billingPage <= 1;
  $('billingNext').disabled = billingPage >= totalPages;
}

function buildProductGroups(){
  const map = new Map();
  getGridRows().forEach(r => {
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
        <article class="highlight"><span>Custo M.O. total</span><strong>${money(g.custoMaoObraTotal)}</strong><small>Setup + máquina/produção</small></article>
        <article class="highlight"><span>Cst MO unit.</span><strong>${money(g.custoMaoObraUnitario)}</strong><small>Total M.O. ÷ Qtd. aprovada</small></article>
      </div>
      <div class="mo-formula"><i class="fa-solid fa-calculator"></i><span><strong>Regra M.O.:</strong> Setup + operações/máquina de Produção. IMPRESSAO DIGITAL apontada no relatório 201 continua dentro da M.O. Já IMPRESSAO UV e IMPRESSAO SOLVENTE do relatório complementar não entram na M.O.; elas são incorporadas ao Cst. Mat. Prima.</span></div>
      <div class="mo-table-wrap">
        <table class="mo-table">
          <thead><tr><th>Tipo</th><th>Centro</th><th>Recurso</th><th class="num">Tempo</th><th class="num">R$/min</th><th class="num">Custo</th></tr></thead>
          <tbody>${g.etapas.map(item=>`<tr><td><span class="mo-type ${item.tipo==='Setup'?'setup':'production'}">${esc(item.tipo)}</span></td><td>${esc(item.centroCusto || '—')}</td><td>${esc(item.recurso || '—')}</td><td class="num">${esc(item.tempo)}</td><td class="num">${money(item.custoMinuto)}</td><td class="num">${money(item.custo)}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      ${g.impressoes.length ? `<div class="material-print-block"><div class="material-print-head"><div><span>ADICIONAL DE MATÉRIA-PRIMA</span><strong>Impressão UV / Solvente</strong></div><div><span>Total da OP</span><strong>${money(g.custoImpressaoTotal)}</strong></div><div><span>Adicional unit.</span><strong>${money(g.custoImpressaoUnitario)}</strong></div></div><div class="mo-table-wrap"><table class="mo-table material-print-table"><thead><tr><th>Centro</th><th>Descrição</th><th class="num">Qtd. aprovada</th><th class="num">R$/un.</th><th class="num">Custo</th></tr></thead><tbody>${g.impressoes.map(item=>`<tr><td>${esc(item.centroCusto || '—')}</td><td>${esc(item.recurso || '—')}</td><td class="num">${number(item.quantidade)}</td><td class="num">${money(item.valorUnitario)}</td><td class="num">${money(item.custo)}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
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
    ['CFOPs',unique(rows,'cfop').filter(meaningful).join(', ')||'—'],
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

function activeView(){
  return document.querySelector('.tab.active')?.dataset.view || 'billing';
}

function reportRowsForSelectedProduct(){
  if(!selectedProduct) return [];
  const allProductRows=records.filter(r=>String(r.produto)===String(selectedProduct));
  return allProductRows.length ? allProductRows : filtered.filter(r=>String(r.produto)===String(selectedProduct));
}

function printKpisHtml(rows){
  const visibleRows=(rows||[]).filter(row=>!isTechnicalGridRow(row));
  const revenue=sum(visibleRows,'valorVenda');
  const cost=sum(visibleRows,'custoTotal');
  const commission=sum(visibleRows,'comissaoTotal');
  const margin=sum(visibleRows,'margemBase');
  const marginPct=revenue ? margin/revenue*100 : 0;
  const invoices=unique(visibleRows,'nota').length;
  return `<div class="print-kpis">
    <div><span>Número de NF emitidas</span><strong>${invoices.toLocaleString('pt-BR')}</strong></div>
    <div><span>Faturamento</span><strong>${money(revenue)}</strong></div>
    <div><span>Custo Matéria-Prima</span><strong>${money(cost)}</strong></div>
    <div><span>Comissões</span><strong>${money(commission)}</strong></div>
    <div><span>Margem base</span><strong>${money(margin)}</strong><small>${percent(marginPct)}</small></div>
  </div>`;
}

function printBillingHtml(){
  const rows=getGridRows();
  const body=rows.map(r=>`<tr class="${r.margemBase<=0?'loss':''}">
    <td>${dateBR(r.dataFaturamento)}</td><td>${esc(r.sigla)}</td><td>${esc(r.produto)}</td><td>${esc(r.descricaoCompleta)}</td>
    <td>${displayRef(r.pedido)}</td><td>${displayRef(r.op)}</td><td>${displayRef(r.nota)}</td><td>${displayRef(r.cfop)}</td>
    <td class="num">${number(r.quantidade)}</td><td class="num">${money(r.valorVenda)}</td><td class="num">${money(r.valorMetro)}</td>
    <td class="num material-cost-col">${money(r.custoMateriaPrimaUnitario)}</td><td class="num">${optionalMoney(r.custoMaoObraUnitario,r.custoMaoObraMapeado)}</td>
    <td class="num">${money(r.comissaoUnitario)}</td><td class="num">${percent(r.percentualComissao)}</td>
    <td class="num">${money(r.custoTotal)}</td><td class="num">${money(r.lucroUnitario)}</td><td class="num">${money(r.margemBase)}</td><td class="num">${percent(r.margemBasePercentual)}</td>
  </tr>`).join('');
  return `<h2>Faturamento por item</h2>
    <div class="print-table-wrap"><table><thead><tr><th>Dt. Fat.</th><th>Sigla</th><th>Produto</th><th>Descrição completa</th><th>Pedido</th><th>OP</th><th>Nota</th><th>CFOP</th><th>Qtd.</th><th>Vlr Venda</th><th>Vlr Metro</th><th>Cst. Mat. Prima</th><th>Cst MO</th><th>Comissão</th><th>% Comis.</th><th>Custo Total</th><th>Lucro</th><th>Margem Base</th><th>% Margem</th></tr></thead><tbody>${body||'<tr><td colspan="19">Nenhum registro.</td></tr>'}</tbody></table></div>`;
}

function printProductsHtml(){
  buildProductGroups();
  const body=groupedProducts.map(g=>`<tr class="${g.margemBase<=0?'loss':''}">
    <td>${esc(g.produto)}</td><td>${esc(g.descricaoCompleta)}</td><td class="num">${number(g.quantidade)}</td>
    <td class="num">${money(g.valorVenda)}</td><td class="num">${money(g.custoTotal)}</td><td class="num">${money(g.comissaoTotal)}</td>
    <td class="num">${money(g.margemBase)}</td><td class="num">${percent(g.margemBasePercentual)}</td>
  </tr>`).join('');
  return `<h2>Total por Produto</h2>
    <div class="print-table-wrap"><table><thead><tr><th>Produto</th><th>Descrição completa</th><th>Qtd.</th><th>Faturamento</th><th>Custo Total</th><th>Comissão</th><th>Margem Base</th><th>% Margem</th></tr></thead><tbody>${body||'<tr><td colspan="8">Nenhum produto.</td></tr>'}</tbody></table></div>`;
}

function printProductionHtml(){
  const rows=reportRowsForSelectedProduct();
  if(!rows.length) return '';
  const first=rows[0];
  const ops=unique(rows,'op').filter(meaningful).map(op=>getMaoObraByOp(op)).filter(Boolean);
  const opHtml=ops.map(g=>`<div class="print-op">
    <h3>OP ${esc(g.op)} <span>Qtd. aprovada: ${number(g.qtdAprovada)}</span></h3>
    <div class="print-op-kpis">
      <div><span>Tempo Setup</span><strong>${esc(g.tempoSetup)}</strong><small>${money(g.custoSetupTotal)}</small></div>
      <div><span>Tempo Produção</span><strong>${esc(g.tempoProducao)}</strong><small>${money(g.custoProducaoTotal)}</small></div>
      <div><span>Custo M.O. total</span><strong>${money(g.custoMaoObraTotal)}</strong></div>
      <div><span>Cst MO unit.</span><strong>${money(g.custoMaoObraUnitario)}</strong></div>
      <div><span>UV/Solvente → Mat. Prima</span><strong>${money(g.custoImpressaoTotal)}</strong><small>${money(g.custoImpressaoUnitario)} / un.</small></div>
    </div>
  </div>`).join('');
  return `<h2>Detalhamento Produção — ${esc(first.produto)} · ${esc(first.descricaoCompleta)}</h2>${opHtml||'<p>Nenhuma OP calculada para este produto.</p>'}`;
}

function printDashboard(){
  const view=activeView();
  if(view==='production' && !selectedProduct){
    alert('Selecione um produto em “Detalhar” antes de imprimir o Detalhamento Produção.');
    return;
  }
  document.getElementById('printReport')?.remove();
  const rows=view==='production' ? reportRowsForSelectedProduct() : getGridRows();
  const report=document.createElement('section');
  report.id='printReport';
  report.className='print-report';
  report.innerHTML=`<div class="print-head">
      <div><span>SMART GROUP ANALYTICS</span><h1>Custos e Rentabilidade</h1><p>${esc(filterSummary())}</p></div>
      <div class="print-source">${esc(base?.meta?.fonte||'SIGER')}<br>${new Date().toLocaleString('pt-BR')}</div>
    </div>
    ${printKpisHtml(rows)}
    ${view==='products' ? printProductsHtml() : view==='production' ? printProductionHtml() : printBillingHtml()}
    <div class="print-footer">Smart Group Analytics · Custos e Rentabilidade</div>`;
  document.body.appendChild(report);
  document.body.classList.add('print-mode');
  const cleanup=()=>{
    document.body.classList.remove('print-mode');
    report.remove();
  };
  window.addEventListener('afterprint',cleanup,{once:true});
  requestAnimationFrame(()=>window.print());
}

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


function primitiveCellValue(value){
  if(value === null || value === undefined) return '';
  if(value instanceof Date) return value;
  if(typeof value === 'object'){
    if(Object.prototype.hasOwnProperty.call(value,'result')) return primitiveCellValue(value.result);
    if(Array.isArray(value.richText)) return value.richText.map(part=>part.text || '').join('');
    if(Object.prototype.hasOwnProperty.call(value,'text')) return value.text;
    if(Object.prototype.hasOwnProperty.call(value,'hyperlink')) return value.text || value.hyperlink || '';
  }
  return value;
}

function normalizeHeader(value){
  return String(primitiveCellValue(value) ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g,' ')
    .trim().replace(/\s+/g,' ');
}

function excelSourceDate(value){
  const raw = primitiveCellValue(value);
  if(!raw) return '';
  if(raw instanceof Date){
    const y=raw.getFullYear(),m=String(raw.getMonth()+1).padStart(2,'0'),d=String(raw.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  if(typeof raw === 'number' && Number.isFinite(raw)){
    const date = new Date(Date.UTC(1899,11,30) + Math.round(raw * 86400000));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;
  }
  const text=String(raw).trim();
  const br=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if(br){
    let y=Number(br[3]); if(y<100) y+=2000;
    return `${y}-${String(Number(br[2])).padStart(2,'0')}-${String(Number(br[1])).padStart(2,'0')}`;
  }
  const iso=text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : text.slice(0,10);
}

function importNumber(value){
  const raw=primitiveCellValue(value);
  if(raw === '' || raw === null || raw === undefined) return 0;
  if(typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  let text=String(raw).trim().replace(/\s/g,'').replace(/^R\$/i,'');
  if(text.includes(',') && text.includes('.')) text=text.replace(/\./g,'').replace(',','.');
  else if(text.includes(',')) text=text.replace(',','.');
  const result=Number(text.replace(/%$/,''));
  return Number.isFinite(result) ? result : 0;
}

function importText(value){
  const raw=primitiveCellValue(value);
  if(raw === null || raw === undefined) return '';
  if(typeof raw === 'number' && Number.isInteger(raw)) return String(raw);
  return String(raw).trim();
}

function importRef(value){
  const text=importText(value);
  return text.endsWith('.0') ? text.slice(0,-2) : text;
}

const IMPORT_SCHEMAS = {
  '199': {label:'Consumos / Insumos por O.P.', required:['data apontamento','descricao insumo','r realizado','vlr efetivo']},
  '200': {label:'Faturamento / Rentabilidade', required:['dt faturam','nat oper','valor fat valor ipi valor frete','comissao metros','preco custo']},
  '201': {label:'Registros de Produção por O.P.', required:['numero da ordem de producao','tempo producao','vlr hr homem','campo calculado']},
  '202': {label:'Setup / Paradas de Produção', required:['motivo parada','num op','duracao','descricao do recurso ativo']},
  'IMP': {label:'Impressão UV / Solvente por O.P.', required:['op','cod prod item','desc completa','preco ven','cons previsto item op','qtd aprovada']}
};

function classifyHeaders(headers){
  const normalized=new Set(headers.map(normalizeHeader).filter(Boolean));
  const matches=Object.entries(IMPORT_SCHEMAS).filter(([,schema])=>schema.required.every(key=>normalized.has(key)));
  if(matches.length!==1) return null;
  return matches[0][0];
}

function headerIndexMap(headers){
  const map=new Map();
  headers.forEach((header,index)=>{
    const key=normalizeHeader(header);
    if(key && !map.has(key)) map.set(key,index);
  });
  return map;
}

function byHeader(row,map,key){
  const index=map.get(normalizeHeader(key));
  return index === undefined ? '' : row[index];
}

async function parseImportFile(file,ExcelJS){
  const workbook=new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const ws=workbook.worksheets.find(sheet=>sheet.actualRowCount>0) || workbook.worksheets[0];
  if(!ws) throw new Error(`${file.name}: nenhuma planilha com dados foi encontrada.`);
  const colCount=Math.max(ws.actualColumnCount || 0, ws.columnCount || 0);
  const headers=[];
  for(let c=1;c<=colCount;c++) headers.push(primitiveCellValue(ws.getRow(1).getCell(c).value));
  const type=classifyHeaders(headers);
  if(!type) throw new Error(`${file.name}: estrutura não reconhecida como um dos 5 relatórios esperados (199, 200, 201, 202 ou o relatório de Impressão).`);
  // No relatório 200, o CFOP deve vir EXCLUSIVAMENTE da coluna K — cabeçalho "Nat.oper".
  // Validamos a posição para evitar usar por engano outro campo/natureza da planilha.
  if(type==='200' && normalizeHeader(headers[10]) !== 'nat oper'){
    throw new Error(`${file.name}: no relatório de Faturamento, a coluna K deve ser "Nat.oper". Ela é a fonte oficial do filtro CFOP.`);
  }
  const rows=[];
  for(let r=2;r<=ws.actualRowCount;r++){
    const row=[];
    let hasValue=false;
    for(let c=1;c<=colCount;c++){
      const value=primitiveCellValue(ws.getRow(r).getCell(c).value);
      row.push(value);
      if(value !== '' && value !== null && value !== undefined) hasValue=true;
    }
    if(hasValue) rows.push(row);
  }
  return {type,fileName:file.name,headers,rows};
}

function mapReport200(parsed){
  const map=headerIndexMap(parsed.headers);
  const registros=parsed.rows.map(row=>({
    dataFaturamento:excelSourceDate(byHeader(row,map,'Dt.faturam')),
    sigla:importText(byHeader(row,map,'Sig.emp')),
    produto:importRef(byHeader(row,map,'Produto')),
    descricaoCompleta:importText(byHeader(row,map,'Desc.completa')),
    pedido:importRef(byHeader(row,map,'Pedido')),
    op:importRef(byHeader(row,map,'N°OP')),
    nota:importRef(byHeader(row,map,'Nro.nota')),
    // CFOP: coluna K (índice 10), cabeçalho Nat.oper, conforme relatório SIGER.
    cfop:importRef(byHeader(row,map,'Nat.oper')),
    quantidade:importNumber(byHeader(row,map,'Qtd.item/Ft')),
    valorVenda:importNumber(byHeader(row,map,'Valor Fat+Valor IPI+Valor Frete')),
    valorMetro:importNumber(byHeader(row,map,'Vlr.unit.líq')),
    custoUnitario:importNumber(byHeader(row,map,'Preço custo')),
    comissaoUnitario:importNumber(byHeader(row,map,'Comissão/Metros')),
    percentualComissao:importNumber(byHeader(row,map,'% comissão rep')),
    fretePedidoFonte:importNumber(byHeader(row,map,'Vlr.frete ped'))
  })).filter(row=>row.produto || row.nota || row.valorVenda || row.quantidade);
  return {meta:{titulo:'Custos e Rentabilidade',fonte:parsed.fileName,relatorio:'200 - Faturamento / Rentabilidade',geradoEm:new Date().toISOString(),versaoLayout:'v12-materia-prima-impressao'},registros};
}

function mapReport201(parsed){
  const map=headerIndexMap(parsed.headers);
  const registros=parsed.rows.map(row=>({
    op:importRef(byHeader(row,map,'Número da ordem de produção')),
    pedido:importRef(byHeader(row,map,'Ped.vinc')),
    produto:importRef(byHeader(row,map,'Produto')),
    descricaoProduto:importText(byHeader(row,map,'Desc.completa')),
    centroCusto:importRef(byHeader(row,map,'C.custo')),
    recurso:importText(byHeader(row,map,'Descrição')),
    dataApontamento:excelSourceDate(byHeader(row,map,'Dt.apont')),
    qtdAprovada:importNumber(byHeader(row,map,'Qtd.aprovada')),
    qtdOP:importNumber(byHeader(row,map,'Qtd.OP')),
    tempoProducao:importText(byHeader(row,map,'Tempo Produção')),
    vlrHoraHomem:importNumber(byHeader(row,map,'Vlr.hr./homem')),
    custoMinuto:importNumber(byHeader(row,map,'Campo calculado'))
  })).filter(row=>meaningful(row.op));
  return {meta:{fonte:parsed.fileName,relatorio:'201 - Registros de Produção por O.P.',geradoEm:new Date().toISOString(),regra:'Tempo Produção × custo/minuto; M.O. rateada pelo maior total de Quantidade Aprovada entre as operações da OP.'},registros};
}

function mapReport202(parsed){
  const map=headerIndexMap(parsed.headers);
  const registros=parsed.rows.map(row=>({
    op:importRef(byHeader(row,map,'Num.OP')),
    centroCusto:importRef(byHeader(row,map,'Código centro de custo')),
    recurso:importText(byHeader(row,map,'Descrição do recurso ativo')),
    duracao:importText(byHeader(row,map,'Duração')),
    motivo:importText(byHeader(row,map,'Motivo Parada')),
    operador:importText(byHeader(row,map,'Operador')),
    dataInicio:excelSourceDate(byHeader(row,map,'Dt.ini.parada'))
  })).filter(row=>row.op || row.motivo || row.duracao);
  return {meta:{fonte:parsed.fileName,relatorio:'202 - Setup / Paradas de Produção',geradoEm:new Date().toISOString(),regra:'Para M.O. considerar Motivo Parada = SETUP e valorizar pela mesma OP/centro de custo ou recurso.'},registros};
}

function mapReport199(parsed){
  // O relatório 199 possui duas colunas chamadas “Cod.”. Por isso, após validar
  // o layout do relatório, usamos as posições oficiais A:Y para não confundir
  // código do produto (C) com código do insumo (G).
  const registros=parsed.rows.map(row=>({
    op:importRef(row[0]),
    dataApontamento:excelSourceDate(row[1]),
    produto:importRef(row[2]),
    descricaoProduto:importText(row[4]),
    quantidadeOP:importNumber(row[5]),
    insumo:importRef(row[6]),
    descricaoInsumo:importText(row[7]),
    qtdAprovada:importNumber(row[8]),
    qtdPrevista:importNumber(row[9]),
    qtdRealizada:importNumber(row[10]),
    valorPrevisto:importNumber(row[11]),
    valorRealizado:importNumber(row[12]),
    custoMedio:importNumber(row[16]),
    valorEfetivo:importNumber(row[20])
  })).filter(row=>meaningful(row.op));
  return {meta:{fonte:parsed.fileName,relatorio:'199 - Consumos / Insumos por O.P.',geradoEm:new Date().toISOString(),observacao:'Importado e validado. Não altera a fórmula de custo de insumos até a regra ser definida.'},registros};
}

function mapReportImpressao(parsed){
  const map=headerIndexMap(parsed.headers);
  const registros=parsed.rows.map(row=>{
    const descricao=importText(byHeader(row,map,'Desc.completa'));
    const descNorm=normalizeHeader(descricao);
    const ehImpressao=descNorm.startsWith('impressao uv') || descNorm.startsWith('impressao solvente');
    return {
      op:importRef(byHeader(row,map,'OP')),
      produtoItem:importRef(byHeader(row,map,'Cód.prod.item')),
      descricao,
      unidade:importText(byHeader(row,map,'UN')),
      valorImpressaoUnitario:importNumber(byHeader(row,map,'Preço ven')),
      qtdPrevista:importNumber(byHeader(row,map,'Cons.previsto item OP')),
      qtdEfetiva:importNumber(byHeader(row,map,'Qtd.efetiva')),
      qtdAprovada:importNumber(byHeader(row,map,'Qtd.aprovada')),
      centroCusto:importRef(byHeader(row,map,'Cent.custo item OP')),
      recurso:importText(byHeader(row,map,'Abreviação')),
      ehImpressao
    };
  }).filter(row=>meaningful(row.op) && row.ehImpressao);
  return {meta:{fonte:parsed.fileName,relatorio:'Impressão UV / Solvente por O.P.',geradoEm:new Date().toISOString(),regra:'Somente Desc.completa iniciando por IMPRESSAO UV ou IMPRESSAO SOLVENTE. Valor da coluna F (Preço ven) × Qtd.aprovada compõe a matéria-prima da mesma OP e não a M.O.'},registros};
}

function buildImportedPackage(parsedByType){
  return {
    version:12,
    importedAt:new Date().toISOString(),
    base:mapReport200(parsedByType['200']),
    production:mapReport201(parsedByType['201']),
    setup:mapReport202(parsedByType['202']),
    consumption:mapReport199(parsedByType['199']),
    printing:mapReportImpressao(parsedByType['IMP'])
  };
}

function loadCachedImport(){
  try{
    const raw=localStorage.getItem(IMPORT_STORAGE_KEY);
    if(!raw) return null;
    const parsed=JSON.parse(raw);
    return parsed?.version===12 && parsed?.base?.registros ? parsed : null;
  }catch(error){ console.warn('Não foi possível ler a importação salva.',error); return null; }
}

function saveCachedImport(pkg){
  try{ localStorage.setItem(IMPORT_STORAGE_KEY,JSON.stringify(pkg)); return true; }
  catch(error){ console.warn('Importação aplicada, mas não foi possível persistir no navegador.',error); return false; }
}

function reportOpSet(rows,field='op'){
  return new Set((rows||[]).map(row=>normalizeOp(row[field])).filter(Boolean));
}

function validateImportedPackage(pkg){
  const errors=[];
  const warnings=[];
  if(!pkg.base?.registros?.length) errors.push('Relatório 200 sem registros válidos.');
  if(!pkg.production?.registros?.length) errors.push('Relatório 201 sem registros válidos.');
  if(!pkg.setup?.registros?.length) errors.push('Relatório 202 sem registros válidos.');
  if(!pkg.consumption?.registros?.length) errors.push('Relatório 199 sem registros válidos.');
  if(!pkg.printing?.registros?.length) errors.push('Relatório de Impressão sem linhas IMPRESSAO UV ou IMPRESSAO SOLVENTE válidas.');
  const billingOps=reportOpSet(pkg.base?.registros||[]);
  const productionOps=reportOpSet(pkg.production?.registros||[]);
  const setupOps=reportOpSet((pkg.setup?.registros||[]).filter(row=>resourceKey(row.motivo)==='SETUP'));
  const consumptionOps=reportOpSet(pkg.consumption?.registros||[]);
  const printingOps=reportOpSet(pkg.printing?.registros||[]);
  const linkedProduction=[...billingOps].filter(op=>productionOps.has(op));
  const linkedSetup=[...billingOps].filter(op=>setupOps.has(op));
  const linkedConsumption=[...billingOps].filter(op=>consumptionOps.has(op));
  const linkedPrinting=[...billingOps].filter(op=>printingOps.has(op));
  if(billingOps.size && !linkedProduction.length) warnings.push('Nenhuma OP do faturamento foi localizada no relatório 201. Confira se os relatórios são do mesmo período.');
  return {errors,warnings,stats:{billingOps:billingOps.size,productionOps:productionOps.size,setupOps:setupOps.size,consumptionOps:consumptionOps.size,printingOps:printingOps.size,linkedProduction:linkedProduction.length,linkedSetup:linkedSetup.length,linkedConsumption:linkedConsumption.length,linkedPrinting:linkedPrinting.length}};
}

function updateImportStatus(validation=null){
  const wrap=$('importStatus');
  if(!wrap) return;
  const sources=[
    ['200','Faturamento',base?.registros?.length||0,base?.meta?.fonte],
    ['199','Consumos',consumptionBase?.registros?.length||0,consumptionBase?.meta?.fonte],
    ['201','Produção',productionBase?.registros?.length||0,productionBase?.meta?.fonte],
    ['202','Setup/Paradas',setupBase?.registros?.length||0,setupBase?.meta?.fonte],
    ['IMP','Impressão',printingBase?.registros?.length||0,printingBase?.meta?.fonte]
  ];
  $('importSourceBadges').innerHTML=sources.map(([id,label,count,file])=>`<div class="import-badge ok" title="${esc(file||'')}"><span>${id}</span><strong>${esc(label)}</strong><small>${Number(count).toLocaleString('pt-BR')} linhas</small><i class="fa-solid fa-circle-check"></i></div>`).join('');
  const saved=currentDataOrigin==='imported';
  $('importOrigin').innerHTML=saved
    ? `<i class="fa-solid fa-database"></i> Base importada e salva neste navegador${validation?.stats ? ` · ${validation.stats.linkedProduction} OPs do faturamento encontradas na Produção` : ''}`
    : `<i class="fa-solid fa-cloud-arrow-down"></i> Base publicada no módulo · use “Importar 5 arquivos” para atualizar manualmente`;
  $('resetImport').hidden=!saved;
}

function applyDataPackage(pkg,origin='published',validation=null){
  base=pkg.base;
  productionBase=pkg.production;
  setupBase=pkg.setup;
  consumptionBase=pkg.consumption || {meta:{fonte:'Não informado'},registros:[]};
  printingBase=pkg.printing || {meta:{fonte:'Impressão não informada'},registros:[]};
  currentDataOrigin=origin;
  moByOp=buildMaoObraMap(productionBase?.registros||[],setupBase?.registros||[],printingBase?.registros||[]);
  records=(base?.registros||[]).map(normalizeRecord).sort((a,b)=>String(b.dataFaturamento).localeCompare(String(a.dataFaturamento)) || String(b.nota).localeCompare(String(a.nota),undefined,{numeric:true}));
  filtered=[...records];
  selectedProduct=null;
  billingPage=1;
  productsPage=1;
  setupFilters();

  const linkedRows=records.filter(r=>r.custoMaoObraMapeado).length;
  $('sourceFile').textContent=`Rel. 200: ${base?.meta?.fonte || 'SIGER'} · 5 relatórios validados`;
  const updated=origin==='imported' && pkg.importedAt ? new Date(pkg.importedAt).toLocaleString('pt-BR') : (base?.meta?.geradoEm ? new Date(base.meta.geradoEm).toLocaleString('pt-BR') : '—');
  $('updatedAt').textContent=`Atualizado em ${updated}`;
  const technicalRows=records.filter(isTechnicalGridRow).length;
  $('footerStatus').textContent=`${records.length.toLocaleString('pt-BR')} itens faturados · ${technicalRows.toLocaleString('pt-BR')} linhas técnicas ocultas do grid · ${productionBase?.registros?.length?.toLocaleString('pt-BR')||0} apontamentos de produção · ${setupBase?.registros?.length?.toLocaleString('pt-BR')||0} paradas/setup · ${consumptionBase?.registros?.length?.toLocaleString('pt-BR')||0} linhas de consumos · ${printingBase?.registros?.length?.toLocaleString('pt-BR')||0} itens de impressão`;
  const moStatus=$('moIntegrationStatus');
  if(moStatus){
    moStatus.innerHTML=moByOp.size
      ? `<strong>Custos integrados:</strong> ${moByOp.size.toLocaleString('pt-BR')} OP${moByOp.size===1?'':'s'} calculada(s). M.O. = Setup + Produção/máquina (incluindo IMPRESSAO DIGITAL do apontamento). UV/Solvente do relatório complementar agora compõe Cst. Mat. Prima. ${linkedRows.toLocaleString('pt-BR')} item(ns) já receberam Cst MO. Relatório 199 permanece validado para regra futura de insumos.`
      : `<strong>M.O.:</strong> bases de produção/setup carregadas, mas nenhuma OP pôde ser calculada. Imposto e Frete continuam pendentes.`;
  }
  updateImportStatus(validation);
  renderAll();
}

async function handleImportFiles(event){
  const files=[...(event.target.files||[])];
  event.target.value='';
  if(files.length!==5){
    alert(`Selecione os 5 arquivos Excel de uma vez. Foram selecionados ${files.length}.`);
    return;
  }
  const invalidExt=files.find(file=>!file.name.toLocaleLowerCase('pt-BR').endsWith('.xlsx'));
  if(invalidExt){ alert(`O arquivo ${invalidExt.name} não é .xlsx.`); return; }
  const button=$('importReports');
  const original=button.innerHTML;
  button.disabled=true;
  try{
    const ExcelJS=await ensureExcelJS();
    const parsedByType={};
    for(let index=0;index<files.length;index++){
      button.innerHTML=`<i class="fa-solid fa-spinner fa-spin"></i> Validando ${index+1}/5…`;
      const parsed=await parseImportFile(files[index],ExcelJS);
      if(parsedByType[parsed.type]) throw new Error(`Dois arquivos foram identificados como relatório ${parsed.type}. Selecione um arquivo de cada relatório: 199, 200, 201, 202 e o relatório de Impressão.`);
      parsedByType[parsed.type]=parsed;
    }
    const missing=Object.keys(IMPORT_SCHEMAS).filter(type=>!parsedByType[type]);
    if(missing.length) throw new Error(`Faltou o(s) relatório(s): ${missing.join(', ')}.`);
    const pkg=buildImportedPackage(parsedByType);
    const validation=validateImportedPackage(pkg);
    if(validation.errors.length) throw new Error(validation.errors.join(' '));
    const persisted=saveCachedImport(pkg);
    applyDataPackage(pkg,'imported',validation);
    const details=[
      `200 Faturamento: ${pkg.base.registros.length.toLocaleString('pt-BR')} linhas`,
      `199 Consumos: ${pkg.consumption.registros.length.toLocaleString('pt-BR')} linhas`,
      `201 Produção: ${pkg.production.registros.length.toLocaleString('pt-BR')} linhas`,
      `202 Setup/Paradas: ${pkg.setup.registros.length.toLocaleString('pt-BR')} linhas`,
      `Impressão UV/Solvente: ${pkg.printing.registros.length.toLocaleString('pt-BR')} linhas`,
      `${validation.stats.linkedProduction} OPs do faturamento encontradas no relatório de Produção`
    ];
    if(validation.warnings.length) details.push(`Aviso: ${validation.warnings.join(' ')}`);
    if(!persisted) details.push('A base foi aplicada nesta sessão, mas o navegador não permitiu salvá-la localmente.');
    alert(`Importação concluída e validada.\n\n${details.join('\n')}`);
  }catch(error){
    console.error('Importação dos relatórios:',error);
    alert(`Os arquivos não foram aplicados.\n\n${error?.message || error}`);
  }finally{
    button.disabled=false;
    button.innerHTML=original;
  }
}

function resetImportedData(){
  if(!confirm('Voltar para a base publicada no módulo e apagar a importação salva neste navegador?')) return;
  localStorage.removeItem(IMPORT_STORAGE_KEY);
  location.reload();
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
    `OP: ${f.op || 'Todas'}`,
    `CFOP: ${selectedCfops.size===allCfops.length ? 'Todos' : selectedCfops.size ? [...selectedCfops].join(', ') : 'Nenhum'}`
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
  text: 'FFFFFFFF',
  muted: 'FFAFC8E5',
  line: 'FF245C9A',
  zebra: 'FF0B3168',
  negative: 'FFD64545',
  positive: 'FF078553',
  lightBlue: 'FF103B73',
  darkRow: 'FF082454'
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
    font:{name:'Aptos',size:9,bold:true,color:{argb:XLS_COLORS.white}},
    alignment:{vertical:'middle',horizontal:'left'},border:excelBorder()
  });
  const source = base?.meta?.fonte || 'SIGER';
  const updated = base?.meta?.geradoEm ? new Date(base.meta.geradoEm).toLocaleString('pt-BR') : '—';
  mergeStyled(ws,8,1,8,columnCount,`Fonte: ${source}   |   Base atualizada em: ${updated}   |   Exportado em: ${new Date().toLocaleString('pt-BR')}`,{
    fill:{type:'pattern',pattern:'solid',fgColor:{argb:XLS_COLORS.navy}},
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
      cell.fill = {type:'pattern',pattern:'solid',fgColor:{argb:r % 2 === 0 ? XLS_COLORS.zebra : XLS_COLORS.darkRow}};
      cell.font = {name:'Aptos',size:9,color:{argb:XLS_COLORS.white}};
      cell.alignment = {vertical:'middle',horizontal:numericCols.includes(c)?'right':'left',wrapText:c===4};
      cell.border = excelBorder();
    }
  }
}

function highlightMaterialCostColumn(ws,headerRow,startRow,endRow,column=11){
  const header=ws.getCell(headerRow,column);
  header.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF2A78B8'}};
  header.font={name:'Aptos',size:9,bold:true,color:{argb:XLS_COLORS.white}};
  header.alignment={vertical:'middle',horizontal:'right',wrapText:true};
  header.border=excelBorder();
  for(let r=startRow;r<=endRow;r++){
    const cell=ws.getCell(r,column);
    cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:r%2===0?'FF16406F':'FF12375F'}};
    cell.font={name:'Aptos',size:9,bold:true,color:{argb:XLS_COLORS.white}};
    cell.alignment={vertical:'middle',horizontal:'right'};
    cell.border=excelBorder();
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
        cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF52233A'}};
        cell.font={...(cell.font||{}),bold:true,color:{argb:'FFFF9AA5'}};
      }
    }
  }
}

async function exportBilling(triggerButton=$('exportBilling')){
  const button = triggerButton;
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando Excel…';
  try{
    const exportRows=getGridRows();
    const ExcelJS = await ensureExcelJS();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Smart Group Analytics';
    workbook.lastModifiedBy = 'Smart Group Analytics';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.calculation = {fullCalcOnLoad:true,forceFullCalc:true};

    const ws = workbook.addWorksheet('Faturamento',{views:[{state:'frozen',ySplit:10,xSplit:0,showGridLines:false}]});
    setupSheetColumns(ws,[12,9,12,38,11,10,11,10,15,13,13,13,13,13,13,11,15,14,15,12]);

    const revenue = sum(exportRows,'valorVenda');
    const cost = sum(exportRows,'custoTotal');
    const commission = sum(exportRows,'comissaoTotal');
    const margin = sum(exportRows,'margemBase');
    const marginPct = revenue ? margin/revenue : 0;
    setupReportHeader(ws,'CUSTOS E RENTABILIDADE — FATURAMENTO','Relatório detalhado por item faturado.',[
      {label:'FATURAMENTO',value:revenue,color:XLS_COLORS.blue,numFmt:'R$ #,##0.00'},
      {label:'MATÉRIA-PRIMA',value:cost,color:XLS_COLORS.purple,numFmt:'R$ #,##0.00'},
      {label:'COMISSÕES',value:commission,color:XLS_COLORS.orange,numFmt:'R$ #,##0.00'},
      {label:'MARGEM BASE',value:margin,color:XLS_COLORS.green,numFmt:'R$ #,##0.00'},
      {label:'% MARGEM',value:marginPct,color:XLS_COLORS.cyan,numFmt:'0.00%'}
    ],20);

    const headers=['Dt. Fat.','Sigla','Produto','Desc. completa','Pedido','OP','Nota','Qtd','Vlr Venda','Vlr Metro','Cst Mat. Prima','Cst MO','Imposto','Frete','Comissão','% Comis','Custo Total','Lucro','Margem Base','% Margem'];
    const headerRow = 10;
    ws.getRow(headerRow).values = headers;
    styleTableHeader(ws,headerRow,headers.length);

    const startRow=headerRow+1;
    exportRows.forEach((r,index)=>{
      const rowNumber=startRow+index;
      const row=ws.getRow(rowNumber);
      row.values=[
        excelDate(r.dataFaturamento), String(r.sigla??''), String(r.produto??''), String(r.descricaoCompleta??''),
        meaningful(r.pedido)?String(r.pedido):'', meaningful(r.op)?String(r.op):'', meaningful(r.nota)?String(r.nota):'',
        Number(r.quantidade||0), Number(r.valorVenda||0), Number(r.valorMetro||0), Number(r.custoMateriaPrimaUnitario||0),
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

    const endRow=Math.max(startRow,startRow+exportRows.length-1);
    if(exportRows.length){
      styleDataRows(ws,startRow,endRow,headers.length,[8,9,10,11,12,13,14,15,16,17,18,19,20]);
      highlightMaterialCostColumn(ws,headerRow,startRow,endRow,11);
      for(let r=startRow;r<=endRow;r++){
        ws.getCell(r,1).numFmt='dd/mm/yyyy';
        ws.getCell(r,8).numFmt='#,##0.00';
        [9,10,11,12,13,14,15,17,18,19].forEach(c=>ws.getCell(r,c).numFmt='R$ #,##0.00;[Red]-R$ #,##0.00');
        [16,20].forEach(c=>ws.getCell(r,c).numFmt='0.00%');
      }
      applyProfitColors(ws,startRow,endRow,19,20);
      styleLossRows(ws,startRow,endRow,19,headers.length);
    }

    const totalRow=(exportRows.length?endRow:headerRow)+1;
    ws.mergeCells(totalRow,1,totalRow,7);
    ws.getCell(totalRow,1).value='TOTAIS DO PERÍODO FILTRADO';
    if(exportRows.length){
      ws.getCell(totalRow,8).value={formula:`SUM(H${startRow}:H${endRow})`,result:sum(exportRows,'quantidade')};
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

async function exportProducts(triggerButton=$('exportProducts')){
  const button = triggerButton;
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
      {label:'MATÉRIA-PRIMA',value:cost,color:XLS_COLORS.purple,numFmt:'R$ #,##0.00'},
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

async function exportCurrentView(){
  const button=$('exportDashboard');
  const view=activeView();
  if(view==='products') return exportProducts(button);
  if(view==='production'){
    if(!selectedProduct){
      alert('Selecione um produto em “Detalhar” antes de exportar o Detalhamento Produção.');
      return;
    }
    return exportProductionDetail(button);
  }
  return exportBilling(button);
}

async function exportProductionDetail(triggerButton=$('exportDashboard')){
  const button=triggerButton;
  const original=button.innerHTML;
  button.disabled=true;
  button.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Gerando Excel…';
  try{
    const rows=reportRowsForSelectedProduct();
    if(!rows.length) throw new Error('Produto selecionado sem registros.');
    const first=rows[0];
    const visibleRows=rows.filter(row=>!isTechnicalGridRow(row));
    const revenue=sum(visibleRows,'valorVenda');
    const cost=sum(visibleRows,'custoTotal');
    const commission=sum(visibleRows,'comissaoTotal');
    const margin=sum(visibleRows,'margemBase');
    const marginPct=revenue?margin/revenue:0;
    const ExcelJS=await ensureExcelJS();
    const workbook=new ExcelJS.Workbook();
    workbook.creator='Smart Group Analytics';
    workbook.lastModifiedBy='Smart Group Analytics';
    workbook.created=new Date();
    workbook.modified=new Date();

    const ws=workbook.addWorksheet('Detalhamento Produção',{views:[{state:'frozen',ySplit:10,showGridLines:false}]});
    setupSheetColumns(ws,[13,12,28,16,16,16,16,16,16,16,16,16,16,16,16,16,16]);
    setupReportHeader(ws,`DETALHAMENTO PRODUÇÃO — ${first.produto}`,first.descricaoCompleta,[
      {label:'FATURAMENTO',value:revenue,color:XLS_COLORS.blue,numFmt:'R$ #,##0.00'},
      {label:'MATÉRIA-PRIMA',value:cost,color:XLS_COLORS.purple,numFmt:'R$ #,##0.00'},
      {label:'COMISSÕES',value:commission,color:XLS_COLORS.orange,numFmt:'R$ #,##0.00'},
      {label:'MARGEM BASE',value:margin,color:XLS_COLORS.green,numFmt:'R$ #,##0.00'},
      {label:'% MARGEM',value:marginPct,color:XLS_COLORS.cyan,numFmt:'0.00%'}
    ],17);

    const ops=unique(rows,'op').filter(meaningful).map(op=>getMaoObraByOp(op)).filter(Boolean);
    const headers=['OP','Qtd. aprovada','Tempo Setup','Custo Setup','Tempo Produção','Custo Produção','UV/Solvente (Mat. Prima)','Adic. Mat. Prima Unit.','Custo M.O. Total','Cst MO Unit.'];
    ws.getRow(10).values=headers;
    styleTableHeader(ws,10,headers.length);
    let current=11;
    ops.forEach(g=>{
      ws.getRow(current).values=[g.op,g.qtdAprovada,g.tempoSetup,g.custoSetupTotal,g.tempoProducao,g.custoProducaoTotal,g.custoImpressaoTotal,g.custoImpressaoUnitario,g.custoMaoObraTotal,g.custoMaoObraUnitario];
      current++;
    });
    if(ops.length){
      styleDataRows(ws,11,current-1,headers.length,[2,4,6,7,8,9,10]);
      for(let r=11;r<current;r++){
        ws.getCell(r,2).numFmt='#,##0.00';
        [4,6,7,8,9,10].forEach(c=>ws.getCell(r,c).numFmt='R$ #,##0.00;[Red]-R$ #,##0.00');
      }
    }

    current+=2;
    mergeStyled(ws,current,1,current,17,'ETAPAS DE MÃO DE OBRA POR OP',{
      fill:{type:'pattern',pattern:'solid',fgColor:{argb:XLS_COLORS.navy2}},
      font:{name:'Aptos',size:11,bold:true,color:{argb:XLS_COLORS.white}},
      alignment:{vertical:'middle',horizontal:'left'}
    });
    current++;
    const detailHeader=current;
    const detailHeaders=['OP','Tipo','Centro','Recurso','Tempo / Qtd.','R$/min ou R$/un.','Custo'];
    ws.getRow(current).values=detailHeaders;
    styleTableHeader(ws,current,detailHeaders.length);
    current++;
    const detailStart=current;
    ops.forEach(g=>g.etapas.forEach(item=>{
      ws.getRow(current).values=[
        g.op,item.tipo,item.centroCusto||'',item.recurso||'',
        item.tipo==='Impressão'?Number(item.quantidade||0):item.tempo,
        item.tipo==='Impressão'?Number(item.valorUnitario||0):Number(item.custoMinuto||0),
        Number(item.custo||0)
      ];
      current++;
    }));
    if(current>detailStart){
      styleDataRows(ws,detailStart,current-1,detailHeaders.length,[5,6,7]);
      for(let r=detailStart;r<current;r++){
        ws.getCell(r,6).numFmt='R$ #,##0.00;[Red]-R$ #,##0.00';
        ws.getCell(r,7).numFmt='R$ #,##0.00;[Red]-R$ #,##0.00';
      }
      ws.autoFilter={from:{row:detailHeader,column:1},to:{row:detailHeader,column:detailHeaders.length}};
    }

    const buffer=await workbook.xlsx.writeBuffer();
    downloadBlob(`Custos-Rentabilidade-Detalhamento-${first.produto}-${exportStamp()}.xlsx`,new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  }catch(error){
    console.error('Exportação Detalhamento:',error);
    alert(`Não foi possível gerar o Excel. ${error?.message||error}`);
  }finally{
    button.disabled=false;
    button.innerHTML=original;
  }
}

function bindEvents(){
  if(eventsBound) return;
  eventsBound=true;
  ['companyFilter','startDate','endDate','invoiceFilter','orderFilter','opFilter'].forEach(id=>$(id).addEventListener('change',applyFilters));
  let timer; $('productSearch').addEventListener('input',()=>{clearTimeout(timer); timer=setTimeout(applyFilters,180)});

  $('cfopToggle').addEventListener('click',event=>{
    event.stopPropagation();
    const menu=$('cfopMenu');
    const opening=menu.hidden;
    menu.hidden=!opening;
    $('cfopToggle').setAttribute('aria-expanded',String(opening));
  });
  $('cfopMenu').addEventListener('click',event=>event.stopPropagation());
  $('cfopAll').addEventListener('change',event=>{
    selectedCfops=event.target.checked ? new Set(allCfops) : new Set();
    updateCfopLabel();
    applyFilters();
  });
  $('cfopOptions').addEventListener('change',event=>{
    const input=event.target.closest('input[data-cfop]');
    if(!input) return;
    if(input.checked) selectedCfops.add(input.dataset.cfop); else selectedCfops.delete(input.dataset.cfop);
    updateCfopLabel();
    applyFilters();
  });
  document.addEventListener('click',event=>{
    const field=$('cfopField');
    if(field && !field.contains(event.target)){ $('cfopMenu').hidden=true; $('cfopToggle').setAttribute('aria-expanded','false'); }
  });

  $('clearFilters').addEventListener('click',()=>{
    ['companyFilter','invoiceFilter','orderFilter','opFilter'].forEach(id=>$(id).value='');
    selectedCfops=new Set(allCfops); updateCfopLabel(); $('cfopMenu').hidden=true; $('cfopToggle').setAttribute('aria-expanded','false');
    $('productSearch').value='';
    const dates=records.map(r=>r.dataFaturamento).filter(Boolean).sort();
    if(dates.length){$('startDate').value=dates[0];$('endDate').value=dates.at(-1)}
    applyFilters();
  });
  document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.view)));
  document.addEventListener('click',event=>{const btn=event.target.closest('[data-detail-product]'); if(btn) selectDetail(btn.dataset.detailProduct);});
  $('billingPrev').addEventListener('click',()=>{if(billingPage>1){billingPage--;renderBilling()}}); $('billingNext').addEventListener('click',()=>{if(billingPage*PAGE_SIZE<getGridRows().length){billingPage++;renderBilling()}});
  $('productsPrev').addEventListener('click',()=>{if(productsPage>1){productsPage--;renderProducts()}}); $('productsNext').addEventListener('click',()=>{if(productsPage*PAGE_SIZE<groupedProducts.length){productsPage++;renderProducts()}});
  $('backToBilling').addEventListener('click',()=>switchView('billing'));
  $('exportBilling').addEventListener('click',()=>exportBilling()); $('exportProducts').addEventListener('click',()=>exportProducts());
  $('printDashboard').addEventListener('click',printDashboard); $('exportDashboard').addEventListener('click',exportCurrentView);
  $('importReports').addEventListener('click',()=> $('importFiles').click());
  $('importFiles').addEventListener('change',handleImportFiles);
  $('resetImport').addEventListener('click',resetImportedData);
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
  const [baseResponse,prodData,setupData,consData,printingData] = await Promise.all([
    fetch(`data/base.json?v=${Date.now()}`,{cache:'no-store'}),
    fetchOptionalJson('data/producao.json'),
    fetchOptionalJson('data/setup.json'),
    fetchOptionalJson('data/consumos.json'),
    fetchOptionalJson('data/impressao.json')
  ]);
  if(!baseResponse.ok) throw new Error(`Base não encontrada (${baseResponse.status})`);
  const published={
    version:12,
    base:await baseResponse.json(),
    production:prodData || {meta:{fonte:'Produção não encontrada'},registros:[]},
    setup:setupData || {meta:{fonte:'Setup não encontrado'},registros:[]},
    consumption:consData || {meta:{fonte:'Consumos não encontrado'},registros:[]},
    printing:printingData || {meta:{fonte:'Impressão não encontrada'},registros:[]}
  };
  const cached=loadCachedImport();
  applyDataPackage(cached || published,cached ? 'imported' : 'published');
  bindEvents();
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
