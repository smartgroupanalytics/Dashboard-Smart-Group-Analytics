/*
 * Smart Group Analytics - Exportacao XLSX da Analise Integrada Comercial
 * Adicao isolada: nao modifica calculos, filtros, componentes ou endpoints.
 * Exporta as mesmas agregacoes e regras de planejamento do bundle original.
 * Dependencias externas: nenhuma. Download local no navegador.
 */
(function () {
  "use strict";

  const PERIODOS = [
    ["1m", "30 dias", 30],
    ["3m", "3 meses", 90],
    ["6m", "6 meses", 180],
    ["12m", "12 meses", 365]
  ];
  const COLUNAS = [
    ["Grupo", "text", 17],
    ["Coleção STK (Cód. altern. 1)", "text", 27],
    ["Marca Beira Rio", "text", 20],
    ["Família", "text", 27],
    ["Código do produto", "text", 19],
    ["Códigos unificados", "text", 23],
    ["Descrição do material", "text", 46],
    ["Cor", "text", 23],
    ["Espessura", "text", 16],
    ["Origem do material", "text", 18],
    ["Período", "text", 16],
    ["Dias do período", "qty", 15],
    ["Estoque Geral", "qty", 19],
    ["Estoque Físico", "qty", 19],
    ["Estoque SMT (RS)", "qty", 20],
    ["Estoque SM3 (SC)", "qty", 20],
    ["Compras em Aberto", "qty", 21],
    ["Ordens de Produção", "qty", 22],
    ["Vendas no Período", "qty", 19],
    ["Consumo no Período", "qty", 21],
    ["Qtd. em Aberto", "qty", 20],
    ["Valor em Aberto (R$)", "money", 23],
    ["Cobertura (meses)", "qty", 21],
    ["Lead Time (dias)", "qty", 20],
    ["Comprar (sugerido)", "qty", 21],
    ["Status", "text", 17],
    ["Valor de Estoque (R$)", "money", 24]
  ];

  const normalizar = v => String(v == null ? "" : v).trim();
  const codigo = r => normalizar(r && (r.produto ?? r.cod_prod ?? r.codProduto ?? r.codigo_produto ?? r.codigo));
  const numero = v => {
    const n = Number(v || 0);
    return Number.isFinite(n) ? n : 0;
  };
  const ordem = (a, b) => String(a).localeCompare(String(b), "pt-BR", {numeric: true, sensitivity: "base"});

  function pedidosPorCodigo(dados) {
    const mapa = new Map();
    (dados.pedidosAbertos || []).forEach(p => {
      const id = codigo(p);
      if (!id) return;
      const atual = mapa.get(id) || {quantidade: 0, valor: 0};
      atual.quantidade += numero(p.qtd_aberto ?? p.qtd_solicitada ?? p["Qtd.solic.item"]);
      atual.valor += numero(p.valor_aberto ?? p["Valor Fat+Valor IPI+Valor Frete"]);
      mapa.set(id, atual);
    });
    return mapa;
  }

  function carteiraDoMaterial(material, mapa) {
    const chaves = new Set([material.produto, ...(material.codigos_unificados || [])].map(normalizar).filter(Boolean));
    let quantidade = 0, valor = 0;
    chaves.forEach(c => {
      const pedido = mapa.get(c);
      if (pedido) {
        quantidade += numero(pedido.quantidade);
        valor += numero(pedido.valor);
      }
    });
    return { quantidade, valor };
  }

  // Separacao por Colecao/Marca utiliza os MESMOS filtros do dashboard:
  // um produto unificado em colecoes diferentes so aparece com os saldos e
  // movimentacoes da colecao escolhida, evitando repetir o total global.
  function montarLinhas(estado, escopo) {
    // Exporta somente o grupo do botão acionado. Nunca une STK com Beira Rio.
    if (escopo !== "STK" && escopo !== "BEIRA RIO") {
      throw new Error("Selecione o grupo STK ou BEIRA RIO para exportação.");
    }
    if (!estado || !estado.pronto || !estado.stk || !estado.beiraRio || !estado.dados) {
      throw new Error("Os dados comerciais ainda não terminaram de carregar.");
    }
    const pedidos = pedidosPorCodigo(estado.dados);
    const grupos = [];
    const colecoes = Array.from(new Set((estado.stk.estoque || [])
      .map(item => normalizar(item.cod_altern_1)).filter(Boolean))).sort(ordem);

    if (escopo === "STK") for (const colecao of colecoes) {
      const dados = estado.filtrarColecao(estado.stk, [colecao]);
      const familias = estado.agrupar(dados, "", "");
      grupos.push({grupo: "STK", colecao, marca: "", familias});
    }
    // Produtos sem Cód. altern. 1, se existirem, não ficam fora da exportação.
    const semColecao = (estado.stk.estoque || []).filter(item => !normalizar(item.cod_altern_1));
    if (escopo === "STK" && semColecao.length) {
      const filtrados = filtrarPorCodigos(estado.stk, new Set(semColecao.map(codigo).filter(Boolean)), semColecao);
      grupos.push({grupo: "STK", colecao: "(SEM COLEÇÃO)", marca: "", familias: estado.agrupar(filtrados, "", "")});
    }
    const marcas = Array.from(new Set((estado.beiraRio.estoque || [])
      .map(item => normalizar(item.marca) || "VAZIO"))).sort(ordem);
    if (escopo === "BEIRA RIO") for (const marca of marcas) {
      const dados = estado.filtrarMarca(estado.beiraRio, [marca]);
      grupos.push({grupo: "BEIRA RIO", colecao: "", marca, familias: estado.agrupar(dados, "", "")});
    }

    const linhas = [];
    let produtos = 0;
    for (const grupo of grupos) {
      for (const familia of grupo.familias) {
        for (const cor of familia.cores || []) {
          for (const item of cor.itens || []) {
            produtos += 1;
            const carteira = carteiraDoMaterial(item, pedidos);
            for (const [chave, rotulo, dias] of PERIODOS) {
              const plano = estado.planejar(item, chave);
              const cobertura = Number.isFinite(plano.coberturaDias)
                ? plano.coberturaDias / 30
                : "999+ meses";
              linhas.push([
                grupo.grupo, grupo.colecao, grupo.marca, familia.familia,
                normalizar(item.produto || item.codigo_principal),
                (item.codigos_unificados || []).map(normalizar).filter(Boolean).join(", "),
                normalizar(item.desc), normalizar(cor.cor), normalizar(item.espessura),
                normalizar(item.origem || familia.origem), rotulo, dias,
                numero(item.estoque) + numero(item.compras) + numero(item.op),
                numero(item.estoque), numero(item.estoqueRS), numero(item.estoqueSC),
                numero(item.compras), numero(item.op), numero(item[`vendas_${chave}`]),
                numero(item[`consumo_${chave}`]), carteira.quantidade, carteira.valor,
                cobertura, numero(plano.lead), numero(plano.qtdSugerida),
                plano.criticidade === "critico" ? "Crítico" : plano.criticidade === "atencao" ? "Atenção" : "OK",
                numero(item.valorEstoque)
              ]);
            }
          }
        }
      }
    }
    return {escopo, linhas, produtos, colecoes: escopo === "STK" ? colecoes.length : 0, marcas: escopo === "BEIRA RIO" ? marcas.length : 0};
  }

  function filtrarPorCodigos(dados, codigos, estoque) {
    const filtrar = (lista = []) => lista.filter(item => codigos.has(codigo(item)));
    return {...dados, estoque, compras: filtrar(dados.compras), consumo: filtrar(dados.consumo),
      vendas: filtrar(dados.vendas), ordensProducao: filtrar(dados.ordensProducao)};
  }

  // OOXML valido e autocontido. Nao usa CDN ou bibliotecas externas.
  function escaparXml(valor) {
    return String(valor == null ? "" : valor)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  }
  function letra(coluna) {
    let s = "";
    for (let n = coluna; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s;
    return s;
  }
  function celulaXml(valor, posicao, tipo, cabecalho = false) {
    if (valor == null || valor === "") return `<c r="${posicao}" s="${cabecalho ? 1 : 0}"/>`;
    if (tipo !== "text" && typeof valor === "number" && Number.isFinite(valor)) {
      return `<c r="${posicao}" s="${tipo === "money" ? 3 : 2}"><v>${valor}</v></c>`;
    }
    const texto = escaparXml(valor);
    return `<c r="${posicao}" s="${cabecalho ? 1 : 0}" t="inlineStr"><is><t xml:space="preserve">${texto}</t></is></c>`;
  }
  function tabelaXml(nome, colunas, linhas, largura, cabeçalho = true) {
    const xml = [];
    for (let i = 0; i < linhas.length; i++) {
      const r = i + 1;
      xml.push(`<row r="${r}">${linhas[i].map((valor, j) =>
        celulaXml(valor, `${letra(j + 1)}${r}`, i === 0 && cabeçalho ? "text" : colunas[j][1], i === 0 && cabeçalho)).join("")}</row>`);
    }
    const ate = `${letra(colunas.length)}${Math.max(1, linhas.length)}`;
    const cols = colunas.map((col, i) => `<col min="${i+1}" max="${i+1}" width="${col[2]}" customWidth="1"/>`).join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
      + `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`
      + `<dimension ref="A1:${ate}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
      + `<sheetFormatPr defaultRowHeight="16"/><cols>${cols}</cols><sheetData>${xml.join("")}</sheetData>`
      + `<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>`
      + (nome === "Dados" ? `<tableParts count="1"><tablePart r:id="rId1"/></tableParts>` : "")
      + `</worksheet>`;
  }
  function arquivoTabela(quantidade) {
    const ultima = letra(COLUNAS.length);
    const intervalo = `A1:${ultima}${Math.max(2, quantidade + 1)}`;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
      + `<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="1" name="SmartAnaliseComercial" displayName="SmartAnaliseComercial" ref="${intervalo}" totalsRowShown="0">`
      + `<autoFilter ref="${intervalo}"/><tableColumns count="${COLUNAS.length}">`
      + COLUNAS.map((col, i) => `<tableColumn id="${i+1}" name="${escaparXml(col[0])}"/>`).join("")
      + `</tableColumns><tableStyleInfo name="TableStyleMedium2" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/></table>`;
  }
  function estilosXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0.###"/><numFmt numFmtId="165" formatCode="&quot;R$&quot; #,##0.00"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF07356A"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  }

  const encoder = new TextEncoder();
  const tabelaCrc = (function () {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = tabelaCrc[(c ^ bytes[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function zipLocal(nome, data, crc) {
    const name = encoder.encode(nome), bytes = new Uint8Array(30 + name.length);
    const v = new DataView(bytes.buffer);
    v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true);
    v.setUint16(6, 0x0800, true); v.setUint16(8, 0, true);
    v.setUint32(14, crc, true); v.setUint32(18, data.length, true);
    v.setUint32(22, data.length, true); v.setUint16(26, name.length, true);
    bytes.set(name, 30); return bytes;
  }
  function zipCentral(nome, data, crc, offset) {
    const name = encoder.encode(nome), bytes = new Uint8Array(46 + name.length);
    const v = new DataView(bytes.buffer);
    v.setUint32(0, 0x02014b50, true); v.setUint16(4, 20, true);
    v.setUint16(6, 20, true); v.setUint16(8, 0x0800, true);
    v.setUint32(16, crc, true); v.setUint32(20, data.length, true);
    v.setUint32(24, data.length, true); v.setUint16(28, name.length, true);
    v.setUint32(42, offset, true); bytes.set(name, 46); return bytes;
  }
  function criarZip(arquivos) {
    const partes = [], centrais = [];
    let deslocamento = 0, tamanhoCentral = 0;
    for (const [nome, conteudo] of Object.entries(arquivos)) {
      const data = typeof conteudo === "string" ? encoder.encode(conteudo) : conteudo;
      const crc = crc32(data), local = zipLocal(nome, data, crc);
      const central = zipCentral(nome, data, crc, deslocamento);
      partes.push(local, data); centrais.push(central);
      deslocamento += local.length + data.length;
      tamanhoCentral += central.length;
    }
    const fim = new Uint8Array(22), view = new DataView(fim.buffer);
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(8, centrais.length, true); view.setUint16(10, centrais.length, true);
    view.setUint32(12, tamanhoCentral, true); view.setUint32(16, deslocamento, true);
    return new Blob([...partes, ...centrais, fim], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
  }

  function gerarExcel(resultado) {
    const dados = [COLUNAS.map(c => c[0]), ...resultado.linhas];
    const instr = [
      [`SMART GROUP ANALYTICS — EXPORTAÇÃO ${resultado.escopo}`, ""],
      ["Planilha", `Somente produtos ${resultado.escopo}; uma linha por produto e período`],
      ["Origem dos registros", `Todos os produtos de ${resultado.escopo}, inclusive famílias fechadas e filtros não selecionados no painel.`],
      ["Filtro de coleção STK", resultado.escopo === "STK" ? "Use 'Coleção STK (Cód. altern. 1)' para selecionar uma coleção." : "Não se aplica à Beira Rio."],
      ["Filtro de família", "Use 'Família' para localizar famílias específicas."],
      ["Filtro de marca Beira Rio", resultado.escopo === "BEIRA RIO" ? "Use 'Marca Beira Rio' para selecionar uma marca." : "Não se aplica ao STK."],
      ["Filtro do período", "Use 'Período' para selecionar 30 dias, 3 meses, 6 meses ou 12 meses."],
      ["ATENÇÃO: totais", "Escolha um período antes de somar estoques, compras, OP ou carteira: estes saldos aparecem nos 4 períodos."],
      ["Estoque Geral", "Estoque Físico + Compras em Aberto + Ordens de Produção."],
      ["Estoque atual", "O estoque, compras, OP e carteira são saldos atuais; não são saldos históricos de cada período."],
      ["Vendas e Consumo", "Valores apurados nos últimos 30/90/180/365 dias, iguais às janelas do painel."],
      ["Planejamento", "Cobertura, Lead Time, Comprar e Status seguem as funções originais do Dashboard."],
      ["Cobertura sem consumo", "Quando não há consumo nem vendas no período, é exibido '999+ meses', como no painel."],
      ["Códigos unificados", "Uma linha pode representar vários códigos agrupados pelo módulo; veja 'Códigos unificados'."],
      ["Dados", "Exportação feita a partir dos dados carregados no painel; não altera o sistema ou os arquivos originais."],
      [`Produtos ${resultado.escopo} (coleção/marca)`, resultado.produtos],
      ["Linhas exportadas", resultado.linhas.length],
      ["Gerado em", new Date().toLocaleString("pt-BR")]
    ];
    const arquivos = {
      "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/tables/table1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/></Types>`,
      "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="Base Completa" sheetId="1" r:id="rId1"/><sheet name="Orientações" sheetId="2" r:id="rId2"/></sheets></workbook>`,
      "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
      "xl/styles.xml": estilosXml(),
      "xl/worksheets/sheet1.xml": tabelaXml("Dados", COLUNAS, dados),
      "xl/worksheets/_rels/sheet1.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table1.xml"/></Relationships>`,
      "xl/tables/table1.xml": arquivoTabela(resultado.linhas.length),
      "xl/worksheets/sheet2.xml": tabelaXml("Orientações", [["Campo", "text", 32], ["Orientação", "text", 105]], [["Campo", "Orientação"], ...instr])
    };
    return criarZip(arquivos);
  }

  // Insere um botão diferente em cada cabeçalho, sempre junto dos filtros
  // daquela seção. Não interfere na seleção ativa nem no estado do React.
  function obterLocais() {
    const locais = [];
    const pastas = document.querySelectorAll(".sg-source-folder");
    for (const pasta of pastas) {
      const cabecalho = pasta.querySelector(".sg-source-header");
      const titulo = cabecalho && cabecalho.querySelector("h3");
      const escopo = titulo ? normalizar(titulo.textContent).toUpperCase() : "";
      if (escopo !== "STK" && escopo !== "BEIRA RIO") continue;
      const periodo12m = Array.from(cabecalho.querySelectorAll('button[aria-pressed]'))
        .find(botao => normalizar(botao.textContent) === "12 meses");
      if (!periodo12m) continue;
      const grupoPeriodos = periodo12m.parentElement;
      // O botão STK fica após os períodos; o BR fica após o filtro de Marca.
      const inserirApos = escopo === "BEIRA RIO" ?
        (grupoPeriodos.parentElement.lastElementChild || grupoPeriodos) : grupoPeriodos;
      locais.push({escopo, cabecalho, inserirApos});
    }
    return locais;
  }

  async function exportarExcel(botao, escopo) {
    if (botao.disabled) return;
    const textoOriginal = botao.innerHTML;
    botao.disabled = true;
    botao.textContent = "Preparando Excel...";
    try {
      await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
      const estado = window.__SMART_COMERCIAL_EXPORT__;
      const resultado = montarLinhas(estado, escopo);
      if (!resultado.linhas.length) throw new Error(`Nenhum produto ${escopo} foi encontrado para exportar.`);
      const arquivo = gerarExcel(resultado);
      const url = URL.createObjectURL(arquivo);
      const a = document.createElement("a");
      a.href = url;
      const nomeGrupo = escopo === "STK" ? "STK" : "BEIRA_RIO";
      a.download = `Smart_Analise_Comercial_${nomeGrupo}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (erro) {
      console.error(`Falha na exportação ${escopo}:`, erro);
      alert(`Não foi possível exportar o Excel de ${escopo}: ${erro.message}`);
    } finally {
      botao.disabled = false;
      botao.innerHTML = textoOriginal;
    }
  }

  function adicionarBotoes() {
    for (const {escopo, cabecalho, inserirApos} of obterLocais()) {
      const id = escopo === "STK" ? "sg-exportar-comercial-stk" : "sg-exportar-comercial-beira-rio";
      if (cabecalho.querySelector(`#${id}`)) continue;
      const botao = document.createElement("button");
      botao.type = "button";
      botao.id = id;
      botao.className = "sg-exportar-comercial-excel";
      botao.title = `Exportar somente ${escopo}, com todos os produtos e os 4 períodos`;
      botao.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m8 13 8 6m0-6-8 6"/></svg><span>' + (escopo === 'STK' ? 'Exportar STK' : 'Exportar Beira Rio') + '</span>';
      botao.addEventListener("click", e => {e.stopPropagation(); exportarExcel(botao, escopo);});
      inserirApos.insertAdjacentElement("afterend", botao);
    }
  }

  function iniciar() {
    adicionarBotoes();
    const observador = new MutationObserver(() => adicionarBotoes());
    observador.observe(document.getElementById("root") || document.body, {childList: true, subtree: true});
  }
  // Disponivel apenas para testes automatizados sem interagir com a interface.
  window.__SMART_EXCEL_INTERNAL__ = {montarLinhas, gerarExcel, colunas: COLUNAS};
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, {once: true});
  else iniciar();
})();
