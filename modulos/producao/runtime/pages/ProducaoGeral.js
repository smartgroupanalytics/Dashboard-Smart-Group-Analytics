import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Factory, TrendingUp, Layers, Gauge, Calendar, Loader2 } from "lucide-react";
import ImportProducaoGeralDialog from "@/components/producao-geral/ImportProducaoGeralDialog";
import CircularInfografico from "@/components/producao-geral/CircularInfografico";
import MonthFilter from "@/components/faturamento/MonthFilter";
import { TrendingUp as TrendingUpIcon, Layers as LayersIcon, Gauge as GaugeIcon } from "lucide-react";
const MEDIA_ROWS = [
    { bg: "#3b82f6", dark: "#1d4ed8", label: "MÉDIA DIA SMART", icon: TrendingUpIcon },
    { bg: "#f97316", dark: "#c2410c", label: "MÉDIA DIA BENEFICIAMENTO", icon: LayersIcon },
];
const DISTRIBUICAO_ROWS = [
    { bg: "#e53935", dark: "#c62828", label: "PRODUÇÃO SMART", icon: Factory },
    { bg: "#00acc1", dark: "#0097a7", label: "BENEFICIAMENTO", icon: Layers },
];
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, } from "recharts";
const MESES_LABELS = ["", "JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const fmtMeters = (v) => (v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const fmtNum = (v, d = 0) => (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const tooltipStyle = {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 8,
    fontSize: 12,
    color: "#e2e8f0",
};
function KpiCard({ icon: Icon, label, value, sub, accent }) {
    const accents = {
        blue: "from-blue-500 to-cyan-500",
        green: "from-emerald-500 to-teal-500",
        amber: "from-amber-500 to-orange-500",
        violet: "from-violet-500 to-purple-500",
    };
    return (_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("div", { className: `p-2 rounded-lg bg-gradient-to-br ${accents[accent]} text-white`, children: _jsx(Icon, { className: "w-4 h-4" }) }), _jsx("span", { className: "text-xs font-semibold text-slate-500 uppercase tracking-wider", children: label })] }), _jsx("p", { className: "text-2xl font-extrabold text-slate-900 tabular-nums", children: value }), sub && _jsx("p", { className: "text-xs text-slate-400 mt-1", children: sub })] }));
}
export default function ProducaoGeral() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [importOpen, setImportOpen] = useState(false);
    const [selectedMeses, setSelectedMeses] = useState(() => {
        try {
            const saved = localStorage.getItem("producao-geral-meses");
            return saved ? JSON.parse(saved) : [];
        }
        catch {
            return [];
        }
    });
    useEffect(() => {
        localStorage.setItem("producao-geral-meses", JSON.stringify(selectedMeses));
    }, [selectedMeses]);
    const load = async () => {
        try {
            setLoading(true);
            const data = await db.entities.ProducaoGeral.list("mes");
            setRecords(data);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);
    const sorted = useMemo(() => {
        const filtered = selectedMeses.length
            ? records.filter((r) => selectedMeses.includes(r.mes))
            : records;
        return [...filtered].sort((a, b) => a.mes - b.mes);
    }, [records, selectedMeses]);
    const totais = useMemo(() => {
        const sum = (fn) => sorted.reduce((s, r) => s + (fn(r) || 0), 0);
        const avg = (fn) => {
            const vals = sorted.map(fn).filter((v) => v != null && !isNaN(v));
            if (!vals.length)
                return 0;
            return vals.reduce((s, v) => s + v, 0) / vals.length;
        };
        return {
            qtd_prevista: sum((r) => r.qtd_prevista),
            producao_smart: sum((r) => r.producao_smart),
            beneficiamento: sum((r) => r.beneficiamento),
            total: sum((r) => r.total),
            dias_uteis: sum((r) => r.dias_uteis),
            media_dia_smart: avg((r) => r.media_dia_smart),
            media_dia_stk: avg((r) => r.media_dia_stk),
            media_realizada_smart: avg((r) => r.media_realizada_smart),
            media_diaria_real_stk: avg((r) => r.media_diaria_real_stk),
        };
    }, [sorted]);
    const mediaData = useMemo(() => sorted.map((r) => ({
        mes: r.mes_label || MESES_LABELS[r.mes] || "",
        "Média Dia Smart": r.media_dia_smart || 0,
        "STK": r.media_dia_stk || 0,
        "Média Dia Geral": r.media_dia_geral || 0,
    })), [sorted]);
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-[60vh]", children: _jsx(Loader2, { className: "w-8 h-8 text-slate-400 animate-spin" }) }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-[#F8F9FA]", children: [_jsxs("div", { className: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white", children: _jsx(Factory, { className: "w-5 h-5" }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-extrabold tracking-tight text-slate-900 leading-tight", children: "OR\u00C7AMENTO 2027 \u2014 CAPACIDADE INDUSTRIAL" }), _jsx("p", { className: "text-xs text-slate-500 mt-0.5", children: "Produ\u00E7\u00E3o Geral \u2014 Smart Group & STK" })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(MonthFilter, { selectedMeses: selectedMeses, onSelect: setSelectedMeses }), _jsxs(Button, { variant: "default", size: "sm", className: "gap-1.5 bg-cyan-600 hover:bg-cyan-700", onClick: () => setImportOpen(true), children: [_jsx(FileSpreadsheet, { className: "w-4 h-4" }), " Importar Excel"] })] })] }), sorted.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-20 gap-4", children: [_jsx(Factory, { className: "w-12 h-12 text-slate-300" }), _jsx("p", { className: "text-slate-500", children: "Nenhum dado encontrado. Importe a planilha Excel (aba PRODU\u00C7\u00C3O GERAL)." }), _jsxs(Button, { variant: "default", className: "gap-1.5 bg-cyan-600 hover:bg-cyan-700", onClick: () => setImportOpen(true), children: [_jsx(FileSpreadsheet, { className: "w-4 h-4" }), " Importar Excel"] })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5", children: [_jsx(KpiCard, { icon: TrendingUp, label: "Produ\u00E7\u00E3o Smart", value: fmtMeters(totais.producao_smart) + " m", sub: "Total anual", accent: "blue" }), _jsx(KpiCard, { icon: Layers, label: "Beneficiamento", value: fmtMeters(totais.beneficiamento) + " m", sub: "Total anual", accent: "amber" }), _jsx(KpiCard, { icon: Layers, label: "STK (M\u00E9dia/Dia)", value: fmtNum(totais.media_dia_stk, 0) + " m", sub: "M\u00E9dia di\u00E1ria anual", accent: "violet" }), _jsx(KpiCard, { icon: Gauge, label: "Total Geral", value: fmtMeters(totais.total) + " m", sub: "Smart + STK", accent: "green" }), _jsx(KpiCard, { icon: Calendar, label: "Dias \u00DAteis", value: fmtNum(totais.dias_uteis), sub: "Total anual", accent: "blue" })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4", children: [_jsxs("div", { className: "rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-md hover:shadow-lg transition-shadow", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx("div", { className: "p-1.5 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 text-white", children: _jsx(TrendingUp, { className: "w-3.5 h-3.5" }) }), _jsx("h2", { className: "text-sm font-bold text-slate-700 uppercase tracking-wider", children: "Distribui\u00E7\u00E3o Anual \u2014 Smart / Beneficiamento" })] }), _jsx(CircularInfografico, { rows: DISTRIBUICAO_ROWS, values: [totais.producao_smart, totais.beneficiamento], subtitle: "distribui\u00E7\u00E3o anual" })] }), _jsxs("div", { className: "rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-md hover:shadow-lg transition-shadow", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx("div", { className: "p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-orange-500 text-white", children: _jsx(TrendingUp, { className: "w-3.5 h-3.5" }) }), _jsx("h2", { className: "text-sm font-bold text-slate-700 uppercase tracking-wider", children: "M\u00E9dias Di\u00E1rias \u2014 Smart / Beneficiamento" })] }), _jsx(CircularInfografico, { rows: MEDIA_ROWS, values: [totais.media_dia_smart, totais.media_dia_stk], subtitle: "m\u00E9dias di\u00E1rias" })] }), _jsxs("div", { className: "rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-md hover:shadow-lg transition-shadow", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx("div", { className: "p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white", children: _jsx(Gauge, { className: "w-3.5 h-3.5" }) }), _jsx("h2", { className: "text-sm font-bold text-slate-700 uppercase tracking-wider", children: "M\u00E9dias Di\u00E1rias \u2014 Smart vs STK vs Geral" })] }), _jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(LineChart, { data: mediaData, margin: { top: 10, right: 10, left: -10, bottom: 5 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e2e8f0", vertical: false }), _jsx(XAxis, { dataKey: "mes", tick: { fill: "#475569", fontSize: 10 }, stroke: "#cbd5e1", axisLine: false, tickLine: false }), _jsx(YAxis, { tick: { fill: "#94a3b8", fontSize: 9 }, stroke: "#cbd5e1", axisLine: false, tickLine: false }), _jsx(Tooltip, { contentStyle: tooltipStyle, cursor: { stroke: "#94a3b8", strokeDasharray: "3 3" } }), _jsx(Legend, { wrapperStyle: { fontSize: 11 } }), _jsx(Line, { type: "monotone", dataKey: "M\u00E9dia Dia Smart", stroke: "#3b82f6", strokeWidth: 3, dot: { r: 4, fill: "#3b82f6", strokeWidth: 0 }, activeDot: { r: 6 } }), _jsx(Line, { type: "monotone", dataKey: "STK", stroke: "#f97316", strokeWidth: 3, dot: { r: 4, fill: "#f97316", strokeWidth: 0 }, activeDot: { r: 6 } }), _jsx(Line, { type: "monotone", dataKey: "M\u00E9dia Dia Geral", stroke: "#8b5cf6", strokeWidth: 3, dot: { r: 4, fill: "#8b5cf6", strokeWidth: 0 }, activeDot: { r: 6 } })] }) })] })] })] }))] }), _jsx(ImportProducaoGeralDialog, { open: importOpen, onOpenChange: setImportOpen, onImported: load })] }));
}
