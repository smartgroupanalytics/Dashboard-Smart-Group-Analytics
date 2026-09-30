import { COLORS, fmtNum, fmtPct, addTitleBar, headerCell, dataCell } from "./helpers";

const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const YEARS = [2025, 2026];

export function buildRotatividadeSlide(pptx, records) {
  const slide = pptx.addSlide();
  addTitleBar(slide, "Rotatividade", "Metros Produzidos x Revisados — Comparativo anual", COLORS.rotatividade);

  if (!records || records.length === 0) {
    slide.addText("Nenhum dado encontrado.", {
      x: 0.5, y: 3, w: 12.3, h: 1, align: "center", fontSize: 18, color: COLORS.slate500,
    });
    return;
  }

  // Year comparison table
  const yearData = {};
  YEARS.forEach((year) => {
    const prodKey = year === 2025 ? "produzido_2025" : "produzido_2026";
    const revKey = year === 2025 ? "revisado_2025" : "revisado_2026";
    const produzidos = records.reduce((s, r) => s + (r[prodKey] || 0), 0);
    const revisados = records.reduce((s, r) => s + (r[revKey] || 0), 0);
    const rotatividade = produzidos ? (revisados / produzidos) * 100 : 0;
    yearData[year] = { produzidos, revisados, rotatividade };
  });

  const tableRows = [
    [headerCell("Ano", COLORS.rotatividade), headerCell("Metros Produzidos", COLORS.rotatividade, "right"), headerCell("Metros Revisados", COLORS.rotatividade, "right"), headerCell("Rotatividade", COLORS.rotatividade, "right")],
  ];

  YEARS.forEach((year, i) => {
    const yd = yearData[year];
    const fill = i % 2 === 0 ? "FFFFFF" : COLORS.slate100;
    const rotColor = yd.rotatividade >= 40 ? COLORS.green : COLORS.red;
    tableRows.push([
      dataCell(String(year), { bold: true, fill }),
      dataCell(fmtNum(yd.produzidos), { align: "right", bold: true, fill }),
      dataCell(fmtNum(yd.revisados), { align: "right", bold: true, fill }),
      dataCell(fmtPct(yd.rotatividade, 2), { align: "right", bold: true, color: rotColor, fill }),
    ]);
  });

  slide.addTable(tableRows, {
    x: 0.5, y: 1.4, w: 12.3, colW: [2, 3.5, 3.5, 3.3],
    rowH: 0.5,
    border: { type: "solid", color: COLORS.slate200, pt: 1 },
  });

  // Monthly chart
  const chartData = {
    categories: MESES,
    series: [
      {
        name: "2025",
        data: MESES.map((_, i) => {
          const rec = records.find((r) => r.mes === i + 1);
          return rec ? (rec.rotatividade_2025 || 0) * 100 : 0;
        }),
      },
      {
        name: "2026",
        data: MESES.map((_, i) => {
          const rec = records.find((r) => r.mes === i + 1);
          return rec ? (rec.rotatividade_2026 || 0) * 100 : 0;
        }),
      },
    ],
  };

  slide.addChart(pptx.ChartType.bar, chartData, {
    x: 0.5, y: 3.2, w: 12.3, h: 4,
    barDir: "col",
    chartColors: [COLORS.rotatividade, COLORS.rotatividadeTeal],
    showLegend: true,
    legendPos: "b",
    showValue: false,
    catAxisLabelColor: COLORS.slate700,
    valAxisLabelColor: COLORS.slate500,
    fontSize: 10,
  });
}