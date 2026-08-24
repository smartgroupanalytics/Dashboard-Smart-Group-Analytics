// ================================
// SMART GROUP ANALYTICS
// APP.JS
// ================================

function abrirModulo(modulo, elemento){

const mapaPermissoes = {
    dashboard: "dashboard",
    estoque: "estoque",
    vendas: "vendas",
    financeiro: "financeiro",
    compras: "compras",
    "analise-comercial": "analise-comercial",
    comex: "comex",
    rh: "rh",
    assinaturas: "assinaturas",
    usuarios: "usuarios",
    permissoes: "usuarios",
    logs: "usuarios",
    configuracoes: "configuracoes",
    "minha-conta": null
};
        
    const permissaoNecessaria =
        mapaPermissoes[modulo];

    if (
        permissaoNecessaria &&
        typeof window.usuarioPodeAcessar === "function" &&
        !window.usuarioPodeAcessar(permissaoNecessaria)
    ) {
        alert("Você não possui permissão para acessar este módulo.");
        return;
    }

    // Remove o menu ativo
    document.querySelectorAll(".menu a").forEach(item=>{
        item.classList.remove("active");
    });

    elemento.classList.add("active");

    const titulo =
        document.getElementById("tituloPagina");

    const subtitulo =
        document.getElementById("subtituloPagina");

    const conteudo =
        document.getElementById("conteudo");

    switch(modulo){

        case "dashboard":

            titulo.innerText="Dashboard";

            subtitulo.innerText=
            "Visão geral do Smart Group Analytics";

            location.reload();

        break;

case "estoque":

    titulo.innerText = "Estoque Comercial";

    subtitulo.innerText =
    "Controle inteligente dos estoques.";

    conteudo.innerHTML = `
        <iframe 
            src="modulos/estoque/index.html?v=8"
            class="iframe-modulo">
        </iframe>
    `;

break;

     case "vendas":

    titulo.innerText = "Dashboard Comercial";

    subtitulo.innerText =
    "Faturamento, clientes e produtos.";

    conteudo.innerHTML = `
        <iframe 
            src="modulos/vendas/index.html"
            class="iframe-modulo">
        </iframe>
    `;

break;

            case "financeiro":

    titulo.innerText = "Financeiro";

    subtitulo.innerText =
    "Gestão financeira, recebimentos e fluxo de caixa.";

    conteudo.innerHTML = `
        <iframe
            src="modulos/financeiro/index.html?v=3"
            class="iframe-modulo"
            title="Módulo Financeiro"
            frameborder="0">
        </iframe>
    `;

break;

 case "compras":

    titulo.innerText = "Compras e Suprimentos";

    subtitulo.innerText =
    "Análise integrada de estoque, compras, consumo e produção.";

    conteudo.innerHTML = `
        <iframe
            src="modulos/compras/index.html?v=1"
            class="iframe-modulo"
            title="Módulo Compras e Suprimentos"
            frameborder="0">
        </iframe>
    `;

break;

case "analise-comercial":

    titulo.innerText = "Análise Integrada Comercial";

    subtitulo.innerText =
    "Estoque, vendas, consumo, produção e carteira comercial.";

    conteudo.innerHTML = `
        <iframe
            src="modulos/analise-comercial/index.html?v=2"
            class="iframe-modulo"
            title="Módulo Análise Integrada Comercial"
            frameborder="0">
        </iframe>
    `;

break;

case "comex":

    titulo.innerText = "COMEX";

    subtitulo.innerText =
    "Gestão de importações e entregas por material.";

    conteudo.innerHTML = `
        <iframe
            src="modulos/comex/index.html?v=1"
            class="iframe-modulo"
            title="Módulo COMEX"
            frameborder="0">
        </iframe>
    `;

break;

case "rh":

    titulo.innerText = "Recursos Humanos";

    subtitulo.innerText =
    "Perfis, treinamentos e matriz de habilidades.";

    conteudo.innerHTML = `
        <iframe
            src="modulos/rh/index.html?v=1"
            class="iframe-modulo"
            title="Módulo de Recursos Humanos"
            frameborder="0">
        </iframe>
    `;

break;


case "assinaturas":

    titulo.innerText = "Assinaturas e Licenças";

    subtitulo.innerText =
    "Controle de vencimentos, custos, licenças e renovações.";

    conteudo.innerHTML = `
        <iframe
            src="modulos/assinaturas/index.html?v=1"
            class="iframe-modulo"
            title="Módulo Assinaturas e Licenças"
            frameborder="0">
        </iframe>
    `;

break;


 case "usuarios":

    titulo.innerText = "Usuários";

    subtitulo.innerText =
    "Gerenciamento de usuários.";

    conteudo.innerHTML = `
        <iframe
            src="usuarios/index.html?v=4"
            class="iframe-modulo"
            title="Gerenciamento de Usuários">
        </iframe>
    `;

break;

// =====================================================
// MINHA CONTA
// =====================================================

case "minha-conta":

    titulo.innerText = "Minha Conta";

    subtitulo.innerText =
    "Dados e informações do usuário conectado.";

    conteudo.innerHTML = `
        <iframe
            src="minha-conta/index.html?v=1"
            class="iframe-modulo"
            title="Minha Conta">
        </iframe>
    `;

break;
                    
                    

        case "permissoes":

            titulo.innerText="Permissões";

            subtitulo.innerText=
            "Perfis de acesso.";

            conteudo.innerHTML=`
            
            <div class="loading-dashboard">

                <i class="fa-solid fa-shield-halved"></i>

                <h2>Perfis e Permissões</h2>

            </div>

            `;

        break;

        case "logs":

            titulo.innerText="Logs";

            subtitulo.innerText=
            "Histórico do sistema.";

            conteudo.innerHTML=`
            
            <div class="loading-dashboard">

                <i class="fa-solid fa-file-lines"></i>

                <h2>Logs de acesso</h2>

            </div>

            `;

        break;

        case "configuracoes":

            titulo.innerText="Configurações";

            subtitulo.innerText=
            "Configurações gerais.";

            conteudo.innerHTML=`
            
            <div class="loading-dashboard">

                <i class="fa-solid fa-gear"></i>

                <h2>Configurações</h2>

            </div>

            `;

        break;

    }

}

