"use strict";

let fluxoLancamentos = [];
let fluxoMovimentacoes = [];
let fluxoFiltrado = [];
let fluxoPaginaAtual = 1;
let graficoFluxoDetalhado = null;

function inicializarFluxoCaixa() {
    [
        "fluxoVisao",
        "fluxoCenario",
        "fluxoDataInicio",
        "fluxoDataFim",
        "fluxoTipo",
        "fluxoLocal",
        "fluxoPorPagina"
    ].forEach((id) => {
        document.getElementById(id)
            ?.addEventListener("change", () => {
                fluxoPaginaAtual = 1;
                aplicarFiltrosFluxoCaixa();
            });
    });

    document.getElementById("btnLimparFluxo")
        ?.addEventListener(
            "click",
            limparFiltrosFluxoCaixa
        );

    document.getElementById("btnExportarFluxo")
        ?.addEventListener(
            "click",
            exportarFluxoCaixa
        );

    document.getElementById("fluxoPaginaAnterior")
        ?.addEventListener("click", () => {
            if (fluxoPaginaAtual > 1) {
                fluxoPaginaAtual -= 1;
                renderizarTabelaFluxo();
            }
        });

    document.getElementById("fluxoProximaPagina")
        ?.addEventListener("click", () => {
            if (
                fluxoPaginaAtual <
                obterTotalPaginasFluxo()
            ) {
                fluxoPaginaAtual += 1;
                renderizarTabelaFluxo();
            }
        });
}

function atualizarFluxoCaixa(lancamentos) {
    fluxoLancamentos =
        Array.isArray(lancamentos)
            ? lancamentos
            : [];

    fluxoMovimentacoes =
        fluxoLancamentos
            .flatMap(criarMovimentacoesFluxo)
            .filter(Boolean);

    preencherLocaisFluxo();

    definirPeriodoInicialFluxo();

    fluxoPaginaAtual = 1;
    aplicarFiltrosFluxoCaixa();
}

function criarMovimentacoesFluxo(item) {
    const tipo =
        item.tipoCadastro === "cliente"
            ? "entrada"
            : item.tipoCadastro === "fornecedor"
                ? "saida"
                : "";

    if (!tipo) {
        return [];
    }

    const valorDocumento =
        Math.max(
            0,
            Number(item.valorDocumento || 0)
        );

    const valorPagoInformado =
        Math.max(
            0,
            Number(item.valorLiquidoPago || 0)
        );

    /*
     * REGRA OFICIAL DO FLUXO DE CAIXA:
     *
     * Dt.pgto preenchida  -> REALIZADO
     * Dt.pgto em branco   -> PREVISTO
     *
     * A classificação do cenário NÃO depende mais de `pago` nem de
     * Vlr.líq.pago. Assim, todo título de CLIENTE sem Dt.pgto alimenta
     * "Entradas previstas" e todo título de FORNECEDOR sem Dt.pgto
     * alimenta "Saídas previstas".
     */
    const temDataPagamento =
        item.dataPagamento instanceof Date;

    /*
     * O valor realizado prioriza Vlr.líq.pago. Se o relatório tiver a
     * Dt.pgto preenchida mas não trouxer o líquido, usa Vlr.docto.
     */
    const valorRealizado =
        temDataPagamento
            ? Number(
                valorPagoInformado ||
                valorDocumento
            )
            : 0;

    /*
     * Para títulos em aberto (Dt.pgto em branco), o previsto é o valor
     * integral do documento. Isso segue exatamente a regra solicitada:
     * a ausência da data de pagamento é o que define o título em aberto.
     */
    const valorPrevisto =
        !temDataPagamento
            ? valorDocumento
            : 0;

    /*
     * A data que posiciona o previsto no gráfico continua sendo Dt.flx.cx;
     * quando ela não existir, usamos o Vencimento como alternativa.
     */
    const dataPrevista =
        item.dataFluxo instanceof Date
            ? item.dataFluxo
            : item.vencimento;

    const movimentos = [];

    if (
        temDataPagamento &&
        valorRealizado > 0
    ) {
        movimentos.push(
            montarMovimentacaoFluxo(
                item,
                tipo,
                "realizado",
                item.dataPagamento,
                valorRealizado,
                `${item.id || "linha"}-realizado`
            )
        );
    }

    if (
        !temDataPagamento &&
        dataPrevista instanceof Date &&
        valorPrevisto > 0
    ) {
        movimentos.push(
            montarMovimentacaoFluxo(
                item,
                tipo,
                "previsto",
                dataPrevista,
                valorPrevisto,
                `${item.id || "linha"}-previsto`
            )
        );
    }

    return movimentos;
}

