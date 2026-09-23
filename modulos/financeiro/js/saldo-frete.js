"use strict";

let freteTodos = [];
let freteFiltrados = [];
let fretePagina = 1;

const FRETE_VAZIO_FILTRO = "__FRETE_VAZIO__";
const freteMultifiltros = {
    status: { id: "freteStatus", opcoes: [], selecionados: new Set(), placeholder: "Buscar status..." },
    empresa: { id: "freteEmpresa", opcoes: [], selecionados: new Set(), placeholder: "Buscar empresa..." },
    destinatario: { id: "freteDestinatario", opcoes: [], selecionados: new Set(), placeholder: "Buscar destinatário..." },
    representante: { id: "freteRepresentante", opcoes: [], selecionados: new Set(), placeholder: "Buscar representante..." }
};

function inicializarSaldoFrete() {
    ["freteBusca", "freteInicio", "freteFim", "fretePorPagina"].forEach(id => {
        const elemento = document.getElementById(id);
        if (!elemento) return;
        elemento.addEventListener(elemento.type === "search" ? "input" : "change", () => {
            fretePagina = 1;
            aplicarFiltrosFrete();
        });
    });

    Object.entries(freteMultifiltros).forEach(([chave, config]) => montarMultifiltroFrete(chave, config));

    document.addEventListener("click", evento => {
        if (!evento.target.closest(".frete-multi")) fecharMultifiltrosFrete();
    });
    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape") fecharMultifiltrosFrete();
    });

    document.getElementById("btnLimparFrete")?.addEventListener("click", limparFiltrosFrete);
    document.getElementById("btnExportarFrete")?.addEventListener("click", exportarFrete);
    document.getElementById("freteAnterior")?.addEventListener("click", () => {
        if (fretePagina > 1) {
            fretePagina--;
            renderizarFrete();
        }
    });
    document.getElementById("freteProxima")?.addEventListener("click", () => {
        if (fretePagina < totalPaginasFrete()) {
            fretePagina++;
            renderizarFrete();
        }
    });

    const botao = document.getElementById("btnCarregarFrete");
    const input = document.getElementById("inputPlanilhaFrete");
    botao?.addEventListener("click", () => input?.click());
    input?.addEventListener("change", async () => {
        const arquivo = input.files?.[0];
        if (!arquivo) return;

        try {
            botao.disabled = true;
            statusFrete("Processando a planilha de fretes...", "");
            freteTodos = await processarPlanilhaFrete(arquivo);
            preencherFiltrosFrete(true);
            fretePagina = 1;
            aplicarFiltrosFrete();
            statusFrete(`${freteTodos.length} registros de frete importados. Valores lidos pelas colunas TOTAL, VALOR PAGO 1, VALOR EM ABERTO e STATUS.`, "sucesso");
        } catch (erro) {
            console.error(erro);
            statusFrete(erro.message || "Não foi possível importar a planilha de fretes.", "erro");
        } finally {
            botao.disabled = false;
            input.value = "";
        }
    });
}

function statusFrete(msg, tipo) {
    const box = document.getElementById("statusImportacaoFrete");
    const txt = document.getElementById("textoStatusFrete");
    if (!box || !txt) return;
    box.hidden = false;
    box.classList.remove("sucesso", "erro");
    if (tipo) box.classList.add(tipo);
    txt.textContent = msg;
}

