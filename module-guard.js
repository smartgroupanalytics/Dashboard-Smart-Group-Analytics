// ============================================
// SMART GROUP ANALYTICS
// PROTEÇÃO DIRETA DOS MÓDULOS
// ============================================

import {
  auth,
  db
} from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// ============================================
// PROTEGER MÓDULO
// ============================================

export function protegerModulo(moduloNecessario) {

  esconderPagina();

  return new Promise((resolve, reject) => {

    const cancelarObservador = onAuthStateChanged(
      auth,
      async usuarioFirebase => {

        cancelarObservador();

        if (!usuarioFirebase) {

          enviarParaLogin();

          reject(
            new Error("Usuário não autenticado.")
          );

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

            bloquearAcesso(
              "Seu usuário não possui perfil cadastrado no Analytics."
            );

            reject(
              new Error("Perfil não encontrado.")
            );

            return;
          }

          const dadosUsuario =
            normalizarCampos(
              documentoUsuario.data()
            );

          if (dadosUsuario.ativo !== true) {

            bloquearAcesso(
              "Seu usuário está inativo. Entre em contato com o administrador."
            );

            reject(
              new Error("Usuário inativo.")
            );

            return;
          }

          const perfil =
            String(dadosUsuario.perfil || "")
              .trim()
              .toLowerCase();

          const administrador =
            perfil === "administrador";

          const modulos =
            dadosUsuario.modulos || {};

          const possuiPermissao =
            administrador ||
            modulos[moduloNecessario] === true ||
            (moduloNecessario === "comexPJ" && modulos.comex === true);

          if (!possuiPermissao) {

            bloquearAcesso(
              "Você não possui permissão para acessar este módulo."
            );

            reject(
              new Error(
                `Acesso negado ao módulo: ${moduloNecessario}`
              )
            );

            return;
          }

          window.usuarioAnalytics = {
            uid: usuarioFirebase.uid,
            emailFirebase: usuarioFirebase.email,
            ...dadosUsuario
          };

          window.moduloAtualAnalytics =
            moduloNecessario;

          mostrarPagina();

          resolve(window.usuarioAnalytics);

        } catch (erro) {

          console.error(
            "Erro ao verificar permissão do módulo:",
            erro
          );

          bloquearAcesso(
            "Não foi possível validar sua permissão."
          );

          reject(erro);
        }
      },
      erroAutenticacao => {

        console.error(
          "Erro ao verificar autenticação:",
          erroAutenticacao
        );

        enviarParaLogin();

        reject(erroAutenticacao);
      }
    );
  });
}


// ============================================
// NORMALIZAR CAMPOS
// ============================================

function normalizarCampos(dados) {

  const camposNormalizados = {};

  Object.entries(dados || {})
    .forEach(([campo, valor]) => {

      camposNormalizados[
        String(campo).trim()
      ] = valor;

    });

  return camposNormalizados;
}


// ============================================
// ESCONDER PÁGINA DURANTE A VERIFICAÇÃO
// ============================================

function esconderPagina() {

  document.documentElement.style.visibility =
    "hidden";
}


// ============================================
// MOSTRAR PÁGINA AUTORIZADA
// ============================================

function mostrarPagina() {

  document.documentElement.style.visibility =
    "visible";
}


// ============================================
// BLOQUEAR ACESSO
// ============================================

function bloquearAcesso(mensagem) {

  alert(mensagem);

  enviarParaPortal();
}


// ============================================
// VOLTAR PARA O PORTAL
// ============================================

function enviarParaPortal() {

  window.location.replace(
    caminhoPortal()
  );
}


// ============================================
// ENVIAR PARA LOGIN
// ============================================

function enviarParaLogin() {

  window.location.replace(
    caminhoLogin()
  );
}


// ============================================
// IDENTIFICAR CAMINHO DA PÁGINA
// ============================================

function caminhoPortal() {

  const caminho =
    window.location.pathname;

  if (caminho.includes("/modulos/comex/pj/")) {
    return "../../../index.html";
  }

  if (caminho.includes("/modulos/")) {
    return "../../index.html";
  }

  if (caminho.includes("/usuarios/")) {
    return "../index.html";
  }

  return "./index.html";
}


function caminhoLogin() {

  const caminho =
    window.location.pathname;

  if (caminho.includes("/modulos/comex/pj/")) {
    return "../../../login.html";
  }

  if (caminho.includes("/modulos/")) {
    return "../../login.html";
  }

  if (caminho.includes("/usuarios/")) {
    return "../login.html";
  }

  return "./login.html";
}
