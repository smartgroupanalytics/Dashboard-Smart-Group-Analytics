import { protegerModulo } from "../../../module-guard.js";
import { auth, db } from "../../../firebase-config.js";
import {
  collection, doc, getDocs, deleteDoc, onSnapshot, runTransaction,
  serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

await protegerModulo("comex");

const COLLECTION = "comex_pj_desenvolvimentos";
const LOCAL_KEY = "smart_comex_pj_local_v1";
const DAY = 86400000;

const FIELD_DEFS = [
  {key:"diasProcesso", excel:"DIAS  EM PROCESSO", label:"DIAS EM PROCESSO", owner:"GERAL", type:"number", readonly:true},
  {key:"dataRecebimentoMaterial", excel:"DATA RECEBIMENTO CARTELA/ MATERIAL DO CLIENTE", label:"DATA RECEBIMENTO CARTELA/ MATERIAL DO CLIENTE", owner:"COMERCIAL", type:"date"},
  {key:"encaminhamentoEngenharia", excel:"ENCAMINHAMENTO PARA ENGENHARIA", label:"ENCAMINHAMENTO PARA ENGENHARIA", owner:"COMERCIAL", type:"date"},
  {key:"vencimentoComercial", excel:"VENCIMENTO", label:"VENCIMENTO", owner:"COMERCIAL", type:"date"},
  {key:"pj", excel:"PJ #", label:"PJ #", owner:"ENGENHARIA", type:"text", required:true},
  {key:"paisDestino", excel:"PAÍS DESTINO", label:"PAÍS DESTINO", owner:"ENGENHARIA", type:"text"},
  {key:"dataCotacao", excel:"DATA COTAÇÃO", label:"DATA COTAÇÃO", owner:"ENGENHARIA", type:"date"},
  {key:"mesSolicitado", excel:"MÊS SOLICITADO", label:"MÊS SOLICITADO", owner:"ENGENHARIA", type:"text"},
  {key:"nomeMaterial", excel:"NOME DO MATERAIL DO PJ", label:"NOME DO MATERAIL DO PJ", owner:"ENGENHARIA", type:"text", required:true},
  {key:"caracteristicaMaterial", excel:"CARACTERÍSTICAMATERIAL", label:"CARACTERÍSTICAMATERIAL", owner:"ENGENHARIA", type:"text"},
  {key:"cor", excel:"COR", label:"COR", owner:"ENGENHARIA", type:"text"},
  {key:"siglaCliente", excel:"SIGLA CLIENTE", label:"SIGLA CLIENTE", owner:"ENGENHARIA", type:"text"},
  {key:"encaminhamentoComex", excel:"ENCAMINHAMENTO COMEX", label:"ENCAMINHAMENTO COMEX", owner:"ENGENHARIA", type:"date"},
  {key:"vencimentoEngenharia", excel:"VENCIMENTO", label:"VENCIMENTO", owner:"ENGENHARIA", type:"date"},
  {key:"aguardarEnvio", excel:"AGUARDAR ENVIO", label:"AGUARDAR ENVIO", owner:"CONTROLE", type:"select", options:["","SIM","NÃO"]},
  {key:"fedexAwbIda", excel:"FEDEX AWB", label:"FEDEX AWB", owner:"COMEX", type:"text"},
  {key:"dataEnvioDestino", excel:"DATA DE ENVIO PARA DESTINO", label:"DATA DE ENVIO PARA DESTINO", owner:"COMEX", type:"date"},
  {key:"dataRecebimentoDestino", excel:"DATA DE RECEBIMENTO NO DESTINO", label:"DATA DE RECEBIMENTO NO DESTINO", owner:"CHINA", type:"date"},
  {key:"fornecedor", excel:"FORNECEDOR", label:"FORNECEDOR", owner:"CHINA", type:"text"},
  {key:"somenteCotar", excel:"SOMENTE PARA COTAR", label:"SOMENTE PARA COTAR", owner:"CHINA", type:"select", options:["","SIM","NÃO"]},
  {key:"desenvolver", excel:"DESENVOLVER", label:"DESENVOLVER", owner:"CHINA", type:"select", options:["","SIM","NÃO"]},
  {key:"dataInicio", excel:"DATA INICIO", label:"DATA INICIO", owner:"CHINA", type:"date"},
  {key:"dataFim", excel:"DATA FIM", label:"DATA FIM", owner:"CHINA", type:"date"},
  {key:"fedexAwbVolta", excel:"FEDEX AWB", label:"FEDEX AWB", owner:"CHINA", type:"text"},
  {key:"dataEnvioBrasil", excel:"DATA ENVIO PARA O BRASIL", label:"DATA ENVIO PARA O BRASIL", owner:"CHINA", type:"date"},
  {key:"statusDestino", excel:"STATUS DESTINO", label:"STATUS DESTINO", owner:"CHINA", type:"text"},
  {key:"dataPrecoOrigem", excel:"DATA RECEBIMENTO DO PREÇO DA ORIGEM", label:"DATA RECEBIMENTO DO PREÇO DA ORIGEM", owner:"COMEX", type:"date"},
  {key:"dataRecebimentoBrasil", excel:"DATA RECEBIMENTO NO BRASIL", label:"DATA RECEBIMENTO NO BRASIL", owner:"COMEX", type:"date"},
  {key:"dataEncaminhamentoEngenhariaFinal", excel:"DATA ENCAMINHAMENTO PARA ENGENHARIA", label:"DATA ENCAMINHAMENTO PARA ENGENHARIA", owner:"COMEX", type:"date"},
  {key:"dataEntregueComercial", excel:"DATA ENTREGUE PARA COMERCIAL", label:"DATA ENTREGUE PARA COMERCIAL", owner:"ENGENHARIA", type:"date"},
  {key:"retornoComercial", excel:"RETORNO DO COMERCIAL", label:"RETORNO DO COMERCIAL (DECISÃO)", owner:"COMERCIAL", type:"select", options:["","APROVADO","REPROVADO"]},
  {key:"observacoesComercial", excel:"OBSERVAÇÕES", label:"MOTIVOS TÉCNICOS / OBSERVAÇÕES", owner:"COMERCIAL", type:"textarea"},
  {key:"refazerComercial", excel:"REFAZER", label:"REFAZER O DESENVOLVIMENTO?", owner:"COMERCIAL", type:"select", options:["","SIM","NÃO"]},
  {key:"statusFinal", excel:"STATUS FINAL DO PJ", label:"STATUS FINAL DO PJ", owner:"COMERCIAL", type:"select", options:["","APROVADO","ENCERRADO","REPROVADO"]}
];

const SECTIONS = [
  {id:"geral", title:"Controle geral", owner:"GERAL", note:"Cálculo automático", keys:["diasProcesso"]},
  {id:"comercial1", title:"1. Comercial", owner:"COMERCIAL", note:"Prazo D+1", keys:["dataRecebimentoMaterial","encaminhamentoEngenharia","vencimentoComercial"]},
  {id:"engenharia1", title:"2. Engenharia", owner:"ENGENHARIA", note:"Prazo 2 dias", keys:["pj","paisDestino","dataCotacao","mesSolicitado","nomeMaterial","caracteristicaMaterial","cor","siglaCliente","encaminhamentoComex","vencimentoEngenharia"]},
  {id:"controle", title:"Controle de envio", owner:"CONTROLE", note:"Campo da planilha entre Engenharia e COMEX", keys:["aguardarEnvio"]},
  {id:"comex1", title:"3. COMEX", owner:"COMEX", note:"Prazo até 7 dias", keys:["fedexAwbIda","dataEnvioDestino"]},
  {id:"china", title:"4. China / Fornecedor", owner:"CHINA", note:"Trânsito estimado 10 dias · desenvolvimento estimado 15 dias", keys:["dataRecebimentoDestino","fornecedor","somenteCotar","desenvolver","dataInicio","dataFim","fedexAwbVolta","dataEnvioBrasil","statusDestino"]},
  {id:"comex2", title:"5. COMEX", owner:"COMEX", note:"Retorno ao Brasil estimado em 10 dias", keys:["dataPrecoOrigem","dataRecebimentoBrasil","dataEncaminhamentoEngenhariaFinal"]},
  {id:"engenharia2", title:"6. Engenharia", owner:"ENGENHARIA", note:"Entrega do material ao Comercial", keys:["dataEntregueComercial"]},
  {id:"comercial2", title:"7. Comercial", owner:"COMERCIAL", note:"Retorno e encerramento do PJ", keys:["retornoComercial","observacoesComercial","refazerComercial","statusFinal"]}
];

const TIMELINE = [
  {id:"commercial", label:"Comercial", complete:r=>!!r.encaminhamentoEngenharia, start:r=>r.dataRecebimentoMaterial, due:r=>r.vencimentoComercial || addDaysString(r.dataRecebimentoMaterial,1)},
  {id:"engineering", label:"Engenharia", complete:r=>!!r.encaminhamentoComex, start:r=>r.encaminhamentoEngenharia, due:r=>r.vencimentoEngenharia || addDaysString(r.encaminhamentoEngenharia,2)},
  {id:"comex-out", label:"COMEX", complete:r=>!!r.dataEnvioDestino, start:r=>r.encaminhamentoComex, due:r=>addDaysString(r.encaminhamentoComex,7)},
  {id:"china-arrival", label:"China · Recebimento", complete:r=>!!r.dataRecebimentoDestino, start:r=>r.dataEnvioDestino, due:r=>addDaysString(r.dataEnvioDestino,10)},
  {id:"china-development", label:"China · Desenvolvimento", complete:r=>!!r.dataFim || !!r.dataEnvioBrasil, start:r=>r.dataInicio || r.dataRecebimentoDestino, due:r=>addDaysString(r.dataInicio || r.dataRecebimentoDestino,15)},
  {id:"return", label:"Retorno Brasil", complete:r=>!!r.dataRecebimentoBrasil, start:r=>r.dataEnvioBrasil, due:r=>addDaysString(r.dataEnvioBrasil,10)},
  {id:"comex-return", label:"COMEX", complete:r=>!!r.dataEncaminhamentoEngenhariaFinal, start:r=>r.dataRecebimentoBrasil, due:r=>null},
  {id:"engineering-final", label:"Engenharia", complete:r=>!!r.dataEntregueComercial, start:r=>r.dataEncaminhamentoEngenhariaFinal, due:r=>null},
  {id:"commercial-final", label:"Comercial", complete:r=>isCompleted(r), start:r=>r.dataEntregueComercial, due:r=>null}
];

const $ = s => document.querySelector(s);
const state = {records:[], filtered:[], selected:null, mode:"connecting", unsubscribe:null, editBaseline:null};

function normalize(v){return String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase()}
function escapeHtml(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
function dateObj(s){if(!s)return null;const d=new Date(`${String(s).slice(0,10)}T12:00:00`);return isNaN(d)?null:d}
function today(){const d=new Date();d.setHours(12,0,0,0);return d}
function dateString(d){if(!d)return "";const x=new Date(d);if(isNaN(x))return "";return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`}
function addDaysString(s,n){const d=dateObj(s);if(!d)return "";d.setDate(d.getDate()+n);return dateString(d)}
function diffDays(a,b){const x=dateObj(a),y=dateObj(b);if(!x||!y)return 0;return Math.max(0,Math.floor((y-x)/DAY))}
function formatDate(s){const d=dateObj(s);return d?d.toLocaleDateString("pt-BR"):"—"}
function valueText(v){return v===null||v===undefined||v===""?"—":String(v)}
const COUNTRY_CODE_MAP={
  "china":"cn","china continental":"cn","italia":"it","italy":"it","vietna":"vn","vietnam":"vn",
  "india":"in","turquia":"tr","turkey":"tr","brasil":"br","brazil":"br","paraguai":"py","paraguay":"py",
  "uruguai":"uy","uruguay":"uy","chile":"cl","argentina":"ar","peru":"pe","colombia":"co","equador":"ec","ecuador":"ec",
  "bolivia":"bo","venezuela":"ve","mexico":"mx","estados unidos":"us","eua":"us","usa":"us","canada":"ca",
  "portugal":"pt","espanha":"es","spain":"es","franca":"fr","france":"fr","alemanha":"de","germany":"de",
  "reino unido":"gb","inglaterra":"gb","uk":"gb","holanda":"nl","paises baixos":"nl","belgica":"be","suica":"ch",
  "polonia":"pl","suecia":"se","dinamarca":"dk","noruega":"no","finlandia":"fi","grecia":"gr","romenia":"ro","russia":"ru",
  "japao":"jp","coreia do sul":"kr","coreia":"kr","taiwan":"tw","indonesia":"id","paquistao":"pk","bangladesh":"bd",
  "malasia":"my","singapura":"sg","tailandia":"th","filipinas":"ph","emirados arabes unidos":"ae","emirados arabes":"ae",
  "arabia saudita":"sa","israel":"il","egito":"eg","africa do sul":"za","australia":"au","nova zelandia":"nz"
};
function countryCode(country){return COUNTRY_CODE_MAP[normalize(country)]||""}
const COUNTRY_FLAG_SVG={
  py:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="6.67" fill="#d52b1e"/><rect y="6.67" width="30" height="6.66" fill="#fff"/><rect y="13.33" width="30" height="6.67" fill="#0038a8"/><circle cx="15" cy="10" r="2.1" fill="#f4c542" stroke="#2f6b3b" stroke-width=".8"/></svg>',
  cn:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#de2910"/><text x="4" y="8" font-size="7" fill="#ffde00">★</text></svg>',
  it:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="10" height="20" fill="#009246"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ce2b37"/></svg>',
  vn:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#da251d"/><text x="10" y="14" font-size="11" fill="#ff0">★</text></svg>',
  in:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="6.67" fill="#ff9933"/><rect y="6.67" width="30" height="6.66" fill="#fff"/><rect y="13.33" width="30" height="6.67" fill="#138808"/><circle cx="15" cy="10" r="2.2" fill="none" stroke="#000080" stroke-width=".8"/></svg>',
  tr:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#e30a17"/><circle cx="12" cy="10" r="5" fill="#fff"/><circle cx="14" cy="10" r="4" fill="#e30a17"/><text x="17" y="13" font-size="6" fill="#fff">★</text></svg>',
  br:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#009b3a"/><path d="M15 2.5 27 10 15 17.5 3 10Z" fill="#ffdf00"/><circle cx="15" cy="10" r="4.2" fill="#002776"/></svg>',
  ar:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="6.67" fill="#74acdf"/><rect y="6.67" width="30" height="6.66" fill="#fff"/><rect y="13.33" width="30" height="6.67" fill="#74acdf"/><circle cx="15" cy="10" r="1.6" fill="#f6b40e"/></svg>',
  uy:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/><path d="M0 4h30v2H0zm0 4h30v2H0zm0 4h30v2H0zm0 4h30v2H0z" fill="#0038a8"/><rect width="11" height="11" fill="#fff"/><circle cx="5.5" cy="5.5" r="2.1" fill="#f6b40e"/></svg>',
  cl:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="10" fill="#fff"/><rect y="10" width="30" height="10" fill="#d52b1e"/><rect width="10" height="10" fill="#0039a6"/><text x="2" y="8" font-size="7" fill="#fff">★</text></svg>',
  mx:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="10" height="20" fill="#006847"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ce1126"/><circle cx="15" cy="10" r="1.5" fill="#8a6d3b"/></svg>',
  us:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/><path d="M0 0h30v2H0zm0 4h30v2H0zm0 8h30v2H0zm0 4h30v2H0z" fill="#b22234"/><rect width="13" height="10" fill="#3c3b6e"/></svg>',
  gb:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#012169"/><path d="M0 0 30 20M30 0 0 20" stroke="#fff" stroke-width="4"/><path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="6"/><path d="M15 0v20M0 10h30" stroke="#c8102e" stroke-width="3"/></svg>',
  de:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="6.67" fill="#000"/><rect y="6.67" width="30" height="6.66" fill="#dd0000"/><rect y="13.33" width="30" height="6.67" fill="#ffce00"/></svg>',
  fr:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="10" height="20" fill="#0055a4"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ef4135"/></svg>',
  es:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#aa151b"/><rect y="5" width="30" height="10" fill="#f1bf00"/></svg>',
  pt:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="12" height="20" fill="#046a38"/><rect x="12" width="18" height="20" fill="#da291c"/><circle cx="12" cy="10" r="2" fill="#ffcc00"/></svg>',
  jp:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="5" fill="#bc002d"/></svg>',
  kr:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="4" fill="#cd2e3a"/><path d="M11 10a4 4 0 0 0 8 0" fill="#0047a0"/></svg>'
};
function countryFlagHtml(country){const code=countryCode(country);const svg=COUNTRY_FLAG_SVG[code];if(svg){const src=`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;return `<img class="country-flag-img" src="${src}" alt="Bandeira ${escapeHtml(country)}">`}if(code)return `<span class="country-code-flag">${escapeHtml(code.toUpperCase())}</span>`;return '<span class="country-flag-fallback"><i class="fa-regular fa-flag"></i></span>'}
function countryLabel(country){return valueText(country)}
function countryVisualHtml(country){const txt=valueText(country);if(txt==="—")return txt;return `<span class="country-visual">${countryFlagHtml(country)}<span>${escapeHtml(txt)}</span></span>`}
function updateCountryPreview(){const input=$("[name=paisDestino]");const preview=$("#countryPreview");if(!preview)return;const value=input?.value?.trim()||"";preview.innerHTML=value?countryVisualHtml(value):'<span class="country-preview-placeholder">Bandeira automática</span>';preview.classList.toggle("active",!!value)}
function displayFieldValue(field, raw){return field?.type==="date"?formatDate(raw):valueText(raw)}
// A refação reinicia na CHINA/FORNECEDOR, mantendo intacto o ciclo original.
const REFACAO_SECTIONS = SECTIONS.slice(5).map(section=>section.id==="china"
  ? {...section, keys:["fornecedor",...section.keys.filter(k=>k!=="fornecedor")]}
  : section);
const REFACAO_KEYS = REFACAO_SECTIONS.flatMap(s=>s.keys);
const EXCEL_LAYOUT = ["diasProcesso","dataRecebimentoMaterial","encaminhamentoEngenharia","vencimentoComercial","pj","paisDestino","dataCotacao","mesSolicitado","nomeMaterial","caracteristicaMaterial","cor","siglaCliente","encaminhamentoComex",null,"vencimentoEngenharia","aguardarEnvio","fedexAwbIda","dataEnvioDestino","dataRecebimentoDestino","fornecedor","somenteCotar","desenvolver","dataInicio","dataFim","fedexAwbVolta","dataEnvioBrasil","statusDestino","dataPrecoOrigem","dataRecebimentoBrasil","dataEncaminhamentoEngenhariaFinal","dataEntregueComercial","retornoComercial","observacoesComercial","statusFinal","refazerComercial"];
function upper(v){return normalize(v).toUpperCase()}
function validEnd(v){return ["APROVADO","ENCERRADO","REPROVADO"].includes(upper(v))}
function shouldRefazer(obj){return (upper(obj.retornoComercial)==="REPROVADO" || upper(obj.statusFinal)==="REPROVADO") && upper(obj.refazerComercial)!=="NAO"}
function activeCycle(r){return Array.isArray(r.refacoes)&&r.refacoes.length?r.refacoes[r.refacoes.length-1]:null}
function currentSupplier(r){const cycle=activeCycle(r);return cycle?cycle.fornecedor||"—":r.fornecedor||"—"}
function cycleEnd(c){return validEnd(c?.statusFinal) && !shouldRefazer(c)}
function isCompleted(r){const c=activeCycle(r);if(c)return cycleEnd(c);if(shouldRefazer(r))return false;const s=normalize(r.statusFinal);return !!s && !["andamento","em andamento","aguardando","pendente"].includes(s)}
function buildCycleTimeline(c){
 const start=c?.abertoEm||dateString(today());
 return [
 {id:"ref-china-fornecedor",label:"China · Fornecedor",sector:"CHINA",complete:!!String(c.fornecedor||"").trim(),start,due:"",date:""},
 {id:"ref-china-arrival",label:"China · Recebimento",sector:"CHINA",complete:!!c.dataRecebimentoDestino,start,due:addDaysString(start,10),date:c.dataRecebimentoDestino},
 {id:"ref-china-development",label:"China · Desenvolvimento",sector:"CHINA",complete:!!c.dataFim||!!c.dataEnvioBrasil,start:c.dataInicio||c.dataRecebimentoDestino||start,due:addDaysString(c.dataInicio||c.dataRecebimentoDestino,15),date:c.dataFim||c.dataEnvioBrasil},
 {id:"ref-comex-return",label:"COMEX · Retorno",sector:"COMEX",complete:!!c.dataRecebimentoBrasil,start:c.dataEnvioBrasil,due:addDaysString(c.dataEnvioBrasil,10),date:c.dataRecebimentoBrasil},
 {id:"ref-comex-eng",label:"COMEX → Engenharia",sector:"COMEX",complete:!!c.dataEncaminhamentoEngenhariaFinal,start:c.dataRecebimentoBrasil,due:"",date:c.dataEncaminhamentoEngenhariaFinal},
 {id:"ref-engineering",label:"Engenharia",sector:"ENGENHARIA",complete:!!c.dataEntregueComercial,start:c.dataEncaminhamentoEngenhariaFinal,due:"",date:c.dataEntregueComercial},
 {id:"ref-commercial",label:"Comercial",sector:"COMERCIAL",complete:cycleEnd(c),start:c.dataEntregueComercial,due:"",date:c.dataEntregueComercial}
 ];
}
function currentStage(r){
 const cycle=activeCycle(r);
 if(cycle&&!cycleEnd(cycle)){
  const stages=buildCycleTimeline(cycle);const index=Math.max(0,stages.findIndex(x=>!x.complete));const stage=stages[index];
  return {index,label:`Refação ${r.refacoes.length} · ${stage.label}`,sector:stage.sector,cycle:true,stages,stage:{start:()=>stage.start,due:()=>stage.due}};
 }
 if(isCompleted(r))return {index:TIMELINE.length-1,label:"Concluído",sector:"COMERCIAL",stage:TIMELINE.at(-1)};
 for(let i=0;i<TIMELINE.length;i++){
  if(!TIMELINE[i].complete(r)){
   const label=TIMELINE[i].label;
   const sector=label.startsWith("China")?"CHINA":label.includes("Retorno Brasil")?"COMEX":label.toUpperCase().includes("ENGENHARIA")?"ENGENHARIA":label.toUpperCase().includes("COMEX")?"COMEX":"COMERCIAL";
   return {index:i,label,sector,stage:TIMELINE[i]};
  }
 }
 return {index:TIMELINE.length-1,label:"Comercial",sector:"COMERCIAL",stage:TIMELINE.at(-1)};
}
function totalDays(r){const start=r.dataRecebimentoMaterial;if(!start)return 0;const active=activeCycle(r);const end=isCompleted(r)?active?active.dataEntregueComercial||active.dataRecebimentoBrasil||dateString(today()):r.dataEntregueComercial||r.dataRecebimentoBrasil||dateString(today()):dateString(today());return diffDays(start,end)}
function stageDays(r){const c=currentStage(r);const start=c.stage.start(r);return start?diffDays(start,dateString(today())):0}
function deadlineStatus(r){
 if(isCompleted(r))return {label:"Concluído",css:"done",due:"",days:0};
 const c=currentStage(r);const due=c.stage.due(r);
 if(!due)return {label:"No prazo",css:"ontime",due:"",days:0};
 const delta=Math.ceil((dateObj(due)-today())/DAY);
 if(delta<0)return {label:"Atrasado",css:"late",due,days:Math.abs(delta)};
 if(delta<=2)return {label:"Em risco",css:"risk",due,days:delta};
 return {label:"No prazo",css:"ontime",due,days:delta};
}
function createRefacao(record,origem){
 const next=record.refacoes.length+1;
 record.refacoes.push({id:`refacao-${next}`,numero:next,abertoEm:dateString(today()),abertoPor:userLabel(),origem, ...Object.fromEntries(REFACAO_KEYS.map(k=>[k,""]))});
 return next;
}
function ensureRefacoes(record,changes){
 if(!Array.isArray(record.refacoes))record.refacoes=[];
 if(!record.refacoes.length && shouldRefazer(record)){
  const n=createRefacao(record,"7. Comercial");
  changes.push({campo:`Refação ${n}`,antes:"Não existia",depois:"Aberta automaticamente após reprovação"});
 }
}

function updatedLabel(r){if(r.updatedAt?.toDate)return r.updatedAt.toDate().toLocaleDateString("pt-BR");if(r.updatedAt)return new Date(r.updatedAt).toLocaleDateString("pt-BR");return "—"}
function docIdFor(r){const base=(r.pj||`pj-${Date.now()}`).toString().trim().replace(/[^\w-]+/g,"-");return base||`pj-${Date.now()}`}
function userLabel(){return auth.currentUser?.email||auth.currentUser?.displayName||"Usuário Analytics"}
function showToast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove("show"),2800)}
function setSync(mode){state.mode=mode;const el=$("#syncBadge");if(mode==="online"){el.className="sync-badge online";el.innerHTML='<i class="fa-solid fa-circle"></i> Firestore conectado'}else if(mode==="local"){el.className="sync-badge local";el.innerHTML='<i class="fa-solid fa-circle"></i> Modo local — publicar regra do COMEX PJ'}else{el.className="sync-badge neutral";el.innerHTML='<i class="fa-solid fa-circle"></i> Conectando…'}}
function normalizeRecord(data,id){const r={id,...data};FIELD_DEFS.forEach(f=>{if(r[f.key]===undefined)r[f.key]=""});r.diasProcesso=totalDays(r);r.historico=Array.isArray(r.historico)?r.historico:[];r.refacoes=Array.isArray(r.refacoes)?r.refacoes:[];return r}

