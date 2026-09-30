import { COLORS, fmtPct, addTitleBar, headerCell, dataCell } from "./helpers.js";
const ORDEM_MAQUINAS = ["JR", "Gravadora", "Estampa 1", "Estampa 2", "GR 2", "Digital UV", "Digital Solvente", "GR 3"];
export function buildProdutividadeSlide(pptx, records) {
    const slide = pptx.addSlide();
    addTitleBar(slide, "Produtividade", "Indicadores de eficiência por máquina", COLORS.produtividade);
    if (!records || records.length === 0) {
        slide.addText("Nenhum dado encontrado.", {
            x: 0.5, y: 3, w: 12.3, h: 1, align: "center", fontSize: 18, color: COLORS.slate500,
        });
        return;
    }
    // General KPIs
    const sumC = records.reduce((s, r) => s + (r.col_c || 0), 0);
    const sumD = records.reduce((s, r) => s + (r.col_d || 0), 0);
    const sumE = records.reduce((s, r) => s + (r.col_e || 0), 0);
    const sumJ = records.reduce((s, r) => s + (r.col_j || 0), 0);
    const sumK = records.reduce((s, r) => s + (r.col_k || 0), 0);
    const geral = {
        produtividade: sumC ? (sumJ + sumK) / sumC : 0,
        utilizacao: sumC ? sumD / sumC : 0,
        eficiencia_producao: sumD ? sumJ / sumD : 0,
        eficiencia_setup: sumE ? sumK / sumE : 0,
    };
    // KPI table
    const kpiRows = [
        [
            headerCell("Produtividade Geral", COLORS.produtividade, "center"),
            headerCell("Utilização Geral", COLORS.produtividade, "center"),
            headerCell("Eficiência de Produção", COLORS.produtividade, "center"),
            headerCell("Eficiência de Setup", COLORS.produtividade, "center"),
        ],
        [
            dataCell(fmtPct(geral.produtividade * 100, 1), { align: "center", bold: true, color: COLORS.produtividade }),
            dataCell(fmtPct(geral.utilizacao * 100, 1), { align: "center", bold: true, color: COLORS.rotatividade }),
            dataCell(fmtPct(geral.eficiencia_producao * 100, 1), { align: "center", bold: true, color: COLORS.green }),
            dataCell(fmtPct(geral.eficiencia_setup * 100, 1), { align: "center", bold: true, color: COLORS.revisaoGreen }),
        ],
    ];
    slide.addTable(kpiRows, {
        x: 0.5, y: 1.4, w: 12.3, colW: [3.075, 3.075, 3.075, 3.075],
        rowH: [0.4, 0.6],
        border: { type: "solid", color: COLORS.slate200, pt: 1 },
        fontSize: 14,
    });
    // Machine table
    const map = {};
    records.forEach((r) => {
        if (!map[r.maquina]) {
            map[r.maquina] = { utilizacao: [], produtividade: [], eficiencia_producao: [], eficiencia_setup: [], maquina_inoperante: [] };
        }
        map[r.maquina].utilizacao.push(r.utilizacao || 0);
        map[r.maquina].produtividade.push(r.produtividade || 0);
        map[r.maquina].eficiencia_producao.push(r.eficiencia_producao || 0);
        map[r.maquina].eficiencia_setup.push(r.eficiencia_setup || 0);
        map[r.maquina].maquina_inoperante.push(r.maquina_inoperante || 0);
    });
    const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const ordemNormalizada = ORDEM_MAQUINAS.map(normalize);
    const machines = Object.entries(map).map(([maquina, arr]) => {
        const avg = (list) => (list.length ? list.reduce((s, v) => s + v, 0) / list.length : 0);
        return {
            maquina,
            utilizacao: avg(arr.utilizacao) * 100,
            produtividade: avg(arr.produtividade) * 100,
            eficiencia_producao: avg(arr.eficiencia_producao) * 100,
            eficiencia_setup: avg(arr.eficiencia_setup) * 100,
            maquina_inoperante: avg(arr.maquina_inoperante) * 100,
        };
    }).sort((a, b) => {
        const ia = ordemNormalizada.indexOf(normalize(a.maquina));
        const ib = ordemNormalizada.indexOf(normalize(b.maquina));
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
    const machineRows = [
        [
            headerCell("Máquina", COLORS.produtividade),
            headerCell("Utilização", COLORS.produtividade, "right"),
            headerCell("Produtividade", COLORS.produtividade, "right"),
            headerCell("Ef. Produção", COLORS.produtividade, "right"),
            headerCell("Ef. Setup", COLORS.produtividade, "right"),
            headerCell("M. Inoperante", COLORS.produtividade, "right"),
        ],
    ];
    machines.forEach((m, i) => {
        const fill = i % 2 === 0 ? "FFFFFF" : COLORS.slate100;
        machineRows.push([
            dataCell(m.maquina, { bold: true, fill }),
            dataCell(fmtPct(m.utilizacao, 1), { align: "right", fill }),
            dataCell(fmtPct(m.produtividade, 1), { align: "right", fill }),
            dataCell(fmtPct(m.eficiencia_producao, 1), { align: "right", fill }),
            dataCell(fmtPct(m.eficiencia_setup, 1), { align: "right", fill }),
            dataCell(fmtPct(m.maquina_inoperante, 1), { align: "right", fill }),
        ]);
    });
    slide.addTable(machineRows, {
        x: 0.5, y: 2.7, w: 12.3, colW: [2.3, 2, 2, 2, 2, 2],
        rowH: 0.4,
        border: { type: "solid", color: COLORS.slate200, pt: 1 },
        fontSize: 11,
    });
}