function montarMovimentacaoFluxo(
    item,
    tipo,
    cenario,
    data,
    valor,
    id
) {
    return {
        id,
        idLancamento: item.id,
        data,
        cenario,
        tipo,
        valor,
        impacto:
            tipo === "entrada"
                ? valor
                : -valor,
        razaoSocial:
            item.razaoSocial ||
            "Não informado",
        documento:
            item.documento || "",
        vencimento:
            item.vencimento,
        dataFluxo:
            item.dataFluxo,
        dataPagamento:
            item.dataPagamento,
        local:
            item.localCobranca ||
            item.banco ||
            "Não informado",
        planoFinanceiro:
            item.planoFinanceiro ||
            "Não informado",
        tipoDocumento:
            item.tipoDocumento ||
            item.descricaoTipoDocumento ||
            "",
        situacao:
            cenario === "previsto"
                ? (item.atrasado ? "atrasado" : "aberto")
                : item.situacao
    };
}

function preencherLocaisFluxo() {
    const select =
        document.getElementById(
            "fluxoLocal"
        );

    if (!select) {
        return;
    }

    const atual = select.value;

    const locais =
        [...new Set(
            fluxoMovimentacoes
                .map(
                    (item) =>
                        String(
                            item.local ||
                            ""
                        ).trim()
                )
                .filter(Boolean)
        )]
            .sort(
                (a, b) =>
                    a.localeCompare(
                        b,
                        "pt-BR"
                    )
            );

    select.innerHTML =
        '<option value="">Todos</option>';

    locais.forEach((local) => {
        const option =
            document.createElement(
                "option"
            );

        option.value = local;
        option.textContent = local;
        select.appendChild(option);
    });

    if (
        [...select.options].some(
            (option) =>
                option.value === atual
        )
    ) {
        select.value = atual;
    }
}

function definirPeriodoInicialFluxo() {
    if (!fluxoMovimentacoes.length) {
        return;
    }

    const inicioInput =
        document.getElementById(
            "fluxoDataInicio"
        );

    const fimInput =
        document.getElementById(
            "fluxoDataFim"
        );

    if (
        inicioInput?.value ||
        fimInput?.value
    ) {
        return;
    }

    const datas =
        fluxoMovimentacoes
            .map((item) => item.data)
            .filter(
                (data) =>
                    data instanceof Date
            )
            .sort((a, b) => a - b);

    if (!datas.length) {
        return;
    }

    if (inicioInput) {
        inicioInput.value =
            formatarDataISO(datas[0]);
    }

    if (fimInput) {
        fimInput.value =
            formatarDataISO(
                datas[datas.length - 1]
            );
    }
}

