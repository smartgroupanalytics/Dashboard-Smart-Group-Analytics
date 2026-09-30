import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect, useMemo } from "react";
import RelatorioMacroPanel from "./RelatorioMacroPanel.js";
const TEAL = "#008B8B";
function fmtNum(n) {
    return (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtPct(n) {
    return (n || 0).toFixed(1).replace(".", ",") + "%";
}
// Versão standalone (sem Dialog) do Relatório a Programar para captura offscreen no PDF.
export default function RelatorioProgramarPrint() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let active = true;
        (async () => {
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
    }, []);
    const grupos = useMemo(() => {
        const map = {};
        for (const it of items) {
            const m = (it.motivo || "Sem motivo").trim();
            if (!map[m])
                map[m] = { motivo: m, metros: 0, ops: [] };
            map[m].metros += it.metragem || 0;
            map[m].ops.push(it);
        }
        return Object.values(map).sort((a, b) => b.metros - a.metros);
    }, [items]);
    const totalMetros = grupos.reduce((s, g) => s + g.metros, 0);
    return (_jsx("div", { className: "min-h-screen bg-white", children: _jsxs("div", { className: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4", children: [_jsx("h1", { className: "text-2xl font-extrabold text-slate-900 mb-1", children: "Relat\u00F3rio a Programar" }), loading ? (_jsx("div", { className: "flex items-center justify-center py-10", children: _jsx("div", { className: "w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" }) })) : (_jsxs("div", { className: "relatorio-programar-root", children: [_jsx("div", { className: "flex items-center justify-between px-1 pb-3", children: _jsxs("p", { className: "text-base text-slate-500", children: ["Total: ", _jsxs("span", { className: "font-bold text-slate-900", children: [fmtNum(totalMetros), " m"] }), " \u00B7 ", grupos.length, " motivo(s)"] }) }), _jsxs("div", { className: "flex gap-4", children: [_jsx("div", { className: "flex-1 overflow-auto", children: _jsxs("table", { className: "w-full text-base border-collapse", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-white", style: { background: TEAL }, children: [_jsx("th", { className: "px-4 py-3 text-right font-bold whitespace-nowrap rounded-tl-lg", children: "Metros" }), _jsx("th", { className: "px-4 py-3 text-left font-bold", children: "Motivo" }), _jsx("th", { className: "px-4 py-3 text-right font-bold rounded-tr-lg w-24", children: "%" })] }) }), _jsx("tbody", { children: grupos.map((g, i) => {
                                                    const pct = totalMetros > 0 ? (g.metros / totalMetros) * 100 : 0;
                                                    return (_jsxs("tr", { className: i % 2 === 0 ? "bg-white" : "bg-slate-50", children: [_jsx("td", { className: "px-4 py-3 text-right tabular-nums font-bold text-slate-900 whitespace-nowrap", children: fmtNum(g.metros) }), _jsx("td", { className: "px-4 py-3 text-slate-800 font-semibold", children: g.motivo }), _jsx("td", { className: "px-4 py-3 text-right tabular-nums font-bold text-[#1e3a8a] whitespace-nowrap", children: fmtPct(pct) })] }, i));
                                                }) })] }) }), grupos.length > 0 && (_jsx(RelatorioMacroPanel, { grupos: grupos, totalMetros: totalMetros }))] })] }))] }) }));
}
