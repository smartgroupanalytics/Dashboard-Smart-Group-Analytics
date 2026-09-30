import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { ArrowUpRight } from "lucide-react";
export default function RecorrenciaKpiCard({ label, value }) {
    return (_jsxs("div", { className: "bg-white border border-slate-200 rounded-xl p-5 shadow-sm", children: [_jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsx("p", { className: "text-sm font-medium text-slate-500", children: label }), _jsx("div", { className: "p-1.5 rounded-lg bg-slate-50", children: _jsx(ArrowUpRight, { className: "w-4 h-4 text-slate-400" }) })] }), _jsx("p", { className: "text-3xl font-extrabold text-slate-900 tabular-nums", children: value })] }));
}
