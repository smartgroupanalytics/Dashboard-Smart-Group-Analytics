"use strict";

/* KPIs e indicadores complementares. */

function carregarIndicadoresDemonstrativos() {
    atualizarKPIs([]);
    renderizarDetalhesIndicadorFinanceiro([]);
}

function atualizarDashboardCompleto(dados) {
    atualizarKPIs(dados);
    renderizarGraficos(dados);
    renderizarDetalhesIndicadorFinanceiro(dados);
}

function atualizarKPIs(dados) {
    const clientes = dados.filter((item) => item.tipoCadastro === "cliente");
    const fornecedores = dados.filter((item) => item.tipoCadastro === "fornecedor");
    const clientesPagos = clientes.filter((item) => item.pago);
    const clientesAbertos = clientes.filter((item) => !item.pago);
    const clientesAtrasados = clientes.filter((item) => item.atrasado);
    const fornecedoresPagos = fornecedores.filter((item) => item.pago);
    const fornecedoresAbertos = fornecedores.filter((item) => !item.pago);

    const totalRecebido = somar(clientesPagos, "valorLiquidoPago");
    const aReceber = somar(clientesAbertos, "valorDocumento");
    const emAtraso = somar(clientesAtrasados, "valorDocumento");
    const totalSaidas = somar(fornecedoresPagos, "valorLiquidoPago");
    const aPagar = somar(fornecedoresAbertos, "valorDocumento");

    preencherTexto("kpiTotalRecebido", formatarMoeda(totalRecebido));
    preencherTexto("kpiAReceber", formatarMoeda(aReceber));
    preencherTexto("kpiEmAtraso", formatarMoeda(emAtraso));
    preencherTexto("kpiTotalSaidas", formatarMoeda(totalSaidas));
    preencherTexto("kpiAPagar", formatarMoeda(aPagar));

    preencherTexto("legendaTotalRecebido", `${clientesPagos.length} títulos recebidos`);
    preencherTexto("legendaAReceber", `${clientesAbertos.length} títulos em aberto`);
    preencherTexto("legendaEmAtraso", `${clientesAtrasados.length} títulos vencidos`);
    preencherTexto("legendaTotalSaidas", `${fornecedoresPagos.length} pagamentos realizados`);
    preencherTexto("legendaAPagar", `${fornecedoresAbertos.length} títulos em aberto`);
    if (typeof atualizarSaldoDisponivelGeral === "function") {
        atualizarSaldoDisponivelGeral();
    }

    atualizarIndicadoresComplementares(clientes);
}

function atualizarIndicadoresComplementares(clientes) {
    const pagosComDatas = clientes.filter((item) =>
        item.pago && item.dataPagamento && item.dataMovimento
    );

    const somaDias = pagosComDatas.reduce((total, item) => {
        const dias = Math.max(
            0,
            Math.round((item.dataPagamento - item.dataMovimento) / 86400000)
        );
        return total + dias;
    }, 0);

    const prazoMedio = pagosComDatas.length
        ? somaDias / pagosComDatas.length
        : 0;

    const totalCarteira = somar(clientes, "valorDocumento");
    const valorAtrasado = somar(
        clientes.filter((item) => item.atrasado),
        "valorDocumento"
    );
    const inadimplencia = totalCarteira
        ? (valorAtrasado / totalCarteira) * 100
        : 0;

    preencherTexto(
        "prazoMedioRecebimento",
        `${prazoMedio.toLocaleString("pt-BR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1
        })} dias`
    );

    preencherTexto(
        "taxaInadimplencia",
        `${inadimplencia.toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        })}%`
    );
}