function normalizarCabFrete(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function acharIndiceFrete(headers, aliases) {
    const normalizados = headers.map(normalizarCabFrete);
    for (const alias of aliases) {
        const indice = normalizados.indexOf(normalizarCabFrete(alias));
        if (indice >= 0) return indice;
    }
    return -1;
}

function valorCelula(linha, indice) {
    return indice >= 0 ? linha[indice] : "";
}

function dataFrete(valor) {
    if (!valor) return null;
    if (valor instanceof Date && !isNaN(valor)) {
        return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
    }
    if (typeof valor === "number") {
        const data = XLSX.SSF.parse_date_code(valor);
        return data ? new Date(data.y, data.m - 1, data.d) : null;
    }

    const texto = String(valor).trim();
    const partes = texto.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
    if (partes) {
        let ano = Number(partes[3]);
        if (ano < 100) ano += 2000;
        return new Date(ano, Number(partes[2]) - 1, Number(partes[1]));
    }

    const data = new Date(texto);
    return isNaN(data) ? null : new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

function numeroFrete(valor) {
    if (typeof valor === "number") return isFinite(valor) ? valor : 0;
    let texto = String(valor ?? "").trim();
    if (!texto) return 0;
    texto = texto.replace(/R\$\s?/g, "").replace(/\s/g, "");
    if (texto.includes(",")) texto = texto.replace(/\./g, "").replace(",", ".");
    return Number(texto) || 0;
}

function statusPlanilhaFrete(valor) {
    const texto = String(valor ?? "").trim();
    return texto ? texto.toUpperCase() : "SEM STATUS";
}

function statusEhPagoFrete(status) {
    return normalizarCabFrete(status) === "pago";
}

function statusEhVencidoFrete(status) {
    const chave = normalizarCabFrete(status);
    return chave === "vencido" || chave === "em atraso" || chave === "atrasado";
}

function statusEhAVencerFrete(status) {
    const chave = normalizarCabFrete(status).replace(/\s+/g, " ");
    return chave === "a vencer" || chave === "avencer";
}

function rotuloStatusFrete(status) {
    if (statusEhPagoFrete(status)) return "Pago";
    if (statusEhVencidoFrete(status)) return "Vencido";
    if (statusEhAVencerFrete(status)) return "A vencer";
    if (normalizarCabFrete(status) === "sem vencimento") return "Sem vencimento";
    return String(status || "Sem status")
        .toLocaleLowerCase("pt-BR")
        .replace(/(^|\s)(\p{L})/gu, (_, espaco, letra) => espaco + letra.toLocaleUpperCase("pt-BR"));
}

function classeStatusFrete(status) {
    if (statusEhPagoFrete(status)) return "pago";
    if (statusEhVencidoFrete(status)) return "atrasado";
    if (statusEhAVencerFrete(status)) return "aberto";
    if (normalizarCabFrete(status) === "sem vencimento") return "sem-vencimento";
    return "neutro";
}

async function processarPlanilhaFrete(arquivo) {
    if (typeof XLSX === "undefined") throw new Error("Biblioteca do Excel não carregada.");

    const workbook = XLSX.read(await arquivo.arrayBuffer(), { type: "array", cellDates: true });
    let escolhido = null;

    for (const nome of workbook.SheetNames) {
        const linhas = XLSX.utils.sheet_to_json(workbook.Sheets[nome], { header: 1, defval: "", raw: true });
        for (let r = 0; r < Math.min(linhas.length, 30); r++) {
            const headers = linhas[r] || [];
            const nota = acharIndiceFrete(headers, ["Nota Fiscal", "NF", "N.F."]);
            const destinatario = acharIndiceFrete(headers, ["Destinatário", "Destinatario", "Cliente"]);
            const total = acharIndiceFrete(headers, ["Total", "Valor Total"]);
            const pago = acharIndiceFrete(headers, ["Valor Pago 1", "Valor Pago"]);
            const aberto = acharIndiceFrete(headers, ["Valor em Aberto", "Em aberto Valor"]);
            const status = acharIndiceFrete(headers, ["Status"]);

            if (nota >= 0 && destinatario >= 0 && total >= 0 && pago >= 0 && aberto >= 0 && status >= 0) {
                const bonusBase = normalizarCabFrete(nome) === "base" ? 100000 : 0;
                const score = bonusBase + linhas.length;
                if (!escolhido || score > escolhido.score) escolhido = { nome, linhas, cab: r, score };
            }
        }
    }

    if (!escolhido) {
        throw new Error('Não encontrei uma aba com as colunas obrigatórias de frete: Nota Fiscal, Destinatário, TOTAL, VALOR PAGO 1, VALOR EM ABERTO e STATUS.');
    }

    const headers = escolhido.linhas[escolhido.cab];
    const idx = {
        empresa: acharIndiceFrete(headers, ["Empresa"]),
        nf: acharIndiceFrete(headers, ["Nota Fiscal", "NF", "N.F."]),
        emissao: acharIndiceFrete(headers, ["Data Emissão", "Data de Emissão", "Emissão", "Emissao"]),
        dest: acharIndiceFrete(headers, ["Destinatário", "Destinatario", "Cliente"]),
        rep: acharIndiceFrete(headers, ["Representante"]),
        desc: acharIndiceFrete(headers, ["Descrição", "Descricao"]),
        total: acharIndiceFrete(headers, ["Total", "Valor Total"]),
        venc: acharIndiceFrete(headers, ["Vencimento"]),
        dataPago1: acharIndiceFrete(headers, ["Data de Pagamento 1", "Data de pagamento", "Data pagto", "Pagamento"]),
        valorPago1: acharIndiceFrete(headers, ["Valor Pago 1", "Valor Pago"]),
        aberto: acharIndiceFrete(headers, ["Valor em Aberto", "Em aberto Valor"]),
        status: acharIndiceFrete(headers, ["Status"]),
        obs: acharIndiceFrete(headers, ["OBS", "Observação", "Observação:"])
    };

    return escolhido.linhas
        .slice(escolhido.cab + 1)
        .map((linha, indiceLinha) => {
            const nota = valorCelula(linha, idx.nf);
            const destinatario = String(valorCelula(linha, idx.dest) || "").trim();
            const valorTotal = numeroFrete(valorCelula(linha, idx.total));
            const valorPago = numeroFrete(valorCelula(linha, idx.valorPago1));
            const valorAberto = numeroFrete(valorCelula(linha, idx.aberto));
            const status = statusPlanilhaFrete(valorCelula(linha, idx.status));

            if (!nota && !destinatario && !valorTotal && !valorPago && !valorAberto) return null;

            return {
                linha: indiceLinha + escolhido.cab + 2,
                origem: escolhido.nome,
                empresa: String(valorCelula(linha, idx.empresa) || "").trim(),
                nota: String(nota || "").trim(),
                emissao: dataFrete(valorCelula(linha, idx.emissao)),
                destinatario,
                representante: String(valorCelula(linha, idx.rep) || "").trim(),
                descricao: String(valorCelula(linha, idx.desc) || "").trim(),
                valorTotal,
                valorPago,
                valorAberto,
                vencimento: dataFrete(valorCelula(linha, idx.venc)),
                pagamento: dataFrete(valorCelula(linha, idx.dataPago1)),
                status,
                observacao: String(valorCelula(linha, idx.obs) || "").trim()
            };
        })
        .filter(Boolean);
}

function valorFiltroFrete(valor) {
    const texto = String(valor ?? "").trim();
    return texto || FRETE_VAZIO_FILTRO;
}

function rotuloValorFiltroFrete(valor, chave) {
    if (valor === FRETE_VAZIO_FILTRO) {
        if (chave === "representante") return "(Sem representante)";
        if (chave === "destinatario") return "(Sem destinatário)";
        if (chave === "empresa") return "(Sem empresa)";
        return "(Sem status)";
    }
    return chave === "status" ? rotuloStatusFrete(valor) : valor;
}

function montarMultifiltroFrete(chave, config) {
    const container = document.getElementById(config.id);
    if (!container) return;

    container.innerHTML = `
        <button type="button" class="frete-multi-trigger" aria-expanded="false">
            <span class="frete-multi-resumo">Todos</span>
            <i class="fa-solid fa-chevron-down"></i>
        </button>
        <div class="frete-multi-menu" hidden>
            <div class="frete-multi-pesquisa">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="search" class="frete-multi-search" placeholder="${escaparHtml(config.placeholder)}" autocomplete="off">
            </div>
            <label class="frete-multi-todos">
                <input type="checkbox" class="frete-multi-check-todos" checked>
                <span>Todos</span>
            </label>
            <div class="frete-multi-opcoes"></div>
        </div>`;

    const trigger = container.querySelector(".frete-multi-trigger");
    const menu = container.querySelector(".frete-multi-menu");
    const pesquisa = container.querySelector(".frete-multi-search");
    const todos = container.querySelector(".frete-multi-check-todos");

    trigger?.addEventListener("click", evento => {
        evento.stopPropagation();
        const vaiAbrir = menu.hidden;
        fecharMultifiltrosFrete(container);
        menu.hidden = !vaiAbrir;
        trigger.setAttribute("aria-expanded", String(vaiAbrir));
        if (vaiAbrir) setTimeout(() => pesquisa?.focus(), 0);
    });

    menu?.addEventListener("click", evento => evento.stopPropagation());

    pesquisa?.addEventListener("input", () => {
        const termo = normalizarCabFrete(pesquisa.value);
        container.querySelectorAll(".frete-multi-opcao").forEach(opcao => {
            opcao.hidden = !!termo && !normalizarCabFrete(opcao.dataset.rotulo || "").includes(termo);
        });
    });

    todos?.addEventListener("change", () => {
        if (todos.checked) {
            config.selecionados = new Set(config.opcoes.map(opcao => opcao.valor));
        } else {
            config.selecionados.clear();
        }
        sincronizarChecksMultifiltroFrete(chave);
        fretePagina = 1;
        aplicarFiltrosFrete();
    });
}

function fecharMultifiltrosFrete(exceto = null) {
    document.querySelectorAll(".frete-multi").forEach(container => {
        if (container === exceto) return;
        const menu = container.querySelector(".frete-multi-menu");
        const trigger = container.querySelector(".frete-multi-trigger");
        if (menu) menu.hidden = true;
        trigger?.setAttribute("aria-expanded", "false");
    });
}

function preencherMultifiltroFrete(chave, valores, resetar = false) {
    const config = freteMultifiltros[chave];
    const container = document.getElementById(config?.id);
    if (!config || !container) return;

    const unicos = new Map();
    valores.forEach(valorOriginal => {
        const valor = valorFiltroFrete(valorOriginal);
        if (!unicos.has(valor)) unicos.set(valor, rotuloValorFiltroFrete(valor, chave));
    });

    config.opcoes = [...unicos.entries()]
        .map(([valor, rotulo]) => ({ valor, rotulo }))
        .sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR", { sensitivity: "base" }));

    const validos = new Set(config.opcoes.map(opcao => opcao.valor));
    config.selecionados = resetar
        ? new Set(validos)
        : new Set([...config.selecionados].filter(valor => validos.has(valor)));

    if (!resetar && config.selecionados.size === 0 && config.opcoes.length) {
        config.selecionados = new Set(validos);
    }

    const lista = container.querySelector(".frete-multi-opcoes");
    if (!lista) return;
    lista.innerHTML = "";

    config.opcoes.forEach(opcao => {
        const label = document.createElement("label");
        label.className = "frete-multi-opcao";
        label.dataset.rotulo = opcao.rotulo;

        const check = document.createElement("input");
        check.type = "checkbox";
        check.value = opcao.valor;
        check.checked = config.selecionados.has(opcao.valor);
        check.addEventListener("change", () => {
            if (check.checked) config.selecionados.add(opcao.valor);
            else config.selecionados.delete(opcao.valor);
            sincronizarChecksMultifiltroFrete(chave);
            fretePagina = 1;
            aplicarFiltrosFrete();
        });

        const texto = document.createElement("span");
        texto.textContent = opcao.rotulo;
        label.append(check, texto);
        lista.appendChild(label);
    });

    sincronizarChecksMultifiltroFrete(chave);
}

function sincronizarChecksMultifiltroFrete(chave) {
    const config = freteMultifiltros[chave];
    const container = document.getElementById(config?.id);
    if (!config || !container) return;

    container.querySelectorAll(".frete-multi-opcao input[type='checkbox']").forEach(check => {
        check.checked = config.selecionados.has(check.value);
    });

    const todos = container.querySelector(".frete-multi-check-todos");
    const quantidadeTotal = config.opcoes.length;
    const quantidadeSelecionada = config.selecionados.size;
    if (todos) {
        todos.checked = quantidadeTotal > 0 && quantidadeSelecionada === quantidadeTotal;
        todos.indeterminate = quantidadeSelecionada > 0 && quantidadeSelecionada < quantidadeTotal;
    }

    const resumo = container.querySelector(".frete-multi-resumo");
    if (resumo) {
        if (!quantidadeTotal || quantidadeSelecionada === quantidadeTotal) resumo.textContent = "Todos";
        else if (quantidadeSelecionada === 0) resumo.textContent = "Nenhum";
        else if (quantidadeSelecionada === 1) {
            const escolhido = config.opcoes.find(opcao => config.selecionados.has(opcao.valor));
            resumo.textContent = escolhido?.rotulo || "1 selecionado";
        } else resumo.textContent = `${quantidadeSelecionada} selecionados`;
    }
}

function preencherFiltrosFrete(resetar = false) {
    preencherMultifiltroFrete("status", freteTodos.map(item => item.status), resetar);
    preencherMultifiltroFrete("empresa", freteTodos.map(item => item.empresa), resetar);
    preencherMultifiltroFrete("destinatario", freteTodos.map(item => item.destinatario), resetar);
    preencherMultifiltroFrete("representante", freteTodos.map(item => item.representante), resetar);
}

function multifiltroAceitaFrete(chave, valorOriginal) {
    const config = freteMultifiltros[chave];
    if (!config || !config.opcoes.length) return true;
    if (config.selecionados.size === config.opcoes.length) return true;
    return config.selecionados.has(valorFiltroFrete(valorOriginal));
}

function aplicarFiltrosFrete() {
    const busca = normalizarTexto(document.getElementById("freteBusca")?.value || "");
    const inicio = lerDataInput("freteInicio");
    const fim = lerDataInput("freteFim");

    freteFiltrados = freteTodos.filter(item => {
        const texto = normalizarTexto([
            item.empresa,
            item.nota,
            item.destinatario,
            item.representante,
            item.descricao,
            item.status,
            item.observacao
        ].join(" "));

        if (busca && !texto.includes(busca)) return false;
        if (!multifiltroAceitaFrete("status", item.status)) return false;
        if (!multifiltroAceitaFrete("empresa", item.empresa)) return false;
        if (!multifiltroAceitaFrete("destinatario", item.destinatario)) return false;
        if (!multifiltroAceitaFrete("representante", item.representante)) return false;
        if (inicio && (!item.vencimento || inicioDoDia(item.vencimento) < inicio)) return false;
        if (fim && (!item.vencimento || inicioDoDia(item.vencimento) > fim)) return false;
        return true;
    });

    freteFiltrados.sort((a, b) => (a.vencimento?.getTime?.() || 0) - (b.vencimento?.getTime?.() || 0));
    atualizarKpisFrete();
    renderizarFrete();
}

function atualizarKpisFrete() {
    const soma = (lista, campo) => lista.reduce((total, item) => total + (Number(item[campo]) || 0), 0);
    const comValorAberto = freteFiltrados.filter(item => item.valorAberto > 0);
    const comValorPago = freteFiltrados.filter(item => item.valorPago > 0);
    const atrasados = freteFiltrados.filter(item => statusEhVencidoFrete(item.status));
    const aVencer = freteFiltrados.filter(item => statusEhAVencerFrete(item.status));

    preencherTexto("freteKpiCarteira", formatarMoeda(soma(freteFiltrados, "valorTotal")));
    preencherTexto("freteKpiAberto", formatarMoeda(soma(freteFiltrados, "valorAberto")));
    preencherTexto("freteKpiAtrasado", formatarMoeda(soma(atrasados, "valorAberto")));
    preencherTexto("freteKpiPago", formatarMoeda(soma(freteFiltrados, "valorPago")));
    preencherTexto("freteKpiVencer", formatarMoeda(soma(aVencer, "valorAberto")));

    [
        ["freteQtdCarteira", freteFiltrados.length],
        ["freteQtdAberto", comValorAberto.length],
        ["freteQtdAtrasado", atrasados.length],
        ["freteQtdPago", comValorPago.length],
        ["freteQtdVencer", aVencer.length]
    ].forEach(([id, quantidade]) => preencherTexto(id, `${quantidade} títulos`));

    preencherTexto("freteResumo", `${freteFiltrados.length} de ${freteTodos.length} registros exibidos`);
}

function totalPaginasFrete() {
    const porPagina = Number(document.getElementById("fretePorPagina")?.value || 25);
    return Math.max(1, Math.ceil(freteFiltrados.length / porPagina));
}

function renderizarFrete() {
    const corpo = document.getElementById("freteTabelaCorpo");
    if (!corpo) return;

    const porPagina = Number(document.getElementById("fretePorPagina")?.value || 25);
    const paginas = totalPaginasFrete();
    fretePagina = Math.min(fretePagina, paginas);
    const itens = freteFiltrados.slice((fretePagina - 1) * porPagina, fretePagina * porPagina);

    corpo.innerHTML = itens.length
        ? itens.map(item => `
            <tr>
                <td>${escaparHtml(item.empresa || "—")}</td>
                <td>${escaparHtml(item.nota || "—")}</td>
                <td>${item.emissao ? formatarDataBR(item.emissao) : "—"}</td>
                <td>${escaparHtml(item.destinatario || "—")}</td>
                <td>${escaparHtml(item.representante || "—")}</td>
                <td>${escaparHtml(item.descricao || "—")}</td>
                <td>${item.vencimento ? formatarDataBR(item.vencimento) : "—"}</td>
                <td>${item.pagamento ? formatarDataBR(item.pagamento) : "—"}</td>
                <td><span class="frete-status ${classeStatusFrete(item.status)}">${escaparHtml(rotuloStatusFrete(item.status))}</span></td>
                <td class="frete-valor">${formatarMoeda(item.valorTotal)}</td>
                <td class="frete-valor ${item.valorPago > 0 ? "pago" : ""}">${formatarMoeda(item.valorPago)}</td>
                <td class="frete-valor ${item.valorAberto > 0 ? "aberto" : "pago"}">${formatarMoeda(item.valorAberto)}</td>
                <td>${escaparHtml(item.observacao || "—")}</td>
            </tr>`).join("")
        : '<tr><td colspan="13" class="frete-vazio">Nenhum registro encontrado.</td></tr>';

    preencherTexto("fretePaginaInfo", `Página ${fretePagina} de ${paginas}`);
    const anterior = document.getElementById("freteAnterior");
    const proxima = document.getElementById("freteProxima");
    if (anterior) anterior.disabled = fretePagina <= 1;
    if (proxima) proxima.disabled = fretePagina >= paginas;
}

function selecionarTodosMultifiltrosFrete() {
    Object.entries(freteMultifiltros).forEach(([chave, config]) => {
        config.selecionados = new Set(config.opcoes.map(opcao => opcao.valor));
        const container = document.getElementById(config.id);
        const pesquisa = container?.querySelector(".frete-multi-search");
        if (pesquisa) pesquisa.value = "";
        container?.querySelectorAll(".frete-multi-opcao").forEach(opcao => { opcao.hidden = false; });
        sincronizarChecksMultifiltroFrete(chave);
    });
}

function limparFiltrosFrete() {
    ["freteBusca", "freteInicio", "freteFim"].forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.value = "";
    });
    selecionarTodosMultifiltrosFrete();
    fecharMultifiltrosFrete();
    fretePagina = 1;
    aplicarFiltrosFrete();
}

function exportarFrete() {
    if (!freteFiltrados.length) {
        alert("Não há registros de frete para exportar.");
        return;
    }

    const linhas = [[
        "Empresa", "Nota Fiscal", "Emissão", "Destinatário", "Representante", "Descrição",
        "Vencimento", "Data de Pagamento 1", "Status", "Valor Total", "Valor Pago 1", "Valor em Aberto", "Observação"
    ], ...freteFiltrados.map(item => [
        item.empresa,
        item.nota,
        item.emissao ? formatarDataBR(item.emissao) : "",
        item.destinatario,
        item.representante,
        item.descricao,
        item.vencimento ? formatarDataBR(item.vencimento) : "",
        item.pagamento ? formatarDataBR(item.pagamento) : "",
        item.status,
        item.valorTotal.toFixed(2).replace(".", ","),
        item.valorPago.toFixed(2).replace(".", ","),
        item.valorAberto.toFixed(2).replace(".", ","),
        item.observacao
    ])];

    const csv = linhas
        .map(linha => linha.map(valor => `"${String(valor ?? "").replace(/"/g, '""')}"`).join(";"))
        .join("\r\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `saldo-frete-${formatarDataISO(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", inicializarSaldoFrete);
