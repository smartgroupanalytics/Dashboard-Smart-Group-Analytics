import React from "react";

const TEAL = "#008785";
const LIGHT_CYAN = "#5CB3B0";

export default function RadialGauge({ label, value, max = 100, index = 0, subValue }) {
  const pct = Math.min((value / max) * 100, 100);
  const radius = 42;
  const circumference = Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  const gradId = `gauge-grad-${index}`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full" style={{ maxWidth: 200 }}>
        <svg viewBox="0 0 100 56" className="w-full">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={TEAL} />
              <stop offset="100%" stopColor={LIGHT_CYAN} />
            </linearGradient>
          </defs>
          <path
            d="M 8 50 A 42 42 0 0 1 92 50"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M 8 50 A 42 42 0 0 1 92 50"
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {pct.toFixed(0).replace(".", ",")}%
          </span>
        </div>
      </div>
      <span className="text-sm text-slate-600 font-semibold uppercase tracking-wide mt-1">{label}</span>
      {subValue != null && (
        <span className="text-base font-bold text-slate-900 tabular-nums mt-0.5">{subValue.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} m</span>
      )}
    </div>
  );
}