function aplicarFiltrosFluxoCaixa() {
    const cenario =
        document.getElementById(
            "fluxoCenario"
        )?.value ||
        "consolidado";

    const tipo =
        document.getElementById(
            "fluxoTipo"
        )?.value || "";

    const local =
        document.getElementById(
            "fluxoLocal"
        )?.value || "";

    const inicio =
        lerDataInput(
            "fluxoDataInicio"
        );

    const fim =
        lerDataInput(
            "fluxoDataFim"
        );

    fluxoFiltrado =
        fluxoMovimentacoes.filter(
            (item) => {
                if (
                    cenario !==
                        "consolidado" &&
                    item.cenario !==
                        cenario
                ) {
                    return false;
                }

                if (
                    tipo &&
                    item.tipo !== tipo
                ) {
                    return false;
                }

                if (
                    local &&
                    item.local !== local
                ) {
                    return false;
                }

                const data =
                    inicioDoDia(
                        item.data
                    );

                if (
                    inicio &&
                    data < inicio
                ) {
                    return false;
                }

                if (
                    fim &&
                    data > fim
                ) {
                    return false;
                }

                return true;
            }
        );

    fluxoFiltrado.sort(
        (a, b) =>
            a.data - b.data ||
            a.razaoSocial.localeCompare(
                b.razaoSocial,
                "pt-BR"
            )
    );

    atualizarKpisFluxo();
    renderizarGraficoFluxo();
    renderizarTabelaFluxo();
}

function atualizarKpisFluxo() {
    const realizadasEntradas =
        fluxoFiltrado.filter(
            (item) =>
                item.cenario ===
                    "realizado" &&
                item.tipo ===
                    "entrada"
        );

    const realizadasSaidas =
        fluxoFiltrado.filter(
            (item) =>
                item.cenario ===
                    "realizado" &&
                item.tipo ===
                    "saida"
        );

    const previstasEntradas =
        fluxoFiltrado.filter(
            (item) =>
                item.cenario ===
                    "previsto" &&
                item.tipo ===
                    "entrada"
        );

    const previstasSaidas =
        fluxoFiltrado.filter(
            (item) =>
                item.cenario ===
                    "previsto" &&
                item.tipo ===
                    "saida"
        );

    const somar =
        (lista) =>
            lista.reduce(
                (total, item) =>
                    total +
                    Number(
                        item.valor || 0
                    ),
                0
            );

    const entradaRealizada =
        somar(realizadasEntradas);

    const saidaRealizada =
        somar(realizadasSaidas);

    const entradaPrevista =
        somar(previstasEntradas);

    const saidaPrevista =
        somar(previstasSaidas);

    const saldoRealizado =
        entradaRealizada -
        saidaRealizada;

    const saldoProjetado =
        saldoRealizado +
        entradaPrevista -
        saidaPrevista;

    preencherTexto(
        "fluxoEntradasRealizadas",
        formatarMoeda(
            entradaRealizada
        )
    );

    preencherTexto(
        "fluxoSaidasRealizadas",
        formatarMoeda(
            saidaRealizada
        )
    );

    preencherTexto(
        "fluxoSaldoRealizado",
        formatarMoeda(
            saldoRealizado
        )
    );

    preencherTexto(
        "fluxoEntradasPrevistas",
        formatarMoeda(
            entradaPrevista
        )
    );

    preencherTexto(
        "fluxoSaidasPrevistas",
        formatarMoeda(
            saidaPrevista
        )
    );

    preencherTexto(
        "fluxoSaldoProjetado",
        formatarMoeda(
            saldoProjetado
        )
    );

    preencherTexto(
        "fluxoQtdEntradasRealizadas",
        `${realizadasEntradas.length} movimentações`
    );

    preencherTexto(
        "fluxoQtdSaidasRealizadas",
        `${realizadasSaidas.length} movimentações`
    );

    preencherTexto(
        "fluxoQtdEntradasPrevistas",
        `${previstasEntradas.length} títulos`
    );

    preencherTexto(
        "fluxoQtdSaidasPrevistas",
        `${previstasSaidas.length} títulos`
    );

    atualizarClasseSaldo(
        "fluxoSaldoRealizado",
        saldoRealizado
    );

    atualizarClasseSaldo(
        "fluxoSaldoProjetado",
        saldoProjetado
    );

    preencherTexto(
        "fluxoResumoTabela",
        `${fluxoFiltrado.length} movimentações no período selecionado`
    );
}

