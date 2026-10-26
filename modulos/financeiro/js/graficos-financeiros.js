"use strict";

/*
==========================================================
SMART GROUP ANALYTICS
Gráficos da Visão Geral Financeira
==========================================================
*/

function renderizarGraficos(dados) {
    if (typeof Chart === "undefined") {
        atualizarStatusImportacao(
            "A planilha foi carregada, mas a biblioteca dos gráficos não abriu.",
            "erro"
        );
        return;
    }

    const clientes = dados.filter(
        (item) => item.tipoCadastro === "cliente"
    );

    const clientesVisao = clientes
        .map(prepararMovimentoVisao)
        .filter(Boolean);

    const fornecedoresVisao = dados
        .filter((item) => item.tipoCadastro === "fornecedor")
        .map(prepararMovimentoVisao)
        .filter(Boolean);

    atualizarTextosModoVisao();
    renderizarFluxoCaixa(clientesVisao, fornecedoresVisao);
    renderizarRecebimentosDia(clientesVisao);
    renderizarTopClientes(clientesVisao);
}

function prepararMovimentoVisao(item) {
    /*
     * Na Visão Geral, um lançamento só é REALIZADO quando existe uma
     * Dt.pgto (coluna O) válida. O gráfico "Entradas por Dia" deve fechar
     * com o Excel pela data efetiva do pagamento, nunca pelo vencimento.
     */
    const pagamentoValido =
        item.dataPagamento instanceof Date &&
        !Number.isNaN(item.dataPagamento.getTime());

    const dataReferencia = pagamentoValido
        ? item.dataPagamento
        : item.vencimento;

    if (!(dataReferencia instanceof Date)) return null;

    const valorReferencia = pagamentoValido
        ? Number(item.valorLiquidoPago || 0)
        : Math.max(
            0,
            Number(item.valorDocumento || 0) -
                Number(item.valorLiquidoPago || 0)
        );

    return {
        ...item,
        dataPagamento: dataReferencia,
        valorLiquidoPago: valorReferencia,
        cenarioVisao: pagamentoValido ? "realizado" : "previsto"
    };
}

function atualizarTextosModoVisao() {
    const textos = {
        todos: ["Realizado e previsto", "Pagamento para realizado e vencimento para previsto"],
        realizado: ["Realizado", "Valores conforme a data de pagamento"],
        previsto: ["Previsto", "Valores conforme a data de vencimento"]
    };
    const [rotulo, descricao] = textos[modoVisaoGeral] || textos.todos;
    preencherTexto("descricaoFluxoVisao", `${rotulo} por mês`);
    preencherTexto("descricaoRecebimentosDia", descricao);
    preencherTexto("descricaoTopClientes", `Clientes com maiores valores no cenário ${rotulo.toLowerCase()}`);
    preencherTexto("descricaoPlanoFinanceiroVisao", `${rotulo} pela conta de planejamento`);
}


/* ======================================================
   FLUXO DE CAIXA
   Recebimentos, pagamentos e saldo por mês
   ====================================================== */

function renderizarFluxoCaixa(recebimentos, pagamentos) {
    const chaves = [...new Set([
        ...recebimentos.map((item) => chaveMes(item.dataPagamento)),
        ...pagamentos.map((item) => chaveMes(item.dataPagamento))
    ].filter(Boolean))].sort();

    const mapaRecebimentos = agruparPor(
        recebimentos.filter((item) => item.dataPagamento),
        (item) => chaveMes(item.dataPagamento),
        "valorLiquidoPago"
    );

    const mapaPagamentos = agruparPor(
        pagamentos.filter((item) => item.dataPagamento),
        (item) => chaveMes(item.dataPagamento),
        "valorLiquidoPago"
    );

    const valoresRecebidos = chaves.map(
        (chave) => mapaRecebimentos.get(chave) || 0
    );

    const valoresPagos = chaves.map(
        (chave) => mapaPagamentos.get(chave) || 0
    );

    const valoresSaldo = chaves.map(
        (_, indice) => valoresRecebidos[indice] - valoresPagos[indice]
    );

    criarOuAtualizarGrafico(
        "fluxoCaixa",
        "graficoFluxoCaixa",
        {
            type: "line",

            data: {
                labels: chaves.map(formatarChaveMes),

                datasets: [
                    {
                        label: "Recebimentos",
                        data: valoresRecebidos,
                        borderColor: "#27d17f",
                        backgroundColor: "rgba(39, 209, 127, 0.12)",
                        pointBackgroundColor: "#27d17f",
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        borderWidth: 2,
                        tension: 0.32,
                        fill: true
                    },
                    {
                        label: "Pagamentos",
                        data: valoresPagos,
                        borderColor: "#ff665c",
                        backgroundColor: "rgba(255, 102, 92, 0.08)",
                        pointBackgroundColor: "#ff665c",
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        borderWidth: 2,
                        tension: 0.32,
                        fill: false
                    },
                    {
                        label: "Saldo",
                        data: valoresSaldo,
                        borderColor: "#52a3ff",
                        backgroundColor: "rgba(82, 163, 255, 0.08)",
                        pointBackgroundColor: "#52a3ff",
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        borderWidth: 2,
                        borderDash: [7, 5],
                        tension: 0.32,
                        fill: false
                    }
                ]
            },

            options: opcoesGraficoCartesiano()
        }
    );
}


/* ======================================================
   RECEBIMENTOS POR DIA
   ====================================================== */

