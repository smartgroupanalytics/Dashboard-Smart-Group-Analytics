// SG-IA — Autorização independente do menu principal.
// Não usa "data-modulo": o perfil administrador não libera a IA automaticamente.
import { auth } from '../../firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';

const ENDPOINT = 'https://smart-group-estoque-ia.fabiosilveiradss.workers.dev/api/verificar-acesso';
const link = document.getElementById('smartIaMenuLink');
let geracao = 0;
window.smartGroupIaAutorizado = false;

function atualizarMenu(permitido) {
  window.smartGroupIaAutorizado = permitido === true;
  if (!link) return;
  link.hidden = !permitido;
  link.style.display = permitido ? '' : 'none';
  link.setAttribute('aria-hidden', permitido ? 'false' : 'true');
  link.tabIndex = permitido ? 0 : -1;
}

onAuthStateChanged(auth, async usuario => {
  const atual = ++geracao;
  atualizarMenu(false);
  if (!usuario) return;
  try {
    const token = await usuario.getIdToken();
    const resposta = await fetch(ENDPOINT, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    });
    if (atual !== geracao) return;
    if (!resposta.ok) return;
    const dados = await resposta.json();
    if (atual === geracao) atualizarMenu(dados.autorizado === true);
  } catch {
    if (atual === geracao) atualizarMenu(false);
  }
});
