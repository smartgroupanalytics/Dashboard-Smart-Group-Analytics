"use strict";

let receberTodos = [];
let receberFiltrados = [];
let receberPagina = 1;

function inicializarContasReceber() {
    const ids = [
        "receberBusca", "receberStatus", "receberCliente",
        "receberBanco", "receberRepresentante",
        "receberDataInicio", "receberDataFim",
        "receberPorPagina"
    ];

    ids.forEach((id) => {
        const elemento = document.getElementById(id);
        if (!elemento) return;

        const evento = elemento.tagName === "INPUT"
            && elemento.type === "search"
            ? "input"
            : "change";

        elemento.addEventListener(evento, () => {
            receberPagina = 1;
            aplicarFiltrosContasReceber();
        });
    });

    document.getElementById("btnLimparReceber")
        ?.addEventListener("click", limparFiltrosContasReceber);

    document.getElementById("btnExportarReceber")
        ?.addEventListener("click", exportarContasReceber);

    document.getElementById("receberPaginaAnterior")
        ?.addEventListener("click", () => {
            if (receberPagina > 1) {
                receberPagina -= 1;
                renderizarTabelaContasReceber();
            }
        });

    document.getElementById("receberProximaPagina")
        ?.addEventListener("click", () => {
            const totalPaginas = obterTotalPaginasReceber();
            if (receberPagina < totalPaginas) {
                receberPagina += 1;
                renderizarTabelaContasReceber();
            }
        });
}

function atualizarContasReceber(lancamentos) {
    receberTodos = (Array.isArray(lancamentos) ? lancamentos : [])
        .filter((item) => item.tipoCadastro === "cliente");

    preencherSelectReceber(
        "receberCliente",
        receberTodos.map((item) => item.razaoSocial)
    );

    preencherSelectReceber(
        "receberBanco",
        receberTodos.map((item) =>
            item.localCobranca ||
            item.banco ||
            "Não informado"
        )
    );

    preencherSelectReceber(
        "receberRepresentante",
        receberTodos.map((item) => item.representante)
    );

    receberPagina = 1;
    aplicarFiltrosContasReceber();
}

function preencherSelectReceber(id, valores) {
    const select = document.getElementById(id);
    if (!select) return;

    const valorAtual = select.value;
    const primeiro = select.options[0]?.textContent || "Todos";

    select.innerHTML = "";
    const optionTodos = document.createElement("option");
    optionTodos.value = "";
    optionTodos.textContent = primeiro;
    select.appendChild(optionTodos);

    [...new Set(
        valores
            .map((valor) => String(valor || "").trim())
            .filter(Boolean)
    )]
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
        .forEach((valor) => {
            const option = document.createElement("option");
            option.value = valor;
            option.textContent = valor;
            select.appendChild(option);
        });

    if ([...select.options].some((option) => option.value === valorAtual)) {
        select.value = valorAtual;
    }
}

/*
 * Regra exclusiva da aba Contas a Receber:
 * o status é determinado pela Dt.pgto.
 * - Dt.pgto vazia/00/00/0000 => título em aberto (ou em atraso pelo vencimento);
 * - Dt.pgto válida => título pago.
 *
 * Vlr.líq.pago não pode mudar o status sozinho, porque o relatório do SIGER
 * pode trazer valor nessa coluna mesmo sem existir data de pagamento.
 */
function receberEstaPago(item) {
    return Boolean(item?.dataPagamento);
}

function receberEstaAtrasado(item) {
    return !receberEstaPago(item) &&
        Boolean(item?.vencimento) &&
        inicioDoDia(item.vencimento) < inicioDoDia(new Date());
}

function situacaoContasReceber(item) {
    if (receberEstaPago(item)) return "pago";
    if (receberEstaAtrasado(item)) return "atrasado";
    return "aberto";
}

/*
 * No filtro da aba, "Em aberto" significa TODO título sem Dt.pgto,
 * inclusive os vencidos. "Em atraso" continua disponível como um recorte
 * dos títulos em aberto cujo vencimento já passou.
 *
 * Isso faz o filtro "Em aberto" reproduzir exatamente o Excel filtrado por
 * Cliente + Dt.pgto = 00/00/0000.
 */
