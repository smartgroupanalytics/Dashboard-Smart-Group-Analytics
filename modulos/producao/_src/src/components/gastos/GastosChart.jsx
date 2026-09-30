import React from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

function fmtBRL(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-white border border-slate-200 shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-slate-900 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-semibold" style={{ color: p.color }}>
          {p.dataKey}: {fmtBRL(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function GastosChart({ dados }) {
  const chartData = [
    {
      name: "Folha Industrial",
      Orçado: dados.folha_industrial?.orcado || 0,
      "2025": dados.folha_industrial?.valor_2025 || 0,
      "2026": dados.folha_industrial?.valor_2026 || 0,
    },
    {
      name: "Manutenção",
      Orçado: dados.manutencao?.orcado || 0,
      "2025": dados.manutencao?.valor_2025 || 0,
      "2026": dados.manutencao?.valor_2026 || 0,
    },
    {
      name: "Resíduos e Rejeitos",
      Orçado: dados.residuos_rejeitos?.orcado || 0,
      "2025": dados.residuos_rejeitos?.valor_2025 || 0,
      "2026": dados.residuos_rejeitos?.valor_2026 || 0,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.45 }}
      className="rounded-2xl bg-white border border-slate-100 shadow-[0_2px_20px_-6px_rgba(30,58,138,0.12)] p-5"
    >
      <div className="mb-4">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">Orçado vs 2025 vs 2026 por categoria</h3>
        <p className="text-[11px] text-slate-700 font-semibold">Comparativo dos valores realizados</p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtBRL(v)} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
          <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingTop: 8 }} />
          <Bar dataKey="Orçado" fill="#1e3a8a" radius={[4, 4, 0, 0]} maxBarSize={48} />
          <Bar dataKey="2025" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={48} />
          <Bar dataKey="2026" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}