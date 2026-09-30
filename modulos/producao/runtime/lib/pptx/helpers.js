export const COLORS = {
    revisao: "007BFF",
    revisaoGreen: "00A86B",
    rotatividade: "2563EB",
    rotatividadeTeal: "0D9488",
    produtividade: "4F46E5",
    carga: "008B8B",
    white: "FFFFFF",
    dark: "0F172A",
    slate100: "F1F5F9",
    slate200: "E2E8F0",
    slate500: "64748B",
    slate700: "334155",
    slate900: "0F172A",
    amber: "B7791F",
    pink: "E83E8C",
    green: "059669",
    red: "DC2626",
};
export function fmtNum(n) {
    return (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
export function fmtPct(n, decimals = 1) {
    return (n || 0).toFixed(decimals).replace(".", ",") + "%";
}
export function addTitleBar(slide, title, subtitle, color) {
    slide.addShape("rect", {
        x: 0, y: 0, w: 13.33, h: 1.0,
        fill: { color },
        line: { color, width: 0 },
    });
    slide.addText(title, {
        x: 0.5, y: 0.12, w: 12.3, h: 0.5,
        fontSize: 28, bold: true, color: "FFFFFF",
    });
    if (subtitle) {
        slide.addText(subtitle, {
            x: 0.5, y: 0.6, w: 12.3, h: 0.35,
            fontSize: 13, color: "FFFFFF", italic: true,
        });
    }
}
export function headerCell(text, color, align = "left") {
    return {
        text,
        options: {
            bold: true, color: "FFFFFF",
            fill: { color },
            align, fontSize: 12, valign: "middle",
        },
    };
}
export function dataCell(text, { align = "left", bold = false, color = "0F172A", fill = "FFFFFF" } = {}) {
    return {
        text,
        options: {
            color, align, bold,
            fill: { color: fill },
            fontSize: 12, valign: "middle",
        },
    };
}
