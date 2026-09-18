//-----------------------------------------------------
// CONFIGURAÇÃO DA API DE ESTOQUE
//-----------------------------------------------------

const URL_API_ESTOQUE =
"https://script.google.com/macros/s/AKfycbwYonNQTMjuZSmtN3c7oaweWCMIDPDu3nCxg9cEL4KzCqpJCUwPYUoee61ctLtDwzyiDQ/exec";


//-----------------------------------------------------
// VARIÁVEIS GLOBAIS
//-----------------------------------------------------

let dadosProdutos = [];
let dadosFiltrados = [];
let indiceLocaisPorProduto = new Map();

window.dadosProdutos = dadosProdutos;
window.dadosFiltrados = dadosFiltrados;

console.log("APP ESTOQUE INICIOU");


//-----------------------------------------------------
// CARREGAMENTO ESTÁVEL: CACHE + RETENTATIVAS + TRAVA
//-----------------------------------------------------

const CHAVE_CACHE_ESTOQUE = "smartgroup_estoque_dados_v2";
const CHAVE_CACHE_META_ESTOQUE = "smartgroup_estoque_meta_v2";
const TEMPO_CACHE_ESTOQUE = 20 * 60 * 1000;
const TEMPO_LIMITE_ESTOQUE = 45000;
const MAX_TENTATIVAS_ESTOQUE = 3;

let carregamentoEstoqueEmAndamento = false;

function salvarCacheEstoque(resultado) {

    if (!resultado || !Array.isArray(resultado.dados) || resultado.dados.length === 0) {
        return;
    }

    try {
        localStorage.setItem(
            CHAVE_CACHE_ESTOQUE,
            JSON.stringify(resultado.dados)
        );

        localStorage.setItem(
            CHAVE_CACHE_META_ESTOQUE,
            JSON.stringify({
                salvoEm: Date.now(),
                atualizadoEmISO: resultado.atualizadoEmISO || "",
                atualizadoEm: resultado.atualizadoEm || "",
                arquivoOrigem: resultado.arquivoOrigem || ""
            })
        );
    } catch (erro) {
        console.warn("Não foi possível salvar o cache do estoque:", erro);
    }
}

function carregarCacheEstoque() {

    try {
        const textoDados = localStorage.getItem(CHAVE_CACHE_ESTOQUE);
        const textoMeta = localStorage.getItem(CHAVE_CACHE_META_ESTOQUE);

        if (!textoDados) {
            return null;
        }

        const dados = JSON.parse(textoDados);
        const meta = textoMeta ? JSON.parse(textoMeta) : {};

        if (!Array.isArray(dados) || dados.length === 0) {
            throw new Error("Cache vazio ou inválido");
        }

        return { dados, meta };

    } catch (erro) {
        console.warn("Cache do estoque inválido. Será apagado:", erro);
        localStorage.removeItem(CHAVE_CACHE_ESTOQUE);
        localStorage.removeItem(CHAVE_CACHE_META_ESTOQUE);
        return null;
    }
}

function esperarEstoque(ms) {
    return new Promise(function (resolve) {
        setTimeout(resolve, ms);
    });
}

function carregarEstoqueJsonpUmaVez() {

    return new Promise(function (resolve, reject) {

        const nomeCallback =
            "receberDadosEstoque_" +
            Date.now() + "_" +
            Math.floor(Math.random() * 100000);

        const script = document.createElement("script");
        let finalizado = false;

        function finalizar() {
            removerScriptJsonp(script, nomeCallback);
        }

        const timeout = setTimeout(function () {
            if (finalizado) return;
            finalizado = true;
            finalizar();
            reject(new Error("Tempo limite ao acessar o estoque"));
        }, TEMPO_LIMITE_ESTOQUE);

        window[nomeCallback] = function (resultado) {
            if (finalizado) return;
            finalizado = true;
            clearTimeout(timeout);
            finalizar();
            resolve(resultado);
        };

        script.async = true;

        script.onerror = function () {
            if (finalizado) return;
            finalizado = true;
            clearTimeout(timeout);
            finalizar();
            reject(new Error("Falha de conexão com a API de estoque"));
        };

        script.src =
            URL_API_ESTOQUE +
            "?callback=" +
            encodeURIComponent(nomeCallback) +
            "&t=" +
            Date.now();

        document.body.appendChild(script);
    });
}

async function buscarEstoqueComRetentativas() {

    let ultimoErro = null;

    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_ESTOQUE; tentativa++) {

        try {
            console.log("Tentativa de estoque:", tentativa);
            return await carregarEstoqueJsonpUmaVez();
        } catch (erro) {
            ultimoErro = erro;
            console.warn("Tentativa " + tentativa + " falhou:", erro);

            if (tentativa < MAX_TENTATIVAS_ESTOQUE) {
                await esperarEstoque(tentativa * 1500);
            }
        }
    }

    throw ultimoErro || new Error("Não foi possível carregar o estoque");
}