function renderizarRecebimentosDia(recebimentos) {
    const mapa = agruparPor(
        recebimentos.filter((item) => item.dataPagamento),
        (item) => formatarDataISO(item.dataPagamento),
        "valorLiquidoPago"
    );

    const chaves = [...mapa.keys()].sort();

    const opcoes = opcoesGraficoCartesiano();

    opcoes.plugins.legend.display = false;

    opcoes.scales.x.ticks = {
        color: "#9fb7d5",
        autoSkip: true,
        maxTicksLimit: 12,
        maxRotation: 0,
        minRotation: 0
    };

    criarOuAtualizarGrafico(
        "recebimentosDia",
        "graficoRecebimentosDia",
        {
            type: "bar",

            data: {
                labels: chaves.map((chave) =>
                    formatarDataCurta(
                        new Date(`${chave}T00:00:00`)
                    )
                ),

                datasets: [
                    {
                        label: "Valor recebido",
                        data: chaves.map(
                            (chave) => mapa.get(chave)
                        ),
                        backgroundColor: "#1683ff",
                        hoverBackgroundColor: "#52a3ff",
                        borderRadius: 6,
                        borderSkipped: false,
                        maxBarThickness: 24
                    }
                ]
            },

            options: opcoes
        }
    );
}


/* ======================================================
   CLIENTES POR PAGAMENTOS
   Usa somente Vlr.líq.pago dos títulos recebidos.
   ====================================================== */

function renderizarTopClientes(clientesPagos) {
    const limitesPermitidos = [5, 10, 15, 20];
    const limiteSelecionado = Number(
        document.getElementById("limiteTopClientes")?.value || 10
    );
    const limite = limitesPermitidos.includes(limiteSelecionado)
        ? limiteSelecionado
        : 10;
    const mapa = new Map();

    clientesPagos.forEach((item) => {
            const cliente =
                item.razaoSocial ||
                item.nomeFantasia ||
                "Não informado";

            const valorPago = Number(item.valorLiquidoPago || 0);

            if (!mapa.has(cliente)) {
                mapa.set(cliente, {
                    cliente,
                    totalPago: 0,
                    quantidadePagamentos: 0
                });
            }

            const resumo = mapa.get(cliente);
            resumo.totalPago += valorPago;
            resumo.quantidadePagamentos += 1;
        });

    const totalGeralPago =
        [...mapa.values()].reduce(
            (total, item) =>
                total + item.totalPago,
            0
        );

    const ranking =
        [...mapa.values()]
            .map((item) => ({
                ...item,

                participacao:
                    totalGeralPago > 0
                        ? (
                            item.totalPago /
                            totalGeralPago *
                            100
                        )
                        : 0
            }))
            .sort(
                (a, b) =>
                    b.totalPago -
                    a.totalPago
            )
            .slice(0, limite)
            .reverse();

    preencherTexto(
        "tituloTopClientes",
        `Top ${limite} Clientes — ${modoVisaoGeral === "todos" ? "Todos" : modoVisaoGeral === "realizado" ? "Realizado" : "Previsto"}`
    );

    const container = document
        .getElementById("graficoTopClientes")
        ?.closest(".grafico-container");

    if (container) {
        container.style.height = `${Math.max(
            255,
            Math.min(380, 120 + limite * 13)
        )}px`;
    }

    if (typeof Chart === "undefined") {
        return;
    }

    const opcoes =
        opcoesGraficoHorizontal();

    // Apenas no Top Clientes: a dica aparece somente ao passar sobre a
    // barra correta. O modo anterior (index + intersect:false) podia manter
    // o tooltip de outro cliente mesmo depois de o cursor mudar de linha.
    opcoes.interaction = {
        mode: "nearest",
        intersect: true,
        axis: "xy"
    };
    opcoes.hover = {
        mode: "nearest",
        intersect: true,
        axis: "xy"
    };
    // Evita que uma animacao atrasada deixe uma informacao antiga em tela.
    opcoes.animation = false;

    // Ancorar a dica na posicao REAL do mouse, nao no centro da barra.
    // Barras muito longas podiam mostrar a dica longe do cursor.
    const posicionadores = Chart.Tooltip?.positioners;
    if (posicionadores && !posicionadores.cursorTopClientes) {
        posicionadores.cursorTopClientes = (_elementos, posicaoMouse) => ({
            x: posicaoMouse.x,
            y: posicaoMouse.y
        });
    }

    opcoes.plugins.tooltip = {
        mode: "nearest",
        intersect: true,
        position: posicionadores?.cursorTopClientes ? "cursorTopClientes" : "nearest",
        padding: 12,

        backgroundColor:
            "rgba(3, 18, 37, 0.97)",

        borderColor:
            "rgba(39, 209, 127, 0.35)",

        borderWidth: 1,

        titleColor: "#ffffff",
        bodyColor: "#dbeafe",

        callbacks: {
            title: (itens) => {
                const indice =
                    itens[0]?.dataIndex;

                return ranking[indice]
                    ?.cliente ||
                    "Cliente";
            },

            label: () => "",

            afterBody: (itens) => {
                const indice =
                    itens[0]?.dataIndex;

                const dados =
                    ranking[indice];

                if (!dados) {
                    return [];
                }

                return [
                    `Total no cenário: ${formatarMoeda(
                        dados.totalPago
                    )}`,

                    `Quantidade de títulos: ${
                        dados.quantidadePagamentos
                    }`,

                    `Participação no cenário: ${
                        dados.participacao.toLocaleString(
                            "pt-BR",
                            {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1
                            }
                        )
                    }%`
                ];
            }
        }
    };

    criarOuAtualizarGrafico(
        "topClientes",
        "graficoTopClientes",
        {
            type: "bar",

            data: {
                labels: ranking.map(
                    (item) =>
                        abreviarTexto(
                            item.cliente,
                            30
                        )
                ),

                datasets: [
                    {
                        label:
                            "Valor total",

                        data: ranking.map(
                            (item) =>
                                item.totalPago
                        ),

                        metricas:
                            ranking,

                        backgroundColor:
                            "#27d17f",

                        hoverBackgroundColor:
                            "#52e59e",

                        borderRadius: 6,
                        borderSkipped: false,
                        maxBarThickness: 22
                    }
                ]
            },

            options: opcoes
        }
    );

    // A rosca fica no card direito, usando o mesmo Top mostrado nas barras,
    // sem outra fonte de dados ou seleção.
    renderizarRoscaTopClientes([...ranking].reverse(), limite);
}


