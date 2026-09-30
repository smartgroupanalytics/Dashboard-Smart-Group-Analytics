import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, } from "recharts";
import { Card } from "@/components/ui/card";
import { tempoEsperadoHoras, tempoRealHoras } from "@/lib/controleSpeed";
import { Clock, Gauge as GaugeIcon, TrendingUp } from "lucide-react";
function CustomTooltip({ active, payload, maquina }) {
    if (!active || !payload || payload.length === 0)
        return null;
    const d = payload[0].payload;
    const esp = tempoEsperadoHoras(d.metragem, maquina, d.processo);
    const real = tempoRealHoras(d.hora_inicial, d.hora_final);
    const eficiencia = real > 0 ? (esp / real) * 100 : 0;
    const cor = eficiencia >= 100 ? "#10b981" : eficiencia >= 80 ? "#f59e0b" : "#ef4444";
    return (_jsxs("div", { className: "rounded-xl border border-slate-200 bg-white/95 backdrop-blur shadow-lg p-3 text-xs space-y-1.5", children: [_jsxs("p", { className: "font-semibold text-slate-900", children: ["OP ", d.num_op || "—"] }), d.descricao_produto && _jsx("p", { className: "text-slate-500", children: d.descricao_produto }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-emerald-500" }), _jsx("span", { className: "text-slate-600", children: "Tempo Real:" }), _jsxs("span", { className: "font-semibold tabular-nums text-emerald-600", children: [real.toFixed(2).replace(".", ","), " h"] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-blue-500" }), _jsx("span", { className: "text-slate-600", children: "Esperado:" }), _jsxs("span", { className: "font-semibold tabular-nums text-blue-600", children: [esp.toFixed(2).replace(".", ","), " h"] })] }), _jsxs("div", { className: "flex items-center justify-between gap-3 pt-1.5 mt-1.5 border-t border-slate-100", children: [_jsx("span", { className: "text-slate-600", children: "Efici\u00EAncia:" }), _jsxs("span", { className: "font-semibold tabular-nums", style: { color: cor }, children: [eficiencia.toFixed(0), "%"] })] })] }));
}
export default function ControleChart({ records, maquina }) {
    const data = useMemo(() => {
        return records.map((r) => {
            const esp = tempoEsperadoHoras(r.metragem, maquina, r.processo);
            const real = tempoRealHoras(r.hora_inicial, r.hora_final);
            const eficiencia = real > 0 ? (esp / real) * 100 : 0;
            return {
                ...r,
                op: r.num_op || "—",
                "Tempo Real": Number(real.toFixed(2)),
                "Tempo Esperado": Number(esp.toFixed(2)),
                cor: real > esp ? "#ef4444" : "#10b981",
            };
        });
    }, [records, maquina]);
    const totais = useMemo(() => {
        if (!records || records.length === 0)
            return { real: 0, esperado: 0, eficiencia: 0 };
        const real = records.reduce((s, r) => s + tempoRealHoras(r.hora_inicial, r.hora_final), 0);
        const esperado = records.reduce((s, r) => s + tempoEsperadoHoras(r.metragem, maquina, r.processo), 0);
        return { real, esperado, eficiencia: real > 0 ? (esperado / real) * 100 : 0 };
    }, [records, maquina]);
    if (!records || records.length === 0)
        return null;
    const corEfGeral = totais.eficiencia >= 95 ? "#10b981" : "#ef4444";
    return (_jsxs(Card, { className: "p-5 mt-6", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5", children: [_jsxs("div", { children: [_jsxs("h3", { className: "text-sm font-semibold mb-1", children: ["Tempo por OP \u2014 ", maquina] }), _jsx("p", { className: "text-[11px] text-muted-foreground", children: "Barras deitadas comparando Tempo Real (verde) e Esperado (azul), em horas." })] }), _jsxs("div", { className: "flex gap-3", children: [_jsxs("div", { className: "flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2", children: [_jsx(Clock, { className: "w-4 h-4 text-emerald-600" }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] text-emerald-700/70 uppercase font-medium", children: "Total Real" }), _jsxs("p", { className: "text-sm font-bold text-emerald-700 tabular-nums", children: [totais.real.toFixed(2).replace(".", ","), " h"] })] })] }), _jsxs("div", { className: "flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2", children: [_jsx(TrendingUp, { className: "w-4 h-4 text-blue-600" }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] text-blue-700/70 uppercase font-medium", children: "Total Previsto" }), _jsxs("p", { className: "text-sm font-bold text-blue-700 tabular-nums", children: [totais.esperado.toFixed(2).replace(".", ","), " h"] })] })] }), _jsxs("div", { className: "flex items-center gap-2 rounded-lg px-3 py-2", style: { background: corEfGeral }, children: [_jsx(GaugeIcon, { className: "w-4 h-4 text-white" }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] text-white/80 uppercase font-medium", children: "Efici\u00EAncia" }), _jsxs("p", { className: "text-sm font-bold tabular-nums text-white", children: [totais.eficiencia.toFixed(0), "%"] })] })] })] })] }), _jsx("div", { className: "w-full", style: { height: Math.max(220, data.length * 48 + 40) }, children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: data, layout: "vertical", margin: { top: 8, right: 24, left: 8, bottom: 8 }, barCategoryGap: "18%", barGap: 2, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", horizontal: false, stroke: "#e2e8f0" }), _jsx(XAxis, { type: "number", tick: { fontSize: 11 }, tickLine: false, axisLine: { stroke: "#e2e8f0" }, unit: " h" }), _jsx(YAxis, { type: "category", dataKey: "op", tick: { fontSize: 11 }, tickLine: false, axisLine: false, width: 64, tickFormatter: (v) => `OP ${v}` }), _jsx(Tooltip, { content: _jsx(CustomTooltip, { maquina: maquina }), cursor: { fill: "rgba(148,163,184,0.12)" } }), _jsx(Legend, { wrapperStyle: { fontSize: 12, paddingTop: 8 }, iconType: "circle" }), _jsx(Bar, { dataKey: "Tempo Esperado", fill: "#2563eb", radius: [4, 4, 4, 4], animationDuration: 700 }), _jsx(Bar, { dataKey: "Tempo Real", radius: [4, 4, 4, 4], animationDuration: 700, children: data.map((d, i) => (_jsx(Cell, { fill: d.cor }, i))) })] }) }) })] }));
}
