import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
function CustomTooltip({ active, payload }) {
    if (!active || !payload?.length)
        return null;
    const d = payload[0].payload;
    return (_jsxs("div", { className: "rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs", children: [_jsx("p", { className: "font-bold text-slate-900 mb-1", children: d.maquina }), _jsxs("p", { className: "text-slate-600", children: ["Dias Necess\u00E1rios: ", _jsx("span", { className: "font-bold text-slate-900", children: d.dias_necessarios.toFixed(1) })] })] }));
}
export default function CargaMaquinaChart({ data }) {
    if (!data || data.length === 0)
        return null;
    const sorted = [...data].sort((a, b) => b.dias_necessarios - a.dias_necessarios);
    const maxVal = Math.max(...sorted.map((d) => d.dias_necessarios), 1);
    return (_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm", children: [_jsx("h3", { className: "text-sm font-bold text-white uppercase tracking-wide px-3 py-2 rounded-lg bg-[#008B8B] inline-block mb-4", children: "Dias por M\u00E1quina" }), _jsx(ResponsiveContainer, { width: "100%", height: Math.max(220, sorted.length * 48), children: _jsxs(BarChart, { data: sorted, layout: "vertical", margin: { top: 4, right: 48, bottom: 4, left: 8 }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "barTealAmber", x1: "0", y1: "0", x2: "1", y2: "0", children: [_jsx("stop", { offset: "0%", stopColor: "#008B8B" }), _jsx("stop", { offset: "100%", stopColor: "#f59e0b" })] }) }), _jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e2e8f0", horizontal: false }), _jsx(XAxis, { type: "number", tick: { fontSize: 11, fill: "#64748b" }, axisLine: { stroke: "#cbd5e1" } }), _jsx(YAxis, { type: "category", dataKey: "maquina", tick: { fontSize: 12, fill: "#334155", fontWeight: 600 }, width: 110, axisLine: { stroke: "#cbd5e1" } }), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}), cursor: { fill: "#f1f5f9" } }), _jsx(Bar, { dataKey: "dias_necessarios", radius: [0, 6, 6, 0], barSize: 28, fill: "url(#barTealAmber)", children: _jsx(LabelList, { dataKey: "dias_necessarios", position: "right", formatter: (v) => Number(v).toFixed(1), style: { fontSize: 12, fontWeight: 700, fill: "#334155" } }) })] }) })] }));
}
