// Gera e baixa uma planilha CSV em branco (modelo) para uma máquina específica.
// O formato segue as colunas esperadas pela função importControleExcel.

const COLUNAS = [
  "maquina",
  "processo",
  "num_op",
  "descricao_produto",
  "metragem",
  "hora_inicial",
  "hora_final",
  "data",
];

export function baixarPlanilhaMaquina(maquina) {
  const sep = ";";
  const header = COLUNAS.join(sep);
  // Primeira linha com o nome da máquina pré-preenchido
  const firstRow = [maquina, "", "", "", "", "", "", ""].join(sep);
  // BOM para Excel reconhecer UTF-8
  const bom = "\uFEFF";
  const csv = `${bom}${header}\r\n${firstRow}\r\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const nomeArquivo = maquina.replace(/\s+/g, "_").toLowerCase();
  link.download = `modelo_${nomeArquivo}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}