async function connectData(){setSync("connecting");try{const ref=collection(db,COLLECTION);await getDocs(ref);state.unsubscribe=onSnapshot(ref,snap=>{state.records=snap.docs.map(d=>normalizeRecord(d.data(),d.id));refresh();setSync("online")},err=>{console.warn(err);loadLocal()});setSync("online")}catch(err){console.warn("COMEX PJ Firestore indisponível; usando modo local.",err);loadLocal()}}
function loadLocal(){setSync("local");try{const raw=JSON.parse(localStorage.getItem(LOCAL_KEY)||"[]");state.records=raw.map(r=>normalizeRecord(r,r.id));refresh()}catch{state.records=[];refresh()}}
function persistLocal(){localStorage.setItem(LOCAL_KEY,JSON.stringify(state.records.map(r=>({...r,updatedAt:r.updatedAt||new Date().toISOString()}))))}
function auditDiff(a,b){
 const edits=[];
 for(const f of FIELD_DEFS){if(f.readonly)continue;if(String(a?.[f.key]??"")!==String(b?.[f.key]??""))edits.push({campo:f.label,antes:a?.[f.key]??"",depois:b?.[f.key]??""});}
 const max=Math.max(a?.refacoes?.length||0,b?.refacoes?.length||0);
 for(let i=0;i<max;i++){
  const before=a?.refacoes?.[i]||{},after=b?.refacoes?.[i]||{};
  for(const key of REFACAO_KEYS){const f=FIELD_DEFS.find(x=>x.key===key);if(String(before[key]??"")!==String(after[key]??""))edits.push({campo:`Refação ${i+1} · ${f?.label||key}`,antes:before[key]??"",depois:after[key]??""});}
 }
 return edits;
}
function mergeUserEdits(latest,submitted,baseline){
 const merged={...latest,refacoes:(latest.refacoes||[]).map(c=>({...c}))};
 // Após abrir a primeira refação, os dados originais viram registro histórico imutável pela tela.
 if(!(latest.refacoes||[]).length){
  for(const f of FIELD_DEFS){if(f.readonly)continue;
   if(!baseline || String(submitted[f.key]??"")!==String(baseline[f.key]??""))merged[f.key]=submitted[f.key]??"";
  }
 }
 // Um ciclo anterior nunca é atualizado ao abrir ou editar o ciclo seguinte.
 const savedCycles=latest.refacoes||[];
 const activeIndex=savedCycles.length-1;
 for(let i=0;i<(submitted.refacoes||[]).length;i++){
  if(i<activeIndex)continue;
  const entry=submitted.refacoes[i],before=baseline?.refacoes?.[i]||{};
  if(!merged.refacoes[i])merged.refacoes[i]={...entry};
  else for(const key of REFACAO_KEYS){if(!baseline||String(entry[key]??"")!==String(before[key]??""))merged.refacoes[i][key]=entry[key]??"";}
 }
 return merged;
}
function finishEdit(latest,submitted,baseline){
 const next=mergeUserEdits(latest,submitted,baseline);
 const previousCount=next.refacoes.length;
 const originalCount=(latest.refacoes||[]).length;
 if(upper(next.retornoComercial)==="REPROVADO"&&!next.statusFinal)next.statusFinal="REPROVADO";
 for(const cycle of next.refacoes)if(upper(cycle.retornoComercial)==="REPROVADO"&&!cycle.statusFinal)cycle.statusFinal="REPROVADO";
 const changes=auditDiff(latest,next);
 ensureRefacoes(next,changes);
 if(previousCount && shouldRefazer(next.refacoes[previousCount-1]) &&
   !latest.refacoes?.[previousCount]?.id &&
   latest.refacoes?.length===previousCount){
  const n=createRefacao(next,`Refação ${previousCount} · Comercial`);
  changes.push({campo:`Refação ${n}`,antes:"Não existia",depois:"Aberta automaticamente após reprovação"});
 }
 if(!changes.length)return {next,changes,newCycle:false};
 next.updatedBy=userLabel();
 const event={data:new Date().toISOString(),usuario:userLabel(),acao:latest.pj?"Desenvolvimento atualizado":"Desenvolvimento criado",alteracoes:changes};
 next.historico=[...(latest.historico||[]),event].slice(-300);
 next.diasProcesso=totalDays(next);
 return {next,changes,newCycle:next.refacoes.length>originalCount};
}
async function saveRecord(record){
 const baseline=state.editBaseline;
 const id=record.id||docIdFor(record);
 let result;
 if(state.mode==="online"){
  await runTransaction(db,async tx=>{
   const ref=doc(db,COLLECTION,id),snapshot=await tx.get(ref);
   const latest=snapshot.exists()?normalizeRecord(snapshot.data(),id):{pj:"",refacoes:[],historico:[]};
   result=finishEdit(latest,record,baseline);
   if(result.changes.length){const payload={...result.next,updatedAt:serverTimestamp()};delete payload.id;tx.set(ref,payload);}
  });
 }else{
  const latest=state.records.find(r=>r.id===id)||{pj:"",refacoes:[],historico:[]};
  result=finishEdit(latest,record,baseline);
  if(result.changes.length){result.next.id=id;result.next.updatedAt=new Date().toISOString();const ix=state.records.findIndex(r=>r.id===id);if(ix>=0)state.records[ix]=normalizeRecord(result.next,id);else state.records.push(normalizeRecord(result.next,id));persistLocal();refresh();}
 }
 showToast(result.newCycle?`Refação ${result.next.refacoes.length} aberta na China / Fornecedor.`:
   result.changes.length?"Desenvolvimento salvo e histórico atualizado.":"Nenhuma alteração identificada.");
 return {...result,id};
}