function correspondeStatusContasReceber(item, status) {
    if (!status) return true;
    if (status === "aberto") return !receberEstaPago(item);
    if (status === "atrasado") return receberEstaAtrasado(item);
    if (status === "pago") return receberEstaPago(item);
    return situacaoContasReceber(item) === status;
}

function aplicarFiltrosContasReceber() {
    const busca = normalizarTexto(
        document.getElementById("receberBusca")?.value || ""
    );

    const status =
        document.getElementById("receberStatus")?.value || "";

    const cliente =
        document.getElementById("receberCliente")?.value || "";

    const banco =
        document.getElementById("receberBanco")?.value || "";

    const representante =
        document.getElementById("receberRepresentante")?.value || "";

    const inicio =
        lerDataInput("receberDataInicio");

    const fim =
        lerDataInput("receberDataFim");

    /*
     * A aba Contas a Receber trabalha sempre sobre a base completa de clientes.
     * Os filtros desta própria aba (principalmente Vencimento inicial/final)
     * definem o período-base. Depois, Status/Cliente/Banco/Representante/Pesquisa
     * refinam somente os títulos desse período.
     *
     * Importante: os filtros gerais do botão "Filtros" não entram aqui. Isso
     * evita que uma seleção feita na Visão Geral esconda títulos que pertencem
     * ao vencimento escolhido nesta aba.
     */

    receberFiltrados = receberTodos.filter((item) => {
        const texto = normalizarTexto([
            item.razaoSocial,
            item.nomeFantasia,
            item.documento,
            item.representante,
            item.planoFinanceiro
        ].join(" "));

        const local =
            item.localCobranca ||
            item.banco ||
            "Não informado";

        if (busca && !texto.includes(busca)) return false;
        if (!correspondeStatusContasReceber(item, status)) return false;
        if (cliente && item.razaoSocial !== cliente) return false;
        if (banco && local !== banco) return false;
        if (
            representante &&
            item.representante !== representante
        ) return false;

        if (
            inicio &&
            (!item.vencimento || inicioDoDia(item.vencimento) < inicio)
        ) return false;

        if (
            fim &&
            (!item.vencimento || inicioDoDia(item.vencimento) > fim)
        ) return false;

        return true;
    });

    receberFiltrados.sort((a, b) => {
        const prioridade = {
            atrasado: 0,
            aberto: 1,
            pago: 2
        };

        const diferenca =
            (prioridade[situacaoContasReceber(a)] ?? 9) -
            (prioridade[situacaoContasReceber(b)] ?? 9);

        if (diferenca !== 0) return diferenca;

        const dataA = a.vencimento?.getTime?.() || 0;
        const dataB = b.vencimento?.getTime?.() || 0;
        return dataA - dataB;
    });

    atualizarKpisContasReceber();
    renderizarTabelaContasReceber();
}

function atualizarKpisContasReceber() {
    const itensContabilizaveis = receberFiltrados.filter(
        (item) => !ehAdiantamentoReceber(item)
    );

    const carteira = itensContabilizaveis.reduce(
        (total, item) => total + Number(item.valorDocumento || 0),
        0
    );

    const pagos = itensContabilizaveis.filter(receberEstaPago);
    const abertos = itensContabilizaveis.filter((item) => !receberEstaPago(item));
    const atrasados = itensContabilizaveis.filter(receberEstaAtrasado);
    const aVencer = abertos.filter((item) => !receberEstaAtrasado(item));

    const totalPago = pagos.reduce(
        (total, item) => total + valorRecebidoContasReceber(item),
        0
    );

    const totalAberto = abertos.reduce(
        (total, item) => total + saldoAbertoReceber(item),
        0
    );

    const totalAtrasado = atrasados.reduce(
        (total, item) => total + saldoAbertoReceber(item),
        0
    );

    const totalVencer = aVencer.reduce(
        (total, item) => total + saldoAbertoReceber(item),
        0
    );

    preencherTexto("receberKpiCarteira", formatarMoeda(carteira));
    preencherTexto("receberKpiAberto", formatarMoeda(totalAberto));
    preencherTexto("receberKpiAtrasado", formatarMoeda(totalAtrasado));
    preencherTexto("receberKpiPago", formatarMoeda(totalPago));
    preencherTexto("receberKpiVencer", formatarMoeda(totalVencer));

    preencherTexto("receberQtdCarteira", `${itensContabilizaveis.length} títulos`);
    preencherTexto("receberQtdAberto", `${abertos.length} títulos`);
    preencherTexto("receberQtdAtrasado", `${atrasados.length} títulos`);
    preencherTexto("receberQtdPago", `${pagos.length} títulos`);
    preencherTexto("receberQtdVencer", `${aVencer.length} títulos`);

    preencherTexto(
        "receberResumoFiltro",
        `${receberFiltrados.length} de ${receberTodos.length} títulos exibidos`
    );
}

