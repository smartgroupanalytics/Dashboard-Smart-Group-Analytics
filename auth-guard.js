// ============================================
// SMART GROUP ANALYTICS
// AUTENTICAÇÃO E PERMISSÕES
// ============================================

import {
  auth,
  db
} from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// ============================================
// OBSERVAR USUÁRIO CONECTADO
// ============================================

onAuthStateChanged(auth, async usuarioFirebase => {

  if (!usuarioFirebase) {
    redirecionarLogin();
    return;
  }

  try {

    const referenciaUsuario = doc(
      db,
      "usuarios",
      usuarioFirebase.uid
    );

    const documentoUsuario =
      await getDoc(referenciaUsuario);

    if (!documentoUsuario.exists()) {

      console.error(
        "Não existe perfil no Firestore para este UID:",
        usuarioFirebase.uid
      );

      await encerrarAcesso(
        "Seu usuário ainda não possui um perfil no Analytics."
      );

      return;
    }


    // Remove possíveis espaços dos nomes dos campos.
    const dadosOriginais = documentoUsuario.data();
    const dadosUsuario = normalizarCampos(dadosOriginais);

    if (dadosUsuario.ativo !== true) {

      await encerrarAcesso(
        "Este usuário está inativo. Entre em contato com o administrador."
      );

      return;
    }


    // Deixa os dados disponíveis para o app.js.
    window.usuarioAnalytics = {
      uid: usuarioFirebase.uid,
      emailFirebase: usuarioFirebase.email,
      ...dadosUsuario
    };


    atualizarIdentificacao(dadosUsuario);

    aplicarPermissoes(dadosUsuario);

    document.body.classList.remove("auth-pendente");

  } catch (erro) {

    console.error(
      "Erro ao validar acesso do usuário:",
      erro
    );

    await encerrarAcesso(
      "Não foi possível validar seu acesso ao Analytics."
    );
  }
});


// ============================================
// NORMALIZAR CAMPOS DO FIRESTORE
// ============================================

function normalizarCampos(dados) {

  const corrigidos = {};

  Object.entries(dados || {}).forEach(
    ([campo, valor]) => {

      corrigidos[campo.trim()] = valor;

    }
  );

  return corrigidos;
}


// ============================================
// ATUALIZAR NOME, PERFIL E AVATAR
// ============================================

function atualizarIdentificacao(dadosUsuario) {

  const nomeCompleto =
    String(
      dadosUsuario.nome ||
      dadosUsuario.email ||
      "Usuário"
    ).trim();

  const primeiroNome =
    nomeCompleto.split(/\s+/)[0] || "Usuário";

  const perfilOriginal =
    String(
      dadosUsuario.perfil || "usuario"
    ).trim();

  const perfilFormatado =
    perfilOriginal.charAt(0).toUpperCase() +
    perfilOriginal.slice(1).toLowerCase();

  const inicial =
    primeiroNome.charAt(0).toUpperCase();


  const nomeSaudacao =
    document.getElementById("nomeSaudacao");

  const nomeUsuarioTopo =
    document.getElementById("nomeUsuarioTopo");

  const perfilUsuarioTopo =
    document.getElementById("perfilUsuarioTopo");

  const avatarUsuario =
    document.getElementById("avatarUsuario");


  if (nomeSaudacao) {
    nomeSaudacao.textContent = primeiroNome;
  }

  if (nomeUsuarioTopo) {
    nomeUsuarioTopo.textContent = nomeCompleto;
  }

  if (perfilUsuarioTopo) {
    perfilUsuarioTopo.textContent =
      perfilFormatado;
  }

  if (avatarUsuario) {
    avatarUsuario.textContent = inicial;
  }
}


// ============================================
// APLICAR PERMISSÕES NOS MENUS
// ============================================

function aplicarPermissoes(dadosUsuario) {

  const perfil =
    String(dadosUsuario.perfil || "")
      .trim()
      .toLowerCase();

  const administrador =
    perfil === "administrador";

  const modulos =
    dadosUsuario.modulos || {};

  document
    .querySelectorAll("[data-modulo]")
    .forEach(elemento => {

      const nomeModulo =
        elemento.dataset.modulo;

      const permitido =
        administrador ||
        modulos[nomeModulo] === true;

      if (permitido) {
        elemento.style.display = "";
        elemento.setAttribute("aria-hidden", "false");
      } else {
        elemento.style.display = "none";
        elemento.setAttribute("aria-hidden", "true");
      }

    });

  verificarMenuAdministracao(
    administrador,
    modulos
  );
}

// ============================================
// ESCONDER TÍTULO ADMINISTRAÇÃO
// ============================================

function verificarMenuAdministracao(
  administrador,
  modulos
) {

  const tituloAdministracao =
    document.getElementById(
      "tituloAdministracao"
    );

  const menuAdministracao =
    document.getElementById(
      "menuAdministracao"
    );

  const podeVerAdministracao =
    administrador ||
    modulos.usuarios === true ||
    modulos.configuracoes === true ||
    modulos.assinaturas === true;

  if (tituloAdministracao) {
    tituloAdministracao.style.display =
      podeVerAdministracao
        ? ""
        : "none";
  }

  if (menuAdministracao) {
    menuAdministracao.style.display =
      podeVerAdministracao
        ? ""
        : "none";
  }
}


// ============================================
// CONSULTAR PERMISSÃO EM OUTROS ARQUIVOS
// ============================================

window.usuarioPodeAcessar = function (modulo) {

  const usuario =
    window.usuarioAnalytics;

  if (!usuario) {
    return false;
  }

  const administrador =
    String(usuario.perfil || "")
      .trim()
      .toLowerCase() === "administrador";

  if (administrador) {
    return true;
  }

  return usuario.modulos?.[modulo] === true;
};


// ============================================
// ENCERRAR ACESSO
// ============================================

async function encerrarAcesso(mensagem) {

  try {
    await signOut(auth);
  } catch (erro) {
    console.error(
      "Erro ao desconectar usuário:",
      erro
    );
  }

  alert(mensagem);

  redirecionarLogin();
}


// ============================================
// VOLTAR AO LOGIN
// ============================================

function redirecionarLogin() {

  window.location.replace(
    "./login.html"
  );
}
