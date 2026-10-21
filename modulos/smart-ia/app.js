// SMART GROUP ANALYTICS — módulo de interface independente.
// Backend validado por Firebase + lista positiva de UIDs no Worker.
// Não altera dados do D1 e não armazena conversas no Firestore/Drive.
import { auth } from '../../firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';

const SERVICO = 'https://smart-group-estoque-ia.fabiosilveiradss.workers.dev';
const refs = {
  acesso: document.getElementById('statusAcesso'),
  textoAcesso: document.getElementById('textoAcesso'),
  revalidar: document.getElementById('btnRevalidar'),
  chat: document.getElementById('chat'),
  mensagens: document.getElementById('mensagens'),
  boasVindas: document.getElementById('bemvindo'),
  form: document.getElementById('formPergunta'),
  pergunta: document.getElementById('pergunta'),
  enviar: document.getElementById('enviar'),
  limpar: document.getElementById('btnLimpar')
};
let usuarioAtivo = null;
let autorizado = false;
let enviando = false;
let versaoAcesso = 0;

function modoAcesso(mensagem, podeRepetir = false) {
  autorizado = false;
  refs.chat.hidden = true;
  refs.acesso.hidden = false;
  refs.textoAcesso.textContent = mensagem;
  refs.revalidar.hidden = !podeRepetir;
}

async function validarAcesso(usuario) {
  const tentativa = ++versaoAcesso;
  modoAcesso('Validando seu acesso seguro…');
  if (!usuario) {
    modoAcesso('É necessário fazer login no Smart Group Analytics.');
    return;
  }
  try {
    const token = await usuario.getIdToken();
    const resposta = await fetch(`${SERVICO}/api/verificar-acesso`, {
      method: 'GET', headers: { Authorization: `Bearer ${token}` }, cache: 'no-store'
    });
    if (tentativa !== versaoAcesso) return;
    if (!resposta.ok) {
      const msg = resposta.status === 403 ? 'Você não possui acesso ao Smart Group IA.' :
        resposta.status === 401 ? 'Faça login novamente para utilizar a IA.' :
        'Não foi possível consultar as permissões agora.';
      modoAcesso(msg, resposta.status >= 500);
      return;
    }
    const dados = await resposta.json();
    if (tentativa !== versaoAcesso) return;
    if (dados.autorizado !== true) {
      modoAcesso('Usuário não autorizado.');
      return;
    }
    autorizado = true;
    refs.acesso.hidden = true;
    refs.chat.hidden = false;
    refs.pergunta.focus();
  } catch {
    if (tentativa === versaoAcesso) modoAcesso('Falha na conexão com o serviço. Verifique a internet e tente novamente.', true);
  }
}

onAuthStateChanged(auth, usuario => {
  // Esvazia qualquer conversa anterior caso a identidade seja trocada.
  if (usuarioAtivo?.uid !== usuario?.uid) limparConversa();
  usuarioAtivo = usuario;
  validarAcesso(usuario);
});
refs.revalidar.addEventListener('click', () => validarAcesso(auth.currentUser));

function elemento(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined && texto !== null) el.textContent = String(texto);
  return el;
}
function rolarFim() { refs.mensagens.scrollTop = refs.mensagens.scrollHeight; }
function limparConversa() {
  [...refs.mensagens.children].forEach(n => { if (n !== refs.boasVindas) n.remove(); });
  refs.boasVindas.hidden = false;
}
refs.limpar.addEventListener('click', () => { if (!enviando) { limparConversa(); refs.pergunta.focus(); } });

function adicionarMensagem(texto, tipo, pendente = false) {
  refs.boasVindas.hidden = true;
  const item = elemento('article', `mensagem ${tipo}`);
  if (tipo === 'assistente') item.appendChild(elemento('span', 'avatar-ia', '✦'));
  const bolha = elemento('div', 'bolha');
  if (tipo === 'assistente') bolha.appendChild(elemento('div', 'msg-topo', 'Smart Group IA'));
  const corpo = elemento('div', tipo === 'assistente' ? 'texto-resposta' : 'texto-usuario', texto);
  if (pendente) corpo.classList.add('pendente');
  bolha.appendChild(corpo);
  item.appendChild(bolha);
  refs.mensagens.appendChild(item);
  rolarFim();
  return { item, bolha, corpo };
}

