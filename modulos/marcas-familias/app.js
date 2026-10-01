import { protegerModulo } from '../../module-guard.js?v=3';

const C = window.SGMarcas;
const $ = id => document.getElementById(id);
const brl = cents => (cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const num = v => v.toLocaleString('pt-BR',{maximumFractionDigits:2});
const pct = (v,t) => t ? (100*v/t).toLocaleString('pt-BR',{maximumFractionDigits:1,minimumFractionDigits:1})+'%' : '—';
const esc = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const colors = ['#1988ff','#ffb650','#56d978','#ab62ed','#ea95e9','#52cbd7','#9facc0','#f57474','#87a9ff','#d8d878'];
const compact = v => Math.abs(v)>=1e6 ? num(v/1e6)+'M' : Math.abs(v)>=1000 ? num(v/1000)+' mil' : num(v);
const qty = units => Object.entries(units).sort(([a],[b])=>a.localeCompare(b)).map(([unit,v])=>`${num(v)} ${esc(unit)}`).join('<br>');
const empty = text => `<div class="empty">${esc(text)}</div>`;
let records=[], inputs=[], unallocated=[], selection=new Set(), selectedFamily='', trendBrand='', base=null, published=null, cacheKey='', detailRows=[], detailLimit=100;
let familyView=[], colorView=[], brandView=[];

function message(text,error=false){$('message').hidden=!text;$('message').textContent=text;$('message').classList.toggle('error',error);}
function period(){return {year:$('year').value,month:$('month').value};}
function periodRows(){const p=period();return C.filter(records,p.year,p.month);}
function selectedRows(){const p=period();return C.filter(records,p.year,p.month,selection);}
function brandColor(name){const all=[...new Set(records.map(r=>r.brand))].sort();return colors[all.indexOf(name)%colors.length]||'#7e99b3';}
function options(select,items,chosen){select.replaceChildren(...items.map(([value,label])=>{const o=document.createElement('option');o.value=value;o.textContent=label;return o;}));select.value=chosen;}

function initData(data,reset=true){
  const parsed=C.parse(data.rows);
  records=parsed.records;inputs=parsed.inputs;unallocated=parsed.unallocated;base=data;
  const years=[...new Set([...records,...unallocated].map(r=>r.year))].sort().reverse();
  const now=new Date(),currentYear=String(now.getFullYear()),currentMonth=String(now.getMonth()+1).padStart(2,'0');
  const defaultYear=years.includes(currentYear)?currentYear:years[0];
  options($('year'),[['','Todos'],...years.map(y=>[y,y])],reset?defaultYear:$('year').value);
  if(reset){$('month').value=records.some(r=>r.year===defaultYear&&r.month===currentMonth)?currentMonth:'';$('brand-search').value='';$('family-search').value='';selectedFamily='';}
  selection=new Set(periodRows().map(r=>r.brand));
  const date=data.updatedAt?new Date(data.updatedAt).toLocaleString('pt-BR'):'';
  $('source').textContent=`${data.local?'Base importada neste navegador':'Base publicada'} · ${data.source} · ${num(records.length)} itens${date?' · '+date:''}`;
  $('source').title=$('source').textContent;
  const info=[];
  if(parsed.skipped.unbilled)info.push(`${num(parsed.skipped.unbilled)} itens sem faturamento/nota foram desconsiderados.`);
  if(parsed.skipped.empty)info.push(`${num(parsed.skipped.empty)} linhas vazias ou de fechamento foram ignoradas.`);
  message(data.local?`Importação concluída. ${info.join(' ')}`:'');
  render();
}

function render(){
  const all=periodRows(), rows=selectedRows(), sums=C.total(rows);
  brandView=C.group(all,'brand');
  const available=new Set(brandView.map(g=>g.name));
  selection=new Set([...selection].filter(b=>available.has(b)));
  const namedBrands=new Set(rows.filter(r=>r.brand!=='Vazio').map(r=>r.brand));
  $('revenue').textContent=brl(sums.cents);$('row-count').textContent=`${num(rows.length)} itens de produto · inclui insumos vinculados`;
  $('brands-count').textContent=num(namedBrands.size);$('brands-caption').textContent=rows.some(r=>r.brand==='Vazio')?'marcas + grupo Vazio':'marcas com faturamento';
  $('families-count').textContent=num(new Set(rows.map(r=>r.family)).size);
  $('colors-count').textContent=num(new Set(rows.filter(r=>r.color!=='SEM COR').map(r=>r.color)).size);
  $('colors-caption').textContent=rows.some(r=>r.color==='SEM COR')?'cores + registros sem cor':'cores informadas no relatório';
  $('scope-note').textContent=`${$('year').selectedOptions[0]?.textContent||'Todos'} · ${$('month').selectedOptions[0]?.textContent||'Todos'} · ${num(selection.size)} grupos selecionados`;
  renderReconciliation(rows,all);renderBrands();renderBars(rows);renderShare(rows);
  const picked=brandView.filter(b=>selection.has(b.name));
  if(!picked.some(g=>g.name===trendBrand))trendBrand=picked[0]?.name||'';
  options($('trend-brand'),picked.map(g=>[g.name,g.name]),trendBrand);
  renderTrend();
  familyView=C.group(rows,'family');
  if(!familyView.some(g=>g.name===selectedFamily))selectedFamily=familyView[0]?.name||'';
  $('family-title').textContent=`2. Famílias ${selection.size===1?'da Marca: '+[...selection][0]:'das marcas selecionadas'}`;
  renderFamilies();renderColors();renderFamilyTrend();
}

function renderReconciliation(rows,all){
  const p=period(),pending=C.filter(unallocated,p.year,p.month),periodInputs=C.filter(inputs,p.year,p.month);
  const linked=rows.reduce((n,r)=>n+r.inputCents,0),pendingCents=C.total(pending).cents,productCents=C.total(all).cents;
  $('inputs-summary').textContent=`Pedido 0: ${brl(linked)} agregados aos produtos selecionados${pending.length?' · '+num(pending.length)+' insumos sem vínculo no período':''}`;
  $('inputs-note').textContent=`Conferência do período, considerando todas as marcas: ${brl(productCents+pendingCents)} no Excel = ${brl(productCents)} nos produtos + ${brl(pendingCents)} sem vínculo. ${num(periodInputs.length)} linhas com pedido 0 não entram nas quantidades, famílias ou cores.`;
  $('pending-table').hidden=!pending.length;
  $('pending-rows').innerHTML=pending.map(r=>`<tr><td>${r.date.split('-').reverse().join('/')}<small>NF ${esc(r.invoice)}</small></td><td>${esc(r.sku)} · ${esc(r.description)}<small>Linha ${r.row} do Excel · ${esc(r.company)} · ${esc(r.customer)}</small></td><td>${brl(r.cents)}</td><td>${esc(r.reason)}</td></tr>`).join('');
}

function renderBrands(){
  const search=C.norm($('brand-search').value);
  const shown=brandView.filter(g=>C.norm(g.name).includes(search));
  $('brand-list').innerHTML=shown.map(g=>`<div class="brand-row ${selection.has(g.name)?'active':''}"><label><input type="checkbox" data-brand="${esc(g.name)}" aria-label="Incluir ${esc(g.name)}" ${selection.has(g.name)?'checked':''}></label><button class="brand-pick" data-pick="${esc(g.name)}" title="Mostrar somente ${esc(g.name)}"><span>${esc(g.name)}</span><span>${brl(g.cents)} ›</span></button></div>`).join('')||empty('Nenhuma marca neste período ou pesquisa.');
  $('all-brands').checked=brandView.length>0&&brandView.every(g=>selection.has(g.name));
  $('all-brands').indeterminate=selection.size>0&&!$('all-brands').checked;
  $('selection-count').textContent=`${selection.size}/${brandView.length}`;
}
function renderBars(rows){
  const groups=C.group(rows,'brand').slice(0,10),max=Math.max(...groups.map(g=>Math.abs(g.cents)),1);
  $('brand-chart').innerHTML=groups.map(g=>`<button class="bar-row" data-pick="${esc(g.name)}" title="${esc(g.name)}: ${brl(g.cents)}"><span class="name">${esc(g.name)}</span><span class="bar-track"><span class="bar-fill" style="width:${100*Math.abs(g.cents)/max}%"></span></span><span class="bar-value">${brl(g.cents)}</span></button>`).join('')||empty('Sem faturamento para os filtros selecionados.');
}
function renderShare(rows){
  const groups=C.group(rows,'brand'),total=C.total(rows).cents;
  if(!groups.length||total<=0||groups.some(g=>g.cents<0)){$('share-chart').innerHTML=empty(groups.length?'Participação indisponível para totais negativos ou nulos.':'Selecione uma marca para ver a participação.');return;}
  let parts=groups.slice(0,6);
  if(groups.length>6)parts.push({name:'Demais marcas',cents:groups.slice(6).reduce((s,g)=>s+g.cents,0)});
  let angle=0;const stops=parts.map(g=>{const start=angle;angle+=g.cents/total*360;return `${brandColor(g.name)} ${start}deg ${angle}deg`;}).join(',');
  $('share-chart').innerHTML=`<div class="donut" role="img" aria-label="Participação das marcas por faturamento" style="background:conic-gradient(${stops})"><div class="donut-center"><strong>R$ ${compact(total/100)}</strong><span>Total</span></div></div><div class="share-legend">${parts.map(g=>`<div class="legend-row" title="${esc(g.name)}: ${brl(g.cents)}"><i class="dot" style="background:${brandColor(g.name)}"></i><span class="label">${esc(g.name)}</span><span>${pct(g.cents,total)}</span></div>`).join('')}</div>`;
}

function plot(target,points,{mixed=false,unit='',title='Faturamento mensal',selectedMonth=''}={}){
  if(!points.length){$(target).innerHTML=empty('Sem dados para esta seleção.');return;}
  const width=mixed?1100:480,height=mixed?190:230,left=58,right=mixed?65:20,top=18,bottom=32,w=width-left-right,h=height-top-bottom;
  const vals=points.map(p=>p.cents/100),lo=Math.min(0,...vals),hi=Math.max(1,...vals),range=hi-lo;
  const qlo=Math.min(0,...points.map(p=>p.qty||0)),qhi=Math.max(1,...points.map(p=>p.qty||0));
  const xx=i=>left+(i+.5)*w/points.length,yy=v=>top+(hi-v)*h/range,qy=v=>top+(qhi-v)*h/(qhi-qlo),zero=yy(0);
  let svg=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>`;
  for(let i=0;i<=4;i++){const y=top+i*h/4,value=hi-i*range/4;svg+=`<path d="M${left} ${y}H${width-right}" stroke="#1a3a53"/><text x="${left-8}" y="${y+4}" text-anchor="end">${compact(value)}</text>`;if(mixed)svg+=`<text x="${width-right+9}" y="${y+4}">${compact(qhi-i*(qhi-qlo)/4)}</text>`;}
  svg+=`<text x="${left}" y="10">R$</text>${mixed?`<text x="${width-right+9}" y="10">${esc(unit)}</text>`:''}`;
  const step=points.length>15?Math.ceil(points.length/12):1;
  points.forEach((p,i)=>{const x=xx(i),mon=p.key.slice(5),label=months[+mon-1]+(points.length>12?'/'+p.key.slice(2,4):'');
    if(i%step===0)svg+=`<text x="${x}" y="${height-9}" text-anchor="middle">${label}</text>`;
    if(selectedMonth&&selectedMonth===mon)svg+=`<rect x="${x-w/points.length*.45}" y="${top}" width="${w/points.length*.9}" height="${h}" fill="#1988ff" opacity=".06"/>`;
    if(mixed){const y=yy(p.cents/100),bh=Math.abs(zero-y);svg+=`<rect x="${x-w/points.length*.3}" y="${Math.min(y,zero)}" width="${w/points.length*.6}" height="${bh}" rx="2" fill="#238bfa" opacity=".8"><title>${label}: ${brl(p.cents)}</title></rect>`;}
  });
  const line=points.map((p,i)=>`${i?'L':'M'}${xx(i)},${mixed?qy(p.qty):yy(p.cents/100)}`).join(' ');
  if(!mixed)svg+=`<path d="${line}L${xx(points.length-1)},${zero}L${xx(0)},${zero}Z" fill="#278aff" opacity=".12"/>`;
  svg+=`<path d="${line}" fill="none" stroke="${mixed?'#acdaff':'#2d98ff'}" stroke-width="2.2"/>`;
  points.forEach((p,i)=>{const label=p.key;svg+=`<circle cx="${xx(i)}" cy="${mixed?qy(p.qty):yy(p.cents/100)}" r="3.2" fill="#d4efff" stroke="#2088f2" stroke-width="1.8"><title>${label}: ${mixed?num(p.qty)+' '+esc(unit)+' · ':''}${brl(p.cents)}</title></circle>`;});
  $(target).innerHTML=svg+'</svg>';
}
function renderTrend(){
  if(!trendBrand){$('trend-chart').innerHTML=empty('Selecione uma marca.');return;}
  const p=period(),rows=C.filter(records,p.year,'',new Set([trendBrand]));
  plot('trend-chart',C.series(rows,p.year),{title:'Faturamento mensal: '+trendBrand,selectedMonth:p.month});
}
function renderFamilies(){
  const search=C.norm($('family-search').value),total=C.total(selectedRows()).cents;
  $('family-rows').innerHTML=familyView.filter(g=>C.norm(g.name).includes(search)).map(g=>`<tr class="${g.name===selectedFamily?'selected':''}"><td><button data-family="${esc(g.name)}" aria-pressed="${g.name===selectedFamily}">${esc(g.name)} ›</button></td><td class="qty">${qty(g.units)}</td><td>${brl(g.cents)}</td><td>${pct(g.cents,total)}</td></tr>`).join('')||'<tr><td colspan="4">Nenhuma família para esta seleção.</td></tr>';
}
function swatch(name){
  const c=C.norm(name);const pairs=[['PRETO','#10161a'],['OFF','#e7e3d4'],['BRANCO','#f6f6ef'],['BEGE','#d7c3a5'],['CAFE','#65483c'],['MARROM','#855438'],['OURO','#d7b475'],['PRATA','#c5cbd2'],['VERMELHO','#ef5451'],['ROSA','#eeb0ce'],['ROSE','#e4a7a0'],['AZUL','#3e8fee'],['VERDE','#70b970'],['CINZA','#9da5af'],['PINK','#eb55ad'],['CREME','#e6d9b6'],['CARAMELO','#bc7a3d'],['NUDE','#d7baa6']];return pairs.find(([key])=>c.includes(key))?.[1]||'#55738c';
}
function renderColors(){
  $('color-title').textContent='3. Cores da Família'+(selectedFamily?': '+selectedFamily:'');
  const rows=selectedRows().filter(r=>r.family===selectedFamily),total=C.total(rows).cents;colorView=C.group(rows,'color');
  $('color-rows').innerHTML=colorView.map(g=>`<tr><td><button data-color="${esc(g.name)}" class="color-name"><i class="swatch" aria-hidden="true" style="background:${swatch(g.name)}"></i><span>${esc(g.name)} ›</span></button></td><td class="qty">${qty(g.units)}</td><td>${brl(g.cents)}</td><td>${pct(g.cents,total)}</td></tr>`).join('')||'<tr><td colspan="4">Selecione uma família para abrir as cores.</td></tr>';
}
function renderFamilyTrend(){
  $('family-trend-title').textContent='Evolução da Família'+(selectedFamily?': '+selectedFamily:'');
  if(!selectedFamily){$('family-trend').innerHTML=empty('Selecione uma família.');options($('quantity-unit'),[],'');return;}
  const p=period(),rows=C.filter(records,p.year,'',selection).filter(r=>r.family===selectedFamily),units=Object.keys(C.total(rows).units).sort();
  const old=$('quantity-unit').value,unit=units.includes(old)?old:units.includes('M')?'M':units[0];
  options($('quantity-unit'),units.map(u=>[u,u]),unit);
  plot('family-trend',C.series(rows,p.year,unit),{mixed:true,unit,title:'Evolução mensal: '+selectedFamily,selectedMonth:p.month});
}

function openDetail(color){
  detailRows=selectedRows().filter(r=>r.family===selectedFamily&&r.color===color).sort((a,b)=>b.date.localeCompare(a.date));detailLimit=100;
  $('detail-title').textContent=`${selectedFamily} · ${color}`;
  $('detail-subtitle').textContent=`${num(detailRows.length)} itens · ${brl(C.total(detailRows).cents)}`;
  renderDetail();$('detail-dialog').showModal();
}
function renderDetail(){
  $('detail-rows').innerHTML=detailRows.slice(0,detailLimit).map(r=>`<tr><td>${r.date.split('-').reverse().join('/')}<small>NF ${esc(r.invoice)}</small></td><td>${esc(r.sku)} · ${esc(r.description)}<small>${esc(r.brand)} · Pedido ${esc(r.order)}</small></td><td>${esc(r.customer)}<small>${esc(r.company)}</small></td><td>${num(r.qty)} ${esc(r.unit)}</td><td>${brl(r.cents)}${r.inputAllocations.length?`<small>Produto ${brl(r.originalCents)}<br>Insumos ${brl(r.inputCents)}</small><details><summary>Ver insumos</summary>${r.inputAllocations.map(a=>`<small>Linha ${a.row} · ${esc(a.sku)} · ${esc(a.description)}: ${brl(a.cents)}</small>`).join('')}</details>`:''}</td></tr>`).join('');
  $('more-detail').hidden=detailLimit>=detailRows.length;
}

function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open('smartgroup-marcas-familias-v1',1);req.onupgradeneeded=()=>req.result.createObjectStore('bases');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function cache(mode,data){const db=await openDB();try{return await new Promise((resolve,reject)=>{const t=db.transaction('bases',mode==='get'?'readonly':'readwrite'),s=t.objectStore('bases');const req=mode==='get'?s.get(cacheKey):mode==='delete'?s.delete(cacheKey):s.put(data,cacheKey);let result;req.onsuccess=()=>{result=req.result;};t.oncomplete=()=>resolve(result);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});}finally{db.close();}}
async function loadPublished(){const res=await fetch('data/base.json?v=20261001',{cache:'no-store'});if(!res.ok)throw new Error(`Não foi possível carregar a base publicada (HTTP ${res.status}).`);const data=await res.json();C.parse(data.rows);return data;}

async function importFile(file){
  if(!file)return;
  if(file.size>32*1024*1024){message('O arquivo ultrapassa 32 MB. Envie um relatório menor.',true);return;}
  $('import-file').disabled=true;message('Lendo e validando a planilha…');
  try{
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false});
    const candidates=wb.SheetNames.map(name=>({name,rows:XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:null,raw:true})})).filter(s=>s.rows.slice(0,20).some(r=>r.some(c=>C.norm(c)==='DT.FATURAM')&&r.some(c=>C.norm(c)==='PRODUTO')));
    if(candidates.length!==1)throw new Error(candidates.length?'Há mais de uma aba de faturamento. Envie um arquivo com uma única base para evitar duplicidade.':'Aba de faturamento não encontrada. Use o relatório com MARCA e COR.');
    const data={schema:1,source:file.name,updatedAt:new Date().toISOString(),local:true,rows:candidates[0].rows};C.parse(data.rows);
    let saved=true;try{await cache('put',data);}catch{saved=false;}
    initData(data);
    if(!saved)message('Base carregada, mas o navegador não permitiu salvá-la. Ao recarregar, será usada a base anterior.',true);
  }catch(e){message(`Importação não aplicada: ${e.message}`,true);}
  finally{$('import-file').disabled=false;$('import-file').value='';}
}

function bind(){
  months.forEach((m,i)=>{const o=document.createElement('option');o.value=String(i+1).padStart(2,'0');o.textContent=m[0].toUpperCase()+m.slice(1);$('month').append(o);});
  ['year','month'].forEach(id=>$(id).addEventListener('change',()=>{selection=new Set(periodRows().map(r=>r.brand));selectedFamily='';render();}));
  $('clear').addEventListener('click',()=>{$('year').value='';$('month').value='';$('brand-search').value='';$('family-search').value='';selection=new Set(records.map(r=>r.brand));selectedFamily='';render();});
  $('brand-search').addEventListener('input',renderBrands);$('family-search').addEventListener('input',renderFamilies);
  $('all-brands').addEventListener('change',()=>{selection=$('all-brands').checked?new Set(brandView.map(g=>g.name)):new Set();render();});
  $('brand-list').addEventListener('change',e=>{if(e.target.dataset.brand!==undefined){e.target.checked?selection.add(e.target.dataset.brand):selection.delete(e.target.dataset.brand);render();}});
  document.addEventListener('click',e=>{const pick=e.target.closest('[data-pick]');if(pick){selection=new Set([pick.dataset.pick]);trendBrand=pick.dataset.pick;selectedFamily='';render();}const fam=e.target.closest('[data-family]');if(fam){selectedFamily=fam.dataset.family;renderFamilies();renderColors();renderFamilyTrend();}const col=e.target.closest('[data-color]');if(col)openDetail(col.dataset.color);});
  $('trend-brand').addEventListener('change',()=>{trendBrand=$('trend-brand').value;renderTrend();});$('quantity-unit').addEventListener('change',renderFamilyTrend);
  $('close-detail').addEventListener('click',()=>$('detail-dialog').close());$('more-detail').addEventListener('click',()=>{detailLimit+=100;renderDetail();});
  $('import-file').addEventListener('change',e=>importFile(e.target.files[0]));
  $('restore').addEventListener('click',async()=>{try{published=await loadPublished();await cache('delete');initData(published);message('Base publicada restaurada neste navegador.');}catch(e){message('Não foi possível restaurar: '+e.message,true);}});
}

try{
  const user=await protegerModulo('marcas-familias');cacheKey=(user?.uid||'usuario')+':relatorio';
  $('access-status').hidden=true;$('dashboard').hidden=false;bind();
  let stored;try{stored=await cache('get');if(stored)C.parse(stored.rows);}catch{stored=null;}
  if(stored)initData(stored);else{published=await loadPublished();initData(published);}
}catch(e){
  if(!$('dashboard').hidden)message('Falha ao carregar dados: '+e.message+' Você pode importar o Excel pelo botão acima.',true);
  else{$('access-status').textContent='Não foi possível validar o acesso a Marcas e Famílias. Volte ao portal e verifique a permissão do usuário.';}
}
