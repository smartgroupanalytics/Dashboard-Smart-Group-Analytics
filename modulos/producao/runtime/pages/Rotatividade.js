import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Factory, Search, RefreshCw, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import RotatividadeChart from "@/components/rotatividade/RotatividadeChart";
import ImportRotatividadeDialog from "@/components/rotatividade/ImportRotatividadeDialog";
import MonthFilter from "@/components/faturamento/MonthFilter";
import { fmtMeters } from "@/lib/format";
import LightHeader from "@/components/ui/LightHeader";
const MESES_CURTOS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const YEARS = [2025, 2026];
function KpiColumn({ title, value, unit, icon: Icon, color }) {
    return (_jsxs("div", { className: "px-4 py-2.5 flex items-center gap-3 sm:flex-1", children: [_jsx("div", { className: "w-9 h-9 rounded-full flex items-center justify-center shrink-0", style: { background: `${color}1a` }, children: Icon && _jsx(Icon, { className: "w-4 h-4", style: { color } }) }), _jsxs("div", { className: "flex flex-col", children: [_jsx("p", { className: "text-[11px] font-bold uppercase tracking-wide leading-none", style: { color }, children: title }), _jsx("p", { className: "text-xl font-extrabold text-slate-900 tabular-nums leading-tight mt-0.5", children: value }), unit && _jsx("p", { className: "text-[10px] text-slate-500 leading-none mt-0.5", children: unit })] })] }));
}
export default function Rotatividade() {
    const [records, setRecords] = useState([]);
    const [selectedMeses, setSelectedMesesState] = useState(() => {
        try {
            const saved = localStorage.getItem("rotatividade_selectedMeses");
            return saved ? JSON.parse(saved) : [];
        }
        catch {
            return [];
        }
    });
    const [importOpen, setImportOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const setSelectedMeses = (meses) => {
        setSelectedMesesState(meses);
        try {
            localStorage.setItem("rotatividade_selectedMeses", JSON.stringify(meses));
        }
        catch { }
    };
    const load = async () => {
        try {
            setLoading(true);
            const data = await db.entities.RotatividadeMensal.list("mes", 100);
            setRecords(data || []);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        load();
    }, []);
    const temFiltro = selectedMeses.length > 0;
    const filteredRecords = useMemo(() => (temFiltro ? records.filter((r) => selectedMeses.includes(r.mes)) : records), [records, selectedMeses, temFiltro]);
    const yearData = useMemo(() => {
        const result = {};
        YEARS.forEach((year) => {
            const prodKey = year === 2025 ? "produzido_2025" : "produzido_2026";
            const revKey = year === 2025 ? "revisado_2025" : "revisado_2026";
            const produzidos = filteredRecords.reduce((s, r) => s + (r[prodKey] || 0), 0);
            const revisados = filteredRecords.reduce((s, r) => s + (r[revKey] || 0), 0);
            const rotatividade = produzidos ? (revisados / produzidos) * 100 : 0;
            result[year] = { produzidos, revisados, rotatividade };
        });
        return result;
    }, [filteredRecords]);
    const chartData = useMemo(() => {
        return MESES_CURTOS.map((label, i) => {
            const mes = i + 1;
            const rec = records.find((r) => r.mes === mes);
            return {
                mes: label,
                rot2025: rec ? (rec.rotatividade_2025 || 0) * 100 : 0,
                rot2026: rec ? (rec.rotatividade_2026 || 0) * 100 : 0,
            };
        });
    }, [records]);
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-[60vh]", children: _jsx("div", { className: "w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" }) }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-slate-50", children: [_jsxs("div", { className: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3", children: [_jsx(LightHeader, { icon: RefreshCw, title: "Rotatividade: Metros Produzidos x Revisados", subtitle: "Comparativo anual e evolu\u00E7\u00E3o mensal", className: "mb-3", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Button, { variant: "outline", size: "sm", className: "h-9 gap-2 bg-white text-slate-800 hover:bg-slate-100", onClick: () => setImportOpen(true), children: [_jsx(FileSpreadsheet, { className: "w-4 h-4" }), " Importar"] }), _jsx(MonthFilter, { selectedMeses: selectedMeses, onSelect: setSelectedMeses }), temFiltro && (_jsx(Button, { variant: "ghost", size: "sm", className: "h-9 text-slate-700 hover:bg-slate-100", onClick: () => setSelectedMeses([]), children: "Limpar" }))] }) }), _jsx("div", { className: "space-y-2 mb-3", children: YEARS.map((year) => {
                            const yd = yearData[year] || { produzidos: 0, revisados: 0, rotatividade: 0 };
                            const rotOk = yd.rotatividade >= 40;
                            return (_jsx(motion.div, { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 }, className: "rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden", children: _jsxs("div", { className: "flex flex-col md:flex-row md:items-stretch", children: [_jsx("div", { className: "flex items-center justify-center md:justify-start px-4 py-2 md:py-0 md:w-28 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/60", children: _jsx("span", { className: "text-xl font-extrabold tracking-wide text-slate-900 tabular-nums", children: year }) }), _jsxs("div", { className: "flex flex-col sm:flex-row flex-1 divide-y sm:divide-y-0 sm:divide-x divide-slate-200", children: [_jsx(KpiColumn, { title: "Metros Produzidos", value: fmtMeters(yd.produzidos), unit: "metros", icon: Factory, color: "#2563eb" }), _jsx(KpiColumn, { title: "Metros Revisados", value: fmtMeters(yd.revisados), unit: "metros", icon: Search, color: "#0d9488" }), _jsx(KpiColumn, { title: "Rotatividade", value: `${yd.rotatividade.toFixed(2).replace(".", ",")}%`, icon: RefreshCw, color: rotOk ? "#059669" : "#dc2626" })] })] }) }, year));
                        }) }), _jsx(RotatividadeChart, { data: chartData })] }), _jsx(ImportRotatividadeDialog, { open: importOpen, onOpenChange: setImportOpen, onImported: load })] }));
}