function alternarTelaCheia(){

    document.body.classList.toggle("modo-fullscreen");

    const icone =
        document.getElementById("iconeFullscreen");

    if(!icone) return;

    if(document.body.classList.contains("modo-fullscreen")){

        icone.classList.remove("fa-expand");
        icone.classList.add("fa-xmark");

    } else {

        icone.classList.remove("fa-xmark");
        icone.classList.add("fa-expand");

    }

}

function usuarioPodeVerCardDashboard(modulo) {

    if (
        typeof window.usuarioPodeAcessar !== "function"
    ) {
        return false;
    }

    return window.usuarioPodeAcessar(modulo);
}


function criarCardDashboard({
    modulo,
    icone,
    titulo,
    descricao
}) {

    if (!usuarioPodeVerCardDashboard(modulo)) {
        return "";
    }

    return `
        <div
            class="card-home"
            data-modulo="${modulo}"
            role="button"
            tabindex="0"
            onclick="abrirModulo(
                '${modulo}',
                document.querySelector(
                    '.menu a[data-modulo=&quot;${modulo}&quot;]'
                )
            )"
        >
            <i class="${icone}"></i>

            <h3>
                ${titulo}
            </h3>

            <p>
                ${descricao}
            </p>
        </div>
    `;
}


function gerarCardsDashboardPermitidos() {

    const cards = [
        {
            modulo: "estoque",
            icone: "fa-solid fa-cube",
            titulo: "Estoque Comercial",
            descricao:
                "Acompanhe saldos, locais e famílias de materiais."
        },
        {
            modulo: "vendas",
            icone: "fa-solid fa-chart-line",
            titulo: "Vendas",
            descricao:
                "Visualize faturamento, clientes e produtos vendidos."
        },
        {
            modulo: "financeiro",
            icone: "fa-solid fa-wallet",
            titulo: "Financeiro",
            descricao:
                "Acompanhe recebimentos, pagamentos e fluxo de caixa."
        },
        {
            modulo: "compras",
            icone: "fa-solid fa-cart-shopping",
            titulo: "Compras e Suprimentos",
            descricao:
                "Acompanhe compras, estoque, consumo e produção."
        },
        {
            modulo: "analise-comercial",
            icone: "fa-solid fa-chart-column",
            titulo: "Análise Integrada Comercial",
            descricao:
                "Analise estoque, vendas, consumo, produção e pedidos em aberto."
        },
        {
            modulo: "comex",
            icone: "fa-solid fa-ship",
            titulo: "COMEX",
            descricao:
                "Acompanhe importações, invoices e entregas por material."
        },
        {
            modulo: "rh",
            icone: "fa-solid fa-people-group",
            titulo: "Recursos Humanos",
            descricao:
                "Consulte perfis, treinamentos e matrizes de habilidades."
        },
        {
            modulo: "assinaturas",
            icone: "fa-solid fa-tags",
            titulo: "Assinaturas e Licenças",
            descricao:
                "Controle vencimentos, custos e renovações de licenças."
        },
        {
            modulo: "usuarios",
            icone: "fa-solid fa-shield-halved",
            titulo: "Controle de Acesso",
            descricao:
                "Gerencie usuários, perfis e permissões."
        }
    ];

    return cards
        .map(criarCardDashboard)
        .join("");
}


function voltarPortal(){

    document.getElementById("tituloPagina").innerText="Dashboard";

    document.getElementById("subtituloPagina").innerText=
    "Visão geral do Smart Group Analytics";

    const nomeUsuario =
        window.usuarioAnalytics?.nome ||
        "Usuário";

    document.getElementById("conteudo").innerHTML = `
        <div class="home">

            <div class="boas-vindas">
                <h2>
                    Olá,
                    <span id="nomeSaudacao">
                        ${nomeUsuario}
                    </span>!
                    👋
                </h2>

                <p>
                    Bem-vindo ao Smart Group Analytics.
                </p>
            </div>

            <div class="cards-home">
                ${gerarCardsDashboardPermitidos()}
            </div>

            <img
                class="marca-dagua"
                src="logo.png"
                alt="Smart Group"
            >
        </div>
    `;

    document
        .querySelectorAll(".menu a")
        .forEach(
            (item) =>
                item.classList.remove("active")
        );

    document
        .querySelector(
            '.menu a[data-modulo="dashboard"]'
        )
        ?.classList.add("active");
}

