import React from "react";
import { motion } from "framer-motion";
import { Cog, RotateCw, Clock, ClipboardList, CalendarClock } from "lucide-react";

function fmtNum(v, dec = 0) {
  if (v == null || isNaN(v)) return "—";
  return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtHoras(min) {
  if (!min && min !== 0) return "—";
  return fmtNum(min / 60, 1) + "h";
}

export default function CargaMaquinaCard({ record, index, maxDias }) {
  const pct = maxDias > 0 ? Math.min((record.dias_necessarios / maxDias) * 100, 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow ring-1 ring-teal-100"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
            <Cog className="w-5 h-5 text-[#008B8B]" />
          </div>
          <h3 className="text-base font-bold text-slate-900 truncate">{record.maquina}</h3>
        </div>
      </div>

      {/* Dias Necessários — destaque */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
            <CalendarClock className="w-3.5 h-3.5" /> Dias Necessários
          </span>
          <span className="text-2xl font-extrabold text-[#008B8B] tabular-nums">
            {fmtNum(record.dias_necessarios, 1)}
            <span className="text-sm font-medium text-slate-400 ml-1">dias</span>
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, delay: 0.2 + index * 0.05 }}
            className="h-full rounded-full bg-[#008B8B]"
          />
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
        <div className="text-center">
          <RotateCw className="w-4 h-4 text-slate-400 mx-auto mb-1" />
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Rotatividade</p>
          <p className="text-sm font-bold text-slate-900 tabular-nums">{fmtNum(record.rotatividade, 0)}</p>
        </div>
        <div className="text-center">
          <Clock className="w-4 h-4 text-amber-500 mx-auto mb-1" />
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Setup</p>
          <p className="text-sm font-bold text-amber-600 tabular-nums">{fmtHoras(record.tempo_setup)}</p>
        </div>
        <div className="text-center">
          <ClipboardList className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Produção</p>
          <p className="text-sm font-bold text-emerald-700 tabular-nums">{fmtHoras(record.tempo_producao)}</p>
        </div>
      </div>
    </motion.div>
  );
}