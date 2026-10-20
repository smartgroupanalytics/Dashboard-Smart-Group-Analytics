// SMART GROUP ANALYTICS — PREVISAO DE COMPRAS (FIRESTORE)
// Reutiliza a autenticacao existente; NAO contem fornecedores ou valores em codigo-fonte.
// Consulta: usuarios ativos com modulos.compras. Importacao: Andrei e David
// (UIDs definidos em compras_config/permissoes) ou administrador principal.
// Os dados confidenciais sao lidos diretamente do Firestore; sem dados fixos no codigo.

import { protegerModulo } from "../../module-guard.js?v=3";
import { db, auth } from "../../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  collection, doc, getDoc, getDocs, setDoc, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

// Mesmo UID da funcao administradorPrincipal() nas regras atuais do Analytics.
const ADMIN_PRINCIPAL_UID = "IYjFcuc0PXYvkq7vt97NtkUknQD3";
const REFERENCE_DOC = doc(db, "compras_previsoes", "atual");
const EDITOR_CONFIG = doc(db, "compras_config", "permissoes");
const MAX_FILE_MB = 15;
const MAX_RECORDS_PER_CHUNK = 180;
const MAX_PARTS = 1000;
const MAX_CHUNK_BYTES = 220_000;

let acesso;
try {
  acesso = await protegerModulo("compras");
} catch (error) {
  console.warn("Modulo de compras sem autorizacao:", error);
  // O module-guard original redireciona ou bloqueia o acesso.
  throw error;
}

let payments = [];
const usuarioAtual = auth.currentUser;
let permissaoEditor = false;
let importando = false;
let carregamentoAtual = 0;
let ultimaVersao = null;

// Revogacao de login: remove os dados ja exibidos, nao apenas o botao de upload.
onAuthStateChanged(auth, usuario => {
  if (!usuario || usuario.uid !== usuarioAtual?.uid) {
    ++carregamentoAtual;
    permissaoEditor = false;
    ultimaVersao = null;
    atualizarTela([]);
    document.documentElement.style.visibility = 'hidden';
    window.location.replace('../../login.html');
  }
});

function uidsEditores(config) {
  const lista = config?.editorUids;
  return Array.isArray(lista) && lista.length === 2
    ? lista.filter(v => typeof v === 'string' && v.length > 5)
    : [];
}

function status(mensagem, erro=false) {
  const el = document.getElementById('uploadStatus');
  el.textContent = mensagem;
  el.className = 'upload-status' + (erro ? ' error' : '');
}

// Área SEPARADA da sincronização da planilha: erros de permissão não podem
// ser apagados quando outra consulta do Firestore termina com sucesso.
function detalharPermissao(mensagem, alerta = false) {
  const el = document.getElementById('permissionDetail');
  el.textContent = mensagem;
  el.style.color = alerta ? '#ffd18a' : '#9bb2d2';
}

function diagnosticoUid(cadastrados, uid) {
  const valores = cadastrados.filter(v => typeof v === 'string');
  if (valores.some(v => v.trim() === uid)) {
    return 'O UID corresponde a um cadastro, mas há espaços extras no editorUids. Corrija o campo no Firestore (não apenas no JavaScript).';
  }
  if (valores.some(v => v.trim().toLowerCase() === uid.toLowerCase())) {
    return 'Há diferença entre letras maiúsculas/minúsculas no UID do Firestore e o UID autenticado. Copie o UID de Authentication > Usuários exatamente como aparece.';
  }
  const resumoUid = uid ? uid.slice(0, 6) + '…' + uid.slice(-6) : '(não identificado)';
  return 'Esta conta não corresponde aos UIDs cadastrados para importar. UID da sessão: ' + resumoUid + '. Confira em Authentication > Usuários.';
}

function atualizarControles() {
  const controles = document.getElementById('uploadControls');
  const arquivo = document.getElementById('xlsxUpload');
  controles.hidden = !permissaoEditor;
  arquivo.disabled = !permissaoEditor || importando;
  document.getElementById('viewAccess').textContent = permissaoEditor
    ? 'Acesso de importação autorizado — base compartilhada no Firebase'
    : 'Acesso somente para consulta — planilha atualizada pelo setor de Compras';
}

