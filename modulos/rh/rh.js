import { db } from "../../firebase-config.js";

import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const usuario = window.usuarioAnalytics || {};
const elementos = {
  escopoAcesso: document.getElementById("escopoAcesso"),
  btnSelecionarArquivos: document.getElementById("btnSelecionarArquivos"),
  btnImportarVazio: document.getElementById("btnImportarVazio"),
  arquivosExcel: document.getElementById("arquivosExcel"),
  painelImportacao: document.getElementById("painelImportacao"),
  btnFecharImportacao: document.getElementById("btnFecharImportacao"),
  pesquisaColaborador: document.getElementById("pesquisaColaborador"),
  filtroDepartamento: document.getElementById("filtroDepartamento"),
  seletorColaborador: document.getElementById("seletorColaborador"),
  btnAtualizar: document.getElementById("btnAtualizar"),
  estadoVazio: document.getElementById("estadoVazio"),
  mensagemVazia: document.getElementById("mensagemVazia"),
  conteudoRh: document.getElementById("conteudoRh"),
  carregandoRh: document.getElementById("carregandoRh"),
  textoCarregando: document.getElementById("textoCarregando"),
  toast: document.getElementById("toast"),
  pesquisaHabilidade: document.getElementById("pesquisaHabilidade"),
  filtroSituacaoHabilidade: document.getElementById("filtroSituacaoHabilidade")
};

const estado = {
  colaboradores: [],
  filtrados: [],
  selecionado: null,
  habilidadesVisiveis: [],
  podeAdministrar: false,
  departamentoChave: ""
};

inicializar();

async function inicializar() {
  configurarEscopo();
  configurarEventos();
  await carregarColaboradores();
}

function configurarEscopo() {
  const perfil = normalizarTexto(usuario.perfil);
  const setor = String(usuario.setor || usuario.departamento || "").trim();
  const setorChave = texto(usuario.setorChave) || normalizarTexto(setor);
  const setoresRh = ["rh", "recursos humanos", "gestao de pessoas", "gestao pessoas"];

  estado.podeAdministrar =
    perfil === "administrador" ||
    setoresRh.includes(setorChave);

  estado.departamentoChave = setorChave;

  if (estado.podeAdministrar) {
    elementos.escopoAcesso.innerHTML = '<i class="fa-solid fa-unlock-keyhole"></i> Acesso geral do RH';
    elementos.btnSelecionarArquivos.hidden = false;
    elementos.btnImportarVazio.hidden = false;
    elementos.filtroDepartamento.disabled = false;
  } else {
    elementos.escopoAcesso.innerHTML = `<i class="fa-solid fa-lock"></i> Departamento: ${escaparHtml(setor || "não informado")}`;
    elementos.filtroDepartamento.disabled = true;
  }
}

function configurarEventos() {
  elementos.btnSelecionarArquivos.addEventListener("click", abrirImportacao);
  elementos.btnImportarVazio.addEventListener("click", abrirImportacao);
  elementos.btnFecharImportacao.addEventListener("click", () => {
    elementos.painelImportacao.hidden = true;
  });
  elementos.arquivosExcel.addEventListener("change", importarArquivos);
  elementos.btnAtualizar.addEventListener("click", carregarColaboradores);
  elementos.pesquisaColaborador.addEventListener("input", aplicarFiltrosColaboradores);
  elementos.filtroDepartamento.addEventListener("change", aplicarFiltrosColaboradores);
  elementos.seletorColaborador.addEventListener("change", selecionarColaborador);
  elementos.pesquisaHabilidade.addEventListener("input", renderizarHabilidades);
  elementos.filtroSituacaoHabilidade.addEventListener("change", renderizarHabilidades);

  document.querySelectorAll(".aba-rh").forEach(botao => {
    botao.addEventListener("click", () => abrirAba(botao.dataset.aba));
  });
}

function abrirImportacao() {
  if (!estado.podeAdministrar) return;
  elementos.painelImportacao.hidden = false;
  elementos.arquivosExcel.value = "";
  elementos.arquivosExcel.click();
}

async function carregarColaboradores() {
  mostrarCarregamento("Consultando a base de RH...");

  try {
    const referencia = collection(db, "rh_colaboradores");
    let consulta = referencia;

    if (!estado.podeAdministrar) {
      if (!estado.departamentoChave) {
        throw new Error("Seu usuário não possui um setor definido.");
      }
      consulta = query(
        referencia,
        where("departamentoChave", "==", estado.departamentoChave)
      );
    }

    const resultado = await getDocs(consulta);
    estado.colaboradores = resultado.docs.map(item => ({ id: item.id, ...item.data() }));
    estado.colaboradores.sort((a, b) =>
      String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR")
    );

    preencherDepartamentos();
    aplicarFiltrosColaboradores();
  } catch (erro) {
    console.error("Erro ao consultar a base de RH:", erro);
    estado.colaboradores = [];
    estado.filtrados = [];
    elementos.mensagemVazia.textContent =
      erro.message.includes("setor")
        ? erro.message
        : "Não foi possível consultar a base de RH. Verifique as regras do Firestore.";
    atualizarEstadoVazio();
    mostrarToast("Não foi possível carregar o módulo de RH.", true);
  } finally {
    ocultarCarregamento();
  }
}

