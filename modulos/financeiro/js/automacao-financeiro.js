"use strict";

/*
 * Automação independente das duas fontes do módulo Financeiro.
 *
 * - data/financeiro.xlsx alimenta Visão Geral, Contas a Receber,
 *   Contas a Pagar, Fluxo de Caixa e Bancos.
 * - data/fretes.xlsx alimenta somente Saldo Frete.
 * - data/status-atualizacao.json informa o estado de cada fonte.
 *
 * Se uma atualização falhar no GitHub Actions, o XLSX válido anterior
 * permanece no repositório. O dashboard carrega essa base anterior e exibe
 * o aviso de falha correspondente.
 */

const AUTOMACAO_FINANCEIRO = Object.freeze({
    status: "data/status-atualizacao.json",
    versao: "data/_version.json",
    financeiro: "data/financeiro.xlsx",
    fretes: "data/fretes.xlsx"
});

function urlSemCache(caminho, versao = "") {
    const separador = caminho.includes("?") ? "&" : "?";
    const chave = versao || Date.now();
    return `${caminho}${separador}v=${encodeURIComponent(chave)}`;
}

async function buscarRecursoFinanceiro(caminho, versao = "") {
    const resposta = await fetch(urlSemCache(caminho, versao), {
        cache: "no-store"
    });

    if (!resposta.ok) {
        throw new Error(`HTTP ${resposta.status} ao carregar ${caminho}.`);
    }

    return resposta;
}

function dataHoraFonte(valor) {
    if (!valor) return "--";

    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "--";

    return data.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
    });
}

function elementoStatusFonte(chave) {
    return document.getElementById(
        chave === "fretes" ? "statusAutoFretes" : "statusAutoFinanceiro"
    );
}

function definirStatusFonte(chave, texto, classe, titulo = "") {
    const elemento = elementoStatusFonte(chave);
    if (!elemento) return;

    elemento.classList.remove("sucesso", "erro", "aguardando");
    elemento.classList.add(classe || "aguardando");
    elemento.textContent = texto;
    elemento.title = titulo || texto;
}

function renderizarStatusFonte(chave, meta) {
    const status = String(meta?.status || "").toUpperCase();
    const ultimoSucesso = meta?.ultimoSucessoEm || meta?.atualizadoEm || null;
    const quando = dataHoraFonte(ultimoSucesso);

    if (["OK", "ATRASADO"].includes(status)) {
        definirStatusFonte(
            chave,
            `✅ Atualizado em ${quando}`,
            "sucesso",
            meta?.mensagem || "Última base válida carregada automaticamente."
        );
        return;
    }

    if (["ERRO", "AUSENTE", "INVALIDO"].includes(status)) {
        const complemento = quando !== "--"
            ? ` Último sucesso: ${quando}.`
            : "";

        definirStatusFonte(
            chave,
            "⚠️ Falha na atualização — mantendo dados anteriores",
            "erro",
            `${meta?.mensagem || "A fonte automática apresentou erro."}${complemento}`
        );
        return;
    }

    definirStatusFonte(
        chave,
        "⏳ Aguardando primeira atualização automática",
        "aguardando",
        meta?.mensagem || "A automação ainda não registrou uma atualização."
    );
}

function aplicarResultadoFinanceiroAutomatico(resultado) {
    lancamentosFinanceiros = resultado.lancamentos;
    bancosFinanceiros = resultado.bancos;

    if (typeof atualizarContasReceber === "function") {
        atualizarContasReceber(lancamentosFinanceiros);
    }

    if (typeof atualizarContasPagar === "function") {
        atualizarContasPagar(lancamentosFinanceiros);
    }

    if (typeof atualizarFluxoCaixa === "function") {
        atualizarFluxoCaixa(
            lancamentosFinanceiros,
            { redefinirPeriodo: true }
        );
    }

    if (typeof preencherFiltrosComDados === "function") {
        preencherFiltrosComDados();
    }

    if (typeof preencherFiltroBancos === "function") {
        preencherFiltroBancos(true);
    }

    if (typeof renderizarBancos === "function") {
        renderizarBancos();
    }

    if (typeof aplicarFiltrosDashboard === "function") {
        aplicarFiltrosDashboard();
    }

    atualizarStatusImportacao(
        `${resultado.quantidadeRegistros} registros automáticos carregados: ` +
        `${resultado.quantidadeClientes} de clientes e ` +
        `${resultado.quantidadeFornecedores} de fornecedores.`,
        "sucesso"
    );
}

