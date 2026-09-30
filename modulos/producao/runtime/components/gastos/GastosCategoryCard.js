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
function DonutGauge({ pct, color }) {
    const size = 88;
    const stroke = 8;
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const clampedPct = Math.min(pct, 100);
    const offset = circ * (1 - clampedPct / 100);
    return (_jsxs("div", { className: "relative flex items-center justify-center shrink-0", style: { width: size, height: size }, children: [_jsxs("svg", { width: size, height: size, className: "-rotate-90", children: [_jsx("circle", { cx: size / 2, cy: size / 2, r: r, fill: "none", stroke: "#E2E8F0", strokeWidth: stroke }), _jsx(motion.circle, { cx: size / 2, cy: size / 2, r: r, fill: "none", stroke: color, strokeWidth: stroke, strokeLinecap: "round", strokeDasharray: circ, initial: { strokeDashoffset: circ }, animate: { strokeDashoffset: offset }, transition: { duration: 0.8, ease: "easeOut" } })] }), _jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center", children: [_jsxs("span", { className: "text-xl font-extrabold text-slate-900 tabular-nums leading-none", children: [pct.toFixed(0), "%"] }), _jsx("span", { className: "text-[7px] uppercase tracking-wider text-slate-700 font-bold mt-0.5", children: "do or\u00E7ado" })] })] }));
}
export default function GastosCategoryCard({ categoria, titulo, color, accentClass, index = 0, dados }) {
    const orcado = dados.orcado || 0;
    const valor2025 = dados.valor_2025 || 0;
    const valor2026 = dados.valor_2026 || 0;
    const pctUsado = orcado > 0 ? (valor2026 / orcado) * 100 : 0;
    const diffOrcado2026 = valor2026 - orcado;
    const pctOrcado2026 = orcado > 0 ? ((diffOrcado2026 / orcado) * 100) : 0;
    const diff2025_2026 = valor2026 - valor2025;
    const pct2025_2026 = valor2025 > 0 ? ((diff2025_2026 / valor2025) * 100) : 0;
    const TrendIcon = (v) => v > 0 ? TrendingUp : v < 0 ? TrendingDown : Minus;
    const trendColor = (v) => v > 0 ? "text-rose-600" : v < 0 ? "text-emerald-600" : "text-slate-500";
    const IconOrc = TrendIcon(diffOrcado2026);
    const Icon2526 = TrendIcon(diff2025_2026);
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 20, scale: 0.97 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { delay: index * 0.1, duration: 0.45, ease: "easeOut" }, className: "relative overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-[0_2px_20px_-6px_rgba(30,58,138,0.12)]", children: [_jsx("div", { className: `h-1.5 w-full ${accentClass}` }), _jsxs("div", { className: "p-5", children: [_jsxs("div", { className: "mb-4", children: [_jsx("h3", { className: "text-base font-bold text-slate-900 tracking-tight", children: titulo }), _jsx("p", { className: "text-[11px] text-slate-700 font-semibold", children: "Or\u00E7ado vs Realizado 2026" })] }), _jsxs("div", { className: "flex items-center gap-4 mb-4", children: [_jsx(DonutGauge, { pct: pctUsado, color: color }), _jsxs("div", { className: "flex-1 space-y-2", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[10px] uppercase tracking-wider text-slate-600 font-bold", children: "Valor Or\u00E7ado" }), _jsx("p", { className: "text-sm font-bold text-slate-900 tabular-nums", children: fmtBRL(orcado) })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[10px] uppercase tracking-wider text-slate-600 font-bold", children: "Valor 2025" }), _jsx("p", { className: "text-sm font-bold text-slate-700 tabular-nums", children: fmtBRL(valor2025) })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[10px] uppercase tracking-wider text-slate-600 font-bold", children: "Valor 2026" }), _jsx("p", { className: "text-sm font-bold tabular-nums", style: { color }, children: fmtBRL(valor2026) })] })] })] }), _jsxs("div", { className: "pt-3 border-t border-slate-100", children: [_jsx("p", { className: "text-[10px] uppercase tracking-wider text-slate-600 font-bold mb-2", children: "M\u00E9tricas de compara\u00E7\u00E3o" }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { className: "rounded-lg bg-slate-50 px-3 py-2", children: [_jsx("span", { className: "text-[9px] text-slate-700 font-bold block mb-0.5", children: "Or\u00E7ado vs 2026" }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(IconOrc, { className: `w-3 h-3 ${trendColor(diffOrcado2026)}` }), _jsx("span", { className: `text-xs font-bold tabular-nums ${trendColor(diffOrcado2026)}`, children: fmtBRL(Math.abs(diffOrcado2026)) })] }), _jsx("span", { className: `text-sm font-extrabold ${trendColor(pctOrcado2026)}`, children: fmtPct(pctOrcado2026) })] }), _jsxs("div", { className: "rounded-lg bg-slate-50 px-3 py-2", children: [_jsx("span", { className: "text-[9px] text-slate-700 font-bold block mb-0.5", children: "2025 vs 2026" }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Icon2526, { className: `w-3 h-3 ${trendColor(diff2025_2026)}` }), _jsx("span", { className: `text-xs font-bold tabular-nums ${trendColor(diff2025_2026)}`, children: fmtBRL(Math.abs(diff2025_2026)) })] }), _jsx("span", { className: `text-sm font-extrabold ${trendColor(pct2025_2026)}`, children: fmtPct(pct2025_2026) })] })] })] })] })] }));
}
