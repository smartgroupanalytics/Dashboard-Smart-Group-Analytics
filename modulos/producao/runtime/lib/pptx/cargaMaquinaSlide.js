import { COLORS, fmtNum, addTitleBar, headerCell, dataCell } from "./helpers.js";
export function buildCargaMaquinaSlide(pptx, carteiraRecords, faltaRecords) {
    const slide = pptx.addSlide();
    addTitleBar(slide, "Carga de Máquina", "Carteira de Pedido e Falta Programar", COLORS.carga);
    if (!carteiraRecords || carteiraRecords.length === 0) {
        slide.addText("Nenhum dado encontrado.", {
            x: 0.5, y: 3, w: 12.3, h: 1, align: "center", fontSize: 18, color: COLORS.slate500,
        });
        return;
    }
    const semana = carteiraRecords[0];
    const faltaItems = faltaRecords
        .filter((r) => r.semana_label === semana.semana_label)
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    // Carteira table (left)
    const carteiraRows = [
        [headerCell("Carteira — " + (semana.semana_label || ""), COLORS.carga), headerCell("Metros", COLORS.carga, "right")],
    ];
    const carteiraItems = [
        { label: "Total Carteira", value: semana.total_carteira, bold: true },
        { label: "Pedido Beira Rio", value: semana.pedido_beira_rio },
        { label: "Pedidos Outros", value: semana.pedidos_outros },
        { label: "Estoque Beira Rio", value: semana.estoque_beira_rio },
        { label: "Estoque STK", value: semana.estoque_stk },
        { label: "Estoque Outros", value: semana.estoque_outros },
        { label: "Falta Programar", value: semana.falta_programar_total, bold: true },
    ];
    carteiraItems.forEach((item, i) => {
        const fill = i % 2 === 0 ? "FFFFFF" : COLORS.slate100;
        carteiraRows.push([
            dataCell(item.label, { bold: item.bold, fill }),
            dataCell(fmtNum(item.value || 0), { align: "right", bold: true, fill }),
        ]);
    });
    slide.addTable(carteiraRows, {
        x: 0.5, y: 1.4, w: 6, colW: [4, 2],
        rowH: 0.45,
        border: { type: "solid", color: COLORS.slate200, pt: 1 },
    });
    // Falta Programar table (right)
    const faltaRows = [
        [headerCell("Falta Programar — " + (semana.semana_label || ""), COLORS.carga), headerCell("Metros", COLORS.carga, "right")],
    ];
    if (faltaItems.length > 0) {
        faltaItems.forEach((item, i) => {
            const fill = i % 2 === 0 ? "FFFFFF" : COLORS.slate100;
            faltaRows.push([
                dataCell(item.categoria, { fill }),
                dataCell(fmtNum(item.metros || 0), { align: "right", bold: true, fill }),
            ]);
        });
    }
    else {
        faltaRows.push([
            dataCell("Nenhum item cadastrado", { color: COLORS.slate500 }),
            dataCell("—", { align: "right", color: COLORS.slate500 }),
        ]);
    }
    // Total row
    const totalFalta = faltaItems.reduce((s, r) => s + (r.metros || 0), 0);
    faltaRows.push([
        dataCell("TOTAL", { bold: true, fill: COLORS.slate200 }),
        dataCell(fmtNum(totalFalta), { align: "right", bold: true, fill: COLORS.slate200 }),
    ]);
    slide.addTable(faltaRows, {
        x: 7, y: 1.4, w: 5.8, colW: [3.8, 2],
        rowH: 0.45,
        border: { type: "solid", color: COLORS.slate200, pt: 1 },
    });
    // Note
    if (semana.nota) {
        slide.addText(semana.nota, {
            x: 0.5, y: 6.5, w: 12.3, h: 0.8, fontSize: 11, color: COLORS.slate700, italic: true,
        });
    }
}
