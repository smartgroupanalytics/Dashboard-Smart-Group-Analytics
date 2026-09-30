import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { motion } from "framer-motion";
const LINHAS = [
    { label: "Rotatividade Máq.", field: "rotatividade", unit: "m" },
    { label: "Tempo de Setup", field: "tempo_setup", unit: "min" },
    { label: "Tempo Produtivo", field: "tempo_producao", unit: "min" },
    { label: "Dias Necessários", field: "dias_necessarios", unit: "dias", highlight: true },
];
function fmt(n) {
    return (n || 0).toLocaleString("pt-BR");
}
export default function MaquinaComparativoTable({ maquinas = [] }) {
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.3, duration: 0.45 }, className: "relative overflow-hidden rounded-2xl border border-teal-500/30 bg-white shadow-[0_2px_16px_-4px_rgba(0,121,140,0.25)]", children: [_jsx("div", { className: "absolute top-0 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" }), _jsx("div", { className: "px-4 py-2 border-b border-teal-500/20", children: _jsx("h3", { className: "text-sm font-extrabold text-teal-900 tracking-tight uppercase", children: "Comparativo por M\u00E1quina" }) }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-teal-50", children: [_jsx("th", { className: "px-4 py-2.5 text-left text-[11px] uppercase tracking-wider text-teal-900 font-extrabold", children: "Par\u00E2metro" }), maquinas.map((m) => (_jsx("th", { className: "px-4 py-2.5 text-right text-[11px] uppercase tracking-wider text-teal-900 font-extrabold", children: m.maquina }, m.id || m.maquina)))] }) }), _jsx("tbody", { children: LINHAS.map((linha) => (_jsxs("tr", { className: `border-t border-teal-500/10 ${linha.highlight ? "bg-teal-50/50" : ""}`, children: [_jsx("td", { className: "px-4 py-1.5 text-sm text-slate-800 font-medium", children: linha.label }), maquinas.map((m) => (_jsxs("td", { className: "px-4 py-1.5 text-right", children: [_jsx("span", { className: `tabular-nums font-bold ${linha.highlight ? "text-teal-900 text-base" : "text-black"}`, children: fmt(m[linha.field]) }), _jsx("span", { className: "text-[9px] text-black/60 ml-0.5", children: linha.unit })] }, m.id || m.maquina)))] }, linha.label))) })] }) })] }));
}
