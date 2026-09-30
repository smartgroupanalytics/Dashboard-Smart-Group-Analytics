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
  if (points.length < 2) return "";
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

export default function HorizontalPentagonalBarChart({ data, labelKey, valueKey, height = 420, maxItems = 10 }) {
  const rawId = useId();
  const uid = rawId.replace(/:/g, "");

  const items = useMemo(() => {
    const sorted = [...data].sort((a, b) => (b[valueKey] || 0) - (a[valueKey] || 0));
    return sorted.slice(0, maxItems);
  }, [data, valueKey, maxItems]);

  const W = 820;
  const H = height;
  const PAD = { top: 15, right: 65, bottom: 15, left: 150 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const startX = PAD.left;

  const maxValue = Math.max(...items.map((d) => d[valueKey] || 0), 1);
  const barCount = items.length || 1;
  const slotH = chartH / barCount;
  const barH = Math.min(slotH * 0.55, 34);
  const peakW = Math.min(barH * 0.4, 13);
  const cornerR = Math.min(5, barH * 0.15);

  const bars = items.map((d, i) => {
    const value = d[valueKey] || 0;
    const barW = (value / maxValue) * (chartW - peakW - 10);
    const totalW = barW + peakW;
    const tipX = startX + totalW;
    const bodyEndX = startX + barW;
    const y = PAD.top + slotH * i + (slotH - barH) / 2;
    const centerY = y + barH / 2;
    const color = PALETTE[i % PALETTE.length];
    const label = String(d[labelKey] || "");
    const truncated = label.length > 18 ? label.slice(0, 17) + "…" : label;
    return { y, centerY, tipX, bodyEndX, barW, totalW, value, color, label, truncated };
  });

  const trendPoints = bars.map((b) => ({ x: b.tipX, y: b.centerY }));
  const trendPath = bars.length >= 2 ? smoothPath(trendPoints) : "";
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => startX + chartW * f);

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-400 text-sm" style={{ height }}>
        Sem dados
      </div>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
      <defs>
        {PALETTE.map((c, i) => (
          <linearGradient key={i} id={`hg-${uid}-${i}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={c.light} />
            <stop offset="100%" stopColor={c.dark} />
          </linearGradient>
        ))}
      </defs>

      {/* Vertical grid lines */}
      {gridLines.map((x, i) => (
        <line key={i} x1={x} y1={PAD.top} x2={x} y2={H - PAD.bottom} stroke="#EFEFEF" strokeWidth={1} />
      ))}

      {/* Left baseline */}
      <line x1={startX} y1={PAD.top} x2={startX} y2={H - PAD.bottom} stroke="#9ca3af" strokeWidth={1.5} />

      {/* Horizontal pentagonal bars with rounded left corners */}
      {bars.map((b, i) => {
        const gradId = `hg-${uid}-${i % PALETTE.length}`;
        const { y, tipX, bodyEndX, centerY } = b;
        const path = [
          `M ${startX + cornerR} ${y}`,
          `Q ${startX} ${y} ${startX} ${y + cornerR}`,
          `L ${startX} ${y + barH - cornerR}`,
          `Q ${startX} ${y + barH} ${startX + cornerR} ${y + barH}`,
          `L ${bodyEndX} ${y + barH}`,
          `L ${tipX} ${centerY}`,
          `L ${bodyEndX} ${y}`,
          "Z",
        ].join(" ");
        return <path key={i} d={path} fill={`url(#${gradId})`} />;
      })}

      {/* Trend line */}
      {trendPath && (
        <path d={trendPath} fill="none" stroke="#C4C4C4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* Trend dots */}
      {bars.map((b, i) => (
        <circle
          key={i}
          cx={b.tipX}
          cy={b.centerY}
          r={4 + (i % 3) * 1.5}
          fill={PALETTE[i % PALETTE.length].solid}
          stroke="#fff"
          strokeWidth={2}
        />
      ))}

      {/* Value labels to the right of bar tips */}
      {bars.map((b, i) => (
        <text
          key={i}
          x={b.tipX + 12}
          y={b.centerY + 5}
          textAnchor="start"
          fontSize={15}
          fontWeight={700}
          fill={PALETTE[i % PALETTE.length].solid}
        >
          {b.value > 0 ? `+${b.value}` : "0"}
        </text>
      ))}

      {/* Category badges on the left */}
      {bars.map((b, i) => {
        const color = PALETTE[i % PALETTE.length];
        const badgeW = 130;
        const badgeH = Math.min(barH + 4, 26);
        const badgeX = 8;
        const badgeY = b.centerY - badgeH / 2;
        return (
          <g key={i}>
            <rect x={badgeX} y={badgeY} width={badgeW} height={badgeH} rx={6} fill={color.solid} />
            <text x={badgeX + badgeW / 2} y={b.centerY + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill="#fff">
              <title>{b.label}</title>
              {b.truncated}
            </text>
          </g>
        );
      })}
    </svg>
  );
}