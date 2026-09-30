import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
const R = 80;
const CX = 100;
const CY = 100;
const LEN = Math.PI * R;
const PATH = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;
function point(frac, r = R) {
    const ang = (1 - frac) * Math.PI;
    return [CX + r * Math.cos(ang), CY - r * Math.sin(ang)];
}
function dynamicColor(value, target, base) {
    if (target <= 0)
        return base;
    const ratio = value / target;
    if (ratio >= 1)
        return "#16a34a"; // verde: acima da meta
    if (ratio >= 0.8)
        return "#f59e0b"; // amarelo: perto da meta
    return "#dc2626"; // vermelho: abaixo
}
export default function Gauge({ value = 0, target, color = "#2563eb", formatValue, dynamic = true, dark = false, compact = false }) {
    const max = target * 1.5;
    const frac = Math.max(0, Math.min(1, value / max));
    const targetFrac = Math.max(0, Math.min(1, target / max));
    const [nx, ny] = point(frac, 70);
    const [tx, ty] = point(targetFrac, R);
    const fmt = formatValue || ((v) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 }));
    const strokeColor = dynamic ? dynamicColor(value, target, color) : color;
    return (_jsxs("div", { className: "flex flex-col items-center w-full", children: [_jsxs("svg", { viewBox: "0 0 200 130", className: `w-full ${compact ? "max-w-[200px]" : "max-w-[260px]"}`, children: [_jsx("path", { d: PATH, fill: "none", stroke: dark ? "#1e3a5f" : "#e2e8f0", strokeWidth: "16", strokeLinecap: "round" }), frac > 0.001 && (_jsx("path", { d: PATH, fill: "none", stroke: strokeColor, strokeWidth: "16", strokeLinecap: "round", strokeDasharray: `${frac * LEN} ${LEN}` })), _jsx("circle", { cx: tx, cy: ty, r: "5", fill: "#0f172a", stroke: "#fff", strokeWidth: "1.5" }), _jsx("line", { x1: CX, y1: CY, x2: nx, y2: ny, stroke: "#0f172a", strokeWidth: "2.5", strokeLinecap: "round" }), _jsx("circle", { cx: CX, cy: CY, r: "6", fill: "#0f172a" })] }), _jsx("p", { className: `${compact ? "text-xl" : "text-2xl"} font-bold tabular-nums -mt-1 ${dark ? "text-white" : ""}`, children: fmt(value) }), _jsxs("p", { className: "text-sm font-semibold", style: { color: strokeColor }, children: ["Meta: ", fmt(target)] })] }));
}
