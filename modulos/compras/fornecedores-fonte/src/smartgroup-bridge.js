// Adaptador independente para o React/Vite original, sem alterações nos estilos.
// Firebase Authentication, mesmas permissões 'compras' e armazenamento separado.
import * as XLSX from 'xlsx';

const ROOT_URL = new URL('../../../', window.location.href);
const SDK_URL = 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
const encoder = new TextEncoder();
const VERSION_PATTERN = /^v_[a-z0-9]+_[a-z0-9]+$/;
const clone = value => JSON.parse(JSON.stringify(value));

export const sgfBridge = {
  produtos: [], fornecedores: [], arquivo: '', canEdit: false,
  _listeners: new Set(), _permissionListeners: new Set(), _auth: null, _db: null,
  _sdk: null, _uid: '', _version: null, _generation: 0, _unsubscribe: [],
  _baseLoaded: false, _editorAllowed: false,

  subscribe(listener) {
    this._listeners.add(listener);
    listener({produtos: this.produtos, fornecedores: this.fornecedores, arquivo: this.arquivo});
    return () => this._listeners.delete(listener);
  },
  subscribePermissoes(listener) {
    this._permissionListeners.add(listener); listener(this.canEdit);
    return () => this._permissionListeners.delete(listener);
  },
  _announce() {
    const state = {produtos: this.produtos, fornecedores: this.fornecedores, arquivo: this.arquivo};
    for (const listener of this._listeners) listener(state);
  },
  _announcePermissions() {
    // Mostrar o botao aos editores autenticados, mesmo quando a base ainda
    // nao foi lida. Ler a base e publicar sao autorizacoes diferentes.
    // As regras Firestore continuam sendo a autoridade final de escrita.
    this.canEdit = Boolean(this._editorAllowed);
    for (const listener of this._permissionListeners) listener(this.canEdit);
  },

  async init() {
    // Import dinâmico em runtime: caminhos relativos ao domínio GitHub Pages,
    // nunca relativos ao servidor raiz github.io (que pode estar em outro repositório).
    const modGuard = await import(/* @vite-ignore */ new URL('module-guard.js?v=3',ROOT_URL).href);
    await modGuard.protegerModulo('compras');
    const conf = await import(/* @vite-ignore */ new URL('firebase-config.js',ROOT_URL).href);
    const sdk = await import(/* @vite-ignore */ SDK_URL);
    this._sdk=sdk; this._db=conf.db; this._auth=conf.auth; this._uid=conf.auth.currentUser?.uid||'';
    if (!this._uid) throw new Error('Sessão não autenticada.');
    const {doc, onSnapshot, getDoc} = sdk;
    const self=this;
    // Verificação de permissão de escrita; as regras do Firestore são a autoridade real.
    const config = doc(this._db,'compras_config','permissoes');
    const adminUID='IYjFcuc0PXYvkq7vt97NtkUknQD3';
    this._editorAllowed = this._uid === adminUID;
    this._announcePermissions();
    this._unsubscribe.push(onSnapshot(config,{includeMetadataChanges:true}, snap => {
      self._editorAllowed = self._uid === adminUID || (
        !snap.metadata.fromCache && snap.exists() &&
        Array.isArray(snap.data().editorUids) && snap.data().editorUids.includes(self._uid)
      );
      self._announcePermissions();
    },err => {console.warn('Permissão Radar:',err);self._editorAllowed=self._uid===adminUID;self._announcePermissions();}));
    const rootDoc=doc(this._db,'compras_radar','atual');
    this._unsubscribe.push(onSnapshot(rootDoc,{includeMetadataChanges:true}, async snap => {
      if (!snap.exists()) {
        if(snap.metadata.fromCache) return;
        ++self._generation; self._version=null;
        self.produtos=[];self.fornecedores=[];self.arquivo='';
        self._baseLoaded=true;self._announcePermissions();self._announce();
        return;
      }
      const info=snap.data();
      if(info.versaoAtiva===self._version) return;
      const generation=++self._generation;
      self._baseLoaded=false;self._announcePermissions();
      try { await self._read(info,generation); }
      catch(error) {
        if(generation!==self._generation) return;
        console.error('Falha ao carregar Radar de Compras:',error);
        self.produtos=[];self.fornecedores=[];self.arquivo='';self._version=null;
        self._baseLoaded=false;self._announcePermissions();self._announce();
      }
    },err=>{
      console.error('Acesso à base Radar:',err);
      self.produtos=[];self.fornecedores=[];self._version=null;
      self._baseLoaded=false;self._announcePermissions();self._announce();
    }));
    // Encerrar observadores caso a sessão termine ou seja trocada.
    const authSDK=await import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js');
    this._unsubscribe.push(authSDK.onAuthStateChanged(this._auth,user=>{
      if(!user || user.uid!==self._uid) {
        for(const stop of self._unsubscribe) stop();
        self.produtos=[]; self.fornecedores=[];self._announce();
        document.documentElement.style.visibility='hidden';
        window.location.replace(new URL('login.html',ROOT_URL).href);
      }
    }));
    if(typeof ResizeObserver!=='undefined') {
      const obs=new ResizeObserver(()=>self._postHeight());
      obs.observe(document.body);
    }
    window.addEventListener('load',()=>this._postHeight());
  },
  _postHeight() {
    if (window.parent===window) return;
    const height=Math.max(document.body.scrollHeight,document.documentElement.scrollHeight);
    window.parent.postMessage({type:'sgf:height',height},window.location.origin);
  },
  async _read(info,generation) {
    if(!VERSION_PATTERN.test(info.versaoAtiva)) throw new Error('Versão inválida.');
    const {collection,getDocs}=this._sdk;
    const col=collection(this._db,'compras_radar','atual','versoes',info.versaoAtiva,'partes');
    const snapshot=await getDocs(col);
    if(generation!==this._generation) return;
    if(snapshot.size!==info.partes) throw new Error('Versão publicada incompleta.');
    const sorted=snapshot.docs.sort((a,b)=>a.data().indice-b.data().indice);
    for(let i=0;i<sorted.length;i++) {
      if(sorted[i].data().indice!==i) throw new Error('Ordem de partes inválida.');
    }
    const products=[];const suppliers=[];
    for(const doc of sorted){
      const item=doc.data();
      if(item.tipo==='produtos') products.push(...item.registros);
      else if(item.tipo==='fornecedores') suppliers.push(...item.registros);
      else throw new Error('Tipo de dados inesperado.');
    }
    if(products.length!==info.totalProdutos || suppliers.length!==info.totalFornecedores)
      throw new Error('Contagem não corresponde à versão publicada.');
    if(generation!==this._generation) return;
    this.produtos=products;this.fornecedores=suppliers;
    this.arquivo=String(info.arquivo||'');this._version=info.versaoAtiva;
    this._baseLoaded=true;this._announcePermissions();
    this._announce();this._postHeight();
  },
  async publish(patch,arquivo) {
    if(!this.canEdit) throw new Error('Usuário sem permissão para importar.');
    // Nunca sobrescreva uma base já publicada quando sua leitura falhou.
    if(!this._baseLoaded) throw new Error(
      'A leitura da base do Radar ainda não foi validada no Firebase. Confira se as regras da coleção compras_radar foram publicadas e recarregue a página.'
    );
    const {doc,setDoc,serverTimestamp,getDoc}=this._sdk;
    // Confere novamente no servidor; as regras também exigem cpPodePublicar.
    if (this._uid!=='IYjFcuc0PXYvkq7vt97NtkUknQD3') {
      const cfg=await getDoc(doc(this._db,'compras_config','permissoes'));
      if(!cfg.exists() || !cfg.data()?.editorUids?.includes(this._uid))
        throw new Error('Permissão de importação não confirmada.');
    }
    const produtos=patch.produtos!==undefined ? clone(patch.produtos) : clone(this.produtos);
    const fornecedores=patch.fornecedores!==undefined ? clone(patch.fornecedores) : clone(this.fornecedores);
    if(!Array.isArray(produtos)||!Array.isArray(fornecedores)) throw new Error('Dados inválidos.');
    if(produtos.length+fornecedores.length===0) throw new Error('Planilha vazia.');
    if(produtos.length>100000||fornecedores.length>100000) throw new Error('Registros acima do limite.');
    const chunkSize=120;const chunks=[];
    for(const [tipo,registros] of [['produtos',produtos],['fornecedores',fornecedores]]) {
      for(let i=0;i<registros.length;i+=chunkSize) {
        const parte={tipo,registros:registros.slice(i,i+chunkSize)};
        if(encoder.encode(JSON.stringify(parte)).length>210000)
          throw new Error('Uma parte supera o limite do Firebase. Reduza os dados.');
        chunks.push(parte);
      }
    }
    if(chunks.length>1000) throw new Error('Limite de partes atingido.');
    const versao='v_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,12);
    for(let i=0;i<chunks.length;i++) {
      await setDoc(doc(this._db,'compras_radar','atual','versoes',versao,'partes',String(i).padStart(5,'0')),
        {...chunks[i],indice:i});
    }
    // Só ativa depois de confirmar todas as partes no servidor.
    const principal=doc(this._db,'compras_radar','atual');
    await setDoc(principal,{
      versaoAtiva:versao,partes:chunks.length,totalProdutos:produtos.length,
      totalFornecedores:fornecedores.length,arquivo:String(arquivo||'Atualização Radar').slice(0,150),
      atualizadoEm:serverTimestamp(),atualizadoPorUid:this._uid,
      atualizadoPorNome:String(this._auth.currentUser?.email||'Usuário autorizado').slice(0,120)
    });
  }
};

