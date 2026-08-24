"use strict";

/* Aba Bancos e painel de detalhes. */

const CHAVE_SALDOS_DISPONIVEIS =
    "smart_financeiro_saldos_disponiveis_v1";

let bancoDetalheAtual = null;
const saldosDisponiveisAtuais = new Map();

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

    document.getElementById("btnSalvarSaldoInvestimento")
        ?.addEventListener("click", salvarSaldoInvestimentoAtual);
    document.getElementById("btnLimparSaldoInvestimento")
        ?.addEventListener("click", limparSaldoInvestimentoAtual);
    document.getElementById("inputSaldoInvestimento")
        ?.addEventListener("keydown", (evento) => {
            if (evento.key === "Enter") {
                evento.preventDefault();
                salvarSaldoInvestimentoAtual();
            }
        });

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


    preencherTexto("detalheBancoSaldo", formatarMoeda(saldosDisponiveisAtuais.get(obterChaveBancoSaldo(banco)) || 0));

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
    atualizarPainelSaldoInvestimento(banco);

    painel.classList.add("aberto");
    overlay.classList.add("ativo");

    painel.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow = "hidden";
}

function renderizarBancos(listaBancos = bancosFinanceiros) {
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

    listaBancos.forEach((banco) => {
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
                <span>Saldo disponível</span>
                <strong data-saldo-banco="${escaparHtml(obterChaveBancoSaldo(banco))}">${formatarMoeda(saldosDisponiveisAtuais.get(obterChaveBancoSaldo(banco)) || 0)}</strong>
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
        listaBancos.reduce(
            (total, banco) => total + Number(saldosDisponiveisAtuais.get(obterChaveBancoSaldo(banco)) || 0),
            0
        );

    if (saldoTotal) {
        saldoTotal.textContent =
            formatarMoeda(soma);
    }

    if (quantidade) {
        quantidade.textContent =
            `${listaBancos.length} bancos selecionados`;
    }

    carregarSaldosDisponiveisGerais(listaBancos);
}

async function carregarSaldosDisponiveisGerais(listaBancos = bancosFinanceiros) {
    await Promise.all(listaBancos.map(async (banco) => {
        try {
            const registros = await obterSaldosBanco(banco);
            const ultimo = registros[registros.length - 1];
            saldosDisponiveisAtuais.set(obterChaveBancoSaldo(banco), Number(ultimo?.valor || 0));
        } catch (erro) {
            console.warn("Saldo disponível não carregado:", banco.nome, erro);
        }
    }));
    listaBancos.forEach((banco) => {
        document.querySelectorAll(`[data-saldo-banco="${obterChaveBancoSaldo(banco)}"]`)
            .forEach((el) => el.textContent = formatarMoeda(saldosDisponiveisAtuais.get(obterChaveBancoSaldo(banco)) || 0));
    });
    atualizarSaldoDisponivelGeral(listaBancos);
}

function atualizarSaldoDisponivelGeral(listaBancos) {
    const selecionados = typeof bancosSelecionadosNoFiltro === "function" ? bancosSelecionadosNoFiltro() : null;
    const base = Array.isArray(listaBancos) ? listaBancos : bancosFinanceiros.filter((banco) => !selecionados || selecionados.has(banco.id));
    const total = base.reduce((soma, banco) => soma + Number(saldosDisponiveisAtuais.get(obterChaveBancoSaldo(banco)) || 0), 0);
    preencherTexto("kpiSaldoDisponivelGeral", formatarMoeda(total));
    preencherTexto("saldoBancarioTotal", formatarMoeda(total));
    preencherTexto("legendaSaldoDisponivelGeral", `${base.length} banco${base.length === 1 ? "" : "s"} selecionado${base.length === 1 ? "" : "s"}`);
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
        await carregarSaldosDisponiveisGerais(bancosFinanceiros);
        return;
    }

    salvarSaldoDisponivelLocal(
        chaveBanco,
        semana,
        valor
    );

    await atualizarPainelSaldoDisponivel(bancoDetalheAtual);
    await carregarSaldosDisponiveisGerais(bancosFinanceiros);
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
        await carregarSaldosDisponiveisGerais(bancosFinanceiros);
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

    semanaAtual.textContent = registroAtual
        ? `Registrado em ${formatarDataSaldo(registroAtual)}`
        : semana.rotulo;

    input.value =
        registroAtual
            ? formatarValorParaInputSaldo(registroAtual.valor)
            : "";

    saldoAtual.textContent =
        registroAtual
            ? formatarMoeda(registroAtual.valor)
            : "R$ 0,00";
    saldosDisponiveisAtuais.set(obterChaveBancoSaldo(banco), Number(registroAtual?.valor || registros[registros.length - 1]?.valor || 0));
    preencherTexto("detalheBancoSaldo", formatarMoeda(saldosDisponiveisAtuais.get(obterChaveBancoSaldo(banco)) || 0));

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
            <span>Comparado com ${formatarDataSaldo(anterior)}</span>
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
                        <span>${formatarDataSaldo(registro)}</span>
                        <strong>${formatarMoeda(registro.valor)}</strong>
                    </div>
                `)
                .join("")
            : "";
}

function bancoPossuiInvestimento(banco) {
    return ["sicoob-maxicredito", "sicoob-vale-sul"].includes(obterChaveBancoSaldo(banco));
}

function bancoInvestimentoVirtual(banco) {
    return { id: `${obterChaveBancoSaldo(banco)}__investimento`, nome: `${banco.nome} - Investimento` };
}

async function atualizarPainelSaldoInvestimento(banco) {
    const card = document.getElementById("saldoInvestimentoCard");
    if (!card) return;
    card.hidden = !bancoPossuiInvestimento(banco);
    if (card.hidden) return;
    const virtual = bancoInvestimentoVirtual(banco);
    let registros = [];
    try { registros = await obterSaldosBanco(virtual); } catch (erro) { registros = []; }
    preencherPainelInvestimento(registros);
}

function preencherPainelInvestimento(registros) {
    const semana = obterSemanaSaldoDisponivel();
    const atual = registros.find((r) => r.semana === semana.chave);
    const anteriores = registros.filter((r) => r.semana < semana.chave);
    const anterior = anteriores[anteriores.length - 1];
    const input = document.getElementById("inputSaldoInvestimento");
    if (input) input.value = atual ? formatarValorParaInputSaldo(atual.valor) : "";
    preencherTexto("saldoInvestimentoAtual", formatarMoeda(atual?.valor || 0));
    preencherTexto("saldoInvestimentoSemana", atual ? `Registrado em ${formatarDataSaldo(atual)}` : semana.rotulo);
    const comparativo = document.getElementById("saldoInvestimentoComparativo");
    if (comparativo) {
        comparativo.className = "saldo-disponivel-comparativo";
        if (!atual) comparativo.textContent = "Salve o saldo desta semana para iniciar o histórico.";
        else if (!anterior) comparativo.textContent = "Saldo salvo. Na próxima semana o painel mostrará a comparação.";
        else {
            const diferenca = atual.valor - anterior.valor;
            comparativo.className += ` ${diferenca >= 0 ? "positivo" : "negativo"}`;
            comparativo.innerHTML = `<span>Comparado com ${formatarDataSaldo(anterior)}</span><strong>${formatarMoeda(diferenca)}</strong>`;
        }
    }
    const historico = document.getElementById("saldoInvestimentoHistorico");
    if (historico) historico.innerHTML = registros.slice().reverse().map((r) => `<div class="saldo-disponivel-linha"><span>${formatarDataSaldo(r)}</span><strong>${formatarMoeda(r.valor)}</strong></div>`).join("");
}

async function salvarSaldoInvestimentoAtual() {
    if (!bancoDetalheAtual || !bancoPossuiInvestimento(bancoDetalheAtual)) return;
    const input = document.getElementById("inputSaldoInvestimento");
    const valor = converterValorSaldoDisponivel(input?.value);
    if (!Number.isFinite(valor)) { input?.classList.add("saldo-disponivel-erro"); input?.focus(); return; }
    input.classList.remove("saldo-disponivel-erro");
    const virtual = bancoInvestimentoVirtual(bancoDetalheAtual);
    const semana = obterSemanaSaldoDisponivel();
    if (window.financeiroSaldosFirestore?.salvarSaldoDisponivel) {
        await window.financeiroSaldosFirestore.salvarSaldoDisponivel({ bancoId: virtual.id, bancoNome: virtual.nome, semana: semana.chave, rotuloSemana: semana.rotulo, valor });
    } else salvarSaldoDisponivelLocal(virtual.id, semana, valor);
    await atualizarPainelSaldoInvestimento(bancoDetalheAtual);
}

async function limparSaldoInvestimentoAtual() {
    if (!bancoDetalheAtual || !bancoPossuiInvestimento(bancoDetalheAtual)) return;
    if (!window.confirm("Deseja limpar o saldo de investimento desta semana?")) return;
    const virtual = bancoInvestimentoVirtual(bancoDetalheAtual);
    const semana = obterSemanaSaldoDisponivel();
    if (window.financeiroSaldosFirestore?.excluirSaldoDisponivel) await window.financeiroSaldosFirestore.excluirSaldoDisponivel(virtual.id, semana.chave);
    else excluirSaldoDisponivelLocal(virtual.id, semana.chave);
    await atualizarPainelSaldoInvestimento(bancoDetalheAtual);
}

function formatarDataSaldo(registro) {
    const data = registro?.dataRegistro;

    if (typeof data === "string" && data) {
        const dataConvertida = new Date(data);

        if (!Number.isNaN(dataConvertida.getTime())) {
            return dataConvertida.toLocaleDateString("pt-BR");
        }
    }

    if (data?.toDate) {
        return data.toDate().toLocaleDateString("pt-BR");
    }

    if (registro?.atualizadoEm?.toDate) {
        return registro.atualizadoEm
            .toDate()
            .toLocaleDateString("pt-BR");
    }

    return registro?.rotuloSemana || "Data não informada";
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
