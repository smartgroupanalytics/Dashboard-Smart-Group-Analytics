import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, Gauge, Activity, Wrench } from "lucide-react";
function fmtPct(v) {
    return `${(v * 100).toFixed(1).replace(".", ",")}%`;
}
// Regra de cor conforme meta:
// abaixo da meta -> vermelho | dentro da meta (±0,5) -> âmbar | acima -> verde
function statusColor(value, meta) {
    const diff = value * 100 - meta;
    if (diff < -0.5)
        return "#dc2626";
    if (diff > 0.5)
        return "#059669";
    return "#d97706";
}
function SingleCard({ label, value, meta, Icon, index }) {
    const color = statusColor(value, meta);
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, delay: index * 0.05 }, className: "relative rounded-xl bg-white border border-slate-200 shadow-sm pl-4 pr-4 py-2.5 overflow-hidden", children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-1.5", style: { background: color } }), _jsxs("div", { className: "flex items-center gap-2.5 mb-1.5", children: [_jsx("div", { className: "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center", style: { background: `${color}1a` }, children: _jsx(Icon, { className: "w-4 h-4", style: { color } }) }), _jsx("p", { className: "text-sm uppercase tracking-wider text-slate-500 font-bold leading-tight", children: label })] }), _jsxs("div", { className: "flex items-end justify-between gap-2", children: [_jsx("span", { className: "text-2xl font-extrabold tabular-nums leading-none text-slate-900", children: fmtPct(value) }), _jsxs("span", { className: "inline-flex items-center text-[11px] font-bold px-1 whitespace-nowrap", style: {
                            color: "#1d4ed8",
                            background: "transparent",
                        }, children: ["Meta: ", meta, "%"] })] })] }));
}
export default function GlassNeonKpiCard({ geral, index = 0 }) {
    const rows = [
        { label: "Produtividade Geral", value: geral.produtividade, meta: 80, icon: TrendingUp },
        { label: "Utilização Geral", value: geral.utilizacao, meta: 35, icon: Gauge },
        { label: "Efic. Produção", value: geral.eficiencia_producao, meta: 95, icon: Activity },
        { label: "Efic. Setup", value: geral.eficiencia_setup, meta: 100, icon: Wrench },
    ];
    return (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", children: rows.map((r, i) => (_jsx(SingleCard, { label: r.label, value: r.value, meta: r.meta, Icon: r.icon, index: index * 4 + i }, i))) }));
}
