import React from "react";
import { motion } from "framer-motion";

const LINHAS = [
  { label: "Rotatividade Máq.", field: "rotatividade", unit: "m" },
  { label: "Tempo de Setup", field: "tempo_setup", unit: "min" },
  { label: "Tempo Produtivo", field: "tempo_producao", unit: "min" },
  { label: "Dias Necessários", field: "dias_necessarios", unit: "dias", highlight: true },
];

function fmt(n) {
  return (n || 0).toLocaleString("pt-BR");
}

export default function MaquinaComparativoTable({ maquinas = [] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.45 }}
      className="relative overflow-hidden rounded-2xl border border-teal-500/30 bg-white shadow-[0_2px_16px_-4px_rgba(0,121,140,0.25)]"
    >
      <div className="absolute top-0 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />
      <div className="px-4 py-2 border-b border-teal-500/20">
        <h3 className="text-sm font-extrabold text-teal-900 tracking-tight uppercase">
          Comparativo por Máquina
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-teal-50">
              <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider text-teal-900 font-extrabold">
                Parâmetro
              </th>
              {maquinas.map((m) => (
                <th key={m.id || m.maquina} className="px-4 py-2.5 text-right text-[11px] uppercase tracking-wider text-teal-900 font-extrabold">
                  {m.maquina}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LINHAS.map((linha) => (
              <tr
                key={linha.label}
                className={`border-t border-teal-500/10 ${linha.highlight ? "bg-teal-50/50" : ""}`}
              >
                <td className="px-4 py-1.5 text-sm text-slate-800 font-medium">
                  {linha.label}
                </td>
                {maquinas.map((m) => (
                  <td key={m.id || m.maquina} className="px-4 py-1.5 text-right">
                    <span className={`tabular-nums font-bold ${linha.highlight ? "text-teal-900 text-base" : "text-black"}`}>
                      {fmt(m[linha.field])}
                    </span>
                    <span className="text-[9px] text-black/60 ml-0.5">{linha.unit}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}