import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, } from "@/components/ui/dialog";
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie, Legend, } from "recharts";
import { Target, Cog, Gauge, Layers, AlertTriangle, TrendingUp, Clock, Coins, Scissors } from "lucide-react";
const fmtNum = (v) => (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtCurrency = (v) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (v) => `${(v || 0).toFixed(1)}%`;
const fmtHora = (v) => {
    if (!v || v === 0)
        return "—";
    const h = Math.floor(v);
    const m = Math.round((v - h) * 100);
    let hh = h + (m >= 60 ? 1 : 0);
    let mm = m % 60;
    return `${hh}:${String(mm).padStart(2, "0")}`;
};
function GaugeScore({ value }) {
    const v = Math.max(0, Math.min(100, value || 0));
    const r = 70;
    const circ = 2 * Math.PI * r;
    const offset = circ - (v / 100) * circ;
    const color = v >= 95 ? "#10b981" : v >= 92 ? "#f59e0b" : "#ef4444";
    return (_jsxs("div", { className: "relative w-[180px] h-[180px] mx-auto", children: [_jsxs("svg", { className: "w-full h-full -rotate-90", viewBox: "0 0 180 180", children: [_jsx("circle", { cx: "90", cy: "90", r: r, fill: "none", stroke: "#e2e8f0", strokeWidth: "14" }), _jsx("circle", { cx: "90", cy: "90", r: r, fill: "none", stroke: color, strokeWidth: "14", strokeLinecap: "round", strokeDasharray: circ, strokeDashoffset: offset, style: { transition: "stroke-dashoffset 0.8s ease, stroke 0.4s ease", filter: `drop-shadow(0 0 6px ${color}66)` } })] }), _jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center", children: [_jsx("span", { className: "text-4xl font-extrabold tabular-nums", style: { color }, children: fmtPct(v) }), _jsx("span", { className: "text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1", children: "Aproveitamento" })] })] }));
}
function MiniKpi({ icon: Icon, label, value, color }) {
    return (_jsxs("div", { className: `rounded-xl p-3 bg-gradient-to-br ${color} text-white shadow-sm`, children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx(Icon, { className: "w-4 h-4 opacity-80" }), _jsx("span", { className: "text-[10px] uppercase tracking-wide font-semibold opacity-80", children: label })] }), _jsx("span", { className: "text-xl font-extrabold tabular-nums", children: value })] }));
}
export default function AproveitamentoOpReport({ open, onOpenChange, row, controleRecords }) {
    const maquinas = useMemo(() => {
        if (!row?.num_op)
            return [];
        const recs = controleRecords.filter((r) => String(r.num_op || "") === String(row.num_op || ""));
        const map = {};
        recs.forEach((r) => {
            const key = r.maquina || "(sem máquina)";
            if (!map[key])
                map[key] = { maquina: key, tempo: 0, setup: 0, parada: 0, ops: 0, retrabalho: 0 };
            map[key].tempo += r.tempo || 0;
            map[key].setup += r.setup || 0;
            map[key].parada += r.parada || 0;
            map[key].ops += 1;
            if (r.is_retrabalho)
                map[key].retrabalho += r.tempo || 0;
        });
        return Object.values(map).sort((a, b) => b.tempo - a.tempo);
    }, [controleRecords, row?.num_op]);
    const radarData = useMemo(() => ([
        { axis: "Produção", valor: Math.min(100, row?.ip || 0) },
        { axis: "Setup", valor: Math.min(100, row?.is || 0) },
        { axis: "Consumo", valor: Math.min(100, row?.ic || 0) },
        { axis: "Quebra", valor: Math.min(100, row?.iq || 0) },
    ]), [row]);
    const barData = useMemo(() => maquinas.map((m) => ({
        name: m.maquina,
        Tempo: Number((m.tempo || 0).toFixed(2)),
        Setup: Number(((m.setup || 0) / 60).toFixed(2)),
        Parada: Number(((m.parada || 0) / 60).toFixed(2)),
    })), [maquinas]);
    const pieData = useMemo(() => maquinas.map((m, i) => ({
        name: m.maquina,
        value: Number((m.tempo || 0).toFixed(2)),
        color: ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6", "#ec4899"][i % 7],
    })), [maquinas]);
    if (!row)
        return null;
    const statusColor = row.final >= 95 ? "emerald" : row.final >= 92 ? "amber" : "rose";
    const statusLabel = row.final >= 95 ? "EXCELENTE" : row.final >= 92 ? "INTERMEDIÁRIA" : "CRÍTICA";
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-4xl max-h-[92vh] overflow-y-auto bg-gradient-to-br from-slate-50 to-white p-0", children: [_jsxs("div", { className: "bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 px-6 py-5 text-white relative overflow-hidden", children: [_jsx("div", { className: "absolute inset-0 pointer-events-none", style: { background: "radial-gradient(circle at 90% 10%, rgba(255,255,255,.15), transparent 40%)" } }), _jsx(DialogHeader, { className: "relative", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-11 h-11 rounded-xl bg-white/15 backdrop-blur grid place-items-center", children: _jsx(Target, { className: "w-6 h-6" }) }), _jsxs("div", { children: [_jsxs(DialogTitle, { className: "text-xl font-extrabold tracking-wide", children: ["Relat\u00F3rio de Aproveitamento \u2014 OP ", row.num_op] }), _jsxs(DialogDescription, { className: "text-indigo-100 text-xs mt-0.5", children: [row.descricao_produto || "—", " \u00B7 ", row.data || "—"] })] })] }) })] }), _jsxs("div", { className: "px-6 py-5 space-y-5", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 items-center", children: [_jsxs("div", { className: "md:col-span-2 grid grid-cols-2 gap-3", children: [_jsx(MiniKpi, { icon: Clock, label: "Tempo Previsto", value: fmtHora(row.tempo_previsto), color: "from-emerald-600 to-emerald-800" }), _jsx(MiniKpi, { icon: Clock, label: "Tempo Realizado", value: fmtHora(row.tempo_realizado), color: "from-cyan-600 to-cyan-800" }), _jsx(MiniKpi, { icon: Coins, label: "Consumo Previsto (kg)", value: fmtNum(row.consumo_previsto), color: "from-amber-500 to-amber-700" }), _jsx(MiniKpi, { icon: Coins, label: "Consumo Realizado (kg)", value: fmtNum(row.consumo_realizado), color: "from-orange-500 to-orange-700" }), _jsx(MiniKpi, { icon: Scissors, label: "Mts Quebra", value: `${fmtNum(row.mts_quebra)} m`, color: "from-rose-500 to-rose-700" }), _jsx(MiniKpi, { icon: Layers, label: "Metragem", value: fmtNum(row.metragem), color: "from-slate-700 to-slate-900" })] }), _jsxs("div", { className: "bg-white rounded-2xl border border-slate-200 p-4 shadow-sm", children: [_jsx(GaugeScore, { value: row.final }), _jsx("div", { className: "text-center mt-2", children: _jsx("span", { className: `inline-block px-3 py-1 rounded-full text-xs font-extrabold tracking-wider ${statusColor === "emerald" ? "bg-emerald-100 text-emerald-700" :
                                                    statusColor === "amber" ? "bg-amber-100 text-amber-700" :
                                                        "bg-rose-100 text-rose-700"}`, children: statusLabel }) })] })] }), row.tem_retrabalho && (_jsxs("div", { className: "flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3", children: [_jsx(AlertTriangle, { className: "w-5 h-5 text-amber-600" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-bold text-amber-800", children: "OP com Retrabalho \u2014 Penalidade de -15% aplicada" }), _jsxs("p", { className: "text-xs text-amber-700", children: [fmtNum(row.retrabalho_metros), " m de retrabalho registrados"] })] })] })), _jsxs("div", { className: "bg-white rounded-2xl border border-slate-200 p-4 shadow-sm", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx(Gauge, { className: "w-4 h-4 text-indigo-600" }), _jsx("h3", { className: "text-sm font-bold text-slate-700 uppercase tracking-wide", children: "\u00CDndices de Performance" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 items-center", children: [_jsx(ResponsiveContainer, { width: "100%", height: 240, children: _jsxs(RadarChart, { data: radarData, outerRadius: "75%", children: [_jsx(PolarGrid, { stroke: "#e2e8f0" }), _jsx(PolarAngleAxis, { dataKey: "axis", tick: { fill: "#475569", fontSize: 12, fontWeight: 600 } }), _jsx(PolarRadiusAxis, { domain: [0, 100], tick: { fill: "#94a3b8", fontSize: 10 }, angle: 90 }), _jsx(Radar, { name: "\u00CDndice", dataKey: "valor", stroke: "#6366f1", fill: "#6366f1", fillOpacity: 0.45 }), _jsx(Tooltip, { formatter: (v) => fmtPct(v), contentStyle: { borderRadius: 10, border: "1px solid #e2e8f0" } })] }) }), _jsx("div", { className: "space-y-2", children: [
                                                { label: "Índice de Produção", v: row.ip, peso: "25%", color: "bg-indigo-500" },
                                                { label: "Índice de Setup", v: row.is, peso: "15%", color: "bg-emerald-500" },
                                                { label: "Índice de Consumo", v: row.ic, peso: "55%", color: "bg-amber-500" },
                                                { label: "Índice de Quebra", v: row.iq, peso: "5%", color: "bg-rose-500" },
                                            ].map((it) => (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: `w-2 h-8 rounded-full ${it.color}` }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex justify-between text-xs", children: [_jsxs("span", { className: "text-slate-600 font-medium", children: [it.label, " ", _jsxs("span", { className: "text-slate-400", children: ["(", it.peso, ")"] })] }), _jsx("span", { className: "font-bold tabular-nums text-slate-800", children: fmtPct(it.v) })] }), _jsx("div", { className: "h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1", children: _jsx("div", { className: `h-full ${it.color} rounded-full`, style: { width: `${Math.min(100, it.v)}%`, transition: "width 0.6s ease" } }) })] })] }, it.label))) })] })] }), maquinas.length > 0 && (_jsxs("div", { className: "bg-white rounded-2xl border border-slate-200 p-4 shadow-sm", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx(Cog, { className: "w-4 h-4 text-indigo-600" }), _jsx("h3", { className: "text-sm font-bold text-slate-700 uppercase tracking-wide", children: "Distribui\u00E7\u00E3o por M\u00E1quina" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx(ResponsiveContainer, { width: "100%", height: 260, children: _jsxs(BarChart, { data: barData, margin: { top: 10, right: 10, left: -10, bottom: 40 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e2e8f0" }), _jsx(XAxis, { dataKey: "name", tick: { fill: "#475569", fontSize: 10 }, angle: -25, textAnchor: "end", height: 50 }), _jsx(YAxis, { tick: { fill: "#94a3b8", fontSize: 10 } }), _jsx(Tooltip, { formatter: (v) => `${fmtNum(v)} h`, contentStyle: { borderRadius: 10, border: "1px solid #e2e8f0" } }), _jsx(Legend, { wrapperStyle: { fontSize: 11 } }), _jsx(Bar, { dataKey: "Tempo", stackId: "a", fill: "#6366f1", radius: [0, 0, 0, 0] }), _jsx(Bar, { dataKey: "Setup", stackId: "a", fill: "#f59e0b" }), _jsx(Bar, { dataKey: "Parada", stackId: "a", fill: "#ef4444", radius: [4, 4, 0, 0] })] }) }), _jsx(ResponsiveContainer, { width: "100%", height: 260, children: _jsxs(PieChart, { children: [_jsx(Pie, { data: pieData, dataKey: "value", nameKey: "name", cx: "50%", cy: "50%", outerRadius: 90, innerRadius: 45, paddingAngle: 3, children: pieData.map((entry, i) => (_jsx(Cell, { fill: entry.color }, i))) }), _jsx(Tooltip, { formatter: (v) => `${fmtNum(v)} h`, contentStyle: { borderRadius: 10, border: "1px solid #e2e8f0" } }), _jsx(Legend, { wrapperStyle: { fontSize: 10 } })] }) })] }), _jsx("div", { className: "overflow-auto mt-4", children: _jsxs("table", { className: "w-full text-xs", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-slate-100 text-slate-600", children: [_jsx("th", { className: "px-3 py-2 text-left font-semibold", children: "M\u00E1quina" }), _jsx("th", { className: "px-3 py-2 text-right font-semibold", children: "Registros" }), _jsx("th", { className: "px-3 py-2 text-right font-semibold", children: "Tempo (h)" }), _jsx("th", { className: "px-3 py-2 text-right font-semibold", children: "Setup (min)" }), _jsx("th", { className: "px-3 py-2 text-right font-semibold", children: "Parada (min)" }), _jsx("th", { className: "px-3 py-2 text-right font-semibold", children: "Retrabalho (h)" })] }) }), _jsx("tbody", { children: maquinas.map((m) => (_jsxs("tr", { className: "border-t border-slate-100 hover:bg-slate-50", children: [_jsx("td", { className: "px-3 py-2 font-semibold text-slate-800", children: m.maquina }), _jsx("td", { className: "px-3 py-2 text-right tabular-nums text-slate-600", children: m.ops }), _jsx("td", { className: "px-3 py-2 text-right tabular-nums font-bold text-slate-800", children: fmtNum(m.tempo) }), _jsx("td", { className: "px-3 py-2 text-right tabular-nums text-slate-600", children: fmtNum(m.setup) }), _jsx("td", { className: "px-3 py-2 text-right tabular-nums text-slate-600", children: fmtNum(m.parada) }), _jsx("td", { className: `px-3 py-2 text-right tabular-nums ${m.retrabalho > 0 ? "text-rose-600 font-bold" : "text-slate-300"}`, children: m.retrabalho > 0 ? fmtNum(m.retrabalho) : "—" })] }, m.maquina))) })] }) })] })), _jsxs("div", { className: "bg-gradient-to-r from-indigo-50 to-slate-50 border border-indigo-200 rounded-2xl px-5 py-4 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(TrendingUp, { className: "w-6 h-6 text-indigo-600" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-slate-500 font-semibold", children: "Aproveitamento Final" }), _jsx("p", { className: "text-2xl font-extrabold tabular-nums text-slate-800", children: fmtPct(row.final) })] })] }), _jsx("span", { className: `px-4 py-2 rounded-full text-sm font-extrabold tracking-wider ${statusColor === "emerald" ? "bg-emerald-100 text-emerald-700" :
                                        statusColor === "amber" ? "bg-amber-100 text-amber-700" :
                                            "bg-rose-100 text-rose-700"}`, children: statusLabel })] })] })] }) }));
}
