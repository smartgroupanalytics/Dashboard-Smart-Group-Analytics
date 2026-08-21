import { auth, db } from "../../../firebase-config.js";

import {
    collection,
    doc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    where
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const COLECAO_SALDOS =
    "financeiro_saldos_disponiveis";

window.financeiroSaldosFirestore = {
    listarSaldosBanco,
    salvarSaldoDisponivel
};

async function listarSaldosBanco(bancoId) {
    const consulta =
        query(
            collection(db, COLECAO_SALDOS),
            where("bancoId", "==", bancoId),
            orderBy("semana", "asc"),
            limit(12)
        );

    const resultado =
        await getDocs(consulta);

    return resultado.docs.map((documento) => {
        const dados = documento.data();

        return {
            semana: dados.semana,
            rotuloSemana: dados.rotuloSemana,
            valor: Number(dados.valor || 0),
            dataRegistro: dados.dataRegistro || ""
        };
    });
}

async function salvarSaldoDisponivel({
    bancoId,
    bancoNome,
    semana,
    rotuloSemana,
    valor
}) {
    const usuario =
        auth.currentUser;

    if (!usuario) {
        throw new Error("Usuário não autenticado.");
    }

    const idDocumento =
        `${bancoId}_${semana}`;

    await setDoc(
        doc(db, COLECAO_SALDOS, idDocumento),
        {
            bancoId,
            bancoNome,
            semana,
            rotuloSemana,
            valor: Number(valor || 0),
            atualizadoPorUid: usuario.uid,
            atualizadoPorEmail: usuario.email || "",
            atualizadoEm: serverTimestamp()
        },
        { merge: true }
    );
}
