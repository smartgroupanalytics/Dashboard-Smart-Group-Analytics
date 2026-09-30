import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown } from "lucide-react";
function pctColor(v) {
    if (v >= 0.8)
        return "#059669";
    if (v >= 0.5)
        return "#d97706";
    return "#dc2626";
}
function inopColor(v) {
    if (v >= 0.3)
        return "#dc2626";
    if (v >= 0.15)
        return "#d97706";
    return "#059669";
}
function fmtPct(v) {
    return `${(v * 100).toFixed(1).replace(".", ",")}%`;
}
// Metas por coluna (em %)
const METAS_COLUNAS = {
    utilizacao: 35,
    eficiencia_producao: 80,
    eficiencia_setup: 80,
    inoperante: 15, // lógica invertida (menor é melhor)
};
// Indicador de mãozinha: acima da meta = ThumbsUp verde,
// abaixo da meta = ThumbsDown vermelho, igual à meta = ThumbsUp amarelo.
// Para colunas invertidas (inoperante), inverte a lógica.
function ThumbsIndicator({ value, meta, inverted = false }) {
    const diff = value * 100 - meta;
    let Icon, color;
    if (Math.abs(diff) <= 0.5) {
        Icon = ThumbsUp;
        color = "#eab308"; // amarelo
    }
    else {
        const acima = diff > 0;
        const bom = inverted ? !acima : acima;
        if (bom) {
            Icon = ThumbsUp;
            color = "#059669"; // verde
        }
        else {
            Icon = ThumbsDown;
            color = "#dc2626"; // vermelho
        }
    }
    return _jsx(Icon, { className: "w-4 h-4 shrink-0", style: { color } });
}
const METAS = {
    JR: 92,
    Gravadora: 94,
    "Estampa 1": 75,
    "Estampa 2": 80,
    "GR 1": 50,
    "GR 2": 50,
    "Digital UV": 50,
    "Digital Solvente": 50,
    "Digital Sol": 50,
    "GR 3": 50,
};
function metaStatusColor(value, meta) {
    const diff = value * 100 - meta;
    if (diff < -0.5)
        return "#dc2626";
    if (diff > 0.5)
        return "#059669";
    return "#d97706";
}
// Cor do status dot da máquina (baseado na produtividade vs meta)
function machineStatusColor(value, meta) {
    const diff = value * 100 - meta;
    if (diff < -5)
        return "#dc2626"; // vermelho
    if (diff > 5)
        return "#059669"; // verde
    return "#d97706"; // âmbar
}
export default function ProdutividadeMachineTable({ machineData }) {
    const normalize = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, "").trim();
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 }, className: "rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden", children: [_jsx("div", { className: "px-5 py-2 border-b border-slate-200", children: _jsx("h3", { className: "text-sm font-bold text-slate-700 uppercase tracking-wider", children: "Relat\u00F3rio de M\u00E1quinas" }) }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full border-collapse", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-[#1A3674]", children: [_jsx("th", { className: "text-left text-white text-xs font-bold uppercase tracking-wider px-4 py-2", children: "M\u00E1quina" }), _jsx("th", { className: "text-center text-white text-xs font-bold uppercase tracking-wider px-4 py-2", children: "Produtividade" }), _jsx("th", { className: "text-center text-white text-xs font-bold uppercase tracking-wider px-4 py-2", children: "Utiliza\u00E7\u00E3o" }), _jsx("th", { className: "text-center text-white text-xs font-bold uppercase tracking-wider px-4 py-2", children: "Efic. Produ\u00E7\u00E3o" }), _jsx("th", { className: "text-center text-white text-xs font-bold uppercase tracking-wider px-4 py-2", children: "Efic. Setup" }), _jsx("th", { className: "text-center text-white text-xs font-bold uppercase tracking-wider px-4 py-2", children: "Inoperante" })] }) }), _jsx("tbody", { children: machineData.map((m, i) => {
                                const { produtividade, utilizacao, eficiencia_producao, eficiencia_setup, maquina_inoperante } = m.metrics;
                                const metaKey = Object.keys(METAS).find((k) => normalize(k) === normalize(m.maquina));
                                const meta = metaKey ? METAS[metaKey] : null;
                                const metaColor = meta != null ? metaStatusColor(produtividade, meta) : pctColor(produtividade);
                                const statusColor = meta != null ? machineStatusColor(produtividade, meta) : pctColor(produtividade);
                                const rowBg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
                                return (_jsxs("tr", { style: { background: rowBg }, className: "border-t border-slate-200", children: [_jsx("td", { className: "px-4 py-1.5 whitespace-nowrap", children: _jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full shrink-0", style: { background: statusColor } }), _jsx("span", { className: "text-sm font-bold text-slate-900 uppercase tracking-wide", children: m.maquina })] }) }), _jsx("td", { className: "px-4 py-1.5 text-center whitespace-nowrap", children: _jsxs("div", { className: "inline-flex items-center gap-2 justify-center", children: [_jsx("span", { className: "text-base font-extrabold tabular-nums", style: { color: metaColor }, children: fmtPct(produtividade) }), meta != null && (_jsxs("span", { className: "inline-flex items-center text-[11px] font-bold px-1 whitespace-nowrap", style: {
                                                            color: "#1d4ed8",
                                                            background: "transparent",
                                                        }, children: ["Meta: ", meta, "%"] }))] }) }), _jsx("td", { className: "px-4 py-2 text-center whitespace-nowrap", children: _jsxs("div", { className: "inline-flex items-center gap-1.5 justify-center", children: [_jsx("span", { className: "text-base font-extrabold tabular-nums", style: { color: "#000000" }, children: fmtPct(utilizacao) }), _jsx(ThumbsIndicator, { value: utilizacao, meta: METAS_COLUNAS.utilizacao })] }) }), _jsx("td", { className: "px-4 py-2 text-center whitespace-nowrap", children: _jsxs("div", { className: "inline-flex items-center gap-1.5 justify-center", children: [_jsx("span", { className: "text-base font-extrabold tabular-nums", style: { color: "#000000" }, children: fmtPct(eficiencia_producao) }), _jsx(ThumbsIndicator, { value: eficiencia_producao, meta: METAS_COLUNAS.eficiencia_producao })] }) }), _jsx("td", { className: "px-4 py-2 text-center whitespace-nowrap", children: _jsxs("div", { className: "inline-flex items-center gap-1.5 justify-center", children: [_jsx("span", { className: "text-base font-extrabold tabular-nums", style: { color: "#000000" }, children: fmtPct(eficiencia_setup) }), _jsx(ThumbsIndicator, { value: eficiencia_setup, meta: METAS_COLUNAS.eficiencia_setup })] }) }), _jsx("td", { className: "px-4 py-2 text-center whitespace-nowrap", children: _jsxs("div", { className: "inline-flex items-center gap-1.5 justify-center", children: [_jsx("span", { className: "text-base font-extrabold tabular-nums", style: { color: "#000000" }, children: fmtPct(maquina_inoperante) }), _jsx(ThumbsIndicator, { value: maquina_inoperante, meta: METAS_COLUNAS.inoperante, inverted: true })] }) })] }, m.maquina));
                            }) })] }) })] }));
}
