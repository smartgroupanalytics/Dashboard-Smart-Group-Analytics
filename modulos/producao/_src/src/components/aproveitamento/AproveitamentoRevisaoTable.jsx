const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useEffect, useMemo, useState } from "react";

import { ClipboardCheck, Loader2 } from "lucide-react";
import { tempoRealHoras } from "@/lib/controleSpeed";

const fmtNum = (v) => (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Converte valor decimal (H.MM) para formato de horas HH:MM (ex.: 2.28 → "2:28")
const fmtHora = (v) => {
  if (!v || v === 0) return "—";
  const h = Math.floor(v);
  const m = Math.round((v - h) * 100);
  let hh = h + (m >= 60 ? 1 : 0);
  let mm = m % 60;
  return `${hh}:${String(mm).padStart(2, "0")}`;
};

export default function AproveitamentoRevisaoTable({ selectedDays, controleRecords = [], aproveitamentoRecords = [] }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const all = await db.entities.DetalheRevisaoOP.list("data", 3000);
        const filtered = selectedDays.length > 0 ? all.filter((r) => r.data && selectedDays.includes(r.data)) : all;
        if (active) setRows(filtered);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [selectedDays.join(",")]);

  // Mapa de tempo previsto por OP (vindo do AproveitamentoOP)
  const previstoPorOp = useMemo(() => {
    const map = {};
    aproveitamentoRecords.forEach((r) => {
      if (r.num_op) {
        const prev = map[r.num_op] || 0;
        map[r.num_op] = Math.max(prev, r.tempo_previsto || 0);
      }
    });
    return map;
  }, [aproveitamentoRecords]);

  // Mapa de tempo realizado por OP (vindo do ControleEficiencia, soma das máquinas, sem retrabalho)
  const realizadoPorOp = useMemo(() => {
    const map = {};
    controleRecords.forEach((r) => {
      if (r.num_op && !r.is_retrabalho) {
        const t = r.tempo > 0 ? r.tempo : tempoRealHoras(r.hora_inicial, r.hora_final);
        map[r.num_op] = (map[r.num_op] || 0) + (t || 0);
      }
    });
    return map;
  }, [controleRecords]);

  const totals = useMemo(() => rows.reduce((acc, r) => {
    const prev = previstoPorOp[r.op] || 0;
    const real = realizadoPorOp[r.op] || 0;
    return {
      qtd_revisada: acc.qtd_revisada + (r.qtd_revisada || 0),
      qtd_refugo: acc.qtd_refugo + (r.qtd_refugo || 0),
      tempo_previsto: acc.tempo_previsto + prev,
      tempo_realizado: acc.tempo_realizado + real,
    };
  }, { qtd_revisada: 0, qtd_refugo: 0, tempo_previsto: 0, tempo_realizado: 0 }), [rows, previstoPorOp, realizadoPorOp]);

  return (
    <div className="bg-white/80 border border-slate-300 rounded-[14px] shadow-sm overflow-hidden backdrop-blur-[10px]">
      <div className="px-5 py-3 border-b border-slate-300 bg-slate-100/80 flex items-center gap-2">
        <ClipboardCheck className="w-4 h-4 text-indigo-600" />
        <h2 className="text-xs uppercase tracking-[0.11em] font-bold text-slate-700">OPs Revisadas (Revisão)</h2>
        <span className="ml-auto text-[11px] text-slate-500 font-medium">{rows.length} OPs</span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500 py-6 text-center">Nenhuma OP revisada encontrada para o período selecionado.</p>
      ) : (
        <div className="overflow-auto max-h-[420px]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-700 text-white">
                <th className="px-2 py-2.5 text-left font-semibold whitespace-nowrap">OP</th>
                <th className="px-2 py-2.5 text-left font-semibold whitespace-nowrap">Descrição</th>
                <th className="px-2 py-2.5 text-right font-semibold whitespace-nowrap">Metragem Revisada</th>
                <th className="px-2 py-2.5 text-right font-semibold whitespace-nowrap">Quebra (Refugo)</th>
                <th className="px-2 py-2.5 text-right font-semibold whitespace-nowrap">Tempo Previsto (h)</th>
                <th className="px-2 py-2.5 text-right font-semibold whitespace-nowrap">Tempo Realizado (h)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const tPrev = previstoPorOp[r.op] || 0;
                const tReal = realizadoPorOp[r.op] || 0;
                return (
                  <tr key={r.id || i} className="border-b border-slate-200 hover:bg-slate-50 transition-colors even:bg-slate-50/50">
                    <td className="px-2 py-2 text-slate-800 font-bold whitespace-nowrap">{r.op}</td>
                    <td className="px-2 py-2 text-slate-600 max-w-[220px] truncate" title={r.descricao}>{r.descricao || "—"}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-slate-700 whitespace-nowrap">{fmtNum(r.qtd_revisada)}</td>
                    <td className={`px-2 py-2 text-right tabular-nums font-semibold whitespace-nowrap ${(r.qtd_refugo || 0) > 0 ? "text-rose-600" : "text-slate-400"}`}>{fmtNum(r.qtd_refugo)}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-slate-700 whitespace-nowrap">{fmtHora(tPrev)}</td>
                    <td className={`px-2 py-2 text-right tabular-nums font-semibold whitespace-nowrap ${tReal > 0 ? "text-indigo-700" : "text-slate-400"}`}>{fmtHora(tReal)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-200 font-bold border-t-2 border-slate-400">
                <td colSpan={2} className="px-2 py-2 text-slate-800 uppercase text-[11px] tracking-wide">Total</td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-800 whitespace-nowrap">{fmtNum(totals.qtd_revisada)}</td>
                <td className="px-2 py-2 text-right tabular-nums text-rose-700 whitespace-nowrap">{fmtNum(totals.qtd_refugo)}</td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-800 whitespace-nowrap">{fmtHora(totals.tempo_previsto)}</td>
                <td className="px-2 py-2 text-right tabular-nums text-indigo-800 whitespace-nowrap">{fmtHora(totals.tempo_realizado)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}