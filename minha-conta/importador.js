/* Importador local do painel de coleções. Mantém as mesmas regras do pipeline Python fornecido. */
(function () {
  "use strict";

  const ORDEM = ["VERÃO 26", "INVERNO 26", "VERÃO 27", "INVERNO 27"];
  const STOP = new Set("LTDA LTD SA S A ME EPP EIRELI IND COM INDUSTRIA COMERCIO DE DA DO E CALC CALCADOS CALCADO COMP COMPONENTES PARA P REPRES REPRESENTACOES VEST CALCA ARTIGOS PROD PRODUTOS FL".split(" "));
  const REP_FIX = { CRIS: "CRISTIANO", "": "SEM REP", COMPOR: "TELEVENDAS", OSCAR: "ONE WAY" };
  const CORES_EXTRAS = "BRANCO OFF|MOCCA|AREIA|CAMEL|TERRACOTA|OSTRA|VERMELHO|CHERRY|CHOCOLATE|AVELA|ROSA|OLIVE|DOURADO|PRATA|BRONZE|OURO ROSADO|VERDE LUNA|MANTEIGA|MARINHO|MOSTARDA|PINK|CARAMELO|FENDI|GELO|VINHO|GRAFITE|CHUMBO|AZUL|VERDE|AMARELO|LARANJA|LILAS|ROXO|VIOLETA|SALMAO|COBRE|ONIX|PEROLA|CRISTAL|TIFFANY|MARROM|NATURAL|COLONIAL|WHISKY|TABACO|CACAU|CREME|PALHA|RATO|CINZA|BORDO|ROSE|NUDE|PRETO|BRANCO|OFF WHITE|BEGE|VERMELHO RUBY|AZUL SKY|VERDE SKIN|SOLARE|RUBY|PRATA VELHA|OURO VELHO|CHAMPAGNE|OURO LIGHT|LASER PRATA|TITANIO|ROSE GOLD".split("|");
  const TERMOS_TECNICOS = new Set(["PU","PVC","MM","DUBLADO","DUBL","REP","PRINT"]);

  const nrm = v => String(v ?? "").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/(\w)-(\w)/g, "$1$2").replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const num = v => {
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    const s = String(v ?? "").trim();
    if (!s) return 0;
    const clean = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
    const m = clean.match(/-?[\d.]+/); return m ? Number(m[0]) || 0 : 0;
  };
  const rep = v => REP_FIX[nrm(v)] ?? nrm(v) ?? "SEM REP";
  const tokens = v => nrm(v).split(" ").filter(t => t.length > 1 && !STOP.has(t) && !/^\d+$/.test(t));
  const concat = v => nrm(v).split(" ").filter(t => !STOP.has(t)).join("");
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const mes = d => ymd(d).slice(0,7);
  const asDate = v => {
    if (v instanceof Date && !isNaN(v)) return v;
    if (typeof v === "number") return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    const s = String(v ?? "").trim();
    let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return new Date(+m[3], +m[2]-1, +m[1]);
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    return m ? new Date(+m[1], +m[2]-1, +m[3]) : null;
  };
  const excelSerial = d => Math.round((d.getTime() - Date.UTC(1899,11,30)) / 86400000);
  const key = (...p) => JSON.stringify(p);
  const inc = (map, k, factory, fn) => { if (!map.has(k)) map.set(k, factory()); fn(map.get(k)); };
  const faixa = d => d <= 30 ? "0-30" : d <= 60 ? "31-60" : d <= 90 ? "61-90" : d <= 180 ? "91-180" : "180+";

  function linhas(wb, nome) {
    const alvo = wb.SheetNames.find(s => nrm(s) === nrm(nome));
    if (!alvo) return [];
    return XLSX.utils.sheet_to_json(wb.Sheets[alvo], { header: 1, raw: true, defval: null });
  }

  function cabecalho(rows, tentativas = 8) {
    for (let i=0; i<Math.min(tentativas, rows.length); i++) {
      const vals = rows[i].map(nrm);
      if (vals.includes("FAMILIA") || vals.includes("ITEM") || vals.includes("PRODUTO") || vals.includes("DT ENT ITEM")) return i;
    }
    return 0;
  }

  function mapearNomes(nomes, razoes) {
    const rt = new Map(razoes.map(r => [r, new Set(tokens(r))]));
    const rc = new Map(razoes.map(r => [r, concat(r)]));
    const out = new Map();
    nomes.forEach(cli => {
      const ts = new Set(tokens(cli)); if (!ts.size) return;
      let cand = razoes.filter(r => [...ts].every(t => rt.get(r).has(t)));
      if (!cand.length) {
        const cc = concat(cli);
        cand = razoes.filter(r => cc && (rc.get(r).includes(cc.slice(0,8)) || (rc.get(r).length >= 6 && cc.includes(rc.get(r).slice(0,8)))));
      }
      if (!cand.length && ts.size > 1) cand = razoes.filter(r => [...ts].filter(t => rt.get(r).has(t)).length >= Math.max(2,ts.size-1));
      if (cand.length) out.set(cli,cand);
    });
    return out;
  }

  function parseMaterial(desc, cores) {
    const base=String(desc??"").toUpperCase().replace(/\(.*?\)/g,"");
    const limpo=nrm(base).split(" ").filter(t=>!/^\d+(MM|M)?$/.test(t)&&!TERMOS_TECNICOS.has(t)).join(" ");
    let cor="";
    for (const c of cores) { if(limpo===c) break; if(limpo.endsWith(" "+c)){cor=c;break} }
    const fam=cor?limpo.slice(0,-cor.length).trim():limpo;
    return [fam||limpo,cor];
  }

  async function processar(wb, progresso) {
    const codInfo=new Map(), nameCols=new Map(), famCols=new Map();
    const avisos={amostrasDataInvalida:0,colecoesSemCodigo:0,colecoesSemCor:0};
    const abas = [
      ["Coleção-Verão 26","VERÃO 26"],["Coleção-INVERNO 26","INVERNO 26"],
      ["Coleção-VERÃO 27","VERÃO 27"],["Coleção-Inverno 27","INVERNO 27"]
    ];
    for (const [aba,col] of abas) {
      const r=linhas(wb,aba); if(!r.length) continue; const hi=cabecalho(r,4); const h=r[hi].map(nrm);
      const fi=h.indexOf("FAMILIA"), ci=h.findIndex(x=>x==="COR"||x==="COR 2"||x.startsWith("COR ")), pi=h.includes("CODIGO")?h.indexOf("CODIGO"):h.indexOf("ITEM");
      if(fi<0||ci<0||pi<0)throw new Error(`Cabeçalhos incompatíveis na aba ${aba}. Necessário: Família, Cor/Cor 2 e Código/Item.`);
      for(let i=hi+1;i<r.length;i++){
        if(!r[i][fi])continue;
        if(!r[i][ci]){avisos.colecoesSemCor++;continue}
        const fam=nrm(r[i][fi]),cor=nrm(r[i][ci]),cod=Math.trunc(num(r[i][pi]));
        if(!cod)avisos.colecoesSemCodigo++;
        if(!nameCols.has(key(fam,cor)))nameCols.set(key(fam,cor),new Set()); nameCols.get(key(fam,cor)).add(col);
        if(!famCols.has(fam))famCols.set(fam,new Set()); famCols.get(fam).add(col);
        if(cod){
          if(!codInfo.has(cod))codInfo.set(cod,{fam,cor,cols:new Set(),variantes:[]});
          const info=codInfo.get(cod);info.cols.add(col);
          let variante=info.variantes.find(v=>v.fam===fam&&v.cor===cor);
          if(!variante){variante={fam,cor,cols:new Set()};info.variantes.push(variante)}
          variante.cols.add(col);
        }
      }
    }
    const materialPorCodigo=(cod,descricao,familia,cor)=>{
      const info=codInfo.get(cod);if(!info)return null;
      if(info.variantes.length===1)return info.variantes[0];
      const dn=nrm(descricao),fn=nrm(familia),cn=nrm(cor);
      return info.variantes.map((v,ord)=>({v,ord,p:(fn&&v.fam===fn?20:0)+(cn&&v.cor===cn?12:0)+(dn&&dn.includes(v.fam)?8:0)+(dn&&dn.includes(v.cor)?3:0)})).sort((a,b)=>b.p-a.p||a.ord-b.ord)[0].v;
    };
    const tagMaterial=(cod,fam,cor)=>{const mc=materialPorCodigo(cod,"",fam,cor);for(const s of [nameCols.get(key(fam,cor)),mc?.cols,codInfo.get(cod)?.cols,famCols.get(fam)])if(s?.size)return s.size>1?"CARRY-OVER":[...s][0];return "FORA DE COLEÇÃO"};
    const cores=[...new Set([...CORES_EXTRAS,...[...nameCols.keys()].map(k=>JSON.parse(k)[1])])].map(nrm).sort((a,b)=>b.length-a.length);
    progresso("Lendo faturamento…");
    const fr=linhas(wb,"Faturamento"), fhi=cabecalho(fr,10), fh=(fr[fhi]||[]).map(nrm), FATR=[], codCliRaz=new Map();
    const fidx={de:fh.indexOf("DT ENT ITEM"),df:fh.indexOf("DT FATURAM"),cod:fh.indexOf("PRODUTO"),desc:fh.indexOf("DESC COMPLETA"),cor:fh.indexOf("COR"),grupo:fh.indexOf("GRUPO"),qtd:fh.indexOf("QTD ITEM FT"),valor:fh.indexOf("VALOR FAT VALOR IPI VALOR FRETE"),cliente:fh.indexOf("CLIENTE"),razao:fh.indexOf("RAZAO SOCIAL"),representante:fh.indexOf("ABREVIACAO")};
    for(const [campo,indice] of Object.entries(fidx))if(indice<0)throw new Error(`Coluna ${campo} não encontrada na aba FATURAMENTO.`);
    for(let i=fhi+1;i<fr.length;i++){
      const row=fr[i], de=asDate(row[fidx.de]), df=asDate(row[fidx.df]); if((!de&&!df)||!row[fidx.desc])continue;
      const representante=rep(row[fidx.representante]);if(representante==="FABIO")continue; const dt=df||de, raz=String(row[fidx.razao]??"").trim();
      const codCli=row[fidx.cliente]!=null?Math.trunc(num(row[fidx.cliente])):null;if(codCli!=null&&raz)codCliRaz.set(codCli,raz);
      const seg=nrm(raz).includes("BEIRA RIO")?"BEIRA RIO":num(row[fidx.grupo])===39?"STK":"OUTROS", cod=Math.trunc(num(row[fidx.cod]));
      const mc=materialPorCodigo(cod,row[fidx.desc],null,row[fidx.cor]);const [fam,cor]=mc?[mc.fam,mc.cor]:parseMaterial(row[fidx.desc],cores);const tm=tagMaterial(cod,fam,cor);
      FATR.push({data:dt,mes:mes(dt),codigo:cod,familia:fam,cor,tag:seg==="BEIRA RIO"?"BEIRA RIO":seg==="STK"?tm:"FORA DE COLEÇÃO",bc:seg==="BEIRA RIO"&&tm==="CARRY-OVER"?1:0,segmento:seg,representante,razao:raz,codCliente:codCli,qtd:num(row[fidx.qtd]),valor:num(row[fidx.valor])});
    }
    const vendasCod=new Map(),vendasRaz=new Map();
    FATR.filter(x=>x.qtd>5).forEach(x=>{if(x.codCliente!=null){if(!vendasCod.has(x.codCliente))vendasCod.set(x.codCliente,[]);vendasCod.get(x.codCliente).push([x.data,x.codigo,x.familia])}if(!vendasRaz.has(x.razao))vendasRaz.set(x.razao,[]);vendasRaz.get(x.razao).push([x.data,x.codigo,x.familia])});
    const casar=(vl,cod,fam,data)=>{let nv=0,melhor=null;for(const [dt,c2,f2] of vl||[]){if(dt<data)continue;if(cod&&c2===cod){nv=2;const dd=Math.round((dt-data)/86400000);melhor=melhor==null?dd:Math.min(melhor,dd)}else if(f2===fam){nv=Math.max(nv,1);const dd=Math.round((dt-data)/86400000);melhor=melhor==null?dd:Math.min(melhor,dd)}}return [nv===2?"CONV_PC":nv===1?"CONV_P":"NAO_CONV",melhor??-1]};
    progresso("Cruzando amostras e vendas…");
    const ar=linhas(wb,"AMOSTRAS"), ah=(ar[0]||[]).map(nrm), ai=Object.fromEntries(ah.map((h,i)=>[h,i])), aiCor=ai.COR??ai["COR 2"];
    for(const campo of ["CLIENTE","PRODUTO","DATA","REPRESENTANTE","COD PRODUTO","COD CLIENTE","QTD"])if(ai[campo]==null)throw new Error(`Coluna ${campo} não encontrada na aba AMOSTRAS.`);
    if(aiCor==null)throw new Error("Coluna COR ou COR 2 não encontrada na aba AMOSTRAS.");
    const nomes=[...new Set(ar.slice(1).map(r=>String(r[ai.CLIENTE]??"").trim()).filter(Boolean))], razoes=[...vendasRaz.keys()], mapa=mapearNomes(nomes,razoes), AMR=[];
    for(let i=1;i<ar.length;i++){
      const row=ar[i],cli=String(row[ai.CLIENTE]??"").trim(),prod=row[ai.PRODUTO],dt=asDate(row[ai.DATA]);if(!cli||!prod)continue;if(!dt){avisos.amostrasDataInvalida++;continue}
      const representante=rep(row[ai.REPRESENTANTE]);if(representante==="FABIO")continue;let raw=row[ai["COD PRODUTO"]];if(raw instanceof Date)raw=excelSerial(raw);const cod=Math.trunc(num(raw));
      const mc=materialPorCodigo(cod,prod,prod,row[aiCor]),fam=mc?mc.fam:nrm(prod),cor=mc?mc.cor:nrm(row[aiCor]||"SEM COR"),seg=nrm(cli).includes("BEIRA RIO")?"BEIRA RIO":codInfo.has(cod)||famCols.has(fam)?"STK":"OUTROS",tm=tagMaterial(cod,fam,cor),tag=seg==="BEIRA RIO"?"BEIRA RIO":seg==="STK"?tm:"FORA DE COLEÇÃO";
      const codCli=Number.isInteger(row[ai["COD CLIENTE"]])?row[ai["COD CLIENTE"]]:null;let match=null,vl=[];
      if(codCli!=null&&(vendasCod.has(codCli)||codCliRaz.has(codCli))){match=["codigo",codCli];vl=vendasCod.get(codCli)||[]}else if(mapa.has(cli)){match=["razao",mapa.get(cli)];vl=mapa.get(cli).flatMap(r=>vendasRaz.get(r)||[])}
      const [status,dias]=match?casar(vl,cod,fam,dt):["SEM_FAT",-1];const ex=codInfo.has(cod)&&(nameCols.get(key(fam,cor))||mc?.cols||codInfo.get(cod).cols).size===1;
      AMR.push({origem:"MOSTRUARIO",cliente:cli,codCliente:codCli,data:dt,mes:mes(dt),representante,segmento:seg,tag,bc:seg==="BEIRA RIO"&&tm==="CARRY-OVER"?1:0,familia:fam,cor,codigo:cod,status,qtd:num(row[ai.QTD]),match,exclusivo:ex,dias,duplicado:0});
    }
    FATR.filter(x=>x.qtd>0&&x.qtd<=5).forEach(x=>{const vl=(x.codCliente!=null?vendasCod.get(x.codCliente):null)||vendasRaz.get(x.razao)||[];const [status,dias]=casar(vl,x.codigo,x.familia,x.data);AMR.push({origem:"FATURADO",cliente:x.razao,codCliente:x.codCliente,data:x.data,mes:x.mes,representante:x.representante,segmento:x.segmento,tag:x.tag,bc:x.bc,familia:x.familia,cor:x.cor,codigo:x.codigo,status,qtd:x.qtd,match:null,exclusivo:codInfo.has(x.codigo)&&(nameCols.get(key(x.familia,x.cor))||codInfo.get(x.codigo).cols).size===1,dias,duplicado:0})});
    const most=new Map(), duppares=[];
    AMR.filter(a=>a.origem==="MOSTRUARIO").forEach(a=>{const k=key(a.codCliente?"c"+a.codCliente:"n"+a.cliente,a.familia);if(!most.has(k))most.set(k,[]);most.get(k).push(a)});
    AMR.filter(a=>a.origem==="FATURADO").forEach(a=>{const k=key(a.codCliente?"c"+a.codCliente:"n"+a.cliente,a.familia);const b=(most.get(k)||[]).find(m=>Math.abs((a.data-m.data)/86400000)<=1);if(b){a.duplicado=1;duppares.push([a.cliente,a.familia,b.cor,a.cor,ymd(b.data),ymd(a.data),Math.abs(Math.round((a.data-b.data)/86400000)),b.representante,a.representante,b.qtd,a.qtd])}});
    const anchors={};ORDEM.forEach(c=>{const counts=new Map();AMR.filter(a=>a.exclusivo&&a.tag===c).forEach(a=>counts.set(a.mes,(counts.get(a.mes)||0)+1));let ac=0;for(const m of [...counts.keys()].sort()){ac+=counts.get(m);if(ac>=5){anchors[c]=m;break}}if(!anchors[c])anchors[c]="2025-01"});
    const comprou=new Map();AMR.filter(a=>a.origem==="MOSTRUARIO").forEach(a=>{const k=a.codCliente??a.cliente;if(comprou.has(k))return;comprou.set(k,(a.codCliente!=null&&vendasCod.has(a.codCliente))||(a.match?.[0]==="razao"&&a.match[1].some(r=>vendasRaz.has(r))))});
    const orf=new Set();AMR.forEach(a=>{if(a.origem==="MOSTRUARIO"){if(!comprou.get(a.codCliente??a.cliente))orf.add(a.cliente)}else if(!vendasCod.has(a.codCliente)&&!vendasRaz.has(a.cliente))orf.add(a.cliente)});
    const sr=linhas(wb,"ESTOQUE"), shi=cabecalho(sr,10), sh=(sr[shi]||[]).map(nrm), stk=[];
    const sidx={cod:sh.indexOf("PRODUTO"),alt:sh.indexOf("COD ALTERN 1"),desc:sh.indexOf("DESC COMPLETA"),cor:sh.indexOf("COR"),qtd:sh.indexOf("QTD FISICA"),valor:sh.indexOf("VLR TOT EST"),grupo:sh.indexOf("GRUPO")};
    for(const [campo,indice] of Object.entries(sidx))if(indice<0&&campo!=="alt")throw new Error(`Coluna ${campo} não encontrada na aba ESTOQUE.`);
    for(let i=shi+1;i<sr.length;i++){const row=sr[i];if(!row[sidx.cod])continue;const cod=Math.trunc(num(row[sidx.cod])),mc=materialPorCodigo(cod,row[sidx.desc],null,row[sidx.cor]),pc=mc?[mc.fam,mc.cor]:parseMaterial(row[sidx.desc],cores),fam=pc[0],cor=nrm(row[sidx.cor])||pc[1],alt=nrm(sidx.alt>=0?row[sidx.alt]:""),grupo=Math.trunc(num(row[sidx.grupo]));const tag=alt.includes("BEIRA RIO")?"BEIRA RIO":grupo===39?tagMaterial(cod,fam,cor):"FORA DE COLEÇÃO";stk.push([cod,fam,cor,tag,grupo,Math.round(num(row[sidx.qtd])*10)/10,Math.round(num(row[sidx.valor])*100)/100])}
    progresso("Montando indicadores…");
    const fat=new Map(),f5=new Map(),am=new Map(),lt=new Map(),orfrows=new Map();
    FATR.forEach(r=>{if(r.qtd>5||r.qtd===0){const fam=r.qtd===0?"__VAL__":r.familia,cor=r.qtd===0?"":r.cor,k=key(r.mes,r.segmento,r.tag,fam,cor,r.representante,r.qtd===0?0:r.bc);inc(fat,k,()=>[0,0],v=>{v[0]+=r.valor;v[1]+=r.qtd})}else{const k=key(r.mes,r.segmento,r.representante);f5.set(k,(f5.get(k)||0)+r.valor)}});
    AMR.forEach(a=>{const k=key(a.mes,a.segmento,a.origem,a.representante,a.tag,a.familia,a.cor,a.status,a.bc);inc(am,k,()=>[0,0,0],v=>{v[0]++;v[1]+=a.qtd;v[2]+=a.duplicado});if(a.status.startsWith("CONV")&&a.dias>=0){const l=key(a.mes,a.segmento,a.origem,a.representante,a.tag,faixa(a.dias));inc(lt,l,()=>[0,0],v=>{v[0]++;v[1]+=a.dias})}if(orf.has(a.cliente)){const o=key(a.cliente,a.mes,a.segmento,a.tag,a.representante,a.origem);inc(orfrows,o,()=>[0,0],v=>{v[0]++;v[1]+=a.qtd})}});
    const skus={};nameCols.forEach((cols,k)=>{const [fam,cor]=JSON.parse(k);skus[fam]??={};skus[fam][cor]=[...new Set([...(skus[fam][cor]||[]),...[...cols].map(c=>ORDEM.indexOf(c))])].sort()});
    const datasFat=FATR.map(r=>r.data).filter(Boolean).sort((a,b)=>a-b), dataBR=d=>d?`${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`:"–";
    return {anchors,skus,
      fat:[...fat].map(([k,v])=>[...JSON.parse(k),Math.round(v[0]*100)/100,Math.round(v[1]*10)/10]).sort(),
      f5:[...f5].map(([k,v])=>[...JSON.parse(k),Math.round(v*100)/100]).sort(),
      am:[...am].map(([k,v])=>[...JSON.parse(k),v[0],Math.round(v[1]*10)/10,v[2]]).sort(),
      lt:[...lt].map(([k,v])=>[...JSON.parse(k),v[0],v[1]]).sort(),
      orfrows:[...orfrows].map(([k,v])=>[...JSON.parse(k),v[0],Math.round(v[1]*10)/10,0]).sort(),stk,
      det:AMR.map(a=>[ymd(a.data),a.segmento,a.origem,a.representante,a.tag,a.cliente.slice(0,40),a.familia,a.cor,a.status,Math.round(a.qtd*10)/10,a.dias]),
      venddet:FATR.filter(r=>r.qtd>5).map(r=>[r.mes,r.segmento,r.tag,r.representante,r.familia,r.cor,r.razao,Math.round(r.qtd*10)/10,Math.round(r.valor*100)/100]),duppares,
      primeira_data_faturamento:dataBR(datasFat[0]),ultima_data_faturamento:dataBR(datasFat.at(-1)),avisos};
  }

  function aplicar(novo) {
    Object.keys(RAW).forEach(k=>delete RAW[k]);Object.assign(RAW,novo);
    FAT.splice(0,FAT.length,...RAW.fat.map(r=>({mes:r[0],seg:r[1],tag0:r[2],tag:r[2],fam:r[3],cor:r[4],rep:r[5],bc:r[6],val:r[7],met:r[8]})));
    F5.splice(0,F5.length,...RAW.f5.map(r=>({mes:r[0],seg:r[1],rep:r[2],val:r[3]})));
    AM.splice(0,AM.length,...RAW.am.map(r=>({mes:r[0],seg:r[1],orig:r[2],rep:r[3],tag0:r[4],tag:r[4],fam:r[5],cor:r[6],st:r[7],bc:r[8],n:r[9],q:r[10],dup:r[11]})));
    LT.splice(0,LT.length,...RAW.lt.map(r=>({mes:r[0],seg:r[1],orig:r[2],rep:r[3],tag:r[4],bk:r[5],n:r[6],dias:r[7]})));
    STKD.splice(0,STKD.length,...RAW.stk.map(r=>({cod:r[0],fam:r[1],cor:r[2],tag:r[3],grupo:r[4],met:r[5],val:r[6]})));
    DET.splice(0,DET.length,...RAW.det.map(r=>({d:r[0],mes:r[0].slice(0,7),seg:r[1],orig:r[2],rep:r[3],tag:r[4],cli:r[5],fam:r[6],cor:r[7],st:r[8],q:r[9],dias:r[10]})));
    VD.splice(0,VD.length,...RAW.venddet.map(r=>({mes:r[0],seg:r[1],tag:r[2],rep:r[3],fam:r[4],cor:r[5],raz:r[6],q:r[7],val:r[8]})));
    MESES.splice(0,MESES.length,...[...new Set([...FAT.map(r=>r.mes),...AM.map(r=>r.mes)])].sort());REPS.splice(0,REPS.length,...[...new Set([...AM.map(r=>r.rep),...FAT.map(r=>r.rep)])].sort());
    if(!MESES.length)throw new Error("A planilha não gerou meses válidos para exibição.");
    F.ini=MESES[0];F.fim=MESES.at(-1);F.rep="";
    F.segs.clear();SEGS.forEach(s=>F.segs.add(s));F.tags.clear();TAGS.forEach(t=>F.tags.add(t));F.origs.clear();ORIG.forEach(o=>F.origs.add(o));
    BC=false;document.querySelectorAll('#bcChips .chip').forEach(x=>x.classList.toggle('on',x.dataset.k==='bcfalse'));
    selI.innerHTML="";selF.innerHTML="";MESES.forEach(m=>{selI.add(new Option(mesBR(m),m));selF.add(new Option(mesBR(m),m))});selI.value=F.ini;selF.value=F.fim;
    repSel.innerHTML='<option value="">Todos</option>';REPS.forEach(r=>repSel.add(new Option(r,r)));
    const anoChips=document.getElementById("anoChips");anoChips.innerHTML="";
    [...new Set(MESES.map(m=>m.slice(0,4)))].concat(["TODOS"]).forEach(a=>{const c=document.createElement("div");c.className="chip"+(a==="TODOS"?" on":"");c.dataset.k=a;c.textContent=a;c.style.borderRadius="14px";c.onclick=()=>{if(a==="TODOS"){F.ini=MESES[0];F.fim=MESES.at(-1)}else{const ms=MESES.filter(m=>m.slice(0,4)===a);F.ini=ms[0];F.fim=ms.at(-1)}selI.value=F.ini;selF.value=F.fim;document.querySelectorAll("#anoChips .chip").forEach(x=>x.classList.toggle("on",x.dataset.k===a));render()};anoChips.appendChild(c)});
    Object.keys(EXCL_N).forEach(k=>delete EXCL_N[k]);ORDEM.forEach((t,ti)=>EXCL_N[ti]=0);
    Object.keys(RAW.skus||{}).forEach(f=>Object.keys(RAW.skus[f]).forEach(c=>{const ii=RAW.skus[f][c];if(ii.length===1)EXCL_N[ii[0]]++}));
    BRSKUS.clear();FAT.forEach(r=>{if(r.seg==="BEIRA RIO"&&r.fam!=="__VAL__")BRSKUS.add(r.fam+'\u0001'+r.cor)});AM.forEach(r=>{if(r.seg==="BEIRA RIO")BRSKUS.add(r.fam+'\u0001'+r.cor)});
    document.querySelectorAll('#origChips .chip').forEach(x=>x.classList.add('on'));
    document.getElementById("periodoNota").textContent=`Base importada: amostras de ${mesBR(MESES[0])} a ${mesBR(MESES.at(-1))} · faturamento até ${RAW.ultima_data_faturamento||"–"} · segmentos STK (Grupo 39) / Beira Rio / Outros`;
    const fa=document.getElementById("footAmostrasPeriodo"),ff=document.getElementById("footFaturamentoPeriodo"),fu=document.getElementById("footUltimaAtualizacao");
    if(fa)fa.textContent=mesBR(MESES[0])+"–"+mesBR(MESES.at(-1));if(ff)ff.textContent=(RAW.primeira_data_faturamento||"–")+" a "+(RAW.ultima_data_faturamento||"–");if(fu)fu.textContent=RAW.ultima_data_faturamento||"–";
    syncChips();render();
  }

  function abrirBanco() {
    return new Promise((resolve,reject)=>{const req=indexedDB.open("smart-group-colecoes",1);req.onupgradeneeded=()=>req.result.createObjectStore("dados");req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
  }
  async function salvarBase(dados) { const db=await abrirBanco();await new Promise((resolve,reject)=>{const tx=db.transaction("dados","readwrite");tx.objectStore("dados").put(dados,"base-importada");tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close(); }
  async function recuperarBase() { const db=await abrirBanco();const dados=await new Promise((resolve,reject)=>{const req=db.transaction("dados").objectStore("dados").get("base-importada");req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});db.close();return dados; }

  window.__processarColecoes = processar;
  const input=document.getElementById("arquivoColecoes"),btn=document.getElementById("btnImportarColecoes"),status=document.getElementById("statusImportacao");
  btn.addEventListener("click",()=>input.click());
  input.addEventListener("change",async()=>{const file=input.files?.[0];if(!file)return;btn.disabled=true;const set=t=>{status.textContent=t;status.hidden=false};try{set("Lendo planilha…");const wb=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true});const obrig=["AMOSTRAS","ESTOQUE","Faturamento","Coleção-Verão 26","Coleção-INVERNO 26","Coleção-VERÃO 27","Coleção-Inverno 27"];const faltam=obrig.filter(n=>!wb.SheetNames.some(s=>nrm(s)===nrm(n)));if(faltam.length)throw new Error("Abas não encontradas: "+faltam.join(", "));const novo=await processar(wb,set);aplicar(novo);await salvarBase(novo);const av=novo.avisos||{},partes=[];if(av.amostrasDataInvalida)partes.push(av.amostrasDataInvalida+" amostras com data inválida");if(av.colecoesSemCor)partes.push(av.colecoesSemCor+" item sem cor");if(av.colecoesSemCodigo)partes.push(av.colecoesSemCodigo+" itens sem código");set(partes.length?"Importada com alertas: "+partes.join("; "):"Planilha importada com sucesso");setTimeout(()=>status.hidden=true,partes.length?12000:5000)}catch(e){console.error(e);set("Erro: "+e.message);alert("Não foi possível importar a planilha.\n\n"+e.message)}finally{btn.disabled=false;input.value=""}});
  recuperarBase().then(dados=>{if(dados){aplicar(dados);status.textContent="Última planilha importada carregada";status.hidden=false;setTimeout(()=>status.hidden=true,3000)}}).catch(console.warn);
})();
