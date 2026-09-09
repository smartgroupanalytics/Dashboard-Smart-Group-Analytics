"use strict";

/* Importação manual de arquivos XLS/XLSX. */

function configurarImportacaoPlanilha() {
    const botao = document.getElementById("btnCarregarPlanilha");
    const input = document.getElementById("inputPlanilha");

    if (!botao || !input) return;

    botao.addEventListener("click", () => input.click());

    input.addEventListener("change", async () => {
        const arquivo = input.files?.[0];
        if (!arquivo) return;

        try {
            botao.disabled = true;
            atualizarStatusImportacao("Processando a planilha...", "");

            const resultado = await processarPlanilhaFinanceira(arquivo);

            lancamentosFinanceiros = resultado.lancamentos;
            bancosFinanceiros = resultado.bancos;

            if (typeof atualizarContasReceber === "function") {
                atualizarContasReceber(lancamentosFinanceiros);
            }

            if (typeof atualizarContasPagar === "function") {
                atualizarContasPagar(lancamentosFinanceiros);
            }

            if (typeof atualizarFluxoCaixa === "function") {
                atualizarFluxoCaixa(
                    lancamentosFinanceiros,
                    { redefinirPeriodo: true }
                );
            }

            preencherFiltrosComDados();
            preencherFiltroBancos(true);
            renderizarBancos();
            aplicarFiltrosDashboard();
            atualizarDataHora();

            atualizarStatusImportacao(
                `${resultado.quantidadeRegistros} registros importados: ` +
                `${resultado.quantidadeClientes} de clientes e ` +
                `${resultado.quantidadeFornecedores} de fornecedores.`,
                "sucesso"
            );
        } catch (erro) {
            console.error("Erro ao importar planilha:", erro);
            atualizarStatusImportacao(
                erro.message || "Não foi possível processar a planilha.",
                "erro"
            );
        } finally {
            botao.disabled = false;
            input.value = "";
        }
    });
}

async function processarPlanilhaFinanceira(arquivo) {
    if (typeof XLSX === "undefined") {
        throw new Error("A biblioteca de leitura do Excel não foi carregada.");
    }

    const dadosArquivo = await arquivo.arrayBuffer();
    const workbook = XLSX.read(dadosArquivo, {
        type: "array",
        cellDates: true
    });

    const nomeAba = workbook.SheetNames[0];
    if (!nomeAba) throw new Error("A planilha não possui nenhuma aba.");

    const worksheet = workbook.Sheets[nomeAba];
    const linhas = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
        raw: true
    });

    const indiceCabecalho = localizarCabecalhoFinanceiro(linhas);
    if (indiceCabecalho === -1) {
        throw new Error(
            'Cabeçalho não localizado. Verifique as colunas "Razão social", ' +
            '"Vlr.docto", "Vlr.líq.pago" e "Descr.Tp.cad".'
        );
    }

    const indices = localizarColunasCompletas(linhas[indiceCabecalho]);

    const registros = linhas
        .slice(indiceCabecalho + 1)
        .filter((linha) => linha.some((valor) =>
            valor !== "" && valor !== null && valor !== undefined
        ));

    const lancamentos = registros
        .map((linha, indice) => criarLancamento(linha, indices, indice + indiceCabecalho + 2))
        .filter(Boolean);

    if (!lancamentos.length) {
        throw new Error("Nenhum lançamento financeiro válido foi encontrado.");
    }

    const bancos = agruparBancosDosLancamentos(lancamentos);

    return {
        lancamentos,
        bancos,
        quantidadeRegistros: lancamentos.length,
        quantidadeBancos: bancos.length,
        quantidadeClientes: lancamentos.filter((item) => item.tipoCadastro === "cliente").length,
        quantidadeFornecedores: lancamentos.filter((item) => item.tipoCadastro === "fornecedor").length
    };
}

function atualizarStatusImportacao(
    mensagem,
    tipo
) {
    const container =
        document.getElementById("statusImportacao");

    const texto =
        document.getElementById(
            "textoStatusImportacao"
        );

    if (!container || !texto) {
        return;
    }

    container.hidden = false;

    container.classList.remove(
        "sucesso",
        "erro"
    );

    if (tipo) {
        container.classList.add(tipo);
    }

    texto.textContent = mensagem;
}

