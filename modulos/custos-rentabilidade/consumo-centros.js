// SMART GROUP ANALYTICS — CONSUMO DE ITENS POR CENTRO DE CUSTO (SIGER)
// Extensão independente: não altera fórmulas, base dos cinco relatórios,
// nem as coleções/pointers já usados na rentabilidade.
import { db } from '../../firebase-config.js';
import { doc, collection, getDoc, getDocs, setDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const COLLECTION = 'custos_rentabilidade_shared'; // mesmas permissões já instaladas
const POINTER = 'consumo-centros-current'; // exclusivo desta extensão
const SLOTS = ['consumo-centros-slot-a', 'consumo-centros-slot-b'];
const CHUNK_SIZE = 350000; // bytes, seguros após Base64 para Firestore
let opMap = new Map();
let carregado = false;
let erroConsulta = '';
let ultimaAtualizacao = '';
let itensTotal = 0;

const elem = id => document.getElementById(id);
const html = valor => String(valor ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brl = valor => Number(valor || 0).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
const brl4 = valor => Number(valor || 0).toLocaleString('pt-BR', {style:'currency',currency:'BRL',minimumFractionDigits:4,maximumFractionDigits:4});
const quant = valor => Number(valor || 0).toLocaleString('pt-BR', {minimumFractionDigits:3,maximumFractionDigits:3});
const pct = valor => `${Number(valor || 0).toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2})}%`;
const opChave = valor => String(valor ?? '').trim().replace(/\.0$/,'').replace(/^0+(?=\d)/,'');
const chaveHeader = valor => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const existe = v => v !== '' && v !== null && v !== undefined;

function valorCelula(valor){
  if(valor == null) return '';
  if(typeof valor === 'object'){
    if('result' in valor) return valorCelula(valor.result);
    if('richText' in valor) return valor.richText.map(a=>a.text||'').join('');
    if('text' in valor) return valor.text;
  }
  return valor;
}
function numero(valor){
  const v=valorCelula(valor);
  if(!existe(v)) return 0;
  if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let t=String(v).replace(/\s|R\$/g,'');
  if(t.includes(',') && t.includes('.')) t=t.replace(/\./g,'').replace(',','.');
  else if(t.includes(',')) t=t.replace(',','.');
  const n=Number(t);
  return Number.isFinite(n) ? n : 0;
}
function texto(v){
  const x=valorCelula(v);
  return existe(x) ? String(x).trim().replace(/\.0$/,'') : '';
}

// SIGER: A OP, B Cód.prod.item, C Desc.completa, E UN,
// G Cons.previsto item OP, H Qtd.efetiva, K Cent.custo item OP,
// L Abreviação, N Vlr.previsto, O Vlr.efetivo, P Custo ger.
export function extrairConsumoCentros(workbook){
  const ws=workbook.worksheets.find(s=>s.actualRowCount > 0) || workbook.worksheets[0];
  if(!ws) throw Error('Planilha SIGER vazia.');
  const esperado={0:'op',1:'cod prod item',2:'desc completa',4:'un',6:'cons previsto item op',7:'qtd efetiva',10:'cent custo item op',11:'abreviacao',13:'vlr previsto',14:'vlr efetivo',15:'custo ger'};
  for(const [col,header] of Object.entries(esperado)){
    const real=chaveHeader(valorCelula(ws.getRow(1).getCell(Number(col)+1).value));
    if(real!==header){
      throw Error(`Formato do Relatório 208 incorreto: coluna ${String.fromCharCode(65+Number(col))} deve ser "${header}" (recebido: "${real||'vazio'}"). O Relatório 208 deve ser importado no botão exclusivo dele.`);
    }
  }
  const registros=[];
  for(let i=2;i<=ws.rowCount;i++){
    const r=ws.getRow(i);
    const c=n=>r.getCell(n).value;
    const op=opChave(texto(c(1)));
    const centroCodigo=texto(c(11));
    const centroNome=texto(c(12));
    if(!op || op==='0' || !(centroCodigo||centroNome)) continue;
    const produto=texto(c(2));
    const descricao=texto(c(3));
    // Linhas sem código/descrição marcam apenas a passagem pelo centro.
    // Permanecem como centro vazio, mas não entram nas somas nem na contagem de itens.
    const itemValido=(produto && produto!=='0') || !!descricao;
    registros.push({
      op, centroCodigo, centroNome, produto:itemValido?produto:'',
      descricao:itemValido?descricao:'', unidade:texto(c(5)),
      qtdPrevista:itemValido?numero(c(7)):0,
      qtdEfetiva:itemValido?numero(c(8)):0,
      valorPrevisto:itemValido?numero(c(14)):0,
      valorEfetivo:itemValido?numero(c(15)):0,
      custoGer:itemValido && existe(valorCelula(c(16))) ? numero(c(16)) : null,
      itemValido:Boolean(itemValido)
    });
  }
  if(!registros.length) throw Error('Nenhuma OP com centro de custo foi encontrada no arquivo.');
  if(!registros.some(r=>r.itemValido)) throw Error('O relatório não contém produtos/materiais válidos.');
  return {versao:1,relatorio:208,fonte:'SIGER - Relatório 208 - Consumo por Centro de Custo',geradoEm:new Date().toISOString(),registros};
}

function atualizarMapa(pacote){
  const mapa=new Map();
  for(const r of pacote?.registros||[]){
    const op=opChave(r.op);
    if(!op) continue;
    if(!mapa.has(op)) mapa.set(op,[]);
    mapa.get(op).push(r);
  }
  opMap=mapa;
  carregado=!!pacote;
  ultimaAtualizacao=pacote?.geradoEm||'';
  itensTotal=(pacote?.registros||[]).filter(r=>r.itemValido).length;
  atualizarStatus();
}
function atualizarStatus(){
  const status=elem('consumoCentrosStatus');
  if(!status) return;
  if(erroConsulta) status.textContent=`Relatório 208: erro ao consultar base compartilhada (${erroConsulta}).`;
  else if(!carregado) status.textContent='Relatório 208: ainda não foi importado.';
  else status.textContent=`Relatório 208: ${itensTotal.toLocaleString('pt-BR')} item(ns) em ${opMap.size.toLocaleString('pt-BR')} OP(s) · base compartilhada${ultimaAtualizacao?' · '+new Date(ultimaAtualizacao).toLocaleString('pt-BR'):''}.`;
}

function bytesBase64(bytes){
  let s=''; for(let i=0;i<bytes.length;i+=32768) s+=String.fromCharCode(...bytes.subarray(i,i+32768));
  return btoa(s);
}
function base64Bytes(texto){
  const s=atob(texto); const bytes=new Uint8Array(s.length);
  for(let i=0;i<s.length;i++) bytes[i]=s.charCodeAt(i);
  return bytes;
}
async function lerCompartilhado(){
  const atual=await getDoc(doc(db,COLLECTION,POINTER));
  if(!atual.exists()) return null;
  const slot=atual.data()?.slot;
  if(!SLOTS.includes(slot)) throw Error('Ponteiro do consumo inválido.');
  const meta=await getDoc(doc(db,COLLECTION,slot));
  if(!meta.exists() || meta.data()?.status!=='ready') throw Error('Relatório 208 não está pronto.');
  const count=Number(meta.data()?.chunkCount||0);
  if(!Number.isInteger(count) || count<1 || count>250) throw Error('Quantidade de blocos inválida.');
  const docs=await getDocs(collection(db,COLLECTION,slot,'chunks'));
  const partes=new Array(count);
  for(const part of docs.docs){
    const idx=Number(part.id);
    if(Number.isInteger(idx) && idx>=0 && idx<count) partes[idx]=base64Bytes(String(part.data()?.payload||''));
  }
  if(Array.from({length:count},(_,i)=>partes[i]).some(a=>!a)) throw Error('Relatório 208 compartilhado com blocos faltantes.');
  const len=partes.reduce((a,b)=>a+b.length,0), bytes=new Uint8Array(len);
  let off=0; for(const part of partes){bytes.set(part,off);off+=part.length;}
  const pacote=JSON.parse(new TextDecoder().decode(bytes));
  if(pacote?.relatorio != null && Number(pacote.relatorio) !== 208) throw Error('A base compartilhada não corresponde ao Relatório 208.');
  if(!Array.isArray(pacote.registros)) throw Error('Registros de consumo inválidos.');
  return pacote;
}
async function publicarCompartilhado(pacote){
  const atual=await getDoc(doc(db,COLLECTION,POINTER));
  const ativo=atual.exists()?atual.data()?.slot:'';
  const slot=ativo===SLOTS[0]?SLOTS[1]:SLOTS[0];
  const bytes=new TextEncoder().encode(JSON.stringify(pacote));
  const partes=[];
  for(let i=0;i<bytes.length;i+=CHUNK_SIZE) partes.push(bytes.slice(i,i+CHUNK_SIZE));
  if(partes.length>250) throw Error('Arquivo muito grande para esta importação: reduza o período do relatório.');
  const statusDoc=doc(db,COLLECTION,slot);
  await setDoc(statusDoc,{status:'uploading',chunkCount:partes.length,updatedAt:pacote.geradoEm});
  for(let i=0;i<partes.length;i++){
    await setDoc(doc(db,COLLECTION,slot,'chunks',String(i).padStart(4,'0')),{payload:bytesBase64(partes[i])});
  }
  await setDoc(statusDoc,{status:'ready',chunkCount:partes.length,updatedAt:pacote.geradoEm});
  // Ponteiro independente; NÃO modifica "current", "slot-a" nem "slot-b".
  await setDoc(doc(db,COLLECTION,POINTER),{slot,updatedAt:pacote.geradoEm,chunkCount:partes.length});
  return partes.length;
}

// Separado do cálculo de M.O.: nenhum valor deste relatório entra nos KPIs atuais.
export function renderizarConsumoPorOP(op){
  const chave=opChave(op), registros=opMap.get(chave)||[];
  if(erroConsulta && !carregado) return '<div class="cc-vazio">Consumo por centro indisponível. Confira a conexão com o Firestore.</div>';
  if(!carregado) return '<div class="cc-vazio">Relatório 208: ainda não importado.</div>';
  if(!registros.length) return '<div class="cc-vazio">Sem registros do Relatório 208 para esta OP.</div>';
  const centros=new Map();
  for(const r of registros){
    const key=`${r.centroCodigo}¦${r.centroNome}`;
    if(!centros.has(key)) centros.set(key,{nome:r.centroNome||r.centroCodigo,codigo:r.centroCodigo,linhas:[]});
    if(r.itemValido) centros.get(key).linhas.push(r);
  }
  const grupos=[...centros.values()];
  const soma=(linhas,campo)=>linhas.reduce((a,r)=>a+Number(r[campo]||0),0);
  const vt=grupos.reduce((a,c)=>a+soma(c.linhas,'valorPrevisto'),0);
  const et=grupos.reduce((a,c)=>a+soma(c.linhas,'valorEfetivo'),0);
  const diferenca=(n)=>n>0.005?'cc-ruim':n< -0.005?'cc-bom':'cc-neutro';
  return `<section class="cc-bloco" aria-label="Consumos por centro de custo">
    <div class="cc-bloco-head"><div><span>RELATÓRIO 208 • SIGER</span><strong>Consumo por centro de custo · OP ${html(chave)}</strong><small>Previsto × apontado. Valores abaixo são de análise e NÃO são somados à M.O. ou à margem.</small></div><div class="cc-global"><span>Previsto: ${brl(vt)}</span><span>Efetivo: ${brl(et)}</span><strong class="${diferenca(et-vt)}">Diferença: ${et-vt>0?'+':''}${brl(et-vt)}</strong></div></div>
    <div class="cc-centros">${grupos.map((c,idx)=>{
      const prev=soma(c.linhas,'valorPrevisto'),efet=soma(c.linhas,'valorEfetivo'),delta=efet-prev;
      const volume=c.linhas.length;
      return `<details class="cc-centro" ${idx===0?'open':''}><summary><span class="cc-centro-nome">Centro de custo <strong>${html(c.nome)}</strong>${c.codigo && c.codigo!==c.nome?` <small>(${html(c.codigo)})</small>`:''}</span><span class="cc-centro-badge">${volume} ${volume===1?'item':'itens'}</span><span class="cc-centro-sum"><small>Previsto</small><strong>${brl(prev)}</strong></span><span class="cc-centro-sum"><small>Efetivo</small><strong>${brl(efet)}</strong></span><span class="cc-centro-diff ${diferenca(delta)}">${delta>0?'+':''}${brl(delta)}</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>
      <div class="cc-cards"><article><span>Valor previsto</span><strong>${brl(prev)}</strong></article><article><span>Valor efetivo</span><strong>${brl(efet)}</strong></article><article><span>Diferença (efetivo - previsto)</span><strong class="${diferenca(delta)}">${delta>0?'+':''}${brl(delta)}</strong><small>${prev?`${delta>0?'+':''}${pct(delta/Math.abs(prev)*100)}`:'Sem base para %'}</small></article></div>
      ${volume?`<div class="cc-scroll"><table class="cc-tabela"><thead><tr><th>Produto / material</th><th>UN</th><th class="num">Cons. previsto</th><th class="num">Qtd. efetiva</th><th class="num">Δ quantidade</th><th class="num">Vlr. previsto</th><th class="num">Vlr. efetivo</th><th class="num">Δ valor</th><th class="num" title="Campo Custo ger da coluna P do relatório SIGER. Não é somado ao total; pode ser taxa ou custo unitário.">Custo ger. (P)</th></tr></thead>
      <tbody>${c.linhas.map(r=>{
        const dq=Number(r.qtdEfetiva||0)-Number(r.qtdPrevista||0),dv=Number(r.valorEfetivo||0)-Number(r.valorPrevisto||0);
        const qp=Number(r.qtdPrevista||0), difer=qp!==0?`${dq>0?'+':''}${pct(dq/Math.abs(qp)*100)}`:(dq!==0?'Sem previsão':'0,00%');
        return `<tr><td><strong>${html(r.produto||'—')}</strong><span>${html(r.descricao||'Sem descrição')}</span></td><td>${html(r.unidade||'—')}</td><td class="num">${quant(r.qtdPrevista)}</td><td class="num">${quant(r.qtdEfetiva)}</td><td class="num ${diferenca(dq)}">${quant(dq)} <small>(${difer})</small></td><td class="num">${brl(r.valorPrevisto)}</td><td class="num">${brl(r.valorEfetivo)}</td><td class="num ${diferenca(dv)}">${dv>0?'+':''}${brl(dv)}</td><td class="num">${r.custoGer===null?'—':brl4(r.custoGer)}</td></tr>`;
      }).join('')}</tbody></table></div>`:'<p class="cc-sem-item">Centro registrado pelo SIGER sem item/material apontado.</p>'}
      </details>`;
    }).join('')}</div><p class="cc-nota">Custo ger. (P) é mostrado por item, exatamente como informado pelo SIGER, sem somatória. Diferença = efetivo − previsto. As quantidades são comparadas somente dentro do mesmo produto/unidade.</p></section>`;
}

export async function iniciarConsumoCentros({admin,carregarExcel,atualizarDetalhe}){
  const botao=elem('importarConsumoCentros'), entrada=elem('arquivoConsumoCentros');
  if(botao) botao.hidden=!admin;
  if(entrada) entrada.disabled=!admin;
  atualizarStatus();
  if(botao && entrada){
    botao.addEventListener('click',()=>entrada.click());
    entrada.addEventListener('change',async e=>{
      const arquivo=e.target.files?.[0];
      e.target.value='';
      if(!arquivo) return;
      if(!admin){alert('Somente o administrador pode publicar o consumo.');return;}
      if(!/\.xlsx$/i.test(arquivo.name)){alert('Selecione o Relatório 208 em formato .xlsx do SIGER.');return;}
      const original=botao.innerHTML;
      botao.disabled=true;
      try{
        botao.textContent='Lendo Relatório 208…';
        const ExcelJS=await carregarExcel();
        const workbook=new ExcelJS.Workbook();
        await workbook.xlsx.load(await arquivo.arrayBuffer());
        const pacote=extrairConsumoCentros(workbook);
        botao.textContent='Publicando Relatório 208…';
        const blocos=await publicarCompartilhado(pacote);
        erroConsulta='';
        atualizarMapa(pacote);
        atualizarDetalhe();
        alert(`Relatório 208 publicado para todos os usuários autorizados.\n\n${itensTotal} produtos/materiais em ${opMap.size} OP(s).\n${blocos} bloco(s) gravados no Firestore.\n\nOs cinco relatórios e os cálculos atuais não foram alterados.`);
      }catch(err){
        console.error('Falha ao importar Relatório 208:',err);
        alert(`Relatório 208 NÃO aplicado.\n\n${err?.message||err}`);
      }finally{botao.disabled=false;botao.innerHTML=original;}
    });
  }
  try{
    const pacote=await lerCompartilhado();
    erroConsulta='';
    atualizarMapa(pacote);
  }catch(err){
    console.warn('Consumo por centro não disponível:',err);
    erroConsulta=err?.message||'sem detalhes';
    atualizarStatus();
  }
  atualizarDetalhe();
}
