import React from "react";
import { motion } from "framer-motion";

const ACCENTS = {
  blue: { border: "#3b82f6", text: "text-blue-700", glow: "rgba(59,130,246,0.15)" },
  teal: { border: "#14b8a6", text: "text-teal-700", glow: "rgba(20,184,166,0.15)" },
  green: { border: "#22c55e", text: "text-emerald-700", glow: "rgba(34,197,94,0.15)" },
};

export default function RotatividadeKpiCard({ title, value, unit, icon: Icon, accent = "blue", index = 0 }) {
  const a = ACCENTS[accent] || ACCENTS.blue;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      className="relative rounded-xl overflow-hidden bg-gradient-to-br from-white via-slate-50 to-slate-100 border border-slate-300 shadow-sm flex flex-col"
    >
      <div className="h-1" style={{ background: a.border }} />
      <div className="px-3 py-2.5 flex items-center justify-center text-center gap-3 flex-1">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: a.glow }}
        >
          {Icon && <Icon className="w-5 h-5" style={{ color: a.border }} />}
        </div>
        <div className="flex flex-col items-start text-left">
          <p className={`text-[10px] font-bold uppercase tracking-wide ${a.text} leading-none`}>{title}</p>
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums leading-tight mt-0.5">{value}</p>
          {unit && <p className="text-[10px] text-slate-500 leading-none mt-0.5">{unit}</p>}
        </div>
      </div>
    </motion.div>
  );
}