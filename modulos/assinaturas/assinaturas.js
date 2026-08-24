import { protegerModulo } from "../../module-guard.js?v=2";
import { db } from "../../firebase-config.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const COLECAO = "assinaturas";
const CONFIG_REF = doc(db, "configuracoes", "assinaturas");

let usuarioAtual = null;
let editorUid = "";
let assinaturas = [];
let assinaturaEmEdicao = null;
let usuariosAcesso = [];
let toastTimer = null;

const $ = seletor => document.querySelector(seletor);
const $$ = seletor => [...document.querySelectorAll(seletor)];

const els = {
  btnNova: $("#btnNovaAssinatura"),
  btnAcessos: $("#btnAcessos"),
  btnAtualizar: $("#btnAtualizar"),
  btnDefinirEditor: $("#btnDefinirEditor"),
  avisoDefinirEditor: $("#avisoDefinirEditor"),
  modoAcesso: $("#modoAcesso"),
  corpoTabela: $("#corpoTabela"),
  estadoVazio: $("#estadoVazio"),
  resumoLista: $("#resumoLista"),
  filtroBusca: $("#filtroBusca"),
  filtroStatus: $("#filtroStatus"),
  filtroCategoria: $("#filtroCategoria"),
  filtroFornecedor: $("#filtroFornecedor"),
  listaProximos: $("#listaProximos"),
  categoriasResumo: $("#categoriasResumo"),
  custosCategoria: $("#custosCategoria"),
  kpiAtivas: $("#kpiAtivas"),
  kpi30: $("#kpi30"),
  kpi60: $("#kpi60"),
  kpiVencidas: $("#kpiVencidas"),
  kpiCusto: $("#kpiCusto"),
  modalAssinatura: $("#modalAssinatura"),
  modalAcessos: $("#modalAcessos"),
  modalDetalhes: $("#modalDetalhes"),
  tituloModalAssinatura: $("#tituloModalAssinatura"),
  formAssinatura: $("#formAssinatura"),
  btnSalvarAssinatura: $("#btnSalvarAssinatura"),
  buscaUsuarios: $("#buscaUsuarios"),
  listaUsuariosAcesso: $("#listaUsuariosAcesso"),
  btnSalvarAcessos: $("#btnSalvarAcessos"),
  tituloDetalhes: $("#tituloDetalhes"),
  conteudoDetalhes: $("#conteudoDetalhes"),
  toast: $("#toast")
};

iniciar();

async function iniciar() {
  try {
    usuarioAtual = await protegerModulo("assinaturas");
    await carregarConfiguracaoEditor();
    configurarEventos();
    await carregarAssinaturas();
  } catch (erro) {
    console.error("Falha ao iniciar Assinaturas e Licenças:", erro);
  }
}

function ehAdministrador() {
  return String(usuarioAtual?.perfil || "").trim().toLowerCase() === "administrador";
}

function ehEditor() {
  return Boolean(usuarioAtual?.uid && editorUid && usuarioAtual.uid === editorUid);
}

async function carregarConfiguracaoEditor() {
  try {
    const snap = await getDoc(CONFIG_REF);
    editorUid = snap.exists() ? String(snap.data()?.editorUid || "") : "";
  } catch (erro) {
    console.warn("Não foi possível ler a configuração do editor:", erro);
    editorUid = "";
  }
  atualizarModoAcesso();
}

function atualizarModoAcesso() {
  const editor = ehEditor();
  const semEditor = !editorUid;

  $$(".somente-editor").forEach(item => {
    item.hidden = !editor;
  });

  if (semEditor && ehAdministrador()) {
    els.avisoDefinirEditor.hidden = false;
    els.modoAcesso.textContent = "Administrador — aguardando definição do editor principal";
  } else {
    els.avisoDefinirEditor.hidden = true;
    els.modoAcesso.textContent = editor
      ? "Editor principal — visualização e edição"
      : "Somente visualização";
  }
}

