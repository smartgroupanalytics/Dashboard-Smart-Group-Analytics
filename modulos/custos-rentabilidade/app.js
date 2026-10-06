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

function sum(list, field){ return list.reduce((acc, item) => acc + Number(item[field] || 0), 0); }
function unique(list, field){ return [...new Set(list.map(r => String(r[field] ?? '').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR',{numeric:true})); }
function signalClass(pct){ return pct < 0 ? 'bad' : pct < 20 ? 'warn' : 'good'; }
function marginClass(value){ return Number(value) < 0 ? 'money-negative' : 'money-positive'; }

function normalizeRecord(r){
  const qtd = Number(r.quantidade || 0);
  const venda = Number(r.valorVenda || 0);
  const custoUnit = Number(r.custoUnitario || 0);
  const comissaoUnit = Number(r.comissaoUnitario || 0);
  const custoTotal = qtd * custoUnit;
  const comissaoTotal = qtd * comissaoUnit;
  const margemBase = venda - custoTotal - comissaoTotal;
  return {
    ...r,
    quantidade: qtd,
    valorVenda: venda,
    valorMetro: Number(r.valorMetro || 0),
    custoUnitario: custoUnit,
    comissaoUnitario: comissaoUnit,
    percentualComissao: Number(r.percentualComissao || 0),
    custoTotal,
    comissaoTotal,
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
  const margin = revenue - cost - commission;
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
    <tr>
      <td>${dateBR(r.dataFaturamento)}</td>
      <td><strong>${esc(r.sigla)}</strong></td>
      <td><strong>${esc(r.produto)}</strong></td>
      <td class="description-cell" title="${esc(r.descricaoCompleta)}">${esc(r.descricaoCompleta)}</td>
      <td>${displayRef(r.pedido)}</td><td>${displayRef(r.op)}</td><td>${displayRef(r.nota)}</td>
      <td class="num">${number(r.quantidade)}</td>
      <td class="num">${money(r.valorVenda)}</td>
      <td class="num">${money(r.valorMetro)}</td>
      <td class="num">${money(r.custoUnitario)}</td>
      <td class="num">${money(r.comissaoUnitario)}</td>
      <td class="num">${percent(r.percentualComissao)}</td>
      <td class="num">${money(r.custoTotal)}</td>
      <td class="num ${marginClass(r.margemBase)}">${money(r.margemBase)}</td>
      <td class="num ${marginClass(r.margemBase)}">${percent(r.margemBasePercentual)}</td>
      <td><span class="signal ${signalClass(r.margemBasePercentual)}" title="Margem base ${percent(r.margemBasePercentual)}"></span></td>
      <td><button class="detail-button" type="button" data-detail-product="${esc(r.produto)}"><i class="fa-solid fa-magnifying-glass-chart"></i> Detalhar</button></td>
    </tr>`).join('') : '<tr class="empty-row"><td colspan="18">Nenhum registro encontrado para os filtros selecionados.</td></tr>';
  $('billingCount').textContent = `${filtered.length.toLocaleString('pt-BR')} registros`;
  $('billingPage').textContent = `Página ${billingPage} de ${totalPages}`;
  $('billingPrev').disabled = billingPage <= 1;
  $('billingNext').disabled = billingPage >= totalPages;
}

function buildProductGroups(){
  const map = new Map();
  filtered.forEach(r => {
    const key = `${r.produto}¦${r.descricaoCompleta}`;
    if(!map.has(key)) map.set(key,{produto:r.produto,descricaoCompleta:r.descricaoCompleta,quantidade:0,valorVenda:0,custoTotal:0,comissaoTotal:0,rows:[]});
    const g = map.get(key);
    g.quantidade += r.quantidade;
    g.valorVenda += r.valorVenda;
    g.custoTotal += r.custoTotal;
    g.comissaoTotal += r.comissaoTotal;
    g.rows.push(r);
  });
  groupedProducts = [...map.values()].map(g => ({...g,margemBase:g.valorVenda-g.custoTotal-g.comissaoTotal,margemBasePercentual:g.valorVenda?(g.valorVenda-g.custoTotal-g.comissaoTotal)/g.valorVenda*100:0})).sort((a,b)=>b.valorVenda-a.valorVenda);
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
    <tr><td><strong>${esc(g.produto)}</strong></td><td class="description-cell" title="${esc(g.descricaoCompleta)}">${esc(g.descricaoCompleta)}</td><td class="num">${number(g.quantidade)}</td><td class="num">${money(g.valorVenda)}</td><td class="num">${money(g.custoTotal)}</td><td class="num">${money(g.comissaoTotal)}</td><td class="num ${marginClass(g.margemBase)}">${money(g.margemBase)}</td><td class="num ${marginClass(g.margemBase)}">${percent(g.margemBasePercentual)}</td><td><span class="signal ${signalClass(g.margemBasePercentual)}"></span></td><td><button class="detail-button" type="button" data-detail-product="${esc(g.produto)}"><i class="fa-solid fa-magnifying-glass-chart"></i> Detalhar</button></td></tr>`).join('') : '<tr class="empty-row"><td colspan="10">Nenhum produto encontrado.</td></tr>';
  $('productsPage').textContent = `Página ${productsPage} de ${totalPages}`;
  $('productsPrev').disabled = productsPage <= 1;
  $('productsNext').disabled = productsPage >= totalPages;
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
  const first=rows[0], revenue=sum(rows,'valorVenda'), cost=sum(rows,'custoTotal'), commission=sum(rows,'comissaoTotal'), margin=revenue-cost-commission, qty=sum(rows,'quantidade');
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
}

function renderAll(){ renderKpis(); renderBilling(); renderProducts(); renderDetail(); }

function switchView(view){
  document.querySelectorAll('.tab').forEach(btn => btn.classList.toggle('active',btn.dataset.view===view));
  document.querySelectorAll('.view').forEach(el=>el.classList.remove('active'));
  $(`${view}View`).classList.add('active');
  if(view==='production') renderDetail();
}

function selectDetail(product){ selectedProduct = product; switchView('production'); document.querySelector('.tabs')?.scrollIntoView({behavior:'smooth',block:'start'}); }

function csvEscape(value){ const s=String(value ?? ''); return /[;"\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; }
function downloadCsv(filename,headers,rows){
  const content='\uFEFF'+[headers,...rows].map(row=>row.map(csvEscape).join(';')).join('\r\n');
  const blob=new Blob([content],{type:'text/csv;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function exportBilling(){
  downloadCsv('custos-rentabilidade-faturamento.csv',['Dt. Fat.','Sigla','Produto','Desc. completa','Pedido','OP','Nota','Qtd','Vlr Venda','Vlr Metro','Cst Unit','Comissão','% Comis','Custo Total','Comissão Total','Margem Base','% Margem'],filtered.map(r=>[dateBR(r.dataFaturamento),r.sigla,r.produto,r.descricaoCompleta,r.pedido,r.op,r.nota,r.quantidade,r.valorVenda,r.valorMetro,r.custoUnitario,r.comissaoUnitario,r.percentualComissao,r.custoTotal,r.comissaoTotal,r.margemBase,r.margemBasePercentual]));
}
function exportProducts(){
  downloadCsv('custos-rentabilidade-produtos.csv',['Produto','Desc. completa','Qtd','Faturamento','Custo Total','Comissão Total','Margem Base','% Margem'],groupedProducts.map(g=>[g.produto,g.descricaoCompleta,g.quantidade,g.valorVenda,g.custoTotal,g.comissaoTotal,g.margemBase,g.margemBasePercentual]));
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

async function loadData(){
  const response = await fetch(`data/base.json?v=${Date.now()}`,{cache:'no-store'});
  if(!response.ok) throw new Error(`Base não encontrada (${response.status})`);
  base=await response.json();
  records=(base.registros||[]).map(normalizeRecord).sort((a,b)=>String(b.dataFaturamento).localeCompare(String(a.dataFaturamento)) || String(b.nota).localeCompare(String(a.nota),undefined,{numeric:true}));
  filtered=[...records];
  $('sourceFile').textContent=`Base: ${base.meta?.fonte || 'SIGER'}`;
  const updated=base.meta?.geradoEm ? new Date(base.meta.geradoEm).toLocaleString('pt-BR') : '—';
  $('updatedAt').textContent=`Atualizado em ${updated}`;
  $('footerStatus').textContent=`${records.length.toLocaleString('pt-BR')} registros carregados · margem parcial conforme colunas mapeadas`;
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
