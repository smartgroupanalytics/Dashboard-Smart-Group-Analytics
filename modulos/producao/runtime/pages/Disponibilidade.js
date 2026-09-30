import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { UploadCloud, Activity, BarChart3 } from "lucide-react";
import DisponibilidadeCard from "@/components/disponibilidade/DisponibilidadeCard";
import ImportDisponibilidadeDialog from "@/components/disponibilidade/ImportDisponibilidadeDialog";
import DisponibilidadeGraficoDialog from "@/components/disponibilidade/DisponibilidadeGraficoDialog";
import LightHeader from "@/components/ui/LightHeader";
import MonthFilter from "@/components/faturamento/MonthFilter";
import { MESES, mesLabel } from "@/lib/format";
const CARDS = [
    { key: "produzindo", label: "PRODUZINDO", color: "green", icon: Activity },
    { key: "setup", label: "SETUP", color: "orange", icon: Activity },
    { key: "parada_maq", label: "PARADA DE MÁQ.", color: "amber", icon: Activity },
    { key: "amostras", label: "AMOSTRAS", color: "blue", icon: Activity },
    { key: "retrabalho", label: "RETRABALHO", color: "purple", icon: Activity },
    { key: "ociosa", label: "OCIOSA", color: "red", icon: Activity },
];
export default function Disponibilidade() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMeses, setSelectedMeses] = useState([new Date().getMonth() + 1]);
    const [ano] = useState(2026);
    const [importOpen, setImportOpen] = useState(false);
    const [graficoOpen, setGraficoOpen] = useState(false);
    const load = async () => {
        try {
            setLoading(true);
            const data = await db.entities.Disponibilidade.list("-created_date", 500);
            setRecords(data);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);
    const monthRecords = useMemo(() => selectedMeses
        .sort((a, b) => a - b)
        .map((m) => ({ mes: m, record: records.find((r) => r.mes === m && r.ano === ano) }))
        .filter((x) => x.record), [records, selectedMeses, ano]);
    const media = useMemo(() => {
        if (!monthRecords.length)
            return null;
        const avg = {};
        CARDS.forEach((c) => {
            const vals = monthRecords.map((x) => x.record[c.key]).filter((v) => v != null);
            avg[c.key] = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
        });
        return avg;
    }, [monthRecords]);
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-[60vh]", children: _jsx("div", { className: "w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" }) }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100", children: [_jsxs("div", { className: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3", children: [_jsx(LightHeader, { title: "DISPONIBILIDADE", className: "mb-3", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(MonthFilter, { selectedMeses: selectedMeses, onSelect: setSelectedMeses }), _jsxs(Button, { variant: "default", size: "sm", className: "h-9 gap-1.5 bg-slate-900 text-white hover:bg-slate-800", onClick: () => setImportOpen(true), children: [_jsx(UploadCloud, { className: "w-4 h-4" }), " Importar"] }), _jsxs(Button, { variant: "default", size: "sm", className: "h-9 gap-1.5 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50", onClick: () => setGraficoOpen(true), children: [_jsx(BarChart3, { className: "w-4 h-4" }), " Gr\u00E1fico"] })] }) }), monthRecords.length === 0 ? (_jsxs("div", { className: "text-center py-20", children: [_jsx(Activity, { className: "w-12 h-12 text-slate-400 mx-auto mb-3" }), _jsx("p", { className: "text-slate-600 font-medium", children: "Nenhum dado de disponibilidade para o(s) m\u00EAs(es) selecionado(s)." }), _jsx("p", { className: "text-slate-500 text-sm mt-1", children: "Clique em \"Importar\" para carregar a planilha." })] })) : (_jsxs("div", { className: "space-y-3", children: [selectedMeses.length > 1 && media && (_jsxs("div", { children: [_jsx("h2", { className: "text-base font-bold text-slate-800 mb-2 border-b border-slate-200 pb-1", children: "M\u00E9dia dos meses selecionados" }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-5xl mx-auto", children: CARDS.map((c, idx) => (_jsx(DisponibilidadeCard, { label: c.label, value: media[c.key], icon: c.icon, color: c.color, delay: idx * 0.05 }, c.key))) })] })), monthRecords.map(({ mes, record }) => (_jsxs("div", { children: [selectedMeses.length > 1 && (_jsx("h2", { className: "text-base font-bold text-slate-800 mb-2 border-b border-slate-200 pb-1", children: mesLabel(mes) })), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-5xl mx-auto", children: CARDS.map((c, idx) => (_jsx(DisponibilidadeCard, { label: c.label, value: record[c.key] ?? 0, icon: c.icon, color: c.color, delay: idx * 0.05 }, c.key))) })] }, mes)))] }))] }), _jsx(ImportDisponibilidadeDialog, { open: importOpen, onOpenChange: setImportOpen, onImported: load }), _jsx(DisponibilidadeGraficoDialog, { open: graficoOpen, onOpenChange: setGraficoOpen, records: records, ano: ano })] }));
}
