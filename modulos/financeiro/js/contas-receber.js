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

    const inicioGeral = lerDataInput("periodoInicio");
    const fimGeral = lerDataInput("periodoFim");
    const pessoasSelecionadas =
        typeof filtroPessoas !== "undefined"
            ? filtroPessoas.selecionadas
            : new Set();
    const todasPessoasSelecionadas =
        typeof filtroPessoas !== "undefined" &&
        filtroPessoas.opcoes.length > 0 &&
        pessoasSelecionadas.size === filtroPessoas.opcoes.length;
    const representanteGeral =
        document.getElementById("representante")?.value || "";
    const bancosGerais = typeof bancosSelecionadosNoFiltro === "function"
        ? bancosSelecionadosNoFiltro()
        : new Set();
    const todosBancosGerais = typeof filtroBancos === "undefined" ||
        (filtroBancos.opcoes.length > 0 && bancosGerais.size === filtroBancos.opcoes.length);
    const planoGeral =
        document.getElementById("planoFinanceiro")?.value || "";
    const situacaoGeral =
        document.getElementById("situacao")?.value || "";
    const tipoDocumentoGeral =
        document.getElementById("tipoDocumento")?.value || "";

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
        if (status && item.situacao !== status) return false;
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

        const dataReferenciaGeral =
            item.dataPagamento || item.vencimento || item.dataMovimento;

        if (
            inicioGeral &&
            (!dataReferenciaGeral || dataReferenciaGeral < inicioGeral)
        ) return false;

        if (
            fimGeral &&
            (!dataReferenciaGeral || dataReferenciaGeral > fimGeral)
        ) return false;

        if (
            typeof filtroPessoas !== "undefined" &&
            filtroPessoas.opcoes.length > 0 &&
            !todasPessoasSelecionadas &&
            !pessoasSelecionadas.has(item.razaoSocial)
        ) return false;

        if (
            representanteGeral &&
            item.representante !== representanteGeral
        ) return false;

        if (planoGeral && item.planoFinanceiro !== planoGeral) return false;
        if (situacaoGeral && item.situacao !== situacaoGeral) return false;

        if (
            tipoDocumentoGeral &&
            item.tipoDocumento !== tipoDocumentoGeral
        ) return false;

        if (!todosBancosGerais) {
            const identidade = identificarBanco(item.banco, "");
            if (!bancosGerais.has(identidade.id)) return false;
        }

        return true;
    });

    receberFiltrados.sort((a, b) => {
        const prioridade = {
            atrasado: 0,
            aberto: 1,
            pago: 2
        };

        const diferenca =
            (prioridade[a.situacao] ?? 9) -
            (prioridade[b.situacao] ?? 9);

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

    const pagos = itensContabilizaveis.filter((item) => item.pago);
    const abertos = itensContabilizaveis.filter((item) => !item.pago);
    const atrasados = itensContabilizaveis.filter((item) => item.atrasado);
    const aVencer = abertos.filter((item) => !item.atrasado);

    const totalPago = pagos.reduce(
        (total, item) => total + Number(item.valorLiquidoPago || 0),
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

function ehAdiantamentoReceber(item) {
    const classificacao = normalizarTexto([
        item.planoFinanceiro,
        item.tipoDocumento,
        item.descricaoTipoDocumento
    ].join(" "));

    return classificacao.includes("adiantamento");
}

function saldoAbertoReceber(item) {
    if (item.pago) return 0;

    return Math.max(
        0,
        Number(item.valorDocumento || 0) -
        Number(item.valorLiquidoPago || 0)
    );
}

function diasSituacaoReceber(item) {
    if (!item.vencimento) return "—";

    const referencia = item.pago && item.dataPagamento
        ? inicioDoDia(item.dataPagamento)
        : inicioDoDia(new Date());

    const vencimento = inicioDoDia(item.vencimento);
    const dias = Math.round(
        (referencia - vencimento) / 86400000
    );

    if (item.pago) {
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

            const classe = item.situacao === "pago"
                ? "pago"
                : item.situacao === "atrasado"
                    ? "atrasado"
                    : "aberto";

            const textoStatus = item.situacao === "pago"
                ? "Pago"
                : item.situacao === "atrasado"
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
                    <td class="receber-valor pago">${formatarMoeda(item.valorLiquidoPago || 0)}</td>
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
        item.situacao || "",
        Number(item.valorDocumento || 0).toFixed(2).replace(".", ","),
        Number(item.valorLiquidoPago || 0).toFixed(2).replace(".", ","),
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