async function carregarEstoqueAutomaticamente(opcoes) {

    opcoes = opcoes || {};
    const silencioso = opcoes.silencioso === true;

    if (carregamentoEstoqueEmAndamento) {
        console.log("Uma atualização do estoque já está em andamento.");
        return false;
    }

    carregamentoEstoqueEmAndamento = true;

    if (!silencioso && dadosProdutos.length === 0) {
        atualizarTextoCarregamento("⏳ Carregando dados do estoque...");
    }

    try {
        const resultado = await buscarEstoqueComRetentativas();

        if (!resultado || !Array.isArray(resultado.dados) || resultado.dados.length === 0) {
            throw new Error(
                resultado && resultado.mensagem
                    ? resultado.mensagem
                    : "A API não retornou dados válidos."
            );
        }

        prepararDadosEstoque(resultado.dados);
        salvarCacheEstoque(resultado);

        atualizarStatusRelatorio(
            resultado.atualizadoEmISO,
            resultado.atualizadoEm
        );

        console.log("Dados do estoque carregados do servidor:", resultado.dados.length);
        return true;

    } catch (erro) {
        console.error("Erro ao atualizar o estoque:", erro);

        if (dadosProdutos.length > 0) {
            atualizarTextoCarregamento(
                "🟠 Usando os últimos dados salvos — atualização indisponível"
            );
            return false;
        }

        mostrarErroCarregamento(
            "Não foi possível carregar o estoque. Tente novamente em alguns instantes."
        );
        return false;

    } finally {
        carregamentoEstoqueEmAndamento = false;
    }
}

async function iniciarEstoque() {

    const cache = carregarCacheEstoque();

    if (cache) {
        prepararDadosEstoque(cache.dados);

        atualizarStatusRelatorio(
            cache.meta.atualizadoEmISO,
            cache.meta.atualizadoEm
        );

        console.log("Estoque aberto pelo cache:", cache.dados.length);

        // O cache serve apenas para abrir o modulo rapidamente.
        // Sempre revalida no servidor em seguida para nao manter
        // um relatorio antigo preso no navegador apos recarregar a pagina.
        setTimeout(function () {
            carregarEstoqueAutomaticamente({ silencioso: true });
        }, 600);

        return;
    }

    await carregarEstoqueAutomaticamente();
}

//-----------------------------------------------------
// PREPARAR OS DADOS RECEBIDOS
//-----------------------------------------------------

function prepararDadosEstoque(dadosRecebidos) {

    dadosProdutos =
        dadosRecebidos.map(function (item) {

            const produto = {
                ...item
            };

            produto["Qtd.fisica"] =
                converterNumeroBrasileiro(
                    produto["Qtd.fisica"]
                );

            produto.Familia =
                obterFamilia(
                    produto["Desc.completa"]
                );

            return produto;
        });

    window.dadosProdutos =
        dadosProdutos;

    indiceLocaisPorProduto =
        criarIndiceLocais(
            dadosProdutos
        );

    window.indiceLocaisPorProduto =
        indiceLocaisPorProduto;

    const produtosAgrupados =
        agruparProdutos(
            dadosProdutos
        );

    dadosFiltrados =
        produtosAgrupados;

    window.dadosFiltrados =
        dadosFiltrados;

    carregarDashboard(
        produtosAgrupados
    );
}


//-----------------------------------------------------
// CONVERTER NÚMERO DO RELATÓRIO
//-----------------------------------------------------

function converterNumeroBrasileiro(valor) {

    if (
        typeof valor === "number"
    ) {
        return valor;
    }

    const texto =
        String(valor || "")
            .trim();

    if (!texto) {
        return 0;
    }

    const normalizado =
        texto
            .replace(/\./g, "")
            .replace(",", ".");

    const numero =
        Number(normalizado);

    return Number.isFinite(numero)
        ? numero
        : 0;
}


//-----------------------------------------------------
// CENTRAL DO DASHBOARD
//-----------------------------------------------------

function carregarDashboard(dadosAgrupados) {

    console.log(
        "CHEGOU NA CENTRAL DO ESTOQUE"
    );

    dadosFiltrados =
        dadosAgrupados;

    window.dadosFiltrados =
        dadosFiltrados;

    /*
    Os filtros Empresa e Local precisam ser
    preenchidos com os dados originais, pois os
    produtos agrupados podem não possuir todos
    os locais e empresas.
    */

    preencherFiltros(
        dadosProdutos
    );

    atualizarCards(
        dadosAgrupados
    );

    atualizarGraficoLocal(
        dadosAgrupados
    );

    atualizarGraficoFamilia(
        dadosAgrupados
    );

    atualizarTabela(
        dadosAgrupados
    );
}