function validarPagamentos(dados) {
  if (!Array.isArray(dados) || !dados.length) {
    throw new Error('A planilha não contém pagamentos válidos.');
  }
  return dados.map(p => {
    const data = String(p.data || '');
    const valor = Number(p.valor);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) ||
        Number.isNaN(Date.parse(data + 'T00:00:00')) ||
        !Number.isFinite(valor)) {
      throw new Error('Dados de pagamento inválidos na planilha.');
    }
    return {
      oc: String(p.oc ?? '').slice(0, 150),
      fornecedor: String(p.fornecedor ?? '').slice(0, 250),
      data,
      dataOrigem: String(p.dataOrigem || '').slice(0, 10),
      valor,
      descricao: String(p.descricao || '').slice(0, 180),
      situacao: String(p.situacao || 'Previsto').slice(0, 30)
    };
  });
}

// Divide bases grandes em documentos seguros (< 1 MiB/documento Firestore).
function separarPartes(registros) {
  const partes = [];
  let atual = [];
  const encoder = new TextEncoder();
  for (const registro of registros) {
    const teste = [...atual, registro];
    const tamanho = encoder.encode(JSON.stringify(teste)).length;
    if (tamanho > MAX_CHUNK_BYTES || teste.length > MAX_RECORDS_PER_CHUNK) {
      if (!atual.length) throw new Error('Foi encontrado um registro maior do que o permitido.');
      partes.push(atual);
      atual = [registro];
      if (encoder.encode(JSON.stringify(atual)).length > MAX_CHUNK_BYTES) {
        throw new Error('Um dos registros da planilha é grande demais.');
      }
    } else {
      atual = teste;
    }
  }
  if (atual.length) partes.push(atual);
  if (partes.length > MAX_PARTS) {
    throw new Error('Planilha muito grande para esta importação (limite de 1.000 partes).');
  }
  return partes;
}

function dataAtualizacao(timestamp) {
  try {
    return timestamp?.toDate().toLocaleString('pt-BR') || 'Aguardando servidor';
  } catch (_) { return 'Aguardando servidor'; }
}

function atualizarTela(registros) {
  payments = registros;
  refreshMonths();
  document.getElementById('search').value = '';
  draw();
}

async function lerBaseCompartilhada(info, token) {
  const versao = info.versaoAtiva;
  if (!versao) throw new Error('A base não possui uma versão publicada.');
  const partesRef = collection(db, 'compras_previsoes', 'atual', 'versoes', versao, 'partes');
  const partes = await getDocs(partesRef);
  if (token !== carregamentoAtual) return;
  if (partes.size !== Number(info.partes)) {
    throw new Error('A base publicada está incompleta. Avise o responsável de TI.');
  }
  const sorted = partes.docs.sort((a,b) => Number(a.data().indice)-Number(b.data().indice));
  const indices = sorted.map(d=>Number(d.data().indice));
  if (indices.some((v,i)=>v!==i)) throw new Error('A ordem das partes da base é inválida.');
  const unidos = sorted.flatMap(d => d.data().pagamentos || []);
  if (unidos.length !== Number(info.registros)) {
    throw new Error('A contagem de pagamentos não corresponde à base publicada.');
  }
  const verificados = validarPagamentos(unidos);
  if (token !== carregamentoAtual) return;
  atualizarTela(verificados);
  ultimaVersao = versao;
  document.getElementById('uploadName').textContent =
    `Base compartilhada: ${info.arquivo || 'planilha'} · ${info.registros} pagamentos`;
  document.getElementById('syncMeta').textContent =
    `Última atualização: ${dataAtualizacao(info.atualizadoEm)} · Importado por: ${info.atualizadoPorNome || 'Usuário autorizado'}`;
  if (!importando) status('Dados sincronizados do Firebase.');
}

