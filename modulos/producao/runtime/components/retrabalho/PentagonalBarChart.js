import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo, useId } from "react";
const PALETTE = [
    { light: "#FFC32D", dark: "#F49C16", solid: "#F49C16" },
    { light: "#FF5A8D", dark: "#F3356E", solid: "#F3356E" },
    { light: "#FF52D9", dark: "#E32FA8", solid: "#E32FA8" },
    { light: "#8C37F7", dark: "#6716CB", solid: "#6716CB" },
    { light: "#7417B3", dark: "#4D0A7C", solid: "#4D0A7C" },
    { light: "#06b6d4", dark: "#0891b2", solid: "#0891b2" },
    { light: "#10b981", dark: "#059669", solid: "#059669" },
    { light: "#3b82f6", dark: "#1d4ed8", solid: "#1d4ed8" },
];
function smoothPath(points) {
    if (points.length < 2)
        return "";
    const d = [`M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`];
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i - 1] || points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || p2;
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        d.push(`C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`);
    }
    return d.join(" ");
}
export default function PentagonalBarChart({ data, labelKey, valueKey, height = 320, maxItems = 8 }) {
    const rawId = useId();
    const uid = rawId.replace(/:/g, "");
    const items = useMemo(() => {
        const sorted = [...data].sort((a, b) => (b[valueKey] || 0) - (a[valueKey] || 0));
        return sorted.slice(0, maxItems);
    }, [data, valueKey, maxItems]);
    const W = 820;
    const H = height;
    const PAD = { top: 52, right: 20, bottom: 72, left: 20 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;
    const baselineY = PAD.top + chartH;
    const maxValue = Math.max(...items.map((d) => d[valueKey] || 0), 1);
    const barCount = items.length || 1;
    const slotWidth = chartW / barCount;
    const barWidth = Math.min(slotWidth * 0.5, 60);
    const peakHeight = Math.min(barWidth * 0.35, 20);
    const cornerR = Math.min(6, barWidth * 0.12);
    const bars = items.map((d, i) => {
        const value = d[valueKey] || 0;
        const barHeight = (value / maxValue) * (chartH - peakHeight - 10);
        const totalHeight = barHeight + peakHeight;
        const topY = baselineY - totalHeight;
        const bodyTopY = topY + peakHeight;
        const x = PAD.left + slotWidth * i + (slotWidth - barWidth) / 2;
        const centerX = x + barWidth / 2;
        const color = PALETTE[i % PALETTE.length];
        const label = String(d[labelKey] || "");
        const truncated = label.length > 12 ? label.slice(0, 11) + "…" : label;
        return { x, centerX, topY, bodyTopY, barHeight, totalHeight, value, color, label, truncated };
    });
    const trendPoints = bars.map((b) => ({ x: b.centerX, y: b.topY }));
    const trendPath = bars.length >= 2 ? smoothPath(trendPoints) : "";
    const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => PAD.top + chartH * f);
    if (items.length === 0) {
        return (_jsx("div", { className: "flex items-center justify-center text-slate-400 text-sm", style: { height }, children: "Sem dados" }));
    }
    return (_jsxs("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", height: height, preserveAspectRatio: "xMidYMid meet", style: { display: "block" }, children: [_jsx("defs", { children: PALETTE.map((c, i) => (_jsxs("linearGradient", { id: `pg-${uid}-${i}`, x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: c.light }), _jsx("stop", { offset: "100%", stopColor: c.dark })] }, i))) }), gridLines.map((y, i) => (_jsx("line", { x1: PAD.left, y1: y, x2: W - PAD.right, y2: y, stroke: "#EFEFEF", strokeWidth: 1 }, i))), _jsx("line", { x1: PAD.left, y1: baselineY, x2: W - PAD.right, y2: baselineY, stroke: "#9ca3af", strokeWidth: 1.5 }), bars.map((b, i) => {
                const gradId = `pg-${uid}-${i % PALETTE.length}`;
                const { x, centerX, topY, bodyTopY } = b;
                const right = x + barWidth;
                const path = [
                    `M ${x + cornerR} ${baselineY}`,
                    `Q ${x} ${baselineY} ${x} ${baselineY - cornerR}`,
                    `L ${x} ${bodyTopY}`,
                    `L ${centerX} ${topY}`,
                    `L ${right} ${bodyTopY}`,
                    `L ${right} ${baselineY - cornerR}`,
                    `Q ${right} ${baselineY} ${right - cornerR} ${baselineY}`,
                    "Z",
                ].join(" ");
                return _jsx("path", { d: path, fill: `url(#${gradId})` }, i);
            }), trendPath && (_jsx("path", { d: trendPath, fill: "none", stroke: "#C4C4C4", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" })), bars.map((b, i) => (_jsx("circle", { cx: b.centerX, cy: b.topY, r: 4 + (i % 3) * 1.5, fill: PALETTE[i % PALETTE.length].solid, stroke: "#fff", strokeWidth: 2 }, i))), bars.map((b, i) => (_jsx("text", { x: b.centerX, y: b.topY - 14, textAnchor: "middle", fontSize: 17, fontWeight: 700, fill: PALETTE[i % PALETTE.length].solid, children: b.value > 0 ? `+${b.value}` : "0" }, i))), bars.map((b, i) => {
                const color = PALETTE[i % PALETTE.length];
                const badgeW = Math.min(slotWidth * 0.82, 100);
                const badgeH = 22;
                const badgeX = b.centerX - badgeW / 2;
                const badgeY = baselineY + 10;
                return (_jsxs("g", { children: [_jsx("rect", { x: badgeX, y: badgeY, width: badgeW, height: badgeH, rx: 6, fill: color.solid }), _jsxs("text", { x: b.centerX, y: badgeY + badgeH / 2 + 4, textAnchor: "middle", fontSize: 11, fontWeight: 600, fill: "#fff", children: [_jsx("title", { children: b.label }), b.truncated] })] }, i));
            })] }));
}
