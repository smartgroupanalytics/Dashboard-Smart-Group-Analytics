import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { motion } from "framer-motion";
import { Cog, RotateCw, Clock, ClipboardList, CalendarClock } from "lucide-react";
function fmtNum(v, dec = 0) {
    if (v == null || isNaN(v))
        return "—";
    return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtHoras(min) {
    if (!min && min !== 0)
        return "—";
    return fmtNum(min / 60, 1) + "h";
}
export default function CargaMaquinaCard({ record, index, maxDias }) {
    const pct = maxDias > 0 ? Math.min((record.dias_necessarios / maxDias) * 100, 100) : 0;
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, delay: index * 0.05 }, className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow ring-1 ring-teal-100", children: [_jsx("div", { className: "flex items-center justify-between mb-4", children: _jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("div", { className: "w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center", children: _jsx(Cog, { className: "w-5 h-5 text-[#008B8B]" }) }), _jsx("h3", { className: "text-base font-bold text-slate-900 truncate", children: record.maquina })] }) }), _jsxs("div", { className: "mb-4", children: [_jsxs("div", { className: "flex items-baseline justify-between mb-1.5", children: [_jsxs("span", { className: "text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1", children: [_jsx(CalendarClock, { className: "w-3.5 h-3.5" }), " Dias Necess\u00E1rios"] }), _jsxs("span", { className: "text-2xl font-extrabold text-[#008B8B] tabular-nums", children: [fmtNum(record.dias_necessarios, 1), _jsx("span", { className: "text-sm font-medium text-slate-400 ml-1", children: "dias" })] })] }), _jsx("div", { className: "h-2 rounded-full bg-slate-100 overflow-hidden", children: _jsx(motion.div, { initial: { width: 0 }, animate: { width: `${pct}%` }, transition: { duration: 0.5, delay: 0.2 + index * 0.05 }, className: "h-full rounded-full bg-[#008B8B]" }) })] }), _jsxs("div", { className: "grid grid-cols-3 gap-2 pt-3 border-t border-slate-100", children: [_jsxs("div", { className: "text-center", children: [_jsx(RotateCw, { className: "w-4 h-4 text-slate-400 mx-auto mb-1" }), _jsx("p", { className: "text-[10px] font-semibold text-slate-400 uppercase", children: "Rotatividade" }), _jsx("p", { className: "text-sm font-bold text-slate-900 tabular-nums", children: fmtNum(record.rotatividade, 0) })] }), _jsxs("div", { className: "text-center", children: [_jsx(Clock, { className: "w-4 h-4 text-amber-500 mx-auto mb-1" }), _jsx("p", { className: "text-[10px] font-semibold text-slate-400 uppercase", children: "Setup" }), _jsx("p", { className: "text-sm font-bold text-amber-600 tabular-nums", children: fmtHoras(record.tempo_setup) })] }), _jsxs("div", { className: "text-center", children: [_jsx(ClipboardList, { className: "w-4 h-4 text-emerald-600 mx-auto mb-1" }), _jsx("p", { className: "text-[10px] font-semibold text-slate-400 uppercase", children: "Produ\u00E7\u00E3o" }), _jsx("p", { className: "text-sm font-bold text-emerald-700 tabular-nums", children: fmtHoras(record.tempo_producao) })] })] })] }));
}