// Acompanha alteracoes do perfil e esconde os dados se o acesso for revogado.
if (usuarioAtual) {
  onSnapshot(doc(db, 'usuarios', usuarioAtual.uid), perfilSnap => {
    const perfil = perfilSnap.data() || {};
    const admin = String(perfil.perfil || '').trim().toLowerCase() === 'administrador';
    const autorizado = perfilSnap.exists() && perfil.ativo === true &&
      (admin || perfil.modulos?.compras === true);
    if (!autorizado) {
      ++carregamentoAtual;
      ultimaVersao = null;
      permissaoEditor = false;
      atualizarTela([]);
      document.documentElement.style.visibility = 'hidden';
      window.location.replace('../../index.html');
    }
  }, error => {
    ++carregamentoAtual;
    ultimaVersao = null;
    permissaoEditor = false;
    atualizarTela([]);
    document.documentElement.style.visibility = 'hidden';
    console.warn('Não foi possível manter a autorização de Compras:', error);
    window.location.replace('../../index.html');
  });
}

// Controle também na interface; a verdadeira autorização está nas regras do Firestore.
onSnapshot(EDITOR_CONFIG, { includeMetadataChanges: true }, snap => {
  const uid = usuarioAtual?.uid || '';
  const ehAdminPrincipal = uid === ADMIN_PRINCIPAL_UID;
  const editores = snap.exists() ? uidsEditores(snap.data()) : [];

  // Nunca liberar uma importação de não administradores usando só dados em cache.
  // Um evento posterior confirma a configuração diretamente com o Firestore.
  const confirmadoNoServidor = !snap.metadata.fromCache;
  permissaoEditor = Boolean(ehAdminPrincipal || (confirmadoNoServidor && editores.includes(uid)));
  atualizarControles();

  if (ehAdminPrincipal) {
    detalharPermissao('Permissão de importação: administrador principal.', false);
    return;
  }
  if (!confirmadoNoServidor) {
    detalharPermissao('Aguardando validação da lista de importadores pelo servidor Firebase. Se persistir, confira a conexão.', true);
    return;
  }
  if (!snap.exists()) {
    detalharPermissao('O documento compras_config/permissoes não existe. Um administrador deve criá-lo no Firestore.', true);
    return;
  }
  if (!Array.isArray(snap.data()?.editorUids) || snap.data().editorUids.length !== 2) {
    detalharPermissao('O campo editorUids precisa ser um array com exatamente dois UIDs (Andrei e David).', true);
    return;
  }
  if (permissaoEditor) {
    detalharPermissao('Permissão de importação validada com o servidor Firebase.', false);
    return;
  }
  detalharPermissao(diagnosticoUid(snap.data().editorUids, uid), true);
}, err => {
  permissaoEditor = Boolean(usuarioAtual && usuarioAtual.uid === ADMIN_PRINCIPAL_UID);
  atualizarControles();
  detalharPermissao('Falha ao ler compras_config/permissoes: ' + (err.code || err.message) +
    '. Confira as regras de leitura do Firestore e a autenticação.', true);
  console.warn('Falha ao carregar permissão de importadores do módulo Compras:', err);
});

// Recebe eventos de atualização em tempo real, inclusive de outros computadores.
onSnapshot(REFERENCE_DOC, { includeMetadataChanges: true }, async snap => {
  const token = ++carregamentoAtual;
  if (!snap.exists()) {
    if (snap.metadata.fromCache) {
      if (!importando) status('Aguardando conexão para consultar a base de compras...');
      return;
    }
    ultimaVersao = null;
    atualizarTela([]);
    document.getElementById('uploadName').textContent = 'Nenhuma planilha foi publicada no Firebase.';
    document.getElementById('syncMeta').textContent = 'Aguardando a primeira importação do setor de Compras.';
    if (!importando) status('Base ainda não cadastrada. Os responsáveis por Compras poderão realizar a primeira importação.');
    return;
  }
  const info = snap.data();
  // Metadados podem atualizar (cache/servidor) sem alterar o conteúdo da base.
  if (ultimaVersao === info.versaoAtiva) {
    document.getElementById('syncMeta').textContent =
      `Última atualização: ${dataAtualizacao(info.atualizadoEm)} · Importado por: ${info.atualizadoPorNome || 'Usuário autorizado'}`;
    if (!importando) status(snap.metadata.fromCache
      ? 'Dados em cache; aguardando confirmação do servidor.'
      : 'Dados sincronizados do Firebase.');
    return;
  }
  if (!importando) status('Carregando dados compartilhados do Firebase...');
  try {
    await lerBaseCompartilhada(info, token);
  } catch (error) {
    if (token !== carregamentoAtual) return;
    console.error('Erro ao ler base compartilhada de compras:', error);
    status('Erro ao ler a base compartilhada: ' + error.message, true);
  }
}, error => {
  // Falha de autorizacao/conexao: nao manter os valores anteriormente mostrados na tela.
  ++carregamentoAtual;
  ultimaVersao = null;
  atualizarTela([]);
  document.getElementById('uploadName').textContent = 'Base de compras indisponível';
  document.getElementById('syncMeta').textContent = 'Verifique sua autorização ou a conexão.';
  status('Sem acesso aos dados de compras no Firestore. Verifique as regras: ' + error.message, true);
});


