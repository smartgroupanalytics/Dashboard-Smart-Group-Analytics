import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
function fmtNum(n) {
    return (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtPct(n) {
    return (n || 0).toFixed(1).replace(".", ",") + "%";
}
// Palavras-chave de cada macro-categoria
const MACROS = [
    {
        nome: "Desenvolvimento / Engenharia",
        keywords: ["REDESENVOLVIMENTO", "ENGENHARIA"],
        color: "#1D2436",
        bg: "#F0F1F4",
        border: "#D1D5DB",
    },
    {
        nome: "Compras / Logística",
        keywords: ["COMPRAS E LOGÍSTICA", "COMPRAS E LOGISTICA", "LOGÍSTICA", "LOGISTICA", "TRANSFER", "BASE", "FILME"],
        color: "#B45309",
        bg: "#FEF6EE",
        border: "#E5D3C0",
    },
    {
        nome: "Comercial",
        keywords: ["COMERCIAL", "LIBERAR", "PEDIDO"],
        color: "#047857",
        bg: "#EDF8F2",
        border: "#C4E5D5",
    },
    {
        nome: "PCP",
        keywords: ["PCP", "RETRABALHAR", "SALDO EM ESTOQUE"],
        color: "#1D4ED8",
        bg: "#EFF6FF",
        border: "#BFDBFE",
    },
];
export default function RelatorioMacroPanel({ grupos, totalMetros }) {
    const macros = MACROS.map((m) => {
        const motivosIn = grupos.filter((g) => {
            const up = g.motivo.toUpperCase();
            return m.keywords.some((k) => up.includes(k));
        });
        const metros = motivosIn.reduce((s, g) => s + g.metros, 0);
        const pct = totalMetros > 0 ? (metros / totalMetros) * 100 : 0;
        return { ...m, metros, pct, motivos: motivosIn };
    });
    return (_jsx("div", { className: "w-72 shrink-0 space-y-3", children: macros.map((m, i) => (_jsxs("div", { className: "rounded-lg border p-4", style: { background: m.bg, borderColor: m.border }, children: [_jsx("h4", { className: "text-xs font-bold uppercase tracking-wide mb-2", style: { color: m.color }, children: m.nome }), _jsxs("div", { className: "flex items-end justify-between mb-2", children: [_jsx("span", { className: "text-2xl font-extrabold tabular-nums text-slate-900", children: fmtNum(m.metros) }), _jsx("span", { className: "text-sm font-bold tabular-nums", style: { color: m.color }, children: fmtPct(m.pct) })] }), _jsx("div", { className: "h-2.5 rounded-full overflow-hidden", style: { background: "#E0E4E7" }, children: _jsx("div", { className: "h-full rounded-full", style: { width: `${Math.max(m.pct, 0)}%`, background: m.color } }) }), m.motivos.length > 0 && (_jsx("ul", { className: "mt-3 space-y-1", children: m.motivos.map((g, j) => (_jsxs("li", { className: "text-xs text-slate-600 flex justify-between gap-2", children: [_jsx("span", { className: "leading-tight", children: g.motivo }), _jsxs("span", { className: "font-semibold tabular-nums whitespace-nowrap", children: [fmtNum(g.metros), " m"] })] }, j))) }))] }, i))) }));
}