/* ======================================================
   ROSCA DO TOP CLIENTES
   Base percentual: soma APENAS dos clientes visíveis no Top.
   5, 10, 15 e 20 sempre representam 100% do grupo escolhido.
   ====================================================== */

function calcularPorcentagensRoscaTopClientes(valores) {
    const positivos = valores.map((valor) => Math.max(0, Number(valor) || 0));
    const total = positivos.reduce((soma, valor) => soma + valor, 0);
    if (total <= 0) return positivos.map(() => 0);

    // Distribuição em centésimos para que as porcentagens exibidas,
    // inclusive depois do arredondamento, somem exatamente 100,00%.
    const parcelas = positivos.map((valor, indice) => {
        const exato = valor / total * 10000;
        const unidades = Math.floor(exato);
        return { indice, unidades, sobra: exato - unidades };
    });
    const falta = 10000 - parcelas.reduce((soma, p) => soma + p.unidades, 0);
    const ordem = [...parcelas].sort(
        (a, b) => b.sobra - a.sobra || a.indice - b.indice
    );
    for (let i = 0; i < falta; i++) {
        ordem[i % ordem.length].unidades += 1;
    }
    return parcelas.map((p) => p.unidades / 100);
}

function renderizarRoscaTopClientes(clientesTop, limite) {
    const valores = clientesTop.map((item) => Number(item.totalPago) || 0);
    const totalTop = valores.reduce((soma, valor) => soma + valor, 0);
    const temNegativos = valores.some((valor) => valor < 0);
    const porcentagens = calcularPorcentagensRoscaTopClientes(valores);
    const cores = [
        "#278bff", "#27d17f", "#faad38", "#b789fa", "#fa6689",
        "#2ed1ce", "#f4843c", "#7d9cff", "#a6da40", "#e476d7",
        "#16aacd", "#d8ba50", "#d76d57", "#6bd79f", "#9b82e9",
        "#f1a6c7", "#75b6e8", "#bace76", "#c49467", "#dc8bf5"
    ];
    const percentualFormatado = (valor) => `${valor.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}%`;

    preencherTexto("topClientesRoscaQuantidade", `Top ${limite}`);
    preencherTexto("topClientesRoscaTotal", formatarMoeda(totalTop));
    preencherTexto("topClientesRoscaPercentual", totalTop > 0 && !temNegativos ? "100%" : "0%");
    preencherTexto("topClientesRoscaNota", temNegativos
        ? "Há valores negativos; o gráfico não representa participações negativas."
        : "Cada porcentagem considera somente a soma dos clientes deste Top.");

    const legenda = document.getElementById("legendaTopClientesRosca");
    if (legenda) {
        legenda.replaceChildren();
        const fragmento = document.createDocumentFragment();
        clientesTop.forEach((cliente, indice) => {
            const linha = document.createElement("div");
            linha.className = "top-clientes-rosca-item";
            linha.setAttribute("role", "listitem");
            linha.title = cliente.cliente;

            const cor = document.createElement("span");
            cor.className = "top-clientes-rosca-cor";
            cor.style.backgroundColor = cores[indice % cores.length];

            const nome = document.createElement("span");
            nome.className = "top-clientes-rosca-cliente";
            nome.textContent = cliente.cliente;

            const metricas = document.createElement("span");
            metricas.className = "top-clientes-rosca-metrica";
            const valor = document.createElement("strong");
            valor.textContent = formatarMoeda(cliente.totalPago);
            const percentual = document.createElement("small");
            percentual.textContent = temNegativos ? "Participação indisponível" : percentualFormatado(porcentagens[indice]);
            metricas.append(valor, percentual);

            linha.append(cor, nome, metricas);
            fragmento.append(linha);
        });
        if (!clientesTop.length) {
            const vazio = document.createElement("span");
            vazio.className = "top-clientes-rosca-nota";
            vazio.textContent = "Nenhum cliente encontrado para os filtros atuais.";
            fragmento.append(vazio);
        }
        legenda.append(fragmento);
    }

    // Chart.js não admite fatias negativas. Para preservar a consistência,
    // não desenha uma distribuição percentual enganosa neste caso raro.
    criarOuAtualizarGrafico("topClientesRosca", "graficoTopClientesRosca", {
        type: "doughnut",
        data: {
            labels: clientesTop.map((item) => item.cliente),
            datasets: [{
                label: "Participação no Top",
                data: temNegativos ? valores.map(() => 0) : valores,
                backgroundColor: cores.slice(0, clientesTop.length),
                hoverBackgroundColor: cores.slice(0, clientesTop.length),
                borderColor: "#0a2340",
                borderWidth: 2,
                hoverOffset: 5,
                spacing: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "72%",
            plugins: {
                legend: { display: false },
                tooltip: {
                    padding: 12,
                    backgroundColor: "rgba(3, 18, 37, 0.97)",
                    titleColor: "#fff",
                    bodyColor: "#dbeafe",
                    borderColor: "rgba(82, 163, 255, 0.35)",
                    borderWidth: 1,
                    callbacks: {
                        label: (contexto) => {
                            const indice = contexto.dataIndex;
                            return temNegativos
                                ? `${formatarMoeda(valores[indice])} — percentual indisponível`
                                : `${formatarMoeda(valores[indice])} — ${percentualFormatado(porcentagens[indice])} do Top ${limite}`;
                        }
                    }
                }
            }
        }
    });

    // Sincroniza a janela ampliada se um filtro mudar enquanto ela estiver aberta.
    if (document.getElementById("modalTopClientesRoscaOverlay")?.classList.contains("ativo")) {
        atualizarDetalheRoscaTopClientes();
    }
}


/* ======================================================
   RECEBIMENTOS POR PLANO FINANCEIRO
   ====================================================== */

function renderizarPlanoFinanceiro(recebimentos) {
    const mapa = agruparPor(
        recebimentos,
        (item) =>
            item.planoFinanceiro ||
            item.historicoFinanceiro ||
            "Não informado",
        "valorLiquidoPago"
    );

    const ranking = ordenarMapa(mapa)
        .slice(0, 8)
        .reverse();

    criarOuAtualizarGrafico(
        "planoFinanceiro",
        "graficoPlanoFinanceiro",
        {
            type: "bar",

            data: {
                labels: ranking.map(
                    ([nome]) => abreviarTexto(nome, 27)
                ),

                datasets: [
                    {
                        label: modoVisaoGeral === "previsto" ? "Previsto" : modoVisaoGeral === "realizado" ? "Realizado" : "Total",
                        data: ranking.map(
                            ([, valor]) => valor
                        ),
                        backgroundColor: "#8f61e8",
                        hoverBackgroundColor: "#aa84ef",
                        borderRadius: 6,
                        borderSkipped: false,
                        maxBarThickness: 22
                    }
                ]
            },

            options: opcoesGraficoHorizontal()
        }
    );
}


/* ======================================================
   REPRESENTANTES
   ====================================================== */

function renderizarRepresentantes(recebimentos) {
    const mapa = agruparPor(
        recebimentos,
        (item) =>
            item.representante ||
            item.codigoRepresentante ||
            "Não informado",
        "valorLiquidoPago"
    );

    const ranking = ordenarMapa(mapa)
        .slice(0, 10)
        .reverse();

    criarOuAtualizarGrafico(
        "representantes",
        "graficoRepresentantes",
        {
            type: "bar",

            data: {
                labels: ranking.map(
                    ([nome]) => abreviarTexto(nome, 24)
                ),

                datasets: [
                    {
                        label: "Recebido",
                        data: ranking.map(
                            ([, valor]) => valor
                        ),
                        backgroundColor: "#1683ff",
                        hoverBackgroundColor: "#52a3ff",
                        borderRadius: 6,
                        borderSkipped: false,
                        maxBarThickness: 22
                    }
                ]
            },

            options: opcoesGraficoHorizontal()
        }
    );
}


/* ======================================================
   SITUAÇÃO DAS CONTAS A RECEBER
   ====================================================== */

function renderizarSituacaoReceber(clientes) {
    const pago = somar(
        clientes.filter((item) => item.pago),
        "valorLiquidoPago"
    );

    const aberto = somar(
        clientes.filter(
            (item) => item.situacao === "aberto"
        ),
        "valorDocumento"
    );

    const atraso = somar(
        clientes.filter(
            (item) => item.situacao === "atrasado"
        ),
        "valorDocumento"
    );

    criarOuAtualizarGrafico(
        "situacaoReceber",
        "graficoSituacaoReceber",
        {
            type: "doughnut",

            data: {
                labels: [
                    "Pago",
                    "A receber",
                    "Em atraso"
                ],

                datasets: [
                    {
                        data: [
                            pago,
                            aberto,
                            atraso
                        ],

                        backgroundColor: [
                            "#27d17f",
                            "#1683ff",
                            "#ff4d4d"
                        ],

                        borderWidth: 0,
                        hoverOffset: 7
                    }
                ]
            },

            options: opcoesGraficoRosca(
                "Carteira"
            ),

            plugins: [
                pluginTextoCentralRosca(
                    "Total da carteira"
                )
            ]
        }
    );
}


/* ======================================================
   DETALHES DOS INDICADORES FINANCEIROS
   ====================================================== */

function renderizarDetalhesIndicadorFinanceiro(dados, dadosCarteira = dados) {
    const corpo = document.getElementById("corpoTabelaDetalhesKpi");
    const contador = document.getElementById("contadorDetalhesKpi");

    if (!corpo) {
        return;
    }

    const configuracoes = {
        entradas: {
            titulo: "Detalhes do Total de Entradas",
            descricao: "Recebimentos de clientes que formam o indicador selecionado",
            vazio: "Nenhuma entrada encontrada no período selecionado.",
            filtrar: (item) => item.tipoCadastro === "cliente" && item.pago,
            campoValor: "valorLiquidoPago",
            dataOrdenacao: (item) => item.dataPagamento,
            ordem: "desc"
        },
        receber: {
            titulo: "Detalhes de A Receber",
            descricao: "Títulos sem pagamento, vencidos ou a vencer; inclui sem banco informado e exclui adiantamentos",
            vazio: "Nenhum título a receber encontrado no período selecionado.",
            filtrar: clienteEmAbertoIndicador,
            campoValor: "valorDocumento",
            dataOrdenacao: (item) => item.vencimento,
            ordem: "asc"
        },
        inadimplencia: {
            titulo: "Detalhes da Inadimplência",
            descricao: "Títulos vencidos sem pagamento; inclui sem banco informado e exclui adiantamentos",
            vazio: "Nenhum título inadimplente no período selecionado.",
            filtrar: clienteVencidoIndicador,
            campoValor: "valorDocumento",
            dataOrdenacao: (item) => item.vencimento,
            ordem: "asc"
        },
        saidas: {
            titulo: "Detalhes do Total de Saídas",
            descricao: "Pagamentos realizados a fornecedores no período selecionado",
            vazio: "Nenhuma saída encontrada no período selecionado.",
            filtrar: (item) => item.tipoCadastro === "fornecedor" && item.pago,
            campoValor: "valorLiquidoPago",
            dataOrdenacao: (item) => item.dataPagamento,
            ordem: "desc"
        },
        pagar: {
            titulo: "Detalhes de A Pagar",
            descricao: "Títulos de fornecedores ainda não pagos, vencidos ou a vencer",
            vazio: "Nenhum título a pagar encontrado no período selecionado.",
            filtrar: (item) => item.tipoCadastro === "fornecedor" && !item.pago,
            campoValor: "valorDocumento",
            dataOrdenacao: (item) => item.vencimento,
            ordem: "asc"
        }
    };

    const tipoAtivo = typeof detalheKpiAtivo === "string"
        ? detalheKpiAtivo
        : "inadimplencia";
    const configuracao = configuracoes[tipoAtivo] || configuracoes.inadimplencia;
    const ehCarteira = tipoAtivo === "receber" || tipoAtivo === "inadimplencia";
    const registros = (ehCarteira ? dadosCarteira : dados)
        .filter(configuracao.filtrar)
        .sort((a, b) => {
            const semData = configuracao.ordem === "desc"
                ? 0
                : Number.MAX_SAFE_INTEGER;
            const dataA = configuracao.dataOrdenacao(a)?.getTime() || semData;
            const dataB = configuracao.dataOrdenacao(b)?.getTime() || semData;
            return configuracao.ordem === "desc"
                ? dataB - dataA
                : dataA - dataB;
        });

    preencherTexto("tituloDetalhesKpi", configuracao.titulo);
    preencherTexto("descricaoDetalhesKpi", configuracao.descricao);

    if (contador) {
        contador.textContent = String(registros.length);
    }

    if (!registros.length) {
        corpo.innerHTML = `
            <tr>
                <td colspan="12" class="tabela-vazia">
                    ${escaparHtml(configuracao.vazio)}
                </td>
            </tr>
        `;
        return;
    }

    const hoje = inicioDoDia(new Date());

    corpo.innerHTML = registros.map((item) => {
        const nomePessoa = item.razaoSocial || item.nomeFantasia || "Não informado";
        const pago = ehCarteira ? !clienteEmAbertoIndicador(item) : item.pago;
        const atrasado = ehCarteira ? clienteVencidoIndicador(item) : item.atrasado;
        const situacao = pago
            ? "Pago"
            : atrasado
                ? "Vencido"
                : "Em aberto";
        const classeSituacao = pago
            ? "pago"
            : atrasado
                ? "atrasado"
                : "aberto";
        const diasAtraso = atrasado && item.vencimento
            ? Math.max(
                0,
                Math.floor((hoje - inicioDoDia(item.vencimento)) / 86400000)
            )
            : null;
        const banco = normalizarTexto(item.banco) === "nao informado"
            ? "-"
            : nomeBancoAmigavel(item.banco);

        return `
            <tr>
                <td title="${escaparHtml(nomePessoa)}">
                    ${escaparHtml(abreviarTexto(nomePessoa, 38))}
                </td>
                <td>${item.tipoCadastro === "cliente" ? "Cliente" : "Fornecedor"}</td>
                <td>${escaparHtml(item.documento || "-")}</td>
                <td>${formatarDataBR(item.dataMovimento)}</td>
                <td>${formatarDataBR(item.vencimento)}</td>
                <td>${formatarDataBR(item.dataPagamento)}</td>
                <td>
                    <span class="status-detalhe ${classeSituacao}">
                        ${situacao}
                    </span>
                </td>
                <td>
                    ${diasAtraso === null
                        ? "-"
                        : `<span class="dias-atraso">${diasAtraso}</span>`}
                </td>
                <td class="valor-financeiro">
                    ${formatarMoeda(item[configuracao.campoValor])}
                </td>
                <td class="banco-tabela">${escaparHtml(banco)}</td>
                <td>${escaparHtml(item.planoFinanceiro || "-")}</td>
                <td class="representante-tabela">
                    ${escaparHtml(item.representante || "-")}
                </td>
            </tr>
        `;
    }).join("");
}


/* ======================================================
   CRIAÇÃO E ATUALIZAÇÃO DOS GRÁFICOS
   ====================================================== */

function criarOuAtualizarGrafico(
    chave,
    canvasId,
    configuracao
) {
    const canvas =
        document.getElementById(canvasId);

    if (!canvas) {
        return;
    }

    if (graficosFinanceiros[chave]) {
        graficosFinanceiros[chave].destroy();
    }

    graficosFinanceiros[chave] =
        new Chart(
            canvas,
            configuracao
        );
}


/* ======================================================
   OPÇÕES COMUNS
   ====================================================== */

function opcoesGraficoCartesiano() {
    return {
        responsive: true,
        maintainAspectRatio: false,

        interaction: {
            mode: "index",
            intersect: false
        },

        plugins: {
            legend: {
                labels: {
                    color: "#dbeafe",
                    boxWidth: 12,
                    boxHeight: 12,
                    padding: 16,
                    usePointStyle: true,
                    pointStyle: "rectRounded"
                }
            },

            tooltip: {
                padding: 11,
                backgroundColor:
                    "rgba(3, 18, 37, 0.96)",
                borderColor:
                    "rgba(82, 163, 255, 0.3)",
                borderWidth: 1,

                callbacks: {
                    label: (contexto) =>
                        `${contexto.dataset.label}: ` +
                        `${formatarMoeda(contexto.raw)}`
                }
            }
        },

        scales: {
            x: {
                ticks: {
                    color: "#9fb7d5",
                    maxRotation: 0
                },

                grid: {
                    color:
                        "rgba(255,255,255,0.04)"
                },

                border: {
                    color:
                        "rgba(255,255,255,0.08)"
                }
            },

            y: {
                beginAtZero: true,

                ticks: {
                    color: "#9fb7d5",

                    callback: (valor) =>
                        formatarNumeroCompacto(valor)
                },

                grid: {
                    color:
                        "rgba(255,255,255,0.06)"
                },

                border: {
                    color:
                        "rgba(255,255,255,0.08)"
                }
            }
        }
    };
}


/*
 * Correção importante:
 * em gráficos horizontais o eixo Y é categórico.
 * Sem esta alteração o Chart.js exibia 0, 1, 2, 3...
 * no lugar dos nomes dos clientes, planos e representantes.
 */
function opcoesGraficoHorizontal() {
    const opcoes =
        opcoesGraficoCartesiano();

    opcoes.indexAxis = "y";

    opcoes.plugins.legend.display = false;

    opcoes.scales.x.beginAtZero = true;

    opcoes.scales.x.ticks = {
        color: "#9fb7d5",

        callback: (valor) =>
            formatarNumeroCompacto(valor)
    };

    opcoes.scales.y.beginAtZero = false;

    opcoes.scales.y.ticks = {
        color: "#dbeafe",
        autoSkip: false,
        font: {
            size: 10,
            weight: "600"
        },

        callback: function(valor) {
            return this.getLabelForValue(valor);
        }
    };

    opcoes.scales.y.grid = {
        display: false
    };

    return opcoes;
}


function opcoesGraficoRosca(titulo) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "66%",

        plugins: {
            legend: {
                position: "right",

                labels: {
                    color: "#dbeafe",
                    boxWidth: 11,
                    boxHeight: 11,
                    padding: 15,

                    generateLabels: (grafico) => {
                        const dados =
                            grafico.data.datasets[0].data;

                        const total =
                            dados.reduce(
                                (soma, valor) =>
                                    soma + Number(valor || 0),
                                0
                            );

                        return grafico.data.labels.map(
                            (rotulo, indice) => {
                                const valor =
                                    Number(
                                        dados[indice] || 0
                                    );

                                const percentual =
                                    total
                                        ? (
                                            valor /
                                            total *
                                            100
                                        )
                                        : 0;

                            return {
    text:
        `${rotulo} ${percentual.toLocaleString(
            "pt-BR",
            {
                minimumFractionDigits:1,
                maximumFractionDigits:1
            }
        )}%`,

    fillStyle:
        grafico.data.datasets[0]
            .backgroundColor[indice],

    strokeStyle:
        grafico.data.datasets[0]
            .backgroundColor[indice],

    fontColor:"#ffffff",

    color:"#ffffff",

    lineWidth:0,

    hidden:false,

    index:indice
};
                            }
                        );
                    }
                },

                onClick: (
                    evento,
                    item,
                    legenda
                ) => {
                    legenda.chart.toggleDataVisibility(
                        item.index
                    );

                    legenda.chart.update();
                }
            },

            title: {
                display: false,
                text: titulo
            },

            tooltip: {
                padding: 11,
                backgroundColor:
                    "rgba(3, 18, 37, 0.96)",
                borderColor:
                    "rgba(82, 163, 255, 0.3)",
                borderWidth: 1,

                callbacks: {
                    label: (contexto) => {
                        const valores =
                            contexto.dataset.data;

                        const total =
                            valores.reduce(
                                (soma, valor) =>
                                    soma +
                                    Number(valor || 0),
                                0
                            );

                        const valor =
                            Number(
                                contexto.raw || 0
                            );

                        const percentual =
                            total
                                ? valor /
                                    total *
                                    100
                                : 0;

                        return (
                            `${contexto.label}: ` +
                            `${formatarMoeda(valor)} ` +
                            `(${percentual.toLocaleString(
                                "pt-BR",
                                {
                                    minimumFractionDigits: 1,
                                    maximumFractionDigits: 1
                                }
                            )}%)`
                        );
                    }
                }
            }
        }
    };
}


