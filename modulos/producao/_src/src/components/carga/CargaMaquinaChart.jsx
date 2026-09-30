import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-slate-900 mb-1">{d.maquina}</p>
      <p className="text-slate-600">Dias Necessários: <span className="font-bold text-slate-900">{d.dias_necessarios.toFixed(1)}</span></p>
    </div>
  );
}

export default function CargaMaquinaChart({ data }) {
  if (!data || data.length === 0) return null;
  const sorted = [...data].sort((a, b) => b.dias_necessarios - a.dias_necessarios);
  const maxVal = Math.max(...sorted.map((d) => d.dias_necessarios), 1);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-bold text-white uppercase tracking-wide px-3 py-2 rounded-lg bg-[#008B8B] inline-block mb-4">Dias por Máquina</h3>
      <ResponsiveContainer width="100%" height={Math.max(220, sorted.length * 48)}>
        <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 8 }}>
          <defs>
            <linearGradient id="barTealAmber" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#008B8B" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#cbd5e1" }} />
          <YAxis type="category" dataKey="maquina" tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} width={110} axisLine={{ stroke: "#cbd5e1" }} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9" }} />
          <Bar dataKey="dias_necessarios" radius={[0, 6, 6, 0]} barSize={28} fill="url(#barTealAmber)">
            <LabelList dataKey="dias_necessarios" position="right" formatter={(v) => Number(v).toFixed(1)} style={{ fontSize: 12, fontWeight: 700, fill: "#334155" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}