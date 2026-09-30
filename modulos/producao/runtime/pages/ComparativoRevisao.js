import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { UploadCloud, ArrowDownToLine, ArrowUpFromLine, Percent, Scale, PieChart } from "lucide-react";
import { fmtMeters } from "@/lib/format";
import DayFilter from "@/components/desempenho/DayFilter";
import LightHeader from "@/components/ui/LightHeader";
import ImportMetrosJumpadosDialog from "@/components/comparativo/ImportMetrosJumpadosDialog";
import GraficoRoscaDialog from "@/components/comparativo/GraficoRoscaDialog";
import { AreaChart, Area, ResponsiveContainer, } from "recharts";
const fmtDay = (iso) => (iso ? iso.split("-").reverse().join("/") : "");
export default function ComparativoRevisao() {
    const [revisaoRecords, setRevisaoRecords] = useState([]);
    const [entradaRecords, setEntradaRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [importJumpOpen, setImportJumpOpen] = useState(false);
    const [graficoOpen, setGraficoOpen] = useState(false);
    const [selectedDays, setSelectedDays] = useState(() => {
        try {
            const saved = localStorage.getItem("comparativo_selectedDays");
            return saved ? JSON.parse(saved) : [];
        }
        catch {
            return [];
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem("comparativo_selectedDays", JSON.stringify(selectedDays));
        }
        catch { }
    }, [selectedDays]);
    const load = async () => {
        try {
            setLoading(true);
            const [rev, ent] = await Promise.all([
                db.entities.Revisao.list("-data", 2000),
                db.entities.EntradaMaterial.list("-data", 2000),
            ]);
            setRevisaoRecords(rev);
            setEntradaRecords(ent);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);
    // Merge por data: revisados da Revisao + jumpados da EntradaMaterial
    const chartData = useMemo(() => {
        const map = {};
        const days = selectedDays;
        const dayFilter = (r) => r.data && (days.length === 0 || days.includes(r.data));
        revisaoRecords.filter(dayFilter).forEach((r) => {
            if (!r.data)
                return;
            const key = r.data;
            if (!map[key])
                map[key] = { data: key, label: fmtDay(key), jumpados: 0, revisados: 0 };
            map[key].revisados += r.metros_revisados || 0;
        });
        entradaRecords.filter(dayFilter).forEach((r) => {
            if (!r.data)
                return;
            const key = r.data;
            if (!map[key])
                map[key] = { data: key, label: fmtDay(key), jumpados: 0, revisados: 0 };
            map[key].jumpados += r.metros_jumpados || 0;
        });
        return Object.values(map).sort((a, b) => a.data.localeCompare(b.data));
    }, [revisaoRecords, entradaRecords, selectedDays]);
    const totals = useMemo(() => {
        const jumpados = chartData.reduce((s, r) => s + (r.jumpados || 0), 0);
        const revisados = chartData.reduce((s, r) => s + (r.revisados || 0), 0);
        const diferenca = jumpados - revisados;
        const taxa = revisados > 0
            ? ((jumpados - revisados) / revisados) * 100
            : jumpados > 0 ? 100 : 0;
        return { jumpados, revisados, diferenca, taxa };
    }, [chartData]);
    const tableRows = useMemo(() => [...chartData].sort((a, b) => b.data.localeCompare(a.data)), [chartData]);
    const bestDay = useMemo(() => {
        let bj = null, br = null, bt = null;
        chartData.forEach((d) => {
            if (!bj || d.jumpados > bj.value)
                bj = { data: d.label, value: d.jumpados };
            if (!br || d.revisados > br.value)
                br = { data: d.label, value: d.revisados };
            const t = d.revisados > 0
                ? ((d.jumpados - d.revisados) / d.revisados) * 100
                : d.jumpados > 0 ? 100 : 0;
            if (!bt || t > bt.value)
                bt = { data: d.label, value: t };
        });
        return { jumpados: bj, revisados: br, taxa: bt };
    }, [chartData]);
    const maxJump = useMemo(() => Math.max(...chartData.map((d) => d.jumpados), 1), [chartData]);
    const maxRev = useMemo(() => Math.max(...chartData.map((d) => d.revisados), 1), [chartData]);
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-[60vh]", children: _jsx("div", { className: "w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" }) }));
    }
    const KPIS = [
        {
            label: "Metros Jumbados (Entrada)",
            value: fmtMeters(totals.jumpados),
            subLabel: "Melhor dia:",
            subValue: bestDay.jumpados ? `${bestDay.jumpados.data} • ${fmtMeters(bestDay.jumpados.value)}` : "—",
            icon: ArrowDownToLine,
            gradient: "from-blue-500 to-blue-900",
            chartData: chartData.map((d) => ({ label: d.label, v: d.jumpados })),
        },
        {
            label: "Metros Revisados (Saída)",
            value: fmtMeters(totals.revisados),
            subLabel: "Melhor dia:",
            subValue: bestDay.revisados ? `${bestDay.revisados.data} • ${fmtMeters(bestDay.revisados.value)}` : "—",
            icon: ArrowUpFromLine,
            gradient: "from-emerald-500 to-emerald-900",
            chartData: chartData.map((d) => ({ label: d.label, v: d.revisados })),
        },
        {
            label: "Entrada / Saída",
            value: `${totals.taxa.toFixed(1)}%`,
            subLabel: "Melhor dia:",
            subValue: bestDay.taxa ? `${bestDay.taxa.data} • ${bestDay.taxa.value.toFixed(1)}%` : "—",
            icon: Percent,
            gradient: "from-purple-500 to-purple-900",
            chartData: chartData.map((d) => ({ label: d.label, v: d.revisados > 0 ? ((d.jumpados - d.revisados) / d.revisados) * 100 : d.jumpados > 0 ? 100 : 0 })),
        },
    ];
    const badgeColor = (t) => t > 0 ? "bg-emerald-100 text-emerald-700 border-emerald-300"
        : t === 0 ? "bg-amber-100 text-amber-700 border-amber-300"
            : "bg-rose-100 text-rose-700 border-rose-300";
    return (_jsxs("div", { className: "min-h-screen bg-white", children: [_jsxs("div", { className: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3", children: [_jsx(LightHeader, { icon: Scale, title: "Comparativo de Revis\u00E3o", subtitle: "Entrada (Metros Jumbados) vs Sa\u00EDda (Metros Revisados) de material na produ\u00E7\u00E3o", className: "mb-3", children: _jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx(DayFilter, { selectedDays: selectedDays, onSelect: setSelectedDays }), selectedDays.length > 0 && (_jsx(Button, { variant: "ghost", size: "sm", className: "h-9 text-slate-700 hover:bg-slate-100", onClick: () => setSelectedDays([]), children: "Limpar data" })), _jsxs(Button, { variant: "default", size: "sm", className: "h-9 gap-1.5 bg-purple-600 text-white hover:bg-purple-700", onClick: () => setGraficoOpen(true), children: [_jsx(PieChart, { className: "w-4 h-4" }), " Gr\u00E1fico"] }), _jsxs(Button, { variant: "outline", size: "sm", className: "h-9 gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50", onClick: () => setImportJumpOpen(true), children: [_jsx(UploadCloud, { className: "w-4 h-4" }), " Importar Jumbados"] })] }) }), chartData.length === 0 ? (_jsxs("div", { className: "text-center py-20", children: [_jsx(Scale, { className: "w-12 h-12 text-slate-400 mx-auto mb-3" }), _jsx("p", { className: "text-slate-600 font-medium", children: "Nenhum dado encontrado para o per\u00EDodo selecionado." }), _jsx("p", { className: "text-slate-500 text-sm mt-1", children: "Importe os Metros Jumbados e a Revis\u00E3o para visualizar o comparativo." })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3", children: KPIS.map((k, idx) => (_jsxs(motion.div, { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25, delay: idx * 0.05 }, className: `relative overflow-hidden rounded-2xl bg-gradient-to-br ${k.gradient} p-4 shadow-lg text-white`, children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-[11px] font-semibold uppercase tracking-wide text-white/80 truncate", children: k.label }), _jsx("p", { className: "text-2xl font-extrabold tabular-nums mt-1", children: k.value }), _jsxs("p", { className: "text-[11px] text-white/70 mt-1.5", children: [k.subLabel, " ", _jsx("span", { className: "font-semibold text-white/90", children: k.subValue })] })] }), _jsx("div", { className: "p-2 rounded-xl bg-white/15 backdrop-blur shrink-0", children: _jsx(k.icon, { className: "w-5 h-5" }) })] }), _jsx("div", { className: "mt-2 -mx-1 -mb-2", children: _jsx(ResponsiveContainer, { width: "100%", height: 48, children: _jsxs(AreaChart, { data: k.chartData, margin: { top: 2, right: 0, left: 0, bottom: 0 }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: `area-${idx}`, x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "#ffffff", stopOpacity: 0.5 }), _jsx("stop", { offset: "100%", stopColor: "#ffffff", stopOpacity: 0.05 })] }) }), _jsx(Area, { type: "monotone", dataKey: "v", stroke: "#ffffff", strokeWidth: 2, fill: `url(#area-${idx})` })] }) }) })] }, k.label))) }), _jsx("div", { className: "grid grid-cols-1 gap-3", children: _jsxs(motion.div, { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 }, className: "rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden", children: [_jsx("div", { className: "px-4 py-3 border-b border-slate-200 bg-slate-50/80", children: _jsx("h3", { className: "text-sm font-bold text-slate-900", children: "Detalhamento por Dia" }) }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-slate-100 text-slate-700", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2.5 text-left font-semibold whitespace-nowrap", children: "Data" }), _jsx("th", { className: "px-3 py-2.5 text-left font-semibold whitespace-nowrap w-[28%]", children: "Entrada (Jumbados)" }), _jsx("th", { className: "px-3 py-2.5 text-left font-semibold whitespace-nowrap w-[28%]", children: "Sa\u00EDda (Revisados)" }), _jsx("th", { className: "px-3 py-2.5 text-right font-semibold whitespace-nowrap", children: "Ent./Sa\u00EDda" })] }) }), _jsx("tbody", { children: tableRows.map((r, i) => {
                                                            const taxa = r.revisados > 0
                                                                ? ((r.jumpados - r.revisados) / r.revisados) * 100
                                                                : r.jumpados > 0 ? 100 : 0;
                                                            return (_jsxs("tr", { className: `border-t border-slate-200 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"} hover:bg-slate-50`, children: [_jsx("td", { className: "px-3 py-2.5 whitespace-nowrap font-medium text-slate-800", children: _jsxs("span", { className: "inline-flex items-center gap-2", children: [_jsx("span", { className: "w-2 h-2 rounded-sm bg-slate-400" }), r.label] }) }), _jsx("td", { className: "px-3 py-2.5", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "flex-1 h-5 rounded bg-slate-100 overflow-hidden", children: _jsx("div", { className: "h-full rounded bg-gradient-to-r from-blue-500 to-blue-700", style: { width: `${(r.jumpados / maxJump) * 100}%` } }) }), _jsx("span", { className: "text-xs tabular-nums text-blue-700 font-semibold w-16 text-right", children: fmtMeters(r.jumpados) })] }) }), _jsx("td", { className: "px-3 py-2.5", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "flex-1 h-5 rounded bg-slate-100 overflow-hidden", children: _jsx("div", { className: "h-full rounded bg-gradient-to-r from-emerald-500 to-emerald-700", style: { width: `${(r.revisados / maxRev) * 100}%` } }) }), _jsx("span", { className: "text-xs tabular-nums text-emerald-700 font-semibold w-16 text-right", children: fmtMeters(r.revisados) })] }) }), _jsx("td", { className: "px-3 py-2.5 text-right", children: _jsx("span", { className: `inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${badgeColor(taxa)}`, children: taxa > 0 ? `+${taxa.toFixed(0)}%` : `${taxa.toFixed(0)}%` }) })] }, r.data));
                                                        }) }), _jsx("tfoot", { className: "bg-slate-100 font-bold text-slate-900", children: _jsxs("tr", { className: "border-t-2 border-slate-300", children: [_jsx("td", { className: "px-3 py-3 whitespace-nowrap", children: "Total" }), _jsx("td", { className: "px-3 py-3 tabular-nums text-blue-700", children: fmtMeters(totals.jumpados) }), _jsx("td", { className: "px-3 py-3 tabular-nums text-emerald-700", children: fmtMeters(totals.revisados) }), _jsx("td", { className: `px-3 py-3 text-right tabular-nums ${totals.taxa > 0 ? "text-emerald-600" : totals.taxa === 0 ? "text-amber-600" : "text-rose-600"}`, children: totals.taxa > 0 ? `+${totals.taxa.toFixed(1)}%` : `${totals.taxa.toFixed(1)}%` })] }) })] }) })] }) })] }))] }), _jsx(ImportMetrosJumpadosDialog, { open: importJumpOpen, onOpenChange: setImportJumpOpen, onImported: load }), _jsx(GraficoRoscaDialog, { open: graficoOpen, onOpenChange: setGraficoOpen, chartData: chartData, totals: totals })] }));
}
