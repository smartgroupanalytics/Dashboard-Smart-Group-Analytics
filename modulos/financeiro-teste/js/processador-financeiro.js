"use strict";


function padronizarLocalCobranca(valorOriginal) {
    const original =
        String(valorOriginal || "").trim();

    const nome =
        normalizarTexto(original);

    if (!nome) {
        return "Não informado";
    }

    if (
        nome.includes("sicoob maxi credito") ||
        nome.includes("maxi credito") ||
        nome.includes("maxicredito")
    ) {
        return "Sicoob MaxiCrédito";
    }

    if (
        nome.includes("sicoob vale sul") ||
        nome.includes("vale sul") ||
        nome.includes("vale do sul")
    ) {
        return "Sicoob Vale Sul";
    }

    if (
        nome === "bb" ||
        nome.includes("banco do brasil")
    ) {
        return "Banco do Brasil";
    }

    if (nome.includes("itau")) {
        return "Itaú";
    }

    if (nome.includes("sicredi")) {
        return "Sicredi";
    }

    if (nome.includes("caixa")) {
        return "Caixa Econômica Federal";
    }

    if (nome.includes("bradesco")) {
        return "Bradesco";
    }

    if (nome.includes("santander")) {
        return "Santander";
    }

    if (nome.includes("boleto")) {
        return "Boleto";
    }

    if (nome.includes("carteira")) {
        return "Carteira";
    }

    if (nome.includes("pix")) {
        return "PIX";
    }

    if (
        nome.includes("cartao credito") ||
        nome.includes("cartao de credito")
    ) {
        return "Cartão de Crédito";
    }

    return original;
}

function identificarLocalCobranca(nomeOriginal) {
    const nome =
        normalizarTexto(nomeOriginal);

    if (
        nome.includes("sicoob maxi credito") ||
        nome.includes("maxi credito") ||
        nome.includes("maxicredito")
    ) {
        return {
            id: "sicoob-maxicredito",
            sigla: "SM",
            logo:
                "assets/bancos/sicoob-maxicredito.png",
            cor: "#00535a"
        };
    }

    if (
        nome.includes("sicoob vale sul") ||
        nome.includes("vale sul") ||
        nome.includes("vale do sul")
    ) {
        return {
            id: "sicoob-vale-sul",
            sigla: "SV",
            logo:
                "assets/bancos/sicoob-vale-sul.png",
            cor: "#007f62"
        };
    }

    if (
        nome === "bb" ||
        nome.includes("banco do brasil")
    ) {
        return {
            id: "banco-do-brasil",
            sigla: "BB",
            logo:
                "assets/bancos/banco-do-brasil.png",
            cor: "#f6d000"
        };
    }

    if (nome.includes("itau")) {
        return {
            id: "itau",
            sigla: "IT",
            logo:
                "assets/bancos/itau.png",
            cor: "#ec7000"
        };
    }

    return identificarBanco(
        nomeOriginal,
        ""
    );
}

/* Processamento e padronização dos lançamentos da planilha. */

function localizarCabecalhoFinanceiro(linhas) {
    return linhas.findIndex((linha) => {
        const cabecalho = linha.map(normalizarTexto);
        return cabecalho.includes("razao social") &&
            cabecalho.includes("vlr docto") &&
            cabecalho.includes("vlr liq pago") &&
            cabecalho.includes("descr tp cad");
    });
}

function localizarColunasCompletas(cabecalho) {
    const normalizado = cabecalho.map(normalizarTexto);

    const indice = (...nomes) => {
        for (const nome of nomes) {
            const posicao = normalizado.indexOf(normalizarTexto(nome));
            if (posicao >= 0) return posicao;
        }
        return -1;
    };

    const colunas = {
        empresa: indice("Sig.emp"),
        especie: indice("Esp"),
        sigla: indice("Sigla"),
        codigoPessoa: indice("Cli/for"),
        razaoSocial: indice("Razão social"),
        nomeFantasia: indice("Nome fantasia"),
        documento: indice("Documento"),
        dataMovimento: indice("Dt.movto"),
        parcela: indice("Dsd"),
        tipoDocumento: indice("Descr.Tp.doc", "Tp.doc", "Tp.docto"),
        descricaoTipoDocumento: indice("Descr.Tp.doc", "Tp.docto", "Tp.doc"),
        valorDocumento: indice("Vlr.docto"),
        vencimento: indice("Vencimento"),
        dataPagamento: indice("Dt.pgto"),
        juros: indice("Juros"),
        descontos: indice("Descontos"),
        localCobranca: indice("Desc. Local de Cobrança"),
        dataFluxo: indice("Dt.flx.cx"),
        codigoRepresentante: indice("Cód.repres"),
        representante: indice("Desc. Representante"),
        situacaoCobranca: indice("Desc.sit.cobr"),
        codigoBanco: indice("Cx./cta.corr.ent.adiant./pgto"),
        banco: indice("Desc. Banco"),
        codigoPlano: indice("1° cta.planej.finan"),
        planoFinanceiro: indice("Desc. Conta Planejamento"),
        valorLiquidoPago: indice("Vlr.líq.pago"),
        centroCusto: indice("DES. CENTRO DE CUSTO"),
        historicoFinanceiro: indice("Desc.hist.financ"),
        tipoCadastro: indice("Descr.Tp.cad")
    };

    const obrigatorias = [
        "razaoSocial", "valorDocumento", "vencimento",
        "dataPagamento", "valorLiquidoPago", "tipoCadastro"
    ];

    const ausentes = obrigatorias.filter((chave) => colunas[chave] < 0);
    if (ausentes.length) {
        throw new Error(
            "Colunas obrigatórias não encontradas: " + ausentes.join(", ")
        );
    }

    return colunas;
}