// Aceita a aba Planilha2 (resumo de produtos), ou Plan1 (movimentos)
// do arquivo ABC PRODUTOS.xlsx do projeto original.
export async function parseProductWorkbook(file) {
  const workbook=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false});
  const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const headers=sheet=>XLSX.utils.sheet_to_json(sheet,{header:1,defval:''});
  const lookup=(h,...patterns)=>h.findIndex(v=>patterns.some(p=>v===norm(p)||v.includes(norm(p))));
  const candidate=[];
  for(const name of workbook.SheetNames) {
    const grid=headers(workbook.Sheets[name]);
    if(grid.length<2) continue;
    const h=grid[0].map(norm);
    const supplier=lookup(h,'Razão Social');
    const description=lookup(h,'Descrição do produto');
    const code=lookup(h,'Código');
    const quantity=lookup(h,'Soma de Quantidade','Quantidade');
    const unitValue=lookup(h,'Soma de Vl.unitário','Vl.unitário');
    const value=lookup(h,'Soma de Vl.líquido','Vl.líquido');
    const date=lookup(h,'Dias (Dt.movto)','Dt.movto');
    if([supplier,description,code,quantity,unitValue,value,date].some(idx=>idx<0)) continue;
    candidate.push({grid,supplier,description,code,quantity,unitValue,value,date,
      isSummary:h.some(x=>x.includes('somadequantidade'))});
  }
  if(!candidate.length) return null;  // Planilha de fornecedores: parser original.
  const select=candidate.find(x=>x.isSummary)||candidate[0];
  const monthNames=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const number=value=> {
    if(typeof value==='number') return Number.isFinite(value)?value:0;
    const s=String(value||'').replace(/R\$/g,'').trim().replace(/\s/g,'');
    if(!s) return 0;
    const normalized=s.includes(',')?s.replace(/\./g,'').replace(',','.'):s;
    const n=Number(normalized);return Number.isFinite(n)?n:0;
  };
  const records=[];
  for(const row of select.grid.slice(1)) {
    const supplier=String(row[select.supplier]||'').trim();
    const description=String(row[select.description]||'').trim();
    if(!supplier||!description||/total\s+geral/i.test(supplier)) continue;
    const dateValue=row[select.date];
    let month=0;
    if(typeof dateValue==='number') month=XLSX.SSF.parse_date_code(dateValue)?.m||0;
    else {
      const text=String(dateValue||'').toLowerCase().trim();
      const short=text.match(/\b([a-zçãáé]{3})\b/);
      if(short) month=monthNames.indexOf(short[1])+1;
      if(!month) {
        const d=text.match(/^\d{1,2}[\/.-](\d{1,2})/);
        if(d)month=Number(d[1]);
      }
    }
    if(!Number.isInteger(month)||month<1||month>12) continue;
    records.push({supplier,code:String(row[select.code]??''),description,
      dateLabel:typeof dateValue==='string'?dateValue:String(dateValue),month,
      period:month<=6?'1º Semestre':'2º Semestre',quantity:number(row[select.quantity]),
      unitValue:number(row[select.unitValue]),value:number(row[select.value])});
  }
  if(!records.length) throw new Error('Nenhum produto com data válida encontrado no Excel.');
  return records;
}
