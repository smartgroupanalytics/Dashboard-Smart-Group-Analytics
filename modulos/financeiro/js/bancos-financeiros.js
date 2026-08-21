"use strict";

/* Aba Bancos e painel de detalhes. */

const CHAVE_SALDOS_DISPONIVEIS =
    "smart_financeiro_saldos_disponiveis_v1";

let bancoDetalheAtual = null;

function configurarPainelBanco() {
    const painel =
        document.getElementById("painelBanco");

    const overlay =
        document.getElementById("bancoOverlay");

    const btnFechar =
        document.getElementById("btnFecharBanco");

    if (!painel || !overlay || !btnFechar) {
        return;
    }

    function fecharPainelBanco() {
        painel.classList.remove("aberto");
        overlay.classList.remove("ativo");

        painel.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.style.overflow = "";
    }

    btnFechar.addEventListener(
        "click",
        fecharPainelBanco
    );

    overlay.addEventListener(
        "click",
        fecharPainelBanco
    );

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape") {
            fecharPainelBanco();
        }
    });

    const btnSalvar =
        document.getElementById("btnSalvarSaldoDisponivel");

    const btnLimpar =
        document.getElementById("btnLimparSaldoDisponivel");

    const inputSaldo =
        document.getElementById("inputSaldoDisponivel");

    if (btnSalvar) {
        btnSalvar.addEventListener("click", salvarSaldoDisponivelAtual);
    }

    if (btnLimpar) {
        btnLimpar.addEventListener("click", limparSaldoDisponivelAtual);
    }

    if (inputSaldo) {
        inputSaldo.addEventListener("keydown", (evento) => {
            if (evento.key === "Enter") {
                evento.preventDefault();
                salvarSaldoDisponivelAtual();
            }
        });
    }
}

function abrirDetalhesBanco(banco) {
    const painel =
        document.getElementById("painelBanco");

    const overlay =
        document.getElementById("bancoOverlay");

    if (!painel || !overlay) {
        return;
    }

    bancoDetalheAtual = banco;

    preencherTexto(
        "detalheBancoNome",
        banco.nome
    );


    preencherTexto(
        "detalheBancoSaldo",
        formatarMoeda(banco.saldo)
    );

    preencherTexto(
        "detalheBancoRecebido",
        formatarMoeda(banco.totalRecebido)
    );

    preencherTexto(
        "detalheBancoPago",
        formatarMoeda(banco.totalPago)
    );

    preencherTexto(
        "detalheBancoAberto",
        formatarMoeda(banco.emAberto)
    );

    preencherTexto(
        "detalheBancoAtraso",
        formatarMoeda(banco.emAtraso)
    );

    const logo =
        document.getElementById("detalheBancoLogo");

    if (logo) {
        logo.innerHTML = criarLogoBanco(banco, "grande");
    }

    atualizarPainelSaldoDisponivel(banco);

    painel.classList.add("aberto");
    overlay.classList.add("ativo");

    painel.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow = "hidden";
}

function renderizarBancos() {
    const grade =
        document.getElementById("gradeBancos");

    const saldoTotal =
        document.getElementById("saldoBancarioTotal");

    const quantidade =
        document.getElementById("quantidadeContas");

    if (!grade) {
        return;
    }

    grade.innerHTML = "";

    bancosFinanceiros.forEach((banco) => {
        const card =
            document.createElement("button");

        card.type = "button";
        card.className = "card-banco";

        card.innerHTML = `
            <div class="card-banco-topo">
                <div class="banco-identidade">
                    <div class="banco-logo">
                        ${criarLogoBanco(banco)}
                    </div>

                    <div>
                        <h3>${escaparHtml(banco.nome)}</h3>
                        <p>Movimentações consolidadas</p>
                    </div>
                </div>

                <i class="fa-solid fa-chevron-right card-banco-seta"></i>
            </div>


            <div class="banco-saldo">
                <span>Total movimentado</span>
                <strong>${formatarMoeda(banco.saldo)}</strong>
            </div>

            <div class="banco-rodape">
                <span>
                    <i class="fa-solid fa-arrow-trend-up"></i>
                    Recebido: ${formatarMoeda(banco.totalRecebido)}
                </span>
            </div>
        `;

        card.addEventListener("click", () => {
            abrirDetalhesBanco(banco);
        });

        grade.appendChild(card);
    });

    const soma =
        bancosFinanceiros.reduce(
            (total, banco) => total + Number(banco.saldo || 0),
            0
        );

    if (saldoTotal) {
        saldoTotal.textContent =
            formatarMoeda(soma);
    }

    if (quantidade) {
        quantidade.textContent =
            `${bancosFinanceiros.length} bancos carregados`;
    }
}

