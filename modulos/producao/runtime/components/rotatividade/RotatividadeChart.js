import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, } from "recharts";
const Dot = ({ color }) => (props) => {
    const { cx, cy } = props;
    return (_jsx("svg", { x: cx - 5, y: cy - 5, width: 10, height: 10, overflow: "visible", children: _jsx("rect", { x: 0, y: 0, width: 10, height: 10, transform: "rotate(45 5 5)", fill: color, stroke: "#fff", strokeWidth: 1.5, rx: 1 }) }));
};
const PctLabel = ({ x, y, value, color, isTop }) => {
    const text = `${Number(value).toFixed(1).replace(".", ",")}%`;
    return (_jsxs("g", { children: [_jsx("circle", { cx: x, cy: y, r: 5, fill: color, stroke: "#fff", strokeWidth: 1 }), _jsx("text", { x: x, y: isTop ? y - 12 : y + 22, fill: color, fontSize: 18, fontWeight: 800, textAnchor: "middle", children: text })] }));
};
export default function RotatividadeChart({ data }) {
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, delay: 0.2 }, className: "rounded-xl bg-gradient-to-br from-white via-slate-50 to-slate-100 border border-slate-300 shadow-sm p-5", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx("span", { className: "w-1 h-5 rounded-full bg-blue-500" }), _jsx("h3", { className: "text-sm font-bold text-slate-700 uppercase tracking-wider", children: "Evolu\u00E7\u00E3o da Rotatividade (%)" })] }), _jsx("div", { className: "w-full h-[240px]", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(LineChart, { data: data, margin: { top: 24, right: 16, bottom: 8, left: -12 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "rgba(15,23,42,0.1)" }), _jsx(XAxis, { dataKey: "mes", tick: { fill: "#475569", fontSize: 12, fontWeight: 600 }, axisLine: { stroke: "rgba(15,23,42,0.2)" }, tickLine: false }), _jsx(YAxis, { tick: { fill: "#475569", fontSize: 11 }, axisLine: { stroke: "rgba(15,23,42,0.2)" }, tickLine: false, tickFormatter: (v) => `${v.toFixed(0)}%`, domain: [0, "auto"] }), _jsx(Tooltip, { contentStyle: {
                                    background: "#fff",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: 8,
                                    color: "#0f172a",
                                }, labelStyle: { color: "#1e40af", fontWeight: 700 }, formatter: (v) => `${Number(v).toFixed(1).replace(".", ",")}%` }), _jsx(Line, { type: "monotone", dataKey: "rot2025", name: "Ano 2025", stroke: "#1d4ed8", strokeWidth: 2.5, dot: _jsx(Dot, { color: "#1d4ed8" }), activeDot: { r: 6 }, children: _jsx(LabelList, { dataKey: "rot2025", position: "top", offset: 10, fill: "#1d4ed8", fontSize: 18, fontWeight: 800, formatter: (v) => `${Number(v).toFixed(1).replace(".", ",")}%`, content: (props) => {
                                        const row = data[props.index] || {};
                                        const v2025 = Number(row.rot2025 ?? 0);
                                        const v2026 = Number(row.rot2026 ?? 0);
                                        return _jsx(PctLabel, { ...props, color: "#1d4ed8", isTop: v2025 >= v2026 });
                                    } }) }), _jsx(Line, { type: "monotone", dataKey: "rot2026", name: "Ano 2026", stroke: "#047857", strokeWidth: 3, dot: _jsx(Dot, { color: "#047857" }), activeDot: { r: 6 }, children: _jsx(LabelList, { dataKey: "rot2026", position: "bottom", offset: 8, fill: "#047857", fontSize: 18, fontWeight: 800, formatter: (v) => `${Number(v).toFixed(1).replace(".", ",")}%`, content: (props) => {
                                        const row = data[props.index] || {};
                                        const v2025 = Number(row.rot2025 ?? 0);
                                        const v2026 = Number(row.rot2026 ?? 0);
                                        return _jsx(PctLabel, { ...props, color: "#047857", isTop: v2026 > v2025 });
                                    } }) })] }) }) }), _jsxs("div", { className: "flex items-center justify-center gap-6 mt-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "w-3 h-3 rotate-45 bg-blue-500" }), _jsx("span", { className: "text-xs text-slate-600 font-medium", children: "ANO 2025" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "w-3 h-3 rounded-full bg-emerald-500" }), _jsx("span", { className: "text-xs text-slate-600 font-medium", children: "ANO 2026" })] })] })] }));
}