function preencherDepartamentos() {
  const atual = elementos.filtroDepartamento.value;
  const departamentos = [...new Set(
    estado.colaboradores
      .map(item => String(item.departamento || "").trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, "pt-BR"));

  if (!estado.podeAdministrar) {
    const nomeSetor = String(usuario.setor || usuario.departamento || "Meu departamento");
    elementos.filtroDepartamento.innerHTML = `<option value="${escaparAtributo(nomeSetor)}">${escaparHtml(nomeSetor)}</option>`;
    return;
  }

  elementos.filtroDepartamento.innerHTML =
    '<option value="">Todos os departamentos</option>' +
    departamentos.map(item => `<option value="${escaparAtributo(item)}">${escaparHtml(item)}</option>`).join("");

  if (departamentos.includes(atual)) elementos.filtroDepartamento.value = atual;
}

function aplicarFiltrosColaboradores() {
  const pesquisa = normalizarTexto(elementos.pesquisaColaborador.value);
  const departamento = normalizarTexto(elementos.filtroDepartamento.value);

  estado.filtrados = estado.colaboradores.filter(item => {
    const texto = normalizarTexto([
      item.nome,
      item.cargo,
      item.matricula,
      item.departamento,
      item.unidade
    ].join(" "));

    const correspondePesquisa = !pesquisa || texto.includes(pesquisa);
    const correspondeDepartamento =
      !departamento || normalizarTexto(item.departamento) === departamento;

    return correspondePesquisa && correspondeDepartamento;
  });

  const idAtual = estado.selecionado?.id;
  elementos.seletorColaborador.innerHTML =
    '<option value="">Selecione um colaborador</option>' +
    estado.filtrados.map(item =>
      `<option value="${escaparAtributo(item.id)}">${escaparHtml(item.nome || "Sem nome")} · ${escaparHtml(item.cargo || "Cargo não informado")}</option>`
    ).join("");

  if (idAtual && estado.filtrados.some(item => item.id === idAtual)) {
    elementos.seletorColaborador.value = idAtual;
  } else if (estado.filtrados.length) {
    elementos.seletorColaborador.value = estado.filtrados[0].id;
    estado.selecionado = estado.filtrados[0];
  } else {
    estado.selecionado = null;
  }

  atualizarEstadoVazio();
  if (estado.selecionado) renderizarColaborador(estado.selecionado);
}

function selecionarColaborador() {
  estado.selecionado =
    estado.filtrados.find(item => item.id === elementos.seletorColaborador.value) || null;
  atualizarEstadoVazio();
  if (estado.selecionado) renderizarColaborador(estado.selecionado);
}

function atualizarEstadoVazio() {
  const vazio = !estado.selecionado;
  elementos.estadoVazio.hidden = !vazio;
  elementos.conteudoRh.hidden = vazio;

  if (vazio && estado.colaboradores.length && !estado.filtrados.length) {
    elementos.mensagemVazia.textContent = "Nenhum colaborador corresponde aos filtros selecionados.";
  } else if (vazio && !elementos.mensagemVazia.textContent.includes("Firestore")) {
    elementos.mensagemVazia.textContent =
      "A base de RH ainda não foi importada ou não há colaboradores no seu departamento.";
  }
}

async function importarArquivos(evento) {
  const arquivos = [...evento.target.files];
  if (!arquivos.length || !estado.podeAdministrar) return;

  if (!window.XLSX || !window.JSZip) {
    mostrarToast("As bibliotecas de leitura do Excel não foram carregadas.", true);
    return;
  }

  mostrarCarregamento(`Preparando ${arquivos.length} planilha(s)...`);
  let importados = 0;
  const falhas = [];

  try {
    for (let indice = 0; indice < arquivos.length; indice += 1) {
      const arquivo = arquivos[indice];
      elementos.textoCarregando.textContent =
        `Importando ${indice + 1} de ${arquivos.length}: ${arquivo.name}`;

      try {
        const colaborador = await processarPlanilha(arquivo);
        const id = criarIdColaborador(colaborador);

        await setDoc(doc(db, "rh_colaboradores", id), {
          ...limparObjeto(colaborador),
          atualizadoEm: serverTimestamp(),
          atualizadoPor: usuario.uid || "",
          origemArquivo: arquivo.name
        }, { merge: true });

        importados += 1;
      } catch (erroArquivo) {
        console.error(`Erro ao importar ${arquivo.name}:`, erroArquivo);
        falhas.push(`${arquivo.name}: ${erroArquivo.message}`);
      }
    }

    if (importados) {
      mostrarToast(`${importados} colaborador(es) atualizado(s) com sucesso.`);
      await carregarColaboradores();
    }

    if (falhas.length) {
      mostrarToast(`${falhas.length} arquivo(s) não foram importados. Consulte o console.`, true);
    }
  } finally {
    elementos.painelImportacao.hidden = true;
    ocultarCarregamento();
  }
}

async function processarPlanilha(arquivo) {
  const buffer = await arquivo.arrayBuffer();
  const workbook = window.XLSX.read(buffer, { type: "array", cellDates: true });
  const nomePerfil = workbook.SheetNames.find(nome => normalizarTexto(nome).includes("perfil"));
  const nomeMatriz = workbook.SheetNames.find(nome => normalizarTexto(nome).includes("matriz de habilidades"));

  if (!nomePerfil || !nomeMatriz) {
    throw new Error('O arquivo precisa conter as abas "Perfil" e "Matriz de Habilidades".');
  }

  const perfil = window.XLSX.utils.sheet_to_json(workbook.Sheets[nomePerfil], {
    header: 1,
    raw: true,
    defval: null
  });

  const matriz = window.XLSX.utils.sheet_to_json(workbook.Sheets[nomeMatriz], {
    header: 1,
    raw: true,
    defval: null
  });

  const nome = texto(valorAoLado(perfil, "Nome completo"));
  if (!nome) throw new Error("O nome do colaborador não foi localizado na aba Perfil.");

  const departamento = texto(valorAoLado(perfil, "Departamento"));
  if (!departamento) throw new Error("O departamento do colaborador não foi localizado.");

  return limparObjeto({
    nome,
    nomeChave: normalizarTexto(nome),
    matricula: texto(valorAoLado(perfil, "Matrícula")),
    cargo: texto(valorAoLado(perfil, "Cargo")),
    departamento,
    departamentoChave: normalizarTexto(departamento),
    unidade: texto(valorAoLado(perfil, "Unidade")),
    gestor: texto(valorAoLado(perfil, "Gestor direto")),
    dataAdmissao: formatarData(valorAoLado(perfil, "Data de admissão")),
    regime: texto(valorAoLado(perfil, "Regime de trabalho")),
    situacao: texto(valorAoLado(perfil, "Situação")),
    cpf: texto(valorAoLado(perfil, "CPF")),
    telefone: texto(valorAoLado(perfil, "Telefone")),
    foto: await extrairFoto(buffer),
    historico: extrairHistorico(perfil),
    remuneracao: {
      salario: valorAoLadoAposSecao(perfil, "Resumo Salarial", "Salário"),
      periculosidade: valorAoLado(perfil, "Periculosidade"),
      mobilidade: valorAoLado(perfil, "Mobilidade"),
      totalBruto: valorAoLado(perfil, "Total bruto")
    },
    nivelAtingimento: numeroPercentual(valorAoLado(perfil, "Nível de ating. da Matriz de Habilidades")),
    treinamentos: extrairTreinamentos(perfil),
    pdi: extrairPdi(perfil),
    feedbacks: extrairFeedbacks(perfil),
    avaliacao: extrairAvaliacao(perfil),
    matriz: extrairMatrizHabilidades(matriz)
  });
}

async function extrairFoto(buffer) {
  try {
    const zip = await window.JSZip.loadAsync(buffer);
    const imagens = Object.values(zip.files)
      .filter(item => !item.dir && /^xl\/media\/.*\.(png|jpe?g|webp)$/i.test(item.name))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (!imagens.length) return "";
    const imagem = imagens[0];
    const extensao = imagem.name.split(".").pop().toLowerCase();
    const mime = extensao === "png" ? "image/png" : extensao === "webp" ? "image/webp" : "image/jpeg";
    const original = `data:${mime};base64,${await imagem.async("base64")}`;
    return await otimizarFoto(original);
  } catch (erro) {
    console.warn("A foto não pôde ser extraída da planilha:", erro);
    return "";
  }
}

function otimizarFoto(dataUrl) {
  return new Promise(resolve => {
    const imagem = new Image();
    imagem.onload = () => {
      try {
        const limiteLargura = 500;
        const limiteAltura = 650;
        const escala = Math.min(1, limiteLargura / imagem.width, limiteAltura / imagem.height);
        const largura = Math.max(1, Math.round(imagem.width * escala));
        const altura = Math.max(1, Math.round(imagem.height * escala));
        const canvas = document.createElement("canvas");
        canvas.width = largura;
        canvas.height = altura;
        const contexto = canvas.getContext("2d");
        contexto.fillStyle = "#ffffff";
        contexto.fillRect(0, 0, largura, altura);
        contexto.drawImage(imagem, 0, 0, largura, altura);
        resolve(canvas.toDataURL("image/jpeg", .82));
      } catch (erro) {
        console.warn("A foto não pôde ser otimizada:", erro);
        resolve(dataUrl.length <= 700000 ? dataUrl : "");
      }
    };
    imagem.onerror = () => resolve(dataUrl.length <= 700000 ? dataUrl : "");
    imagem.src = dataUrl;
  });
}

function extrairHistorico(linhas) {
  const cabecalho = encontrarLinha(linhas, linha =>
    contemNaLinha(linha, "cargo/evento") && contemNaLinha(linha, "salario")
  );
  if (cabecalho < 0) return [];

  const colunas = mapearColunas(linhas[cabecalho], {
    data: ["data"], cargo: ["cargo/evento"], salario: ["salario"],
    motivo: ["motivo"], observacoes: ["observacoes"]
  });

  return extrairAteSecao(linhas, cabecalho + 1, "resumo salarial", (linha) => {
    const item = {
      data: formatarData(celula(linha, colunas.data)),
      cargo: texto(celula(linha, colunas.cargo)),
      salario: celula(linha, colunas.salario),
      motivo: texto(celula(linha, colunas.motivo)),
      observacoes: texto(celula(linha, colunas.observacoes))
    };
    return Object.values(item).some(valor => valor !== "" && valor != null) ? item : null;
  });
}

function extrairTreinamentos(linhas) {
  const cabecalho = encontrarLinha(linhas, linha =>
    contemNaLinha(linha, "treinamento") && contemNaLinha(linha, "categoria") && contemNaLinha(linha, "validade")
  );
  if (cabecalho < 0) return [];

  const colunas = mapearColunas(linhas[cabecalho], {
    treinamento: ["treinamento"], categoria: ["categoria"], conclusao: ["data conclusao"],
    carga: ["carga (h)", "carga"], validade: ["validade"], status: ["status"], certificado: ["certificado"]
  });

  return extrairAteSecao(linhas, cabecalho + 1, "matriz de habilidades", linha => {
    const nome = texto(celula(linha, colunas.treinamento));
    if (!nome) return null;
    return {
      treinamento: nome,
      categoria: texto(celula(linha, colunas.categoria)),
      conclusao: formatarData(celula(linha, colunas.conclusao)),
      carga: formatarDuracao(celula(linha, colunas.carga)),
      validade: formatarData(celula(linha, colunas.validade)),
      status: texto(celula(linha, colunas.status)),
      certificado: texto(celula(linha, colunas.certificado))
    };
  });
}

function extrairPdi(linhas) {
  const cabecalho = encontrarLinha(linhas, linha =>
    contemNaLinha(linha, "meta / competencia") && contemNaLinha(linha, "tipo de acao")
  );
  if (cabecalho < 0) return [];
  const colunas = mapearColunas(linhas[cabecalho], {
    meta: ["meta / competencia"], acao: ["tipo de acao"], categoria: ["categoria"],
    prazo: ["prazo"], status: ["status"], responsavel: ["responsavel"]
  });
  return extrairAteSecao(linhas, cabecalho + 1, "registro de feedbacks", linha => {
    const meta = texto(celula(linha, colunas.meta));
    if (!meta) return null;
    return {
      meta,
      acao: texto(celula(linha, colunas.acao)),
      categoria: texto(celula(linha, colunas.categoria)),
      prazo: formatarData(celula(linha, colunas.prazo)),
      status: texto(celula(linha, colunas.status)),
      responsavel: texto(celula(linha, colunas.responsavel))
    };
  });
}

function extrairFeedbacks(linhas) {
  const cabecalho = encontrarLinha(linhas, linha =>
    contemNaLinha(linha, "feedback") && contemNaLinha(linha, "dado por")
  );
  if (cabecalho < 0) return [];
  const colunas = mapearColunas(linhas[cabecalho], {
    data: ["data"], feedback: ["feedback"], tipo: ["tipo"], dadoPor: ["dado por"]
  });
  return extrairAteSecao(linhas, cabecalho + 1, "avaliacao de desempenho", linha => {
    const feedback = texto(celula(linha, colunas.feedback));
    if (!feedback) return null;
    return {
      data: formatarData(celula(linha, colunas.data)),
      feedback,
      tipo: texto(celula(linha, colunas.tipo)),
      dadoPor: texto(celula(linha, colunas.dadoPor))
    };
  });
}

function extrairAvaliacao(linhas) {
  const cabecalho = encontrarLinha(linhas, linha =>
    contemNaLinha(linha, "competencias tecnicas") && contemNaLinha(linha, "competencias comportamentais")
  );
  if (cabecalho < 0) return { tecnicas: [], comportamentais: [], resultado: null };

  const linhaCabecalho = linhas[cabecalho];
  const colTec = indiceNaLinha(linhaCabecalho, "competencias tecnicas");
  const colComp = indiceNaLinha(linhaCabecalho, "competencias comportamentais");
  const colResultado = indiceNaLinha(linhaCabecalho, "competencias tecnicas + comportamentais");
  const tecnicas = [];
  const comportamentais = [];

  for (let r = cabecalho + 1; r < Math.min(linhas.length, cabecalho + 25); r += 1) {
    const linha = linhas[r] || [];
    if (contemNaLinha(linha, "total competencia")) break;
    const nomeTec = texto(celula(linha, colTec));
    const nomeComp = texto(celula(linha, colComp));
    if (nomeTec) tecnicas.push({ competencia: nomeTec, atual: celula(linha, colTec + 1), proxima: celula(linha, colTec + 2) });
    if (nomeComp) comportamentais.push({ competencia: nomeComp, atual: celula(linha, colComp + 2), proxima: celula(linha, colComp + 3) });
  }

  let resultado = null;
  if (colResultado >= 0) {
    for (let r = cabecalho; r < Math.min(linhas.length, cabecalho + 6); r += 1) {
      const valor = celula(linhas[r] || [], colResultado);
      if (typeof valor === "number") { resultado = valor; break; }
    }
  }

  return { tecnicas, comportamentais, resultado };
}

function extrairMatrizHabilidades(linhas) {
  const cabecalhoAtualObjetivo = encontrarLinha(linhas, linha =>
    linha.filter(valor => ["atual", "objetivo"].includes(normalizarTexto(valor))).length >= 4
  );
  if (cabecalhoAtualObjetivo < 1) {
    return { requeridas: 0, capazes: 0, gap: 0, meta: 0, atual: 0, habilidades: [] };
  }

  const linhaNomes = linhas[cabecalhoAtualObjetivo - 1] || [];
  const linhaTipos = linhas[cabecalhoAtualObjetivo] || [];
  const linhaValores = linhas[cabecalhoAtualObjetivo + 1] || [];
  const habilidades = [];

  for (let coluna = 0; coluna < linhaNomes.length; coluna += 1) {
    const habilidade = texto(linhaNomes[coluna]);
    if (!habilidade) continue;
    const tipoA = normalizarTexto(linhaTipos[coluna]);
    const tipoB = normalizarTexto(linhaTipos[coluna + 2]);
    if (![tipoA, tipoB].includes("atual") || ![tipoA, tipoB].includes("objetivo")) continue;

    const colunaAtual = tipoA === "atual" ? coluna : coluna + 2;
    const colunaObjetivo = tipoA === "objetivo" ? coluna : coluna + 2;
    const atual = normalizarNivel(linhaValores[colunaAtual]);
    const objetivo = normalizarNivel(linhaValores[colunaObjetivo]);
    habilidades.push({
      habilidade,
      atual,
      objetivo,
      situacao: classificarHabilidade(atual, objetivo)
    });
  }

  return {
    requeridas: numero(valorAbaixoDoRotulo(linhas, "Habilidade Requerida")),
    capazes: numero(valorAbaixoDoRotulo(linhas, "Contagem de Habilidades")),
    gap: numero(valorAbaixoDoRotulo(linhas, "Gap de Habilidade -Para chegar no nível de habilidade necessário")),
    meta: numeroPercentual(valorAbaixoDoRotulo(linhas, "Nota de Habilidade Meta")),
    atual: numeroPercentual(valorAbaixoDoRotulo(linhas, "Nota de Habilidade Atual")),
    habilidades
  };
}

function renderizarColaborador(colaborador) {
  renderizarIdentificacao(colaborador);
  renderizarHistorico(colaborador.historico || []);
  renderizarRemuneracao(colaborador.remuneracao || {});
  renderizarAtingimento(colaborador.nivelAtingimento || 0);
  renderizarTreinamentos(colaborador.treinamentos || []);
  renderizarPdi(colaborador.pdi || []);
  renderizarFeedbacks(colaborador.feedbacks || []);
  renderizarAvaliacao(colaborador.avaliacao || {});
  renderizarMatriz(colaborador);
}

function renderizarIdentificacao(item) {
  const campos = [
    ["Nome completo", item.nome], ["Matrícula", item.matricula], ["Cargo", item.cargo],
    ["Departamento", item.departamento], ["Unidade", item.unidade], ["Gestor direto", item.gestor],
    ["Data de admissão", item.dataAdmissao], ["Regime de trabalho", item.regime],
    ["Situação", item.situacao, "situacao"], ["CPF", item.cpf], ["Telefone", item.telefone]
  ];

  document.getElementById("dadosIdentificacao").innerHTML = campos.map(([rotulo, valor, classe]) =>
    `<div class="linha-identificacao ${classe || ""}"><span>${rotulo}</span><strong>${escaparHtml(valor || "—")}</strong></div>`
  ).join("");

  const foto = document.getElementById("fotoColaborador");
  const placeholder = document.getElementById("fotoPlaceholder");
  placeholder.textContent = iniciais(item.nome);
  if (item.foto) {
    foto.src = item.foto;
    foto.hidden = false;
    placeholder.hidden = true;
  } else {
    foto.removeAttribute("src");
    foto.hidden = true;
    placeholder.hidden = false;
  }
}

function renderizarHistorico(itens) {
  renderizarCorpo("historicoCorpo", itens, item => `
    <tr><td>${escaparHtml(item.data || "—")}</td><td>${escaparHtml(item.cargo || "—")}</td>
    <td>${formatarMoeda(item.salario)}</td><td>${escaparHtml(item.motivo || "—")}</td><td>${escaparHtml(item.observacoes || "—")}</td></tr>
  `, 5);
}

function renderizarRemuneracao(item) {
  const linhas = [
    ["Salário", item.salario], ["Periculosidade", item.periculosidade],
    ["Mobilidade", item.mobilidade], ["Total bruto", item.totalBruto]
  ];
  document.getElementById("resumoSalarial").innerHTML = linhas.map(([rotulo, valor]) =>
    `<tr><td>${rotulo}</td><td>${formatarMoeda(valor)}</td></tr>`
  ).join("");
}

function renderizarAtingimento(valor) {
  const percentual = Math.max(0, Math.min(100, numeroPercentual(valor)));
  document.getElementById("nivelAtingimento").textContent = formatarPercentual(percentual);
  document.getElementById("anelAtingimento").style.setProperty("--valor", percentual);
}

function renderizarTreinamentos(itens) {
  renderizarCorpo("treinamentosCorpo", itens, item => `
    <tr><td>${escaparHtml(item.treinamento || "—")}</td><td>${escaparHtml(item.categoria || "—")}</td>
    <td>${escaparHtml(item.conclusao || "—")}</td><td>${escaparHtml(item.carga || "—")}</td>
    <td>${escaparHtml(item.validade || "—")}</td><td>${tagStatus(item.status)}</td><td>${escaparHtml(item.certificado || "—")}</td></tr>
  `, 7);
}

function renderizarPdi(itens) {
  renderizarCorpo("pdiCorpo", itens, item => `
    <tr><td>${escaparHtml(item.meta || "—")}</td><td>${escaparHtml(item.acao || item.categoria || "—")}</td><td>${tagStatus(item.status || "A definir")}</td></tr>
  `, 3);
}

function renderizarFeedbacks(itens) {
  renderizarCorpo("feedbackCorpo", itens, item => `
    <tr><td>${escaparHtml(item.data || "—")}</td><td>${escaparHtml(item.feedback || "—")}</td><td>${escaparHtml(item.tipo || "—")}</td><td>${escaparHtml(item.dadoPor || "—")}</td></tr>
  `, 4);
}

function renderizarAvaliacao(avaliacao) {
  document.getElementById("resultadoAvaliacao").textContent =
    avaliacao.resultado == null ? "—" : String(avaliacao.resultado);
  renderizarCorpo("avaliacaoTecnicaCorpo", avaliacao.tecnicas || [], item =>
    `<tr><td>${escaparHtml(item.competencia)}</td><td>${escaparHtml(valorExibicao(item.atual))}</td><td>${escaparHtml(valorExibicao(item.proxima))}</td></tr>`, 3);
  renderizarCorpo("avaliacaoComportamentalCorpo", avaliacao.comportamentais || [], item =>
    `<tr><td>${escaparHtml(item.competencia)}</td><td>${escaparHtml(valorExibicao(item.atual))}</td><td>${escaparHtml(valorExibicao(item.proxima))}</td></tr>`, 3);
}

function renderizarMatriz(colaborador) {
  const matriz = colaborador.matriz || {};
  document.getElementById("matrizNome").textContent = colaborador.nome || "—";
  document.getElementById("matrizCargo").textContent = colaborador.cargo || "—";
  document.getElementById("matrizRequeridas").textContent = matriz.requeridas ?? 0;
  document.getElementById("matrizCapazes").textContent = matriz.capazes ?? 0;
  document.getElementById("matrizGap").textContent = matriz.gap ?? 0;
  document.getElementById("matrizMeta").textContent = formatarPercentual(matriz.meta || 0);
  document.getElementById("matrizAtual").textContent = formatarPercentual(matriz.atual || 0);

  const diferenca = numeroPercentual(matriz.atual) - numeroPercentual(matriz.meta);
  const mensagem = document.getElementById("mensagemMeta");
  if (Number.isFinite(diferenca)) {
    mensagem.style.display = "block";
    mensagem.textContent = diferenca >= 0
      ? `Capacidade atual ${Math.abs(diferenca).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} pontos percentuais acima da meta.`
      : `Capacidade atual ${Math.abs(diferenca).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} pontos percentuais abaixo da meta.`;
  } else {
    mensagem.style.display = "none";
  }

  estado.habilidadesVisiveis = matriz.habilidades || [];
  renderizarHabilidades();
}

function renderizarHabilidades() {
  const pesquisa = normalizarTexto(elementos.pesquisaHabilidade.value);
  const situacao = elementos.filtroSituacaoHabilidade.value;
  const filtradas = estado.habilidadesVisiveis.filter(item =>
    (!pesquisa || normalizarTexto(item.habilidade).includes(pesquisa)) &&
    (!situacao || item.situacao === situacao)
  );

  renderizarCorpo("habilidadesCorpo", filtradas, item => {
    const diferenca = diferencaNivel(item.atual, item.objetivo);
    return `<tr><td><strong>${escaparHtml(item.habilidade)}</strong></td><td>${nivelHtml(item.atual)}</td><td>${nivelHtml(item.objetivo)}</td><td>${escaparHtml(diferenca)}</td><td>${tagSituacao(item.situacao)}</td></tr>`;
  }, 5);
}

function abrirAba(nome) {
  document.querySelectorAll(".aba-rh").forEach(item =>
    item.classList.toggle("ativa", item.dataset.aba === nome)
  );
  document.getElementById("abaPerfil").classList.toggle("ativo", nome === "perfil");
  document.getElementById("abaMatriz").classList.toggle("ativo", nome === "matriz");
}

function renderizarCorpo(id, itens, montarLinha, colunas) {
  const corpo = document.getElementById(id);
  corpo.innerHTML = itens.length
    ? itens.map(montarLinha).join("")
    : `<tr><td class="sem-dados" colspan="${colunas}">Nenhuma informação cadastrada.</td></tr>`;
}

function valorAoLado(linhas, rotulo) {
  const alvo = normalizarTexto(rotulo);
  for (let r = 0; r < linhas.length; r += 1) {
    const linha = linhas[r] || [];
    for (let c = 0; c < linha.length; c += 1) {
      if (normalizarTexto(linha[c]) !== alvo) continue;
      for (let proxima = c + 1; proxima <= Math.min(c + 7, linha.length - 1); proxima += 1) {
        if (temValor(linha[proxima])) return linha[proxima];
      }
      return null;
    }
  }
  return null;
}

function valorAoLadoAposSecao(linhas, secao, rotulo) {
  const linhaSecao = encontrarLinha(linhas, linha => contemNaLinha(linha, secao));
  if (linhaSecao < 0) return null;
  const alvo = normalizarTexto(rotulo);

  for (let r = linhaSecao + 1; r < Math.min(linhas.length, linhaSecao + 15); r += 1) {
    const linha = linhas[r] || [];
    for (let c = 0; c < linha.length; c += 1) {
      if (normalizarTexto(linha[c]) !== alvo) continue;
      for (let proxima = c + 1; proxima <= Math.min(c + 5, linha.length - 1); proxima += 1) {
        if (temValor(linha[proxima])) return linha[proxima];
      }
    }
  }
  return null;
}

function valorAbaixoDoRotulo(linhas, trecho) {
  const alvo = normalizarTexto(trecho);
  for (let r = 0; r < linhas.length; r += 1) {
    const linha = linhas[r] || [];
    for (let c = 0; c < linha.length; c += 1) {
      if (!normalizarTexto(linha[c]).includes(alvo)) continue;
      for (let abaixo = r + 1; abaixo <= Math.min(r + 4, linhas.length - 1); abaixo += 1) {
        if (temValor(celula(linhas[abaixo] || [], c))) return celula(linhas[abaixo], c);
      }
    }
  }
  return null;
}

function encontrarLinha(linhas, teste) {
  return linhas.findIndex(linha => teste(linha || []));
}

function contemNaLinha(linha, trecho) {
  const alvo = normalizarTexto(trecho);
  return linha.some(valor => normalizarTexto(valor).includes(alvo));
}

function indiceNaLinha(linha, trecho) {
  const alvo = normalizarTexto(trecho);
  return linha.findIndex(valor => normalizarTexto(valor).includes(alvo));
}

function mapearColunas(linha, definicoes) {
  const resultado = {};
  Object.entries(definicoes).forEach(([chave, nomes]) => {
    resultado[chave] = linha.findIndex(valor =>
      nomes.some(nome => normalizarTexto(valor) === normalizarTexto(nome) || normalizarTexto(valor).includes(normalizarTexto(nome)))
    );
  });
  return resultado;
}

function extrairAteSecao(linhas, inicio, secaoFinal, montar) {
  const itens = [];
  for (let r = inicio; r < linhas.length; r += 1) {
    const linha = linhas[r] || [];
    if (contemNaLinha(linha, secaoFinal)) break;
    const item = montar(linha, r);
    if (item) itens.push(item);
  }
  return itens;
}

function celula(linha, indice) {
  return indice >= 0 ? linha[indice] : null;
}

function classificarHabilidade(atual, objetivo) {
  if (String(atual).toUpperCase() === "X" || String(objetivo).toUpperCase() === "X") return "isento";
  if (!temValor(atual)) return "avaliar";
  if (typeof atual === "number" && typeof objetivo === "number" && atual < objetivo) return "evolucao";
  return "adequado";
}

function normalizarNivel(valor) {
  if (String(valor).trim().toUpperCase() === "X") return "X";
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : "";
}

function diferencaNivel(atual, objetivo) {
  if (String(atual).toUpperCase() === "X" || String(objetivo).toUpperCase() === "X") return "—";
  if (!temValor(atual)) return "A avaliar";
  if (typeof atual === "number" && typeof objetivo === "number") {
    const diferenca = Math.max(0, objetivo - atual);
    return diferenca ? `${diferenca} nível${diferenca > 1 ? "is" : ""}` : "—";
  }
  return "—";
}

function nivelHtml(valor) {
  if (!temValor(valor)) return '<i class="nivel vazio">—</i>';
  if (String(valor).toUpperCase() === "X") return '<i class="nivel x">X</i>';
  const nivel = Math.max(1, Math.min(4, Number(valor) || 1));
  return `<i class="nivel n${nivel}">${nivel}</i>`;
}

function tagSituacao(situacao) {
  const dados = {
    evolucao: ["EM EVOLUÇÃO", "aviso"], adequado: ["ADEQUADO", "ok"],
    avaliar: ["A AVALIAR", "info"], isento: ["ISENTO", "neutro"]
  }[situacao] || ["A AVALIAR", "info"];
  return `<span class="tag ${dados[1]}">${dados[0]}</span>`;
}

function tagStatus(status) {
  const valor = texto(status) || "A definir";
  const normalizado = normalizarTexto(valor);
  const classe = normalizado.includes("conclu") || normalizado === "ativo"
    ? "ok"
    : normalizado.includes("venc") || normalizado.includes("pend")
      ? "aviso"
      : "info";
  return `<span class="tag ${classe}">${escaparHtml(valor.toUpperCase())}</span>`;
}

function criarIdColaborador(item) {
  const cpf = String(item.cpf || "").replace(/\D/g, "");
  const matricula = normalizarTexto(item.matricula).replace(/[^a-z0-9]+/g, "-");
  const nome = normalizarTexto(item.nome).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return (cpf || matricula || nome || `colaborador-${Date.now()}`).slice(0, 120);
}

function limparObjeto(valor) {
  if (Array.isArray(valor)) return valor.map(limparObjeto).filter(item => item !== undefined);
  if (valor && typeof valor === "object" && !(valor instanceof Date)) {
    return Object.fromEntries(Object.entries(valor)
      .filter(([, item]) => item !== undefined)
      .map(([chave, item]) => [chave, limparObjeto(item)]));
  }
  return valor;
}

function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function texto(valor) {
  if (valor == null) return "";
  return String(valor).trim();
}

function numero(valor) {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : 0;
}

function numeroPercentual(valor) {
  const convertido = Number(valor);
  if (!Number.isFinite(convertido)) return 0;
  return Math.abs(convertido) <= 1 ? convertido * 100 : convertido;
}

function temValor(valor) {
  return valor !== null && valor !== undefined && valor !== "";
}

function formatarData(valor) {
  if (!temValor(valor)) return "";
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  }
  if (typeof valor === "number" && window.XLSX?.SSF) {
    const data = window.XLSX.SSF.parse_date_code(valor);
    if (data) return `${String(data.d).padStart(2, "0")}/${String(data.m).padStart(2, "0")}/${data.y}`;
  }
  return texto(valor);
}