function atualizarClasseSaldo(
    id,
    valor
) {
    const elemento =
        document.getElementById(id);

    if (!elemento) {
        return;
    }

    elemento.classList.remove(
        "positivo",
        "negativo"
    );

    elemento.classList.add(
        valor >= 0
            ? "positivo"
            : "negativo"
    );
}

function obterChavePeriodoFluxo(
    data,
    visao
) {
    const ano =
        data.getFullYear();

    const mes =
        String(
            data.getMonth() + 1
        ).padStart(2, "0");

    const dia =
        String(
            data.getDate()
        ).padStart(2, "0");

    if (visao === "diario") {
        return `${ano}-${mes}-${dia}`;
    }

    if (visao === "semanal") {
        const dataBase =
            inicioDoDia(data);

        const diaSemana =
            dataBase.getDay();

        const deslocamento =
            diaSemana === 0
                ? -6
                : 1 - diaSemana;

        dataBase.setDate(
            dataBase.getDate() +
            deslocamento
        );

        return `Semana de ${formatarDataBR(
            dataBase
        )}`;
    }

    return `${ano}-${mes}`;
}

function rotuloPeriodoFluxo(
    chave,
    visao
) {
    if (visao === "diario") {
        const [
            ano,
            mes,
            dia
        ] = chave
            .split("-")
            .map(Number);

        return new Date(
            ano,
            mes - 1,
            dia
        ).toLocaleDateString(
            "pt-BR",
            {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit"
            }
        );
    }

    if (visao === "semanal") {
        return chave;
    }

    const [ano, mes] =
        chave.split("-");

    return new Date(
        Number(ano),
        Number(mes) - 1,
        1
    ).toLocaleDateString(
        "pt-BR",
        {
            month: "short",
            year: "2-digit"
        }
    );
}

function renderizarGraficoFluxo() {
    const canvas =
        document.getElementById(
            "graficoFluxoCaixaDetalhado"
        );

    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {
        return;
    }

    const visao =
        document.getElementById(
            "fluxoVisao"
        )?.value ||
        "mensal";

    const mapa =
        new Map();

    fluxoFiltrado.forEach(
        (item) => {
            const chave =
                obterChavePeriodoFluxo(
                    item.data,
                    visao
                );

            if (!mapa.has(chave)) {
                mapa.set(chave, {
                    entradas: 0,
                    saidas: 0
                });
            }

            const grupo =
                mapa.get(chave);

            if (
                item.tipo ===
                "entrada"
            ) {
                grupo.entradas +=
                    item.valor;
            } else {
                grupo.saidas +=
                    item.valor;
            }
        }
    );

    const chaves =
        [...mapa.keys()].sort(
            (a, b) => {
                if (
                    visao ===
                    "semanal"
                ) {
                    const dataA =
                        converterRotuloSemana(
                            a
                        );

                    const dataB =
                        converterRotuloSemana(
                            b
                        );

                    return dataA - dataB;
                }

                return a.localeCompare(b);
            }
        );

    const entradas =
        chaves.map(
            (chave) =>
                mapa.get(chave)
                    .entradas
        );

    const saidas =
        chaves.map(
            (chave) =>
                mapa.get(chave)
                    .saidas
        );

    let acumulado = 0;

    const saldos =
        chaves.map(
            (chave) => {
                const grupo =
                    mapa.get(chave);

                acumulado +=
                    grupo.entradas -
                    grupo.saidas;

                return acumulado;
            }
        );

    if (graficoFluxoDetalhado) {
        graficoFluxoDetalhado.destroy();
    }

    graficoFluxoDetalhado =
        new Chart(
            canvas,
            {
                type: "bar",
                data: {
                    labels:
                        chaves.map(
                            (chave) =>
                                rotuloPeriodoFluxo(
                                    chave,
                                    visao
                                )
                        ),
                    datasets: [
                        {
                            type: "bar",
                            label:
                                "Entradas",
                            data:
                                entradas,
                            backgroundColor:
                                "rgba(41, 214, 129, 0.78)",
                            borderColor:
                                "#29d681",
                            borderWidth: 1,
                            borderRadius: 5
                        },
                        {
                            type: "bar",
                            label:
                                "Saídas",
                            data:
                                saidas,
                            backgroundColor:
                                "rgba(255, 107, 99, 0.78)",
                            borderColor:
                                "#ff6b63",
                            borderWidth: 1,
                            borderRadius: 5
                        },
                        {
                            type: "line",
                            label:
                                "Saldo acumulado",
                            data:
                                saldos,
                            borderColor:
                                "#4ca3ff",
                            backgroundColor:
                                "rgba(76, 163, 255, 0.12)",
                            pointBackgroundColor:
                                "#4ca3ff",
                            pointRadius: 3,
                            pointHoverRadius: 5,
                            borderWidth: 2,
                            tension: 0.28,
                            fill: false,
                            yAxisID: "y"
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio:
                        false,
                    interaction: {
                        mode: "index",
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label:
                                    (context) =>
                                        `${context.dataset.label}: ${formatarMoeda(
                                            context.raw
                                        )}`
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                color:
                                    "#91abc6",
                                maxRotation: 0
                            },
                            grid: {
                                color:
                                    "rgba(111, 171, 230, 0.08)"
                            }
                        },
                        y: {
                            ticks: {
                                color:
                                    "#91abc6",
                                callback:
                                    (valor) =>
                                        formatarNumeroCompacto(
                                            valor
                                        )
                            },
                            grid: {
                                color:
                                    "rgba(111, 171, 230, 0.08)"
                            }
                        }
                    }
                }
            }
        );
}

