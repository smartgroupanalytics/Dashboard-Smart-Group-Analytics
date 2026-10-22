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
  limpar: document.getElementById('btnLimpar'),
  microfone: document.getElementById('btnMicrofone'),
  vozStatus: document.getElementById('vozStatus'),
  btnVozResposta: document.getElementById('btnVozResposta')
};
let usuarioAtivo = null;
let autorizado = false;
let enviando = false;
let versaoAcesso = 0;
// Reconhecimento de voz apenas mediante clique; nunca transmite áudio ao Worker.
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
let reconhecimento = null;
let ouvindo = false;
function vozMensagem(texto) {
  refs.vozStatus.textContent = texto;
  refs.vozStatus.hidden = !texto;
}
function pararVoz() {
  if (reconhecimento && ouvindo) { try { reconhecimento.stop(); } catch {} }
}
if (!SpeechRecognitionAPI) {
  refs.microfone.hidden = true;
  vozMensagem('Reconhecimento de voz indisponível neste navegador. Você pode digitar normalmente.');
} else {
  refs.microfone.addEventListener('click', () => {
    if (!autorizado || enviando) return;
    if (ouvindo) { pararVoz(); return; }
    reconhecimento = new SpeechRecognitionAPI();
    let falaReconhecida = false;
    let falhaReconhecimento = false;
    reconhecimento.lang = 'pt-BR';
    reconhecimento.continuous = false;
    reconhecimento.interimResults = false;
    reconhecimento.maxAlternatives = 1;
    reconhecimento.onstart = () => {
      ouvindo = true;
      refs.microfone.classList.add('gravando');
      refs.microfone.setAttribute('aria-label', 'Parar gravação');
      vozMensagem('Ouvindo… fale sua pergunta.');
    };
    reconhecimento.onresult = (evento) => {
      const fala = normalizarCodigoDitado(Array.from(evento.results).map(r => r[0]?.transcript || '').join(' ').trim());
      if (fala) {
        falaReconhecida = true;
        refs.pergunta.value = [refs.pergunta.value.trim(), fala].filter(Boolean).join(' ').slice(0, 400);
        ajustarAltura();
        vozMensagem('Pergunta reconhecida. Iniciando a pesquisa…');
        // A API pode continuar ouvindo após a transcricao; solicite o fim para disparar onend.
        try { reconhecimento.stop(); } catch {}
      }
    };
    reconhecimento.onerror = (evento) => {
      falhaReconhecimento = true;
      const erro = evento.error;
      vozMensagem(erro === 'not-allowed' || erro === 'service-not-allowed'
        ? 'Permita o acesso ao microfone nas configurações do navegador.'
        : erro === 'no-speech' ? 'Não detectei fala. Tente novamente.'
        : 'Não foi possível reconhecer a fala. Digite sua pergunta ou tente novamente.');
    };
    reconhecimento.onend = () => {
      ouvindo = false;
      refs.microfone.classList.remove('gravando');
      refs.microfone.setAttribute('aria-label', 'Ditar pergunta por voz');
      if (falaReconhecida && !falhaReconhecimento && autorizado && !enviando) {
        if (refs.pergunta.value.trim().length >= 3) {
          vozMensagem('Pergunta enviada automaticamente.');
          refs.form.requestSubmit();
        } else {
          vozMensagem('A pergunta ficou muito curta. Tente falar novamente.');
        }
      } else if (!falhaReconhecimento && autorizado) {
        refs.pergunta.focus();
      }
    };
    try { reconhecimento.start(); }
    catch { vozMensagem('Não foi possível iniciar o microfone. Verifique a permissão do navegador.'); }
  });
}


// Leitura falada OPT-IN com a voz escolhida no testador pelo usuario.
// A voz "Google portugues do Brasil" e oferecida pelo proprio navegador.
// Nunca usar uma voz diferente como fallback (evita retorno robotizado).
// Nenhuma gravacao de video ou imitacao de personagem e utilizada.
const leitorVoz = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
  ? window.speechSynthesis : null;