function configurarEventos() {
  els.btnNova?.addEventListener("click", () => abrirFormulario());
  els.btnAcessos?.addEventListener("click", abrirGerenciamentoAcessos);
  els.btnAtualizar?.addEventListener("click", carregarAssinaturas);
  els.btnDefinirEditor?.addEventListener("click", definirEditorPrincipal);
  els.formAssinatura?.addEventListener("submit", salvarAssinatura);
  els.btnSalvarAcessos?.addEventListener("click", salvarAcessos);
  els.buscaUsuarios?.addEventListener("input", renderizarUsuariosAcesso);

  [els.filtroBusca, els.filtroStatus, els.filtroCategoria, els.filtroFornecedor]
    .filter(Boolean)
    .forEach(campo => campo.addEventListener(campo.tagName === "INPUT" ? "input" : "change", renderizarTudo));

  $$('[data-fechar]').forEach(botao => {
    botao.addEventListener("click", () => fecharModal(botao.dataset.fechar));
  });

  $$(".modal").forEach(modal => {
    modal.addEventListener("click", evento => {
      if (evento.target === modal) modal.hidden = true;
    });
  });

  document.addEventListener("keydown", evento => {
    if (evento.key === "Escape") $$(".modal").forEach(modal => modal.hidden = true);
  });

  els.corpoTabela?.addEventListener("click", tratarAcaoTabela);
}

async function definirEditorPrincipal() {
  if (!ehAdministrador() || editorUid) return;

  const confirmou = confirm(
    "Deseja definir o seu usuário como editor principal de Assinaturas e Licenças?\n\n" +
    "Depois disso, somente este UID poderá cadastrar, editar, renovar, excluir e liberar visualizações."
  );
  if (!confirmou) return;

  els.btnDefinirEditor.disabled = true;
  try {
    await setDoc(CONFIG_REF, {
      editorUid: usuarioAtual.uid,
      editorNome: usuarioAtual.nome || "",
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    });
    editorUid = usuarioAtual.uid;

    await updateDoc(doc(db, "usuarios", usuarioAtual.uid), {
      "modulos.assinaturas": true,
      atualizadoEm: serverTimestamp()
    }).catch(() => {});

    atualizarModoAcesso();
    mostrarToast("Seu usuário foi definido como editor principal.");
  } catch (erro) {
    console.error(erro);
    mostrarToast("Não foi possível definir o editor. Aplique as regras do Firestore incluídas no projeto.", true);
  } finally {
    els.btnDefinirEditor.disabled = false;
  }
}

async function carregarAssinaturas() {
  els.btnAtualizar?.classList.add("carregando");
  try {
    let resultado;
    try {
      resultado = await getDocs(query(collection(db, COLECAO), orderBy("vencimento", "asc")));
    } catch {
      resultado = await getDocs(collection(db, COLECAO));
    }

    assinaturas = resultado.docs.map(item => ({ id: item.id, ...item.data() }));
    assinaturas.sort((a, b) => dataOrdenavel(a.vencimento) - dataOrdenavel(b.vencimento));
    atualizarOpcoesFiltros();
    renderizarTudo();
  } catch (erro) {
    console.error("Erro ao carregar assinaturas:", erro);
    mostrarToast("Não foi possível carregar as assinaturas. Verifique as regras do Firestore.", true);
    assinaturas = [];
    renderizarTudo();
  } finally {
    els.btnAtualizar?.classList.remove("carregando");
  }
}

function renderizarTudo() {
  const lista = obterListaFiltrada();
  renderizarTabela(lista);
  renderizarIndicadores();
  renderizarProximos();
  renderizarCategorias();
  renderizarCustos();
}

function obterListaFiltrada() {
  const busca = normalizar(els.filtroBusca?.value);
  const status = els.filtroStatus?.value || "";
  const categoria = els.filtroCategoria?.value || "";
  const fornecedor = els.filtroFornecedor?.value || "";

  return assinaturas.filter(item => {
    const texto = normalizar([item.nome, item.fornecedor, item.categoria, item.plano, item.responsavel].join(" "));
    const statusItem = obterStatus(item.vencimento).chave;
    return (!busca || texto.includes(busca)) &&
      (!status || statusItem === status) &&
      (!categoria || item.categoria === categoria) &&
      (!fornecedor || item.fornecedor === fornecedor);
  });
}

