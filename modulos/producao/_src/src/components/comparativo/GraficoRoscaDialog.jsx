import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { ArrowDownToLine, ArrowUpFromLine, Percent, TrendingUp, TrendingDown } from "lucide-react";
import { fmtMeters } from "@/lib/format";

export default function GraficoRoscaDialog({ open, onOpenChange, chartData, totals }) {
  const rows = useMemo(() => [...chartData].sort((a, b) => a.data.localeCompare(b.data)), [chartData]);

  const donutData = useMemo(() => {
    const entrada = totals.jumpados || 0;
    const saida = totals.revisados || 0;
    const total = entrada + saida;
    const entradaPct = total > 0 ? (entrada / total) * 100 : 0;
    const saidaPct = total > 0 ? (saida / total) * 100 : 0;
    return { entrada, saida, total, entradaPct, saidaPct };
  }, [totals]);

  // Geometria do gráfico circular intercalado (5 segmentos em espiral)
  const CX = 140;
  const CY = 140;

  const polar = (cx, cy, r, deg) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };
  const arcPath = (cx, cy, r, startDeg, sweepDeg) => {
    const endDeg = startDeg + sweepDeg;
    const s = polar(cx, cy, r, startDeg);
    const e = polar(cx, cy, r, endDeg);
    const large = sweepDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const total = donutData.entrada + donutData.saida;
  const entradaSweep = total > 0 ? (donutData.entrada / total) * 360 : 0;
  const saidaSweep = total > 0 ? (donutData.saida / total) * 360 : 0;

  const SEGMENTS = total > 0 ? [
    { start: 0, sweep: entradaSweep, radius: 108, gradientId: "grad-entrada" },
    { start: entradaSweep, sweep: saidaSweep, radius: 108, gradientId: "grad-saida" },
  ] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Percent className="w-5 h-5 text-purple-600" />
            Gráfico de Comparativo
          </DialogTitle>
          <DialogDescription>
            Visão geral da Entrada vs Saída da semana selecionada
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
          {/* Gráfico de Rosca Moderno */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="relative flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-5 border border-slate-200"
          >
            <div className="relative" style={{ width: 380, height: 380 }}>
              <svg width="380" height="380" viewBox="0 0 280 280">
                <defs>
                  <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <linearGradient id="grad-entrada" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1e3a8a" />
                    <stop offset="50%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                  <linearGradient id="grad-saida" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#059669" />
                    <stop offset="50%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                  <radialGradient id="grad-inner" cx="50%" cy="40%" r="60%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#f1f5f9" />
                  </radialGradient>
                  <filter id="emboss" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="1.2" result="blur" />
                    <feSpecularLighting result="spec" specularExponent="18" lightingColor="#ffffff">
                      <fePointLight x="140" y="70" z="180" />
                    </feSpecularLighting>
                    <feComposite in="spec" in2="SourceAlpha" operator="in" result="specCut" />
                    <feMerge>
                      <feMergeNode in="SourceGraphic" />
                      <feMergeNode in="specCut" />
                      <feMergeNode in="blur" />
                    </feMerge>
                  </filter>
                  <filter id="inner-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" />
                    <feOffset dx="0" dy="2" />
                    <feComponentTransfer>
                      <feFuncA type="linear" slope="0.5" />
                    </feComponentTransfer>
                    <feMerge>
                      <feMergeNode />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <radialGradient id="halo-grad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#e2e8f0" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Halo de fundo para profundidade */}
                <circle cx={CX} cy={CY} r={120} fill="url(#halo-grad)" opacity="0.35" />

                {/* Base escura sob os segmentos (relevo) */}
                <circle cx={CX} cy={CY} r={108} fill="none" stroke="#0f172a" strokeWidth={36} strokeLinecap="round" opacity="0.12" />

                {/* Segmentos circulares com degradê e alto relevo */}
                {SEGMENTS.map((seg, i) => (
                  <motion.path
                    key={i}
                    d={arcPath(CX, CY, seg.radius, seg.start, seg.sweep)}
                    fill="none"
                    stroke={`url(#${seg.gradientId})`}
                    strokeWidth={32}
                    strokeLinecap="round"
                    filter="url(#emboss)"
                    initial={{ opacity: 0, pathLength: 0, rotate: -40 }}
                    animate={{ opacity: 1, pathLength: 1, rotate: 0 }}
                    style={{ transformOrigin: `${CX}px ${CY}px` }}
                    transition={{ duration: 0.7, delay: i * 0.12, ease: "easeOut" }}
                  />
                ))}

                {/* Brilho superior nos segmentos (highlight 3D) */}
                {SEGMENTS.map((seg, i) => (
                  <motion.path
                    key={`hl-${i}`}
                    d={arcPath(CX, CY, seg.radius + 6, seg.start + 4, Math.max(seg.sweep - 8, 2))}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={3}
                    strokeLinecap="round"
                    opacity={0.55}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.55 }}
                    transition={{ duration: 0.4, delay: 0.8 + i * 0.12 }}
                  />
                ))}

                {/* Círculo interno com relevo */}
                <circle cx={CX} cy={CY} r={56} fill="url(#grad-inner)" filter="url(#inner-shadow)" />
                <circle cx={CX} cy={CY} r={52} fill="none" stroke="#cbd5e1" strokeWidth="1.5" opacity="0.6" />
                <circle cx={CX} cy={CY} r={48} fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.9" />
              </svg>

              {/* Conteúdo central - Porcentagem */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                  className="text-center"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Excedente</p>
                  <p className={`text-4xl font-extrabold tabular-nums ${totals.taxa > 0 ? "text-emerald-600" : totals.taxa === 0 ? "text-amber-500" : "text-rose-600"}`}>
                    {totals.taxa > 0 ? `+${totals.taxa.toFixed(0)}` : `${totals.taxa.toFixed(0)}`}%
                  </p>
                  <p className={`text-sm font-extrabold tabular-nums mt-1 ${totals.diferenca > 0 ? "text-emerald-600" : totals.diferenca === 0 ? "text-amber-500" : "text-rose-600"}`}>
                    {totals.diferenca > 0 ? "+" : ""}{fmtMeters(totals.diferenca)}
                  </p>
                  <div className="flex items-center gap-1 justify-center mt-1">
                    {totals.taxa > 0 ? (
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                    )}
                    <span className="text-[10px] font-semibold text-slate-400">Entrada vs Saída</span>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Legenda */}
            <div className="flex items-center gap-5 mt-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-500 to-blue-900" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500">Entrada</p>
                  <p className="text-sm font-extrabold text-blue-700 tabular-nums">{fmtMeters(donutData.entrada)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-900" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500">Saída</p>
                  <p className="text-sm font-extrabold text-emerald-700 tabular-nums">{fmtMeters(donutData.saida)}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Detalhamento por Dia */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="flex flex-col gap-2"
          >
            <h3 className="text-sm font-bold text-slate-900 mb-1">Detalhamento da Semana</h3>
            <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-1">
              {rows.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Sem dados para o período.</p>
              ) : (
                rows.map((d, i) => {
                  const taxa = d.revisados > 0
                    ? ((d.jumpados - d.revisados) / d.revisados) * 100
                    : d.jumpados > 0 ? 100 : 0;
                  const total = d.jumpados + d.revisados;
                  const entradaPct = total > 0 ? (d.jumpados / total) * 100 : 0;
                  const saidaPct = total > 0 ? (d.revisados / total) * 100 : 0;
                  return (
                    <motion.div
                      key={d.data}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: 0.1 + i * 0.04 }}
                      className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700">{d.label}</span>
                        <span className={`text-xs font-extrabold tabular-nums ${taxa > 0 ? "text-emerald-600" : taxa === 0 ? "text-amber-600" : "text-rose-600"}`}>
                          {taxa > 0 ? `+${taxa.toFixed(0)}%` : `${taxa.toFixed(0)}%`}
                        </span>
                      </div>
                      {/* Barra dupla */}
                      <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-700"
                          style={{ width: `${entradaPct}%` }}
                        />
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-700"
                          style={{ width: `${saidaPct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1.5 text-[11px]">
                        <span className="flex items-center gap-1 text-blue-700 font-semibold">
                          <ArrowDownToLine className="w-3 h-3" />
                          {fmtMeters(d.jumpados)}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                          <ArrowUpFromLine className="w-3 h-3" />
                          {fmtMeters(d.revisados)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Totais gerais */}
            <div className="mt-2 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 text-white p-3">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-[9px] uppercase font-bold text-white/60">Total Entrada</p>
                  <p className="text-base font-extrabold tabular-nums">{fmtMeters(totals.jumpados)}</p>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div className="text-center flex-1">
                  <p className="text-[9px] uppercase font-bold text-white/60">Total Saída</p>
                  <p className="text-base font-extrabold tabular-nums">{fmtMeters(totals.revisados)}</p>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div className="text-center flex-1">
                  <p className="text-[9px] uppercase font-bold text-white/60">Diferença</p>
                  <p className="text-base font-extrabold tabular-nums">{fmtMeters(totals.diferenca)}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}