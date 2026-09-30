import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, Printer, UploadCloud, ClipboardList, TrendingUp } from "lucide-react";
import CarteiraCard from "@/components/carteira/CarteiraCard";
import FaltaProgramarSection from "@/components/carteira/FaltaProgramarSection";
import ImportCarteiraDialog from "@/components/carteira/ImportCarteiraDialog";
import RelatorioProgramarDialog from "@/components/carteira/RelatorioProgramarDialog";
import ImportCargaGeralDialog from "@/components/carga/ImportCargaGeralDialog";
import ImportCargaMaquinaDialog from "@/components/carga/ImportCargaMaquinaDialog";
function fmtNum(n) {
    return (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
export default function CargaMaquina() {
    const [carteiraRecords, setCarteiraRecords] = useState([]);
    const [faltaRecords, setFaltaRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [importOpen, setImportOpen] = useState(false);
    const [relatorioOpen, setRelatorioOpen] = useState(false);
    const [periodoOpen, setPeriodoOpen] = useState(false);
    const [importGeralOpen, setImportGeralOpen] = useState(false);
    const [cargaGeralData, setCargaGeralData] = useState(null);
    const [cargaMaquinaRecords, setCargaMaquinaRecords] = useState([]);
    const [importCargaOpen, setImportCargaOpen] = useState(false);
    const buildCargaGeralData = (kpiRecords) => {
        const geral = kpiRecords
            .filter((r) => r.tipo === "parametro")
            .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
            .map((r) => ({ parametro: r.parametro, valor: r.valor }));
        const machineRecords = kpiRecords.filter((r) => r.tipo === "geral");
        const colunas = [...new Set(machineRecords.map((r) => r.parametro.split("|")[0]))];
        const linhasMap = {};
        machineRecords.forEach((r) => {
            const [maq, param] = r.parametro.split("|");
            if (!linhasMap[param])
                linhasMap[param] = { parametro: param, valores: {} };
            linhasMap[param].valores[maq] = r.valor;
        });
        const linhas = Object.values(linhasMap).map((l) => ({
            parametro: l.parametro,
            valores: colunas.map((c) => l.valores[c] || 0),
        }));
        if (geral.length === 0 && colunas.length === 0)
            return null;
        return { geral, parametros: geral, maquinas: { colunas, linhas } };
    };
    const load = async () => {
        try {
            setLoading(true);
            const [cart, falta, carga, kpi] = await Promise.all([
                db.entities.CarteiraPedido.list("ordem", 50),
                db.entities.FaltaProgramarItem.list("ordem", 200),
                db.entities.CargaMaquina.list(),
                db.entities.CargaGeralKpi.list("ordem", 100),
            ]);
            setCarteiraRecords(cart);
            setFaltaRecords(falta);
            setCargaMaquinaRecords(carga);
            setCargaGeralData(buildCargaGeralData(kpi));
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);
    const handlePrint = () => {
        document.body.classList.add("printing-carta");
        window.print();
        setTimeout(() => document.body.classList.remove("printing-carta"), 500);
    };
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-screen bg-white", children: _jsx("div", { className: "w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" }) }));
    }
    const semanaAtual = carteiraRecords[0];
    const faltaAtual = faltaRecords
        .filter((r) => r.semana_label === semanaAtual?.semana_label)
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    const nota = semanaAtual?.nota || "";
    return (_jsxs("div", { className: "min-h-screen bg-[#F8F9FC]", children: [_jsxs("div", { className: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2", children: [_jsx("h1", { className: "text-xl font-extrabold tracking-tight text-slate-900", children: "CARTEIRA DE PEDIDO" }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "relative", children: [_jsxs("button", { onClick: () => setPeriodoOpen((s) => !s), className: "flex items-center gap-2 h-9 px-4 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors", children: ["Per\u00EDodo", _jsx(ChevronDown, { className: "w-4 h-4" })] }), periodoOpen && (_jsxs("div", { className: "absolute right-0 mt-2 w-56 rounded-lg bg-white border border-slate-300 shadow-xl z-20 overflow-hidden", children: [_jsx("div", { className: "px-4 py-2.5 text-xs text-slate-500 uppercase font-semibold border-b border-slate-200", children: "Semanas dispon\u00EDveis" }), carteiraRecords.map((r) => (_jsx("div", { className: "px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer", children: r.semana_label }, r.id)))] }))] }), _jsxs(Button, { variant: "outline", size: "sm", className: "h-9 gap-1.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-100", onClick: handlePrint, children: [_jsx(Printer, { className: "w-4 h-4" }), " Imprimir"] }), _jsxs(Button, { variant: "outline", size: "sm", className: "h-9 gap-1.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-100", onClick: () => setRelatorioOpen(true), children: [_jsx(ClipboardList, { className: "w-4 h-4" }), " Relat\u00F3rio a Programar"] }), _jsxs(Button, { variant: "default", size: "sm", className: "h-9 gap-1.5 bg-[#008B8B] hover:bg-[#006d6d] text-white", onClick: () => setImportOpen(true), children: [_jsx(UploadCloud, { className: "w-4 h-4" }), " Importar"] }), _jsxs(Button, { variant: "outline", size: "sm", className: "h-9 gap-1.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-100", onClick: () => setImportGeralOpen(true), children: [_jsx(TrendingUp, { className: "w-4 h-4" }), " An\u00E1lise Geral"] }), _jsxs(Button, { variant: "default", size: "sm", className: "h-9 gap-1.5 bg-[#008B8B] hover:bg-[#006d6d] text-white", onClick: () => setImportCargaOpen(true), children: [_jsx(UploadCloud, { className: "w-4 h-4" }), " Importar Carga"] })] })] }), carteiraRecords.length === 0 ? (_jsxs("div", { className: "text-center py-20", children: [_jsx("p", { className: "text-slate-400 font-medium", children: "Nenhuma carteira de pedido importada ainda." }), _jsx("p", { className: "text-slate-500 text-sm mt-1", children: "Clique em \"Importar\" para carregar os dados." })] })) : (_jsxs("div", { className: "carta-print-root grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch", children: [_jsx(CarteiraCard, { data: semanaAtual, index: 0 }), _jsx(FaltaProgramarSection, { semanaLabel: semanaAtual?.semana_label || "", total: semanaAtual?.falta_programar_total || 0, items: faltaAtual, index: 0 })] }))] }), _jsx(ImportCarteiraDialog, { open: importOpen, onOpenChange: setImportOpen, onImported: load }), _jsx(RelatorioProgramarDialog, { open: relatorioOpen, onOpenChange: setRelatorioOpen }), _jsx(ImportCargaGeralDialog, { open: importGeralOpen, onOpenChange: setImportGeralOpen, onLoaded: setCargaGeralData }), _jsx(ImportCargaMaquinaDialog, { open: importCargaOpen, onOpenChange: setImportCargaOpen, onImported: load })] }));
}
