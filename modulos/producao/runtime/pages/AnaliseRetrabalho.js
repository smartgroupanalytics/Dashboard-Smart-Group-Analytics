import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RefreshCw, UploadCloud, Hash, Ruler, Cog, Printer, FileBarChart, ChartBar } from "lucide-react";
import { fmtMeters } from "@/lib/format";
import DayFilter from "@/components/desempenho/DayFilter";
import LightHeader from "@/components/ui/LightHeader";
import ImportRetrabalhoDialog from "@/components/retrabalho/ImportRetrabalhoDialog";
import RelatorioRetrabalhoProduto from "@/components/retrabalho/RelatorioRetrabalhoProduto";
import GraficoRetrabalhoMaquina from "@/components/retrabalho/GraficoRetrabalhoMaquina";
export default function AnaliseRetrabalho() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [importOpen, setImportOpen] = useState(false);
    const [relatorioOpen, setRelatorioOpen] = useState(false);
    const [graficoOpen, setGraficoOpen] = useState(false);
    const [selectedDays, setSelectedDays] = useState(() => {
        try {
            const saved = localStorage.getItem("retrabalho_selectedDays");
            return saved ? JSON.parse(saved) : [];
        }
        catch {
            return [];
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem("retrabalho_selectedDays", JSON.stringify(selectedDays));
        }
        catch { }
    }, [selectedDays]);
    const load = async () => {
        try {
            setLoading(true);
            const data = await db.entities.RetrabalhoAnalise.list("-data", 5000);
            setRecords(data);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);
    const filtered = useMemo(() => {
        if (selectedDays.length === 0)
            return records;
        return records.filter((r) => r.data && selectedDays.includes(r.data));
    }, [records, selectedDays]);
    const totals = useMemo(() => {
        const totalRetrabalho = filtered.reduce((s, r) => s + (r.metros || 0), 0);
        const totalProduzido = filtered.reduce((s, r) => s + (r.metros_produzidos_dia || 0), 0);
        const ops = new Set(filtered.map((r) => r.op).filter(Boolean));
        const maquinas = new Set(filtered.map((r) => r.maquina).filter(Boolean));
        return {
            metros: totalRetrabalho,
            ops: ops.size,
            maquinas: maquinas.size,
        };
    }, [filtered]);
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-[60vh]", children: _jsx("div", { className: "w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" }) }));
    }
    const KPIS = [
        { label: "Metros Retrabalho", value: fmtMeters(totals.metros), icon: Ruler, color: "text-violet-700" },
        { label: "OPs com Retrabalho", value: totals.ops.toLocaleString("pt-BR"), icon: Hash, color: "text-blue-700" },
        { label: "Máquinas Afetadas", value: totals.maquinas.toLocaleString("pt-BR"), icon: Cog, color: "text-amber-600" },
    ];
    return (_jsxs("div", { className: "min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100", children: [_jsxs("div", { className: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3", children: [_jsx(LightHeader, { icon: RefreshCw, title: "An\u00E1lise de Retrabalho", subtitle: "Acompanhamento de retrabalhos por OP e m\u00E1quina", className: "mb-3", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(DayFilter, { selectedDays: selectedDays, onSelect: setSelectedDays }), selectedDays.length > 0 && (_jsx(Button, { variant: "ghost", size: "sm", className: "h-9 text-slate-700 hover:bg-slate-100", onClick: () => setSelectedDays([]), children: "Limpar data" })), _jsxs(Button, { variant: "outline", size: "sm", className: "h-9 gap-1.5 bg-white text-slate-800 border-slate-300 hover:bg-slate-100", onClick: () => setGraficoOpen(true), children: [_jsx(ChartBar, { className: "w-4 h-4" }), " Gr\u00E1fico por M\u00E1quina"] }), _jsxs(Button, { variant: "outline", size: "sm", className: "h-9 gap-1.5 bg-white text-slate-800 border-slate-300 hover:bg-slate-100", onClick: () => setRelatorioOpen(true), children: [_jsx(FileBarChart, { className: "w-4 h-4" }), " Relat\u00F3rio por Produto"] }), _jsxs(Button, { variant: "default", size: "sm", className: "h-9 gap-1.5 bg-violet-600 text-white hover:bg-violet-700", onClick: () => setImportOpen(true), children: [_jsx(UploadCloud, { className: "w-4 h-4" }), " Importar"] })] }) }), filtered.length === 0 ? (_jsxs("div", { className: "text-center py-20", children: [_jsx(RefreshCw, { className: "w-12 h-12 text-violet-400 mx-auto mb-3" }), _jsx("p", { className: "text-slate-600 font-medium", children: "Nenhum retrabalho encontrado para o per\u00EDodo selecionado." }), _jsx("p", { className: "text-slate-500 text-sm mt-1", children: "Clique em \"Importar\" para carregar a planilha." })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3", children: KPIS.map((k, idx) => (_jsxs(motion.div, { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25, delay: idx * 0.05 }, className: "rounded-xl border border-slate-300 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-3 shadow-sm", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1.5", children: [_jsx("div", { className: "p-1.5 rounded-lg bg-slate-100 text-slate-600 ring-1 ring-slate-200 shrink-0", children: _jsx(k.icon, { className: "w-4 h-4" }) }), _jsx("p", { className: "text-[11px] text-slate-500 uppercase font-medium", children: k.label })] }), _jsx("p", { className: `text-xl font-extrabold tabular-nums ${k.color}`, children: k.value })] }, k.label))) }), _jsx(RetrabalhoTable, { rows: filtered, selectedDays: selectedDays })] }))] }), _jsx(ImportRetrabalhoDialog, { open: importOpen, onOpenChange: setImportOpen, onImported: load }), _jsx(RelatorioRetrabalhoProduto, { open: relatorioOpen, onOpenChange: setRelatorioOpen, rows: filtered, periodoLabel: selectedDays.length > 0 ? selectedDays.map((d) => d.split("-").reverse().join("/")).join(", ") : "Todos" }), _jsx(GraficoRetrabalhoMaquina, { open: graficoOpen, onOpenChange: setGraficoOpen, rows: filtered, periodoLabel: selectedDays.length > 0 ? selectedDays.map((d) => d.split("-").reverse().join("/")).join(", ") : "Todos" })] }));
}
function RetrabalhoTable({ rows, selectedDays }) {
    const handlePrint = () => {
        document.body.classList.add("printing-retrabalho");
        window.print();
        setTimeout(() => document.body.classList.remove("printing-retrabalho"), 500);
    };
    const diasTexto = selectedDays && selectedDays.length > 0
        ? selectedDays.map((d) => d.split("-").reverse().join("/")).join(", ")
        : "Todos";
    const sorted = [...rows].sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 }, className: "retrabalho-root rounded-2xl border border-slate-300 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-3 shadow-sm", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(Ruler, { className: "w-4 h-4 text-violet-500" }), _jsx("h3", { className: "text-sm font-bold text-slate-900", children: "Detalhamento de Retrabalhos" }), _jsxs("span", { className: "ml-auto text-xs text-slate-500", children: [sorted.length, " registro(s)"] }), _jsxs(Button, { variant: "ghost", size: "sm", className: "h-8 gap-1.5 text-slate-700 hover:bg-slate-100 print-hide", onClick: handlePrint, children: [_jsx(Printer, { className: "w-4 h-4" }), " Imprimir"] })] }), _jsx("div", { className: "overflow-x-auto rounded-xl border border-slate-200", children: _jsxs("table", { className: "w-full text-xs border-collapse", children: [_jsx("thead", { className: "bg-slate-100", children: _jsxs("tr", { className: "text-left text-slate-700", children: [_jsx("th", { className: "px-3 py-1.5 font-medium whitespace-nowrap w-[12%]", children: "Data" }), _jsx("th", { className: "px-3 py-1.5 font-medium whitespace-nowrap w-[10%]", children: "OP" }), _jsx("th", { className: "px-3 py-1.5 font-medium whitespace-nowrap w-[12%]", children: "M\u00E1quina" }), _jsx("th", { className: "px-3 py-1.5 font-medium whitespace-nowrap w-[34%]", children: "Produto" }), _jsx("th", { className: "px-3 py-1.5 font-medium whitespace-nowrap w-[32%]", children: "Descri\u00E7\u00E3o do Retrabalho" }), _jsx("th", { className: "px-3 py-1.5 font-medium text-right whitespace-nowrap w-[14%]", children: "Metros Retrab." })] }) }), _jsx("tbody", { children: sorted.map((r, i) => {
                                return (_jsxs("tr", { className: `border-t border-slate-200 text-slate-700 hover:bg-slate-50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50"}`, children: [_jsx("td", { className: "px-3 py-2 whitespace-nowrap tabular-nums text-[11px]", children: r.data ? r.data.split("-").reverse().join("/") : "—" }), _jsx("td", { className: "px-3 py-2 whitespace-nowrap text-center font-semibold text-slate-900", children: r.op || "—" }), _jsx("td", { className: "px-3 py-2 whitespace-nowrap text-[11px]", children: r.maquina || "—" }), _jsx("td", { className: "px-3 py-2 max-w-[320px] truncate", title: r.produto, children: r.produto || "—" }), _jsx("td", { className: "px-3 py-2 max-w-[320px] truncate", title: r.descricao_retrabalho, children: r.descricao_retrabalho || "—" }), _jsx("td", { className: "px-3 py-2 text-right tabular-nums font-bold text-violet-700", children: r.metros ? fmtMeters(r.metros) : "—" })] }, r.id || i));
                            }) })] }) })] }));
}
