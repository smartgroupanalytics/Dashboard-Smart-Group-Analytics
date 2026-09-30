import React from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

function barColor(v) {
  if (v >= 80) return "#34d399";
  if (v >= 50) return "#fbbf24";
  return "#f43f5e";
}

export default function ProdutividadeChart({ data }) {
  const chartData = data.map((d) => ({
    maquina: d.maquina,
    produtividade: d.metrics.produtividade * 100,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
      className="rounded-xl bg-gradient-to-br from-[#0f3563] to-[#1c528f] border border-white/10 shadow-lg p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="w-1 h-5 rounded-full bg-blue-400" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wider drop-shadow">
          Produtividade por Máquina (%)
        </h3>
      </div>
      <div className="w-full h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 24, right: 16, bottom: 8, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="maquina"
              tick={{ fill: "#cbd5e1", fontSize: 11, fontWeight: 600 }}
              axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
              tickLine={false}
              interval={0}
            />
            <YAxis
              tick={{ fill: "#cbd5e1", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
              tickLine={false}
              tickFormatter={(v) => `${v.toFixed(0)}%`}
              domain={[0, "auto"]}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              contentStyle={{
                background: "#0a2540",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 8,
                color: "#fff",
              }}
              labelStyle={{ color: "#93c5fd", fontWeight: 700 }}
              formatter={(v) => `${Number(v).toFixed(1).replace(".", ",")}%`}
            />
            <Bar dataKey="produtividade" name="Produtividade" radius={[6, 6, 0, 0]} maxBarSize={70}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={barColor(entry.produtividade)} />
              ))}
              <LabelList
                dataKey="produtividade"
                position="top"
                offset={8}
                fill="#e2e8f0"
                fontSize={13}
                fontWeight={800}
                formatter={(v) => `${Number(v).toFixed(1).replace(".", ",")}%`}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}