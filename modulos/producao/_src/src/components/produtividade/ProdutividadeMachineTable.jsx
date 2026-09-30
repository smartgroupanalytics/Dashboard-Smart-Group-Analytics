import React from "react";
import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown } from "lucide-react";

function pctColor(v) {
  if (v >= 0.8) return "#059669";
  if (v >= 0.5) return "#d97706";
  return "#dc2626";
}

function inopColor(v) {
  if (v >= 0.3) return "#dc2626";
  if (v >= 0.15) return "#d97706";
  return "#059669";
}

function fmtPct(v) {
  return `${(v * 100).toFixed(1).replace(".", ",")}%`;
}

// Metas por coluna (em %)
const METAS_COLUNAS = {
  utilizacao: 35,
  eficiencia_producao: 80,
  eficiencia_setup: 80,
  inoperante: 15, // lógica invertida (menor é melhor)
};

// Indicador de mãozinha: acima da meta = ThumbsUp verde,
// abaixo da meta = ThumbsDown vermelho, igual à meta = ThumbsUp amarelo.
// Para colunas invertidas (inoperante), inverte a lógica.
function ThumbsIndicator({ value, meta, inverted = false }) {
  const diff = value * 100 - meta;
  let Icon, color;
  if (Math.abs(diff) <= 0.5) {
    Icon = ThumbsUp;
    color = "#eab308"; // amarelo
  } else {
    const acima = diff > 0;
    const bom = inverted ? !acima : acima;
    if (bom) {
      Icon = ThumbsUp;
      color = "#059669"; // verde
    } else {
      Icon = ThumbsDown;
      color = "#dc2626"; // vermelho
    }
  }
  return <Icon className="w-4 h-4 shrink-0" style={{ color }} />;
}

const METAS = {
  JR: 92,
  Gravadora: 94,
  "Estampa 1": 75,
  "Estampa 2": 80,
  "GR 1": 50,
  "GR 2": 50,
  "Digital UV": 50,
  "Digital Solvente": 50,
  "Digital Sol": 50,
  "GR 3": 50,
};

function metaStatusColor(value, meta) {
  const diff = value * 100 - meta;
  if (diff < -0.5) return "#dc2626";
  if (diff > 0.5) return "#059669";
  return "#d97706";
}

// Cor do status dot da máquina (baseado na produtividade vs meta)
function machineStatusColor(value, meta) {
  const diff = value * 100 - meta;
  if (diff < -5) return "#dc2626"; // vermelho
  if (diff > 5) return "#059669"; // verde
  return "#d97706"; // âmbar
}

export default function ProdutividadeMachineTable({ machineData }) {
  const normalize = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, "").trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden"
    >
      <div className="px-5 py-2 border-b border-slate-200">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
          Relatório de Máquinas
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#1A3674]">
              <th className="text-left text-white text-xs font-bold uppercase tracking-wider px-4 py-2">Máquina</th>
              <th className="text-center text-white text-xs font-bold uppercase tracking-wider px-4 py-2">Produtividade</th>
              <th className="text-center text-white text-xs font-bold uppercase tracking-wider px-4 py-2">Utilização</th>
              <th className="text-center text-white text-xs font-bold uppercase tracking-wider px-4 py-2">Efic. Produção</th>
              <th className="text-center text-white text-xs font-bold uppercase tracking-wider px-4 py-2">Efic. Setup</th>
              <th className="text-center text-white text-xs font-bold uppercase tracking-wider px-4 py-2">Inoperante</th>
            </tr>
          </thead>
          <tbody>
            {machineData.map((m, i) => {
              const { produtividade, utilizacao, eficiencia_producao, eficiencia_setup, maquina_inoperante } = m.metrics;
              const metaKey = Object.keys(METAS).find((k) => normalize(k) === normalize(m.maquina));
              const meta = metaKey ? METAS[metaKey] : null;
              const metaColor = meta != null ? metaStatusColor(produtividade, meta) : pctColor(produtividade);
              const statusColor = meta != null ? machineStatusColor(produtividade, meta) : pctColor(produtividade);
              const rowBg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
              return (
                <tr key={m.maquina} style={{ background: rowBg }} className="border-t border-slate-200">
                  <td className="px-4 py-1.5 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: statusColor }}
                      />
                      <span className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        {m.maquina}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-1.5 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-2 justify-center">
                      <span className="text-base font-extrabold tabular-nums" style={{ color: metaColor }}>
                        {fmtPct(produtividade)}
                      </span>
                      {meta != null && (
                        <span
                          className="inline-flex items-center text-[11px] font-bold px-1 whitespace-nowrap"
                          style={{
                            color: "#1d4ed8",
                            background: "transparent",
                          }}
                        >
                          Meta: {meta}%
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 justify-center">
                      <span className="text-base font-extrabold tabular-nums" style={{ color: "#000000" }}>
                        {fmtPct(utilizacao)}
                      </span>
                      <ThumbsIndicator value={utilizacao} meta={METAS_COLUNAS.utilizacao} />
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 justify-center">
                      <span className="text-base font-extrabold tabular-nums" style={{ color: "#000000" }}>
                        {fmtPct(eficiencia_producao)}
                      </span>
                      <ThumbsIndicator value={eficiencia_producao} meta={METAS_COLUNAS.eficiencia_producao} />
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 justify-center">
                      <span className="text-base font-extrabold tabular-nums" style={{ color: "#000000" }}>
                        {fmtPct(eficiencia_setup)}
                      </span>
                      <ThumbsIndicator value={eficiencia_setup} meta={METAS_COLUNAS.eficiencia_setup} />
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 justify-center">
                      <span className="text-base font-extrabold tabular-nums" style={{ color: "#000000" }}>
                        {fmtPct(maquina_inoperante)}
                      </span>
                      <ThumbsIndicator value={maquina_inoperante} meta={METAS_COLUNAS.inoperante} inverted />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}