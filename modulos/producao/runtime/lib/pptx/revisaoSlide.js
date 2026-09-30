import { COLORS, fmtNum, fmtPct, addTitleBar, headerCell, dataCell } from "./helpers.js";
const META_REVISADOS = 5126.1;
const META_1 = 4882.0;
export function buildRevisaoSlide(pptx, records, mesesLabel) {
    const slide = pptx.addSlide();
    addTitleBar(slide, "Revisão", `Dashboard de revisão — ${mesesLabel}`, COLORS.revisao);
    if (!records || records.length === 0) {
        slide.addText("Nenhum dado encontrado para o período.", {
            x: 0.5, y: 3, w: 12.3, h: 1, align: "center", fontSize: 18, color: COLORS.slate500,
        });
        return;
    }
    const sum = (fn) => records.reduce((s, r) => s + (fn(r) || 0), 0);
    const jumpados = sum((r) => r.metros_jumpados);
    const revisados = sum((r) => r.metros_revisados);
    const p1 = sum((r) => r.metros_1);
    const quebra = sum((r) => r.metros_quebra);
    const ops = sum((r) => r.ops_revisadas);
    const count = records.length;
    const pctQuebra = jumpados ? (quebra / jumpados) * 100 : 0;
    const mediaRevisados = revisados / count;
    const media1 = p1 / count;
    // KPI table (left)
    const kpiRows = [
        [headerCell("Indicador", COLORS.revisao), headerCell("Valor", COLORS.revisao, "right")],
        [dataCell("Metros Jumbados"), dataCell(fmtNum(jumpados), { align: "right", bold: true })],
        [dataCell("Metros Revisados", { fill: COLORS.slate100 }), dataCell(fmtNum(revisados), { align: "right", bold: true, fill: COLORS.slate100 })],
        [dataCell("Metros de 1°"), dataCell(fmtNum(p1), { align: "right", bold: true })],
        [dataCell("Metros de Quebra", { fill: COLORS.slate100 }), dataCell(fmtNum(quebra), { align: "right", bold: true, fill: COLORS.slate100 })],
        [dataCell("% de Quebra"), dataCell(fmtPct(pctQuebra), { align: "right", bold: true, color: pctQuebra < 5 ? COLORS.green : COLORS.pink })],
        [dataCell("N° de OPs Revisadas", { fill: COLORS.slate100 }), dataCell(fmtNum(ops), { align: "right", bold: true, fill: COLORS.slate100 })],
    ];
    slide.addTable(kpiRows, {
        x: 0.5, y: 1.4, w: 6, colW: [3.5, 2.5],
        rowH: 0.5,
        border: { type: "solid", color: COLORS.slate200, pt: 1 },
    });
    // Metas table (right)
    const metaRows = [
        [headerCell("Meta (média mensal)", COLORS.revisaoGreen), headerCell("Atual", COLORS.revisaoGreen, "right"), headerCell("Meta", COLORS.revisaoGreen, "right")],
        [dataCell("Média Metros Revisados"), dataCell(fmtNum(mediaRevisados), { align: "right", bold: true }), dataCell(fmtNum(META_REVISADOS), { align: "right" })],
        [dataCell("Média Metros de 1°", { fill: COLORS.slate100 }), dataCell(fmtNum(media1), { align: "right", bold: true, fill: COLORS.slate100 }), dataCell(fmtNum(META_1), { align: "right", fill: COLORS.slate100 })],
    ];
    slide.addTable(metaRows, {
        x: 7, y: 1.4, w: 5.8, colW: [2.8, 1.5, 1.5],
        rowH: 0.5,
        border: { type: "solid", color: COLORS.slate200, pt: 1 },
    });
    // Progress bars for metas
    const pctRev = Math.min((mediaRevisados / META_REVISADOS) * 100, 100);
    const pct1 = Math.min((media1 / META_1) * 100, 100);
    slide.addText(`Progresso: ${fmtPct(pctRev, 0)}`, {
        x: 7, y: 3.2, w: 5.8, h: 0.4, fontSize: 14, bold: true, color: COLORS.revisao, align: "center",
    });
    slide.addText(`Progresso: ${fmtPct(pct1, 0)}`, {
        x: 7, y: 3.6, w: 5.8, h: 0.4, fontSize: 14, bold: true, color: COLORS.revisaoGreen, align: "center",
    });
}
