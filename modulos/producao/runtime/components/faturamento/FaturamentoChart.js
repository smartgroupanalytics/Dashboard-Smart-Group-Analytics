import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Card } from "@/components/ui/card";
import { MESES, fmtCurrency, fmtMeters, fmtCompactCurrency, fmtCompactMeters } from "@/lib/format";
export default function FaturamentoChart({ records, selectedMes, selectedMeses, type = "faturamento", dark = false }) {
    const highlightSet = new Set(selectedMeses || (selectedMes != null ? [selectedMes] : []));
    const data = records
        .slice()
        .sort((a, b) => a.mes - b.mes)
        .map((r) => ({
        label: MESES[r.mes - 1]?.label.substring(0, 3) || "",
        mes: r.mes,
        "Smart Group": type === "faturamento" ? r.faturamento_smart_group || 0 : r.metros_smart_group || 0,
        STK: type === "faturamento" ? r.faturamento_stk || 0 : r.metros_stk || 0,
    }));
    const isFat = type === "faturamento";
    const fmt = isFat ? fmtCurrency : fmtMeters;
    const axisFmt = isFat ? fmtCompactCurrency : fmtCompactMeters;
    const gridStroke = dark ? "rgba(255,255,255,0.15)" : "#e2e8f0";
    const axisStroke = dark ? "rgba(255,255,255,0.6)" : "#94a3b8";
    const cursorFill = dark ? "rgba(255,255,255,0.08)" : "#f1f5f9";
    return (_jsxs(Card, { className: `p-5 ${dark ? "bg-gradient-to-br from-[#0f3563] to-[#1c528f] border-blue-300/30" : ""}`, children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: `text-sm font-semibold ${dark ? "text-white" : ""}`, children: isFat ? "Faturamento por Mês" : "Metragem por Mês" }), _jsx("span", { className: `text-xs ${dark ? "text-blue-100/70" : "text-muted-foreground"}`, children: isFat ? "R$" : "" })] }), _jsx(ResponsiveContainer, { width: "100%", height: 280, children: _jsxs(BarChart, { data: data, barGap: 4, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: gridStroke, vertical: false }), _jsx(XAxis, { dataKey: "label", tick: { fontSize: 12, fill: axisStroke }, stroke: axisStroke }), _jsx(YAxis, { tick: { fontSize: 11, fill: axisStroke }, stroke: axisStroke, tickFormatter: axisFmt, width: 70 }), _jsx(Tooltip, { formatter: (v) => fmt(v), contentStyle: { borderRadius: 8, border: `1px solid ${gridStroke}`, fontSize: 13, background: dark ? "#0a2540" : "#fff", color: dark ? "#fff" : "#000" }, cursor: { fill: cursorFill } }), _jsx(Legend, { wrapperStyle: { fontSize: 12, color: dark ? "#fff" : undefined } }), _jsx(Bar, { dataKey: "Smart Group", fill: "#3b82f6", radius: [4, 4, 0, 0], maxBarSize: 28, children: data.map((d) => (_jsx(Cell, { fill: highlightSet.has(d.mes) ? "#1d4ed8" : "#3b82f6" }, d.mes))) }), _jsx(Bar, { dataKey: "STK", fill: "#f97316", radius: [4, 4, 0, 0], maxBarSize: 28, children: data.map((d) => (_jsx(Cell, { fill: highlightSet.has(d.mes) ? "#ea580c" : "#f97316" }, d.mes))) })] }) })] }));
}
