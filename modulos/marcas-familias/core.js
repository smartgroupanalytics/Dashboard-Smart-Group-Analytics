/* Cálculos exclusivos do painel de marcas. Não altera os dados de outros módulos. */
(function (root) {
  'use strict';
  const text = v => String(v ?? '').trim().replace(/\s+/g, ' ');
  const norm = v => text(v).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const header = v => norm(v).replace(/[^A-Z0-9]/g, '');
  const money = v => Math.round((v + Number.EPSILON) * 100);
  function number(v) {
    if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
    let s = text(v).replace(/^R\$\s*/, '').replace(/\s/g, '');
    if (!s) return NaN;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
  }
  function date(v) {
    if (typeof v === 'number' && v > 0 && v < 200000) v = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86400000).toISOString().slice(0, 10);
    if (v instanceof Date) v = `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
    let s = text(v), m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/);
    if (!m) { const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (br) m = [s,br[3],br[2],br[1]]; }
    if (!m || +m[1] < 1900 || +m[1] > 2200) return '';
    const d = new Date(Date.UTC(+m[1], +m[2]-1, +m[3]));
    if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth()+1 !== +m[2] || d.getUTCDate() !== +m[3]) return '';
    return d.toISOString().slice(0,10);
  }
  function family(description, color, explicit) {
    if (text(explicit)) return norm(explicit);
    let s = norm(description).replace(/\s*\(VENDA[^)]*\)?/g, '').replace(/\s+VENDA(?:\s+BR|\s+BEIRA\s+RIO)?\s*$/, '').replace(/\s*\(SG-\d+\)\s*$/, '');
    const c = norm(color);
    // Remove a cor declarada, inclusive códigos numéricos truncados pelo relatório.
    const pos = c ? s.lastIndexOf(' ' + c) : -1;
    if (pos > 0 && /^[\d\s]*$/.test(s.slice(pos + c.length + 1))) s = s.slice(0, pos);
    // Espessuras não definem família; a construção PU/PVC/NEO é preservada.
    s = s.replace(/\b(PU|PVC|NEO)\s+\d+(?:[.,]\d+)?(?:\s*MM)?\b/g, '$1').replace(/\s+\d+[.,]\d+\s*MM\b/g, '').replace(/^P\s+(?=NAPA\b)/, '');
    return text(s) || norm(description) || 'SEM FAMÍLIA';
  }
  function parse(rows) {
    if (!Array.isArray(rows)) throw new Error('Planilha inválida.');
    const hi = rows.slice(0,20).findIndex(r => r.map(header).includes('PRODUTO') && r.map(header).includes('DTFATURAM'));
    if (hi < 0) throw new Error('Cabeçalho não encontrado: Produto e Dt.faturam são obrigatórios.');
    const h = rows[hi].map(header);
    const required = ['Produto','Pedido','Cliente','Sig.emp','Dt.faturam','Desc.completa','Nro.nota','Qtd.item/Ft','UN','Valor Fat+Valor IPI+Valor Frete','Descr.Pos.item','MARCA','COR'];
    const missing = required.filter(k => !h.includes(header(k)));
    if (missing.length) throw new Error('Colunas ausentes: ' + missing.join(', '));
    const ix = k => h.indexOf(header(k));
    const records = [], skipped = {empty:0,unbilled:0,invalid:0};
    for (let n = hi+1; n < rows.length; n++) {
      const r = rows[n], get = k => r[ix(k)];
      if (!text(get('Produto')) || !text(get('Desc.completa'))) { skipped.empty++; continue; }
      const status = norm(get('Descr.Pos.item')), invoice = number(get('Nro.nota'));
      if (!['FATURADO','PARCIALMENTE FATURADO','FATURADO PARCIAL'].includes(status) || !(invoice > 0)) { skipped.unbilled++; continue; }
      const day = date(get('Dt.faturam')), value = number(get('Valor Fat+Valor IPI+Valor Frete')), qty = number(get('Qtd.item/Ft'));
      const order = number(get('Pedido'));
      if (!day || !Number.isFinite(value) || !Number.isFinite(qty) || !Number.isSafeInteger(money(value)) || !Number.isSafeInteger(order) || order < 0 || !text(get('UN'))) { skipped.invalid++; continue; }
      records.push({date:day,year:day.slice(0,4),month:day.slice(5,7),brand:norm(get('MARCA')) || 'Vazio',color:norm(get('COR')) || 'SEM COR',family:family(get('Desc.completa'),get('COR'),get('FAMÍLIA')),sku:text(get('Produto')),description:text(get('Desc.completa')),unit:norm(get('UN')),qty,cents:money(value),invoice:text(invoice),order:text(order),customerId:text(get('Cliente')),customer:text(get('Razão social')),company:text(get('Sig.emp')),row:n+1});
    }
    if (!records.length) throw new Error('Nenhum item faturado válido com nota foi encontrado. Os dados anteriores foram mantidos.');
    // Uma linha faturada inválida invalida o arquivo para não reduzir totais silenciosamente.
    if (skipped.invalid) throw new Error(`${skipped.invalid} item(ns) faturado(s) com data, valor, quantidade, pedido ou unidade inválida. Corrija o Excel antes de importar.`);
    return {...allocateInputs(records),skipped};
  }
  function allocateInputs(source) {
    const products=source.filter(r=>r.order!=='0').map(r=>({...r,originalCents:r.cents,inputCents:0,inputAllocations:[]}));
    const inputs=source.filter(r=>r.order==='0').map(r=>({...r})), unallocated=[], groups=new Map();
    // O cliente e a empresa evitam cruzar notas de emissores/destinatários diferentes.
    const key=r=>r.company&&r.customerId?JSON.stringify([norm(r.company),r.customerId,r.invoice,r.date]):null;
    products.forEach(r=>{const k=key(r);if(k){if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}});
    for(const input of inputs){
      const targets=groups.get(key(input))||[];
      const denominator=targets.reduce((n,r)=>n+BigInt(r.originalCents),0n);
      if(!targets.length||denominator<=0n||targets.some(r=>r.originalCents<0)){
        unallocated.push({...input,reason:!key(input)?'Empresa ou cliente não informado':!targets.length?'Sem produto com pedido na mesma nota, empresa, cliente e data':'Valores dos produtos não permitem rateio proporcional'});
        continue;
      }
      // Maiores restos: rateio proporcional exato, preservando cada centavo da linha.
      const amount=BigInt(Math.abs(input.cents)), sign=input.cents<0?-1:1;
      const shares=targets.map((r,index)=>{const value=amount*BigInt(r.originalCents);return {r,index,cents:Number(value/denominator),remainder:value%denominator};});
      let leftover=Number(amount)-shares.reduce((n,s)=>n+s.cents,0);
      const ranked=[...shares].sort((a,b)=>a.remainder===b.remainder?a.index-b.index:a.remainder>b.remainder?-1:1);
      for(let i=0;i<leftover;i++)ranked[i].cents++;
      shares.forEach(s=>{const cents=sign*s.cents;s.r.inputCents+=cents;s.r.cents+=cents;s.r.inputAllocations.push({row:input.row,sku:input.sku,description:input.description,cents});});
    }
    return {records:products,inputs,unallocated,billedCents:source.reduce((n,r)=>n+r.cents,0)};
  }
  function total(rows) {
    const units = {};
    let cents = 0;
    rows.forEach(r => { cents += r.cents; units[r.unit] = (units[r.unit] || 0) + r.qty; });
    return {cents,units,count:rows.length};
  }
  function group(rows,key) {
    const groups = new Map();
    rows.forEach(r => { const k = r[key]; if (!groups.has(k)) groups.set(k,[]); groups.get(k).push(r); });
    return [...groups].map(([name,items]) => ({name,items,...total(items)})).sort((a,b)=>b.cents-a.cents || a.name.localeCompare(b.name,'pt-BR'));
  }
  const filter = (rows,year,month,brands=null) => rows.filter(r=>(!year||r.year===year)&&(!month||r.month===month)&&(brands===null||brands.has(r.brand)));
  function series(rows,year,unit) {
    const keys = year ? Array.from({length:12},(_,i)=>`${year}-${String(i+1).padStart(2,'0')}`) : [...new Set(rows.map(r=>r.date.slice(0,7)))].sort();
    return keys.map(key => {const rs=rows.filter(r=>r.date.startsWith(key)); return {key,...total(rs),qty:total(rs).units[unit]||0};});
  }
  const api = {text,norm,number,date,family,parse,total,group,filter,series};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SGMarcas = api;
})(typeof window !== 'undefined' ? window : globalThis);
