import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
function pctColor(v) {
    if (v >= 0.8)
        return "text-emerald-400";
    if (v >= 0.5)
        return "text-amber-400";
    return "text-rose-400";
}
function inopColor(v) {
    if (v >= 0.3)
        return "text-rose-400";
    if (v >= 0.15)
        return "text-amber-400";
    return "text-emerald-400";
}
function fmtPct(v) {
    return `${(v * 100).toFixed(1).replace(".", ",")}%`;
}
function fmtDate(iso) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
}
const COLS = [
    { key: "data", label: "Data", format: fmtDate },
    { key: "maquina", label: "Máquina" },
    { key: "utilizacao", label: "Utilização", format: fmtPct, color: pctColor },
    { key: "produtividade", label: "Produtividade", format: fmtPct, color: pctColor, highlight: true },
    { key: "eficiencia_producao", label: "Efic. Produção", format: fmtPct, color: pctColor },
    { key: "eficiencia_setup", label: "Efic. Setup", format: fmtPct, color: pctColor },
    { key: "maquina_inoperante", label: "Inoperante", format: fmtPct, color: inopColor },
];
export default function ProdutividadeTable({ records }) {
    const [sortKey, setSortKey] = useState("data");
    const [sortDir, setSortDir] = useState("desc");
    const sorted = useMemo(() => {
        const arr = [...records];
        arr.sort((a, b) => {
            let av = a[sortKey];
            let bv = b[sortKey];
            if (typeof av === "string" && sortKey !== "data") {
                av = av.toLowerCase();
                bv = bv.toLowerCase();
            }
            if (av < bv)
                return sortDir === "asc" ? -1 : 1;
            if (av > bv)
                return sortDir === "asc" ? 1 : -1;
            return 0;
        });
        return arr;
    }, [records, sortKey, sortDir]);
    const toggleSort = (key) => {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        }
        else {
            setSortKey(key);
            setSortDir("asc");
        }
    };
    const SortIcon = ({ col }) => {
        if (sortKey !== col)
            return _jsx(ChevronsUpDown, { className: "w-3 h-3 opacity-40" });
        return sortDir === "asc" ? _jsx(ChevronUp, { className: "w-3.5 h-3.5" }) : _jsx(ChevronDown, { className: "w-3.5 h-3.5" });
    };
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, delay: 0.3 }, className: "rounded-xl bg-gradient-to-br from-[#0f3563] to-[#1c528f] border border-white/10 shadow-lg overflow-hidden", children: [_jsxs("div", { className: "flex items-center gap-2 p-5 pb-3", children: [_jsx("span", { className: "w-1 h-5 rounded-full bg-blue-400" }), _jsxs("h3", { className: "text-sm font-bold text-white uppercase tracking-wider drop-shadow", children: ["Dados por M\u00E1quina (", sorted.length, " registros)"] })] }), _jsx("div", { className: "overflow-x-auto max-h-[600px] overflow-y-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "sticky top-0 z-10 bg-[#0a2540]/95 backdrop-blur", children: _jsx("tr", { children: COLS.map((c) => (_jsx("th", { onClick: () => toggleSort(c.key), className: `px-3 py-2.5 text-left font-semibold text-blue-100 whitespace-nowrap cursor-pointer select-none hover:text-white ${c.highlight ? "bg-blue-500/20" : ""}`, children: _jsxs("span", { className: "flex items-center gap-1", children: [c.label, _jsx(SortIcon, { col: c.key })] }) }, c.key))) }) }), _jsx("tbody", { children: sorted.map((r, i) => (_jsx("tr", { className: `border-t border-white/5 hover:bg-white/5 ${i % 2 === 0 ? "bg-white/0" : "bg-white/[0.02]"}`, children: COLS.map((c) => {
                                    const raw = r[c.key];
                                    const val = c.format ? c.format(raw) : raw;
                                    return (_jsx("td", { className: `px-3 py-2 whitespace-nowrap ${c.highlight
                                            ? `font-bold ${c.color(raw)} bg-blue-500/10`
                                            : c.color
                                                ? c.color(raw)
                                                : "text-slate-200"}`, children: val }, c.key));
                                }) }, r.id || i))) })] }) })] }));
}