function converterRotuloSemana(
    chave
) {
    const texto =
        chave.replace(
            "Semana de ",
            ""
        );

    const [
        dia,
        mes,
        ano
    ] = texto
        .split("/")
        .map(Number);

    return new Date(
        ano,
        mes - 1,
        dia
    );
}

function obterTotalPaginasFluxo() {
    const porPagina =
        Number(
            document.getElementById(
                "fluxoPorPagina"
            )?.value || 25
        );

    return Math.max(
        1,
        Math.ceil(
            fluxoFiltrado.length /
            porPagina
        )
    );
}

function renderizarTabelaFluxo() {
    const corpo =
        document.getElementById(
            "fluxoTabelaCorpo"
        );

    if (!corpo) {
        return;
    }

    const porPagina =
        Number(
            document.getElementById(
                "fluxoPorPagina"
            )?.value || 25
        );

    const totalPaginas =
        obterTotalPaginasFluxo();

    fluxoPaginaAtual =
        Math.min(
            fluxoPaginaAtual,
            totalPaginas
        );

    const inicio =
        (fluxoPaginaAtual - 1) *
        porPagina;

    const itens =
        fluxoFiltrado.slice(
            inicio,
            inicio + porPagina
        );

    if (!itens.length) {
        corpo.innerHTML = `
            <tr>
                <td
                    colspan="11"
                    class="fluxo-vazio"
                >
                    Nenhuma movimentação encontrada.
                </td>
            </tr>
        `;
    } else {
        corpo.innerHTML =
            itens.map(
                (item) => {
                    const tipo =
                        item.tipo ===
                            "entrada"
                            ? "Entrada"
                            : "Saída";

                    const cenario =
                        item.cenario ===
                            "realizado"
                            ? "Realizado"
                            : "Previsto";

                    return `
                        <tr>
                            <td>
                                ${formatarDataBR(
                                    item.data
                                )}
                            </td>

                            <td>
                                <span class="fluxo-badge ${item.cenario}">
                                    ${cenario}
                                </span>
                            </td>

                            <td>
                                <span class="fluxo-badge ${item.tipo}">
                                    ${tipo}
                                </span>
                            </td>

                            <td>
                                ${escaparHtml(
                                    item.razaoSocial
                                )}
                            </td>

                            <td>
                                ${escaparHtml(
                                    item.documento ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${
                                    item.vencimento
                                        ? formatarDataBR(
                                            item.vencimento
                                        )
                                        : "—"
                                }
                            </td>

                            <td>
                                ${
                                    item.dataPagamento
                                        ? formatarDataBR(
                                            item.dataPagamento
                                        )
                                        : "—"
                                }
                            </td>

                            <td>
                                ${escaparHtml(
                                    item.local
                                )}
                            </td>

                            <td>
                                ${escaparHtml(
                                    item.planoFinanceiro
                                )}
                            </td>

                            <td class="fluxo-valor">
                                ${formatarMoeda(
                                    item.valor
                                )}
                            </td>

                            <td class="fluxo-impacto ${item.tipo}">
                                ${
                                    item.tipo ===
                                        "entrada"
                                        ? "+"
                                        : "-"
                                }
                                ${formatarMoeda(
                                    item.valor
                                )}
                            </td>
                        </tr>
                    `;
                }
            ).join("");
    }

    preencherTexto(
        "fluxoInfoPagina",
        `Página ${fluxoPaginaAtual} de ${totalPaginas}`
    );

    const anterior =
        document.getElementById(
            "fluxoPaginaAnterior"
        );

    const proxima =
        document.getElementById(
            "fluxoProximaPagina"
        );

    if (anterior) {
        anterior.disabled =
            fluxoPaginaAtual <= 1;
    }

    if (proxima) {
        proxima.disabled =
            fluxoPaginaAtual >=
            totalPaginas;
    }
}

