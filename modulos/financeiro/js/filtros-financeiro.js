"use strict";

const filtroPessoas = {
    opcoes: [],
    selecionadas: new Set()
};

/* Filtros da Visão Geral. */

function configurarPainelFiltros() {
    const btnAbrir = document.getElementById("btnAbrirFiltros");
    const btnFechar = document.getElementById("btnFecharFiltros");
    const btnLimpar = document.getElementById("btnLimparFiltros");
    const painel = document.getElementById("painelFiltros");
    const overlay = document.getElementById("filtrosOverlay");
    const formulario = document.getElementById("formFiltros");

    if (!btnAbrir || !btnFechar || !painel || !overlay) return;

    configurarMultiselectPessoas();

    const abrir = () => {
        painel.classList.add("aberto");
        overlay.classList.add("ativo");
        painel.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    };

    const fechar = () => {
        painel.classList.remove("aberto");
        overlay.classList.remove("ativo");
        painel.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    };

    btnAbrir.addEventListener("click", abrir);
    btnFechar.addEventListener("click", fechar);
    overlay.addEventListener("click", fechar);

    if (btnLimpar && formulario) {
        btnLimpar.addEventListener("click", () => {
            formulario.reset();
            marcarTodasPessoas(false);
            aplicarFiltrosDashboard();
        });
    }

    if (formulario) {
        formulario.addEventListener("submit", (evento) => {
            evento.preventDefault();
            aplicarFiltrosDashboard();
            fechar();
        });
    }
}

function preencherFiltrosComDados() {
    preencherMultiselectPessoas(
        lancamentosFinanceiros.map((item) => item.razaoSocial)
    );
    preencherSelectUnico(
        "representante",
        lancamentosFinanceiros.map((item) => item.representante)
    );
    preencherSelectUnico(
        "planoFinanceiro",
        lancamentosFinanceiros.map((item) => item.planoFinanceiro)
    );
    preencherSelectUnico(
        "tipoDocumento",
        lancamentosFinanceiros.map((item) => item.tipoDocumento)
    );

    const datas = lancamentosFinanceiros
        .flatMap((item) => [item.dataPagamento, item.vencimento, item.dataMovimento])
        .filter(Boolean)
        .sort((a, b) => a - b);

    if (datas.length) {
        const inicio = document.getElementById("periodoInicio");
        const fim = document.getElementById("periodoFim");
        if (inicio) inicio.value = formatarDataInput(datas[0]);
        if (fim) fim.value = formatarDataInput(datas[datas.length - 1]);
    }
}

function configurarMultiselectPessoas() {
    const botao = document.getElementById("multiselectPessoasBotao");
    const painel = document.getElementById("multiselectPessoasPainel");
    const busca = document.getElementById("multiselectPessoasBusca");
    const marcar = document.getElementById("btnMarcarTodasPessoas");
    const desmarcar = document.getElementById("btnDesmarcarTodasPessoas");
    const todos = document.getElementById("checkboxTodasPessoas");

    if (!botao || !painel) return;

    botao.addEventListener("click", () => {
        const abrir = painel.hidden;
        painel.hidden = !abrir;
        botao.setAttribute("aria-expanded", String(abrir));

        if (abrir) {
            busca?.focus();
        }
    });

    busca?.addEventListener("input", renderizarListaPessoas);
    marcar?.addEventListener("click", () => marcarTodasPessoas());
    desmarcar?.addEventListener("click", () => desmarcarTodasPessoas());

    todos?.addEventListener("change", () => {
        if (todos.checked) {
            marcarTodasPessoas();
        } else {
            desmarcarTodasPessoas();
        }
    });

    document.addEventListener("click", (evento) => {
        const componente = document.getElementById("multiselectPessoas");

        if (
            componente &&
            !componente.contains(evento.target)
        ) {
            painel.hidden = true;
            botao.setAttribute("aria-expanded", "false");
        }
    });
}

function preencherMultiselectPessoas(valores) {
    const opcoes = [...new Set(
        valores
            .map((valor) => String(valor || "").trim())
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, "pt-BR"));

    filtroPessoas.opcoes = opcoes;
    filtroPessoas.selecionadas = new Set(opcoes);

    const busca = document.getElementById("multiselectPessoasBusca");
    if (busca) busca.value = "";

    renderizarListaPessoas();
    atualizarResumoPessoas();
}

function renderizarListaPessoas() {
    const lista = document.getElementById("multiselectPessoasLista");
    if (!lista) return;

    const busca = normalizarTexto(
        document.getElementById("multiselectPessoasBusca")?.value || ""
    );

    const visiveis = filtroPessoas.opcoes.filter((nome) => {
        return !busca || normalizarTexto(nome).includes(busca);
    });

    if (!visiveis.length) {
        lista.innerHTML =
            '<div class="multiselect-pessoas-vazio">Nenhum resultado encontrado.</div>';
        return;
    }

    lista.innerHTML = "";

    visiveis.forEach((nome, indice) => {
        const label = document.createElement("label");
        label.className = "multiselect-pessoas-item";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = filtroPessoas.selecionadas.has(nome);
        checkbox.id = `pessoaFiltro_${indice}`;

        const texto = document.createElement("span");
        texto.textContent = nome;

        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                filtroPessoas.selecionadas.add(nome);
            } else {
                filtroPessoas.selecionadas.delete(nome);
            }

            atualizarResumoPessoas();
        });

        label.appendChild(checkbox);
        label.appendChild(texto);
        lista.appendChild(label);
    });
}