async function removeRecord(id){if(state.mode==="online")await deleteDoc(doc(db,COLLECTION,id));else{state.records=state.records.filter(r=>r.id!==id);persistLocal();refresh()}showToast("Desenvolvimento excluído.")}

function cycleFormHtml(cycle,i,activeIndex){
 const locked=i<activeIndex;
 return `<section class="refacao-block ${locked?"refacao-bloqueada":"refacao-ativa"}" data-refacao="${i}" data-refacao-ativa="${locked?"0":"1"}"><div class="refacao-title"><strong>↻ REFAÇÃO ${i+1} — CHINA / FORNECEDOR</strong><span>${locked?"HISTÓRICO PRESERVADO · SOMENTE CONSULTA":"CICLO ATIVO · COMECE PELO FORNECEDOR"} · Aberta em ${escapeHtml(formatDate(cycle.abertoEm))}</span></div>`+
 REFACAO_SECTIONS.map((section,j)=>`<section class="form-section"><div class="form-section-head"><h3>${j+8}. ${escapeHtml(section.title.replace(/^\d+\. /,""))} · Refação ${i+1}</h3><span>${escapeHtml(section.note)}</span></div><div class="fields">${section.keys.map(key=>fieldHtml(FIELD_DEFS.find(f=>f.key===key),`refacao_${i}__`,locked)).join("")}</div></section>`).join("")+`</section>`;
}
function renderForm(record=null){
 const byKey=Object.fromEntries(FIELD_DEFS.map(f=>[f.key,f]));
 const cycles=record?.refacoes||[];
 const notice=cycles.length?`<div class="refacao-aviso" role="note"><strong>Histórico do PJ preservado.</strong> A primeira passagem e as refações anteriores estão bloqueadas para edição. Preencha somente a <b>Refação ${cycles.length}</b>, a partir do campo <b>Fornecedor</b>.</div>`:"";
 $("#formSections").innerHTML=notice+
 SECTIONS.map(section=>`<section class="form-section ${cycles.length?"secao-historica":""}"><div class="form-section-head"><h3>${escapeHtml(section.title)}</h3><span>${cycles.length?"HISTÓRICO ORIGINAL · SOMENTE CONSULTA":escapeHtml(section.note)}</span></div><div class="fields">${section.keys.map(k=>fieldHtml(byKey[k],"",cycles.length>0)).join("")}</div></section>`).join("")+
 cycles.map((cycle,i)=>cycleFormHtml(cycle,i,cycles.length-1)).join("");
 const b=$("[name=dataRecebimentoMaterial]"),c=$("[name=encaminhamentoEngenharia]"),country=$("[name=paisDestino]");
 b?.addEventListener("change",()=>{const d=$("[name=vencimentoComercial]");if(d&&!d.value)d.value=addDaysString(b.value,1);const m=$("[name=mesSolicitado]");if(m&&!m.value&&b.value)m.value=String(dateObj(b.value).getMonth()+1);updateLiveDays()});
 c?.addEventListener("change",()=>{const d=$("[name=vencimentoEngenharia]");if(d&&!d.value)d.value=addDaysString(c.value,2);updateLiveDays()});
 country?.addEventListener("input",updateCountryPreview);updateCountryPreview();
}
function fieldHtml(f,prefix="",locked=false){
 const name=prefix+f.key,req=f.required&&!prefix&&!locked?"required":"",ro=f.readonly?"readonly":"",disabled=locked?"disabled":"";
 let control;
 if(f.type==="select")control=`<select name="${name}" ${disabled}>${f.options.map(o=>`<option value="${escapeHtml(o)}">${escapeHtml(o||"Selecione")}</option>`).join("")}</select>`;
 else if(f.type==="textarea")control=`<textarea name="${name}" rows="3" ${disabled} placeholder="Descreva os motivos técnicos e as observações…"></textarea>`;
 else control=`<input name="${name}" type="${f.type||"text"}" ${req} ${ro} ${disabled}>`;
 if(f.key==="paisDestino"&&!prefix)control=`<div class="country-field">${control}<div id="countryPreview" class="country-preview">Bandeira automática</div></div>`;
 return `<div class="field ${["nomeMaterial","caracteristicaMaterial","observacoesComercial"].includes(f.key)?"wide":""} ${locked?"field-historico":""}"><label>${escapeHtml(f.label)}</label>${control}</div>`;
}
function updateLiveDays(){const start=$("[name=dataRecebimentoMaterial]")?.value;const el=$("[name=diasProcesso]");if(el)el.value=start?diffDays(start,dateString(today())):0}
function openModal(record=null){
 state.editBaseline=record?structuredClone(record):null;
 renderForm(record);$("#pjForm").reset();$("#recordId").value=record?.id||"";
 $("#modalTitle").textContent=record?`Editar ${record.pj||"PJ"}`:"Novo Desenvolvimento";
 FIELD_DEFS.forEach(f=>{const el=$(`[name=${f.key}]`);if(el){const val=record?.[f.key]??"";if(f.type==="select"&&val&&![...el.options].some(o=>o.value===val))el.add(new Option(val,val));el.value=val}});
 (record?.refacoes||[]).forEach((cycle,i)=>REFACAO_KEYS.forEach(key=>{const el=$(`[name=refacao_${i}__${key}]`);if(el){const val=cycle?.[key]??"";if(el.tagName==="SELECT"&&val&&![...el.options].some(o=>o.value===val))el.add(new Option(val,val));el.value=val;}}));
 if(record)$("[name=diasProcesso]").value=totalDays(record);updateLiveDays();updateCountryPreview();$("#modal").classList.remove("hidden");
}
function closeModal(){$("#modal").classList.add("hidden");state.editBaseline=null}
function formRecord(){
 const existing=state.editBaseline;
 const r=existing?structuredClone(existing):{historico:[],refacoes:[]};
 FIELD_DEFS.forEach(f=>{const el=$(`[name=${f.key}]`);if(el&&!f.readonly&&!el.disabled)r[f.key]=el.value.trim()});
 (r.refacoes||[]).forEach((cycle,i)=>REFACAO_KEYS.forEach(key=>{const el=$(`[name=refacao_${i}__${key}]`);if(el&&!el.disabled)cycle[key]=el.value.trim()}));
 r.id=$("#recordId").value||"";r.diasProcesso=totalDays(r);return r;
}

