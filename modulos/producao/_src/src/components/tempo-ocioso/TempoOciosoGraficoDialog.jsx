const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import { MESES } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";

const TEAL = "#00798c";
const TEAL_LIGHT = "#36aaa8";

function fmtPct(v) {
  return `${(v || 0).toFixed(2).replace(".", ",")}%`;
}

export default function TempoOciosoGraficoDialog({ open, onOpenChange }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const data = await db.entities.TempoOcioso.list("-data", 5000);
        if (active) setRecords(data || []);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [open]);

  const chartData = useMemo(() => {
    const map = {};
    for (const r of records) {
      if (!r.data) continue;
      const m = parseInt(String(r.data).split("-")[1], 10);
      if (!m) continue;
      if (!map[m]) map[m] = { tempo_ocioso: 0, tempo_disponivel: 0 };
      map[m].tempo_ocioso += r.tempo_ocioso || 0;
      map[m].tempo_disponivel += r.tempo_disponivel || 0;
    }
    return MESES.map((m) => {
      const v = map[m.value] || { tempo_ocioso: 0, tempo_disponivel: 0 };
      const pct = v.tempo_disponivel > 0 ? (v.tempo_ocioso / v.tempo_disponivel) * 100 : 0;
      return { mes: m.label, pct: Number(pct.toFixed(2)) };
    });
  }, [records]);

  const mediaGeral = useMemo(() => {
    const comDados = chartData.filter((d) => d.pct > 0);
    if (!comDados.length) return 0;
    return comDados.reduce((s, d) => s + d.pct, 0) / comDados.length;
  }, [chartData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#12343b]">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00798c] to-[#36aaa8] grid place-items-center text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="8"/><rect x="12" y="6" width="3" height="12"/><rect x="17" y="13" width="3" height="5"/></svg>
            </span>
            Gráfico — % Tempo Ocioso por Mês
          </DialogTitle>
          <DialogDescription>
            Percentual geral de tempo ocioso de cada mês (JAN a DEZ).
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 px-1 pb-1">
          <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Média geral</span>
            <span className="text-lg font-extrabold text-[#00798c] tabular-nums">{fmtPct(mediaGeral)}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4" style={{ height: 380 }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-[#00798c] rounded-full animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 24, right: 12, left: -8, bottom: 4 }}>
                <defs>
                  <linearGradient id="barOcioso" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TEAL_LIGHT} />
                    <stop offset="100%" stopColor={TEAL} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fontWeight: 700, fill: "#475569" }} axisLine={{ stroke: "#cbd5e1" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(0,121,140,0.06)" }}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 8px 24px rgba(15,23,42,0.12)", fontSize: 13 }}
                  formatter={(v) => [fmtPct(v), "% Ocioso"]}
                />
                <Bar dataKey="pct" radius={[8, 8, 0, 0]} maxBarSize={48}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill="url(#barOcioso)" />
                  ))}
                  <LabelList dataKey="pct" position="top" formatter={(v) => (v > 0 ? fmtPct(v) : "")} style={{ fontSize: 10, fontWeight: 700, fill: "#475569" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}