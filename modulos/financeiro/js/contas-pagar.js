"use strict";

let pagarTodos = [];
let pagarFiltrados = [];
let pagarPaginaAtual = 1;

const valorCampo = (id) => document.getElementById(id)?.value || "";
const tipoDoc = (item) => String(
    item.tipoDocumento || item.descricaoTipoDocumento || "Não informado"
).trim();
const localPagar = (item) => item.localCobranca || item.banco || "Não informado";
const saldoPagar = (item) => item.pago ? 0 : Math.max(
    0, Number(item.valorDocumento || 0) - Number(item.valorLiquidoPago || 0)
);

function inicializarContasPagar() {
    [
        "pagarBusca", "pagarStatus", "pagarTipoDocumento",
        "pagarFornecedor", "pagarLocal", "pagarPlano",
        "pagarInicio", "pagarFim", "pagarPorPagina"
    ].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener(
            el.type === "search" ? "input" : "change",
            () => {
                pagarPaginaAtual = 1;
                aplicarFiltrosContasPagar();
            }
        );
    });

    document.getElementById("btnLimparPagar")
        ?.addEventListener("click", limparFiltrosPagar);
    document.getElementById("btnExportarPagar")
        ?.addEventListener("click", exportarPagar);
    document.getElementById("pagarAnterior")
        ?.addEventListener("click", () => {
            if (pagarPaginaAtual > 1) {
                pagarPaginaAtual--;
                renderizarPagar();
            }
        });
    document.getElementById("pagarProxima")
        ?.addEventListener("click", () => {
            if (pagarPaginaAtual < totalPaginasPagar()) {
                pagarPaginaAtual++;
                renderizarPagar();
            }
        });
}

function atualizarContasPagar(lancamentos) {
    pagarTodos = (Array.isArray(lancamentos) ? lancamentos : [])
        .filter((item) => item.tipoCadastro === "fornecedor");

    preencherSelectPagar("pagarTipoDocumento", pagarTodos.map(tipoDoc));
    preencherSelectPagar("pagarFornecedor", pagarTodos.map((x) => x.razaoSocial));
    preencherSelectPagar("pagarLocal", pagarTodos.map(localPagar));
    preencherSelectPagar("pagarPlano", pagarTodos.map((x) => x.planoFinanceiro));

    pagarPaginaAtual = 1;
    aplicarFiltrosContasPagar();
}

