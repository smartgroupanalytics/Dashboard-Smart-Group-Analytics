import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  LayoutDashboard, Upload, Download, Search, TrendingUp, Package,
  Wallet, Users, ArrowUpRight, ArrowDownRight, Filter, FileSpreadsheet, Maximize2, Minimize2
} from 'lucide-react';
import { sgfBridge, parseProductWorkbook } from './smartgroup-bridge.js';
const initialData = []; // Dados privados são lidos do Firestore (mesma interface original).

const COLORS = ['#173A8A','#2E7D32','#F9A825','#E87524','#7C3AED','#0F9DAD'];
const money = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(v || 0);
const qty = v => new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(v || 0);
const pct = v => `${(v*100).toLocaleString('pt-BR',{maximumFractionDigits:1})}%`;
const normalize = s => String(s ?? '').trim().toLocaleLowerCase('pt-BR');

function calcABC(rows) {
  const sorted = [...rows].sort((a,b)=>b.value-a.value);
  const total = sorted.reduce((s,r)=>s+r.value,0);
  let running = 0;
  return sorted.map(r=>{
    const share = total ? r.value/total : 0;
    running += share;
    const abc = running-share < .8 ? 'A' : running-share < .95 ? 'B' : 'C';
    return {...r, share, cumulative:running, abc};
  });
}

function parseWorkbook(file, onLoaded, onError) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const workbook = XLSX.read(e.target.result,{type:'array'});
      const parsed = workbook.SheetNames.map(sheetName => {
        const ws = workbook.Sheets[sheetName];
        const grid = XLSX.utils.sheet_to_json(ws,{header:1,defval:null});
        const first = grid[0] || [];
        // The source workbook has two side-by-side tables: overall purchases (A:E) and national-only (G:K or F:J).
        const rightStart = first[6] === 'Razão Social' ? 6 : first[5] === 'Rótulos de Linha' ? 5 : first[6] ? 6 : 5;
        const national = new Set();
        grid.slice(1).forEach(r=>{ if(r[rightStart]) national.add(String(r[rightStart]).trim()); });
        const rows = [];
        grid.slice(1).forEach(r=>{
          const supplier = r[0];
          if(!supplier || typeof supplier !== 'string') return;
          const origin = r[4] || (national.has(String(supplier).trim()) ? 'Nacional' : 'Não informado');
          rows.push({
            supplier:String(supplier).trim(),
            quantity:Number(r[1])||0,
            value:Number(r[2])||0,
            share:Number(r[3])||0,
            origin:String(origin).trim()
          });
        });
        return {period: /1\s*SEMESTRE/i.test(sheetName) ? '1º Semestre' : /2\s*SEMESTRE/i.test(sheetName) ? '2º Semestre' : sheetName, suppliers:rows};
      }).filter(s=>s.suppliers.length);
      if (!parsed.length) throw new Error('Não encontrei tabelas de fornecedores nas abas da planilha.');
      onLoaded(parsed);
    } catch(err) { onError(err.message || 'Não foi possível ler a planilha.'); }
  };
  reader.onerror = () => onError('Falha ao abrir o arquivo.');
  reader.readAsArrayBuffer(file);
}