function formatarDuracao(valor) {
  if (!temValor(valor)) return "";
  if (valor instanceof Date) {
    const horas = valor.getUTCHours();
    const minutos = valor.getUTCMinutes();
    return minutos ? `${horas}h ${minutos}min` : `${horas}h`;
  }
  if (typeof valor === "number" && valor < 1) {
    const minutosTotais = Math.round(valor * 24 * 60);
    const horas = Math.floor(minutosTotais / 60);
    const minutos = minutosTotais % 60;
    return horas && minutos ? `${horas}h ${minutos}min` : horas ? `${horas}h` : `${minutos}min`;
  }
  return texto(valor);
}

function formatarMoeda(valor) {
  const convertido = Number(valor);
  if (!Number.isFinite(convertido)) return escaparHtml(texto(valor) || "—");
  return convertido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarPercentual(valor) {
  return `${numeroPercentual(valor).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
}

function valorExibicao(valor) {
  return temValor(valor) ? String(valor) : "—";
}

function iniciais(nome) {
  return texto(nome).split(/\s+/).filter(Boolean).slice(0, 2).map(parte => parte[0].toUpperCase()).join("") || "RH";
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function escaparAtributo(valor) {
  return escaparHtml(valor).replaceAll("`", "&#096;");
}

function mostrarCarregamento(textoCarregamento) {
  elementos.textoCarregando.textContent = textoCarregamento;
  elementos.carregandoRh.hidden = false;
}

function ocultarCarregamento() {
  elementos.carregandoRh.hidden = true;
}

function mostrarToast(mensagem, erro = false) {
  elementos.toast.textContent = mensagem;
  elementos.toast.classList.toggle("erro", erro);
  elementos.toast.classList.add("visivel");
  clearTimeout(mostrarToast.tempo);
  mostrarToast.tempo = setTimeout(() => elementos.toast.classList.remove("visivel"), 4000);
}