function renderizarTabela(lista) {
  els.resumoLista.textContent = `${lista.length} ${lista.length === 1 ? "registro" : "registros"}`;
  els.estadoVazio.hidden = lista.length > 0;

  if (!lista.length) {
    els.corpoTabela.innerHTML = "";
    return;
  }

  const editor = ehEditor();
  els.corpoTabela.innerHTML = lista.map(item => {
    const info = obterStatus(item.vencimento);
    const diasTexto = info.dias < 0 ? `${Math.abs(info.dias)} dias vencido` : `${info.dias} dias`;
    const acoesEditor = editor ? `
      <button class="acao" data-acao="editar" data-id="${item.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
      <button class="acao" data-acao="renovar" data-id="${item.id}" title="Renovar"><i class="fa-solid fa-rotate"></i></button>
      <button class="acao perigo" data-acao="excluir" data-id="${item.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
    ` : "";

    return `
      <tr>
        <td><div class="assinatura-cell"><div class="logo-assinatura"><i class="${iconeCategoria(item.categoria)}"></i></div><div><strong>${escapar(item.nome || "Sem nome")}</strong><small>${escapar(item.plano || (item.renovacaoAutomatica ? "Renovação automática" : "Cadastro de assinatura"))}</small></div></div></td>
        <td>${escapar(item.fornecedor || "—")}</td>
        <td>${escapar(item.categoria || "Outros")}</td>
        <td>${formatarData(item.vencimento)}</td>
        <td><span class="dias ${info.chave}">${diasTexto}</span></td>
        <td><span class="badge-status ${info.chave}"><i class="fa-solid fa-circle"></i>${info.rotulo}</span></td>
        <td>${formatarMoeda(calcularValorAnual(item))}</td>
        <td><div class="acoes-linha"><button class="acao" data-acao="ver" data-id="${item.id}" title="Visualizar"><i class="fa-solid fa-eye"></i></button>${acoesEditor}</div></td>
      </tr>`;
  }).join("");
}

function renderizarIndicadores() {
  const estados = assinaturas.map(item => obterStatus(item.vencimento));
  els.kpiAtivas.textContent = estados.filter(s => s.dias >= 0).length;
  els.kpi30.textContent = estados.filter(s => s.dias >= 0 && s.dias <= 30).length;
  els.kpi60.textContent = estados.filter(s => s.dias >= 0 && s.dias <= 60).length;
  els.kpiVencidas.textContent = estados.filter(s => s.dias < 0).length;
  els.kpiCusto.textContent = formatarMoeda(assinaturas.reduce((total, item) => total + calcularValorAnual(item), 0));
}

function renderizarProximos() {
  const proximos = [...assinaturas]
    .map(item => ({ ...item, info: obterStatus(item.vencimento) }))
    .sort((a, b) => a.info.dias - b.info.dias)
    .slice(0, 6);

  if (!proximos.length) {
    els.listaProximos.innerHTML = '<div class="sem-dados-lateral">Nenhum vencimento cadastrado.</div>';
    return;
  }

  els.listaProximos.innerHTML = proximos.map(item => {
    const dias = item.info.dias < 0 ? "Vencido" : `${item.info.dias} dias`;
    return `<div class="proximo-item"><div class="proximo-icone"><i class="${iconeCategoria(item.categoria)}"></i></div><div class="proximo-info"><strong>${escapar(item.nome || "Assinatura")}</strong><small>${formatarData(item.vencimento)}</small></div><span class="pill-dias ${item.info.chave}">${dias}</span></div>`;
  }).join("");
}

function renderizarCategorias() {
  const mapa = new Map();
  assinaturas.forEach(item => {
    const cat = item.categoria || "Outros";
    mapa.set(cat, (mapa.get(cat) || 0) + 1);
  });
  const total = assinaturas.length || 1;
  const itens = [...mapa.entries()].sort((a, b) => b[1] - a[1]);

  els.categoriasResumo.innerHTML = itens.length
    ? itens.map(([cat, qtd]) => `<div class="categoria-linha"><span>${escapar(cat)}</span><strong>${qtd}</strong><small>${Math.round(qtd / total * 100)}% do total</small></div>`).join("")
    : '<div class="sem-dados-lateral">Sem categorias cadastradas.</div>';
}