const today=new Date(); today.setHours(0,0,0,0); const fmt=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});const parse=s=>new Date(s+'T00:00:00');const dateFmt=s=>parse(s).toLocaleDateString('pt-BR');const sel=document.getElementById('period');function refreshMonths(){const previous=sel.value;sel.innerHTML='<option value="all">Todo o período</option>';[...new Set(payments.map(p=>p.data.slice(0,7)))].sort().forEach(m=>{let o=document.createElement('option');o.value=m;o.textContent=parse(m+'-01').toLocaleDateString('pt-BR',{month:'long',year:'numeric'});sel.appendChild(o)});sel.value=[...sel.options].some(o=>o.value===previous)?previous:'all'}
function selected(){return payments.filter(p=>sel.value==='all'||p.data.startsWith(sel.value))}function draw(){const data=selected();const total=data.reduce((a,p)=>a+p.valor,0);const n30=payments.filter(p=>{let d=parse(p.data);return d>=today&&d<=new Date(today.getTime()+30*86400000)}).reduce((a,p)=>a+p.valor,0);const late=payments.filter(p=>parse(p.data)<today).reduce((a,p)=>a+p.valor,0);document.getElementById('total').textContent=fmt(total);document.getElementById('next30').textContent=fmt(n30);document.getElementById('late').textContent=fmt(late);document.getElementById('latecount').textContent=payments.filter(p=>parse(p.data)<today).length+' pagamentos';document.getElementById('count').textContent=data.length;const q=document.getElementById('search').value.toLowerCase();const filtered=data.filter(p=>(p.fornecedor+' '+p.oc).toLowerCase().includes(q));document.getElementById('tbody').innerHTML=filtered.map(p=>`<tr><td>${dateFmt(p.data)}</td><td>${escapeHtml(p.oc)}</td><td>${escapeHtml(p.fornecedor)}</td><td class="right">${fmt(p.valor)}</td><td><span class="pill">${parse(p.data)<today?'Em atraso':'Previsto'}</span></td></tr>`).join('')||'<tr><td colspan="5" class="empty">Nenhum pagamento encontrado.</td></tr>';drawChart(data);drawSupplierPie(data);drawPaymentTerms(data)}
function drawChart(data){
 const c=document.getElementById('chart'),ctx=c.getContext('2d'),w=Math.max(320,c.clientWidth),h=Math.max(220,c.clientHeight),dpr=Math.min(window.devicePixelRatio||1,3);
 c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);if(!data.length)return;
 const grouped={};data.forEach(p=>grouped[p.data]=(grouped[p.data]||0)+p.valor);
 const dates=Object.keys(grouped).sort(),vals=dates.map(d=>grouped[d]);let cum=0;const accum=vals.map(v=>cum+=v);
 const dailyMax=Math.max(...vals,1)*1.28;
 const L=94,R=24,T=38,B=48,pw=w-L-R,ph=h-T-B,base=T+ph;
 const x=i=>L+pw*(i+.5)/dates.length;
 const yBar=v=>T+ph*(1-v/dailyMax), yLine=v=>yBar(v);
 const money=v=>'R$ '+Math.round(v).toLocaleString('pt-BR');
 ctx.lineCap='round';ctx.lineJoin='round';ctx.font='12px Inter, Segoe UI, Arial, sans-serif';ctx.textBaseline='middle';
 // Single shared scale: the line follows the same daily values as the columns.
 for(let i=0;i<=4;i++){
   const frac=i/4, yy=T+ph*(1-frac), dailyVal=dailyMax*frac;
   ctx.beginPath();ctx.moveTo(L,yy);ctx.lineTo(w-R,yy);ctx.strokeStyle='#1c3c64';ctx.lineWidth=1;ctx.stroke();
   ctx.fillStyle='#9bb2d2';ctx.textAlign='right';ctx.fillText(money(dailyVal),L-12,yy);

 }
 const slot=pw/dates.length,bw=Math.max(7,Math.min(30,slot*.42));
 // Daily bars.
 vals.forEach((v,i)=>{
   const xx=x(i),top=yBar(v);
   const grad=ctx.createLinearGradient(0,top,0,base);grad.addColorStop(0,'#2588ff');grad.addColorStop(1,'#174b85');
   ctx.fillStyle=grad;ctx.beginPath();ctx.roundRect(xx-bw/2,top,bw,Math.max(1,base-top),Math.min(4,bw/3));ctx.fill();
   const dateLabel=parse(dates[i]).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
   if(dates.length<=22||i%Math.ceil(dates.length/18)===0){ctx.fillStyle='#a8bedb';ctx.font='12px Inter, Segoe UI, Arial, sans-serif';ctx.textAlign='center';ctx.fillText(dateLabel,xx,h-22)}
 });
 // The line tracks the exact daily value represented by each column.
 ctx.beginPath();vals.forEach((v,i)=>i?ctx.lineTo(x(i),yLine(v)):ctx.moveTo(x(i),yLine(v)));ctx.strokeStyle='#49a0ff';ctx.lineWidth=3;ctx.stroke();
 vals.forEach((v,i)=>{ctx.beginPath();ctx.arc(x(i),yLine(v),3.5,0,Math.PI*2);ctx.fillStyle='#49a0ff';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke()});
 // Crisp labels above each bar, with collision-aware placement away from the cumulative line.
 const labelRects=[];
 vals.forEach((v,i)=>{
   let label=fmt(v).replace(/,00$/,'');ctx.font='600 12px Inter, Segoe UI, Arial, sans-serif';const tw=ctx.measureText(label).width,pad=6,bh=21;
   let xx=x(i)-tw/2-pad;xx=Math.max(L+2,Math.min(w-R-tw-pad*2,xx));
   let yy=yBar(v)-bh-8;
   // Keep labels inside plot and move them upward when they would collide with the daily-value line or another label.
   yy=Math.max(T+2,yy);
   for(let tries=0;tries<5;tries++){
     const overlapsLine=vals.some((vv,j)=>Math.abs(x(j)-(xx+(tw+pad*2)/2))<(tw+pad*2)*.45 && Math.abs(yLine(vv)-(yy+bh/2))<13);
     const overlapsLabel=labelRects.some(r=>xx<r.x+r.w+3&&xx+tw+pad*2>r.x-3&&yy<r.y+r.h+2&&yy+bh>r.y-2);
     if(!overlapsLine&&!overlapsLabel)break;yy-=bh+4;if(yy<T+1){yy=Math.min(base-bh-3,yBar(v)+5);break;}
   }
   ctx.fillStyle='#0c2344';ctx.strokeStyle='#2b4f7a';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(xx,yy,tw+pad*2,bh,5);ctx.fill();ctx.stroke();
   ctx.fillStyle='#e6f0ff';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(label,xx+pad,yy+bh/2);labelRects.push({x:xx,y:yy,w:tw+pad*2,h:bh});
 });
 ctx.textBaseline='alphabetic';ctx.textAlign='left';
}
function fitCanvas(canvas){const w=Math.max(220,canvas.clientWidth),h=Math.max(180,canvas.clientHeight),dpr=Math.min(window.devicePixelRatio||1,3);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);return {ctx,w,h}}
const supplierColors=['#2474c6','#ff7a18','#2bb673','#8257e5','#e84d5b','#f2c500','#20b7b1','#8793a1','#9c83ff','#547ca5'];
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function drawSupplierPie(data){const {ctx,w,h}=fitCanvas(document.getElementById('supplierPie')),legend=document.getElementById('supplierLegend'),sums={};data.forEach(p=>{const n=String(p.fornecedor||'Fornecedor não informado');sums[n]=(sums[n]||0)+Number(p.valor||0)});const all=Object.entries(sums).sort((a,b)=>b[1]-a[1]),total=all.reduce((a,x)=>a+x[1],0);if(!all.length||total<=0){legend.innerHTML='Sem dados de fornecedores.';return}const top=all.slice(0,8),other=all.slice(8).reduce((a,x)=>a+x[1],0);if(other>0)top.push(['Outros',other]);const cx=w/2,cy=h/2,r=Math.min(w*.42,h*.42),inner=r*.48;let angle=-Math.PI/2;top.forEach((it,i)=>{const sweep=it[1]/total*Math.PI*2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,angle,angle+sweep);ctx.closePath();ctx.fillStyle=supplierColors[i%supplierColors.length];ctx.fill();angle+=sweep});ctx.beginPath();ctx.arc(cx,cy,inner,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.fillStyle='#142238';ctx.font='700 13px Arial';ctx.textAlign='center';ctx.fillText(fmt(total).replace(',00',''),cx,cy-4);ctx.font='11px Arial';ctx.fillStyle='#9bb2d2';ctx.fillText('Total',cx,cy+12);legend.innerHTML=top.map((it,i)=>`<div class="pie-item"><span class="pie-swatch" style="background:${supplierColors[i%supplierColors.length]}"></span><span class="pie-name" title="${escapeHtml(it[0])}">${escapeHtml(it[0])}</span><span class="pie-amount">${fmt(it[1])}</span><span class="pie-pct">${(it[1]/total*100).toLocaleString('pt-BR',{maximumFractionDigits:1})}%</span></div>`).join('')}
function drawPaymentTerms(data){const {ctx,w,h}=fitCanvas(document.getElementById('termChart')),summary=document.getElementById('termSummary'),note=document.getElementById('termNote');const dated=data.filter(p=>p.dataOrigem&&p.data&&parse(p.data)>=parse(p.dataOrigem));const groups={};dated.forEach(p=>{const n=String(p.fornecedor||'Fornecedor não informado'),days=Math.round((parse(p.data)-parse(p.dataOrigem))/86400000),v=Math.max(0,Number(p.valor)||0);if(!groups[n])groups[n]={sum:0,total:0};groups[n].sum+=days*v;groups[n].total+=v});const vals=Object.entries(groups).map(([name,g])=>({name,days:g.total?g.sum/g.total:0,total:g.total})).sort((a,b)=>b.days-a.days),weight=vals.reduce((a,v)=>a+v.total,0),avg=weight?vals.reduce((a,v)=>a+v.days*v.total,0)/weight:0;summary.innerHTML=`Prazo médio geral<strong>${vals.length?Math.round(avg)+' dias':'—'}</strong>`;if(!vals.length){ctx.fillStyle='#9bb2d2';ctx.font='13px Arial';ctx.textAlign='center';ctx.fillText('Informe a data prevista de emissão da NF',w/2,h/2-5);ctx.fillText('na planilha para calcular o prazo.',w/2,h/2+15);note.textContent='O prazo é calculado entre a data prevista de emissão da NF e o vencimento, ponderado pelo valor. Se a planilha não tiver essa coluna, o gráfico ficará sem cálculo.';return}const shown=vals.slice(0,10),left=Math.min(175,w*.42),right=42,top=8,bottom=25,ph=h-top-bottom,pw=w-left-right,rowH=ph/shown.length,max=Math.max(1,...shown.map(v=>v.days))*1.18;ctx.font='11px Arial';for(let i=0;i<=4;i++){const x=left+pw*i/4;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,h-bottom);ctx.strokeStyle='#1c3c64';ctx.stroke();ctx.fillStyle='#9bb2d2';ctx.textAlign='center';ctx.fillText(Math.round(max*i/4),x,h-bottom+14)}shown.forEach((v,i)=>{const y=top+i*rowH+rowH*.2,bh=Math.max(8,rowH*.58),bw=pw*v.days/max;ctx.fillStyle='#9bb2d2';ctx.textAlign='right';let label=v.name;while(label.length>5&&ctx.measureText(label).width>left-10)label=label.slice(0,-1);if(label!==v.name)label+='…';ctx.fillText(label,left-8,y+bh/2);ctx.fillStyle='#3b91d9';ctx.beginPath();ctx.roundRect(left,y,Math.max(1,bw),bh,3);ctx.fill();ctx.fillStyle='#e6f0ff';ctx.textAlign='left';ctx.fillText(Math.round(v.days)+' dias',Math.min(w-right-35,left+bw+5),y+bh/2)});note.textContent='Prazo médio entre a data prevista de emissão da NF e o vencimento, ponderado pelo valor. '+(vals.length>10?'Exibindo os 10 maiores prazos.':'')}
function normKey(s){return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function cellDate(v){if(v==null||v==='')return '';if(v instanceof Date&&!isNaN(v))return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;if(typeof v==='number'&&window.XLSX&&XLSX.SSF){const d=XLSX.SSF.parse_date_code(v);if(d)return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`}const str=String(v).trim();let m=str.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);if(m){let y=Number(m[3]);if(y<100)y+=2000;return `${y}-${String(Number(m[2])).padStart(2,'0')}-${String(Number(m[1])).padStart(2,'0')}`}m=str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return `${m[1]}-${String(Number(m[2])).padStart(2,'0')}-${String(Number(m[3])).padStart(2,'0')}`;return ''}
function numVal(v){if(typeof v==='number')return v;let s=String(v??'').trim().replace(/R\$/gi,'').replace(/\s/g,'');if(!s)return 0;if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0}
function parseWorkbookRows(rows){if(!rows.length)throw Error('A planilha está vazia.');const headers=rows[0].map(normKey);const find=(...names)=>headers.findIndex(h=>names.some(n=>h===normKey(n)||h.includes(normKey(n))));const idxOC=find('Núm.OC','Numero OC','OC','Ordem de compra');const idxFornecedor=find('Razão social do fornecedor','Fornecedor');const idxValor=find('Valor total','Valor');const idxObs=find('Obs.ordem com','Observação','Obs ordem');const idxOrigem=find('Emissão Prevista','Emissao Prevista','Emissão prevista da NF','Emissao prevista da NF','Data prevista de emissão da NF','Data prevista emissão da NF','Data prevista de emissao da NF','Previsão de emissão da NF','Previsao de emissao da NF','Data da OC','Data de emissão','Data emissão','Data da compra','Data de compra','Data de lançamento','Data lançamento');const dateIdx=[];for(let i=1;i<=6;i++){let j=find('Data de Pagamento '+i);if(j>=0)dateIdx.push(j)}if(idxOC<0||idxFornecedor<0||idxValor<0||!dateIdx.length)throw Error('Não encontrei as colunas necessárias. A planilha precisa ter Núm.OC, Fornecedor/Razão social, Valor total e Data de Pagamento 1 a 6.');const result=[];for(const row of rows.slice(1)){if(!row||row.every(v=>v==null||v===''))continue;const oc=row[idxOC]??'',fornecedor=String(row[idxFornecedor]??'').trim(),total=numVal(row[idxValor]),obs=idxObs>=0?String(row[idxObs]??''):'',dates=dateIdx.map(j=>cellDate(row[j])).filter(Boolean);if(!dates.length||(!fornecedor&&!oc))continue;const amounts=[...obs.matchAll(/R\$\s*([\d.]+(?:,\d{2})?)/gi)].map(m=>numVal(m[1])),dataOrigem=idxOrigem>=0?cellDate(row[idxOrigem]):'';if(dates.length>1&&amounts.length>=dates.length){dates.forEach((d,i)=>result.push({oc:String(oc),fornecedor,data:d,dataOrigem,valor:amounts[i],descricao:'OC '+oc,situacao:'Previsto'}))}else if(dates.length>1){let remaining=Math.round(total*100);const base=Math.floor(remaining/dates.length);dates.forEach((d,i)=>{const cents=i===dates.length-1?remaining:base;remaining-=cents;result.push({oc:String(oc),fornecedor,data:d,dataOrigem,valor:cents/100,descricao:'OC '+oc,situacao:'Previsto'})})}else result.push({oc:String(oc),fornecedor,data:dates[0],dataOrigem,valor:total,descricao:'OC '+oc,situacao:'Previsto'})}if(!result.length)throw Error('Nenhum pagamento com data válida foi encontrado. Confira as colunas de datas.');return result}


// Importação somente para Andrei, David (por UID) ou administrador principal.
const uploadInput = document.getElementById('xlsxUpload');
uploadInput.addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  event.target.value = '';
  if (!permissaoEditor || importando) {
    status('Você não tem permissão para importar uma planilha.', true);
    return;
  }
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
    status('Selecione um arquivo Excel ou CSV.', true);
    return;
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    status('O arquivo ultrapassa o limite de ' + MAX_FILE_MB + ' MB.', true);
    return;
  }
  const ok = confirm('Publicar a planilha "' + file.name + '" para todos os usuários autorizados?\nA nova base substituirá a versão exibida.');
  if (!ok) return;

  importando = true;
  atualizarControles();
  try {
    status('Conferindo o arquivo Excel...');
    if (!window.XLSX) throw new Error('Não foi possível carregar o leitor de Excel (XLSX).');
    let linhas;
    if (/\.csv$/i.test(file.name)) {
      const txt = await file.text();
      const wb = XLSX.read(txt, { type: 'string' });
      linhas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header:1, defval:''});
    } else {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      linhas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
        header:1, defval:'', raw:true
      });
    }
    const parsed = validarPagamentos(parseWorkbookRows(linhas));
    const partes = separarPartes(parsed);
    const versao = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,12);
    // Verifica novamente junto ao servidor antes da publicação (regras confirmam no backend).
    const configAtual = await getDoc(EDITOR_CONFIG);
    const editores = configAtual.exists() ? uidsEditores(configAtual.data()) : [];
    if (!(usuarioAtual?.uid === ADMIN_PRINCIPAL_UID || editores.includes(usuarioAtual?.uid))) {
      throw new Error('Sua autorização de importação foi alterada.');
    }

    // Grava cada parte em uma versao INATIVA. Base atualmente publicada permanece intacta
    // mesmo que a conexão caia durante o envio.
    for (let i=0; i<partes.length; i++) {
      status(`Enviando planilha ao Firebase: parte ${i+1} de ${partes.length}...`);
      await setDoc(doc(db, 'compras_previsoes', 'atual', 'versoes', versao, 'partes', String(i).padStart(5,'0')), {
        versao, indice:i, pagamentos:partes[i]
      });
    }
    status('Publicando nova versão compartilhada...');
    // Só muda a referência após TODOS os registros estarem confirmados no servidor.
    await setDoc(REFERENCE_DOC, {
      versaoAtiva: versao,
      partes: partes.length,
      registros: parsed.length,
      arquivo: file.name.slice(0,150),
      atualizadoEm: serverTimestamp(),
      atualizadoPorUid: usuarioAtual.uid,
      atualizadoPorNome: String(acesso?.nome || acesso?.email || usuarioAtual.email || 'Usuário autorizado').slice(0,120)
    });
    status(`Planilha publicada com sucesso: ${parsed.length} pagamentos. Atualização enviada aos usuários autorizados.`);
  } catch (error) {
    console.error('Erro ao importar planilha:', error);
    status('Importação não publicada: ' + error.message + '. A última base publicada foi preservada.', true);
  } finally {
    importando = false;
    atualizarControles();
  }
});

sel.addEventListener('change', draw);
document.getElementById('search').addEventListener('input', draw);
window.addEventListener('resize', draw);
refreshMonths();
draw();
atualizarControles();
status('Conectando à base compartilhada de Compras...');