function exibirDetalhes(bolha, dados) {
  if (!Array.isArray(dados) || !dados.length) return;
  const detalhes = elemento('details', 'detalhes');
  detalhes.appendChild(elemento('summary', '', `Ver dados da consulta (${dados.length} registros)`));
  const rolagem = elemento('div', 'tabela-rolagem');
  const tabela = elemento('table', 'dados-tabela');
  const nomes = {
    produto: 'Produto', descricao: 'Descrição', empresa: 'Empresa', local: 'Local',
    saldo: 'Saldo', total: 'Total', grupo: 'Grupo', itens: 'Itens',
    variacao: 'Variação', eventos: 'Eventos', tipo_evento: 'Tipo',
    saldo_anterior: 'Saldo anterior', saldo_atual: 'Saldo registrado',
    diferenca: 'Diferença', observado_em: 'Observado em',
    primeira_observacao_em: 'Primeira observação', ultima_variacao_em: 'Última variação',
    registros: 'Registros', produtos: 'Produtos', empresas: 'Empresas', locais: 'Locais'
  };
  const chaves = Object.keys(nomes).filter(chave => dados.some(linha =>
    linha && Object.prototype.hasOwnProperty.call(linha, chave)));
  if (!chaves.length) return;
  const cabecalho = elemento('thead');
  const trh = elemento('tr');
  chaves.forEach(chave => trh.appendChild(elemento('th', '', nomes[chave])));
  cabecalho.appendChild(trh);
  tabela.appendChild(cabecalho);
  const tbody = elemento('tbody');
  dados.slice(0, 30).forEach(linha => {
    const tr = elemento('tr');
    chaves.forEach(chave => {
      const valor = linha?.[chave];
      const texto = valor === null || valor === undefined ? '—' :
        typeof valor === 'number' ? new Intl.NumberFormat('pt-BR', {maximumFractionDigits:2}).format(valor) :
        String(valor);
      tr.appendChild(elemento('td', '', texto));
    });
    tbody.appendChild(tr);
  });
  tabela.appendChild(tbody);
  rolagem.appendChild(tabela);
  detalhes.appendChild(rolagem);
  bolha.appendChild(detalhes);
}

function metadados(bolha, dados) {
  const linha = elemento('div', 'metadados');
  const processamento = dados.processamento || 'Resposta do serviço';
  linha.appendChild(elemento('span', 'etiqueta', processamento));
  if (dados.cache === 'HIT') linha.appendChild(elemento('span', 'etiqueta', 'Em cache'));
  if (dados.fonte) linha.appendChild(elemento('span', '', `Fonte: ${dados.fonte}`));
  const btn = elemento('button', 'btn-copiar', 'Copiar resposta');
  btn.type = 'button';
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(String(dados.resposta || ''));
      btn.textContent = 'Copiado';
    } catch { btn.textContent = 'Não foi possível copiar'; }
  });
  linha.appendChild(btn);
  bolha.appendChild(linha);
  if (dados.aviso && !(dados.resposta || '').includes(dados.aviso)) {
    bolha.appendChild(elemento('div', 'aviso-ia', dados.aviso));
  }
  exibirDetalhes(bolha, dados.dados);
}

async function enviarPergunta(pergunta) {
  const texto = String(pergunta || '').trim();
  if (!autorizado || enviando || texto.length < 3 || texto.length > 400) return;
  enviando = true;
  refs.enviar.disabled = true;
  refs.pergunta.disabled = true;
  refs.limpar.disabled = true;
  adicionarMensagem(texto, 'usuario');
  const retorno = adicionarMensagem('Consultando os dados com segurança…', 'assistente', true);
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Faça login novamente no Dashboard.');
    const resposta = await fetch(`${SERVICO}/api/ia/perguntar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ pergunta: texto })
    });
    const dados = await resposta.json().catch(() => ({ erro: 'Resposta inválida do serviço.' }));
    retorno.corpo.classList.remove('pendente');
    retorno.corpo.textContent = dados.resposta || dados.erro || 'O serviço não conseguiu retornar uma resposta.';
    if (resposta.ok && dados.sucesso === true) metadados(retorno.bolha, dados);
    if (resposta.status === 401 || resposta.status === 403) {
      // Não expor a conversa se a permissão for revogada durante o uso.
      autorizado = false;
      limparConversa();
      modoAcesso('Sua sessão não está autorizada a utilizar este assistente.');
    }
  } catch {
    retorno.corpo.classList.remove('pendente');
    retorno.corpo.textContent = 'Não foi possível consultar o serviço. Confira sua conexão e tente novamente.';
  } finally {
    enviando = false;
    refs.enviar.disabled = false;
    refs.pergunta.disabled = false;
    refs.limpar.disabled = false;
    refs.pergunta.focus();
    rolarFim();
  }
}
refs.form.addEventListener('submit', event => {
  event.preventDefault();
  const pergunta = refs.pergunta.value.trim();
  if (pergunta.length < 3 || enviando) return;
  refs.pergunta.value = '';
  ajustarAltura();
  enviarPergunta(pergunta);
});
refs.pergunta.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    refs.form.requestSubmit();
  }
});
function ajustarAltura() {
  refs.pergunta.style.height = 'auto';
  refs.pergunta.style.height = `${Math.min(120, Math.max(38, refs.pergunta.scrollHeight))}px`;
}
refs.pergunta.addEventListener('input', ajustarAltura);
document.querySelectorAll('[data-pergunta]').forEach(btn => btn.addEventListener('click', () => {
  const pergunta = btn.dataset.pergunta || '';
  if (!autorizado || enviando) return;
  enviarPergunta(pergunta);
}));