function preencherSelectPagar(id, valores) {
    const select = document.getElementById(id);
    if (!select) return;
    const atual = select.value;
    select.innerHTML = '<option value="">Todos</option>';

    [...new Set(valores.map((v) => String(v || "").trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
        .forEach((valor) => {
            const option = document.createElement("option");
            option.value = valor;
            option.textContent = valor;
            select.appendChild(option);
        });

    if ([...select.options].some((o) => o.value === atual)) {
        select.value = atual;
    }
}

function aplicarFiltrosContasPagar() {
    /*
     * pagarTodos contém a base completa de fornecedores. Vencimento inicial/final
     * formam o período-base; Status e os demais campos apenas refinam esse período.
     */
    const busca = normalizarTexto(valorCampo("pagarBusca"));
    const status = valorCampo("pagarStatus");
    const documento = valorCampo("pagarTipoDocumento");
    const fornecedor = valorCampo("pagarFornecedor");
    const local = valorCampo("pagarLocal");
    const plano = valorCampo("pagarPlano");
    const inicio = lerDataInput("pagarInicio");
    const fim = lerDataInput("pagarFim");

    pagarFiltrados = pagarTodos.filter((item) => {
        const texto = normalizarTexto([
            item.razaoSocial, item.nomeFantasia, item.documento,
            item.centroCusto, item.planoFinanceiro, tipoDoc(item)
        ].join(" "));

        if (busca && !texto.includes(busca)) return false;
        if (status && item.situacao !== status) return false;
        if (documento && tipoDoc(item) !== documento) return false;
        if (fornecedor && item.razaoSocial !== fornecedor) return false;
        if (local && localPagar(item) !== local) return false;
        if (plano && item.planoFinanceiro !== plano) return false;
        if (inicio && (!item.vencimento || inicioDoDia(item.vencimento) < inicio)) return false;
        if (fim && (!item.vencimento || inicioDoDia(item.vencimento) > fim)) return false;
        return true;
    });

    pagarFiltrados.sort((a, b) => {
        const ordem = { atrasado: 0, aberto: 1, pago: 2 };
        return ((ordem[a.situacao] ?? 9) - (ordem[b.situacao] ?? 9)) ||
            ((a.vencimento?.getTime?.() || 0) - (b.vencimento?.getTime?.() || 0));
    });

    atualizarKpisPagar();
    renderizarPagar();
}

function atualizarKpisPagar() {
    const pagos = pagarFiltrados.filter((x) => x.pago);
    const abertos = pagarFiltrados.filter((x) => !x.pago);
    const atrasados = pagarFiltrados.filter((x) => x.atrasado);
    const vencer = abertos.filter((x) => !x.atrasado);

    const soma = (lista, fn) => lista.reduce((t, x) => t + fn(x), 0);
    const total = soma(pagarFiltrados, (x) => Number(x.valorDocumento || 0));
    const aberto = soma(abertos, saldoPagar);
    const atraso = soma(atrasados, saldoPagar);
    const pago = soma(pagos, (x) => Number(x.valorLiquidoPago || 0));
    const aVencer = soma(vencer, saldoPagar);

    [
        ["pagarKpiCarteira", total], ["pagarKpiAberto", aberto],
        ["pagarKpiAtrasado", atraso], ["pagarKpiPago", pago],
        ["pagarKpiVencer", aVencer]
    ].forEach(([id, valor]) => preencherTexto(id, formatarMoeda(valor)));

    [
        ["pagarQtdCarteira", pagarFiltrados.length], ["pagarQtdAberto", abertos.length],
        ["pagarQtdAtrasado", atrasados.length], ["pagarQtdPago", pagos.length],
        ["pagarQtdVencer", vencer.length]
    ].forEach(([id, qtd]) => preencherTexto(id, `${qtd} títulos`));

    preencherTexto(
        "pagarResumo",
        `${pagarFiltrados.length} de ${pagarTodos.length} títulos exibidos`
    );
}

function diasPagar(item) {
    if (!item.vencimento) return "—";
    const referencia = item.pago && item.dataPagamento
        ? inicioDoDia(item.dataPagamento) : inicioDoDia(new Date());
    const dias = Math.round((referencia - inicioDoDia(item.vencimento)) / 86400000);

    if (item.pago) {
        if (dias > 0) return `${dias} após venc.`;
        if (dias < 0) return `${Math.abs(dias)} antes`;
        return "No vencimento";
    }
    if (dias > 0) return `${dias} em atraso`;
    if (dias < 0) return `${Math.abs(dias)} a vencer`;
    return "Vence hoje";
}

function totalPaginasPagar() {
    return Math.max(1, Math.ceil(
        pagarFiltrados.length / Number(valorCampo("pagarPorPagina") || 25)
    ));
}

function renderizarPagar() {
    const corpo = document.getElementById("pagarTabelaCorpo");
    if (!corpo) return;

    const porPagina = Number(valorCampo("pagarPorPagina") || 25);
    const paginas = totalPaginasPagar();
    pagarPaginaAtual = Math.min(pagarPaginaAtual, paginas);
    const inicio = (pagarPaginaAtual - 1) * porPagina;
    const itens = pagarFiltrados.slice(inicio, inicio + porPagina);

    corpo.innerHTML = itens.length ? itens.map((item) => {
        const classe = item.pago ? "pago" : item.atrasado ? "atrasado" : "aberto";
        const status = item.pago ? "Pago" : item.atrasado ? "Em atraso" : "Em aberto";
        return `<tr>
            <td><strong>${escaparHtml(item.razaoSocial || "Não informado")}</strong></td>
            <td>${escaparHtml(item.documento || "—")}</td>
            <td>${escaparHtml(tipoDoc(item))}</td>
            <td>${item.vencimento ? formatarDataBR(item.vencimento) : "—"}</td>
            <td>${item.dataPagamento ? formatarDataBR(item.dataPagamento) : "—"}</td>
            <td><span class="pagar-status ${classe}">${status}</span></td>
            <td>${escaparHtml(diasPagar(item))}</td>
            <td class="pagar-valor">${formatarMoeda(item.valorDocumento || 0)}</td>
            <td class="pagar-valor pago">${formatarMoeda(item.valorLiquidoPago || 0)}</td>
            <td class="pagar-valor aberto">${formatarMoeda(saldoPagar(item))}</td>
            <td>${escaparHtml(localPagar(item))}</td>
            <td>${escaparHtml(item.planoFinanceiro || "Não informado")}</td>
        </tr>`;
    }).join("") : '<tr><td colspan="12" class="pagar-vazio">Nenhum título encontrado.</td></tr>';

    preencherTexto("pagarPaginaInfo", `Página ${pagarPaginaAtual} de ${paginas}`);
    const ant = document.getElementById("pagarAnterior");
    const prox = document.getElementById("pagarProxima");
    if (ant) ant.disabled = pagarPaginaAtual <= 1;
    if (prox) prox.disabled = pagarPaginaAtual >= paginas;
}

function limparFiltrosPagar() {
    [
        "pagarBusca", "pagarStatus", "pagarTipoDocumento",
        "pagarFornecedor", "pagarLocal", "pagarPlano",
        "pagarInicio", "pagarFim"
    ].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    pagarPaginaAtual = 1;
    aplicarFiltrosContasPagar();
}

function exportarPagar() {
    if (!pagarFiltrados.length) {
        alert("Não há títulos filtrados para exportar.");
        return;
    }

    const linhas = pagarFiltrados.map((item) => [
        item.razaoSocial || "", item.documento || "", tipoDoc(item),
        item.vencimento ? formatarDataBR(item.vencimento) : "",
        item.dataPagamento ? formatarDataBR(item.dataPagamento) : "",
        item.situacao || "", item.valorDocumento || 0,
        item.valorLiquidoPago || 0, saldoPagar(item),
        localPagar(item), item.planoFinanceiro || ""
    ]);

    const cab = [
        "Fornecedor", "Documento", "Descr.Tp.doc", "Vencimento",
        "Pagamento", "Status", "Valor documento", "Valor pago",
        "Saldo em aberto", "Local de cobrança", "Plano financeiro"
    ];

    const csv = [cab, ...linhas]
        .map((linha) => linha.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"))
        .join("\r\n");

    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], {
        type: "text/csv;charset=utf-8;"
    }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `contas-a-pagar-${formatarDataISO(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", inicializarContasPagar);
