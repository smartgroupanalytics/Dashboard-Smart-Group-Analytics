import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import RelatorioMacroPanel from "./RelatorioMacroPanel.js";
const TEAL = "#008785";
const ROW_BG = "#F8F9FA";
function fmtNum(n) {
    return (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtPct(n) {
    return (n || 0).toFixed(1).replace(".", ",") + "%";
}
export default function RelatorioProgramarDialog({ open, onOpenChange }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(null);
    useEffect(() => {
        if (!open)
            return;
        let active = true;
        (async () => {
            setLoading(true);
            try {
                const data = await db.entities.ItemProgramar.list("-created_date", 500);
                if (active)
                    setItems(data);
            }
            finally {
                if (active)
                    setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [open]);
    // Normaliza rótulos de motivo para o relatório
    const normalizeMotivo = (raw) => {
        const m = (raw || "Sem motivo").trim();
        const lower = m.toLowerCase();
        if (lower.includes("retrabalhar") || lower.includes("saldo em estoque"))
            return "PCP";
        if (lower.includes("aguardando aprovacao") || lower.includes("aguardando aprovação"))
            return "Comercial";
        if (lower.startsWith("aguardando "))
            return m.replace(/^aguardando\s+/i, "").trim();
        if (lower.includes("comercial") || lower.includes("pedido"))
            return "Comercial";
        if (lower.includes("transfer") || lower.includes("logística") || lower.includes("logistica"))
            return "Compras e Logística";
        return m;
    };
    // Agrupa por motivo
    const grupos = useMemo(() => {
        const map = {};
        for (const it of items) {
            const m = normalizeMotivo(it.motivo);
            if (!map[m])
                map[m] = { motivo: m, metros: 0, ops: [] };
            map[m].metros += it.metragem || 0;
            map[m].ops.push(it);
        }
        const arr = Object.values(map).sort((a, b) => b.metros - a.metros);
        return arr;
    }, [items]);
    const totalMetros = grupos.reduce((s, g) => s + g.metros, 0);
    const handlePrint = () => {
        document.body.classList.add("printing-relatorio-programar");
        window.print();
        setTimeout(() => document.body.classList.remove("printing-relatorio-programar"), 500);
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-6xl max-h-[95vh] overflow-hidden flex flex-col", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { className: "text-2xl font-extrabold text-slate-900", children: "Relat\u00F3rio a Programar" }) }), _jsxs("div", { className: "flex items-center justify-between px-1 pb-3", children: [_jsxs("p", { className: "text-base text-slate-500", children: ["Total: ", _jsxs("span", { className: "font-bold text-slate-900", children: [fmtNum(totalMetros), " m"] }), " \u00B7 ", grupos.length, " motivo(s)"] }), _jsxs(Button, { variant: "outline", size: "sm", className: "h-9 gap-1.5", onClick: handlePrint, disabled: grupos.length === 0, children: [_jsx(Printer, { className: "w-4 h-4" }), " Imprimir"] })] }), _jsxs("div", { className: "flex gap-4 flex-1 overflow-hidden", children: [_jsx("div", { className: "overflow-auto flex-1 relatorio-programar-root", children: loading ? (_jsx("div", { className: "flex items-center justify-center py-10", children: _jsx("div", { className: "w-7 h-7 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" }) })) : grupos.length === 0 ? (_jsxs("div", { className: "text-center py-10", children: [_jsx("p", { className: "text-slate-400 font-medium", children: "Nenhum item a programar com motivo." }), _jsx("p", { className: "text-slate-500 text-sm mt-1", children: "Importe a planilha com a coluna L preenchida." })] })) : (_jsxs("table", { className: "w-full text-base border-collapse", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-white", style: { background: TEAL }, children: [_jsx("th", { className: "px-4 py-3 text-right font-bold whitespace-nowrap rounded-tl-lg", children: "Metros" }), _jsx("th", { className: "px-4 py-3 text-left font-bold", children: "Motivo" }), _jsx("th", { className: "px-4 py-3 text-right font-bold rounded-tr-lg w-24", children: "%" })] }) }), _jsx("tbody", { children: grupos.map((g, i) => {
                                            const pct = totalMetros > 0 ? (g.metros / totalMetros) * 100 : 0;
                                            const isOpen = expanded === i;
                                            return (_jsxs(React.Fragment, { children: [_jsxs("tr", { className: `cursor-pointer hover:bg-slate-100 ${i % 2 === 0 ? "bg-white" : ""}`, style: i % 2 !== 0 ? { background: ROW_BG } : undefined, onClick: () => setExpanded(isOpen ? null : i), children: [_jsx("td", { className: "px-4 py-3 text-right tabular-nums font-bold text-slate-900 whitespace-nowrap", children: _jsxs("span", { className: "inline-flex items-center gap-2 justify-end w-full", children: [isOpen ? _jsx(ChevronDown, { className: "w-4 h-4 text-slate-400" }) : _jsx(ChevronRight, { className: "w-4 h-4 text-slate-400" }), fmtNum(g.metros)] }) }), _jsx("td", { className: "px-4 py-3 text-slate-800 font-semibold", children: g.motivo }), _jsx("td", { className: "px-4 py-3 text-right tabular-nums font-bold text-[#1e3a8a] whitespace-nowrap", children: fmtPct(pct) })] }), isOpen && (_jsx("tr", { className: "bg-slate-100/70", children: _jsx("td", { colSpan: 3, className: "px-5 py-3", children: _jsx("div", { className: "rounded-lg bg-white border border-slate-200 overflow-hidden max-h-[280px] overflow-y-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-slate-100 text-slate-600", children: [_jsx("th", { className: "px-4 py-2 text-left font-semibold", children: "Descri\u00E7\u00E3o (OP)" }), _jsx("th", { className: "px-4 py-2 text-right font-semibold whitespace-nowrap", children: "Metros" })] }) }), _jsx("tbody", { children: g.ops.map((op, j) => (_jsxs("tr", { className: "border-t border-slate-100", children: [_jsx("td", { className: "px-4 py-2 text-slate-700", children: op.descricao || op.produto || "—" }), _jsxs("td", { className: "px-4 py-2 text-right tabular-nums font-semibold text-slate-900 whitespace-nowrap", children: [fmtNum(op.metragem), " m"] })] }, op.id || j))) })] }) }) }) }))] }, i));
                                        }) })] })) }), !loading && grupos.length > 0 && (_jsx(RelatorioMacroPanel, { grupos: grupos, totalMetros: totalMetros }))] })] }) }));
}