function ProductAxisTick({ x = 0, y = 0, payload, expanded = false }) {
  const label = String(payload?.value ?? '').trim();
  const words = label.split(/\s+/).filter(Boolean);
  const maxChars = expanded ? 15 : 12;
  const lines = [];
  let line = '';

  words.forEach(word => {
    // Split unusually long individual tokens rather than hide any part of the name.
    let remaining = word;
    while (remaining.length > maxChars) {
      if (line) { lines.push(line); line = ''; }
      lines.push(remaining.slice(0, maxChars));
      remaining = remaining.slice(maxChars);
    }
    const candidate = line ? `${line} ${remaining}` : remaining;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = remaining;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);

  return (
    <g transform={`translate(${x},${y})`}>
      <title>{label}</title>
      <text textAnchor="middle" fill="#DCE8FB" fontSize={expanded ? 12 : 10}>
        {lines.map((part, index) => (
          <tspan key={`${index}-${part}`} x="0" dy={index === 0 ? 12 : 13}>
            {part}
          </tspan>
        ))}
      </text>
    </g>
  );
}

export default function App() {
  const [data,setData] = useState(initialData);
  const [productData,setProductData] = useState([]);
  const [expandedChart,setExpandedChart] = useState(null);
  const [supplierSource,setSupplierSource] = useState('produtos');

  // Integração de dados sem alterar o design do Radar original.
  useEffect(() => sgfBridge.subscribe(base => {
    setData(base.fornecedores);
    setProductData(base.produtos);
    setUploadedName(base.arquivo || '');
  }), []);
  const [period,setPeriod] = useState('Todos');
  const [origin,setOrigin] = useState('Todas');
  const [search,setSearch] = useState('');
  const [sort,setSort] = useState('value');
  const [uploadedName,setUploadedName] = useState('');
  const [view,setView] = useState('fornecedores');
  const [section,setSection] = useState('executivo');
  const [actionItems,setActionItems] = useState(()=>{ try { return JSON.parse(localStorage.getItem('radar-action-items') || '[]'); } catch { return []; } });
  const [actionForm,setActionForm] = useState({title:'',owner:'',due:'',priority:'Média',target:'',status:'Pendente'});
  const [productSearch,setProductSearch] = useState('');
  const [productSupplier,setProductSupplier] = useState('Todos');
  const [productPeriod,setProductPeriod] = useState('Todos');
  const [productSort,setProductSort] = useState('value');
  const [notice,setNotice] = useState('');
  const [canImport,setCanImport] = useState(sgfBridge.canEdit);
  useEffect(() => sgfBridge.subscribePermissoes(setCanImport), []);

  const productSupplierData = useMemo(()=>{
    const knownOrigins = new Map();
    data.forEach(p=>p.suppliers.forEach(s=>{
      const key=normalize(s.supplier);
      const old=knownOrigins.get(key);
      if(s.origin==='Importado' || !old) knownOrigins.set(key,s.origin || 'Não informado');
      else if(s.origin==='Nacional' && old!=='Importado') knownOrigins.set(key,'Nacional');
    }));
    const grouped = new Map();
    productData.forEach(p=>{
      const semester=p.period || (p.month<=6?'1º Semestre':'2º Semestre');
      const key=`${semester}::${normalize(p.supplier)}`;
      const row=grouped.get(key)||{period:semester,supplier:p.supplier,quantity:0,value:0,origin:knownOrigins.get(normalize(p.supplier))||'Não informado'};
      row.quantity += Number(p.quantity)||0; row.value += Number(p.value)||0; grouped.set(key,row);
    });
    const byPeriod = new Map();
    [...grouped.values()].forEach(r=>byPeriod.set(r.period,(byPeriod.get(r.period)||0)+r.value));
    const result = new Map();
    [...grouped.values()].forEach(r=>{
      const list=result.get(r.period)||[];
      list.push({...r,share:byPeriod.get(r.period)?r.value/byPeriod.get(r.period):0});
      result.set(r.period,list);
    });
    return [...result.entries()].map(([period,suppliers])=>({period,suppliers:suppliers.sort((a,b)=>b.value-a.value)}));
  },[productData,data]);
  const supplierData = productSupplierData;
  const periods = useMemo(()=>period==='Todos'?supplierData:supplierData.filter(d=>d.period===period),[supplierData,period]);
  const rows = useMemo(()=>{
    const merged = new Map();
    periods.forEach(p=>p.suppliers.forEach(s=>{
      const key=normalize(s.supplier);
      const prev=merged.get(key)||{supplier:s.supplier,quantity:0,value:0,origin:s.origin,periods:{}};
      prev.quantity += s.quantity; prev.value += s.value;
      if(s.origin==='Importado') prev.origin='Importado';
      else if(prev.origin!=='Importado' && s.origin==='Nacional') prev.origin='Nacional';
      prev.periods[p.period]={quantity:s.quantity,value:s.value,origin:s.origin};
      merged.set(key,prev);
    }));
    return [...merged.values()].filter(r=>origin==='Todas'||r.origin===origin)
      .filter(r=>normalize(r.supplier).includes(normalize(search)));
  },[periods,origin,search]);

  const abcRows = useMemo(()=>calcABC(rows),[rows]);
  const totalValue = rows.reduce((s,r)=>s+r.value,0);
  const totalQty = rows.reduce((s,r)=>s+r.quantity,0);
  const topSupplier = [...rows].sort((a,b)=>b.value-a.value)[0];
  const top5Share = totalValue ? [...rows].sort((a,b)=>b.value-a.value).slice(0,5).reduce((s,r)=>s+r.value,0)/totalValue : 0;
  const abcTotals = ['A','B','C'].map(k=>({name:`Classe ${k}`,value:abcRows.filter(r=>r.abc===k).reduce((s,r)=>s+r.value,0)}));
  const chartRows = [...rows].sort((a,b)=>b.value-a.value).slice(0,8).map(r=>({...r,short:r.supplier.length>22?r.supplier.slice(0,20)+'…':r.supplier}));
  const semesterCompare = useMemo(()=>{
    const names = [...new Set(supplierData.flatMap(p=>p.suppliers.map(s=>s.supplier)))];
    return names.map(name=>{
      const row={supplier:name.length>20?name.slice(0,18)+'…':name};
      supplierData.forEach(p=>{const hit=p.suppliers.find(s=>normalize(s.supplier)===normalize(name)); row[p.period]=hit?.value||0;});
      return row;
    }).sort((a,b)=>Math.max(b['1º Semestre']||0,b['2º Semestre']||0)-Math.max(a['1º Semestre']||0,a['2º Semestre']||0)).slice(0,8);
  },[supplierData]);

  const productSuppliers = useMemo(()=>['Todos',...new Set(productData.map(p=>p.supplier).sort((a,b)=>a.localeCompare(b,'pt-BR')))], [productData]);
  const productRows = useMemo(()=>{
    const filtered = productData.filter(p=>(productPeriod==='Todos'||p.period===productPeriod)
      && (productSupplier==='Todos'||p.supplier===productSupplier)
      && (normalize(p.description+' '+p.code+' '+p.supplier).includes(normalize(productSearch))));
    // Consolida produtos pela descrição normalizada, sem depender do código.
    // Para BASE SHANGHAI, trata BEGE, BEGE 0, BEGE 6 e versões com marca d'água como um único produto.
    const normalizeProduct = description => {
      let name = String(description ?? '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/\s*\(COM MARCA D['’]AGUA\)/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\s*-\s*/g, ' - ');

      if (name.includes('BASE SHANGHAI')) {
        name = name.replace(/ - BEGE(?:\s+(?:0|6))?$/, ' - BEGE');
      }
      return name;
    };

    const map = new Map();
    filtered.forEach(p=>{
      const key = normalizeProduct(p.description);
      const r = map.get(key) || {
        code:p.code,
        description:String(p.description ?? '').trim(),
        quantity:0,
        value:0,
        suppliers:new Set(),
        months:new Set(),
        codes:new Set()
      };
      r.quantity += Number(p.quantity) || 0;
      r.value += Number(p.value) || 0;
      if (p.supplier) r.suppliers.add(p.supplier);
      if (p.month) r.months.add(p.month);
      if (p.code != null && p.code !== '') r.codes.add(String(p.code));
      map.set(key,r);
    });
    const all=[...map.values()].map(r=>({...r,suppliersCount:r.suppliers.size,monthsCount:r.months.size,codesCount:r.codes.size}));
    const sorted=[...all].sort((a,b)=>b.value-a.value);
    const total=sorted.reduce((sum,r)=>sum+r.value,0); let running=0;
    return sorted.map(r=>{const share=total?r.value/total:0; const prior=running; running+=share; return {...r,share,cumulative:running,abc:prior<.8?'A':prior<.95?'B':'C'};});
  },[productData,productPeriod,productSupplier,productSearch]);
  const productTotalValue=productRows.reduce((sum,r)=>sum+r.value,0);
  const productTotalQty=productRows.reduce((sum,r)=>sum+r.quantity,0);
  const productTop5=productTotalValue?[...productRows].sort((a,b)=>b.value-a.value).slice(0,5).reduce((sum,r)=>sum+r.value,0)/productTotalValue:0;
  const productChartRows=[...productRows].sort((a,b)=>b.value-a.value).slice(0,8).map(r=>({...r,short:r.description}));
  const productABC=['A','B','C'].map(k=>({name:`Classe ${k}`,value:productRows.filter(r=>r.abc===k).reduce((sum,r)=>sum+r.value,0)}));
  const overallSpend = productData.reduce((sum,r)=>sum+(Number(r.value)||0),0);
  const overallQuantity = productData.reduce((sum,r)=>sum+(Number(r.quantity)||0),0);
  const overallSupplierNames = [...new Set(productData.map(r=>String(r.supplier||'').trim()).filter(Boolean))];
  const overallProductNames = [...new Set(productData.map(r=>String(r.description||'').trim()).filter(Boolean))];
  const supplierScorecards = useMemo(()=>{ const m=new Map(); productData.forEach(p=>{const name=String(p.supplier||'').trim(); if(!name)return; const r=m.get(name)||{supplier:name,value:0,quantity:0,products:new Set(),origins:new Set(),unitValues:[]}; r.value+=Number(p.value)||0; r.quantity+=Number(p.quantity)||0; if(p.description)r.products.add(String(p.description).trim()); if(p.origin)r.origins.add(p.origin); if(Number(p.unitValue)>0)r.unitValues.push(Number(p.unitValue)); m.set(name,r);}); return [...m.values()].map(r=>({...r,productCount:r.products.size,averageUnitValue:r.unitValues.length?r.unitValues.reduce((a,b)=>a+b,0)/r.unitValues.length:0,share:overallSpend?r.value/overallSpend:0})).sort((a,b)=>b.value-a.value); },[productData,overallSpend]);
  const priceHistory = useMemo(()=>{
    const m=new Map();
    productData.forEach(p=>{
      const key=String(p.description||'').trim().toUpperCase();
      if(!key)return;
      const r=m.get(key)||{description:String(p.description||'').trim(),supplierNames:new Set(),firstQty:0,firstSpend:0,secondQty:0,secondSpend:0};
      if(p.supplier)r.supplierNames.add(p.supplier);
      const q=Number(p.quantity)||0, v=Number(p.value)||0;
      if((p.period||'').includes('1º')){r.firstQty+=q;r.firstSpend+=v;}
      else if((p.period||'').includes('2º')){r.secondQty+=q;r.secondSpend+=v;}
      m.set(key,r);
    });
    return [...m.values()].map(r=>{
      const first=r.firstQty?r.firstSpend/r.firstQty:0;
      const second=r.secondQty?r.secondSpend/r.secondQty:0;
      const variation=first>0&&second>0?(second/first)-1:null;
      // Impacto estimado comparando os preços médios e aplicando a diferença à quantidade do 2º semestre.
      const impact=(first>0&&second>0)?(first-second)*r.secondQty:0;
      return {...r,firstUnit:first,secondUnit:second,variation,impact,dropAmount:impact>0?impact:0,increaseAmount:impact<0?Math.abs(impact):0,hasBoth:first>0&&second>0};
    }).filter(r=>r.hasBoth).sort((a,b)=>Math.abs(b.variation)-Math.abs(a.variation));
  },[productData]);
  const priceDropCount = priceHistory.filter(r=>r.variation < -0.001).length;
  const priceIncreaseCount = priceHistory.filter(r=>r.variation > 0.001).length;
  const averageDropPct = priceDropCount ? priceHistory.filter(r=>r.variation < -0.001).reduce((sum,r)=>sum+Math.abs(r.variation),0)/priceDropCount : 0;
  const averageIncreasePct = priceIncreaseCount ? priceHistory.filter(r=>r.variation > 0.001).reduce((sum,r)=>sum+r.variation,0)/priceIncreaseCount : 0;
  useEffect(()=>{try{localStorage.setItem('radar-action-items',JSON.stringify(actionItems));}catch{}},[actionItems]);
  const addAction = () => { if(!actionForm.title.trim()) return; setActionItems(prev=>[{id:Date.now(),...actionForm,title:actionForm.title.trim(),createdAt:new Date().toISOString()},...prev]); setActionForm({title:'',owner:'',due:'',priority:'Média',target:'',status:'Pendente'}); };
  const updateAction = (id,patch) => setActionItems(prev=>prev.map(item=>item.id===id?{...item,...patch}:item));
  const removeAction = id => setActionItems(prev=>prev.filter(item=>item.id!==id));
  const exportProducts=()=>{
    const lines=[['Código','Descrição','Quantidade','Valor líquido','Participação','ABC'],...productRows.map(r=>[r.code,r.description,r.quantity,r.value,r.share,r.abc])];
    const csv='\\ufeff'+lines.map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(';')).join('\\r\\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})); const a=document.createElement('a'); a.href=url; a.download='abc-produtos.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    const header=['Fornecedor','Origem','Quantidade','Valor (R$)','Participação','Classe ABC'];
    const lines=[header,...abcRows.map(r=>[r.supplier,r.origin,r.quantity,r.value,r.share,r.abc])];
    const csv='\ufeff'+lines.map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(';')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
    const a=document.createElement('a'); a.href=url; a.download='analise-fornecedores.csv'; a.click(); URL.revokeObjectURL(url);
  };
  const onFile = async e => {
    const file=e.target.files?.[0]; if(!file) return;
    e.target.value='';
    if (!canImport) { setNotice('Você possui acesso somente para consulta.'); return; }
    if (file.size > 15 * 1024 * 1024) { setNotice('O arquivo ultrapassa 15 MB.'); return; }
    try {
      // Restaura as origens sem publicar o JSON original no GitHub.
      if (/\.json$/i.test(file.name)) {
        const fornecedores = JSON.parse(await file.text());
        if (!Array.isArray(fornecedores) || !fornecedores.length ||
            !fornecedores.every(p => typeof p.period==='string' && Array.isArray(p.suppliers)))
          throw new Error('JSON de fornecedores inválido. Selecione o src/suppliers.json do projeto original.');
        await sgfBridge.publish({fornecedores},file.name);
        setNotice('Origem e períodos dos fornecedores restaurados no Firebase.');
        return;
      }
      const produtos = await parseProductWorkbook(file);
      if (produtos) {
        await sgfBridge.publish({produtos}, file.name);
        setNotice(`${produtos.length} registros de produtos publicados no Firebase. O Radar mantém a análise original.`);
        return;
      }
      // A análise por fornecedor preserva o parser do projeto original.
      parseWorkbook(file, async parsed => {
        try {
          await sgfBridge.publish({fornecedores: parsed}, file.name);
          setPeriod('Todos'); setSearch('');
          setNotice('Planilha de fornecedores publicada e sincronizada com os demais usuários autorizados.');
        } catch(err) { setNotice('Falha ao publicar a planilha: ' + err.message); }
      }, err => setNotice(err));
    } catch(err) { setNotice('Falha ao importar a planilha: ' + err.message); }
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><LayoutDashboard size={21}/></div><div><strong>RADAR</strong><span>COMPRAS & SUPRIMENTOS</span></div></div>
      <div className="nav-label">ANÁLISE</div>
      <div className="nav-item active"><LayoutDashboard size={18}/> Visão geral</div>
      <div className="side-note"><span className="status-dot"/> Dados da planilha<br/><small>{uploadedName || 'ABC FORNECEDORES.xlsx'}</small></div>
      <div className="sidebar-bottom"><span>PAINEL GERENCIAL</span><p>Compras por fornecedor</p></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="eyebrow">SUPRIMENTOS / INTELIGÊNCIA DE COMPRAS</div><h1>Análise de fornecedores</h1><p className="subtitle">Visão financeira, volume comprado e concentração ABC.</p></div>
        <div className="top-actions">{canImport && <label className="btn btn-outline"><Upload size={16}/> Importar Excel<input type="file" accept=".xlsx,.xls,.json" onChange={onFile} hidden/></label>}<button className="btn btn-primary" onClick={downloadCSV}><Download size={16}/> Exportar análise</button></div>
      </header>
      <nav className="section-tabs" aria-label="Seções do Radar">{[['executivo','Visão executiva'],['abc','Análise ABC'],['precos','Preços e economia'],['fornecedores','Fornecedores e riscos'],['acoes','Plano de ação']].map(([key,label])=><button key={key} className={section===key?'active':''} onClick={()=>setSection(key)}>{label}</button>)}</nav>
      {section==='executivo' && <><section className="executive-intro"><div><div className="eyebrow">PAINEL GERENCIAL</div><h2>Visão executiva de compras</h2><p>Resumo financeiro baseado na planilha ABC PRODUTOS. Use os filtros da análise ABC para investigar os detalhes.</p></div><div className="data-stamp"><span className="status-dot"/> {productData.length.toLocaleString('pt-BR')} registros carregados</div></section><section className="kpis"><KPI icon={<Wallet/>} label="VALOR TOTAL COMPRADO" value={money(overallSpend)} note="Soma do valor líquido da planilha" tone="blue"/><KPI icon={<Package/>} label="QUANTIDADE COMPRADA" value={qty(overallQuantity)} note="Unidades conforme a fonte" tone="green"/><KPI icon={<Users/>} label="FORNECEDORES DISTINTOS" value={overallSupplierNames.length.toLocaleString('pt-BR')} note="Fornecedores identificados" tone="orange"/><KPI icon={<TrendingUp/>} label="PRODUTOS DISTINTOS" value={overallProductNames.length.toLocaleString('pt-BR')} note="Descrições na fonte original" tone="purple"/></section><section className="executive-grid"><div className="panel"><PanelTitle title="Maiores grupos de gasto" subtitle="Top 8 fornecedores por valor líquido"/><div className="executive-bars">{supplierScorecards.slice(0,8).map((r,i)=><div className="exec-bar-row" key={r.supplier}><div className="exec-bar-label"><span>{r.supplier}</span><strong>{money(r.value)}</strong></div><div className="exec-bar-track"><i style={{width:`${overallSpend?Math.max(1,r.value/overallSpend*100):0}%`}}/></div></div>)}</div></div><div className="panel"><PanelTitle title="Alertas gerenciais" subtitle="Pontos para investigar com a equipe"/><div className="management-alerts"><div><span className="alert-mark">1</span><section><strong>Concentração de compras</strong><p>Os cinco maiores fornecedores representam {pct(overallSpend?supplierScorecards.slice(0,5).reduce((a,r)=>a+r.value,0)/overallSpend:0)} do valor total.</p></section></div><div><span className="alert-mark">2</span><section><strong>Variação de preço</strong><p>{priceHistory.filter(r=>r.variation>0.001).length} produtos com aumento superior a 0,1% entre semestres, com dados comparáveis.</p></section></div><div><span className="alert-mark">3</span><section><strong>Dados de desempenho pendentes</strong><p>Prazo de entrega e qualidade ainda não estão na planilha atual; não são pontuados para evitar conclusões sem evidência.</p></section></div></div><button className="btn btn-primary" onClick={()=>setSection('acoes')}>Abrir plano de ação <ArrowUpRight size={15}/></button></div></section><section className="panel"><PanelTitle title="Indicadores de gestão" subtitle="Base atual e limites de informação"/><div className="readiness-grid"><div><strong>Disponível</strong><p>Valor líquido, quantidade, produto, fornecedor, data/mês e preço unitário.</p></div><div><strong>Calcular a seguir</strong><p>Economia realizada, preço negociado, prazo de entrega e não conformidades exigem histórico adicional.</p></div><div><strong>Regra de gestão</strong><p>Economia só deve ser reconhecida após comparar condições equivalentes e registrar o resultado efetivo.</p></div></div></section></>}
      {section==='precos' && <><section className="executive-intro"><div><div className="eyebrow">NEGOCIAÇÃO E CUSTO</div><h2>Histórico de preços</h2><p>Comparação do preço unitário médio ponderado entre semestres, para itens com registros nos dois períodos.</p></div></section><section className="kpis"><KPI icon={<TrendingUp/>} label="ITENS COM COMPARAÇÃO" value={priceHistory.length.toLocaleString('pt-BR')} note="Presentes nos dois semestres" tone="blue"/><KPI icon={<ArrowUpRight/>} label="PRODUTOS COM AUMENTO > 0,1%" value={priceIncreaseCount.toLocaleString('pt-BR')} note="Preço médio aumentou" tone="orange"/><KPI icon={<ArrowDownRight/>} label="PRODUTOS COM QUEDA > 0,1%" value={priceDropCount.toLocaleString('pt-BR')} note="Preço médio diminuiu" tone="green"/><KPI icon={<ArrowDownRight/>} label="MÉDIA PERCENTUAL DE QUEDA" value={pct(-averageDropPct)} note="Média das variações negativas acima de 0,1%" tone="green"/><KPI icon={<ArrowUpRight/>} label="MÉDIA PERCENTUAL DE AUMENTO" value={pct(averageIncreasePct)} note="Média das variações positivas acima de 0,1%" tone="orange"/></section><section className="panel table-panel"><div className="table-head"><PanelTitle title="Variação de preço por produto" subtitle="Preço médio ponderado = valor líquido ÷ quantidade; compare especificação e condição comercial antes de negociar"/><button className="btn btn-outline" onClick={()=>{const lines=[['Produto','Preço médio 1º semestre','Preço médio 2º semestre','Variação','Fornecedores'],...priceHistory.map(r=>[r.description,r.firstUnit,r.secondUnit,r.variation,[...r.supplierNames].join(' | ')])];const csv='\ufeff'+lines.map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='historico-precos.csv';a.click();URL.revokeObjectURL(url);}}><Download size={14}/> Exportar CSV</button></div><div className="table-scroll"><table><thead><tr><th>Produto</th><th className="num">Preço médio · 1º sem.</th><th className="num">Preço médio · 2º sem.</th><th className="num">Variação</th><th>Fornecedores</th><th>Sinal</th></tr></thead><tbody>{priceHistory.map(r=><tr key={r.description}><td className="supplier-name">{r.description}</td><td className="num">{money(r.firstUnit)}</td><td className="num">{money(r.secondUnit)}</td><td className="num" style={{color:r.variation>0?'#ff9b9b':r.variation<0?'#70e0b5':'#dce8fb',fontWeight:800}}>{pct(r.variation)}</td><td>{[...r.supplierNames].slice(0,3).join(', ')}</td><td><span className={`status-pill ${r.variation>0.001?'risk':r.variation < -0.001?'good':'neutral'}`}>{r.variation>0.001?'Aumento':r.variation < -0.001?'Queda':'Estável'}</span></td></tr>)}</tbody></table>{!priceHistory.length&&<div className="empty">Não há produtos com dados comparáveis nos dois semestres.</div>}</div></section></>}
      {section==='fornecedores' && <><section className="executive-intro"><div><div className="eyebrow">GESTÃO DE FORNECEDORES</div><h2>Desempenho, concentração e risco</h2><p>O gasto e a variedade de produtos são calculados com os dados disponíveis. Pontualidade e qualidade ficam pendentes até haver dados de entrega e não conformidade.</p></div></section><section className="kpis"><KPI icon={<Users/>} label="FORNECEDORES" value={supplierScorecards.length.toLocaleString('pt-BR')} note="Com compras registradas" tone="blue"/><KPI icon={<TrendingUp/>} label="TOP 5 DO GASTO" value={pct(overallSpend?supplierScorecards.slice(0,5).reduce((a,r)=>a+r.value,0)/overallSpend:0)} note="Concentração financeira" tone="orange"/><KPI icon={<Package/>} label="FORNECEDOR ÚNICO" value={supplierScorecards.filter(r=>r.productCount===1).length.toLocaleString('pt-BR')} note="Fornecedores com 1 descrição" tone="purple"/><KPI icon={<FileSpreadsheet/>} label="INDICADORES PENDENTES" value="2" note="Entrega no prazo e qualidade" tone="green"/></section><section className="panel table-panel"><PanelTitle title="Scorecard de fornecedores" subtitle="Gasto, participação, produtos atendidos e preço unitário médio disponível"/><div className="table-scroll"><table><thead><tr><th>#</th><th>Fornecedor</th><th className="num">Valor comprado</th><th className="num">% do gasto</th><th className="num">Produtos</th><th className="num">Preço unitário médio</th><th>Entrega / qualidade</th><th>Risco de concentração</th></tr></thead><tbody>{supplierScorecards.map((r,i)=><tr key={r.supplier}><td className="rank">{String(i+1).padStart(2,'0')}</td><td className="supplier-name">{r.supplier}</td><td className="num money">{money(r.value)}</td><td className="num">{pct(r.share)}</td><td className="num">{r.productCount}</td><td className="num">{r.averageUnitValue?money(r.averageUnitValue):'—'}</td><td><span className="status-pill neutral">Sem dados</span></td><td><span className={`status-pill ${r.share>=0.2?'risk':r.share>=0.1?'neutral':'good'}`}>{r.share>=0.2?'Alta':r.share>=0.1?'Atenção':'Menor'}</span></td></tr>)}</tbody></table></div></section></>}
      {section==='acoes' && <><section className="executive-intro"><div><div className="eyebrow">EXECUÇÃO E RESPONSABILIDADE</div><h2>Plano de ação gerencial</h2><p>Registre negociações, responsáveis, prazos e resultados. As ações ficam salvas neste navegador.</p></div><div className="data-stamp">{actionItems.filter(a=>a.status==='Concluída').length} de {actionItems.length} concluídas</div></section><section className="panel action-form-panel"><PanelTitle title="Nova ação" subtitle="Cadastre uma oportunidade ou risco identificado na análise"/><div className="action-form"><label>Ação / oportunidade<input value={actionForm.title} onChange={e=>setActionForm({...actionForm,title:e.target.value})} placeholder="Ex.: renegociar preço do produto X"/></label><label>Responsável<input value={actionForm.owner} onChange={e=>setActionForm({...actionForm,owner:e.target.value})} placeholder="Nome do responsável"/></label><label>Prazo<input type="date" value={actionForm.due} onChange={e=>setActionForm({...actionForm,due:e.target.value})}/></label><label>Prioridade<select value={actionForm.priority} onChange={e=>setActionForm({...actionForm,priority:e.target.value})}><option>Alta</option><option>Média</option><option>Baixa</option></select></label><label>Meta / resultado esperado<input value={actionForm.target} onChange={e=>setActionForm({...actionForm,target:e.target.value})} placeholder="Ex.: reduzir custo em 5%"/></label><button className="btn btn-primary" onClick={addAction}>Adicionar ação</button></div></section><section className="panel table-panel"><PanelTitle title="Acompanhamento das ações" subtitle="Atualize o status e registre a conclusão das atividades"/>{actionItems.length===0?<div className="empty">Nenhuma ação cadastrada. Comece adicionando uma ação acima.</div>:<div className="table-scroll"><table><thead><tr><th>Ação</th><th>Responsável</th><th>Prazo</th><th>Prioridade</th><th>Meta / resultado</th><th>Status</th><th></th></tr></thead><tbody>{actionItems.map(a=><tr key={a.id}><td className="supplier-name">{a.title}</td><td>{a.owner||'—'}</td><td>{a.due||'—'}</td><td><span className={`status-pill ${a.priority==='Alta'?'risk':'neutral'}`}>{a.priority}</span></td><td>{a.target||'—'}</td><td><select className="action-status" value={a.status} onChange={e=>updateAction(a.id,{status:e.target.value})}><option>Pendente</option><option>Em andamento</option><option>Concluída</option><option>Cancelada</option></select></td><td><button className="delete-action" onClick={()=>removeAction(a.id)}>Excluir</button></td></tr>)}</tbody></table></div>}</section></>}
      {notice && <div className="notice" role="status">{notice}<button onClick={()=>setNotice('')}>×</button></div>}
      {section==='abc' && <><div className="view-switch"><button className={view==='fornecedores'?'selected':''} onClick={()=>setView('fornecedores')}>ABC por fornecedor</button><button className={view==='produtos'?'selected':''} onClick={()=>setView('produtos')}>ABC por produto</button></div>
      {view==='fornecedores' && <>
      <section className="filters">
        <div className="filter-title"><Filter size={16}/> FILTROS</div>
        <label>Fonte dos dados<select value="produtos" disabled><option value="produtos">ABC PRODUTOS.xlsx</option></select></label>
        <label>Período<select value={period} onChange={e=>setPeriod(e.target.value)}><option>Todos</option>{supplierData.map(p=><option key={p.period}>{p.period}</option>)}</select></label>
        <label>Origem<select value={origin} onChange={e=>setOrigin(e.target.value)}><option>Todas</option><option>Nacional</option><option>Importado</option><option>Não informado</option></select></label>
        <label className="search-label">Buscar fornecedor<div className="searchbox"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nome do fornecedor..."/></div></label>
        <button className="reset-btn" onClick={()=>{setPeriod('Todos');setOrigin('Todas');setSearch('');}}>Limpar filtros</button>
      </section>
      <section className="kpis">
        <KPI icon={<Wallet/>} label="VALOR TOTAL COMPRADO" value={money(totalValue)} note="Soma do valor financeiro filtrado" tone="blue"/>
        <KPI icon={<Package/>} label="QUANTIDADE COMPRADA" value={qty(totalQty)} note="Volume total conforme unidade da planilha" tone="green"/>
        <KPI icon={<Users/>} label="FORNECEDORES" value={rows.length.toLocaleString('pt-BR')} note="Fornecedores no recorte selecionado" tone="orange"/>
        <KPI icon={<TrendingUp/>} label="CONCENTRAÇÃO TOP 5" value={pct(top5Share)} note="Participação dos cinco maiores por valor" tone="purple"/>
      </section>
      <section className="insight-row">
        <div className="insight-card"><div className="insight-icon"><ArrowUpRight size={18}/></div><div><span>MAIOR FORNECEDOR POR VALOR</span><strong>{topSupplier?.supplier||'—'}</strong><p>{topSupplier?`${money(topSupplier.value)} · ${pct(totalValue?topSupplier.value/totalValue:0)} do total`: 'Sem dados no filtro'}</p></div></div>
        <div className="insight-card"><div className="insight-icon gold"><FileSpreadsheet size={18}/></div><div><span>CRITÉRIO ABC</span><strong>A: até 80% · B: até 95% · C: restante</strong><p>Classificação recalculada sobre o valor filtrado.</p></div></div>
      </section>
      <section className="charts-grid">
        <div className={`panel wide chart-panel ${expandedChart==='suppliers'?'chart-panel-expanded':''}`}><div className="chart-panel-heading"><PanelTitle title="Maiores fornecedores por valor" subtitle="Ranking por valor financeiro · Top 8"/><button className="chart-expand-btn" onClick={()=>setExpandedChart(expandedChart==='suppliers'?null:'suppliers')} title={expandedChart==='suppliers'?'Reduzir gráfico':'Expandir gráfico'} aria-label={expandedChart==='suppliers'?'Reduzir gráfico':'Expandir gráfico'}>{expandedChart==='suppliers'?<Minimize2 size={17}/>:<Maximize2 size={17}/>}<span>{expandedChart==='suppliers'?'Reduzir':'Expandir'}</span></button></div><div className="chart chart-vertical"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartRows} margin={{top:12,right:18,left:10,bottom:expandedChart==='suppliers'?95:78}} barCategoryGap={expandedChart==='suppliers'?'24%':'18%'}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#29486C"/><XAxis dataKey="short" angle={-28} textAnchor="end" interval={0} height={expandedChart==='suppliers'?100:85} tick={{fontSize:expandedChart==='suppliers'?13:11,fill:'#DCE8FB'}} axisLine={{stroke:'#315078'}} tickLine={false}/><YAxis tickFormatter={v=>v>=1000000?`R$ ${(v/1000000).toLocaleString('pt-BR',{maximumFractionDigits:1})} mi`:v>=1000?`R$ ${(v/1000).toLocaleString('pt-BR',{maximumFractionDigits:0})} mil`:`R$ ${v}`} tick={{fontSize:11,fill:'#A9BFDF'}} axisLine={false} tickLine={false} width={78}/><Tooltip formatter={v=>money(v)} contentStyle={{backgroundColor:'#07182D',border:'1px solid #315078',borderRadius:8,color:'#F4F8FF'}} labelStyle={{color:'#E0EBFF'}} itemStyle={{color:'#FFFFFF'}} cursor={{fill:'#ffffff0b'}}/><Bar dataKey="value" name="Valor comprado" fill="#2785FF" radius={[5,5,0,0]} maxBarSize={expandedChart==='suppliers'?54:42}/></BarChart></ResponsiveContainer></div></div>
        <div className="panel"><PanelTitle title="Distribuição ABC" subtitle="Valor financeiro por classe"/><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={abcTotals} dataKey="value" nameKey="name" innerRadius={65} outerRadius={95} paddingAngle={3} stroke="none">{abcTotals.map((entry,i)=><Cell key={entry.name} fill={['#173A8A','#F9A825','#D8DEE9'][i]}/>)}</Pie><Tooltip formatter={v=>money(v)}/><Legend verticalAlign="bottom" iconType="circle"/></PieChart></ResponsiveContainer><div className="donut-center"><strong>{money(totalValue)}</strong><span>Total filtrado</span></div></div><div className="abc-legend">{['A','B','C'].map((k,i)=><div key={k}><span className={`abc-chip abc-${k}`}>{k}</span><span>Classe {k}</span><strong>{pct(totalValue?abcTotals[i].value/totalValue:0)}</strong></div>)}</div></div>
      </section>
      <section className="panel comparison"><PanelTitle title="Comparativo entre semestres" subtitle="Top fornecedores por valor em cada semestre · visão da planilha completa"/><div className="compare-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={semesterCompare} margin={{top:8,right:16,left:8,bottom:48}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf4"/><XAxis dataKey="supplier" angle={-20} textAnchor="end" interval={0} tick={{fontSize:10,fill:'#65718a'}} axisLine={false} tickLine={false}/><YAxis tickFormatter={v=>v>=1000000?`R$ ${(v/1000000).toFixed(1)} mi`:v>=1000?`R$ ${(v/1000).toFixed(0)} mil`:`R$ ${v}`} tick={{fontSize:10,fill:'#65718a'}} axisLine={false} tickLine={false} width={76}/><Tooltip formatter={v=>money(v)}/><Legend/><Bar dataKey="1º Semestre" fill="#173A8A" radius={[4,4,0,0]}/><Bar dataKey="2º Semestre" fill="#2E7D32" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></section>
      <section className="panel table-panel"><div className="table-head"><PanelTitle title="Ranking detalhado de fornecedores" subtitle={`${abcRows.length} fornecedores · ordenação por ${sort==='value'?'valor':sort==='quantity'?'quantidade':'participação'}`}/><div className="sort-control"><span>Ordenar por</span><select value={sort} onChange={e=>setSort(e.target.value)}><option value="value">Valor</option><option value="quantity">Quantidade</option><option value="share">Participação</option></select></div></div>
        <div className="table-scroll"><table><thead><tr><th>#</th><th>Fornecedor</th><th>Origem</th><th className="num">Quantidade</th><th className="num">Valor comprado</th><th className="num">% do total</th><th>ABC</th></tr></thead><tbody>{[...abcRows].sort((a,b)=>b[sort]-a[sort]).map((r,i)=><tr key={r.supplier}><td className="rank">{String(i+1).padStart(2,'0')}</td><td className="supplier-name">{r.supplier}</td><td><span className={`origin origin-${r.origin==='Nacional'?'national':r.origin==='Importado'?'imported':'unknown'}`}>{r.origin}</span></td><td className="num">{qty(r.quantity)}</td><td className="num money">{money(r.value)}</td><td className="num"><div className="share-cell"><span>{pct(totalValue?r.value/totalValue:0)}</span><div className="share-track"><i style={{width:`${Math.min(100,totalValue?r.value/totalValue*100:0)}%`}}/></div></div></td><td><span className={`abc-chip abc-${r.abc}`}>{r.abc}</span></td></tr>)}</tbody></table>{!abcRows.length&&<div className="empty">Nenhum fornecedor encontrado para os filtros selecionados.</div>}</div>
      </section>
      <footer>Fonte: ABC PRODUTOS.xlsx · valores e quantidades consolidados por fornecedor. <span>Dashboard de apoio à decisão de compras</span></footer>
      </>}
      {view==='produtos' && <>
        <section className="filters product-filters">
          <div className="filter-title"><Filter size={16}/> FILTROS DE PRODUTO</div>
          <label>Período<select value={productPeriod} onChange={e=>setProductPeriod(e.target.value)}><option>Todos</option><option>1º Semestre</option><option>2º Semestre</option></select></label>
          <label>Fornecedor<select value={productSupplier} onChange={e=>setProductSupplier(e.target.value)}>{productSuppliers.map(name=><option key={name}>{name}</option>)}</select></label>
          <label className="search-label">Buscar produto<div className="searchbox"><Search size={16}/><input value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="Código, descrição ou fornecedor..."/></div></label>
          <button className="reset-btn" onClick={()=>{setProductPeriod('Todos');setProductSupplier('Todos');setProductSearch('');}}>Limpar filtros</button>
        </section>
        <section className="kpis">
          <KPI icon={<Wallet/>} label="VALOR TOTAL DOS PRODUTOS" value={money(productTotalValue)} note="Valor líquido conforme a planilha ABC PRODUTOS" tone="blue"/>
          <KPI icon={<Package/>} label="QUANTIDADE COMPRADA" value={qty(productTotalQty)} note="Soma das quantidades dos produtos" tone="green"/>
          <KPI icon={<Package/>} label="PRODUTOS DISTINTOS" value={productRows.length.toLocaleString('pt-BR')} note="Código e descrição consolidados" tone="orange"/>
          <KPI icon={<TrendingUp/>} label="CONCENTRAÇÃO TOP 5" value={pct(productTop5)} note="Participação dos cinco maiores produtos" tone="purple"/>
        </section>
        <section className="charts-grid">
          <div className={`panel wide chart-panel ${expandedChart==='products'?'chart-panel-expanded':''}`}><div className="chart-panel-heading"><PanelTitle title="Produtos com maior valor comprado" subtitle="Ranking financeiro · Top 8"/><button className="chart-expand-btn" onClick={()=>setExpandedChart(expandedChart==='products'?null:'products')} title={expandedChart==='products'?'Reduzir gráfico':'Expandir gráfico'} aria-label={expandedChart==='products'?'Reduzir gráfico':'Expandir gráfico'}>{expandedChart==='products'?<Minimize2 size={17}/>:<Maximize2 size={17}/>}<span>{expandedChart==='products'?'Reduzir':'Expandir'}</span></button></div><div className="chart chart-vertical"><ResponsiveContainer width="100%" height="100%"><BarChart data={productChartRows} margin={{top:12,right:18,left:10,bottom:expandedChart==='products'?145:118}} barCategoryGap={expandedChart==='products'?'24%':'18%'}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#29486C"/><XAxis dataKey="short" interval={0} height={expandedChart==='products'?145:118} tick={<ProductAxisTick expanded={expandedChart==='products'}/>} axisLine={{stroke:'#315078'}} tickLine={false}/><YAxis tickFormatter={v=>v>=1000000?`R$ ${(v/1000000).toLocaleString('pt-BR',{maximumFractionDigits:1})} mi`:v>=1000?`R$ ${(v/1000).toLocaleString('pt-BR',{maximumFractionDigits:0})} mil`:`R$ ${v}`} tick={{fontSize:11,fill:'#A9BFDF'}} axisLine={false} tickLine={false} width={78}/><Tooltip formatter={v=>money(v)} contentStyle={{backgroundColor:'#07182D',border:'1px solid #315078',borderRadius:8,color:'#F4F8FF'}} labelStyle={{color:'#E0EBFF'}} itemStyle={{color:'#FFFFFF'}} cursor={{fill:'#ffffff0b'}}/><Bar dataKey="value" name="Valor líquido" fill="#2785FF" radius={[5,5,0,0]} maxBarSize={expandedChart==='products'?54:42}/></BarChart></ResponsiveContainer></div></div>
          <div className="panel"><PanelTitle title="Curva ABC de produtos" subtitle="Distribuição do valor líquido"/><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={productABC} dataKey="value" nameKey="name" innerRadius={65} outerRadius={95} paddingAngle={3} stroke="none">{productABC.map((entry,i)=><Cell key={entry.name} fill={['#173A8A','#F9A825','#D8DEE9'][i]}/>)}</Pie><Tooltip formatter={v=>money(v)}/><Legend verticalAlign="bottom" iconType="circle"/></PieChart></ResponsiveContainer><div className="donut-center"><strong>{money(productTotalValue)}</strong><span>Total filtrado</span></div></div><div className="abc-legend">{['A','B','C'].map((k,i)=><div key={k}><span className={`abc-chip abc-${k}`}>{k}</span><span>Classe {k}</span><strong>{pct(productTotalValue?productABC[i].value/productTotalValue:0)}</strong></div>)}</div></div>
        </section>
        <section className="panel table-panel"><div className="table-head"><PanelTitle title="Ranking ABC por produto" subtitle={`${productRows.length} produtos · classificação calculada pelo valor líquido`}/><div className="table-actions"><div className="sort-control"><span>Ordenar por</span><select value={productSort} onChange={e=>setProductSort(e.target.value)}><option value="value">Valor</option><option value="quantity">Quantidade</option><option value="share">Participação</option></select></div><button className="btn btn-outline" onClick={exportProducts}><Download size={14}/> Exportar CSV</button></div></div>
          <div className="table-scroll"><table><thead><tr><th>#</th><th>Código</th><th>Descrição do produto</th><th className="num">Fornecedores</th><th className="num">Quantidade</th><th className="num">Valor líquido</th><th className="num">% do total</th><th>ABC</th></tr></thead><tbody>{[...productRows].sort((a,b)=>b[productSort]-a[productSort]).map((r,i)=><tr key={`${r.code}-${r.description}`}><td className="rank">{String(i+1).padStart(2,'0')}</td><td>{r.code}</td><td className="supplier-name">{r.description}</td><td className="num">{r.suppliersCount}</td><td className="num">{qty(r.quantity)}</td><td className="num money">{money(r.value)}</td><td className="num"><div className="share-cell"><span>{pct(productTotalValue?r.value/productTotalValue:0)}</span><div className="share-track"><i style={{width:`${Math.min(100,productTotalValue?r.value/productTotalValue*100:0)}%`}}/></div></div></td><td><span className={`abc-chip abc-${r.abc}`}>{r.abc}</span></td></tr>)}</tbody></table>{!productRows.length&&<div className="empty">Nenhum produto encontrado para os filtros selecionados.</div>}</div>
        </section>
        <footer>Fonte: ABC PRODUTOS.xlsx · Análise consolidada por código e descrição. <span>Classificação ABC recalculada pelo valor líquido</span></footer>
      </>}
      </>}
    </main>
  </div>;
}

function KPI({icon,label,value,note,tone}) {
  return <div className="kpi"><div className={`kpi-icon ${tone}`}>{React.cloneElement(icon,{size:20,strokeWidth:2})}</div><div className="kpi-label">{label}</div><div className="kpi-value">{value}</div><div className="kpi-note">{note}</div></div>;
}
function PanelTitle({title,subtitle}) { return <div className="panel-title"><div><h2>{title}</h2><p>{subtitle}</p></div></div>; }
