/* Importador local do painel de coleções. Mantém as mesmas regras do pipeline Python fornecido. */
(function () {
  "use strict";

  const ORDEM = ["VERÃO 26", "INVERNO 26", "VERÃO 27", "INVERNO 27"];
  const STOP = new Set("LTDA LTD SA S A ME EPP EIRELI IND COM INDUSTRIA COMERCIO DE DA DO E CALC CALCADOS CALCADO COMP COMPONENTES PARA P REPRES REPRESENTACOES VEST CALCA ARTIGOS PROD PRODUTOS FL".split(" "));
  const REP_FIX = { CRIS: "CRISTIANO", "": "SEM REP", COMPOR: "TELEVENDAS", OSCAR: "ONE WAY" };
  const CORES_EXTRAS = "BRANCO OFF|MOCCA|AREIA|CAMEL|TERRACOTA|OSTRA|VERMELHO|CHERRY|CHOCOLATE|AVELA|ROSA|OLIVE|DOURADO|PRATA|BRONZE|OURO ROSADO|VERDE LUNA|MANTEIGA|MARINHO|MOSTARDA|PINK|CARAMELO|FENDI|GELO|VINHO|GRAFITE|CHUMBO|AZUL|VERDE|AMARELO|LARANJA|LILAS|ROXO|VIOLETA|SALMAO|COBRE|ONIX|PEROLA|CRISTAL|TIFFANY|MARROM|NATURAL|COLONIAL|WHISKY|TABACO|CACAU|CREME|PALHA|RATO|CINZA|BORDO|ROSE|NUDE|PRETO|BRANCO|OFF WHITE|BEGE|VERMELHO RUBY|AZUL SKY|VERDE SKIN|SOLARE|RUBY|PRATA VELHA|OURO VELHO|CHAMPAGNE|OURO LIGHT|LASER PRATA|TITANIO|ROSE GOLD".split("|");
  const TERMOS_TECNICOS = new Set(["PU","PVC","MM","DUBLADO","DUBL","REP","PRINT"]);
  const GRAFIA_BASE = new Set(typeof RAW!=="undefined"&&Array.isArray(RAW.orfrows)?RAW.orfrows.filter(r=>r[8]).map(r=>r[0]):[]);

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
      if (vals.includes("FAMILIA") || vals.includes("ITEM") || vals.includes("DT ENT ITEM")) return i;
    }
    return 0;
  }

  function coluna(cabecalhos, ...nomes) {
    for (const nome of nomes) {
      const i = cabecalhos.indexOf(nrm(nome));
      if (i >= 0) return i;
    }
    return -1;
  }

  function validarColunas(indices, aba) {
    const faltam = Object.entries(indices).filter(([,i])=>i<0).map(([nome])=>nome);
    if (faltam.length) throw new Error(`Colunas não encontradas na aba ${aba}: ${faltam.join(", ")}`);
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
    for(const c of cores){if(limpo===c)break;if(limpo.endsWith(" "+c)){cor=c;break}}
    const fam=cor?limpo.slice(0,-cor.length).trim():limpo;
    return [fam||limpo,cor];
  }

  async function processar(wb, progresso) {
    const codInfo=new Map(), nameCols=new Map(), famCols=new Map();
    const abas = [
      ["Coleção-Verão 26","VERÃO 26"],["Coleção-INVERNO 26","INVERNO 26"],
      ["Coleção-VERÃO 27","VERÃO 27"],["Coleção-Inverno 27","INVERNO 27"]
    ];
    for (const [aba,col] of abas) {
      const r=linhas(wb,aba); if(!r.length) continue; const hi=cabecalho(r,4); const h=r[hi].map(nrm);
      const fi=coluna(h,"FAMILIA"), ci=coluna(h,"COR 2","COR"), pi=coluna(h,"CODIGO","ITEM","PRODUTO");
      validarColunas({familia:fi,cor:ci,codigo:pi},aba);
      for(let i=hi+1;i<r.length;i++){
        if(!r[i][fi]||!r[i][ci])continue; const fam=nrm(r[i][fi]),cor=nrm(r[i][ci]),cod=Math.trunc(num(r[i][pi]));
        if(!nameCols.has(key(fam,cor)))nameCols.set(key(fam,cor),new Set()); nameCols.get(key(fam,cor)).add(col);
        if(!famCols.has(fam))famCols.set(fam,new Set()); famCols.get(fam).add(col);
        if(cod){if(!codInfo.has(cod))codInfo.set(cod,{fam,cor,cols:new Set()});codInfo.get(cod).cols.add(col)}
      }
    }
    const tagMaterial=(cod,fam,cor)=>{for(const s of [nameCols.get(key(fam,cor)),codInfo.get(cod)?.cols,famCols.get(fam)])if(s?.size)return s.size>1?"CARRY-OVER":[...s][0];return "FORA DE COLEÇÃO"};
    const cores=[...new Set([...CORES_EXTRAS,...[...nameCols.keys()].map(k=>JSON.parse(k)[1])])].map(nrm).sort((a,b)=>b.length-a.length);
    progresso("Lendo faturamento…");
    const fr=linhas(wb,"Faturamento"), FATR=[], codCliRaz=new Map();
    const fhi=cabecalho(fr,12), fh=(fr[fhi]||[]).map(nrm);
    const fConstr=coluna(fh,"CONSTR"), fCorDescricao=fh.findIndex((v,i)=>i>fConstr&&v==="DESCRICAO");
    const fc={de:coluna(fh,"DT ENT ITEM"),df:coluna(fh,"DT FATURAM"),cod:coluna(fh,"PRODUTO","ITEM"),desc:coluna(fh,"DESC COMPLETA","DESCRICAO COMPLETA"),corRelatorio:coluna(fh,"COR 2","COR"),corCadastro:fCorDescricao>=0?fCorDescricao:coluna(fh,"COR 2","COR"),grupo:coluna(fh,"GRUPO"),qtd:coluna(fh,"QTD ITEM FT","QTD ITEM/FAT"),valor:coluna(fh,"VALOR FAT VALOR IPI VALOR FRETE"),cliente:coluna(fh,"CLIENTE"),razao:coluna(fh,"RAZAO SOCIAL"),rep:coluna(fh,"ABREVIACAO")};
    validarColunas(fc,"Faturamento");
    for(let i=fhi+1;i<fr.length;i++){
      const row=fr[i], de=asDate(row[fc.de]), df=asDate(row[fc.df]); if((!de&&!df)||!row[fc.desc])continue;
      const representante=rep(row[fc.rep]);if(representante==="FABIO")continue; const dt=df||de, raz=String(row[fc.razao]??"").trim();
      const codCli=row[fc.cliente]!=null?Math.trunc(num(row[fc.cliente])):null;if(codCli!=null&&raz)codCliRaz.set(codCli,raz);
      const seg=nrm(raz).includes("BEIRA RIO")?"BEIRA RIO":num(row[fc.grupo])===39?"STK":"OUTROS", cod=Math.trunc(num(row[fc.cod]));
      const mc=codInfo.get(cod),pc=mc?[mc.fam,mc.cor]:parseMaterial(row[fc.desc],cores),fam=pc[0];
      const cor=mc?pc[1]:(String(row[fc.corCadastro]??"").trim()?nrm(row[fc.corRelatorio]):pc[1]);const tm=tagMaterial(cod,fam,cor);
      FATR.push({data:dt,mes:mes(dt),codigo:cod,familia:fam,cor,tag:seg==="BEIRA RIO"?"BEIRA RIO":seg==="STK"?tm:"FORA DE COLEÇÃO",bc:seg==="BEIRA RIO"&&tm==="CARRY-OVER"?1:0,segmento:seg,representante,razao:raz,codCliente:codCli,qtd:num(row[fc.qtd]),valor:num(row[fc.valor])});
    }
    const vendasCod=new Map(),vendasRaz=new Map();
    FATR.filter(x=>x.qtd>5).forEach(x=>{if(x.codCliente!=null){if(!vendasCod.has(x.codCliente))vendasCod.set(x.codCliente,[]);vendasCod.get(x.codCliente).push([x.data,x.codigo,x.familia])}if(!vendasRaz.has(x.razao))vendasRaz.set(x.razao,[]);vendasRaz.get(x.razao).push([x.data,x.codigo,x.familia])});
    const casar=(vl,cod,fam,data)=>{let nv=0,melhor=null;for(const [dt,c2,f2] of vl||[]){if(dt<data)continue;if(cod&&c2===cod){nv=2;const dd=Math.round((dt-data)/86400000);melhor=melhor==null?dd:Math.min(melhor,dd)}else if(f2===fam){nv=Math.max(nv,1);const dd=Math.round((dt-data)/86400000);melhor=melhor==null?dd:Math.min(melhor,dd)}}return [nv===2?"CONV_PC":nv===1?"CONV_P":"NAO_CONV",melhor??-1]};
    progresso("Cruzando amostras e vendas…");
    const ar=linhas(wb,"AMOSTRAS"), ah=(ar[0]||[]).map(nrm), ai=Object.fromEntries(ah.map((h,i)=>[h,i]));
    const nomes=[...new Set(ar.slice(1).map(r=>String(r[ai.CLIENTE]??"").trim()).filter(Boolean))], razoes=[...vendasRaz.keys()], mapa=mapearNomes(nomes,razoes), AMR=[];
    for(let i=1;i<ar.length;i++){
      const row=ar[i],cli=String(row[ai.CLIENTE]??"").trim(),prod=row[ai.PRODUTO],dt=asDate(row[ai.DATA]);if(!cli||!prod||!dt)continue;
      const representante=rep(row[ai.REPRESENTANTE]);if(representante==="FABIO")continue;let raw=row[ai["COD PRODUTO"]];if(raw instanceof Date)raw=excelSerial(raw);const cod=Math.trunc(num(raw));
      const mc=codInfo.get(cod),fam=mc?mc.fam:nrm(prod),cor=mc?mc.cor:nrm(row[coluna(ah,"COR 2","COR")]||"SEM COR"),seg=nrm(cli).includes("BEIRA RIO")?"BEIRA RIO":codInfo.has(cod)||famCols.has(fam)?"STK":"OUTROS",tm=tagMaterial(cod,fam,cor),tag=seg==="BEIRA RIO"?"BEIRA RIO":seg==="STK"?tm:"FORA DE COLEÇÃO";
      const codCli=Number.isInteger(row[ai["COD CLIENTE"]])?row[ai["COD CLIENTE"]]:null;let match=null,vl=[];
      if(codCli!=null&&(vendasCod.has(codCli)||codCliRaz.has(codCli))){match=["codigo",codCli];vl=vendasCod.get(codCli)||[]}else if(mapa.has(cli)){match=["razao",mapa.get(cli)];vl=mapa.get(cli).flatMap(r=>vendasRaz.get(r)||[])}
      const [status,dias]=match?casar(vl,cod,fam,dt):["SEM_FAT",-1];const ex=codInfo.has(cod)&&(nameCols.get(key(fam,cor))||codInfo.get(cod).cols).size===1;
      AMR.push({origem:"MOSTRUARIO",cliente:cli,codCliente:codCli,data:dt,mes:mes(dt),representante,segmento:seg,tag,bc:seg==="BEIRA RIO"&&tm==="CARRY-OVER"?1:0,familia:fam,cor,codigo:cod,status,qtd:num(row[ai.QTD]),match,exclusivo:ex,dias,duplicado:0});
    }
    FATR.filter(x=>x.qtd>0&&x.qtd<=5).forEach(x=>{const vl=(x.codCliente!=null?vendasCod.get(x.codCliente):null)||vendasRaz.get(x.razao)||[];const [status,dias]=casar(vl,x.codigo,x.familia,x.data);AMR.push({origem:"FATURADO",cliente:x.razao,codCliente:x.codCliente,data:x.data,mes:x.mes,representante:x.representante,segmento:x.segmento,tag:x.tag,bc:x.bc,familia:x.familia,cor:x.cor,codigo:x.codigo,status,qtd:x.qtd,match:null,exclusivo:codInfo.has(x.codigo)&&(nameCols.get(key(x.familia,x.cor))||codInfo.get(x.codigo).cols).size===1,dias,duplicado:0})});
    const most=new Map(), duppares=[];
    AMR.filter(a=>a.origem==="MOSTRUARIO").forEach(a=>{const k=key(a.codCliente?"c"+a.codCliente:"n"+a.cliente,a.familia);if(!most.has(k))most.set(k,[]);most.get(k).push(a)});
    AMR.filter(a=>a.origem==="FATURADO").forEach(a=>{const k=key(a.codCliente?"c"+a.codCliente:"n"+a.cliente,a.familia);const b=(most.get(k)||[]).find(m=>Math.abs((a.data-m.data)/86400000)<=1);if(b){a.duplicado=1;duppares.push([a.cliente,a.familia,b.cor,a.cor,ymd(b.data),ymd(a.data),Math.abs(Math.round((a.data-b.data)/86400000)),b.representante,a.representante,b.qtd,a.qtd])}});
    const anchors={};ORDEM.forEach(c=>{const counts=new Map();AMR.filter(a=>a.exclusivo&&a.tag===c).forEach(a=>counts.set(a.mes,(counts.get(a.mes)||0)+1));let ac=0;for(const m of [...counts.keys()].sort()){ac+=counts.get(m);if(ac>=5){anchors[c]=m;break}}if(!anchors[c])anchors[c]="2025-01"});
    const comprou=new Map();AMR.filter(a=>a.origem==="MOSTRUARIO").forEach(a=>{const k=a.codCliente??a.cliente;if(comprou.has(k))return;comprou.set(k,(a.codCliente!=null&&vendasCod.has(a.codCliente))||(a.match?.[0]==="razao"&&a.match[1].some(r=>vendasRaz.has(r))))});
    const semVenda=a=>a.origem==="MOSTRUARIO"?!comprou.get(a.codCliente??a.cliente):!vendasCod.has(a.codCliente)&&!vendasRaz.has(a.cliente);
    const sr=linhas(wb,"ESTOQUE"), stk=[]; // coluna D (índice 3) é COR, mesmo sem cabeçalho
    for(let i=7;i<sr.length;i++){const row=sr[i];if(!row[0])continue;const cod=Math.trunc(num(row[0])),mc=codInfo.get(cod),pc=mc?[mc.fam,mc.cor]:parseMaterial(row[2],cores),fam=pc[0],cor=mc?pc[1]:(nrm(row[3])||pc[1]),alt=nrm(row[1]),grupo=Math.trunc(num(row[6]));const tag=alt.includes("BEIRA RIO")?"BEIRA RIO":grupo===39?tagMaterial(cod,fam,cor):"FORA DE COLEÇÃO";stk.push([cod,fam,cor,tag,grupo,Math.round(num(row[4])*10)/10,Math.round(num(row[5])*100)/100])}
    progresso("Montando indicadores…");
    const fat=new Map(),f5=new Map(),am=new Map(),lt=new Map(),orfrows=new Map();
    FATR.forEach(r=>{if(r.qtd>5||r.qtd===0){const fam=r.qtd===0?"__VAL__":r.familia,cor=r.qtd===0?"":r.cor,k=key(r.mes,r.segmento,r.tag,fam,cor,r.representante,r.qtd===0?0:r.bc);inc(fat,k,()=>[0,0],v=>{v[0]+=r.valor;v[1]+=r.qtd})}else{const k=key(r.mes,r.segmento,r.representante);f5.set(k,(f5.get(k)||0)+r.valor)}});
    AMR.forEach(a=>{const k=key(a.mes,a.segmento,a.origem,a.representante,a.tag,a.familia,a.cor,a.status,a.bc);inc(am,k,()=>[0,0,0],v=>{v[0]++;v[1]+=a.qtd;v[2]+=a.duplicado});if(a.status.startsWith("CONV")&&a.dias>=0){const l=key(a.mes,a.segmento,a.origem,a.representante,a.tag,faixa(a.dias));inc(lt,l,()=>[0,0],v=>{v[0]++;v[1]+=a.dias})}if(semVenda(a)){const o=key(a.cliente,a.mes,a.segmento,a.tag,a.representante,a.origem);inc(orfrows,o,()=>[0,0],v=>{v[0]++;v[1]+=a.qtd})}});
    const skus={};codInfo.forEach(info=>{skus[info.fam]??={};skus[info.fam][info.cor]=[...new Set([...(skus[info.fam][info.cor]||[]),...[...info.cols].map(c=>ORDEM.indexOf(c))])].sort()});nameCols.forEach((cols,k)=>{const [fam,cor]=JSON.parse(k);skus[fam]??={};skus[fam][cor]=[...new Set([...(skus[fam][cor]||[]),...[...cols].map(c=>ORDEM.indexOf(c))])].sort()});
    const datasFat=FATR.map(r=>r.data).filter(Boolean).sort((a,b)=>a-b), br=d=>d?`${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`:"";
    return {anchors,skus,
      fat:[...fat].map(([k,v])=>[...JSON.parse(k),Math.round(v[0]*100)/100,Math.round(v[1]*10)/10]).sort(),
      f5:[...f5].map(([k,v])=>[...JSON.parse(k),Math.round(v*100)/100]).sort(),
      am:[...am].map(([k,v])=>[...JSON.parse(k),v[0],Math.round(v[1]*10)/10,v[2]]).sort(),
      lt:[...lt].map(([k,v])=>[...JSON.parse(k),v[0],v[1]]).sort(),
      orfrows:[...orfrows].map(([k,v])=>{const p=JSON.parse(k);return [...p,v[0],Math.round(v[1]*10)/10,GRAFIA_BASE.has(p[0])?1:0]}).sort(),stk,
      det:AMR.map(a=>[ymd(a.data),a.segmento,a.origem,a.representante,a.tag,a.cliente.slice(0,40),a.familia,a.cor,a.status,Math.round(a.qtd*10)/10,a.dias]),
      venddet:FATR.filter(r=>r.qtd>5).map(r=>[r.mes,r.segmento,r.tag,r.representante,r.familia,r.cor,r.razao,Math.round(r.qtd*10)/10,Math.round(r.valor*100)/100]),duppares,
      ultima_data_faturamento:br(datasFat.at(-1)),primeira_data_faturamento:br(datasFat[0])};
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
    F.ini=MESES[0];F.fim=MESES.at(-1);F.rep="";
    // Preserve as referências usadas pelos eventos dos balões de filtro.
    // Substituir os Set aqui fazia os cliques alterarem os filtros antigos
    // enquanto o relatório consultava os novos, travando a UI após importar.
    F.segs.clear();SEGS.forEach(s=>F.segs.add(s));
    F.tags.clear();TAGS.forEach(t=>F.tags.add(t));
    F.origs.clear();ORIG.forEach(o=>F.origs.add(o));
    selI.innerHTML="";selF.innerHTML="";MESES.forEach(m=>{selI.add(new Option(mesBR(m),m));selF.add(new Option(mesBR(m),m))});selI.value=F.ini;selF.value=F.fim;
    repSel.innerHTML='<option value="">Todos</option>';REPS.forEach(r=>repSel.add(new Option(r,r)));
    document.getElementById("periodoNota").textContent=`Base importada: amostras de ${mesBR(MESES[0])} a ${mesBR(MESES.at(-1))} · segmentos STK (Grupo 39) / Beira Rio / Outros`;
    syncChips();document.querySelectorAll("#origChips .chip").forEach(x=>x.classList.add("on"));render();
  }

  // ============================================================
  // BASE COMPARTILHADA NO FIRESTORE
  // ============================================================
  // A planilha continua sendo processada no navegador, mas o resultado
  // consolidado é compactado e salvo no Firestore. Assim, o último
  // carregamento feito por um usuário fica disponível para todos os demais.

  const TAMANHO_PARTE = 450000; // bem abaixo do limite de 1 MiB por documento
  let firebaseApiPromise = null;
  let sincronizacaoIniciada = false;
  let versaoAplicada = null;

  function mostrarStatus(texto, cor) {
    status.textContent = texto;
    status.hidden = false;
    status.style.color = cor || "var(--tx2)";
  }

  function dataHoraBR(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    }).format(d);
  }

  function mostrarUltimaBase(meta) {
    const quando = dataHoraBR(meta?.atualizadoEmIso);
    const nome = String(meta?.arquivo || "").trim();
    const partes = ["Compartilhado ✅"];
    if (quando) partes.push(quando);
    if (nome) partes.push(nome);
    mostrarStatus(partes.join(" · "), "var(--ok)");
  }

  async function obterFirebaseApi() {
    if (!firebaseApiPromise) {
      firebaseApiPromise = Promise.all([
        import("../../firebase-config.js"),
        import("https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js")
      ]).then(([cfg, fs]) => ({
        db: cfg.db,
        doc: fs.doc,
        getDoc: fs.getDoc,
        setDoc: fs.setDoc,
        deleteDoc: fs.deleteDoc,
        onSnapshot: fs.onSnapshot,
        serverTimestamp: fs.serverTimestamp
      }));
    }
    return firebaseApiPromise;
  }

  function bytesParaBase64(bytes) {
    let bin = "";
    const passo = 0x8000;
    for (let i = 0; i < bytes.length; i += passo) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + passo));
    }
    return btoa(bin);
  }

  function base64ParaBytes(base64) {
    const bin = atob(base64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function codificarBase(dados) {
    const texto = JSON.stringify(dados);
    const bruto = new TextEncoder().encode(texto);

    if ("CompressionStream" in window) {
      const fluxo = new Blob([bruto])
        .stream()
        .pipeThrough(new CompressionStream("gzip"));
      const compactado = new Uint8Array(await new Response(fluxo).arrayBuffer());
      return {
        codificacao: "gzip-base64",
        conteudo: bytesParaBase64(compactado),
        bytesOriginais: bruto.byteLength,
        bytesCompactados: compactado.byteLength
      };
    }

    return {
      codificacao: "base64",
      conteudo: bytesParaBase64(bruto),
      bytesOriginais: bruto.byteLength,
      bytesCompactados: bruto.byteLength
    };
  }

  async function decodificarBase(conteudo, codificacao) {
    let bytes = base64ParaBytes(conteudo);

    if (codificacao === "gzip-base64") {
      if (!("DecompressionStream" in window)) {
        throw new Error("Este navegador não suporta a descompactação da base compartilhada.");
      }
      const fluxo = new Blob([bytes])
        .stream()
        .pipeThrough(new DecompressionStream("gzip"));
      bytes = new Uint8Array(await new Response(fluxo).arrayBuffer());
    }

    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function dividirConteudo(texto) {
    const partes = [];
    for (let i = 0; i < texto.length; i += TAMANHO_PARTE) {
      partes.push(texto.slice(i, i + TAMANHO_PARTE));
    }
    return partes;
  }

  function idParte(versao, indice) {
    return `${versao}_${String(indice).padStart(3, "0")}`;
  }

  async function salvarBaseCompartilhada(dados, nomeArquivo) {
    const api = await obterFirebaseApi();
    const metaRef = api.doc(api.db, "colecoes_base", "atual");
    const atualSnap = await api.getDoc(metaRef);
    const metaAtual = atualSnap.exists() ? atualSnap.data() : {};

    mostrarStatus("Compactando base…", "var(--tx2)");
    const pacote = await codificarBase(dados);
    const partes = dividirConteudo(pacote.conteudo);

    const sufixo = (window.crypto?.randomUUID?.() || String(Date.now()))
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 12);
    const versao = `v${Date.now()}_${sufixo}`;

    mostrarStatus(`Salvando para todos… 0/${partes.length}`, "var(--tx2)");

    for (let i = 0; i < partes.length; i++) {
      const parteRef = api.doc(
        api.db,
        "colecoes_base", "atual",
        "partes", idParte(versao, i)
      );
      await api.setDoc(parteRef, {
        versao,
        indice: i,
        conteudo: partes[i]
      });
      mostrarStatus(`Salvando para todos… ${i + 1}/${partes.length}`, "var(--tx2)");
    }

    const usuario = window.usuarioAnalytics || {};
    const metaNova = {
      versao,
      partes: partes.length,
      codificacao: pacote.codificacao,
      bytesOriginais: pacote.bytesOriginais,
      bytesCompactados: pacote.bytesCompactados,
      arquivo: nomeArquivo || "planilha.xlsx",
      atualizadoEm: api.serverTimestamp(),
      atualizadoEmIso: new Date().toISOString(),
      atualizadoPorUid: usuario.uid || null,
      atualizadoPorNome: usuario.nome || usuario.emailFirebase || null,
      ultimaDataFaturamento: dados.ultima_data_faturamento || null,
      versaoAnterior: metaAtual.versao || null,
      partesAnterior: Number(metaAtual.partes || 0)
    };

    // O ponteiro para a nova versão é atualizado por último. Dessa forma,
    // nenhum outro usuário tenta ler uma base enquanto os pedaços ainda
    // estão sendo gravados.
    await api.setDoc(metaRef, metaNova);

    // Mantém a versão atual e a imediatamente anterior. A versão mais antiga
    // pode ser removida com segurança depois que o novo ponteiro já existe.
    const antigaVersao = metaAtual.versaoAnterior;
    const antigasPartes = Number(metaAtual.partesAnterior || 0);
    if (antigaVersao && antigasPartes > 0) {
      Promise.allSettled(
        Array.from({ length: antigasPartes }, (_, i) =>
          api.deleteDoc(api.doc(
            api.db,
            "colecoes_base", "atual",
            "partes", idParte(antigaVersao, i)
          ))
        )
      ).catch(() => {});
    }

    return metaNova;
  }

  async function carregarBaseCompartilhada(meta) {
    const api = await obterFirebaseApi();
    const total = Number(meta?.partes || 0);
    if (!meta?.versao || total < 1) return;

    mostrarStatus("Carregando última base compartilhada…", "var(--tx2)");

    const leituras = await Promise.all(
      Array.from({ length: total }, (_, i) =>
        api.getDoc(api.doc(
          api.db,
          "colecoes_base", "atual",
          "partes", idParte(meta.versao, i)
        ))
      )
    );

    const faltando = leituras.findIndex(s => !s.exists());
    if (faltando >= 0) {
      throw new Error(`Parte ${faltando + 1}/${total} da base compartilhada não foi encontrada.`);
    }

    const conteudo = leituras
      .map(s => String(s.data().conteudo || ""))
      .join("");

    const dados = await decodificarBase(conteudo, meta.codificacao || "base64");
    aplicar(dados);
    versaoAplicada = meta.versao;
    mostrarUltimaBase(meta);
  }

  async function iniciarSincronizacaoCompartilhada() {
    if (sincronizacaoIniciada) return;
    sincronizacaoIniciada = true;

    try {
      const api = await obterFirebaseApi();
      const metaRef = api.doc(api.db, "colecoes_base", "atual");

      mostrarStatus("Buscando última base compartilhada…", "var(--tx2)");

      api.onSnapshot(
        metaRef,
        async snap => {
          if (!snap.exists()) {
            status.hidden = true;
            return;
          }

          const meta = snap.data();
          if (!meta?.versao) {
            status.hidden = true;
            return;
          }

          if (meta.versao === versaoAplicada) {
            mostrarUltimaBase(meta);
            return;
          }

          try {
            await carregarBaseCompartilhada(meta);
          } catch (erro) {
            console.error("Erro ao carregar base compartilhada de coleções:", erro);
            mostrarStatus("⚠ Base compartilhada indisponível", "var(--warn)");
          }
        },
        erro => {
          console.error("Erro na sincronização das coleções:", erro);
          mostrarStatus("⚠ Sem acesso à base compartilhada", "var(--warn)");
        }
      );
    } catch (erro) {
      console.error("Erro ao iniciar sincronização das coleções:", erro);
      mostrarStatus("⚠ Sincronização indisponível", "var(--warn)");
    }
  }

  window.__processarColecoes = processar;
  window.__iniciarSincronizacaoColecoes = iniciarSincronizacaoCompartilhada;

  const input = document.getElementById("arquivoColecoes");
  const btn = document.getElementById("btnImportarColecoes");
  const status = document.getElementById("statusImportacao");

  btn.addEventListener("click", () => input.click());

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;

    btn.disabled = true;

    try {
      mostrarStatus("Lendo planilha…", "var(--tx2)");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const obrig = ["AMOSTRAS", "ESTOQUE", "Faturamento"];
      const faltam = obrig.filter(n => !wb.SheetNames.some(s => nrm(s) === nrm(n)));
      if (faltam.length) throw new Error("Abas não encontradas: " + faltam.join(", "));

      const novo = await processar(wb, t => mostrarStatus(t, "var(--tx2)"));

      // Primeiro grava a base central. Só depois considera a importação concluída.
      // Assim, o usuário não recebe uma falsa confirmação caso o Firestore rejeite
      // a gravação por regra/permissão ou falha de rede.
      const meta = await salvarBaseCompartilhada(novo, file.name);
      versaoAplicada = meta.versao;
      aplicar(novo);
      mostrarUltimaBase(meta);
    } catch (e) {
      console.error(e);
      mostrarStatus("Erro ao compartilhar: " + e.message, "var(--bad)");
      alert(
        "Não foi possível importar e compartilhar a planilha.\n\n" +
        e.message +
        "\n\nSe esta for a primeira instalação da sincronização, publique também as regras do arquivo ADICIONAR-NAS-REGRAS-FIRESTORE-COLECOES.txt."
      );
    } finally {
      btn.disabled = false;
      input.value = "";
    }
  });
})();
