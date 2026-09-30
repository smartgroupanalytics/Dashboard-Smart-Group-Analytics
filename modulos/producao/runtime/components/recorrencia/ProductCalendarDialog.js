import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { motion } from "framer-motion";
import { CalendarDays, Package, Ruler, Hash, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
function fmtNum(v) {
    return (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(iso) {
    if (!iso)
        return "—";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
}
function weekday(iso) {
    if (!iso)
        return "";
    try {
        const dt = new Date(iso + "T00:00:00");
        return ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][dt.getDay()];
    }
    catch (e) {
        return "";
    }
}
export default function ProductCalendarDialog({ product, open, onOpenChange, accent = "#00798C" }) {
    const pedidos = product
        ? [...(product.pedidos || [])].sort((a, b) => (a.data || "").localeCompare(b.data || ""))
        : [];
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-lg p-0 gap-0 overflow-hidden border-0", children: [_jsx(DialogHeader, { className: "px-5 py-4 bg-gradient-to-r from-[#00798C] to-[#005f6e] text-white", children: _jsxs(DialogTitle, { className: "flex items-center justify-between", children: [_jsxs("span", { className: "flex items-center gap-2 text-base font-extrabold", children: [_jsx(CalendarDays, { className: "w-4 h-4" }), " Detalhamento de Datas"] }), _jsx("span", { className: "font-mono text-sm bg-white/15 px-2.5 py-1 rounded-lg", children: product?.codigo })] }) }), product && (_jsxs("div", { className: "px-5 py-4", children: [_jsxs("p", { className: "text-xs text-slate-500 mb-3 truncate flex items-center gap-1.5", children: [_jsx(Package, { className: "w-3.5 h-3.5 flex-shrink-0" }), product.descricao || "—"] }), _jsxs("div", { className: "grid grid-cols-3 gap-2 mb-4", children: [_jsxs("div", { className: "rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5", children: [_jsxs("div", { className: "text-[10px] uppercase tracking-wide text-slate-400 font-bold flex items-center gap-1", children: [_jsx(Hash, { className: "w-3 h-3" }), " Pedidos"] }), _jsx("div", { className: "text-lg font-extrabold text-slate-900 tabular-nums mt-0.5", children: product.count })] }), _jsxs("div", { className: "rounded-xl border border-[#00798C]/20 bg-[#00798C]/5 px-3 py-2.5", children: [_jsxs("div", { className: "text-[10px] uppercase tracking-wide text-[#00798C] font-bold flex items-center gap-1", children: [_jsx(Ruler, { className: "w-3 h-3" }), " Metragem"] }), _jsx("div", { className: "text-lg font-extrabold text-[#00798C] tabular-nums mt-0.5", children: fmtNum(product.metragem) })] }), _jsxs("div", { className: "rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5", children: [_jsxs("div", { className: "text-[10px] uppercase tracking-wide text-slate-400 font-bold flex items-center gap-1", children: [_jsx(TrendingUp, { className: "w-3 h-3" }), " M\u00E9dia"] }), _jsx("div", { className: "text-lg font-extrabold text-slate-900 tabular-nums mt-0.5", children: product.count > 0 ? fmtNum(product.metragem / product.count) : "0,00" })] })] }), _jsx("div", { className: "max-h-72 overflow-auto pr-1 -mr-1", children: _jsxs("div", { className: "relative pl-5", children: [_jsx("div", { className: "absolute left-[7px] top-1 bottom-1 w-px bg-gradient-to-b from-[#00798C]/40 via-slate-200 to-transparent" }), _jsx("div", { className: "space-y-1.5", children: pedidos.map((p, idx) => (_jsxs(motion.div, { initial: { opacity: 0, x: -8 }, animate: { opacity: 1, x: 0 }, transition: { duration: 0.25, delay: Math.min(idx * 0.04, 0.4) }, className: "relative flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:border-[#00798C]/30 hover:shadow-sm transition-all", children: [_jsx("div", { className: "absolute -left-[18px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-[#00798C] shadow-sm" }), _jsx("div", { className: "flex-shrink-0 w-7 h-7 rounded-lg bg-[#00798C]/10 grid place-items-center text-[11px] font-extrabold text-[#00798C]", children: String(idx + 1).padStart(2, "0") }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-baseline gap-1.5", children: [_jsx("span", { className: "text-sm font-bold text-slate-900 whitespace-nowrap", children: fmtDate(p.data) }), _jsx("span", { className: "text-[10px] text-slate-400 font-semibold uppercase", children: weekday(p.data) })] }), p.op && (_jsxs("span", { className: "text-[11px] font-mono text-slate-500", children: ["OP ", p.op] }))] }), _jsxs("div", { className: "flex-shrink-0 text-right", children: [_jsx("span", { className: "text-sm font-extrabold text-[#00798C] tabular-nums", children: fmtNum(p.metragem) }), _jsx("span", { className: "block text-[9px] text-slate-400 uppercase tracking-wide", children: "metros" })] })] }, idx))) })] }) })] }))] }) }));
}
