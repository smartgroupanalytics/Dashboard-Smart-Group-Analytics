import { auth, db } from "../firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const tabela = document.getElementById("tabelaUsuarios");
const tabelaContainer = document.getElementById("tabelaContainer");
const mensagem = document.getElementById("mensagem");
const estadoVazio = document.getElementById("estadoVazio");
const pesquisa = document.getElementById("pesquisaUsuario");
const totalUsuarios = document.getElementById("totalUsuarios");
const usuariosAtivos = document.getElementById("usuariosAtivos");
const totalAdministradores = document.getElementById("totalAdministradores");
const btnAtualizar = document.getElementById("btnAtualizar");
const btnNovoUsuario = document.getElementById("btnNovoUsuario");
const toast = document.getElementById("toast");

const modalUsuario = document.getElementById("modalUsuario");
const tituloModal = document.getElementById("tituloModal");
const formUsuario = document.getElementById("formUsuario");
const btnFecharModal = document.getElementById("btnFecharModal");
const btnCancelar = document.getElementById("btnCancelar");
const btnSalvar = document.getElementById("btnSalvar");
const campoUid = document.getElementById("campoUid");
const campoNome = document.getElementById("campoNome");
const campoEmail = document.getElementById("campoEmail");
const campoCargo = document.getElementById("campoCargo");
const campoSetor = document.getElementById("campoSetor");
const campoEmpresa = document.getElementById("campoEmpresa");
const campoPerfil = document.getElementById("campoPerfil");
const campoAtivo = document.getElementById("campoAtivo");

let usuarios = [];
let usuarioEmEdicao = null;

onAuthStateChanged(auth, async usuario => {
  if (!usuario) {
    window.top.location.replace("../login.html");
    return;
  }

  await carregarUsuarios();
  document.body.classList.remove("carregando");
});

async function carregarUsuarios() {
  mostrarCarregando();

  try {
    const referencia = collection(db, "usuarios");
    const resultado = await getDocs(referencia);

    usuarios = resultado.docs.map(documento => {
      const dadosOriginais = documento.data();
      const dadosCorrigidos = {};

      Object.entries(dadosOriginais).forEach(([campo, valor]) => {
        dadosCorrigidos[campo.trim()] = valor;
      });

      return { id: documento.id, ...dadosCorrigidos };
    });

    usuarios.sort((a, b) =>
      String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR")
    );

    atualizarResumo();
    renderizarUsuarios(usuarios);

  } catch (erro) {
    console.error("Erro ao carregar usuários:", erro);
    mensagem.hidden = false;
    mensagem.textContent =
      "Não foi possível carregar os usuários. Verifique as permissões do Firestore.";
    tabelaContainer.hidden = true;
    estadoVazio.hidden = true;
    mostrarToast("Erro ao consultar os usuários.", true);
  }
}

function renderizarUsuarios(lista) {
  mensagem.hidden = true;

  if (!lista.length) {
    tabela.innerHTML = "";
    tabelaContainer.hidden = true;
    estadoVazio.hidden = false;
    return;
  }

  estadoVazio.hidden = true;
  tabelaContainer.hidden = false;

  tabela.innerHTML = lista.map(usuario => {
    const nome = escaparHtml(usuario.nome || "Usuário sem nome");
    const email = escaparHtml(usuario.email || "E-mail não informado");
    const cargo = escaparHtml(usuario.cargo || "Cargo não informado");
    const setor = escaparHtml(usuario.setor || "Setor não informado");
    const perfil = escaparHtml(formatarPerfil(usuario.perfil));
    const empresa = escaparHtml(usuario.empresa || "Não informada");
    const ativo = usuario.ativo === true;
    const iniciais = obterIniciais(usuario.nome);

    return `
      <tr>
        <td>
          <div class="usuario-cell">
            <div class="avatar">${iniciais}</div>
            <div><strong>${nome}</strong><span>${email}</span></div>
          </div>
        </td>
        <td>${cargo}<span class="texto-secundario">${setor}</span></td>
        <td>
          <span class="badge perfil">
            <i class="fa-solid fa-shield-halved"></i>${perfil}
          </span>
        </td>
        <td>${empresa}</td>
        <td>
          <span class="badge ${ativo ? "ativo" : "inativo"}">
            <i class="fa-solid fa-circle"></i>${ativo ? "Ativo" : "Inativo"}
          </span>
        </td>
        <td>
        <div class="acoes">

<button class="btn-acao" type="button" title="Editar usuário"
        data-acao="editar" data-id="${usuario.id}">
    <i class="fa-solid fa-pen"></i>
</button>


<button class="btn-acao" type="button" title="Ver permissões"
        data-acao="permissoes" data-id="${usuario.id}">
    <i class="fa-solid fa-key"></i>
</button>


<button 
    class="btn-acao btn-excluir" 
    type="button" 
    title="Desativar usuário"
    data-acao="desativar"
    data-id="${usuario.id}">
    <i class="fa-solid fa-user-slash"></i>
</button>


</div>
        </td>
      </tr>
    `;
  }).join("");
}