function renderizarCustos() {
  const mapa = new Map();
  assinaturas.forEach(item => {
    const cat = item.categoria || "Outros";
    mapa.set(cat, (mapa.get(cat) || 0) + calcularValorAnual(item));
  });
  const itens = [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...itens.map(([, valor]) => valor));

  els.custosCategoria.innerHTML = itens.length
    ? itens.map(([cat, valor]) => `<div class="barra-custo"><div class="barra-topo"><span>${escapar(cat)}</span><strong>${formatarMoeda(valor)}</strong></div><div class="barra-trilho"><div class="barra-preenchimento" style="width:${Math.max(2, Math.round(valor / max * 100))}%"></div></div></div>`).join("")
    : '<div class="sem-dados-lateral">Sem custos cadastrados.</div>';
}

function atualizarOpcoesFiltros() {
  preencherSelect(els.filtroCategoria, [...new Set(assinaturas.map(i => i.categoria).filter(Boolean))].sort(), "Todas as categorias");
  preencherSelect(els.filtroFornecedor, [...new Set(assinaturas.map(i => i.fornecedor).filter(Boolean))].sort(), "Todos os fornecedores");
}

function preencherSelect(select, opcoes, titulo) {
  if (!select) return;
  const atual = select.value;
  select.innerHTML = `<option value="">${titulo}</option>` + opcoes.map(v => `<option value="${atributo(v)}">${escapar(v)}</option>`).join("");
  if (opcoes.includes(atual)) select.value = atual;
}

function tratarAcaoTabela(evento) {
  const botao = evento.target.closest("[data-acao]");
  if (!botao) return;
  const item = assinaturas.find(a => a.id === botao.dataset.id);
  if (!item) return;

  if (botao.dataset.acao === "ver") abrirDetalhes(item);
  if (botao.dataset.acao === "editar" && ehEditor()) abrirFormulario(item);
  if (botao.dataset.acao === "renovar" && ehEditor()) renovarAssinatura(item);
  if (botao.dataset.acao === "excluir" && ehEditor()) excluirAssinatura(item);
}

function abrirFormulario(item = null) {
  if (!ehEditor()) return;
  assinaturaEmEdicao = item;
  els.formAssinatura.reset();
  $("#campoQuantidade").value = 1;
  $("#campoPeriodicidade").value = "anual";

  if (item) {
    els.tituloModalAssinatura.textContent = "Editar assinatura";
    $("#campoNome").value = item.nome || "";
    $("#campoFornecedor").value = item.fornecedor || "";
    $("#campoCategoria").value = item.categoria || "Outros";
    $("#campoPlano").value = item.plano || "";
    $("#campoQuantidade").value = item.quantidade || 1;
    $("#campoValor").value = numero(item.valorCobranca);
    $("#campoPeriodicidade").value = item.periodicidade || "anual";
    $("#campoVencimento").value = normalizarDataInput(item.vencimento);
    $("#campoResponsavel").value = item.responsavel || "";
    $("#campoEmailConta").value = item.emailConta || "";
    $("#campoPagamento").value = item.formaPagamento || "";
    $("#campoUrl").value = item.url || "";
    $("#campoRenovacaoAutomatica").checked = item.renovacaoAutomatica === true;
    $("#campoObservacoes").value = item.observacoes || "";
  } else {
    els.tituloModalAssinatura.textContent = "Nova assinatura";
  }

  els.modalAssinatura.hidden = false;
  setTimeout(() => $("#campoNome")?.focus(), 20);
}

