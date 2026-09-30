import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, Search, X, Package, AlertTriangle, Hash, Ruler } from "lucide-react";
import { fmtMeters } from "@/lib/format";
export default function RelatorioProdutoDefeitoDialog({ open, onOpenChange, records, selectedDays }) {
    const [filtroProduto, setFiltroProduto] = useState("");
    const diasTexto = selectedDays && selectedDays.length > 0
        ? selectedDays.map((d) => d.split("-").reverse().join("/")).join(", ")
        : "Todos";
    const rows = useMemo(() => {
        const map = {};
        const filtro = filtroProduto.trim().toLowerCase();
        records.forEach((r) => {
            if (!r.defeito || !String(r.defeito).trim())
                return;
            if (filtro && !String(r.produto || "").toLowerCase().includes(filtro))
                return;
            const key = `${r.produto || "—"}|${r.defeito}`;
            if (!map[key]) {
                map[key] = {
                    produto: r.produto || "—",
                    descricao: r.descricao || "—",
                    defeito: r.defeito || "—",
                    ocorrencias: 0,
                    metros_defeito: 0,
                };
            }
            map[key].ocorrencias += 1;
            map[key].metros_defeito += r.metros_defeito || 0;
        });
        return Object.values(map)
            .map((e) => ({ ...e, metros_defeito: Math.round(e.metros_defeito * 100) / 100 }))
            .sort((a, b) => b.ocorrencias - a.ocorrencias || b.metros_defeito - a.metros_defeito);
    }, [records, filtroProduto]);
    const totalOcorrencias = rows.reduce((s, r) => s + r.ocorrencias, 0);
    const totalMetros = rows.reduce((s, r) => s + r.metros_defeito, 0);
    const totalProdutos = new Set(rows.map((r) => r.produto)).size;
    const totalDefeitos = new Set(rows.map((r) => r.defeito)).size;
    const handlePrint = () => {
        document.body.classList.add("printing-relatorio-produto");
        window.print();
        setTimeout(() => document.body.classList.remove("printing-relatorio-produto"), 500);
    };
    const maxOcorrencias = Math.max(1, ...rows.map((r) => r.ocorrencias));
    const KPIS = [
        { label: "Produtos", value: totalProdutos, icon: Package, tone: "teal" },
        { label: "Tipos de Defeito", value: totalDefeitos, icon: AlertTriangle, tone: "rose" },
        { label: "Ocorrências", value: totalOcorrencias, icon: Hash, tone: "blue" },
        { label: "Metros de Defeito", value: fmtMeters(totalMetros), icon: Ruler, tone: "amber" },
    ];
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 border-0", children: [_jsxs(DialogHeader, { className: "px-6 py-5 bg-gradient-to-r from-[#0a2540] via-[#0e3a5e] to-[#00798C] text-white relative overflow-hidden", children: [_jsx("div", { className: "absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_85%_20%,#fff,transparent_45%)]" }), _jsxs(DialogTitle, { className: "flex items-center justify-between relative z-10", children: [_jsxs("span", { className: "flex items-center gap-3 text-lg font-extrabold tracking-tight", children: [_jsx("span", { className: "w-10 h-10 rounded-xl bg-white/15 grid place-items-center backdrop-blur-sm", children: _jsx(AlertTriangle, { className: "w-5 h-5" }) }), "Relat\u00F3rio de Ocorr\u00EAncias por Produto"] }), _jsx("button", { onClick: () => onOpenChange(false), className: "w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 grid place-items-center transition-colors print-hide", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsx("p", { className: "text-cyan-100 text-xs mt-2 relative z-10 flex items-center gap-2", children: _jsxs("span", { className: "px-2 py-0.5 rounded-md bg-white/10 font-semibold", children: ["Per\u00EDodo: ", diasTexto] }) })] }), _jsx("div", { className: "overflow-y-auto flex-1 bg-slate-50/50", children: _jsxs("div", { className: "relatorio-produto-root p-6 space-y-5", children: [_jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3 print-hide", children: KPIS.map((k, i) => (_jsxs(motion.div, { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, delay: i * 0.06 }, className: "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("span", { className: `w-7 h-7 rounded-lg grid place-items-center ${k.tone === "teal" ? "bg-[#00798C]/10 text-[#00798C]" :
                                                        k.tone === "rose" ? "bg-rose-50 text-rose-500" :
                                                            k.tone === "blue" ? "bg-blue-50 text-blue-500" :
                                                                "bg-amber-50 text-amber-500"}`, children: _jsx(k.icon, { className: "w-3.5 h-3.5" }) }), _jsx("span", { className: "text-[10px] uppercase tracking-wide text-slate-400 font-bold", children: k.label })] }), _jsx("div", { className: "text-xl font-extrabold text-slate-900 tabular-nums", children: k.value })] }, k.label))) }), _jsxs("div", { className: "flex items-center justify-between gap-3 flex-wrap print-hide", children: [_jsxs("div", { className: "relative flex-1 max-w-md", children: [_jsx(Search, { className: "w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" }), _jsx("input", { placeholder: "Filtrar por c\u00F3digo do produto...", value: filtroProduto, onChange: (e) => setFiltroProduto(e.target.value), className: "w-full h-10 pl-9 pr-9 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#00798C] focus:ring-2 focus:ring-[#00798C]/15 transition-all" }), filtroProduto && (_jsx("button", { onClick: () => setFiltroProduto(""), className: "absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md hover:bg-slate-100 grid place-items-center text-slate-400", children: _jsx(X, { className: "w-3.5 h-3.5" }) }))] }), _jsxs("button", { onClick: handlePrint, className: "inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#00798C] hover:bg-[#006674] text-white text-sm font-bold shadow-sm transition-colors", children: [_jsx(Printer, { className: "w-4 h-4" }), " Imprimir"] })] }), _jsx("p", { className: "print-only hidden text-center font-extrabold text-gray-900 text-lg mb-1", children: "Relat\u00F3rio de Ocorr\u00EAncias por Produto" }), _jsx("p", { className: "print-only hidden text-center text-sm text-gray-700 mb-3", children: diasTexto }), _jsx("div", { className: "rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200", children: [_jsx("th", { className: "px-4 py-3 text-left font-bold text-slate-600 text-xs uppercase tracking-wide whitespace-nowrap", children: "Produto" }), _jsx("th", { className: "px-4 py-3 text-left font-bold text-slate-600 text-xs uppercase tracking-wide", children: "Descri\u00E7\u00E3o" }), _jsx("th", { className: "px-4 py-3 text-left font-bold text-slate-600 text-xs uppercase tracking-wide", children: "Defeito" }), _jsx("th", { className: "px-4 py-3 text-right font-bold text-slate-600 text-xs uppercase tracking-wide whitespace-nowrap", children: "Ocorr\u00EAncias" }), _jsx("th", { className: "px-4 py-3 text-right font-bold text-slate-600 text-xs uppercase tracking-wide whitespace-nowrap", children: "Metros Defeito" })] }) }), _jsx("tbody", { children: rows.length === 0 ? (_jsx("tr", { children: _jsxs("td", { colSpan: 5, className: "px-4 py-12 text-center text-slate-400", children: [_jsx(AlertTriangle, { className: "w-8 h-8 mx-auto mb-2 text-slate-300" }), _jsx("p", { className: "text-sm font-medium", children: "Nenhum dado para o per\u00EDodo selecionado." })] }) })) : (rows.map((r, i) => {
                                                    const pctBar = (r.ocorrencias / maxOcorrencias) * 100;
                                                    return (_jsxs(motion.tr, { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2, delay: Math.min(i * 0.02, 0.4) }, className: "border-b border-slate-100 last:border-0 hover:bg-[#00798C]/[0.03] transition-colors group", children: [_jsx("td", { className: "px-4 py-3 whitespace-nowrap font-bold text-[#00798C] font-mono text-xs", children: r.produto }), _jsx("td", { className: "px-4 py-3 text-slate-700 text-xs max-w-[260px] truncate", title: r.descricao, children: r.descricao }), _jsx("td", { className: "px-4 py-3 text-slate-700 text-xs max-w-[200px] truncate", title: r.defeito, children: r.defeito }), _jsx("td", { className: "px-4 py-3 text-right align-middle", children: _jsxs("div", { className: "flex items-center justify-end gap-2", children: [_jsx("div", { className: "hidden md:block w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden", children: _jsx(motion.div, { initial: { width: 0 }, animate: { width: `${pctBar}%` }, transition: { duration: 0.5, delay: Math.min(i * 0.02, 0.4) }, className: "h-full rounded-full bg-gradient-to-r from-[#00798C] to-[#36aaa8]" }) }), _jsx("span", { className: "tabular-nums font-bold text-slate-900 text-sm", children: r.ocorrencias })] }) }), _jsx("td", { className: "px-4 py-3 text-right tabular-nums font-bold text-rose-600 whitespace-nowrap", children: fmtMeters(r.metros_defeito) })] }, i));
                                                })) }), rows.length > 0 && (_jsx("tfoot", { children: _jsxs("tr", { className: "bg-gradient-to-r from-slate-100 to-slate-50 border-t-2 border-slate-200", children: [_jsx("td", { colSpan: 3, className: "px-4 py-3 font-bold text-right text-slate-700 text-xs uppercase tracking-wide", children: "Total" }), _jsx("td", { className: "px-4 py-3 text-right tabular-nums font-extrabold text-slate-900", children: totalOcorrencias }), _jsx("td", { className: "px-4 py-3 text-right tabular-nums font-extrabold text-rose-600", children: fmtMeters(totalMetros) })] }) }))] }) }) })] }) })] }) }));
}
