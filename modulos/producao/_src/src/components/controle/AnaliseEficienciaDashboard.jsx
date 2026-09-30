import React, { useMemo } from "react";
import { tempoEsperadoHoras, tempoRealHoras } from "@/lib/controleSpeed";
import { Gauge, AlertTriangle, TrendingDown, Clock, Ruler, Hash, Wrench, CheckCircle2 } from "lucide-react";

const MACHINES = ["JR", "Gravadora", "Estampa 1", "Estampa 2", "GR2", "Digital UV", "Digital Solvente", "Tumbler"];

function fmtHoras(v) {
  if (!v && v !== 0) return "00:00";
  const abs = Math.abs(v);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function fmtNum(v) {
  return Math.round(v || 0).toLocaleString("pt-BR");
}

function statusEf(ef, hasData) {
  if (!hasData) return { label: "Sem dados", color: "#94a3b8", bg: "#f1f5f9" };
  if (ef >= 95) return { label: "Meta", color: "#059669", bg: "#d1fae5" };
  if (ef >= 80) return { label: "Atenção", color: "#d97706", bg: "#fef3c7" };
  return { label: "Crítico", color: "#dc2626", bg: "#fee2e2" };
}

export default function AnaliseEficienciaDashboard({ records, selectedDays }) {
  const porMaquina = useMemo(() => {
    return MACHINES.map((m) => {
      const recs = records.filter((r) => r.maquina === m);
      let real = 0, esperado = 0, metros = 0, setup = 0, parada = 0, retrab = 0, ops = new Set();
      recs.forEach((r) => {
        const t = r.tempo > 0 ? r.tempo : tempoRealHoras(r.hora_inicial, r.hora_final);
        real += t;
        esperado += tempoEsperadoHoras(r.metragem, m, r.processo);
        metros += r.metragem || 0;
        setup += r.setup || 0;
        parada += r.parada || 0;
        if (r.is_retrabalho) retrab++;
        if (r.num_op) ops.add(r.num_op);
      });
      const ef = real > 0 ? (esperado / real) * 100 : 0;
      return {
        maquina: m,
        ops: ops.size,
        metros: Math.round(metros),
        tempoReal: Math.round(real * 100) / 100,
        tempoEsperado: Math.round(esperado * 100) / 100,
        setup: Math.round(setup),
        parada: Math.round(parada),
        retrabalhos: retrab,
        eficiencia: Math.round(ef),
        hasData: recs.length > 0,
      };
    });
  }, [records]);

  const geral = useMemo(() => {
    let real = 0, esperado = 0, metros = 0, setup = 0;
    porMaquina.forEach((r) => {
      real += r.tempoReal;
      esperado += r.tempoEsperado;
      metros += r.metros;
      setup += r.setup;
    });
    const ef = real > 0 ? (esperado / real) * 100 : 0;
    const ativas = porMaquina.filter((r) => r.hasData).length;
    const criticas = porMaquina.filter((r) => r.hasData && r.eficiencia < 80).length;
    return {
      metros,
      real,
      esperado,
      setup,
      ef: Math.round(ef),
      ativas,
      criticas,
    };
  }, [porMaquina]);

  const periodoLabel = selectedDays.length > 0
    ? selectedDays.length === 1
      ? selectedDays[0].split("-").reverse().join("/")
      : `${selectedDays.length} dias selecionados`
    : "Todos os registros";

  const stGeral = statusEf(geral.ef, geral.real > 0);

  return (
    <div className="space-y-4">
      {/* Resumo geral */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Ruler className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold uppercase tracking-wide">Metros</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{fmtNum(geral.metros)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold uppercase tracking-wide">Tempo Real</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{fmtHoras(geral.real)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <TrendingDown className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold uppercase tracking-wide">Esperado</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{fmtHoras(geral.esperado)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Wrench className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold uppercase tracking-wide">Setup</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{fmtHoras(geral.setup / 60)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Gauge className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold uppercase tracking-wide">Eficiência</span>
          </div>
          <p className="text-2xl font-extrabold tabular-nums" style={{ color: stGeral.color }}>{geral.ef}%</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold uppercase tracking-wide">Críticas</span>
          </div>
          <p className="text-2xl font-extrabold text-rose-600 tabular-nums">{geral.criticas}/{geral.ativas}</p>
        </div>
      </div>

      {/* Tabela por máquina */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">Eficiência por Máquina</h3>
          </div>
          <span className="text-xs text-slate-500">{periodoLabel}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wide">
                <th className="text-left font-semibold px-4 py-2.5">Máquina</th>
                <th className="text-right font-semibold px-4 py-2.5">OPs</th>
                <th className="text-right font-semibold px-4 py-2.5">Metros</th>
                <th className="text-right font-semibold px-4 py-2.5">Tempo Real</th>
                <th className="text-right font-semibold px-4 py-2.5">Esperado</th>
                <th className="text-right font-semibold px-4 py-2.5">Setup</th>
                <th className="text-right font-semibold px-4 py-2.5">Retrab.</th>
                <th className="text-right font-semibold px-4 py-2.5">Eficiência</th>
                <th className="text-center font-semibold px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {porMaquina.map((r) => {
                const st = statusEf(r.eficiencia, r.hasData);
                return (
                  <tr key={r.maquina} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-bold text-slate-900">{r.maquina}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{r.ops}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{fmtNum(r.metros)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{fmtHoras(r.tempoReal)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">{fmtHoras(r.tempoEsperado)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{fmtHoras(r.setup / 60)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {r.retrabalhos > 0 ? <span className="text-rose-600 font-semibold">{r.retrabalhos}</span> : <span className="text-slate-300">0</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {r.hasData ? (
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(r.eficiencia, 100)}%`, background: st.color }} />
                          </div>
                          <span className="font-bold tabular-nums w-10 text-right" style={{ color: st.color }}>{r.eficiencia}%</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ color: st.color, background: st.bg }}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights automáticos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h4 className="text-sm font-bold text-amber-900">Pontos de atenção</h4>
          </div>
          <ul className="space-y-1.5 text-sm text-amber-800">
            {geral.ef < 80 && (
              <li className="flex gap-2"><span className="text-rose-500">•</span> Eficiência geral em <strong>{geral.ef}%</strong> — meta é 95%.</li>
            )}
            {porMaquina.filter((r) => r.hasData && r.eficiencia < 80).map((r) => (
              <li key={r.maquina} className="flex gap-2"><span className="text-rose-500">•</span> <strong>{r.maquina}</strong> em {r.eficiencia}% com {r.setup}min de setup.</li>
            ))}
            {porMaquina.filter((r) => r.retrabalhos > 0).map((r) => (
              <li key={r.maquina} className="flex gap-2"><span className="text-rose-500">•</span> <strong>{r.maquina}</strong> com {r.retrabalhos} retrabalho(s).</li>
            ))}
            {geral.ef >= 80 && porMaquina.filter((r) => r.hasData && r.eficiencia < 80).length === 0 && (
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Todas as máquinas acima de 80%.</li>
            )}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-4 h-4 text-slate-600" />
            <h4 className="text-sm font-bold text-slate-900">Resumo operacional</h4>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-500 text-xs">Máquinas ativas</p>
              <p className="font-bold text-slate-900 text-lg">{geral.ativas}/{MACHINES.length}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Total de setup</p>
              <p className="font-bold text-slate-900 text-lg">{fmtHoras(geral.setup / 60)}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Metros / hora real</p>
              <p className="font-bold text-slate-900 text-lg">{geral.real > 0 ? fmtNum(geral.metros / geral.real) : 0} m/h</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Gap (real - esperado)</p>
              <p className="font-bold text-slate-900 text-lg">{fmtHoras(geral.real - geral.esperado)} h</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}