/* ======================================================
   TEXTO CENTRAL DA ROSCA
   ====================================================== */

function pluginTextoCentralRosca(subtitulo) {
    return {
        id:
            `textoCentralRosca-${normalizarTexto(
                subtitulo
            ).replace(/\s+/g, "-")}`,

        afterDraw(grafico) {
            const contexto =
                grafico.ctx;

            const area =
                grafico.chartArea;

            if (!area) {
                return;
            }

            const valores =
                grafico.data.datasets[0].data;

            const total =
                valores.reduce(
                    (soma, valor) =>
                        soma +
                        Number(valor || 0),
                    0
                );

            const centroX =
                (
                    area.left +
                    area.right
                ) /
                2;

            const centroY =
                (
                    area.top +
                    area.bottom
                ) /
                2;

            contexto.save();

            contexto.textAlign = "center";
            contexto.textBaseline = "middle";

            contexto.fillStyle = "#ffffff";
            contexto.font =
                "700 15px Arial";

            contexto.fillText(
                formatarNumeroCompacto(total),
                centroX,
                centroY - 7
            );

            contexto.fillStyle = "#91abc9";
            contexto.font =
                "500 9px Arial";

            contexto.fillText(
                subtitulo,
                centroX,
                centroY + 12
            );

            contexto.restore();
        }
    };
}