function criarLancamento(linha, colunas, numeroLinha) {
    const valor = (chave) =>
        colunas[chave] >= 0 ? linha[colunas[chave]] : "";

    const tipoOriginal = normalizarTexto(valor("tipoCadastro"));
    let tipoCadastro = "";

    if (tipoOriginal.includes("cliente")) tipoCadastro = "cliente";
    if (tipoOriginal.includes("fornecedor")) tipoCadastro = "fornecedor";
    if (!tipoCadastro) return null;

    const dataPagamentoOriginal = valor("dataPagamento");
    const dataPagamentoEmAberto = dataFinanceiraSemData(dataPagamentoOriginal);
    const dataPagamento = dataPagamentoEmAberto
        ? null
        : converterDataExcel(dataPagamentoOriginal);
    const vencimento = converterDataExcel(valor("vencimento"));
    const dataMovimento = converterDataExcel(valor("dataMovimento"));
    const dataFluxo = converterDataExcel(valor("dataFluxo"));

    const valorDocumento = Math.abs(converterNumeroFinanceiro(valor("valorDocumento")));
    const valorLiquidoPago = Math.abs(converterNumeroFinanceiro(valor("valorLiquidoPago")));
    const juros = Math.abs(converterNumeroFinanceiro(valor("juros")));
    const descontos = Math.abs(converterNumeroFinanceiro(valor("descontos")));

    const pago = Boolean(dataPagamento) || valorLiquidoPago > 0;
    const hoje = inicioDoDia(new Date());
    const atrasado = !pago && vencimento && inicioDoDia(vencimento) < hoje;

    return {
        id: `linha-${numeroLinha}`,
        numeroLinha,
        empresa: String(valor("empresa") || "").trim(),
        especie: String(valor("especie") || "").trim(),
        sigla: String(valor("sigla") || "").trim(),
        codigoPessoa: String(valor("codigoPessoa") || "").trim(),
        razaoSocial: String(valor("razaoSocial") || "Não informado").trim(),
        nomeFantasia: String(valor("nomeFantasia") || "").trim(),
        documento: String(valor("documento") || "").trim(),
        parcela: String(valor("parcela") || "").trim(),
        tipoDocumento: String(valor("tipoDocumento") || "").trim(),
        descricaoTipoDocumento: String(valor("descricaoTipoDocumento") || "").trim(),
        dataMovimento,
        vencimento,
        dataPagamento,
        /*
         * Regra específica do Fluxo de Caixa:
         * Dt.pgto vazio ou 00/00/0000 significa título em aberto, mesmo que
         * Vlr.líq.pago tenha algum valor no relatório.
         */
        dataPagamentoEmAberto,
        dataPagamentoOriginal: String(dataPagamentoOriginal ?? "").trim(),
        dataFluxo,
        valorDocumento,
        valorLiquidoPago,
        juros,
        descontos,
        /*
         * Fonte oficial dos recebimentos por instituição:
         * Desc. Local de Cobrança.
         *
         * Desc. Banco fica apenas preservada para auditoria,
         * sem participar dos agrupamentos e cálculos.
         */
        localCobranca:
            String(
                valor("localCobranca") ||
                ""
            ).trim(),

        bancoOriginal:
            String(
                valor("banco") ||
                ""
            ).trim(),

        banco:
            padronizarLocalCobranca(
                valor("localCobranca")
            ),

        codigoBanco:
            String(
                valor("codigoBanco") ||
                ""
            ).trim(),
        representante: String(
            valor("representante") ||
            valor("codigoRepresentante") ||
            "Não informado"
        ).trim(),
        codigoRepresentante: String(valor("codigoRepresentante") || "").trim(),
        planoFinanceiro: String(
            valor("planoFinanceiro") ||
            valor("historicoFinanceiro") ||
            "Não informado"
        ).trim(),
        historicoFinanceiro: String(valor("historicoFinanceiro") || "").trim(),
        centroCusto: String(valor("centroCusto") || "").trim(),
        situacaoCobranca: String(valor("situacaoCobranca") || "").trim(),
        tipoCadastro,
        pago,
        atrasado,
        situacao: pago ? "pago" : atrasado ? "atrasado" : "aberto"
    };
}

function agruparBancosDosLancamentos(lancamentos) {
    const mapa = new Map();

    lancamentos.forEach((item) => {
        if (normalizarTexto(item.banco) === "nao informado") return;

        const chave = normalizarTexto(item.banco);
        if (!mapa.has(chave)) {
            const identidade = identificarLocalCobranca(item.banco);
            mapa.set(chave, {
                id: identidade.id,
                nome: item.banco,
                saldo: 0,
                totalRecebido: 0,
                totalPago: 0,
                emAberto: 0,
                emAtraso: 0,
                logo: identidade.logo,
                sigla: identidade.sigla,
                cor: identidade.cor
            });
        }

        const banco = mapa.get(chave);

        if (item.tipoCadastro === "cliente") {
            if (item.pago) banco.totalRecebido += item.valorLiquidoPago;
            if (!item.pago) banco.emAberto += item.valorDocumento;
            if (item.atrasado) banco.emAtraso += item.valorDocumento;
        } else if (item.tipoCadastro === "fornecedor" && item.pago) {
            banco.totalPago += item.valorLiquidoPago;
        }

        banco.saldo = banco.totalRecebido - banco.totalPago;
    });

    return [...mapa.values()].sort(
        (a, b) => Math.abs(b.saldo) - Math.abs(a.saldo)
    );
}

