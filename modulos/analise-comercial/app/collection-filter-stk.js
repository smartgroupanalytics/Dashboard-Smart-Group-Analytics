(function () {
  "use strict";

  const STORAGE_KEY = "smart-group-stk-colecoes-selecionadas-v1";
  const EVENTO_COLECOES = "smart-group:stk-colecoes-carregadas";
  const CAMPO_COLECAO = "cod_altern_1";
  const ARQUIVOS_STK = /\/data\/importacao-comercial\/stk\/(estoque|compras|consumo|op|vendas)\.json$/i;
  const FETCH_ORIGINAL = window.fetch.bind(window);

  let colecoesDisponiveis = [];
  let promessaEstoqueCompleto = null;

  function texto(valor) {
    return String(valor == null ? "" : valor).trim();
  }

  function chave(valor) {
    return texto(valor).toLocaleUpperCase("pt-BR");
  }

  function codigoProduto(item) {
    return texto(
      item && (
        item.produto ??
        item.cod_prod ??
        item.codProduto ??
        item.codigo_produto ??
        item.codigo
      )
    );
  }

  function carregarSelecao() {
    try {
      const valor = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(valor) ? valor.map(texto).filter(Boolean) : [];
    } catch (erro) {
      return [];
    }
  }

  function salvarSelecao(valores) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Array.from(new Set(valores.map(texto).filter(Boolean))))
    );
  }

  function selecaoAtual() {
    return carregarSelecao();
  }

  function caminhoDaRequisicao(entrada) {
    try {
      const endereco = entrada instanceof Request ? entrada.url : entrada;
      return new URL(endereco, window.location.href).pathname;
    } catch (erro) {
      return "";
    }
  }

  function atualizarColecoes(linhas) {
    const mapa = new Map();

    (Array.isArray(linhas) ? linhas : []).forEach(function (item) {
      const valor = texto(item && item[CAMPO_COLECAO]);
      if (!valor) return;
      const identificador = chave(valor);
      if (!mapa.has(identificador)) mapa.set(identificador, valor);
    });

    colecoesDisponiveis = Array.from(mapa.values()).sort(function (a, b) {
      return a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" });
    });

    const validas = new Set(colecoesDisponiveis.map(chave));
    const selecaoValida = selecaoAtual().filter(function (item) {
      return validas.has(chave(item));
    });

    if (selecaoValida.length !== selecaoAtual().length) {
      salvarSelecao(selecaoValida);
    }

    window.dispatchEvent(new CustomEvent(EVENTO_COLECOES));
  }

  function respostaJson(resposta, dados) {
    const cabecalhos = new Headers(resposta.headers);
    cabecalhos.set("content-type", "application/json; charset=utf-8");
    cabecalhos.delete("content-length");
    cabecalhos.delete("content-encoding");

    return new Response(JSON.stringify(dados), {
      status: resposta.status,
      statusText: resposta.statusText,
      headers: cabecalhos
    });
  }

  async function lerJsonSeguro(resposta) {
    try {
      const dados = await resposta.clone().json();
      return Array.isArray(dados) ? dados : null;
    } catch (erro) {
      return null;
    }
  }

  window.fetch = async function (entrada, opcoes) {
    const caminho = caminhoDaRequisicao(entrada);
    const correspondencia = caminho.match(ARQUIVOS_STK);

    if (!correspondencia) {
      return FETCH_ORIGINAL(entrada, opcoes);
    }

    const tipo = correspondencia[1].toLowerCase();
    const promessaResposta = FETCH_ORIGINAL(entrada, opcoes);

    if (tipo === "estoque") {
      promessaEstoqueCompleto = promessaResposta.then(lerJsonSeguro);
    }

    const resposta = await promessaResposta;
    if (!resposta.ok) return resposta;

    const linhas = tipo === "estoque"
      ? await promessaEstoqueCompleto
      : await lerJsonSeguro(resposta);

    if (!linhas) return resposta;

    if (tipo === "estoque") atualizarColecoes(linhas);

    const selecionadas = selecaoAtual();
    if (!selecionadas.length) return resposta;

    const chavesSelecionadas = new Set(selecionadas.map(chave));
    const estoqueCompleto = tipo === "estoque"
      ? linhas
      : await promessaEstoqueCompleto;

    if (!Array.isArray(estoqueCompleto)) return resposta;

    const codigosSelecionados = new Set(
      estoqueCompleto
        .filter(function (item) {
          return chavesSelecionadas.has(chave(item && item[CAMPO_COLECAO]));
        })
        .map(codigoProduto)
        .filter(Boolean)
    );

    const filtradas = tipo === "estoque"
      ? linhas.filter(function (item) {
          return chavesSelecionadas.has(chave(item && item[CAMPO_COLECAO]));
        })
      : linhas.filter(function (item) {
          return codigosSelecionados.has(codigoProduto(item));
        });

    return respostaJson(resposta, filtradas);
  };

  function ocultarFiltroAntigo() {
    const campoAntigo = document.getElementById("collection-search");
    if (!campoAntigo) return;
    const blocoAntigo = campoAntigo.closest(".mt-4.mb-6");
    if (blocoAntigo) blocoAntigo.style.display = "none";
  }

  function localizarCabecalhoStk() {
    const pastas = Array.from(document.querySelectorAll(".sg-source-folder"));
    const pastaStk = pastas.find(function (pasta) {
      const titulo = pasta.querySelector("h3");
      return titulo && chave(titulo.textContent) === "STK";
    });

    if (!pastaStk) return null;
    return pastaStk.querySelector(".sg-source-header > .flex.flex-1.items-center");
  }

  function fecharOutrosPaineis(evento) {
    const filtro = document.querySelector(".sg-stk-collection-filter");
    if (!filtro || filtro.contains(evento.target)) return;
    const painel = filtro.querySelector(".sg-stk-collection-panel");
    const botao = filtro.querySelector(".sg-stk-collection-button");
    if (painel) painel.hidden = true;
    if (botao) botao.setAttribute("aria-expanded", "false");
  }

  function criarOpcao(nome, marcado, alterar) {
    const rotulo = document.createElement("label");
    rotulo.className = "sg-stk-collection-option";

    const caixa = document.createElement("input");
    caixa.type = "checkbox";
    caixa.checked = marcado;
    caixa.addEventListener("change", function () {
      alterar(caixa.checked);
    });

    const textoOpcao = document.createElement("span");
    textoOpcao.textContent = nome;

    rotulo.append(caixa, textoOpcao);
    return rotulo;
  }

  function montarPainel(painel) {
    painel.replaceChildren();

    const selecionadas = selecaoAtual();
    const rascunho = new Set(selecionadas.map(chave));

    const titulo = document.createElement("div");
    titulo.className = "sg-stk-collection-panel-title";
    titulo.textContent = "Coleções — Cód. Alternativo";
    painel.appendChild(titulo);

    const opcoes = document.createElement("div");
    opcoes.className = "sg-stk-collection-options";

    const renderizarOpcoes = function () {
      opcoes.replaceChildren();

      opcoes.appendChild(criarOpcao("Todas as coleções", rascunho.size === 0, function (marcado) {
        if (marcado) rascunho.clear();
        renderizarOpcoes();
      }));

      colecoesDisponiveis.forEach(function (colecao) {
        const identificador = chave(colecao);
        opcoes.appendChild(criarOpcao(colecao, rascunho.has(identificador), function (marcado) {
          if (marcado) rascunho.add(identificador);
          else rascunho.delete(identificador);
          renderizarOpcoes();
        }));
      });
    };

    renderizarOpcoes();
    painel.appendChild(opcoes);

    const acoes = document.createElement("div");
    acoes.className = "sg-stk-collection-actions";

    const limpar = document.createElement("button");
    limpar.type = "button";
    limpar.textContent = "Limpar";
    limpar.addEventListener("click", function () {
      rascunho.clear();
      renderizarOpcoes();
    });

    const aplicar = document.createElement("button");
    aplicar.type = "button";
    aplicar.className = "sg-stk-collection-apply";
    aplicar.textContent = "Aplicar";
    aplicar.addEventListener("click", function () {
      const valores = colecoesDisponiveis.filter(function (colecao) {
        return rascunho.has(chave(colecao));
      });
      salvarSelecao(valores);
      window.location.reload();
    });

    acoes.append(limpar, aplicar);
    painel.appendChild(acoes);
  }

  function criarFiltro() {
    const filtro = document.createElement("div");
    filtro.className = "sg-stk-collection-filter";
    filtro.addEventListener("click", function (evento) {
      evento.stopPropagation();
    });

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "sg-stk-collection-button";
    botao.setAttribute("aria-haspopup", "true");
    botao.setAttribute("aria-expanded", "false");

    const selecionadas = selecaoAtual();
    botao.textContent = selecionadas.length === 0
      ? "Coleção: Todas"
      : selecionadas.length === 1
        ? "Coleção: " + selecionadas[0]
        : "Coleções: " + selecionadas.length + " selecionadas";

    const painel = document.createElement("div");
    painel.className = "sg-stk-collection-panel";
    painel.hidden = true;

    botao.addEventListener("click", function () {
      painel.hidden = !painel.hidden;
      botao.setAttribute("aria-expanded", String(!painel.hidden));
      if (!painel.hidden) montarPainel(painel);
    });

    filtro.append(botao, painel);
    return filtro;
  }

  function garantirFiltro() {
    ocultarFiltroAntigo();

    const cabecalho = localizarCabecalhoStk();
    if (!cabecalho || cabecalho.querySelector(".sg-stk-collection-filter")) return;

    const filtro = criarFiltro();
    cabecalho.insertBefore(filtro, cabecalho.firstChild);
  }

  function iniciarInterface() {
    garantirFiltro();

    const observador = new MutationObserver(function () {
      garantirFiltro();
    });
    observador.observe(document.body, { childList: true, subtree: true });

    window.addEventListener(EVENTO_COLECOES, garantirFiltro);
    document.addEventListener("click", fecharOutrosPaineis);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarInterface, { once: true });
  } else {
    iniciarInterface();
  }
})();