let leituraLigada = false;
const NOME_VOZ_ESCOLHIDA = 'Google português do Brasil';
function normalizarNomeVoz(valor) {
  return String(valor || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}
function escolherVozGoogleBrasil() {
  if (!leitorVoz) return null;
  const desejada = normalizarNomeVoz(NOME_VOZ_ESCOLHIDA);
  return leitorVoz.getVoices().find(voz =>
    /^pt[-_]BR$/i.test(voz.lang) && normalizarNomeVoz(voz.name) === desejada
  ) || null;
}
function interromperLeitura() { if (leitorVoz) leitorVoz.cancel(); }
// Ditar "produto onze mil novecentos e dezessete" pode ser transcrito
// como "produto 11.917". Padronizar SOMENTE codigos explicitamente marcados.
function normalizarCodigoDitado(texto) {
  return String(texto || '').replace(
    /(\b(?:produto|c[oó]digo|sku|item|material)\s*(?:(?:n[úu]mero|n[º°.]|de n[úu]mero)\s*)?[:#-]?\s*)(\d{1,3}(?:\.\d{3}){1,2})(?=\b|$)/gi,
    (_, prefixo, codigo) => prefixo + codigo.replace(/\./g, '')
  );
}

const DIGITOS_PRONUNCIA = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
function falaParaCodigos(texto, registros) {
  let s = String(texto || '');
  const codigos = [...new Set((Array.isArray(registros) ? registros : [])
    .map(r => String(r?.produto ?? '').trim())
    .filter(codigo => /^\d{4,8}$/.test(codigo)))];
  // A alteracao ocorre apenas na string transmitida ao sintetizador.
  // O codigo que aparece no painel e os dados retornados pelo D1 permanecem intactos.
  for (const codigo of codigos) {
    const falado = codigo.split('').map(d => DIGITOS_PRONUNCIA[Number(d)]).join(', ');
    s = s.replace(new RegExp(`(^|[^0-9])${codigo}(?=$|[^0-9])`, 'g'), (_, antes) => antes + falado);
  }
  return s;
}

function falarResposta(texto, registros = []) {
  if (!leituraLigada || !leitorVoz || !autorizado) return;
  const voz = escolherVozGoogleBrasil();
  if (!voz) {
    leituraLigada = false;
    atualizarBotaoVoz();
    vozMensagem('A voz Google português do Brasil não está disponível neste navegador. A leitura foi desligada; nenhuma voz robótica será utilizada.');
    return;
  }
  interromperLeitura();
  const fala = new SpeechSynthesisUtterance(falaParaCodigos(texto, registros).slice(0, 3500));
  fala.voice = voz;
  fala.lang = 'pt-BR';
  // Mesmos ajustes do arquivo de teste em que a voz foi aprovada.
  fala.rate = 0.96;
  fala.pitch = 1;
  fala.volume = 1;
  fala.onerror = evento => {
    if (evento.error !== 'canceled' && evento.error !== 'interrupted') {
      vozMensagem('Não foi possível reproduzir a resposta com a voz Google. Confira o áudio e a conexão do navegador.');
    }
  };
  leitorVoz.speak(fala);
}
function atualizarBotaoVoz() {
  if (!refs.btnVozResposta) return;
  refs.btnVozResposta.textContent = leituraLigada ? '🔊 Voz Google ligada' : '🔇 Voz desligada';
  refs.btnVozResposta.setAttribute('aria-pressed', String(leituraLigada));
  refs.btnVozResposta.title = leituraLigada
    ? 'Desativar leitura das respostas com Google português do Brasil'
    : 'Ativar leitura das respostas com Google português do Brasil';
}
if (!leitorVoz) {
  refs.btnVozResposta.hidden = true;
} else {
  // Alguns navegadores carregam as vozes apos abrir a pagina.
  leitorVoz.addEventListener?.('voiceschanged', () => {
    if (leituraLigada && !escolherVozGoogleBrasil()) {
      interromperLeitura();
      leituraLigada = false;
      atualizarBotaoVoz();
      vozMensagem('A voz Google português do Brasil deixou de estar disponível. Leitura desligada.');
    }
  });
  refs.btnVozResposta.addEventListener('click', () => {
    if (leituraLigada) {
      leituraLigada = false;
      interromperLeitura();
      atualizarBotaoVoz();
      return;
    }
    const voz = escolherVozGoogleBrasil();
    if (!voz) {
      vozMensagem('Voz Google português do Brasil não encontrada. Abra no navegador em que ela apareceu no testador, aguarde o carregamento das vozes e tente novamente.');
      return;
    }
    // Uma voz online pode processar fora do dispositivo os textos lidos.
    // A ativacao exige confirmacao, especialmente para respostas empresariais.
    if (voz.localService === false && !window.confirm(
      'Esta voz Google utiliza um serviço online do navegador e o texto das respostas pode ser processado fora do dispositivo. Use apenas com dados que sua empresa permita compartilhar com esse serviço. Ativar leitura por voz?'
    )) return;
    leituraLigada = true;
    atualizarBotaoVoz();
    vozMensagem('Voz Google português do Brasil ativada.');
    // Ativado por clique para cumprir politicas de reproducao de audio.
    falarResposta('Olá. Sou a assistente da Smart Group. A leitura de respostas está ativada.');
  });
}

function modoAcesso(mensagem, podeRepetir = false) {
  pararVoz();
  interromperLeitura();
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
  if (usuarioAtivo?.uid !== usuario?.uid) { interromperLeitura(); leituraLigada = false; atualizarBotaoVoz(); limparConversa(); }
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
refs.limpar.addEventListener('click', () => { if (!enviando) { interromperLeitura(); limparConversa(); refs.pergunta.focus(); } });

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
  pararVoz();
  interromperLeitura();
  enviando = true;
  refs.enviar.disabled = true;
  refs.pergunta.disabled = true;
  refs.limpar.disabled = true;
  refs.microfone.disabled = true;
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
    if (resposta.ok && dados.sucesso === true) {
      metadados(retorno.bolha, dados);
      falarResposta(dados.resposta || '', dados.dados || []);
    }
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
    refs.microfone.disabled = false;
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