function limparFiltrosFluxoCaixa() {
    const campos = {
        fluxoVisao:
            "mensal",
        fluxoCenario:
            "consolidado",
        fluxoDataInicio:
            "",
        fluxoDataFim:
            "",
        fluxoTipo:
            "",
        fluxoLocal:
            ""
    };

    Object.entries(
        campos
    ).forEach(
        ([id, valor]) => {
            const elemento =
                document.getElementById(
                    id
                );

            if (elemento) {
                elemento.value =
                    valor;
            }
        }
    );

    definirPeriodoInicialFluxo();

    fluxoPaginaAtual = 1;
    aplicarFiltrosFluxoCaixa();
}

function exportarFluxoCaixa() {
    if (!fluxoFiltrado.length) {
        alert(
            "Não há movimentações filtradas para exportar."
        );

        return;
    }

    const cabecalho = [
        "Data",
        "Cenário",
        "Tipo",
        "Cliente/Fornecedor",
        "Documento",
        "Vencimento",
        "Pagamento",
        "Local de cobrança",
        "Plano financeiro",
        "Valor",
        "Impacto"
    ];

    const linhas =
        fluxoFiltrado.map(
            (item) => [
                formatarDataBR(
                    item.data
                ),
                item.cenario,
                item.tipo,
                item.razaoSocial,
                item.documento,
                item.vencimento
                    ? formatarDataBR(
                        item.vencimento
                    )
                    : "",
                item.dataPagamento
                    ? formatarDataBR(
                        item.dataPagamento
                    )
                    : "",
                item.local,
                item.planoFinanceiro,
                item.valor
                    .toFixed(2)
                    .replace(".", ","),
                item.impacto
                    .toFixed(2)
                    .replace(".", ",")
            ]
        );

    const escaparCsv =
        (valor) =>
            `"${String(
                valor ?? ""
            ).replace(
                /"/g,
                '""'
            )}"`;

    const csv =
        [cabecalho, ...linhas]
            .map(
                (linha) =>
                    linha
                        .map(
                            escaparCsv
                        )
                        .join(";")
            )
            .join("\r\n");

    const blob =
        new Blob(
            ["\ufeff" + csv],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );

    const url =
        URL.createObjectURL(
            blob
        );

    const link =
        document.createElement(
            "a"
        );

    link.href = url;
    link.download =
        `fluxo-de-caixa-${formatarDataISO(
            new Date()
        )}.csv`;

    document.body.appendChild(
        link
    );

    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

document.addEventListener(
    "DOMContentLoaded",
    inicializarFluxoCaixa
);