async function salvarAssinatura(evento) {
  evento.preventDefault();
  if (!ehEditor()) return mostrarToast("Somente o editor principal pode salvar alterações.", true);

  const dados = {
    nome: valor("#campoNome"),
    fornecedor: valor("#campoFornecedor"),
    categoria: valor("#campoCategoria") || "Outros",
    plano: valor("#campoPlano"),
    quantidade: Math.max(1, Number(valor("#campoQuantidade")) || 1),
    valorCobranca: Math.max(0, Number(valor("#campoValor")) || 0),
    periodicidade: valor("#campoPeriodicidade") || "anual",
    vencimento: valor("#campoVencimento"),
    responsavel: valor("#campoResponsavel"),
    emailConta: valor("#campoEmailConta"),
    formaPagamento: valor("#campoPagamento"),
    url: valor("#campoUrl"),
    renovacaoAutomatica: $("#campoRenovacaoAutomatica").checked,
    observacoes: valor("#campoObservacoes"),
    atualizadoEm: serverTimestamp(),
    atualizadoPorUid: usuarioAtual.uid,
    atualizadoPorNome: usuarioAtual.nome || ""
  };

  els.btnSalvarAssinatura.disabled = true;
  try {
    if (assinaturaEmEdicao) {
      await updateDoc(doc(db, COLECAO, assinaturaEmEdicao.id), dados);
      mostrarToast("Assinatura atualizada com sucesso.");
    } else {
      await addDoc(collection(db, COLECAO), {
        ...dados,
        criadoEm: serverTimestamp(),
        criadoPorUid: usuarioAtual.uid,
        historicoRenovacoes: []
      });
      mostrarToast("Assinatura cadastrada com sucesso.");
    }
    fecharModal("modalAssinatura");
    await carregarAssinaturas();
  } catch (erro) {
    console.error(erro);
    mostrarToast("Não foi possível salvar. Verifique as permissões do Firestore.", true);
  } finally {
    els.btnSalvarAssinatura.disabled = false;
  }
}

async function renovarAssinatura(item) {
  const atual = normalizarDataInput(item.vencimento);
  const novaData = prompt(`Nova data de vencimento para ${item.nome}:`, sugerirProximaData(atual, item.periodicidade));
  if (!novaData) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(novaData)) return mostrarToast("Informe a data no formato AAAA-MM-DD.", true);

  const historico = Array.isArray(item.historicoRenovacoes) ? [...item.historicoRenovacoes] : [];
  historico.push({
    vencimentoAnterior: atual || "",
    novoVencimento: novaData,
    renovadoEm: new Date().toISOString(),
    renovadoPorUid: usuarioAtual.uid,
    renovadoPorNome: usuarioAtual.nome || ""
  });

  try {
    await updateDoc(doc(db, COLECAO, item.id), {
      vencimento: novaData,
      historicoRenovacoes: historico.slice(-30),
      atualizadoEm: serverTimestamp(),
      atualizadoPorUid: usuarioAtual.uid,
      atualizadoPorNome: usuarioAtual.nome || ""
    });
    mostrarToast("Renovação registrada com sucesso.");
    await carregarAssinaturas();
  } catch (erro) {
    console.error(erro);
    mostrarToast("Não foi possível registrar a renovação.", true);
  }
}

async function excluirAssinatura(item) {
  const confirmou = confirm(`Excluir definitivamente a assinatura “${item.nome}”?`);
  if (!confirmou) return;
  try {
    await deleteDoc(doc(db, COLECAO, item.id));
    mostrarToast("Assinatura excluída.");
    await carregarAssinaturas();
  } catch (erro) {
    console.error(erro);
    mostrarToast("Não foi possível excluir a assinatura.", true);
  }
}