function criarLogoBanco(banco, tamanho = "normal") {
    const classe =
        tamanho === "grande"
            ? "logo-banco-imagem logo-banco-imagem-grande"
            : "logo-banco-imagem";

    const sigla =
        escaparHtml(banco.sigla || "BK");

    const cor =
        escaparHtml(banco.cor || "#1683ff");

    const caminho =
        escaparHtml(banco.logo || "");

    return `
        <img
            src="${caminho}"
            alt="Logotipo ${escaparHtml(banco.nome)}"
            class="${classe}"
            onerror="
                this.style.display='none';
                this.nextElementSibling.style.display='flex';
            "
        >

        <span
            class="logo-banco-fallback"
            style="--cor-banco: ${cor};"
        >
            ${sigla}
        </span>
    `;
}

async function salvarSaldoDisponivelAtual() {
    if (!bancoDetalheAtual) {
        return;
    }

    const input =
        document.getElementById("inputSaldoDisponivel");

    if (!input) {
        return;
    }

    const valor =
        converterValorSaldoDisponivel(input.value);

    if (!Number.isFinite(valor)) {
        input.classList.add("saldo-disponivel-erro");
        input.focus();
        return;
    }

    input.classList.remove("saldo-disponivel-erro");

    const chaveBanco =
        obterChaveBancoSaldo(bancoDetalheAtual);

    const semana =
        obterSemanaSaldoDisponivel();

    if (window.financeiroSaldosFirestore?.salvarSaldoDisponivel) {
        await window.financeiroSaldosFirestore.salvarSaldoDisponivel({
            bancoId: chaveBanco,
            bancoNome: bancoDetalheAtual.nome,
            semana: semana.chave,
            rotuloSemana: semana.rotulo,
            valor
        });

        await atualizarPainelSaldoDisponivel(bancoDetalheAtual);
        return;
    }

    salvarSaldoDisponivelLocal(
        chaveBanco,
        semana,
        valor
    );

    await atualizarPainelSaldoDisponivel(bancoDetalheAtual);
}

async function limparSaldoDisponivelAtual() {
    if (!bancoDetalheAtual) {
        return;
    }

    const confirmar =
        window.confirm(
            "Deseja limpar o saldo disponível desta semana para este banco?"
        );

    if (!confirmar) {
        return;
    }

    const chaveBanco =
        obterChaveBancoSaldo(bancoDetalheAtual);

    const semana =
        obterSemanaSaldoDisponivel();

    try {
        if (window.financeiroSaldosFirestore?.excluirSaldoDisponivel) {
            await window.financeiroSaldosFirestore.excluirSaldoDisponivel(
                chaveBanco,
                semana.chave
            );
        } else {
            excluirSaldoDisponivelLocal(chaveBanco, semana.chave);
        }

        await atualizarPainelSaldoDisponivel(bancoDetalheAtual);
    } catch (erro) {
        const comparativo =
            document.getElementById("saldoDisponivelComparativo");

        if (comparativo) {
            comparativo.className = "saldo-disponivel-comparativo negativo";
            comparativo.textContent =
                "Não foi possível limpar o saldo no Firebase.";
        }
    }
}

function salvarSaldoDisponivelLocal(chaveBanco, semana, valor) {
    const saldos =
        carregarSaldosDisponiveisLocais();

    const registrosBanco =
        saldos[chaveBanco] || [];

    const indiceSemana =
        registrosBanco.findIndex((registro) => registro.semana === semana.chave);

    const registro = {
        semana: semana.chave,
        rotuloSemana: semana.rotulo,
        valor,
        dataRegistro: new Date().toISOString()
    };

    if (indiceSemana >= 0) {
        registrosBanco[indiceSemana] = registro;
    } else {
        registrosBanco.push(registro);
    }

    saldos[chaveBanco] =
        registrosBanco
            .sort((a, b) => a.semana.localeCompare(b.semana))
            .slice(-12);

    localStorage.setItem(CHAVE_SALDOS_DISPONIVEIS, JSON.stringify(saldos));
}

function excluirSaldoDisponivelLocal(chaveBanco, semanaChave) {
    const saldos =
        carregarSaldosDisponiveisLocais();

    saldos[chaveBanco] =
        (saldos[chaveBanco] || []).filter((registro) => {
            return registro.semana !== semanaChave;
        });

    localStorage.setItem(CHAVE_SALDOS_DISPONIVEIS, JSON.stringify(saldos));
}

