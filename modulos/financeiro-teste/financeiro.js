"use strict";

/*
 * Estado central do módulo Financeiro.
 * Os demais arquivos usam estas variáveis globais.
 */
let bancosFinanceiros = [];
let lancamentosFinanceiros = [];
let lancamentosFiltrados = [];
let detalheKpiAtivo = "inadimplencia";
let modoVisaoGeral = "todos";
const graficosFinanceiros = {};

document.addEventListener("DOMContentLoaded", iniciarModuloFinanceiro);

function iniciarModuloFinanceiro() {
    configurarAbas();
    configurarPainelFiltros();
    configurarPainelBanco();
    configurarExportacao();
    configurarImportacaoPlanilha();
    configurarDetalhesKPIs();
    configurarLimiteTopClientes();
    configurarFiltroCenarioVisao();
    atualizarDataHora();
    carregarIndicadoresDemonstrativos();
    renderizarBancos();
    preencherFiltroBancos();
}

function configurarFiltroCenarioVisao() {
    const botoes = document.querySelectorAll("[data-modo-visao]");
    botoes.forEach((botao) => {
        botao.addEventListener("click", () => {
            modoVisaoGeral = botao.dataset.modoVisao || "todos";
            botoes.forEach((item) => {
                const ativo = item === botao;
                item.classList.toggle("ativo", ativo);
                item.setAttribute("aria-pressed", String(ativo));
            });
            atualizarDashboardCompleto(lancamentosFiltrados);
        });
    });
}

function configurarDetalhesKPIs() {
    const cartoes = document.querySelectorAll("[data-detalhe-kpi]");

    const abrirDetalhes = (cartao) => {
        detalheKpiAtivo = cartao.dataset.detalheKpi || "inadimplencia";

        cartoes.forEach((item) => {
            const ativo = item === cartao;
            item.classList.toggle("ativo", ativo);
            item.setAttribute("aria-pressed", String(ativo));
        });

        renderizarDetalhesIndicadorFinanceiro(filtrarDadosModoVisao(lancamentosFiltrados));

        document.getElementById("detalhesIndicadorFinanceiro")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    cartoes.forEach((cartao) => {
        cartao.addEventListener("click", () => abrirDetalhes(cartao));
        cartao.addEventListener("keydown", (evento) => {
            if (evento.key !== "Enter" && evento.key !== " ") {
                return;
            }

            evento.preventDefault();
            abrirDetalhes(cartao);
        });
    });

    const inicial = document.querySelector(
        `[data-detalhe-kpi="${detalheKpiAtivo}"]`
    );

    if (inicial) {
        inicial.classList.add("ativo");
        inicial.setAttribute("aria-pressed", "true");
    }
}

function configurarLimiteTopClientes() {
    const seletor = document.getElementById("limiteTopClientes");

    if (!seletor) {
        return;
    }

    seletor.addEventListener("change", () => {
        atualizarDashboardCompleto(lancamentosFiltrados);
    });
}

function configurarAbas() {
    const botoesAbas =
        document.querySelectorAll(".aba-financeiro");

    const paginas =
        document.querySelectorAll(".pagina-financeiro");

    botoesAbas.forEach((botao) => {
        botao.addEventListener("click", () => {
            const paginaSelecionada =
                botao.dataset.pagina;

            botoesAbas.forEach((item) => {
                item.classList.remove("ativa");
            });

            paginas.forEach((pagina) => {
                pagina.classList.remove("ativa");
            });

            botao.classList.add("ativa");

            const pagina =
                document.getElementById(paginaSelecionada);

            if (pagina) {
                pagina.classList.add("ativa");
            }
        });
    });
}

function configurarExportacao() {
    const botao =
        document.getElementById("btnExportar");

    if (!botao) {
        return;
    }

    botao.addEventListener("click", () => {
        window.print();
    });
}

function atualizarDataHora() {
    const elemento =
        document.getElementById("dataAtualizacao");

    if (!elemento) {
        return;
    }

    const agora = new Date();

    elemento.textContent =
        agora.toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "short"
        });
}
