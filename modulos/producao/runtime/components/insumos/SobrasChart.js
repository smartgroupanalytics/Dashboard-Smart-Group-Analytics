import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from "recharts";
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload || !payload.length)
        return null;
    return (_jsxs("div", { className: "bg-white/95 border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-lg", children: [_jsx("p", { className: "font-semibold text-slate-700", children: label }), _jsx("p", { className: "text-blue-600 font-bold tabular-nums", children: payload[0].value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })] }));
}
export default function SobrasChart({ data }) {
    return (_jsx(ResponsiveContainer, { width: "100%", height: 180, children: _jsxs(AreaChart, { data: data, margin: { top: 10, right: 10, left: -10, bottom: 0 }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "sobrasGrad", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "#60a5fa", stopOpacity: 0.5 }), _jsx("stop", { offset: "100%", stopColor: "#60a5fa", stopOpacity: 0 })] }) }), _jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.1)" }), _jsx(XAxis, { dataKey: "label", stroke: "rgba(255,255,255,0.5)", tick: { fontSize: 11, fill: "rgba(255,255,255,0.6)" }, axisLine: false, tickLine: false }), _jsx(YAxis, { stroke: "rgba(255,255,255,0.5)", tick: { fontSize: 11, fill: "rgba(255,255,255,0.6)" }, axisLine: false, tickLine: false }), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}) }), _jsx(Area, { type: "monotone", dataKey: "value", stroke: "#60a5fa", strokeWidth: 2.5, fill: "url(#sobrasGrad)", dot: { fill: "#60a5fa", r: 4 }, activeDot: { r: 6, fill: "#93c5fd" } })] }) }));
}