//-----------------------------------------------------
// ÍNDICE DE LOCAIS POR PRODUTO
//-----------------------------------------------------

function criarIndiceLocais(dados) {

    const indice =
        new Map();

    dados.forEach(function (item) {

        const codigo =
            String(
                item.Produto || ""
            ).trim();

        if (!indice.has(codigo)) {

            indice.set(
                codigo,
                []
            );
        }

        indice
            .get(codigo)
            .push(item);
    });

    return indice;
}


//-----------------------------------------------------
// STATUS DE ATUALIZAÇÃO
//-----------------------------------------------------

function atualizarStatusRelatorio(dataISO, dataFormatada) {

    const elemento =
        document.getElementById("ultimaAtualizacao");

    if (!elemento) {
        return;
    }

    if (!dataISO) {
        elemento.textContent =
            dataFormatada
                ? "📅 " + dataFormatada + " — 🟢 Dados atualizados"
                : "⚠️ Data de atualização indisponível";

        return;
    }

    const dataAtualizacao = new Date(dataISO);

    if (Number.isNaN(dataAtualizacao.getTime())) {
        elemento.textContent =
            "📅 " + (dataFormatada || "--") +
            " — 🟢 Dados atualizados";

        return;
    }

    const dataExibicao =
        dataAtualizacao.toLocaleDateString("pt-BR");

    const agora = new Date();

    const diferencaMinutos =
        Math.max(
            0,
            Math.floor(
                (
                    agora.getTime() -
                    dataAtualizacao.getTime()
                ) / 60000
            )
        );

    if (diferencaMinutos < 60) {

        elemento.textContent =
            diferencaMinutos <= 1
                ? "📅 " + dataExibicao +
                  " — 🟢 Dados atualizados agora"
                : "📅 " + dataExibicao +
                  " — 🟢 Dados atualizados há " +
                  diferencaMinutos +
                  " minutos";

        return;
    }

    const diferencaHoras =
        Math.floor(diferencaMinutos / 60);

    const minutosRestantes =
        diferencaMinutos % 60;

    elemento.textContent =
        "📅 " + dataExibicao +
        " — 🔴 Relatório desatualizado há " +
        diferencaHoras +
        (diferencaHoras === 1 ? " hora" : " horas") +
        (
            minutosRestantes > 0
                ? " e " + minutosRestantes + " minutos"
                : ""
        );
}

//-----------------------------------------------------
// MENSAGENS DE CARREGAMENTO
//-----------------------------------------------------

function atualizarTextoCarregamento(
    mensagem
) {

    const elemento =
        document.getElementById(
            "ultimaAtualizacao"
        );

    if (elemento) {

        elemento.textContent =
            mensagem;
    }
}


function mostrarErroCarregamento(
    mensagem
) {

    console.error(
        "Erro ao carregar estoque:",
        mensagem
    );

    atualizarTextoCarregamento(
        "🔴 Erro ao carregar os dados"
    );

    const ranking =
        document.getElementById(
            "rankingTopProdutos"
        );

    if (ranking) {

        ranking.innerHTML =
            '<div class="sem-dados">' +
            mensagem +
            "</div>";
    }
}


//-----------------------------------------------------
// LIMPEZA DO JSONP
//-----------------------------------------------------

function removerScriptJsonp(
    script,
    nomeCallback
) {

    if (
        script &&
        script.parentNode
    ) {

        script.parentNode.removeChild(
            script
        );
    }

    try {

        delete window[nomeCallback];

    } catch (erro) {

        window[nomeCallback] =
            undefined;
    }
}


//-----------------------------------------------------
// EVENTOS DOS FILTROS
//-----------------------------------------------------

document
    .getElementById(
        "pesquisaProduto"
    )
    .addEventListener(
        "input",
        aplicarFiltrosTabela
    );


document
    .getElementById(
        "filtroEmpresa"
    )
    .addEventListener(
        "change",
        aplicarFiltrosTabela
    );


document
    .getElementById(
        "filtroLocal"
    )
    .addEventListener(
        "change",
        aplicarFiltrosTabela
    );


//-----------------------------------------------------
// INICIAR AUTOMATICAMENTE
//-----------------------------------------------------

document.addEventListener(
    "DOMContentLoaded",
    iniciarEstoque
);

setInterval(function () {
    carregarEstoqueAutomaticamente({ silencioso: true });
}, TEMPO_CACHE_ESTOQUE);

console.log(
    "APP.JS DO ESTOQUE CARREGADO"
);
