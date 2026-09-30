import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
export default function AproveitamentoKpiCard({ label, value, suffix = "", icon: Icon, color = "slate", delay = 0, active = false, onClick }) {
    const colorMap = {
        slate: "from-slate-700 to-slate-900",
        emerald: "from-emerald-600 to-emerald-800",
        amber: "from-amber-500 to-amber-700",
        rose: "from-rose-500 to-rose-700",
        indigo: "from-indigo-600 to-indigo-800",
        cyan: "from-cyan-600 to-cyan-800",
    };
    const Comp = onClick ? "button" : "div";
    return (_jsxs(Comp, { type: onClick ? "button" : undefined, onClick: onClick, className: `bg-gradient-to-br ${colorMap[color]} rounded-xl p-4 text-white shadow-sm text-left w-full transition-all ${onClick ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" : ""} ${active ? "ring-4 ring-white/70 scale-[1.03]" : ""}`, style: { animation: `insumos-rise 0.6s ${delay}s both` }, children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx("span", { className: "text-[11px] uppercase tracking-wide font-semibold opacity-80", children: label }), Icon && _jsx(Icon, { className: "w-4 h-4 opacity-70" })] }), _jsxs("span", { className: "text-2xl font-extrabold tabular-nums", children: [value, suffix] })] }));
}