async function atualizarPainelSaldoDisponivel(banco) {
    const input =
        document.getElementById("inputSaldoDisponivel");

    const saldoAtual =
        document.getElementById("saldoDisponivelAtual");

    const semanaAtual =
        document.getElementById("saldoDisponivelSemana");

    const comparativo =
        document.getElementById("saldoDisponivelComparativo");

    const historico =
        document.getElementById("saldoDisponivelHistorico");

    if (!input || !saldoAtual || !semanaAtual || !comparativo || !historico) {
        return;
    }

    const semana =
        obterSemanaSaldoDisponivel();

    let registros = [];

    try {
        registros = await obterSaldosBanco(banco);
    } catch (erro) {
        comparativo.className = "saldo-disponivel-comparativo negativo";
        comparativo.textContent =
            "Não foi possível carregar o saldo compartilhado do Firebase.";
        historico.innerHTML = "";
        return;
    }

    const registroAtual =
        registros.find((registro) => registro.semana === semana.chave);

    const registrosAnteriores =
        registros.filter((registro) => registro.semana < semana.chave);

    const anterior =
        registrosAnteriores[registrosAnteriores.length - 1];

    semanaAtual.textContent =
        semana.rotulo;

    input.value =
        registroAtual
            ? formatarValorParaInputSaldo(registroAtual.valor)
            : "";

    saldoAtual.textContent =
        registroAtual
            ? formatarMoeda(registroAtual.valor)
            : "R$ 0,00";

    if (!registroAtual) {
        comparativo.className = "saldo-disponivel-comparativo";
        comparativo.textContent =
            "Salve o saldo desta semana para iniciar o histórico.";
    } else if (!anterior) {
        comparativo.className = "saldo-disponivel-comparativo neutro";
        comparativo.textContent =
            "Saldo salvo. Na próxima semana o painel mostrará a comparação.";
    } else {
        const diferenca =
            registroAtual.valor - anterior.valor;

        const percentual =
            anterior.valor !== 0
                ? (diferenca / Math.abs(anterior.valor)) * 100
                : 0;

        comparativo.className =
            `saldo-disponivel-comparativo ${diferenca >= 0 ? "positivo" : "negativo"}`;

        comparativo.innerHTML = `
            <span>Comparado com ${escaparHtml(anterior.rotuloSemana)}</span>
            <strong>${formatarMoeda(diferenca)}</strong>
            <small>${diferenca >= 0 ? "+" : ""}${percentual.toFixed(2).replace(".", ",")}%</small>
        `;
    }

    historico.innerHTML =
        registros.length
            ? registros
                .slice()
                .reverse()
                .map((registro) => `
                    <div class="saldo-disponivel-linha">
                        <span>${escaparHtml(registro.rotuloSemana)}</span>
                        <strong>${formatarMoeda(registro.valor)}</strong>
                    </div>
                `)
                .join("")
            : "";
}

async function obterSaldosBanco(banco) {
    const chaveBanco =
        obterChaveBancoSaldo(banco);

    if (window.financeiroSaldosFirestore?.listarSaldosBanco) {
        return window.financeiroSaldosFirestore.listarSaldosBanco(chaveBanco);
    }

    const saldos =
        carregarSaldosDisponiveisLocais();

    return saldos[chaveBanco] || [];
}

function carregarSaldosDisponiveisLocais() {
    try {
        return JSON.parse(
            localStorage.getItem(CHAVE_SALDOS_DISPONIVEIS) || "{}"
        ) || {};
    } catch (erro) {
        return {};
    }
}

function obterChaveBancoSaldo(banco) {
    return banco.id || gerarIdentificador(banco.nome || "banco");
}

function obterSemanaSaldoDisponivel(dataBase = new Date()) {
    const data =
        new Date(
            dataBase.getFullYear(),
            dataBase.getMonth(),
            dataBase.getDate()
        );

    const diaSemana =
        data.getDay() || 7;

    data.setDate(data.getDate() + 4 - diaSemana);

    const inicioAno =
        new Date(data.getFullYear(), 0, 1);

    const semana =
        Math.ceil((((data - inicioAno) / 86400000) + 1) / 7);

    const ano =
        data.getFullYear();

    return {
        chave: `${ano}-S${String(semana).padStart(2, "0")}`,
        rotulo: `Semana ${String(semana).padStart(2, "0")}/${ano}`
    };
}

function converterValorSaldoDisponivel(valor) {
    const texto =
        String(valor || "")
            .trim()
            .replace(/\s/g, "")
            .replace(/R\$/gi, "");

    if (!texto) {
        return NaN;
    }

    const normalizado =
        texto
            .replace(/\./g, "")
            .replace(",", ".");

    const numero =
        Number(normalizado);

    return Number.isFinite(numero)
        ? numero
        : NaN;
}

function formatarValorParaInputSaldo(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
