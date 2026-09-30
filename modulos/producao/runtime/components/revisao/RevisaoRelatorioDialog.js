import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fmtMeters } from "@/lib/format";
import Gauge from "@/components/revisao/Gauge";
import { FileBarChart, Calendar, Ruler, Hash, TrendingUp, Target, Printer } from "lucide-react";
const META_REVISADOS = 5126.1;
const META_1 = 4882.0;
export default function RevisaoRelatorioDialog({ open, onOpenChange, records }) {
    const rows = useMemo(() => {
        const map = {};
        records.forEach((r) => {
            const key = r.data || "Sem data";
            if (!map[key])
                map[key] = { data: key, metros: 0, ops: 0 };
            map[key].metros += r.metros_revisados || 0;
            map[key].ops += r.ops_revisadas || 0;
        });
        return Object.values(map).sort((a, b) => (a.data < b.data ? -1 : 1));
    }, [records]);
    const totais = useMemo(() => {
        const metros = rows.reduce((s, r) => s + r.metros, 0);
        const ops = rows.reduce((s, r) => s + r.ops, 0);
        return { metros, ops, media: ops > 0 ? metros / ops : 0 };
    }, [rows]);
    const medias = useMemo(() => {
        if (records.length === 0)
            return { revisados: 0, p1: 0 };
        const sum = (fn) => records.reduce((s, r) => s + (fn(r) || 0), 0);
        const revisados = sum((r) => r.metros_revisados);
        const p1 = sum((r) => r.metros_1);
        const revManual = sum((r) => r.media_metros_revisados);
        const p1Manual = sum((r) => r.media_metros_1);
        const count = records.length;
        return {
            revisados: revManual ? revManual / count : revisados / count,
            p1: p1Manual ? p1Manual / count : p1 / count,
        };
    }, [records]);
    const fmtData = (iso) => {
        if (iso === "Sem data")
            return iso;
        const parts = iso.split("-");
        if (parts.length === 3)
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return iso;
    };
    const handlePrint = () => {
        document.body.classList.add("printing-revisao-relatorio");
        const styleEl = document.createElement("style");
        styleEl.id = "revisao-relatorio-page";
        styleEl.textContent = "@page { size: A4 landscape; margin: 8mm; }";
        document.head.appendChild(styleEl);
        window.print();
        setTimeout(() => {
            document.body.classList.remove("printing-revisao-relatorio");
            styleEl.remove();
        }, 500);
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-[95vw] w-[95vw] h-[90vh] max-h-[90vh] overflow-hidden p-0 border-slate-300 bg-gradient-to-br from-white via-slate-50 to-slate-100 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.2)]", children: [_jsx(DialogHeader, { className: "px-6 pt-1 pb-1 border-b border-slate-200 bg-white/60", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-2.5 rounded-xl bg-slate-100 text-slate-700 ring-1 ring-slate-200 shadow-sm", children: _jsx(FileBarChart, { className: "w-5 h-5" }) }), _jsxs("div", { children: [_jsx(DialogTitle, { className: "text-xl font-extrabold text-slate-900", children: "Relat\u00F3rio de Revis\u00E3o" }), _jsx("p", { className: "text-xs text-slate-500", children: "M\u00E9tricas gerenciais por data" })] }), _jsxs(Button, { variant: "default", size: "sm", className: "gap-1.5 ml-auto", onClick: handlePrint, children: [_jsx(Printer, { className: "w-4 h-4" }), " Imprimir"] })] }) }), _jsxs("div", { className: "revisao-relatorio-root px-6 py-1 overflow-y-auto flex-1", children: [_jsx("h2", { className: "print-only hidden text-2xl font-extrabold text-black mb-2", children: "Relat\u00F3rio de Revis\u00E3o" }), rows.length === 0 ? (_jsx("p", { className: "text-sm text-slate-500 py-10 text-center", children: "Nenhum dado encontrado para o per\u00EDodo selecionado." })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2", children: [_jsxs("div", { className: "gauge-card rounded-xl border border-slate-300 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-3 flex flex-col items-center shadow-sm", children: [_jsxs("p", { className: "text-xs font-semibold text-slate-700 mb-0.5 inline-flex items-center gap-1.5", children: [_jsx(Target, { className: "w-3.5 h-3.5" }), " M\u00E9dia de Metros Revisados"] }), _jsx(Gauge, { value: medias.revisados, target: META_REVISADOS, color: "#2563eb", compact: true, formatValue: (v) => fmtMeters(v) })] }), _jsxs("div", { className: "gauge-card rounded-xl border border-slate-300 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-3 flex flex-col items-center shadow-sm", children: [_jsxs("p", { className: "text-xs font-semibold text-slate-700 mb-0.5 inline-flex items-center gap-1.5", children: [_jsx(Target, { className: "w-3.5 h-3.5" }), " M\u00E9dia de Metros de 1\u00B0"] }), _jsx(Gauge, { value: medias.p1, target: META_1, color: "#16a34a", compact: true, formatValue: (v) => fmtMeters(v) })] })] }), _jsx("div", { className: "rounded-xl border border-slate-300 overflow-hidden shadow-sm", children: _jsxs("table", { className: "w-full text-sm border-collapse", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700", children: [_jsx("th", { className: "px-4 py-3 text-left font-semibold whitespace-nowrap", children: _jsxs("span", { className: "inline-flex items-center gap-1.5", children: [_jsx(Calendar, { className: "w-3.5 h-3.5" }), " Data"] }) }), _jsx("th", { className: "px-4 py-3 text-right font-semibold whitespace-nowrap", children: _jsxs("span", { className: "inline-flex items-center gap-1.5", children: [_jsx(Ruler, { className: "w-3.5 h-3.5" }), " Metragem"] }) }), _jsx("th", { className: "px-4 py-3 text-right font-semibold whitespace-nowrap", children: _jsxs("span", { className: "inline-flex items-center gap-1.5", children: [_jsx(Hash, { className: "w-3.5 h-3.5" }), " N\u00B0 de OPS"] }) }), _jsx("th", { className: "px-4 py-3 text-right font-semibold whitespace-nowrap", children: _jsxs("span", { className: "inline-flex items-center gap-1.5", children: [_jsx(TrendingUp, { className: "w-3.5 h-3.5" }), " M\u00E9dia Metros/OP"] }) })] }) }), _jsx("tbody", { children: rows.map((r, i) => (_jsxs("tr", { className: `border-t border-slate-200 text-slate-700 transition-colors hover:bg-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50"}`, children: [_jsx("td", { className: "px-4 py-2.5 font-semibold whitespace-nowrap tabular-nums", children: fmtData(r.data) }), _jsx("td", { className: "px-4 py-2.5 text-right tabular-nums", children: fmtMeters(r.metros) }), _jsx("td", { className: "px-4 py-2.5 text-right tabular-nums", children: Math.round(r.ops).toLocaleString("pt-BR") }), _jsx("td", { className: "px-4 py-2.5 text-right tabular-nums font-bold text-blue-700", children: r.ops > 0 ? fmtMeters(r.metros / r.ops) : "—" })] }, r.data))) }), _jsx("tfoot", { children: _jsxs("tr", { className: "bg-gradient-to-r from-slate-200 to-slate-100 text-slate-900 border-t-2 border-slate-300", children: [_jsx("td", { className: "px-4 py-3 font-extrabold uppercase tracking-wide text-slate-800", children: "Total" }), _jsx("td", { className: "px-4 py-3 text-right tabular-nums font-extrabold", children: fmtMeters(totais.metros) }), _jsx("td", { className: "px-4 py-3 text-right tabular-nums font-extrabold", children: Math.round(totais.ops).toLocaleString("pt-BR") }), _jsx("td", { className: "px-4 py-3 text-right tabular-nums font-extrabold text-blue-700", children: totais.ops > 0 ? fmtMeters(totais.media) : "—" })] }) })] }) })] }))] })] }) }));
}
