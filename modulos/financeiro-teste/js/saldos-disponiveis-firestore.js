"use strict";

/*
 * AMBIENTE DE TESTE
 * Esta cópia NÃO grava, altera ou exclui dados no Firestore de produção.
 * Os saldos usados durante os testes ficam somente no localStorage deste navegador.
 */

const CHAVE_SALDOS_TESTE = "smart_financeiro_teste_saldos_firestore_v1";

window.financeiroSaldosFirestore = {
    listarSaldosBanco,
    salvarSaldoDisponivel,
    excluirSaldoDisponivel
};

function carregarBaseTeste() {
    try {
        return JSON.parse(localStorage.getItem(CHAVE_SALDOS_TESTE) || "{}") || {};
    } catch (erro) {
        return {};
    }
}

function salvarBaseTeste(base) {
    localStorage.setItem(CHAVE_SALDOS_TESTE, JSON.stringify(base));
}

async function listarSaldosBanco(bancoId) {
    const base = carregarBaseTeste();

    return (base[bancoId] || [])
        .slice()
        .sort((a, b) => String(a.semana).localeCompare(String(b.semana)))
        .slice(-12);
}

async function salvarSaldoDisponivel({
    bancoId,
    bancoNome,
    semana,
    rotuloSemana,
    valor
}) {
    const base = carregarBaseTeste();
    const registros = base[bancoId] || [];
    const indice = registros.findIndex((registro) => registro.semana === semana);

    const registro = {
        bancoId,
        bancoNome,
        semana,
        rotuloSemana,
        valor: Number(valor || 0),
        dataRegistro: new Date().toISOString(),
        ambiente: "teste-local"
    };

    if (indice >= 0) {
        registros[indice] = registro;
    } else {
        registros.push(registro);
    }

    base[bancoId] = registros
        .sort((a, b) => String(a.semana).localeCompare(String(b.semana)))
        .slice(-12);

    salvarBaseTeste(base);
}

async function excluirSaldoDisponivel(bancoId, semana) {
    const base = carregarBaseTeste();

    base[bancoId] = (base[bancoId] || []).filter((registro) => {
        return registro.semana !== semana;
    });

    salvarBaseTeste(base);
}
