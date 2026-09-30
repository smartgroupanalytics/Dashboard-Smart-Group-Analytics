import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trophy, Calendar, X, Crown, Medal, Award, TrendingUp, Hash, Ruler, ChevronDown } from "lucide-react";
import { fmtMeters, MESES } from "@/lib/format";
function normalizeDefeito(text) {
    if (!text)
        return "";
    let t = text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    t = t.replace(/\bestapa\b/g, "estampa");
    if (t === "retalho")
        t = "retalhos";
    if (t.includes("segunda diversos"))
        t = "segunda diversos defeitos";
    return t.toUpperCase();
}
function RankBadge({ position }) {
    if (position === 0)
        return _jsx(Crown, { className: "w-4 h-4 text-amber-400" });
    if (position === 1)
        return _jsx(Medal, { className: "w-4 h-4 text-slate-300" });
    if (position === 2)
        return _jsx(Award, { className: "w-4 h-4 text-orange-400" });
    return _jsx("span", { className: "text-xs font-extrabold text-slate-500 tabular-nums", children: position + 1 });
}
export default function RankingDefeitosDialog({ open, onOpenChange, records }) {
    const now = new Date();
    const [selectedMonths, setSelectedMonths] = useState([now.getMonth()]);
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const monthsAvailable = useMemo(() => {
        const set = new Set();
        (records || []).forEach((r) => { if (r.data)
            set.add(r.data.slice(0, 7)); });
        return Array.from(set).sort().reverse();
    }, [records]);
    const yearsAvailable = useMemo(() => {
        const set = new Set();
        monthsAvailable.forEach((ym) => set.add(Number(ym.split("-")[0])));
        return Array.from(set).sort().reverse();
    }, [monthsAvailable]);
    const ranking = useMemo(() => {
        const map = {};
        (records || []).forEach((r) => {
            if (!r.data)
                return;
            const [y, m] = r.data.split("-");
            if (Number(y) !== selectedYear || !selectedMonths.includes(Number(m) - 1))
                return;
            const texto = normalizeDefeito(r.defeito);
            if (!texto)
                return;
            map[texto] = (map[texto] || 0) + (r.metros_defeito || 0);
        });
        return Object.entries(map)
            .map(([texto, metros]) => ({ texto, metros }))
            .sort((a, b) => b.metros - a.metros);
    }, [records, selectedMonths, selectedYear]);
    const total = ranking.reduce((s, r) => s + r.metros, 0);
    const maxMetros = Math.max(1, ...ranking.map((r) => r.metros));
    const toggleMonth = (i) => {
        setSelectedMonths((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i].sort((a, b) => a - b));
    };
    const monthsLabel = selectedMonths.length === 0
        ? "Nenhum mês"
        : selectedMonths.length === 1
            ? MESES[selectedMonths[0]].label
            : `${selectedMonths.length} meses selecionados`;
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-2xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 border-0 bg-white", children: [_jsxs(DialogHeader, { className: "px-6 py-5 bg-gradient-to-r from-[#0a2540] via-[#0e3a5e] to-[#00798C] text-white relative overflow-hidden border-b border-slate-200", children: [_jsx("div", { className: "absolute -right-10 -top-10 w-40 h-40 rounded-full bg-amber-500/10 blur-3xl" }), _jsx("div", { className: "absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-white/20 blur-3xl" }), _jsxs(DialogTitle, { className: "flex items-center justify-between relative z-10", children: [_jsxs("span", { className: "flex items-center gap-3 text-lg font-extrabold tracking-tight", children: [_jsx("span", { className: "w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 grid place-items-center shadow-lg shadow-amber-500/20", children: _jsx(Trophy, { className: "w-5 h-5 text-white" }) }), "Ranking de Defeitos"] }), _jsx("button", { onClick: () => onOpenChange(false), className: "w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 grid place-items-center transition-colors", children: _jsx(X, { className: "w-4 h-4" }) })] })] }), _jsxs("div", { className: "px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3 flex-wrap", children: [_jsxs(Popover, { children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs("button", { className: "inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-sm font-semibold transition-colors", children: [_jsx(Calendar, { className: "w-4 h-4 text-[#00798C]" }), _jsx("span", { className: "max-w-[180px] truncate", children: monthsLabel }), _jsx(ChevronDown, { className: "w-3.5 h-3.5 text-slate-400" })] }) }), _jsxs(PopoverContent, { className: "w-64 p-3 bg-white border-slate-200", align: "start", children: [_jsx("div", { className: "grid grid-cols-3 gap-1.5", children: MESES.map((mes, i) => {
                                                const checked = selectedMonths.includes(i);
                                                return (_jsx("button", { type: "button", onClick: () => toggleMonth(i), className: `flex items-center justify-center h-9 rounded-lg text-xs font-semibold transition-all ${checked
                                                        ? "bg-[#00798C] text-white shadow-md"
                                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"}`, children: mes.label.slice(0, 3) }, i));
                                            }) }), _jsxs("div", { className: "flex justify-between gap-1 mt-3 pt-2 border-t border-slate-200", children: [_jsx("button", { className: "h-7 px-2 text-[11px] text-[#00798C] hover:text-[#006674] font-semibold rounded-md hover:bg-slate-100", onClick: () => setSelectedMonths(MESES.map((_, i) => i)), children: "Todos" }), _jsx("button", { className: "h-7 px-2 text-[11px] text-slate-400 hover:text-slate-600 font-semibold rounded-md hover:bg-slate-100", onClick: () => setSelectedMonths([]), children: "Limpar" })] })] })] }), _jsxs("div", { className: "relative", children: [_jsx("select", { value: selectedYear, onChange: (e) => setSelectedYear(Number(e.target.value)), className: "appearance-none h-10 pl-4 pr-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-sm font-semibold cursor-pointer transition-colors focus:outline-none focus:border-[#00798C]", children: yearsAvailable.map((y) => (_jsx("option", { value: y, className: "bg-white", children: y }, y))) }), _jsx(ChevronDown, { className: "w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" })] }), _jsxs("div", { className: "ml-auto flex items-center gap-2", children: [_jsxs("div", { className: "flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200", children: [_jsx(Hash, { className: "w-3.5 h-3.5 text-[#00798C]" }), _jsxs("div", { children: [_jsx("div", { className: "text-[9px] uppercase tracking-wide text-slate-400 font-bold leading-none", children: "Tipos" }), _jsx("div", { className: "text-sm font-extrabold text-slate-900 tabular-nums leading-tight", children: ranking.length })] })] }), _jsxs("div", { className: "flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200", children: [_jsx(Ruler, { className: "w-3.5 h-3.5 text-rose-500" }), _jsxs("div", { children: [_jsx("div", { className: "text-[9px] uppercase tracking-wide text-slate-400 font-bold leading-none", children: "Total" }), _jsx("div", { className: "text-sm font-extrabold text-slate-900 tabular-nums leading-tight", children: fmtMeters(total) })] })] })] })] }), _jsx("div", { className: "overflow-y-auto flex-1 p-6 bg-gradient-to-b from-white to-slate-50", children: ranking.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-16 text-center", children: [_jsx(Trophy, { className: "w-12 h-12 text-slate-200 mb-3" }), _jsx("p", { className: "text-slate-400 text-sm font-medium", children: "Nenhum defeito no per\u00EDodo selecionado." })] })) : (_jsx("div", { className: "space-y-2", children: _jsx(AnimatePresence, { children: ranking.map((r, i) => {
                                const pctBar = (r.metros / maxMetros) * 100;
                                const isTop3 = i < 3;
                                return (_jsxs(motion.div, { initial: { opacity: 0, x: -12 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 12 }, transition: { duration: 0.3, delay: Math.min(i * 0.04, 0.5) }, className: `relative overflow-hidden rounded-2xl border transition-all group ${isTop3
                                        ? "border-amber-200 bg-gradient-to-r from-amber-50 to-transparent"
                                        : "border-slate-200 bg-white hover:bg-slate-50"}`, children: [_jsx("div", { className: "absolute inset-y-0 left-0 bg-gradient-to-r from-[#00798C]/10 to-transparent pointer-events-none", style: { width: `${pctBar}%` } }), _jsxs("div", { className: "relative flex items-center gap-4 px-4 py-3.5", children: [_jsx("div", { className: `w-9 h-9 rounded-xl grid place-items-center flex-shrink-0 ${i === 0 ? "bg-amber-100" :
                                                        i === 1 ? "bg-slate-200" :
                                                            i === 2 ? "bg-orange-100" :
                                                                "bg-slate-100"}`, children: _jsx(RankBadge, { position: i }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "text-sm font-bold text-slate-800 truncate", children: r.texto }), _jsx("div", { className: "mt-1.5 h-1 rounded-full bg-slate-100 overflow-hidden", children: _jsx(motion.div, { initial: { width: 0 }, animate: { width: `${pctBar}%` }, transition: { duration: 0.6, delay: Math.min(i * 0.04, 0.5) }, className: `h-full rounded-full ${i === 0 ? "bg-gradient-to-r from-amber-400 to-amber-500" :
                                                                    i === 1 ? "bg-gradient-to-r from-slate-300 to-slate-400" :
                                                                        i === 2 ? "bg-gradient-to-r from-orange-400 to-orange-500" :
                                                                            "bg-gradient-to-r from-[#00798C] to-[#36aaa8]"}` }) })] }), _jsxs("div", { className: "text-right flex-shrink-0", children: [_jsx("div", { className: `text-base font-extrabold tabular-nums ${isTop3 ? "text-amber-600" : "text-rose-500"}`, children: fmtMeters(r.metros) }), _jsx("div", { className: "text-[10px] uppercase tracking-wide text-slate-400 font-bold", children: "metros" })] })] })] }, r.texto));
                            }) }) })) }), ranking.length > 0 && (_jsxs("div", { className: "px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2 text-slate-500", children: [_jsx(TrendingUp, { className: "w-4 h-4 text-[#00798C]" }), _jsx("span", { className: "text-xs uppercase tracking-wide font-bold", children: "Total no per\u00EDodo" })] }), _jsx("div", { className: "text-xl font-extrabold text-rose-500 tabular-nums", children: fmtMeters(total) })] }))] }) }));
}