/* ======================================================
   NOMES AMIGÁVEIS DOS BANCOS
   ====================================================== */

function nomeBancoAmigavel(nomeOriginal) {
    const nome =
        normalizarTexto(nomeOriginal);

    if (!nome || nome === "nao informado") {
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

    return String(
        nomeOriginal ||
        "Não informado"
    ).trim();
}


/* ======================================================
   MODAL DE DISTRIBUICAO DO TOP CLIENTES
   Reutiliza EXATAMENTE o Chart.js e os valores do card.
   Sem alterar calculos, filtros ou dados de outros modulos.
   ====================================================== */
function atualizarDetalheRoscaTopClientes() {
    const graficoOriginal = graficosFinanceiros.topClientesRosca;
    if (!graficoOriginal) return;

    const copiarTexto = (origemId, destinoId) => {
        const origem = document.getElementById(origemId);
        const destino = document.getElementById(destinoId);
        if (origem && destino) destino.textContent = origem.textContent;
    };
    copiarTexto("topClientesRoscaQuantidade", "modalTopClientesRoscaQuantidade");
    copiarTexto("topClientesRoscaTotal", "modalTopClientesRoscaTotal");
    copiarTexto("topClientesRoscaTotal", "modalTopClientesRoscaTotalCentro");
    copiarTexto("topClientesRoscaPercentual", "modalTopClientesRoscaPercentual");
    copiarTexto("topClientesRoscaNota", "modalTopClientesRoscaNota");

    const legendaOriginal = document.getElementById("legendaTopClientesRosca");
    const legendaModal = document.getElementById("modalLegendaTopClientesRosca");
    if (legendaOriginal && legendaModal) {
        legendaModal.replaceChildren(...Array.from(legendaOriginal.children, (item) => item.cloneNode(true)));
    }

    // A segunda renderizacao usa os mesmos labels, valores, cores e tooltip
    // do grafico original. Nao recalcula percentuais ou faz consultas extras.
    const dataset = graficoOriginal.data.datasets[0];
    const tooltip = graficoOriginal.config.options?.plugins?.tooltip;
    criarOuAtualizarGrafico("topClientesRoscaModal", "graficoTopClientesRoscaModal", {
        type: "doughnut",
        data: {
            labels: [...graficoOriginal.data.labels],
            datasets: [{
                ...dataset,
                data: [...dataset.data],
                backgroundColor: Array.isArray(dataset.backgroundColor)
                    ? [...dataset.backgroundColor] : dataset.backgroundColor,
                hoverBackgroundColor: Array.isArray(dataset.hoverBackgroundColor)
                    ? [...dataset.hoverBackgroundColor] : dataset.hoverBackgroundColor
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "72%",
            plugins: {
                legend: { display: false },
                tooltip: tooltip ? { ...tooltip } : { enabled: true }
            }
        }
    });
}

function configurarModalRoscaTopClientes() {
    const card = document.querySelector(".card-top-clientes-rosca");
    const overlay = document.getElementById("modalTopClientesRoscaOverlay");
    const modal = document.getElementById("modalTopClientesRosca");
    const botaoFechar = document.getElementById("btnFecharModalTopClientesRosca");
    if (!card || !overlay || !modal || !botaoFechar) return;
    if (card.dataset.modalRoscaConfigurado === "true") return;
    card.dataset.modalRoscaConfigurado = "true";

    let focoAnterior = null;
    let overflowAnterior = "";

    const abrir = () => {
        if (overlay.classList.contains("ativo")) return;
        focoAnterior = document.activeElement;
        overflowAnterior = document.body.style.overflow;
        overlay.classList.add("ativo");
        overlay.setAttribute("aria-hidden", "false");
        card.setAttribute("aria-expanded", "true");
        document.body.style.overflow = "hidden";
        botaoFechar.focus();
        // Renderizar apos tornar o canvas visivel evita a rosca com tamanho zero.
        requestAnimationFrame(() => {
            if (overlay.classList.contains("ativo")) atualizarDetalheRoscaTopClientes();
        });
    };

    const fechar = () => {
        if (!overlay.classList.contains("ativo")) return;
        overlay.classList.remove("ativo");
        overlay.setAttribute("aria-hidden", "true");
        card.setAttribute("aria-expanded", "false");
        document.body.style.overflow = overflowAnterior;
        if (focoAnterior && typeof focoAnterior.focus === "function") focoAnterior.focus();
    };

    card.addEventListener("click", abrir);
    card.addEventListener("keydown", (evento) => {
        if (evento.key === "Enter" || evento.key === " ") {
            evento.preventDefault();
            abrir();
        }
    });
    botaoFechar.addEventListener("click", fechar);
    overlay.addEventListener("click", (evento) => {
        if (evento.target === overlay) fechar();
    });
    document.addEventListener("keydown", (evento) => {
        if (!overlay.classList.contains("ativo")) return;
        if (evento.key === "Escape") {
            evento.preventDefault();
            fechar();
        } else if (evento.key === "Tab") {
            // A janela possui um único controle, mantém o foco dentro dela.
            evento.preventDefault();
            botaoFechar.focus();
        }
    });
}



/* ======================================================
   MODAL TOP CLIENTES — BARRAS AMPLIADAS
   Mesma base de dados do card, com nomes completos e lista auxiliar.
   ====================================================== */
function criarTooltipTopClientes(metricas) {
    return {
        mode: "nearest",
        intersect: true,
        padding: 12,
        backgroundColor: "rgba(3, 18, 37, 0.97)",
        borderColor: "rgba(39, 209, 127, 0.35)",
        borderWidth: 1,
        titleColor: "#ffffff",
        bodyColor: "#dbeafe",
        callbacks: {
            title: (itens) => {
                const indice = itens[0]?.dataIndex;
                return metricas[indice]?.cliente || "Cliente";
            },
            label: () => "",
            afterBody: (itens) => {
                const indice = itens[0]?.dataIndex;
                const dados = metricas[indice];
                if (!dados) return [];
                return [
                    `Total no cenário: ${formatarMoeda(dados.totalPago)}`,
                    `Quantidade de títulos: ${dados.quantidadePagamentos}`,
                    `Participação no Top: ${(Number(dados.participacao) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
                ];
            }
        }
    };
}

function atualizarDetalheBarrasTopClientes() {
    const graficoOriginal = graficosFinanceiros.topClientes;
    if (!graficoOriginal) return;

    const datasetOriginal = graficoOriginal.data?.datasets?.[0];
    const metricas = Array.isArray(datasetOriginal?.metricas) ? datasetOriginal.metricas.map((item) => ({ ...item })) : [];
    if (!metricas.length) return;

    const tituloOriginal = document.getElementById("tituloTopClientes")?.textContent?.trim() || "Top Clientes";
    const descricaoOriginal = document.getElementById("descricaoTopClientes")?.textContent?.trim() || "Clientes com maiores valores no cenário selecionado.";
    const quantidade = document.getElementById("limiteTopClientes")?.value || String(metricas.length);
    const totalTop = metricas.reduce((soma, item) => soma + Number(item.totalPago || 0), 0);

    preencherTexto("modalTopClientesBarrasTitulo", tituloOriginal);
    preencherTexto("modalTopClientesBarrasDescricao", descricaoOriginal);
    preencherTexto("modalTopClientesBarrasQuantidade", `Top ${quantidade}`);
    preencherTexto("modalTopClientesBarrasTotal", formatarMoeda(totalTop));
    preencherTexto("modalTopClientesBarrasNota", "Esta visão ampliada utiliza exatamente os mesmos dados exibidos no card Top Clientes.");

    const lista = document.getElementById("modalListaTopClientesBarras");
    if (lista) {
        lista.replaceChildren();
        const fragmento = document.createDocumentFragment();
        metricas.forEach((cliente, indice) => {
            const linha = document.createElement("div");
            linha.className = "top-clientes-rosca-item";
            linha.setAttribute("role", "listitem");
            const cor = document.createElement("span");
            cor.className = "top-clientes-rosca-cor";
            cor.style.background = Array.isArray(datasetOriginal.backgroundColor)
                ? (datasetOriginal.backgroundColor[indice] || "#27d17f")
                : "#27d17f";
            const nome = document.createElement("span");
            nome.className = "top-clientes-rosca-cliente";
            nome.textContent = cliente.cliente || "Não informado";
            const metrica = document.createElement("span");
            metrica.className = "top-clientes-rosca-metrica";
            const valor = document.createElement("strong");
            valor.textContent = formatarMoeda(cliente.totalPago || 0);
            const percentual = document.createElement("small");
            percentual.textContent = `${(Number(cliente.participacao) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
            metrica.append(valor, percentual);
            linha.append(cor, nome, metrica);
            fragmento.appendChild(linha);
        });
        lista.appendChild(fragmento);
    }

    const container = document.getElementById("graficoTopClientesModal")?.closest(".top-clientes-barras-modal-grafico");
    if (container) {
        container.style.height = `${Math.max(340, Math.min(760, 150 + metricas.length * 26))}px`;
    }

    const opcoes = opcoesGraficoHorizontal();
    opcoes.animation = false;
    opcoes.interaction = { mode: "nearest", intersect: true, axis: "xy" };
    opcoes.hover = { mode: "nearest", intersect: true, axis: "xy" };
    opcoes.layout = { padding: { right: 16 } };
    opcoes.scales.y.ticks.font = { size: 11, weight: "700" };
    opcoes.scales.x.ticks.font = { size: 10, weight: "600" };
    opcoes.plugins.tooltip = criarTooltipTopClientes(metricas);

    criarOuAtualizarGrafico("topClientesModal", "graficoTopClientesModal", {
        type: "bar",
        data: {
            labels: metricas.map((item) => item.cliente || "Não informado"),
            datasets: [{
                label: datasetOriginal.label || "Valor total",
                data: metricas.map((item) => Number(item.totalPago) || 0),
                metricas,
                backgroundColor: "#27d17f",
                hoverBackgroundColor: "#52e59e",
                borderRadius: 7,
                borderSkipped: false,
                maxBarThickness: 26
            }]
        },
        options: opcoes
    });
}

function configurarModalBarrasTopClientes() {
    const card = document.querySelector(".card-top-clientes-expansivel");
    const overlay = document.getElementById("modalTopClientesBarrasOverlay");
    const modal = document.getElementById("modalTopClientesBarras");
    const botaoFechar = document.getElementById("btnFecharModalTopClientesBarras");
    if (!card || !overlay || !modal || !botaoFechar) return;
    if (card.dataset.modalBarrasConfigurado === "true") return;
    card.dataset.modalBarrasConfigurado = "true";

    let focoAnterior = null;
    let overflowAnterior = "";

    const abrir = () => {
        if (overlay.classList.contains("ativo")) return;
        focoAnterior = document.activeElement;
        overflowAnterior = document.body.style.overflow;
        overlay.classList.add("ativo");
        overlay.setAttribute("aria-hidden", "false");
        card.setAttribute("aria-expanded", "true");
        document.body.style.overflow = "hidden";
        botaoFechar.focus();
        requestAnimationFrame(() => {
            if (overlay.classList.contains("ativo")) atualizarDetalheBarrasTopClientes();
        });
    };

    const fechar = () => {
        if (!overlay.classList.contains("ativo")) return;
        overlay.classList.remove("ativo");
        overlay.setAttribute("aria-hidden", "true");
        card.setAttribute("aria-expanded", "false");
        document.body.style.overflow = overflowAnterior;
        if (focoAnterior && typeof focoAnterior.focus === "function") focoAnterior.focus();
    };

    card.addEventListener("click", (evento) => {
        if (evento.target.closest("#limiteTopClientes") || evento.target.closest(".controle-ranking")) return;
        abrir();
    });
    card.addEventListener("keydown", (evento) => {
        const alvo = evento.target;
        const tag = alvo?.tagName?.toLowerCase();
        if (tag === "select" || tag === "option") return;
        if (evento.key === "Enter" || evento.key === " ") {
            evento.preventDefault();
            abrir();
        }
    });
    botaoFechar.addEventListener("click", fechar);
    overlay.addEventListener("click", (evento) => {
        if (evento.target === overlay) fechar();
    });
    document.addEventListener("keydown", (evento) => {
        if (!overlay.classList.contains("ativo")) return;
        if (evento.key === "Escape") {
            evento.preventDefault();
            fechar();
        } else if (evento.key === "Tab") {
            evento.preventDefault();
            botaoFechar.focus();
        }
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        configurarModalRoscaTopClientes();
        configurarModalBarrasTopClientes();
    }, { once: true });
} else {
    configurarModalRoscaTopClientes();
    configurarModalBarrasTopClientes();
}
