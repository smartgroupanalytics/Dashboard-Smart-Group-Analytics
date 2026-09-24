"use strict";

/* KPIs e indicadores complementares. */

function carregarIndicadoresDemonstrativos() {
    atualizarKPIs([]);
    renderizarDetalhesIndicadorFinanceiro([]);
}

function atualizarDashboardCompleto(dados, dadosCarteira = dados) {
    const dadosDoModo = filtrarDadosModoVisao(dados);
    const carteiraDoModo = filtrarDadosModoVisao(dadosCarteira);
    atualizarKPIs(dadosDoModo, carteiraDoModo);
    renderizarGraficos(dadosDoModo);
    renderizarDetalhesIndicadorFinanceiro(dadosDoModo, carteiraDoModo);
}

function filtrarDadosModoVisao(dados) {
    const lista = Array.isArray(dados) ? dados : [];
    const temDataPagamento = (item) =>
        item?.dataPagamento instanceof Date &&
        !Number.isNaN(item.dataPagamento.getTime());

    // Cenário Realizado = Dt.pgto (coluna O) válida.
    if (modoVisaoGeral === "realizado") {
        return lista.filter(temDataPagamento);
    }

    // Cenário Previsto = sem Dt.pgto válida; usa vencimento nos gráficos.
    if (modoVisaoGeral === "previsto") {
        return lista.filter((item) => !temDataPagamento(item));
    }

    return lista;
}

function clienteEmAbertoIndicador(item) {
    const classificacao = normalizarTexto([
        item.planoFinanceiro, item.tipoDocumento, item.descricaoTipoDocumento
    ].join(" "));
    const temPagamento = item.dataPagamento instanceof Date &&
        !Number.isNaN(item.dataPagamento.getTime());
    return item.tipoCadastro === "cliente" && !temPagamento &&
        !classificacao.includes("adiantamento");
}

function clienteVencidoIndicador(item) {
    return clienteEmAbertoIndicador(item) && Boolean(item.vencimento) &&
        inicioDoDia(item.vencimento) < inicioDoDia(new Date());
}

function atualizarKPIs(dados, dadosCarteira = dados) {
    const clientes = dados.filter((item) => item.tipoCadastro === "cliente");
    const fornecedores = dados.filter((item) => item.tipoCadastro === "fornecedor");
    const clientesPagos = clientes.filter((item) => item.pago);
    const clientesAbertos = dadosCarteira.filter(clienteEmAbertoIndicador);
    const clientesAtrasados = clientesAbertos.filter(clienteVencidoIndicador);
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

    atualizarIndicadoresComplementares(clientes, clientesAbertos);
    for (const id of ["kpiAReceber", "kpiEmAtraso"]) {
        const elemento = document.getElementById(id);
        if (elemento) elemento.title = "Inclui títulos sem banco informado; exclui adiantamentos. Respeita período e demais filtros.";
    }
}

function atualizarIndicadoresComplementares(clientes, clientesCarteira = clientes) {
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

    /*
     * Inadimplência = valor vencido / carteira atual de clientes.
     *
     * Para este indicador, a regra precisa seguir a mesma leitura da aba
     * Contas a Receber:
     * - somente títulos de clientes sem Dt.pgto compõem a carteira em aberto;
     * - vencido = sem Dt.pgto e Vencimento anterior a hoje;
     * - adiantamentos permanecem fora do cálculo.
     *
     * Não usamos item.pago/item.atrasado aqui porque esses campos também
     * consideram Vlr.líq.pago e podem classificar como pago um título cuja
     * Dt.pgto ainda está 00/00/0000.
     */
    const carteiraAberta = clientesCarteira.filter(clienteEmAbertoIndicador);
    const vencidos = carteiraAberta.filter(clienteVencidoIndicador);

    const totalCarteira = somar(carteiraAberta, "valorDocumento");
    const valorAtrasado = somar(vencidos, "valorDocumento");
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

    // Evita mostrar 0,0% quando existe atraso de pequeno valor.
    const percentualFormatado = inadimplencia > 0 && inadimplencia < 0.01
        ? "< 0,01%"
        : `${inadimplencia.toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 2
        })}%`;

    preencherTexto("taxaInadimplencia", percentualFormatado);

    const indicador = document.getElementById("taxaInadimplencia");
    if (indicador) {
        indicador.title = `Vencido: ${formatarMoeda(valorAtrasado)} | ` +
            `Carteira em aberto: ${formatarMoeda(totalCarteira)}. ` +
            "Inclui títulos sem banco informado; respeita os demais filtros e exclui pagamentos e adiantamentos.";
    }
}
