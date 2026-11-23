/*
 * SMART GROUP — CONECTOR DE TESTE PARA FIRESTORE (SOMENTE DADOS FICTÍCIOS)
 * Projeto: smart-group-analytics-testes
 * NÃO UTILIZAR ESTE ARQUIVO NA BRANCH PRINCIPAL/PRODUÇÃO.
 *
 * Para ativar numa CÓPIA ISOLADA do index.html do Financeiro, carregar:
 *  <script src="https://www.gstatic.com/firebasejs/13.4.0/firebase-app-compat.js"></script>
 *  <script src="https://www.gstatic.com/firebasejs/13.4.0/firebase-auth-compat.js"></script>
 *  <script src="https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore-compat.js"></script>
 *  <script src="js/conector-financeiro-firestore-teste.js"></script>
 * antes de financeiro.js (e antes do DOMContentLoaded).
 *
 * Exige automacao-financeiro.js previamente preparado com obterBlobFinanceiro().
 * Preserva os processadores, indicadores, gráficos e filtros já existentes.
 * NUNCA contém credenciais administrativas; as regras do Firestore validam o UID.
 */
(function () {
  'use strict';

  const CONFIG = Object.freeze({
    apiKey: 'AIzaSyD5IRrSUg1FmjWyZV6nnKGeuecMCQAHKIM',
    authDomain: 'smart-group-analytics-testes.firebaseapp.com',
    projectId: 'smart-group-analytics-testes',
    storageBucket: 'smart-group-analytics-testes.firebasestorage.app',
    messagingSenderId: '981176123337',
    appId: '1:981176123337:web:c0551fc3fc14fc4365f218'
  });
  const COLECAO = 'financeiro_seguro_teste';
  const AMBIENTE = 'TESTES - SEM DADOS REAIS';
  const TIPOS = ['financeiro', 'fretes'];
  const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const MAX_BYTES = 30 * 1024 * 1024;
  const MAX_PARTES = 200;

  // Primeiro bloqueia o fallback para arquivos públicos, mesmo se algo falhar.
  window.SMART_FINANCEIRO_ORIGEM = 'privada';
  window.SMART_FINANCEIRO_AMBIENTE = 'TESTES_FICTICIOS';

  let auth = null;
  let firestore = null;
  let aviso = null;
  let botoes = null;

  function validar(condicao, mensagem) {
    if (!condicao) throw new Error(mensagem);
  }
  function textoErro(erro) {
    if (erro?.code === 'permission-denied') return 'Permissão negada: usuário sem autorização para o Financeiro.';
    if (erro?.code === 'auth/invalid-credential') return 'E-mail ou senha de testes inválidos.';
    return String(erro?.message || erro || 'Erro desconhecido');
  }
  function atualizarAviso(mensagem, tipo = 'info') {
    if (aviso) {
      aviso.textContent = mensagem;
      aviso.style.color = tipo === 'erro' ? '#991b1b' : tipo === 'sucesso' ? '#065f46' : '#1e40af';
    }
  }
  async function documentoPrivado(id) {
    validar(firestore !== null && auth?.currentUser, 'Faça login no Firebase de testes para carregar os dados fictícios.');
    const documento = await firestore.collection(COLECAO).doc(id).get({ source: 'server' });
    validar(documento.exists, 'Documento de testes não encontrado: ' + id);
    return documento.data();
  }
  async function sha256Hex(bytes) {
    validar(!!window.crypto?.subtle, 'SHA-256 indisponível neste navegador; use HTTPS ou localhost.');
    const copia = new Uint8Array(bytes.length);
    copia.set(bytes);
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', copia.buffer));
    return [...hash].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  async function recuperarXlsxFicticio(tipo) {
    validar(TIPOS.includes(tipo), 'Tipo inválido.');
    const m = await documentoPrivado('teste-xlsx-manifesto-' + tipo);
    validar(m.ambiente === AMBIENTE && m.tipo === tipo, 'Arquivo recusado: origem não fictícia.');
    const quantidadePartes = Number(m.quantidadePartes);
    const tamanhoBytes = Number(m.tamanhoBytes);
    const versao = String(m.versao || '');
    const esperado = String(m.hashSha256 || '');
    validar(Number.isInteger(quantidadePartes) && quantidadePartes > 0 && quantidadePartes <= MAX_PARTES, 'Quantidade de partes inválida.');
    validar(Number.isInteger(tamanhoBytes) && tamanhoBytes >= 4 && tamanhoBytes <= MAX_BYTES, 'Tamanho de arquivo inválido.');
    validar(/^[a-f0-9]{16}$/.test(versao) && /^[a-f0-9]{64}$/.test(esperado), 'Versão/hash inválidos.');

    // Leitura individual por ID conhecido; NÃO é permitida listagem de coleção.
    const blocos = [];
    let total = 0;
    for (let i = 1; i <= quantidadePartes; i++) {
      const id = 'teste-xlsx-' + tipo + '-' + versao + '-' + String(i).padStart(4, '0');
      const parte = await documentoPrivado(id);
      validar(parte.ambiente === AMBIENTE && parte.tipo === tipo && Number(parte.numeroParte) === i,
        'Parte inválida: ' + i);
      validar(parte.conteudo && typeof parte.conteudo.toUint8Array === 'function', 'Conteúdo binário inválido: ' + i);
      const bytes = parte.conteudo.toUint8Array();
      total += bytes.byteLength;
      validar(bytes.byteLength > 0 && total <= tamanhoBytes, 'Tamanho de bloco inválido: ' + i);
      blocos.push(bytes);
    }
    validar(total === tamanhoBytes, 'Tamanho final divergente.');
    const resultado = new Uint8Array(total);
    let cursor = 0;
    for (const bloco of blocos) {
      resultado.set(bloco, cursor);
      cursor += bloco.byteLength;
    }
    validar(resultado[0] === 0x50 && resultado[1] === 0x4b && resultado[2] === 0x03 && resultado[3] === 0x04,
      'O conteúdo não possui assinatura XLSX válida.');
    validar(await sha256Hex(resultado) === esperado, 'Falha de integridade SHA-256.');
    return new Blob([resultado], { type: MIME });
  }

  // Contrato esperado pelo automacao-financeiro.js preparado anteriormente.
  window.smartFinanceiroFontePrivada = Object.freeze({
    async obterPlanilha(tipo) {
      return recuperarXlsxFicticio(tipo);
    },
    async obterStatus() {
      // Evita apresentar status da automação real como se fosse de teste.
      return { fontes: {} };
    }
  });

  function criarPainel() {
    if (!document.body || document.getElementById('smart-firestore-teste-login')) return;
    const painel = document.createElement('section');
    painel.id = 'smart-firestore-teste-login';
    painel.style.cssText = 'position:relative;z-index:10;background:#fff7ed;border:2px solid #f59e0b;padding:14px;margin:12px auto;max-width:950px;border-radius:10px;font:14px system-ui,sans-serif;color:#713f12;';
    painel.innerHTML = '<strong>AMBIENTE ISOLADO — FIREBASE DE TESTES / DADOS FICTÍCIOS</strong>' +
      '<p>Esta tela não utiliza o login de produção e nunca deve ser publicada na branch principal.</p>' +
      '<form id="smart-firestore-teste-form" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
      '<input id="smart-firestore-teste-email" type="email" required autocomplete="username" placeholder="E-mail do Firebase de testes" style="padding:8px;min-width:240px;flex:1">' +
      '<input id="smart-firestore-teste-senha" type="password" required placeholder="Senha de testes" autocomplete="off" style="padding:8px;min-width:180px;flex:1">' +
      '<button type="submit" style="padding:8px">Entrar e carregar Excel fictício</button>' +
      '<button type="button" id="smart-firestore-teste-sair" style="padding:8px">Sair</button>' +
      '</form><p id="smart-firestore-teste-aviso" role="status" aria-live="polite" style="margin:9px 0 0"></p>';
    document.body.prepend(painel);
    aviso = painel.querySelector('#smart-firestore-teste-aviso');
    botoes = painel.querySelectorAll('button');
    painel.querySelector('#smart-firestore-teste-form').addEventListener('submit', async (evento) => {
      evento.preventDefault();
      for (const b of botoes) b.disabled = true;
      try {
        const email = painel.querySelector('#smart-firestore-teste-email').value.trim();
        const senha = painel.querySelector('#smart-firestore-teste-senha').value;
        await auth.signInWithEmailAndPassword(email, senha);
        painel.querySelector('#smart-firestore-teste-senha').value = '';
        atualizarAviso('Autenticação confirmada. Carregando SOMENTE XLSX fictício...', 'sucesso');
        validar(typeof window.carregarDadosAutomaticosFinanceiro === 'function', 'Carregador financeiro não está disponível.');
        await window.carregarDadosAutomaticosFinanceiro();
        atualizarAviso('Tentativa de carregamento concluída. Confira os avisos do Financeiro/Fretes no painel.', 'sucesso');
      } catch (erro) {
        atualizarAviso(textoErro(erro), 'erro');
      } finally {
        for (const b of botoes) b.disabled = false;
      }
    });
    painel.querySelector('#smart-firestore-teste-sair').addEventListener('click', async () => {
      for (const b of botoes) b.disabled = true;
      try {
        await auth.signOut();
        // Limpa a representação dos dados ao encerrar a sessão de teste.
        window.location.reload();
      } catch (erro) {
        atualizarAviso(textoErro(erro), 'erro');
        for (const b of botoes) b.disabled = false;
      }
    });
  }

  try {
    validar(!!window.firebase?.initializeApp, 'Firebase compat não carregado: inclua os três scripts do SDK de testes antes deste conector.');
    const app = window.firebase.apps.find((x) => x.name === 'smart-firestore-financeiro-teste') ||
      window.firebase.initializeApp(CONFIG, 'smart-firestore-financeiro-teste');
    auth = app.auth();
    firestore = app.firestore();
  } catch (erro) {
    console.error('Conector financeiro de testes indisponível (falha fechada):', erro);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', criarPainel, { once: true });
  } else {
    criarPainel();
  }
})();
