"use strict";

/* Multiseleção local das abas Contas a Receber / Contas a Pagar.
 * Nenhuma alteração é persistida; apenas refinamos os lançamentos carregados.
 */
const seletoresContasFinanceiro = new Map();

function iniciarMultiselectContas(id, valores, aoAlterar) {
    const raiz = document.getElementById(id);
    if (!raiz) return;

    let estado = seletoresContasFinanceiro.get(id);
    if (!estado) {
        estado = { opcoes: [], selecionadas: new Set(), aoAlterar };
        seletoresContasFinanceiro.set(id, estado);
        raiz.innerHTML = `
            <button type="button" class="fin-multi-botao" aria-expanded="false" aria-haspopup="true">
                <span class="fin-multi-resumo">Todos</span>
                <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
            </button>
            <div class="fin-multi-painel" hidden>
                <input class="fin-multi-busca" type="search" placeholder="Pesquisar opção..." aria-label="Pesquisar opções" autocomplete="off">
                <div class="fin-multi-acoes">
                    <button type="button" data-acao="todos">Marcar todos</button>
                    <button type="button" data-acao="nenhum">Desmarcar todos</button>
                </div>
                <label class="fin-multi-item fin-multi-item-todos">
                    <input type="checkbox" class="fin-multi-todos" checked>
                    <span>Todos</span>
                </label>
                <div class="fin-multi-lista"></div>
                <div class="fin-multi-contador"></div>
            </div>`;

        const botao = raiz.querySelector('.fin-multi-botao');
        const painel = raiz.querySelector('.fin-multi-painel');
        const busca = raiz.querySelector('.fin-multi-busca');
        botao.addEventListener('click', () => {
            const abrir = painel.hidden;
            // Fechar outras listas na mesma tela.
            document.querySelectorAll('.fin-multi-painel').forEach((outro) => {
                if (outro !== painel) {
                    outro.hidden = true;
                    outro.parentElement.querySelector('.fin-multi-botao')?.setAttribute('aria-expanded', 'false');
                }
            });
            painel.hidden = !abrir;
            botao.setAttribute('aria-expanded', String(abrir));
            if (abrir) busca.focus();
        });
        raiz.querySelector('[data-acao="todos"]').addEventListener('click', () => {
            definirSelecaoContas(id, true);
        });
        raiz.querySelector('[data-acao="nenhum"]').addEventListener('click', () => {
            definirSelecaoContas(id, false);
        });
        raiz.querySelector('.fin-multi-todos').addEventListener('change', (ev) => {
            definirSelecaoContas(id, ev.target.checked);
        });
        busca.addEventListener('input', () => renderizarOpcoesMultiselectContas(id));
    } else {
        estado.aoAlterar = aoAlterar;
    }

    const opcoes = [...new Set((valores || []).map((valor) => String(valor ?? '').trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const eraTodos = estado.opcoes.length === estado.selecionadas.size;
    const anteriormente = estado.selecionadas;
    estado.opcoes = opcoes;
    estado.selecionadas = eraTodos
        ? new Set(opcoes)
        : new Set(opcoes.filter((nome) => anteriormente.has(nome)));
    atualizarMultiselectContas(id);
}

function atualizarMultiselectContas(id) {
    const estado = seletoresContasFinanceiro.get(id);
    const raiz = document.getElementById(id);
    if (!estado || !raiz) return;
    const total = estado.opcoes.length;
    const n = estado.selecionadas.size;
    const todos = raiz.querySelector('.fin-multi-todos');
    todos.checked = n === total;
    todos.indeterminate = n > 0 && n < total;
    raiz.querySelector('.fin-multi-resumo').textContent =
        n === total ? 'Todos' : n === 0 ? 'Nenhum selecionado' : `${n} selecionado${n === 1 ? '' : 's'}`;
    raiz.querySelector('.fin-multi-contador').textContent = `${n} de ${total} opções selecionadas`;
    renderizarOpcoesMultiselectContas(id);
}

function renderizarOpcoesMultiselectContas(id) {
    const estado = seletoresContasFinanceiro.get(id);
    const raiz = document.getElementById(id);
    if (!estado || !raiz) return;
    const container = raiz.querySelector('.fin-multi-lista');
    const busca = (raiz.querySelector('.fin-multi-busca').value || '').normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
    container.replaceChildren();
    const opcoes = estado.opcoes.filter((v) => v.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').includes(busca));
    if (!opcoes.length) {
        const vazio = document.createElement('div');
        vazio.className = 'fin-multi-vazio';
        vazio.textContent = 'Nenhuma opção encontrada.';
        container.appendChild(vazio);
        return;
    }
    // Listas de muitos clientes/fornecedores não devem travar o dashboard.
    // Todos os nomes continuam pesquisáveis e selecionáveis.
    const visiveis = opcoes.slice(0, 120);
    if (opcoes.length > visiveis.length) {
        const aviso = document.createElement('div');
        aviso.className = 'fin-multi-vazio';
        aviso.textContent = `Exibindo ${visiveis.length} de ${opcoes.length}. Pesquise para encontrar outros.`;
        container.appendChild(aviso);
    }
    visiveis.forEach((nome) => {
        const label = document.createElement('label');
        label.className = 'fin-multi-item';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = estado.selecionadas.has(nome);
        const texto = document.createElement('span');
        texto.textContent = ({aberto: 'Em aberto', atrasado: 'Em atraso', pago: 'Pago'})[nome] || nome;
        label.append(input, texto);
        input.addEventListener('change', () => {
            if (input.checked) estado.selecionadas.add(nome);
            else estado.selecionadas.delete(nome);
            atualizarMultiselectContas(id);
            estado.aoAlterar?.();
        });
        container.appendChild(label);
    });
}

function definirSelecaoContas(id, marcar = true, notificar = true) {
    const estado = seletoresContasFinanceiro.get(id);
    if (!estado) return;
    estado.selecionadas = new Set(marcar ? estado.opcoes : []);
    atualizarMultiselectContas(id);
    if (notificar) estado.aoAlterar?.();
}

/* Null = todas as opções. Set vazio = nenhuma opção selecionada. */
function obterSelecaoContas(id) {
    const estado = seletoresContasFinanceiro.get(id);
    if (!estado || estado.selecionadas.size === estado.opcoes.length) return null;
    return estado.selecionadas;
}

function correspondeMultiselectContas(id, valor) {
    const selecao = obterSelecaoContas(id);
    return selecao === null || selecao.has(String(valor ?? ''));
}

document.addEventListener('click', (ev) => {
    document.querySelectorAll('.fin-multi').forEach((raiz) => {
        if (!raiz.contains(ev.target)) {
            const painel = raiz.querySelector('.fin-multi-painel');
            if (painel) painel.hidden = true;
            raiz.querySelector('.fin-multi-botao')?.setAttribute('aria-expanded', 'false');
        }
    });
});

document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
        document.querySelectorAll('.fin-multi-painel').forEach((painel) => {
            painel.hidden = true;
            painel.parentElement.querySelector('.fin-multi-botao')?.setAttribute('aria-expanded', 'false');
        });
    }
});
