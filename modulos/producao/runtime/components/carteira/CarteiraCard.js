import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { motion } from "framer-motion";
import RadialGauge from "./RadialGauge.js";
const TEAL = "#008785";
const CARD_BG = "#F8F9FA";
function fmtNum(n) {
    return (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtPct(n) {
    return (n || 0).toFixed(1).replace(".", ",") + "%";
}
export default function CarteiraCard({ data, index = 0 }) {
    if (!data)
        return null;
    const total = data.total_carteira || 0;
    const pct = (v) => (total > 0 ? (v / total) * 100 : 0);
    const rows = [
        { label: "Total Carteira", value: data.total_carteira, isTotal: true },
        { label: "PEDIDO BEIRA RIO", value: data.pedido_beira_rio },
        { label: "PEDIDOS OUTROS", value: data.pedidos_outros },
        { label: "ESTOQUE BEIRA RIO", value: data.estoque_beira_rio },
        { label: "ESTOQUE STK", value: data.estoque_stk },
        { label: "ESTOQUE OUTROS", value: data.estoque_outros },
    ];
    const pedidosTotal = (data.pedido_beira_rio || 0) + (data.pedidos_outros || 0);
    const estoqueTotal = (data.estoque_beira_rio || 0) + (data.estoque_stk || 0) + (data.estoque_outros || 0);
    const baseRelacao = pedidosTotal + estoqueTotal;
    const pedidosPct = baseRelacao > 0 ? (pedidosTotal / baseRelacao) * 100 : 0;
    const estoquePct = baseRelacao > 0 ? (estoqueTotal / baseRelacao) * 100 : 0;
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, delay: index * 0.1 }, className: "rounded-2xl shadow-lg overflow-hidden border border-slate-300 h-full flex flex-col", style: { background: CARD_BG }, children: [_jsx("div", { className: "px-5 py-3 text-white", style: { background: TEAL }, children: _jsx("h3", { className: "text-lg font-bold tracking-wide", children: data.semana_label }) }), _jsxs("div", { className: "flex flex-col sm:flex-row flex-1", children: [_jsx("div", { className: "flex-1 overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-slate-300", style: { background: CARD_BG }, children: [_jsx("th", { className: "px-4 py-2 text-left text-sm font-semibold text-slate-600", children: "Pedido" }), _jsx("th", { className: "px-3 py-2 text-right text-sm font-semibold whitespace-nowrap text-slate-600", children: "Entrada" }), _jsx("th", { className: "px-2 py-2 text-right text-sm font-semibold w-12 text-slate-600", children: "%" })] }) }), _jsx("tbody", { children: rows.map((r, i) => (_jsxs("tr", { className: `border-b border-slate-200 ${r.isTotal ? "font-bold" : ""}`, style: { background: i % 2 === 0 ? CARD_BG : "#fff" }, children: [_jsx("td", { className: "px-4 py-3 text-slate-900 font-semibold text-sm", children: r.label }), _jsx("td", { className: `px-3 py-3 text-right tabular-nums text-slate-900 ${r.isTotal ? "text-2xl font-extrabold" : "text-xl font-bold"}`, children: fmtNum(r.value) }), _jsx("td", { className: "px-2 py-3 text-right tabular-nums text-slate-700 text-sm font-semibold", children: r.isTotal ? "100%" : fmtPct(pct(r.value)) })] }, i))) })] }) }), _jsxs("div", { className: "flex flex-row sm:flex-col items-center justify-center gap-6 sm:gap-4 p-4 sm:border-l border-slate-200 bg-white sm:min-w-[220px]", children: [_jsx(RadialGauge, { label: "Pedidos", value: pedidosPct, max: 100, index: index * 2, subValue: pedidosTotal }), _jsx(RadialGauge, { label: "Estoques", value: estoquePct, max: 100, index: index * 2 + 1, subValue: estoqueTotal })] })] })] }));
}