function atualizarResumo() {
  totalUsuarios.textContent = usuarios.length;
  usuariosAtivos.textContent =
    usuarios.filter(usuario => usuario.ativo === true).length;
  totalAdministradores.textContent =
    usuarios.filter(usuario =>
      String(usuario.perfil || "").toLowerCase() === "administrador"
    ).length;
}

pesquisa.addEventListener("input", () => {
  const termo = pesquisa.value.toLowerCase().trim();

  if (!termo) {
    renderizarUsuarios(usuarios);
    return;
  }

  const filtrados = usuarios.filter(usuario => {
    const texto = [
      usuario.nome,
      usuario.email,
      usuario.cargo,
      usuario.setor,
      usuario.perfil,
      usuario.empresa
    ].join(" ").toLowerCase();

    return texto.includes(termo);
  });

  renderizarUsuarios(filtrados);
});

btnAtualizar.addEventListener("click", carregarUsuarios);
btnNovoUsuario.addEventListener("click", abrirNovoUsuario);
btnFecharModal.addEventListener("click", fecharModal);
btnCancelar.addEventListener("click", fecharModal);

modalUsuario.addEventListener("click", evento => {
  if (evento.target === modalUsuario) fecharModal();
});

tabela.addEventListener("click", evento => {

    const botao =
        evento.target.closest("[data-acao]");

    if (!botao) return;


    const usuario =
        usuarios.find(
            item => item.id === botao.dataset.id
        );


    if (!usuario) return;



    if(botao.dataset.acao === "editar"){

        abrirEdicao(usuario);

        return;

    }



    if(botao.dataset.acao === "desativar"){

        desativarUsuario(usuario);

        return;

    }


});

// =====================================
// DESATIVAR USUÁRIO
// =====================================

async function desativarUsuario(usuario){

    const confirmar =
        confirm(
            `Deseja realmente desativar o usuário ${usuario.nome}?`
        );


    if(!confirmar){
        return;
    }


    try{

        const referencia =
            doc(
                db,
                "usuarios",
                usuario.id
            );


        await updateDoc(
            referencia,
            {
                ativo:false,
                atualizadoEm:serverTimestamp()
            }
        );


        mostrarToast(
            "Usuário desativado com sucesso."
        );


        await carregarUsuarios();


    }catch(erro){

        console.error(
            "Erro ao desativar usuário:",
            erro
        );


        mostrarToast(
            "Não foi possível desativar o usuário.",
            true
        );

    }

}



formUsuario.addEventListener("submit", salvarUsuario);

function abrirNovoUsuario() {
  usuarioEmEdicao = null;
  tituloModal.textContent = "Novo usuário";
  formUsuario.reset();
  campoUid.disabled = false;
  campoEmpresa.value = "Smart Group";
  campoPerfil.value = "usuario";
  campoAtivo.checked = true;

  document.querySelectorAll("[data-modulo]").forEach(campo => {
    campo.checked = campo.dataset.modulo === "dashboard";
  });

  modalUsuario.hidden = false;
  campoUid.focus();
}

function abrirEdicao(usuario) {
  usuarioEmEdicao = usuario;
  tituloModal.textContent = "Editar usuário";
  campoUid.value = usuario.uid || usuario.id || "";
campoUid.disabled = false;
  campoUid.value = usuario.uid || usuario.id || "";
  campoNome.value = usuario.nome || "";
  campoEmail.value = usuario.email || "";
  campoCargo.value = usuario.cargo || "";
  campoSetor.value = usuario.setor || "";
  campoEmpresa.value = usuario.empresa || "Smart Group";
  campoPerfil.value = usuario.perfil || "usuario";
  campoAtivo.checked = usuario.ativo === true;

  document.querySelectorAll("[data-modulo]").forEach(campo => {
    campo.checked = usuario.modulos?.[campo.dataset.modulo] === true;
  });

  modalUsuario.hidden = false;
}