function filterRecords(){const q=normalize($("#searchInput").value);const stage=$("#stageFilter").value;const deadline=$("#deadlineFilter").value;const country=$("#countryFilter").value;state.filtered=state.records.filter(r=>{const hay=normalize([r.pj,r.nomeMaterial,r.siglaCliente,r.fornecedor,r.cor,r.paisDestino].join(" "));if(q&&!hay.includes(q))return false;if(stage&&currentStage(r).label!==stage)return false;if(deadline&&deadlineStatus(r).label!==deadline)return false;if(country&&r.paisDestino!==country)return false;return true})}
function refreshFilters(){const stages=[...new Set(state.records.map(r=>currentStage(r).label))].sort();const countries=[...new Set(state.records.map(r=>r.paisDestino).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"));const s=$("#stageFilter"),c=$("#countryFilter");const sv=s.value,cv=c.value;s.innerHTML='<option value="">Todas as etapas</option>'+stages.map(x=>`<option>${escapeHtml(x)}</option>`).join("");c.innerHTML='<option value="">Todos os países</option>'+countries.map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join("");s.value=sv;c.value=cv}
function refresh(){refreshFilters();filterRecords();renderKpis();renderCharts();renderTable();if(state.selected){const found=state.records.find(r=>r.id===state.selected.id);if(found){state.selected=found;renderDetail(found)}else closeDetail()}}
function renderKpis(){const rs=state.records;const stats=rs.map(deadlineStatus);const count=l=>stats.filter(s=>s.label===l).length;$("#kpiTotal").textContent=rs.length;$("#kpiLate").textContent=count("Atrasado");$("#kpiRisk").textContent=count("Em risco");$("#kpiOnTime").textContent=count("No prazo");$("#kpiDone").textContent=count("Concluído");$("#kpiLatePct").textContent=`${rs.length?Math.round(count("Atrasado")/rs.length*100):0}% do total`;$("#kpiOnTimePct").textContent=`${rs.length?Math.round(count("No prazo")/rs.length*100):0}% do total`;const avg=rs.length?Math.round(rs.reduce((a,r)=>a+totalDays(r),0)/rs.length):0;$("#kpiAvg").textContent=`${avg} dias`}
function renderCharts(){
  const rs=state.records;
  const deadlineGroups=[["Atrasado","#e43d3d"],["Em risco","#eaa21a"],["No prazo","#14a865"],["Concluído","#0b76f0"]];
  renderDonut("#deadlineDonut","#deadlineDonutTotal","#deadlineLegend",deadlineGroups,name=>rs.filter(r=>deadlineStatus(r).label===name).length,rs.length);
  const stageItems=countBy(rs,r=>currentStage(r).label);
  renderStageDonut(stageItems,rs.length);
  renderBars("#countryBars",countBy(rs,r=>r.paisDestino||"Sem país"),6,"country");
  renderBars("#materialBars",countBy(rs,r=>r.nomeMaterial||"Sem material"),6,"material");
}
function renderDonut(donutSel,totalSel,legendSel,groups,countFn,total){let acc=0;const stops=[];groups.forEach(([name,color])=>{const n=countFn(name);const pct=total?n/total*100:0;stops.push(`${color} ${acc}% ${acc+pct}%`);acc+=pct});if(acc<100)stops.push(`#d8e2ee ${acc}% 100%`);$(donutSel).style.background=`conic-gradient(${stops.join(",")})`;$(totalSel).textContent=total;$(legendSel).innerHTML=groups.map(([name,color])=>`<div class="legend-row"><span class="legend-dot" style="background:${color}"></span><span>${escapeHtml(name)}</span><strong>${countFn(name)}</strong></div>`).join("")}
function renderStageDonut(items,total){const palette=["#0b76f0","#14a865","#eaa21a","#7257d9","#1d9db6","#e43d3d","#5a7da8","#42a5f5","#8bc34a"];let acc=0;const stops=[];items.forEach(([,n],i)=>{const pct=total?n/total*100:0;stops.push(`${palette[i%palette.length]} ${acc}% ${acc+pct}%`);acc+=pct});if(acc<100)stops.push(`#d8e2ee ${acc}% 100%`);$("#stageDonut").style.background=`conic-gradient(${stops.join(",")})`;$("#stageDonutTotal").textContent=total;$("#stageLegend").innerHTML=items.slice(0,7).map(([name,n],i)=>`<div class="legend-row"><span class="legend-dot" style="background:${palette[i%palette.length]}"></span><span>${escapeHtml(name)}</span><strong>${n}</strong></div>`).join("")}
function countBy(rows,fn){const m=new Map();rows.forEach(r=>{const k=fn(r);m.set(k,(m.get(k)||0)+1)});return [...m.entries()].sort((a,b)=>b[1]-a[1])}
function renderBars(sel,items,limit,type="default"){const el=$(sel);const top=items.slice(0,limit);const max=Math.max(1,...top.map(x=>x[1]));el.innerHTML=top.length?top.map(([name,n])=>{const labelHtml=type==="country"?countryVisualHtml(name):escapeHtml(name);return `<div class="bar-row"><span class="bar-label" title="${escapeHtml(name)}">${labelHtml}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(5,n/max*100)}%"></div></div><strong>${n}</strong></div>`}).join(""):'<div class="empty-state show" style="padding:30px 10px"><p>Sem dados</p></div>'}
function renderTable(){filterRecords();const body=$("#rows");$("#resultCount").textContent=`${state.filtered.length} registro(s)`;$("#emptyState").classList.toggle("show",state.filtered.length===0);body.innerHTML=state.filtered.map(r=>{const d=deadlineStatus(r),c=currentStage(r);return `<tr data-id="${escapeHtml(r.id)}"><td><span class="alert-icon ${d.css}"><i class="fa-solid ${d.css==='late'?'fa-exclamation':d.css==='risk'?'fa-clock':d.css==='done'?'fa-flag-checkered':'fa-check'}"></i></span></td><td><strong>${escapeHtml(r.pj||"—")}</strong></td><td>${escapeHtml(currentSupplier(r))}</td><td>${countryVisualHtml(r.paisDestino)}</td><td>${escapeHtml(r.nomeMaterial||"—")}</td><td>${escapeHtml(r.siglaCliente||"—")}</td><td><span class="status-pill ${d.css}">${d.label}</span></td><td><strong>${escapeHtml(c.sector)}</strong><br><span class="stage-label">${escapeHtml(c.label)}</span></td><td>${stageDays(r)}</td><td>${totalDays(r)}</td><td>${d.due?formatDate(d.due):"—"}</td><td>${updatedLabel(r)}</td><td><button class="action-btn edit-row" data-id="${escapeHtml(r.id)}" title="Editar"><i class="fa-solid fa-pen"></i></button><button class="action-btn view-row" data-id="${escapeHtml(r.id)}" title="Detalhar"><i class="fa-regular fa-eye"></i></button></td></tr>`}).join("");body.querySelectorAll("tr").forEach(tr=>tr.addEventListener("click",e=>{if(e.target.closest("button"))return;openDetail(tr.dataset.id)}));body.querySelectorAll(".edit-row").forEach(b=>b.addEventListener("click",()=>openModal(state.records.find(r=>r.id===b.dataset.id))));body.querySelectorAll(".view-row").forEach(b=>b.addEventListener("click",()=>openDetail(b.dataset.id)))}

function openDetail(id){const r=state.records.find(x=>x.id===id);if(!r)return;state.selected=r;renderDetail(r);$("#detailPanel").classList.remove("hidden");$("#detailPanel").scrollIntoView({behavior:"smooth",block:"start"})}
function closeDetail(){state.selected=null;$("#detailPanel").classList.add("hidden")}
function processGroupHtml(s,values){
 return `<div class="process-group"><div class="process-group-head"><span>${escapeHtml(s.title)}</span><span>${escapeHtml(s.note)}</span></div><div class="process-group-body">${s.keys.map(k=>{const f=FIELD_DEFS.find(x=>x.key===k);return `<div class="process-field"><span>${escapeHtml(f.label)}</span><strong>${f.key==="paisDestino"?countryVisualHtml(values[k]):escapeHtml(displayFieldValue(f,values[k]))}</strong></div>`}).join("")}</div></div>`;
}
function renderDetail(r){
 const d=deadlineStatus(r),c=currentStage(r);
 $("#detailPj").textContent=r.pj||"Sem PJ";$("#detailMaterial").textContent=r.nomeMaterial||"—";
 $("#detailAlert").className=`alert-dot ${d.css}`;$("#detailStatus").className=`status-pill ${d.css}`;
 $("#detailStatus").textContent=d.label;$("#detailDays").textContent=`${totalDays(r)} dias em processo`;
 $("#detailDeadline").textContent=d.due?`Prazo ${formatDate(d.due)}`:`Etapa ${c.label}`;
 $("#generalInfo").innerHTML=infoDl([['País destino',{html:countryVisualHtml(r.paisDestino)}],['Mês solicitado',r.mesSolicitado],['Cliente',r.siglaCliente],['Cor',r.cor],['Característica',r.caracteristicaMaterial],[r.refacoes?.length?'Fornecedor original':'Fornecedor',r.fornecedor],...(r.refacoes?.length?[[`Fornecedor da refação ${r.refacoes.length}`,currentSupplier(r)]]:[]),['Setor atual',c.sector],['Atualizado por',r.updatedBy],['Ciclos de refação',r.refacoes?.length||0]]);
 renderTimeline(r,d,c);
 $("#processInfo").innerHTML=SECTIONS.filter(s=>s.id!=="geral").map(s=>processGroupHtml(s,r)).join("")+
 (r.refacoes||[]).map((cycle,i)=>`<div class="process-refacao-title">↻ Refação ${i+1} — aberta em ${escapeHtml(formatDate(cycle.abertoEm))}</div>`+REFACAO_SECTIONS.map((s,j)=>processGroupHtml({...s,title:`${j+8}. ${s.title.replace(/^\d+\. /,"")} · Refação ${i+1}`},cycle)).join("")).join("");
 const hist=[...(r.historico||[])].reverse();
 $("#historyList").innerHTML=hist.length?hist.map(h=>{
  const changes=(h.alteracoes||[]).map(change=>`<div class="audit-diff"><div class="audit-field">${escapeHtml(change.campo||"Campo")}</div><span class="audit-before">${escapeHtml(valueText(change.antes))}</span><span class="audit-arrow">→</span><strong class="audit-after">${escapeHtml(valueText(change.depois))}</strong></div>`).join("");
  return `<div class="history-item"><strong>${escapeHtml(h.acao||"Atualização")}</strong><span>${h.data?new Date(h.data).toLocaleString("pt-BR"):"—"} · ${escapeHtml(h.usuario||"Usuário")}</span>${changes}</div>`;
 }).join(""):'<p class="history-empty">Sem histórico registrado.</p>';
}

function infoDl(items){return items.map(([k,v])=>`<dt>${escapeHtml(k)}</dt><dd>${v&&typeof v==="object"&&v.html?v.html:escapeHtml(valueText(v))}</dd>`).join("")}
function renderTimeline(r,d,current){
 const cycle=activeCycle(r);
 const stages=cycle?buildCycleTimeline(cycle):TIMELINE.map(s=>({...s,complete:s.complete(r),start:s.start(r),due:s.due(r),date:timelineCompletionDate(r,s.id)}));
 $("#timeline").innerHTML=(cycle?`<div class="timeline-cycle-heading">↻ Refação ${r.refacoes.length} — etapas reabertas</div>`:"")+
 stages.map((s,i)=>{
  const complete=s.complete;
  const activeIndex=cycle&&isCompleted(r)?stages.length-1:current.index;
  const cls=complete?"complete":i===activeIndex?(d.css==="late"?"late":"current"):"";
  const dt=complete?s.date:i===activeIndex?s.start:"";
  return `<div class="timeline-step ${cls}"><div class="timeline-dot"></div><strong>${escapeHtml(s.label)}</strong><span>${dt?formatDate(dt):complete?"Concluído":i===current.index?"Em andamento":"Pendente"}</span></div>`;
 }).join("");
 const n=$("#deadlineNotice");n.className=`deadline-notice ${d.css==="late"?"late":d.css==="risk"?"risk":""}`;
 if(d.label==="Atrasado")n.textContent=`Este desenvolvimento está ${d.days} dia(s) atrasado na etapa “${current.label}”. Prazo: ${formatDate(d.due)}.`;
 else if(d.label==="Em risco")n.textContent=`A etapa “${current.label}” vence em ${d.days} dia(s), em ${formatDate(d.due)}.`;
 else if(d.label==="Concluído")n.textContent="Desenvolvimento concluído conforme decisão final do Comercial.";
 else n.textContent=d.due?`Etapa “${current.label}” dentro do prazo. Prazo atual: ${formatDate(d.due)}.`:`Etapa “${current.label}” em andamento, sem prazo explícito na planilha.`;
}

function timelineCompletionDate(r,id){return ({commercial:r.encaminhamentoEngenharia,engineering:r.encaminhamentoComex,"comex-out":r.dataEnvioDestino,"china-arrival":r.dataRecebimentoDestino,"china-development":r.dataFim||r.dataEnvioBrasil,return:r.dataRecebimentoBrasil,"comex-return":r.dataEncaminhamentoEngenhariaFinal,"engineering-final":r.dataEntregueComercial,"commercial-final":r.dataEntregueComercial})[id]||""}

function excelDate(value){if(value===""||value==null)return "";if(value instanceof Date&&!isNaN(value))return dateString(value);if(typeof value==="number"&&window.XLSX?.SSF){const p=XLSX.SSF.parse_date_code(value);if(p)return `${p.y}-${String(p.m).padStart(2,"0")}-${String(p.d).padStart(2,"0")}`}const s=String(value).trim();const m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);if(m){let y=Number(m[3]);if(y<100)y+=2000;return `${y}-${String(m[2]).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`}return s.match(/^\d{4}-\d{2}-\d{2}/)?.[0]||""}
function excelHeaderIndices(headers){
 const seen={};
 return FIELD_DEFS.reduce((result,f)=>{
  if(f.readonly)return result;
  const name=normalize(f.excel);if(!name)return result;
  const occurrence=seen[name]||0;seen[name]=occurrence+1;
  const matches=headers.map((cell,i)=>normalize(cell)===name?i:-1).filter(x=>x>=0);
  if(matches[occurrence]!==undefined)result[f.key]=matches[occurrence];
  return result;
 },{});
}
async function importExcel(file){
 if(state.mode==="connecting")throw new Error("Aguarde a conexão com o banco antes de importar.");
 if(!window.XLSX)throw new Error("Biblioteca Excel não carregada.");
 const wb=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true}),ws=wb.Sheets[wb.SheetNames[0]];
 const matrix=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:""});
 const headerIndex=matrix.findIndex(row=>row.some(v=>normalize(v)==="pj #"));
 if(headerIndex<0)throw new Error('Não encontrei a linha de cabeçalho com "PJ #".');
 const headerMap=excelHeaderIndices(matrix[headerIndex]);
 const imported=matrix.slice(headerIndex+1).map(row=>{
  const r={};for(const f of FIELD_DEFS){const idx=headerMap[f.key];if(idx===undefined)continue;const v=row[idx]??"";r[f.key]=f.type==="date"?excelDate(v):String(v).trim();}return r;
 }).filter(r=>r.pj||r.nomeMaterial);
 if(!imported.length)throw new Error("Nenhum desenvolvimento válido foi encontrado.");
 const cycleByPj=new Map(),historyByPj=new Map();
 const cyclesSheet=wb.Sheets["Refacoes"];
 if(cyclesSheet){const entries=XLSX.utils.sheet_to_json(cyclesSheet,{defval:"",raw:false});for(const row of entries){const pj=String(row.PJ||"").trim(),n=Number(row.Ciclo||0);if(!pj||!n)continue;const arr=cycleByPj.get(pj)||[];arr[n-1]={id:`refacao-${n}`,numero:n,abertoEm:excelDate(row["Aberto em"]),abertoPor:row["Aberto por"]||"",...Object.fromEntries(REFACAO_KEYS.map(k=>[k,row[k]||""]))};cycleByPj.set(pj,arr);}}
 const historySheet=wb.Sheets["Historico"];
 if(historySheet){const entries=XLSX.utils.sheet_to_json(historySheet,{defval:"",raw:false});for(const row of entries){const pj=String(row.PJ||"").trim();if(!pj)continue;let diffs=[];try{diffs=JSON.parse(row.Alteracoes||"[]")}catch{}const arr=historyByPj.get(pj)||[];arr.push({data:row.Data||"",usuario:row.Usuario||"",acao:row.Acao||"Importado",alteracoes:diffs});historyByPj.set(pj,arr);}}
 const eventDate=new Date().toISOString(),changed=[];
 let protectedCount=0;
 for(const incoming of imported){
  const id=docIdFor(incoming),existing=state.records.find(r=>r.id===id)||{};
  // Importação comum não pode sobrescrever um PJ já reprovado/refeito.
  // Restauração de backup requer procedimento separado e conferência de ciclos.
  if(existing.id && ((existing.refacoes||[]).length || upper(existing.retornoComercial)==="REPROVADO" || upper(existing.statusFinal)==="REPROVADO")){
   protectedCount++;continue;
  }
  const merged={...existing,...incoming,id};
  if(cycleByPj.has(incoming.pj))merged.refacoes=cycleByPj.get(incoming.pj).filter(Boolean);
  else merged.refacoes=existing.refacoes||[];
  merged.historico=historyByPj.get(incoming.pj)||existing.historico||[];
  const edits=auditDiff(existing,merged);
  if(!edits.length&&existing.id)continue;
  merged.historico=[...merged.historico,{data:eventDate,usuario:userLabel(),acao:`Importado de ${file.name}`,alteracoes:edits}].slice(-300);
  merged.updatedBy=userLabel();merged.diasProcesso=totalDays(merged);
  changed.push(merged);
 }
 if(state.mode==="online"){
  for(let i=0;i<changed.length;i+=400){const batch=writeBatch(db);changed.slice(i,i+400).forEach(r=>{const id=r.id;const data={...r,updatedAt:serverTimestamp()};delete data.id;batch.set(doc(db,COLLECTION,id),data,{merge:true})});await batch.commit();}
 }else{for(const r of changed){r.updatedAt=eventDate;const i=state.records.findIndex(x=>x.id===r.id);if(i>=0)state.records[i]=normalizeRecord(r,r.id);else state.records.push(normalizeRecord(r,r.id));}persistLocal();refresh();}
 showToast(`${imported.length} PJ(s) lidos; ${changed.length} atualizado(s); ${protectedCount} com histórico protegido.`);
}
function exportExcel(){
 if(!window.XLSX){showToast("Biblioteca Excel indisponível.");return;}
 const empty=()=>Array(EXCEL_LAYOUT.length).fill("");
 const row2=empty(),row3=empty(),row5=empty();
 row2[1]="PRAZO D+1";row2[4]="PRAZO 2 DIAS";row2[16]="PRAZO ATÉ 7 DIAS";
 row3[1]="COMERCIAL";row3[4]="ENGENHARIA";row3[16]="COMEX";row3[18]="CHINA";row3[27]="COMEX";row3[30]="ENGENHARIA";row3[31]="COMERCIAL";
 row5[17]="ESTIMADO EM 10 DIAS";row5[19]="ESTIMADO EM 15 DIAS";row5[28]="ESTIMADO EM 10 DIAS";
 const headers=EXCEL_LAYOUT.map(key=>key?FIELD_DEFS.find(f=>f.key===key)?.excel||"":"");
 const rows=[empty(),row2,row3,headers,row5,empty(),empty(),...state.records.map(r=>EXCEL_LAYOUT.map(key=>key?key==="diasProcesso"?totalDays(r):r[key]??"":""))];
 const wb=XLSX.utils.book_new(),ws=XLSX.utils.aoa_to_sheet(rows);
 ws["!merges"]=["B2:D2","E2:M2","Q2:R2","B3:D3","E3:P3","Q3:R3","S3:AA3","AB3:AD3","AE3:AE3","AF3:AI3","R5:S5","T5:Z5","AC5:AE5"].map(XLSX.utils.decode_range);
 ws["!cols"]=EXCEL_LAYOUT.map(k=>({wch:k==="observacoesComercial"?32:k==="nomeMaterial"?25:19}));
 XLSX.utils.book_append_sheet(wb,ws,"Planilha1");
 const refRows=[["PJ","Ciclo","Aberto em","Aberto por",...REFACAO_KEYS]];
 const histRows=[["PJ","Data","Usuario","Acao","Alteracoes"]];
 for(const r of state.records){
  (r.refacoes||[]).forEach((c,i)=>refRows.push([r.pj,i+1,c.abertoEm||"",c.abertoPor||"",...REFACAO_KEYS.map(k=>c[k]||"")]));
  (r.historico||[]).forEach(h=>histRows.push([r.pj,h.data||"",h.usuario||"",h.acao||"",JSON.stringify(h.alteracoes||[])]));
 }
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(refRows),"Refacoes");
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(histRows),"Historico");
 XLSX.writeFile(wb,`COMEX_PJ_${dateString(today()).replaceAll('-','')}.xlsx`);
}