/*
 * Regra do valor realizado em Contas a Receber:
 *
 * - somente um título com Dt.pgto válida é considerado recebido;
 * - o valor realizado corresponde a Vlr.docto + Juros - Descontos;
 * - Vlr.líq.pago fica como alternativa apenas para relatórios antigos que
 *   não tragam um valor de documento utilizável.
 *
 * Os adiantamentos continuam fora dos cards, conforme a regra do módulo.
 */
function valorRecebidoContasReceber(item) {
    if (!item?.dataPagamento) return 0;

    const valorDocumento = Number(item.valorDocumento || 0);
    const juros = Number(item.juros || 0);
    const descontos = Number(item.descontos || 0);
    const valorCalculado = valorDocumento + juros - descontos;

    if (valorDocumento > 0 || juros > 0 || descontos > 0) {
        return Math.max(0, valorCalculado);
    }

    return Math.max(0, Number(item.valorLiquidoPago || 0));
}

function ehAdiantamentoReceber(item) {
    const classificacao = normalizarTexto([
        item.planoFinanceiro,
        item.tipoDocumento,
        item.descricaoTipoDocumento
    ].join(" "));

    return classificacao.includes("adiantamento");
}

function saldoAbertoReceber(item) {
    if (receberEstaPago(item)) return 0;

    /*
     * Sem Dt.pgto o título continua integralmente em aberto.
     * Assim, o card "Em aberto" confere com a soma de Vlr.docto no Excel
     * filtrado por Cliente + Dt.pgto = 00/00/0000.
     */
    return Math.max(0, Number(item.valorDocumento || 0));
}

function diasSituacaoReceber(item) {
    if (!item.vencimento) return "—";

    const pago = receberEstaPago(item);
    const referencia = pago && item.dataPagamento
        ? inicioDoDia(item.dataPagamento)
        : inicioDoDia(new Date());

    const vencimento = inicioDoDia(item.vencimento);
    const dias = Math.round(
        (referencia - vencimento) / 86400000
    );

    if (pago) {
        if (dias > 0) return `${dias} após venc.`;
        if (dias < 0) return `${Math.abs(dias)} antes`;
        return "No vencimento";
    }

    if (dias > 0) return `${dias} em atraso`;
    if (dias < 0) return `${Math.abs(dias)} a vencer`;
    return "Vence hoje";
}

function obterTotalPaginasReceber() {
    const porPagina = Number(
        document.getElementById("receberPorPagina")?.value || 25
    );

    return Math.max(
        1,
        Math.ceil(receberFiltrados.length / porPagina)
    );
}