function fecharModal() {
  modalUsuario.hidden = true;
  usuarioEmEdicao = null;
}

async function salvarUsuario(evento) {
  evento.preventDefault();

  // =====================================
// PROTEÇÃO DE ADMINISTRADORES
// =====================================

if(
    campoPerfil.value === "administrador" &&
    window.usuarioAnalytics?.perfil !== "administrador"
){

    mostrarToast(
        "Somente administradores podem criar administradores.",
        true
    );

    return;
}

  const uid = String(campoUid.value || "").trim();

  if (!uid) {
    mostrarToast("Informe o UID do Authentication.", true);
    return;
  }

  const modulos = {};
  document.querySelectorAll("[data-modulo]").forEach(campo => {
    modulos[campo.dataset.modulo] = campo.checked;
  });

  const setor = String(campoSetor.value || "").trim();

  const dados = {

    uid: campoUid.value.trim(),
    
    nome: String(campoNome.value || "").trim(),
    email: String(campoEmail.value || "").trim().toLowerCase(),
    cargo: String(campoCargo.value || "").trim(),
    setor,
    setorChave: normalizarChaveSetor(setor),
    empresa: String(campoEmpresa.value || "").trim() || "Smart Group",
    perfil: campoPerfil.value,
    ativo: campoAtivo.checked,
    modulos,
    atualizadoEm: serverTimestamp()
  };

  btnSalvar.disabled = true;
  btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando';

  try {

const referenciaNova = doc(db, "usuarios", uid);

if (usuarioEmEdicao) {

  const uidAntigo = usuarioEmEdicao.id;
  const uidFoiAlterado = uid !== uidAntigo;

  if (uidFoiAlterado) {

    const confirmarAlteracao = confirm(
      `Você está alterando o UID de:\n\n` +
      `${usuarioEmEdicao.nome || "Usuário"}\n\n` +
      `UID antigo: ${uidAntigo}\n` +
      `UID novo: ${uid}\n\n` +
      `Confirma a correção?`
    );

    if (!confirmarAlteracao) {
      btnSalvar.disabled = false;
      btnSalvar.innerHTML =
        '<i class="fa-solid fa-floppy-disk"></i> Salvar';
      return;
    }

    const referenciaAntiga =
      doc(db, "usuarios", uidAntigo);

    await setDoc(referenciaNova, {
      ...usuarioEmEdicao,
      ...dados,
      foto: usuarioEmEdicao.foto || "",
      criadoEm:
        usuarioEmEdicao.criadoEm ||
        serverTimestamp()
    });

    await deleteDoc(referenciaAntiga);

    mostrarToast("UID corrigido e usuário atualizado.");

  } else {

    await updateDoc(referenciaNova, dados);

    mostrarToast("Usuário atualizado com sucesso.");
  }

} else {

  await setDoc(referenciaNova, {
    ...dados,
    foto: "",
    criadoEm: serverTimestamp()
  });

  mostrarToast("Perfil criado com sucesso.");
}
    

    fecharModal();
    await carregarUsuarios();

  } catch (erro) {
    console.error("Erro ao salvar usuário:", erro);
    mostrarToast("Não foi possível salvar o usuário.", true);

  } finally {
    btnSalvar.disabled = false;
    btnSalvar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar';
  }
}

function mostrarCarregando() {
  mensagem.hidden = false;
  mensagem.textContent = "Carregando usuários...";
  tabelaContainer.hidden = true;
  estadoVazio.hidden = true;
}

function normalizarChaveSetor(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function formatarPerfil(perfil) {
  const valor = String(perfil || "usuário");
  return valor.charAt(0).toUpperCase() + valor.slice(1).toLowerCase();
}

function obterIniciais(nome) {
  const partes = String(nome || "U").trim().split(/\s+/).filter(Boolean);
  return partes.slice(0, 2).map(parte => parte.charAt(0).toUpperCase()).join("");
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function mostrarToast(texto, erro = false) {
  toast.textContent = texto;
  toast.classList.toggle("erro", erro);
  toast.classList.add("visivel");
  window.clearTimeout(mostrarToast.tempo);
  mostrarToast.tempo = window.setTimeout(() => {
    toast.classList.remove("visivel");
  }, 3500);
}
