import React from "react";
import { motion } from "framer-motion";

// Donut gauge 3D em alto relevo com degradê azul futurista
function DonutGauge({ value, max = 7, label }) {
  const size = 120;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const offset = circ * (1 - pct);
  const gid = `gauge-grad-${label}-${value}`;
  const gidBg = `${gid}-bg`;
  const gidHi = `${gid}-hi`;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="35%" stopColor="#0ea5e9" />
            <stop offset="70%" stopColor="#0369a1" />
            <stop offset="100%" stopColor="#0c4a6e" />
          </linearGradient>
          <linearGradient id={gidBg} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(56,189,248,0.10)" />
            <stop offset="100%" stopColor="rgba(12,74,110,0.18)" />
          </linearGradient>
          <linearGradient id={gidHi} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.25)" />
          </linearGradient>
        </defs>
        {/* Trilho de fundo — relevo baixo */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${gidBg})`} strokeWidth={stroke} />
        {/* Sombra inferior do trilho (profundidade) */}
        <circle cx={size / 2} cy={size / 2 + 1.5} r={r} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth={stroke} />
        {/* Arco principal — degradê azul 3D */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          style={{ filter: "drop-shadow(0 1px 2px rgba(3,105,161,0.5)) drop-shadow(0 0 6px rgba(14,165,233,0.4))" }}
        />
        {/* Brilho superior — alto relevo */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gidHi})`}
          strokeWidth={stroke * 0.35}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          style={{ opacity: 0.6 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-[#0c4a6e] tabular-nums leading-none drop-shadow-sm">{Math.round(value)}</span>
        <span className="text-[8px] uppercase tracking-wider text-[#0369a1] mt-0.5 font-bold">{label}</span>
      </div>
    </div>
  );
}

function MiniStat({ label, value, unit }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] uppercase tracking-wider text-[#004d40] font-bold">{label}</span>
      <span className="text-sm font-bold text-[#004d40] tabular-nums">
        {Math.round(value).toLocaleString("pt-BR")}
        <span className="text-[9px] text-[#004d40] ml-0.5 font-semibold">{unit}</span>
      </span>
    </div>
  );
}

export default function MaquinaGaugeCard({ maquina, rotatividade, setup, produtivo, dias, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.45, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-[#b2dfdb] bg-[#f0fdf9] p-3 shadow-[0_2px_16px_-4px_rgba(0,121,140,0.25)]"
    >
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-[#00796b]/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-[#00796b]/40 to-transparent" />

      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-base font-extrabold text-[#004d40] tracking-tight">{maquina}</h3>
          <span className="text-[10px] uppercase tracking-wider text-[#004d40] font-bold">Estação</span>
        </div>
        <DonutGauge value={dias} label="dias" />
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#b2dfdb]">
        <MiniStat label="Rotativ." value={rotatividade} unit="m" />
        <MiniStat label="Setup" value={setup} unit="min" />
        <MiniStat label="Produt." value={produtivo} unit="min" />
      </div>
    </motion.div>
  );
}