function renderizarTabelaContasReceber() {
    const corpo = document.getElementById("receberTabelaCorpo");
    if (!corpo) return;

    const porPagina = Number(
        document.getElementById("receberPorPagina")?.value || 25
    );

    const totalPaginas = obterTotalPaginasReceber();
    receberPagina = Math.min(receberPagina, totalPaginas);

    const inicio = (receberPagina - 1) * porPagina;
    const pagina = receberFiltrados.slice(inicio, inicio + porPagina);

    if (!pagina.length) {
        corpo.innerHTML = `
            <tr>
                <td colspan="11" class="receber-vazio">
                    Nenhum título encontrado para os filtros selecionados.
                </td>
            </tr>
        `;
    } else {
        corpo.innerHTML = pagina.map((item) => {
            const local =
                item.localCobranca ||
                item.banco ||
                "Não informado";

            const situacao = situacaoContasReceber(item);
            const classe = situacao === "pago"
                ? "pago"
                : situacao === "atrasado"
                    ? "atrasado"
                    : "aberto";

            const textoStatus = situacao === "pago"
                ? "Pago"
                : situacao === "atrasado"
                    ? "Em atraso"
                    : "Em aberto";

            return `
                <tr>
                    <td>
                        <div class="receber-cliente">
                            <strong>${escaparHtml(item.razaoSocial || "Não informado")}</strong>
                            <small>${escaparHtml(item.nomeFantasia || "")}</small>
                        </div>
                    </td>
                    <td>${escaparHtml(item.documento || "—")}</td>
                    <td>${item.vencimento ? formatarDataBR(item.vencimento) : "—"}</td>
                    <td>${item.dataPagamento ? formatarDataBR(item.dataPagamento) : "—"}</td>
                    <td>
                        <span class="receber-status ${classe}">
                            ${textoStatus}
                        </span>
                    </td>
                    <td>${escaparHtml(diasSituacaoReceber(item))}</td>
                    <td class="receber-valor">${formatarMoeda(item.valorDocumento || 0)}</td>
                    <td class="receber-valor pago">${formatarMoeda(valorRecebidoContasReceber(item))}</td>
                    <td class="receber-valor ${saldoAbertoReceber(item) > 0 ? "aberto" : ""}">
                        ${formatarMoeda(saldoAbertoReceber(item))}
                    </td>
                    <td>${escaparHtml(local)}</td>
                    <td>${escaparHtml(item.representante || "Não informado")}</td>
                </tr>
            `;
        }).join("");
    }

    preencherTexto(
        "receberInfoPagina",
        `Página ${receberPagina} de ${totalPaginas}`
    );

    const anterior = document.getElementById("receberPaginaAnterior");
    const proxima = document.getElementById("receberProximaPagina");

    if (anterior) anterior.disabled = receberPagina <= 1;
    if (proxima) proxima.disabled = receberPagina >= totalPaginas;
}

function limparFiltrosContasReceber() {
    [
        "receberBusca", "receberStatus", "receberCliente",
        "receberBanco", "receberRepresentante",
        "receberDataInicio", "receberDataFim"
    ].forEach((id) => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.value = "";
    });

    receberPagina = 1;
    aplicarFiltrosContasReceber();
}

function exportarContasReceber() {
    if (!receberFiltrados.length) {
        alert("Não há títulos filtrados para exportar.");
        return;
    }

    const cabecalho = [
        "Cliente", "Documento", "Vencimento", "Pagamento",
        "Status", "Valor documento", "Valor pago",
        "Saldo em aberto", "Local de cobrança", "Representante"
    ];

    const linhas = receberFiltrados.map((item) => [
        item.razaoSocial || "",
        item.documento || "",
        item.vencimento ? formatarDataBR(item.vencimento) : "",
        item.dataPagamento ? formatarDataBR(item.dataPagamento) : "",
        situacaoContasReceber(item),
        Number(item.valorDocumento || 0).toFixed(2).replace(".", ","),
        valorRecebidoContasReceber(item).toFixed(2).replace(".", ","),
        saldoAbertoReceber(item).toFixed(2).replace(".", ","),
        item.localCobranca || item.banco || "",
        item.representante || ""
    ]);

    const escaparCsv = (valor) =>
        `"${String(valor ?? "").replace(/"/g, '""')}"`;

    const csv = [
        cabecalho,
        ...linhas
    ]
        .map((linha) => linha.map(escaparCsv).join(";"))
        .join("\r\n");

    const blob = new Blob(
        ["\ufeff" + csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contas-a-receber-${formatarDataISO(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", inicializarContasReceber);
