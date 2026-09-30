import React from "react";
import { motion } from "framer-motion";
import { Cog } from "lucide-react";

function pctColor(v) {
  if (v >= 0.8) return "text-emerald-600";
  if (v >= 0.5) return "text-amber-600";
  return "text-rose-600";
}

function inopColor(v) {
  if (v >= 0.3) return "text-rose-600";
  if (v >= 0.15) return "text-amber-600";
  return "text-emerald-600";
}

function fmtPct(v) {
  return `${(v * 100).toFixed(1).replace(".", ",")}%`;
}

const METAS = {
  JR: 92,
  Gravadora: 94,
  "Estampa 1": 75,
  "Estampa 2": 80,
  "GR 2": 50,
  "Digital UV": 50,
  "Digital Solvente": 50,
  "GR 3": 50,
};

export default function ProdutividadeMachineCard({ maquina, metrics, index }) {
  const { produtividade, utilizacao, eficiencia_producao, eficiencia_setup, maquina_inoperante } = metrics;
  const normalize = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const metaKey = Object.keys(METAS).find((k) => normalize(k) === normalize(maquina));
  const meta = metaKey ? METAS[metaKey] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="rounded-xl bg-gradient-to-br from-white via-slate-50 to-slate-100 border-2 border-slate-400 p-3 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-1.5 mb-2">
        <div className="p-1 rounded-md bg-slate-100">
          <Cog className="w-3.5 h-3.5 text-slate-600" />
        </div>
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">{maquina}</h4>
      </div>

      {/* Produtividade - destacado */}
      <div className="rounded-lg bg-blue-50 border-2 border-slate-300 p-4 mb-3 text-center">
        <p className="text-[11px] text-black uppercase tracking-wider mb-1">Produtividade</p>
        <p className={`text-3xl font-extrabold ${
          meta != null
            ? (() => {
                const diff = produtividade * 100 - meta;
                return diff < -0.5 ? "text-red-600" : diff > 0.5 ? "text-emerald-600" : "text-amber-600";
              })()
            : pctColor(produtividade)
        }`}>{fmtPct(produtividade)}</p>
        {meta != null && (
          <p className="text-sm font-bold text-black mt-1">Meta: {meta}%</p>
        )}
      </div>

      {/* Outras métricas */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-slate-50 border-2 border-slate-300 p-2.5">
          <p className="text-[11px] text-black font-bold uppercase tracking-wide">Utilização</p>
          <p className={`text-lg font-bold ${pctColor(utilizacao)}`}>{fmtPct(utilizacao)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 border-2 border-slate-300 p-2.5">
          <p className="text-[11px] text-black font-bold uppercase tracking-wide">Efic. Produção</p>
          <p className={`text-lg font-bold ${pctColor(eficiencia_producao)}`}>{fmtPct(eficiencia_producao)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 border-2 border-slate-300 p-2.5">
          <p className="text-[11px] text-black font-bold uppercase tracking-wide">Efic. Setup</p>
          <p className={`text-lg font-bold ${pctColor(eficiencia_setup)}`}>{fmtPct(eficiencia_setup)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 border-2 border-slate-300 p-2.5">
          <p className="text-[11px] text-black font-bold uppercase tracking-wide">Inoperante</p>
          <p className={`text-lg font-bold ${inopColor(maquina_inoperante)}`}>{fmtPct(maquina_inoperante)}</p>
        </div>
      </div>
    </motion.div>
  );
}