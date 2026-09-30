import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
function fmtBRL(v) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}
function fmtPct(v) {
    const sign = v > 0 ? "+" : "";
    return `${sign}${v.toFixed(1)}%`;
}
export default function GastosTotalBar({ dados }) {
    const orcado = dados.orcado || 0;
    const valor2025 = dados.valor_2025 || 0;
    const valor2026 = dados.valor_2026 || 0;
    const diffOrcado2026 = valor2026 - orcado;
    const pctOrcado2026 = orcado > 0 ? ((diffOrcado2026 / orcado) * 100) : 0;
    const diff2025_2026 = valor2026 - valor2025;
    const pct2025_2026 = valor2025 > 0 ? ((diff2025_2026 / valor2025) * 100) : 0;
    const trendColor = (v) => v > 0 ? "text-rose-600" : v < 0 ? "text-emerald-600" : "text-slate-500";
    const TrendIcon = (v) => v > 0 ? TrendingUp : v < 0 ? TrendingDown : Minus;
    const IconOrc = TrendIcon(diffOrcado2026);
    const Icon2526 = TrendIcon(diff2025_2026);
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.35, duration: 0.45 }, className: "relative overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-[0_2px_20px_-6px_rgba(30,58,138,0.12)]", children: [_jsx("div", { className: "absolute top-0 right-0 h-1 w-full bg-gradient-to-r from-[#1e3a8a] via-[#0d9488] to-[#f59e0b]" }), _jsxs("div", { className: "flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 p-5", children: [_jsxs("div", { className: "shrink-0", children: [_jsx("span", { className: "text-[10px] uppercase tracking-wider text-slate-600 font-bold", children: "Total Geral" }), _jsx("p", { className: "text-2xl font-extrabold text-slate-900 tabular-nums tracking-tight", children: fmtBRL(orcado) }), _jsx("span", { className: "text-[11px] text-slate-700 font-semibold", children: "Or\u00E7ado total das 3 categorias" })] }), _jsx("div", { className: "hidden sm:block w-px h-12 bg-slate-100" }), _jsxs("div", { className: "flex-1 grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "rounded-xl bg-slate-50 px-4 py-2.5", children: [_jsx("span", { className: "text-[10px] uppercase tracking-wider text-slate-600 font-bold block mb-1", children: "Diferen\u00E7a Or\u00E7ado vs 2026" }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx(IconOrc, { className: `w-4 h-4 ${trendColor(diffOrcado2026)}` }), _jsx("span", { className: `text-lg font-bold tabular-nums ${trendColor(diffOrcado2026)}`, children: fmtBRL(Math.abs(diffOrcado2026)) })] }), _jsx("span", { className: `text-xs font-semibold ${trendColor(pctOrcado2026)}`, children: fmtPct(pctOrcado2026) })] }), _jsxs("div", { className: "rounded-xl bg-slate-50 px-4 py-2.5", children: [_jsx("span", { className: "text-[10px] uppercase tracking-wider text-slate-600 font-bold block mb-1", children: "Diferen\u00E7a 2025 vs 2026" }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx(Icon2526, { className: `w-4 h-4 ${trendColor(diff2025_2026)}` }), _jsx("span", { className: `text-lg font-bold tabular-nums ${trendColor(diff2025_2026)}`, children: fmtBRL(Math.abs(diff2025_2026)) })] }), _jsx("span", { className: `text-xs font-semibold ${trendColor(pct2025_2026)}`, children: fmtPct(pct2025_2026) })] })] })] })] }));
}
