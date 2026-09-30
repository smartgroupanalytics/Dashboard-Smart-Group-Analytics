import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, } from "recharts";
import { BarChart3, Filter, Check, ChevronDown } from "lucide-react";
import { MESES } from "@/lib/format";
const CATEGORIAS = [
    { key: "produzindo", label: "Produzindo", color: "#16a34a" },
    { key: "setup", label: "Setup", color: "#f97316" },
    { key: "parada_maq", label: "Parada de Máquina", color: "#f59e0b" },
    { key: "amostras", label: "Amostras", color: "#3b82f6" },
    { key: "retrabalho", label: "Retrabalho", color: "#8b5cf6" },
    { key: "ociosa", label: "Ociosa", color: "#ef4444" },
];
function MiniTooltip({ active, payload, label, color }) {
    if (!active || !payload?.length)
        return null;
    return (_jsxs("div", { className: "bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs", children: [_jsx("p", { className: "font-bold text-slate-800 mb-1", children: label }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-sm", style: { background: color } }), _jsxs("span", { className: "font-semibold text-slate-800 tabular-nums", children: [(payload[0].value ?? 0).toFixed(1).replace(".", ","), "%"] })] })] }));
}
function MiniChart({ dataKey, label, color, data }) {
    return (_jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx("span", { className: "w-3 h-3 rounded-sm", style: { background: color } }), _jsx("h3", { className: "text-sm font-bold text-slate-700", children: label })] }), _jsx(ResponsiveContainer, { width: "100%", height: 200, children: _jsxs(BarChart, { data: data, margin: { top: 5, right: 5, left: -22, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#f1f5f9", vertical: false }), _jsx(XAxis, { dataKey: "mes", tick: { fontSize: 10, fontWeight: 600, fill: "#64748b" }, axisLine: { stroke: "#e2e8f0" }, tickLine: { stroke: "#e2e8f0" } }), _jsx(YAxis, { tick: { fontSize: 9, fill: "#94a3b8" }, axisLine: false, tickLine: false, domain: [0, 100], tickFormatter: (v) => `${v}%` }), _jsx(Tooltip, { content: _jsx(MiniTooltip, { color: color }), cursor: { fill: "rgba(148,163,184,0.08)" } }), _jsxs(Bar, { dataKey: dataKey, radius: [5, 5, 0, 0], maxBarSize: 42, children: [data.map((_, i) => (_jsx(Cell, { fill: color }, i))), _jsx(LabelList, { dataKey: dataKey, position: "top", formatter: (v) => `${(v ?? 0).toFixed(1).replace(".", ",")}%`, style: { fontSize: 9, fontWeight: 700, fill: "#475569" } })] })] }) })] }));
}
export default function DisponibilidadeGraficoDialog({ open, onOpenChange, records, ano = 2026 }) {
    const [selectedCats, setSelectedCats] = useState(CATEGORIAS.map((c) => c.key));
    const [popOpen, setPopOpen] = useState(false);
    useEffect(() => {
        if (open)
            setSelectedCats(CATEGORIAS.map((c) => c.key));
    }, [open]);
    const toggleCat = (key) => {
        setSelectedCats((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
    };
    const data = useMemo(() => {
        return records
            .filter((r) => r.ano === ano)
            .sort((a, b) => a.mes - b.mes)
            .map((r) => {
            const entry = { mes: MESES[r.mes - 1]?.label || `Mês ${r.mes}` };
            CATEGORIAS.forEach((c) => {
                entry[c.key] = Number(r[c.key] ?? 0);
            });
            return entry;
        });
    }, [records, ano]);
    const visibleCats = CATEGORIAS.filter((c) => selectedCats.includes(c.key));
    const summary = selectedCats.length === CATEGORIAS.length
        ? "Todas"
        : selectedCats.length === 1
            ? CATEGORIAS.find((c) => c.key === selectedCats[0])?.label
            : `${selectedCats.length} selecionadas`;
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-6xl bg-white border border-slate-200 shadow-2xl rounded-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto", children: [_jsx(DialogHeader, { className: "px-6 pt-5 pb-3 border-b border-slate-100 sticky top-0 bg-white z-20", children: _jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs(DialogTitle, { className: "flex items-center gap-2 text-slate-800 text-lg font-bold", children: [_jsx("span", { className: "w-9 h-9 rounded-xl bg-slate-900 grid place-items-center text-white", children: _jsx(BarChart3, { className: "w-5 h-5" }) }), "Disponibilidade \u2014 ", ano] }), _jsxs("div", { className: "relative", children: [_jsxs("button", { onClick: () => setPopOpen((v) => !v), className: "flex items-center gap-2 h-9 px-3.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors", children: [_jsx(Filter, { className: "w-4 h-4 text-slate-500" }), "Categoria: ", _jsx("span", { className: "text-slate-900", children: summary }), _jsx(ChevronDown, { className: "w-3.5 h-3.5 text-slate-400" })] }), popOpen && (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 z-30", onClick: () => setPopOpen(false) }), _jsxs("div", { className: "absolute right-0 top-full mt-1.5 z-40 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5", children: [_jsx("div", { className: "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400", children: "Selecionar categorias" }), CATEGORIAS.map((c) => {
                                                        const checked = selectedCats.includes(c.key);
                                                        return (_jsxs("button", { onClick: () => toggleCat(c.key), className: "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors", children: [_jsx("span", { className: `w-4 h-4 rounded border flex items-center justify-center transition-colors ${checked ? "border-transparent" : "border-slate-300"}`, style: checked ? { background: c.color } : {}, children: checked && _jsx(Check, { className: "w-3 h-3 text-white" }) }), _jsx("span", { className: "w-2.5 h-2.5 rounded-sm", style: { background: c.color } }), c.label] }, c.key));
                                                    }), _jsxs("div", { className: "border-t border-slate-100 mt-1 pt-1 px-3 flex gap-2", children: [_jsx("button", { onClick: () => setSelectedCats(CATEGORIAS.map((c) => c.key)), className: "flex-1 text-xs font-semibold text-slate-600 hover:text-slate-900 py-1.5", children: "Todas" }), _jsx("button", { onClick: () => setSelectedCats([]), className: "flex-1 text-xs font-semibold text-slate-600 hover:text-slate-900 py-1.5", children: "Limpar" })] })] })] }))] })] }) }), _jsx("div", { className: "px-6 py-5", children: data.length === 0 ? (_jsxs("div", { className: "text-center py-16 text-slate-500", children: [_jsx(BarChart3, { className: "w-10 h-10 mx-auto mb-3 text-slate-300" }), _jsxs("p", { className: "font-medium", children: ["Nenhum dado dispon\u00EDvel para ", ano, "."] })] })) : visibleCats.length === 0 ? (_jsxs("div", { className: "text-center py-16 text-slate-500", children: [_jsx(Filter, { className: "w-10 h-10 mx-auto mb-3 text-slate-300" }), _jsx("p", { className: "font-medium", children: "Selecione ao menos uma categoria." })] })) : (_jsx("div", { className: `grid gap-4 ${visibleCats.length === 1
                            ? "grid-cols-1 max-w-2xl mx-auto"
                            : visibleCats.length === 2
                                ? "grid-cols-1 sm:grid-cols-2"
                                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`, children: visibleCats.map((c) => (_jsx(MiniChart, { dataKey: c.key, label: c.label, color: c.color, data: data }, c.key))) })) })] }) }));
}
