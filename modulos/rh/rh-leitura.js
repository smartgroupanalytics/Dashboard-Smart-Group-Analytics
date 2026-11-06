// Leitura compartilhada pelo importador do painel e pela automação do Drive.
// Percentuais retornados em pontos percentuais; ausência de dado permanece null.
export function rhNovoTexto(valor) {
  return String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/\s+/g, " ").trim();
}

export function rhNovoNumero(valor) {
  if (valor == null || String(valor).trim() === "" || valor instanceof Date) return null;
  const entrada = typeof valor === "string" ? valor.trim().replace(/%$/, "").replace(",", ".") : valor;
  const numero = Number(entrada);
  return Number.isFinite(numero) ? numero : null;
}

export function rhNovoPercentual(valor) {
  const numero = rhNovoNumero(valor);
  if (numero == null) return null;
  return typeof valor === "string" && valor.includes("%") ? numero
    : Math.abs(numero) <= 1 ? numero * 100 : numero;
}

export function rhNovoSelecionarAbas(nomes) {
  const matrizes = nomes.filter(nome => rhNovoTexto(nome).includes("matriz de habilidades"));
  const comportamental = matrizes.find(nome => rhNovoTexto(nome).includes("compor"));
  const tecnica = matrizes.find(nome => rhNovoTexto(nome).includes("tecnic"))
    || matrizes.find(nome => !rhNovoTexto(nome).includes("compor"));
  return { tecnica, comportamental };
}

export function rhNovoExtrairResumo(linhas) {
  const inicio = linhas.findIndex(linha => linha.some(valor => {
    const nome = rhNovoTexto(valor);
    return nome.includes("nota habilidade tecnica") && nome.includes("comport");
  }));
  if (inicio < 0) return null;
  const cabecalho = linhas.findIndex((linha, i) => i > inicio && i <= inicio + 3
    && linha.some(v => rhNovoTexto(v) === "nota")
    && linha.some(v => rhNovoTexto(v) === "peso")
    && linha.some(v => rhNovoTexto(v) === "contribuicao"));
  if (cabecalho < 0) return null;
  const colNota = linhas[cabecalho].findIndex(v => rhNovoTexto(v) === "nota");
  const colPeso = linhas[cabecalho].findIndex(v => rhNovoTexto(v) === "peso");
  const colContribuicao = linhas[cabecalho].findIndex(v => rhNovoTexto(v) === "contribuicao");
  const resumo = { tecnica: null, comportamental: null, pesoTecnica: null,
    pesoComportamental: null, contribuicaoTecnica: null, contribuicaoComportamental: null,
    adicional: null, resultado: null };
  for (let i = cabecalho + 1; i <= Math.min(cabecalho + 5, linhas.length - 1); i++) {
    const linha = linhas[i] || [];
    const rotulo = rhNovoTexto(linha[colNota - 1]);
    const tipo = rotulo === "tecnica" ? "Tecnica" : rotulo.startsWith("comport") ? "Comportamental" : null;
    if (tipo) {
      resumo[tipo === "Tecnica" ? "tecnica" : "comportamental"] = rhNovoPercentual(linha[colNota]);
      resumo["peso" + tipo] = rhNovoPercentual(linha[colPeso]);
      resumo["contribuicao" + tipo] = rhNovoPercentual(linha[colContribuicao]);
    } else if (rotulo.includes("adicion") || i === cabecalho + 3) {
      resumo.adicional = rhNovoPercentual(linha[colContribuicao]);
    } else if (rhNovoNumero(linha[colPeso]) != null) {
      resumo.resultado = rhNovoPercentual(linha[colContribuicao]);
    }
  }
  return resumo;
}

export function rhNovoExtrairMatriz(linhas, notaAtual) {
  const cabecalho = linhas.findIndex(linha => linha.filter(v =>
    ["atual", "objetivo"].includes(rhNovoTexto(v))).length >= 4);
  if (cabecalho < 1) throw new Error("Cabeçalho Atual / Objetivo não localizado na matriz.");
  const nomes = linhas[cabecalho - 1] || [];
  const tipos = linhas[cabecalho] || [];
  const valores = linhas[cabecalho + 1] || [];
  const habilidades = [];
  const nivel = valor => rhNovoTexto(valor) === "x" ? "X" : rhNovoNumero(valor) ?? "";
  const colunaExcel = indice => {
    let resultado = "";
    for (let n = indice + 1; n > 0; n = Math.floor((n - 1) / 26)) {
      resultado = String.fromCharCode(65 + (n - 1) % 26) + resultado;
    }
    return resultado;
  };
  for (let c = 0; c < tipos.length; c++) {
    const a = rhNovoTexto(tipos[c]);
    const b = rhNovoTexto(tipos[c + 2]);
    if (!([a, b].includes("atual") && [a, b].includes("objetivo"))) continue;
    const atual = nivel(valores[a === "atual" ? c : c + 2]);
    const objetivo = nivel(valores[a === "objetivo" ? c : c + 2]);
    if (!nomes[c] && atual === "" && objetivo === "") continue;
    const situacao = atual === "X" || objetivo === "X" ? "isento" : atual === "" ? "avaliar"
      : typeof objetivo === "number" && atual < objetivo ? "evolucao" : "adequado";
    habilidades.push({ habilidade: nomes[c] ? String(nomes[c]).trim()
      : `Habilidade sem descrição (${colunaExcel(c)}${cabecalho})`, atual, objetivo, situacao,
      semDescricao: !nomes[c] });
  }
  const validas = habilidades.filter(h => h.situacao !== "isento");
  const requeridas = validas.filter(h => typeof h.objetivo === "number" && h.objetivo >= 3).length;
  const capazes = validas.filter(h => typeof h.atual === "number" && h.atual >= 3).length;
  return { requeridas, capazes, gap: Math.max(0, requeridas - capazes), meta: 100,
    atual: notaAtual, habilidades, modelo: "matrizes-separadas-v1" };
}

export function rhNovoValidarNome(perfilNome, linhas) {
  const cabecalho = linhas.findIndex(linha => linha.some(v => rhNovoTexto(v) === "membro do time"));
  const coluna = cabecalho < 0 ? -1 : linhas[cabecalho].findIndex(v => rhNovoTexto(v) === "membro do time");
  const nome = coluna < 0 ? "" : (linhas[cabecalho + 1] || [])[coluna];
  if (!nome || rhNovoTexto(nome) !== rhNovoTexto(perfilNome)) {
    throw new Error("O nome do Perfil deve ser igual ao nome nas matrizes Técnica e Comportamental.");
  }
}

/**
 * Alinha em memória a célula "Membro do Time" ao nome completo do Perfil,
 * mesmo quando o nome exibido na matriz é completamente diferente.
 * Na importação manual do painel, o XLSX local não é alterado.
 */
export function rhNovoAjustarNomeMatriz(nomePerfil, linhas, tipo = "matriz") {
  const indice = linhas.findIndex(linha => linha.some(v => rhNovoTexto(v) === "membro do time"));
  if (indice < 0 || !linhas[indice + 1]) {
    throw new Error(`Campo Membro do Time não localizado na matriz ${tipo}.`);
  }
  const coluna = linhas[indice].findIndex(v => rhNovoTexto(v) === "membro do time");
  const nomeAnterior = String(linhas[indice + 1][coluna] ?? "").trim();
  const oficial = String(nomePerfil ?? "").trim();
  if (!oficial) throw new Error("Nome completo ausente do Perfil.");
  linhas[indice + 1][coluna] = oficial;
  return { ajustado: nomeAnterior !== oficial, anterior: nomeAnterior };
}
