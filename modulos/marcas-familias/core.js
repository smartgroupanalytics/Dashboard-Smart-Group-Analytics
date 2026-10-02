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
  // Regras de unificação trazidas da lógica de famílias da Análise Comercial.
  // A regra principal é genérica: cor, código da cor, PU e espessura não criam outra família.
  // Assim, a correção vale para TODAS as famílias do relatório e não somente para exemplos como NANCY/VENEZIA.
  const FAMILY_ALIASES = [
    ['METALIZADO LAS VEGAS','METALIZADO LAS VEGAS'],
    ['METALIZADO LASVEGAS','METALIZADO LAS VEGAS'],
    ['NAPA METAL CHARM','NAPA METAL CHARM'],
    ['NAPA METAL LYON','NAPA METAL LYON'],
    ['NAPA MADRID','NAPA MADRID'],
    ['NAPA MADRI','NAPA MADRID'],
    ['NAPA ATENAS PVC','NAPA ATENAS PVC'],
    ['NAPA BARI METAL','NAPA BARI METAL'],
    ['NAPA CADIS','NAPA CADIS'],
    ['NAPA CORDOBA PVC','NAPA CORDOBA PVC'],
    ['NAPA CORDOBA','NAPA CORDOBA PVC'],
    ['NAPA CORDA PVC','NAPA CORDA PVC'],
    ['NAPA CORDA','NAPA CORDA PVC'],
    ['NAPA LINHO DAKAR','NAPA LINHO DAKAR'],
    ['NAPA LUNNA PVC','NAPA LUNNA PVC'],
    ['NAPA LUNNA','NAPA LUNNA PVC'],
    ['NAPA LUNA PVC','NAPA LUNNA PVC'],
    ['NAPA LUNA','NAPA LUNNA PVC']
  ].sort((a,b)=>b[0].length-a[0].length);

  const KNOWN_COLOR_NAMES = [
    'OFF WHITE','OURO ROSADO','ROSA GOLD','BRANCO OFF','VERMELHO RUBY','VERDE LUNA','AZUL SKY',
    'VERDE ESCURO','JEANS CLARO','JEANS ESCURO','ROSA VELHO','PRATA VELHO','OURO VELHO','DARK GREY',
    'AMARELO','AMARELA','ANTIQUE','AREIA','AZUL','BEGE','BLUSH','BRANCO','BRANCA','BRONZE','BROWN',
    'CACAU','CAFE','CAMEL','CANELA','CAPRI','CAPUCCINO','CARAMELO','CASTANHO','CELESTE','CEREJA','CHERRY',
    'CHOCOLATE','CINZA','COBRE','COFFEE','CONHAQUE','CORAL','CREME','CRISTAL','DOURADO','DOURADA','FENDI',
    'GELO','GRAFITE','GREY','JEANS','LARANJA','LILAS','LIMA','LIMONCELLO','MANTEIGA','MARFIM','MARINHO',
    'MARROM','MOCCA','MOSTARDA','NATURAL','NUDE','OFF','OLIVA','OLIVE','OSTRA','OURO','PEROLA','PETROLEO',
    'PINK','PISTACHE','PRATA','PRETO','PRETA','ROSA','ROSE','ROUGE','ROXO','RUBI','SAFIRA','SILVER','TAUPE',
    'TELHA','TERRACOTA','TURMALINA','VERDE','VERMELHO','VERMELHA','VINHO','VIOLETA','WHISKY','AVELA'
  ].sort((a,b)=>b.length-a.length);

  function colorBase(color) {
    return norm(color)
      .replace(/\s+\d+(?:[.,]\d+)?\s*$/, '')
      .trim();
  }

  function findDeclaredColorStart(source, color) {
    const c = colorBase(color);
    if (!c || /^[\d.,]+$/.test(c)) return -1;
    const parts = c.split(' ').filter(Boolean);
    // O relatório às vezes traz a cor truncada (ex.: VERMELHO RUB / BRANCO OFF 5).
    // Tenta primeiro o texto mais completo e, se necessário, reduz até achar o início da cor.
    for (let n = parts.length; n >= 1; n--) {
      const candidate = parts.slice(0,n).join(' ');
      const pos = source.lastIndexOf(' ' + candidate);
      if (pos >= 0) return pos + 1;
      if (source.startsWith(candidate + ' ')) return 0;
    }
    return -1;
  }

  function findKnownColorStart(source) {
    let best = -1;
    for (const candidate of KNOWN_COLOR_NAMES) {
      const token = ' ' + candidate;
      const pos = source.lastIndexOf(token);
      if (pos < 0) continue;
      const start = pos + 1;
      // Só considera nomes de cor próximos do final da descrição. Isso permite reconhecer
      // combinações como VERDE CAPRI, DARK GREY e DOURADO/BEGE sem cortar o nome da família.
      const tailWords = source.slice(start + candidate.length).trim().split(/\s+/).filter(Boolean).length;
      if (tailWords <= 5 && (best < 0 || start < best)) best = start;
    }
    return best;
  }

  function normalizeFamilyAlias(value) {
    for (const [prefix, canonical] of FAMILY_ALIASES) {
      if (value === prefix || value.startsWith(prefix + ' ')) return canonical;
    }
    // Na Análise Comercial, a descrição simples NAPA METAL pertence à família METAL CHARM.
    // Aqui a regra é restrita ao nome exato para não engolir famílias como NAPA METAL MALIBU.
    if (value === 'NAPA METAL') return 'NAPA METAL CHARM';
    if (value === 'METALIZADO LAS') return 'METALIZADO LAS VEGAS';
    return value;
  }

  function family(description, color, explicit) {
    if (text(explicit)) return normalizeFamilyAlias(norm(explicit));

    let s = norm(description)
      .replace(/\s*\(VENDA[^)]*\)?/g, ' ')
      .replace(/\s+VENDA(?:\s+BR|\s+BEIRA\s+RIO)?\s*$/, ' ')
      .replace(/\s*\(SG-\d+\)\s*$/, ' ')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Primeiro usa a coluna COR, pois ela é a fonte mais segura para separar família e cor.
    // Se a coluna estiver vazia/truncada, usa a lista de cores da mesma lógica da Análise Comercial.
    const declaredColorStart = findDeclaredColorStart(s, color);
    const knownColorStart = findKnownColorStart(s);
    // A coluna COR pode trazer apenas parte do nome (ex.: LUNA em VERDE LUNA, GREY em DARK GREY).
    // Quando a descrição revela uma cor composta mais longa, corta desde o início dela.
    let colorStart = declaredColorStart;
    if (knownColorStart > 0 && (colorStart < 0 || knownColorStart < colorStart)) colorStart = knownColorStart;
    if (colorStart > 0) s = s.slice(0, colorStart).trim();

    // PU e espessura são características técnicas, não famílias diferentes.
    // PVC e NEO são preservados porque podem fazer parte do nome comercial da família.
    s = s
      .replace(/\bPU\s*\d+(?:[.,]\d+)?\s*(?:MM)?\b/g, ' ')
      .replace(/\b\d+(?:[.,]\d+)?\s*(?:MM)?\s*PU\b/g, ' ')
      .replace(/\bPU\b/g, ' ')
      .replace(/\b\d+[.,]\d+\s*MM\b/g, ' ')
      .replace(/(^|\s)\d+[.,]\d+(?=\s|$)/g, ' ')
      .replace(/\s*-\s*/g, ' ')
      .replace(/^\*?\d+\s+(?=NAPA\b)/, '')
      .replace(/^P\s+(?=NAPA\b)/, '')
      .replace(/\s+/g, ' ')
      .trim();

    return normalizeFamilyAlias(s) || norm(description) || 'SEM FAMÍLIA';
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