function aplicarResultadoFretesAutomatico(registros) {
    freteTodos = registros;
    preencherFiltrosFrete(true);
    fretePagina = 1;
    aplicarFiltrosFrete();

    statusFrete(
        `${freteTodos.length} registros automáticos de frete carregados. ` +
        "Valores lidos pelas colunas TOTAL, VALOR PAGO 1, VALOR EM ABERTO e STATUS.",
        "sucesso"
    );
}

async function carregarBaseFinanceiroAutomatica(versao) {
    const resposta = await buscarRecursoFinanceiro(
        AUTOMACAO_FINANCEIRO.financeiro,
        versao
    );

    const blob = await resposta.blob();
    const resultado = await processarPlanilhaFinanceira(blob);
    aplicarResultadoFinanceiroAutomatico(resultado);
    return resultado;
}

async function carregarBaseFretesAutomatica(versao) {
    const resposta = await buscarRecursoFinanceiro(
        AUTOMACAO_FINANCEIRO.fretes,
        versao
    );

    const blob = await resposta.blob();
    const registros = await processarPlanilhaFrete(blob);
    aplicarResultadoFretesAutomatico(registros);
    return registros;
}

async function carregarDadosAutomaticosFinanceiro() {
    let status = { fontes: {} };
    let versao = "";

    try {
        const respostaVersao = await buscarRecursoFinanceiro(
            AUTOMACAO_FINANCEIRO.versao
        );
        const dadosVersao = await respostaVersao.json();
        versao = dadosVersao?.updatedAt || "";
    } catch (erro) {
        console.warn("Não foi possível ler a versão automática do Financeiro:", erro);
    }

    try {
        const respostaStatus = await buscarRecursoFinanceiro(
            AUTOMACAO_FINANCEIRO.status,
            versao
        );
        status = await respostaStatus.json();
    } catch (erro) {
        console.warn("Não foi possível ler o status da automação financeira:", erro);
        definirStatusFonte(
            "financeiro",
            "⚠️ Status automático indisponível — tentando base anterior",
            "erro"
        );
        definirStatusFonte(
            "fretes",
            "⚠️ Status automático indisponível — tentando base anterior",
            "erro"
        );
    }

    if (status?.fontes?.financeiro) {
        renderizarStatusFonte("financeiro", status.fontes.financeiro);
    }

    if (status?.fontes?.fretes) {
        renderizarStatusFonte("fretes", status.fontes.fretes);
    }

    const resultados = await Promise.allSettled([
        carregarBaseFinanceiroAutomatica(versao),
        carregarBaseFretesAutomatica(versao)
    ]);

    if (resultados[0].status === "rejected") {
        console.error("Falha ao carregar a base automática Financeiro:", resultados[0].reason);
        definirStatusFonte(
            "financeiro",
            "⚠️ Não foi possível carregar a base anterior",
            "erro",
            resultados[0].reason?.message || String(resultados[0].reason || "Erro ao carregar base.")
        );
    }

    if (resultados[1].status === "rejected") {
        console.error("Falha ao carregar a base automática de Fretes:", resultados[1].reason);
        definirStatusFonte(
            "fretes",
            "⚠️ Não foi possível carregar a base anterior",
            "erro",
            resultados[1].reason?.message || String(resultados[1].reason || "Erro ao carregar base.")
        );
    }

    if (typeof atualizarDataHora === "function") {
        atualizarDataHora();
    }
}

function registrarStatusFonteSessao(chave) {
    definirStatusFonte(
        chave,
        `✅ Carregado manualmente em ${new Date().toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "short"
        })}`,
        "sucesso",
        "Importação manual válida apenas para esta sessão do navegador."
    );
}

window.carregarDadosAutomaticosFinanceiro = carregarDadosAutomaticosFinanceiro;
window.registrarStatusFonteSessao = registrarStatusFonteSessao;