document.querySelector(".menu-btn")?.addEventListener("click", () => {
    document.querySelector(".sidebar").classList.toggle("aberto");
    document.body.classList.toggle("menu-aberto-mobile");
});

// =====================================
// BUSCA DE DASHBOARDS
// =====================================

const modulosBusca = [
    {
        nome: "Dashboard",
        descricao: "Visão geral do Smart Group Analytics",
        modulo: "dashboard"
    },
    {
        nome: "Estoque Comercial",
        descricao: "Saldos, produtos, locais e famílias",
        modulo: "estoque"
    },
    {
        nome: "Vendas",
        descricao: "Faturamento, clientes e produtos vendidos",
        modulo: "vendas"
    },
    {
        nome: "Financeiro",
        descricao: "Recebimentos, pagamentos e fluxo de caixa",
        modulo: "financeiro"
    },
    {
        nome: "Compras e Suprimentos",
        descricao: "Compras, estoque, consumo e produção",
        modulo: "compras"
    },
    {
        nome: "Análise Integrada Comercial",
        descricao: "Estoque, vendas, consumo, produção e pedidos em aberto",
        modulo: "analise-comercial"
    },
    {
        nome: "COMEX",
        descricao: "Importações, invoices, embarques e entregas por material",
        modulo: "comex"
    },
    {
        nome: "Recursos Humanos",
        descricao: "Perfis, treinamentos e matriz de habilidades",
        modulo: "rh"
    },
    {
        nome: "Assinaturas e Licenças",
        descricao: "Vencimentos, custos, licenças e renovações",
        modulo: "assinaturas"
    }
];

const campoBusca =
    document.getElementById("buscaModulo");

const resultadoBusca =
    document.getElementById("resultadoBusca");

function normalizarTexto(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function fecharResultadoBusca() {
    if (!resultadoBusca) return;

    resultadoBusca.innerHTML = "";
    resultadoBusca.classList.remove("aberto");
}

function selecionarModuloBusca(modulo) {

    const elementoMenu =
        document.querySelector(
            `.menu a[data-modulo="${modulo}"]`
        );

    if (elementoMenu) {
        abrirModulo(modulo, elementoMenu);
    }

    if (campoBusca) {
        campoBusca.value = "";
    }

    fecharResultadoBusca();
}

function mostrarResultadosBusca(textoDigitado) {

    if (!resultadoBusca) return;

    const busca =
        normalizarTexto(textoDigitado);

    if (!busca) {
        fecharResultadoBusca();
        return;
    }

    const resultados =
        modulosBusca.filter(item => {

            const conteudo =
                normalizarTexto(
                    item.nome + " " + item.descricao
                );

            return conteudo.includes(busca);
        });

    if (resultados.length === 0) {

        resultadoBusca.innerHTML = `
            <div class="resultado-vazio">
                Nenhum dashboard encontrado
            </div>
        `;

        resultadoBusca.classList.add("aberto");
        return;
    }

    resultadoBusca.innerHTML =
        resultados.map(item => `
            <button
                type="button"
                class="resultado-item"
                data-modulo="${item.modulo}"
            >
                <strong>${item.nome}</strong>
                <small>${item.descricao}</small>
            </button>
        `).join("");

    resultadoBusca.classList.add("aberto");

    resultadoBusca
        .querySelectorAll(".resultado-item")
        .forEach(botao => {

            botao.addEventListener("click", function () {

                selecionarModuloBusca(
                    this.dataset.modulo
                );
            });
        });
}

campoBusca?.addEventListener("input", function () {
    mostrarResultadosBusca(this.value);
});

campoBusca?.addEventListener("keydown", function (evento) {

    if (evento.key === "Enter") {

        const primeiroResultado =
            resultadoBusca?.querySelector(
                ".resultado-item"
            );

        primeiroResultado?.click();
    }

    if (evento.key === "Escape") {
        fecharResultadoBusca();
    }
});

document.addEventListener("click", function (evento) {

    const caixaBusca =
        document.querySelector(".search-box");

    if (
        caixaBusca &&
        !caixaBusca.contains(evento.target)
    ) {
        fecharResultadoBusca();
    }

});


// =====================================
// DISPONIBILIZAR FUNÇÃO PARA OUTROS MÓDULOS
// =====================================

window.abrirModulo = abrirModulo;


document.addEventListener("keydown", (evento) => {

    const card =
        evento.target.closest?.(
            ".card-home[data-modulo]"
        );

    if (!card) {
        return;
    }

    if (
        evento.key !== "Enter" &&
        evento.key !== " "
    ) {
        return;
    }

    evento.preventDefault();
    card.click();
});