function abrirDetalhes(item) {
  els.tituloDetalhes.textContent = item.nome || "Assinatura";
  const info = obterStatus(item.vencimento);
  const historico = Array.isArray(item.historicoRenovacoes) ? item.historicoRenovacoes : [];
  const ultimo = historico.length ? historico[historico.length - 1] : null;

  els.conteudoDetalhes.innerHTML = [
    detalhe("Fornecedor", escapar(item.fornecedor || "—")),
    detalhe("Categoria", escapar(item.categoria || "Outros")),
    detalhe("Plano / descrição", escapar(item.plano || "—")),
    detalhe("Licenças", String(item.quantidade || 1)),
    detalhe("Vencimento", formatarData(item.vencimento)),
    detalhe("Status", `${info.rotulo} — ${info.dias < 0 ? Math.abs(info.dias) + " dias vencido" : info.dias + " dias restantes"}`),
    detalhe("Valor da cobrança", formatarMoeda(numero(item.valorCobranca))),
    detalhe("Periodicidade", formatarPeriodicidade(item.periodicidade)),
    detalhe("Valor anual estimado", formatarMoeda(calcularValorAnual(item))),
    detalhe("Renovação automática", item.renovacaoAutomatica ? "Sim" : "Não"),
    detalhe("Responsável", escapar(item.responsavel || "—")),
    detalhe("E-mail da conta", escapar(item.emailConta || "—")),
    detalhe("Forma de pagamento", escapar(item.formaPagamento || "—")),
    detalhe("Portal", item.url ? `<a href="${atributo(item.url)}" target="_blank" rel="noopener noreferrer">Abrir portal</a>` : "—", true),
    detalhe("Última renovação", ultimo ? `${formatarData(ultimo.novoVencimento)} (${escapar(ultimo.renovadoPorNome || "usuário")})` : "—", true),
    detalhe("Observações", escapar(item.observacoes || "—"), true)
  ].join("");
  els.modalDetalhes.hidden = false;
}

function detalhe(rotulo, conteudo, largo = false) {
  return `<div class="detalhe ${largo ? "largo" : ""}"><span>${escapar(rotulo)}</span><strong>${conteudo}</strong></div>`;
}

async function abrirGerenciamentoAcessos() {
  if (!ehEditor()) return;
  els.modalAcessos.hidden = false;
  els.listaUsuariosAcesso.innerHTML = '<div class="sem-dados-lateral">Carregando usuários...</div>';
  try {
    const resultado = await getDocs(collection(db, "usuarios"));
    usuariosAcesso = resultado.docs.map(d => ({ id: d.id, ...normalizarCampos(d.data()) }))
      .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
    renderizarUsuariosAcesso();
  } catch (erro) {
    console.error(erro);
    els.listaUsuariosAcesso.innerHTML = '<div class="sem-dados-lateral">Não foi possível carregar os usuários.</div>';
    mostrarToast("Não foi possível consultar os usuários.", true);
  }
}

function renderizarUsuariosAcesso() {
  if (!els.listaUsuariosAcesso) return;
  const busca = normalizar(els.buscaUsuarios?.value);
  const filtrados = usuariosAcesso.filter(u => !busca || normalizar([u.nome, u.email, u.setor, u.cargo].join(" ")).includes(busca));

  els.listaUsuariosAcesso.innerHTML = filtrados.length ? filtrados.map(u => {
    const proprioEditor = u.id === editorUid;
    const marcado = proprioEditor || u.modulos?.assinaturas === true;
    return `<label class="usuario-acesso"><div class="usuario-acesso-info"><strong>${escapar(u.nome || "Usuário sem nome")}${proprioEditor ? " • Editor principal" : ""}</strong><small>${escapar(u.email || "E-mail não informado")} ${u.setor ? "• " + escapar(u.setor) : ""}</small></div><input type="checkbox" data-uid="${u.id}" ${marcado ? "checked" : ""} ${proprioEditor ? "disabled" : ""}></label>`;
  }).join("") : '<div class="sem-dados-lateral">Nenhum usuário encontrado.</div>';
}

async function salvarAcessos() {
  if (!ehEditor()) return;
  const caixas = $$("#listaUsuariosAcesso input[data-uid]");
  if (!caixas.length) return;

  els.btnSalvarAcessos.disabled = true;
  try {
    await Promise.all(caixas.map(caixa => updateDoc(doc(db, "usuarios", caixa.dataset.uid), {
      "modulos.assinaturas": caixa.checked,
      atualizadoEm: serverTimestamp()
    })));
    fecharModal("modalAcessos");
    mostrarToast("Acessos de visualização atualizados.");
  } catch (erro) {
    console.error(erro);
    mostrarToast("Não foi possível salvar todos os acessos.", true);
  } finally {
    els.btnSalvarAcessos.disabled = false;
  }
}

function fecharModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.hidden = true;
  if (id === "modalAssinatura") assinaturaEmEdicao = null;
}

function obterStatus(vencimento) {
  const dias = diasAte(vencimento);
  if (!Number.isFinite(dias)) return { chave: "atencao", rotulo: "Sem data", dias: 99999 };
  if (dias < 0) return { chave: "vencido", rotulo: "Vencido", dias };
  if (dias <= 15) return { chave: "urgente", rotulo: "Urgente", dias };
  if (dias <= 60) return { chave: "atencao", rotulo: "Atenção", dias };
  return { chave: "normal", rotulo: "Normal", dias };
}

function diasAte(valorData) {
  const data = parseData(valorData);
  if (!data) return NaN;
  const hoje = new Date();
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.ceil((data - inicioHoje) / 86400000);
}

function parseData(valorData) {
  if (!valorData) return null;
  if (typeof valorData?.toDate === "function") return valorData.toDate();
  if (valorData instanceof Date) return valorData;
  const texto = String(valorData).slice(0, 10);
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const data = new Date(valorData);
  return Number.isNaN(data.getTime()) ? null : data;
}

function normalizarDataInput(valorData) {
  const data = parseData(valorData);
  if (!data) return "";
  return `${data.getFullYear()}-${String(data.getMonth()+1).padStart(2,"0")}-${String(data.getDate()).padStart(2,"0")}`;
}

function dataOrdenavel(valorData) {
  const data = parseData(valorData);
  return data ? data.getTime() : Number.MAX_SAFE_INTEGER;
}

function formatarData(valorData) {
  const data = parseData(valorData);
  return data ? new Intl.DateTimeFormat("pt-BR").format(data) : "—";
}

function calcularValorAnual(item) {
  const valor = numero(item.valorCobranca);
  const fatores = { mensal: 12, trimestral: 4, semestral: 2, anual: 1, bienal: .5, unico: 0 };
  return valor * (fatores[item.periodicidade] ?? 1);
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numero(valor));
}

function formatarPeriodicidade(valor) {
  const mapa = { mensal: "Mensal", trimestral: "Trimestral", semestral: "Semestral", anual: "Anual", bienal: "Bienal", unico: "Pagamento único" };
  return mapa[valor] || valor || "—";
}

function sugerirProximaData(dataAtual, periodicidade) {
  const data = parseData(dataAtual) || new Date();
  const nova = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  const meses = { mensal: 1, trimestral: 3, semestral: 6, anual: 12, bienal: 24 }[periodicidade] || 12;
  nova.setMonth(nova.getMonth() + meses);
  return normalizarDataInput(nova);
}

function iconeCategoria(categoria) {
  const c = normalizar(categoria);
  if (c.includes("dominio")) return "fa-solid fa-globe";
  if (c.includes("hospedagem")) return "fa-solid fa-cloud";
  if (c.includes("seguranca")) return "fa-solid fa-shield-halved";
  if (c.includes("certificado")) return "fa-solid fa-certificate";
  if (c.includes("telefonia")) return "fa-solid fa-phone";
  if (c.includes("servico")) return "fa-solid fa-gears";
  if (c.includes("contrato")) return "fa-solid fa-file-signature";
  return "fa-solid fa-laptop-code";
}

function valor(seletor) { return String($(seletor)?.value || "").trim(); }
function numero(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function normalizar(v) { return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
function escapar(v) { return String(v ?? "").replace(/[&<>'"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c])); }
function atributo(v) { return escapar(v).replace(/`/g, "&#96;"); }
function normalizarCampos(obj) { const r = {}; Object.entries(obj || {}).forEach(([k,v]) => r[String(k).trim()] = v); return r; }

function mostrarToast(mensagem, erro = false) {
  clearTimeout(toastTimer);
  els.toast.textContent = mensagem;
  els.toast.classList.toggle("erro", erro);
  els.toast.classList.add("mostrar");
  toastTimer = setTimeout(() => els.toast.classList.remove("mostrar"), 3600);
}