function marcarTodasPessoas(renderizar = true) {
    filtroPessoas.selecionadas = new Set(filtroPessoas.opcoes);

    if (renderizar) {
        renderizarListaPessoas();
    }

    atualizarResumoPessoas();
}

function desmarcarTodasPessoas() {
    filtroPessoas.selecionadas.clear();
    renderizarListaPessoas();
    atualizarResumoPessoas();
}

function atualizarResumoPessoas() {
    const total = filtroPessoas.opcoes.length;
    const selecionadas = filtroPessoas.selecionadas.size;
    const resumo = document.getElementById("multiselectPessoasResumo");
    const contador = document.getElementById("multiselectPessoasContador");
    const todos = document.getElementById("checkboxTodasPessoas");

    if (todos) {
        todos.checked = total > 0 && selecionadas === total;
        todos.indeterminate = selecionadas > 0 && selecionadas < total;
    }

    if (resumo) {
        if (total === 0 || selecionadas === total) {
            resumo.textContent = "Todos";
        } else if (selecionadas === 0) {
            resumo.textContent = "Nenhum selecionado";
        } else {
            resumo.textContent = `${selecionadas} selecionados`;
        }
    }

    if (contador) {
        contador.textContent =
            selecionadas === total && total > 0
                ? `Todos selecionados (${total})`
                : `${selecionadas} de ${total} selecionados`;
    }
}

function preencherSelectUnico(id, valores) {
    const select = document.getElementById(id);
    if (!select) return;

    const primeiroTexto = select.options[0]?.textContent || "Todos";
    select.innerHTML = `<option value="">${escaparHtml(primeiroTexto)}</option>`;

    [...new Set(valores.filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
        .forEach((texto) => {
            const option = document.createElement("option");
            option.value = texto;
            option.textContent = texto;
            select.appendChild(option);
        });
}

function aplicarFiltrosDashboard() {
    const inicio = lerDataInput("periodoInicio");
    const fim = lerDataInput("periodoFim");
    const pessoasSelecionadas = filtroPessoas.selecionadas;
    const todasPessoasSelecionadas =
        filtroPessoas.opcoes.length > 0 &&
        pessoasSelecionadas.size === filtroPessoas.opcoes.length;

    const representante = document.getElementById("representante")?.value || "";
    const banco = document.getElementById("banco")?.value || "";
    const plano = document.getElementById("planoFinanceiro")?.value || "";
    const situacao = document.getElementById("situacao")?.value || "";
    const tipoDocumento = document.getElementById("tipoDocumento")?.value || "";

    lancamentosFiltrados = lancamentosFinanceiros.filter((item) => {
        const dataReferencia =
            item.dataPagamento || item.vencimento || item.dataMovimento;

        if (inicio && (!dataReferencia || dataReferencia < inicio)) return false;
        if (fim && (!dataReferencia || dataReferencia > fim)) return false;
        if (
            filtroPessoas.opcoes.length > 0 &&
            !todasPessoasSelecionadas &&
            !pessoasSelecionadas.has(item.razaoSocial)
        ) return false;

        if (representante && item.representante !== representante) return false;
        if (plano && item.planoFinanceiro !== plano) return false;
        if (situacao && item.situacao !== situacao) return false;
        if (tipoDocumento && item.tipoDocumento !== tipoDocumento) return false;

        if (banco) {
            const identidade = identificarBanco(item.banco, "");
            if (identidade.id !== banco) return false;
        }

        return true;
    });

    atualizarDashboardCompleto(lancamentosFiltrados);

    if (typeof aplicarFiltrosContasReceber === "function") {
        aplicarFiltrosContasReceber();
    }

    atualizarTextoPeriodo(inicio, fim);
}

function atualizarTextoPeriodo(inicio, fim) {
    const elemento = document.getElementById("periodoDashboard");
    if (!elemento) return;

    if (!lancamentosFinanceiros.length) {
        elemento.textContent = "Carregue uma planilha para visualizar os dados";
        return;
    }

    if (inicio && fim) {
        elemento.textContent =
            `Período: ${formatarDataBR(inicio)} a ${formatarDataBR(fim)}`;
    } else {
        elemento.textContent = "Todos os períodos disponíveis";
    }
}

function preencherFiltroBancos(limparAntes = false) {
    const select =
        document.getElementById("banco");

    if (!select) {
        return;
    }

    if (limparAntes) {
        select.innerHTML =
            '<option value="">Todos</option>';
    }

    bancosFinanceiros.forEach((banco) => {
        const option =
            document.createElement("option");

        option.value = banco.id;
        option.textContent = banco.nome;

        select.appendChild(option);
    });
}
