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

    configurarExplicacaoSaldoProjetado();

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

function atualizarFluxoCaixa(lancamentos, opcoes = {}) {
    fluxoLancamentos =
        Array.isArray(lancamentos)
            ? lancamentos
            : [];

    fluxoMovimentacoes =
        fluxoLancamentos
            .flatMap(criarMovimentacoesFluxo)
            .filter(Boolean);

    preencherLocaisFluxo();

    /*
     * As datas locais do Fluxo de Caixa pertencem ao próprio Fluxo.
     * Recalculamos o intervalo pela coluna N (Vencimento) somente na
     * carga de uma nova planilha ou quando os campos ainda estão vazios.
     * Assim, aplicar um filtro geral não apaga o período escolhido aqui.
     */
    const inicioInput = document.getElementById("fluxoDataInicio");
    const fimInput = document.getElementById("fluxoDataFim");
    const redefinirPeriodo = opcoes.redefinirPeriodo === true;

    if (
        redefinirPeriodo ||
        !inicioInput?.value ||
        !fimInput?.value
    ) {
        definirPeriodoInicialFluxo();
    }

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

    // Contas a Receber não soma adiantamentos de clientes em seus KPIs.
    // Excluir também dos movimentos do Fluxo mantém tabela, gráficos e
    // totais conciliáveis com a carteira (fornecedores não são excluídos).
    if (tipo === "entrada" && financeiroEhAdiantamentoCliente(item)) {
        return [];
    }

    const valorDocumento =
        Math.max(
            0,
            Number(item.valorDocumento || 0)
        );

    /*
     * Dt.pgto (coluna O) é a fonte única do status. Um valor na coluna AD
     * sem data não torna o lançamento realizado.
     *
     * Recebimentos (clientes): Vlr.docto + Juros - Descontos, como na aba
     * Contas a Receber. Pagamentos (fornecedores): Vlr.líq.pago, como
     * na aba Contas a Pagar. Sem Dt.pgto: previsto = Vlr.docto integral.
     */
    const temDataPagamento = financeiroEstaPago(item);
    const valorRealizado = temDataPagamento
        ? tipo === "entrada"
            ? financeiroValorRecebidoCliente(item)
            : financeiroValorPagoFornecedor(item)
        : 0;
    const valorPrevisto = !temDataPagamento ? valorDocumento : 0;

    /*
     * REGRA DO PERÍODO PARA PREVISÃO:
     *
     * A Dt.pgto (coluna O) define se o título está em aberto.
     * Quando Dt.pgto = 00/00/0000, o período do Fluxo de Caixa deve ser
     * filtrado pelo VENCIMENTO (coluna N), exatamente como na conferência
     * feita diretamente no Excel. Dt.flx.cx não participa da seleção dos
     * títulos previstos.
     */
    const dataPrevista =
        item.vencimento instanceof Date
            ? item.vencimento
            : null;

    const movimentos = [];

    /*
     * REGRA ÚNICA DE PERÍODO DO FLUXO DE CAIXA:
     *
     * Data inicial/final, gráfico e tabela são sempre posicionados pelo
     * VENCIMENTO (coluna N), tanto para REALIZADO quanto para PREVISTO.
     * A Dt.pgto (coluna O) serve SOMENTE para definir o cenário:
     *   - data válida      => REALIZADO
     *   - 00/00/0000/vazio => PREVISTO
     */
    const dataPeriodo =
        item.vencimento instanceof Date
            ? item.vencimento
            : null;

    if (
        temDataPagamento &&
        dataPeriodo instanceof Date
    ) {
        movimentos.push(
            montarMovimentacaoFluxo(
                item,
                tipo,
                "realizado",
                dataPeriodo,
                valorRealizado,
                `${item.id || "linha"}-realizado`
            )
        );
    }

    if (
        !temDataPagamento &&
        dataPrevista instanceof Date
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
            cenario === "realizado"
                ? "pago"
                : item.vencimento instanceof Date &&
                    inicioDoDia(item.vencimento) < inicioDoDia(new Date())
                    ? "atrasado" : "aberto"
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

    /*
     * O intervalo automático do Fluxo de Caixa vem EXCLUSIVAMENTE do
     * Vencimento (coluna N). Não usamos Dt.pgto para montar a data inicial
     * ou final; Dt.pgto continua sendo usada apenas para o cenário.
     *
     * O período é recalculado sempre que a base do fluxo é atualizada para
     * não manter datas antigas de uma planilha carregada anteriormente.
     */
    const datas =
        fluxoLancamentos
            .map((item) => item.vencimento)
            .filter(
                (data) =>
                    data instanceof Date &&
                    !Number.isNaN(data.getTime())
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

function movimentacaoPassaNosFiltrosFluxo(
    item,
    {
        cenario = "consolidado",
        situacao = "",
        tipo = "",
        local = "",
        inicio = null,
        fim = null
    } = {}
) {
    if (
        cenario !== "consolidado" &&
        item.cenario !== cenario
    ) {
        return false;
    }

    // A Situação do painel lateral também vale aqui. Pago = realizado;
    // Em aberto = qualquer previsto (inclusive vencido); Em atraso = previsto vencido.
    if (situacao === "pago" && item.cenario !== "realizado") return false;
    if (situacao === "aberto" && item.cenario !== "previsto") return false;
    if (situacao === "atrasado" &&
        (item.cenario !== "previsto" || !(item.data instanceof Date) ||
            inicioDoDia(item.data) >= inicioDoDia(new Date()))) return false;

    if (tipo && item.tipo !== tipo) {
        return false;
    }

    if (local && item.local !== local) {
        return false;
    }

    /*
     * Data inicial e final são inclusivas e consultam exclusivamente o
     * Vencimento (coluna N), armazenado em item.data. A Dt.pgto não entra na
     * comparação do período; ela foi usada somente para definir o cenário.
     */
    if (
        !(item.data instanceof Date) ||
        Number.isNaN(item.data.getTime())
    ) {
        return false;
    }

    const data = inicioDoDia(item.data);

    if (inicio && data < inicio) {
        return false;
    }

    if (fim && data > fim) {
        return false;
    }

    return true;
}

function aplicarFiltrosFluxoCaixa() {
    const cenario =
        document.getElementById(
            "fluxoCenario"
        )?.value ||
        "consolidado";

    // Filtro geral Situação é uma restrição complementar, nunca substitui
    // o cenário ou o período escolhido dentro do próprio Fluxo de Caixa.
    const situacao = document.getElementById("situacao")?.value || "";

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
        fluxoMovimentacoes.filter((item) =>
            movimentacaoPassaNosFiltrosFluxo(
                item,
                {
                    cenario,
                    situacao,
                    tipo,
                    local,
                    inicio,
                    fim
                }
            )
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

function ehAdiantamentoFluxo(item) {
    const classificacao = normalizarTexto([
        item?.tipoDocumento,
        item?.planoFinanceiro
    ].join(" "));

    return classificacao.includes("adiantamento");
}

function atualizarKpisFluxo() {
    const realizadasEntradas =
        fluxoFiltrado.filter(
            (item) =>
                item.cenario ===
                    "realizado" &&
                item.tipo ===
                    "entrada" &&
                !ehAdiantamentoFluxo(item)
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

    atualizarExplicacaoSaldoProjetado(
        saldoRealizado,
        entradaPrevista,
        saidaPrevista,
        saldoProjetado
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


/*
 * Exibe a memória de cálculo com os MESMOS números que já alimentam os KPIs.
 * Não lê valores formatados da tela nem refaz somas a partir de outra base.
 */
function atualizarExplicacaoSaldoProjetado(saldoRealizado, entradasPrevistas, saidasPrevistas, saldoProjetado) {
    const formato = new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    const absoluto = (n) => formato.format(Math.abs(Number(n) || 0));
    const comSinal = (n) => `${n < -0.000001 ? "−" : ""}${absoluto(n)}`;
    const parcela = (n) => `${n < -0.000001 ? "−" : "+"} ${absoluto(n)}`;

    preencherTexto("fluxoCalculoSaldoRealizado", formatarMoeda(saldoRealizado));
    preencherTexto("fluxoCalculoEntradasPrevistas", formatarMoeda(entradasPrevistas));
    preencherTexto("fluxoCalculoSaidasPrevistas", formatarMoeda(saidasPrevistas));

    preencherTexto(
        "fluxoCalculoExpressao",
        `${comSinal(saldoRealizado)} ${parcela(entradasPrevistas)} ${saidasPrevistas < -0.000001 ? "+" : "−"} ${absoluto(saidasPrevistas)}`
    );
    preencherTexto("fluxoCalculoResultado", `= ${comSinal(saldoProjetado)}`);
}

function configurarExplicacaoSaldoProjetado() {
    const card = document.getElementById("fluxoCardSaldoProjetado");
    if (!card || card.dataset.explicacaoConfigurada === "true") return;
    card.dataset.explicacaoConfigurada = "true";

    const alternar = () => {
        const aberto = card.classList.toggle("detalhe-aberto");
        card.setAttribute("aria-expanded", String(aberto));
    };
    const fechar = () => {
        card.classList.remove("detalhe-aberto");
        card.setAttribute("aria-expanded", "false");
    };

    card.addEventListener("click", alternar);
    card.addEventListener("keydown", (evento) => {
        if (evento.key === "Enter" || evento.key === " ") {
            evento.preventDefault();
            alternar();
        } else if (evento.key === "Escape") {
            fechar();
        }
    });
    document.addEventListener("pointerdown", (evento) => {
        if (!card.contains(evento.target)) fechar();
    });
    card.addEventListener("blur", fechar);
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