$("#newButton").addEventListener("click",()=>openModal());$("#closeModal").addEventListener("click",closeModal);$("#cancelButton").addEventListener("click",closeModal);$("#modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal()});$("#pjForm").addEventListener("submit",async e=>{
 e.preventDefault();try{
  const result=await saveRecord(formRecord());
  if(result.newCycle){
   // Abre imediatamente a nova passagem, sem reaproveitar dados do ciclo anterior.
   openModal({...result.next,id:result.id});
   const section=$("[data-refacao-ativa='1']");
   const supplier=$("[name=refacao_"+(result.next.refacoes.length-1)+"__fornecedor]");
   section?.scrollIntoView({block:"start",behavior:"smooth"});
   supplier?.focus({preventScroll:true});
  } else closeModal();
 }catch(err){console.error(err);showToast(`Erro ao salvar: ${err.message||err}`)}
});$("#closeDetail").addEventListener("click",closeDetail);$("#editButton").addEventListener("click",()=>state.selected&&openModal(state.selected));$("#deleteButton").addEventListener("click",async()=>{if(!state.selected)return;if(!confirm(`Excluir o desenvolvimento ${state.selected.pj||"selecionado"}?`))return;try{await removeRecord(state.selected.id);closeDetail()}catch(err){showToast(`Erro ao excluir: ${err.message||err}`)}});$("#importButton").addEventListener("click",()=>$("#fileInput").click());$("#fileInput").addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;try{await importExcel(f)}catch(err){console.error(err);showToast(err.message||"Falha ao importar Excel.")}finally{e.target.value=""}});$("#exportButton").addEventListener("click",exportExcel);["#searchInput","#stageFilter","#deadlineFilter","#countryFilter"].forEach(sel=>$(sel).addEventListener(sel==="#searchInput"?"input":"change",()=>{filterRecords();renderTable()}));

renderForm();await connectData();
