import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from "react";
import { Card } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
const fmt = (v) => v == null
    ? "—"
    : v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export default function PerdaOpCards({ perda2025, perda2026 }) {
    const hasData = perda2025 != null && perda2026 != null && Number(perda2025) !== 0;
    const diff = hasData ? ((perda2026 - perda2025) / perda2025) * 100 : null;
    const DiffIcon = diff == null ? Minus : diff < 0 ? TrendingDown : TrendingUp;
    // perda menor em 2026 (diff negativo) é bom -> verde; maior -> vermelho
    const diffColor = diff == null ? "#64748b" : diff < 0 ? "#00A86B" : "#dc2626";
    return (_jsxs(_Fragment, { children: [_jsxs(Card, { className: "p-4 flex flex-col justify-between bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] rounded-2xl", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "inline-block w-2.5 h-2.5 rounded-full", style: { background: "#007BFF" } }), _jsx("p", { className: "text-xs font-semibold text-slate-600", children: "M\u00E9dia de Perda por OP 2025" })] }), _jsxs("div", { className: "mt-2", children: [_jsx("p", { className: "text-2xl font-extrabold text-slate-900 tabular-nums leading-none", children: fmt(perda2025) }), _jsx("p", { className: "text-[11px] text-slate-400 mt-1", children: "m\u00E9dia por OP" })] })] }), _jsxs(Card, { className: "p-4 flex flex-col justify-between bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] rounded-2xl", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "inline-block w-2.5 h-2.5 rounded-full", style: { background: "#00A86B" } }), _jsx("p", { className: "text-xs font-semibold text-slate-600", children: "M\u00E9dia de Perda por OP 2026" })] }), _jsxs("div", { className: "mt-2", children: [_jsx("p", { className: "text-2xl font-extrabold text-slate-900 tabular-nums leading-none", children: fmt(perda2026) }), _jsx("p", { className: "text-[11px] text-slate-400 mt-1", children: "m\u00E9dia por OP" })] })] }), _jsxs(Card, { className: "p-4 flex items-center justify-between bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] rounded-2xl sm:col-span-2", children: [_jsx("p", { className: "text-xs font-semibold text-slate-600", children: "Diferen\u00E7a percentual" }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx(DiffIcon, { className: "w-4 h-4", style: { color: diffColor } }), _jsx("span", { className: "text-lg font-extrabold tabular-nums", style: { color: diffColor }, children: diff == null
                                    ? "—"
                                    : (diff > 0 ? "+" : "") + diff.toFixed(1).replace(".", ",") + "%" })] })] })] }));
}
