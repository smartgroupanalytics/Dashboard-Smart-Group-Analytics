import React, { useMemo } from "react";
import { Cog } from "lucide-react";

const fmtNum = (v) => (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function AproveitamentoMaquinaDetail({ controleRecords, numOp }) {
  const maquinas = useMemo(() => {
    const recs = controleRecords.filter((r) => String(r.num_op || "") === String(numOp || ""));
    const map = {};
    recs.forEach((r) => {
      const key = r.maquina || "(sem máquina)";
      if (!map[key]) map[key] = { maquina: key, tempo: 0, setup: 0, parada: 0, ops: 0, retrabalho: 0 };
      map[key].tempo += r.tempo || 0;
      map[key].setup += r.setup || 0;
      map[key].parada += r.parada || 0;
      map[key].ops += 1;
      if (r.is_retrabalho) map[key].retrabalho += r.tempo || 0;
    });
    return Object.values(map).sort((a, b) => b.tempo - a.tempo);
  }, [controleRecords, numOp]);

  if (maquinas.length === 0) {
    return (
      <tr className="bg-slate-50/60">
        <td colSpan={16} className="px-6 py-3 text-xs text-slate-500 italic">
          Nenhum registro de máquina encontrado para esta OP no Controle de Eficiência.
        </td>
      </tr>
    );
  }

  const totalTempo = maquinas.reduce((s, m) => s + m.tempo, 0);
  const totalSetup = maquinas.reduce((s, m) => s + m.setup, 0);
  const totalParada = maquinas.reduce((s, m) => s + m.parada, 0);

  return (
    <tr className="bg-slate-50/60">
      <td colSpan={16} className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Cog className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Máquinas que processaram a OP {numOp}</span>
        </div>
        <table className="w-full text-[11px] border border-slate-200 rounded">
          <thead>
            <tr className="bg-slate-200 text-slate-700">
              <th className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">Máquina</th>
              <th className="px-2 py-1.5 text-right font-semibold whitespace-nowrap">Registros</th>
              <th className="px-2 py-1.5 text-right font-semibold whitespace-nowrap">Tempo (h)</th>
              <th className="px-2 py-1.5 text-right font-semibold whitespace-nowrap">Setup (min)</th>
              <th className="px-2 py-1.5 text-right font-semibold whitespace-nowrap">Parada (min)</th>
              <th className="px-2 py-1.5 text-right font-semibold whitespace-nowrap">Retrabalho (h)</th>
            </tr>
          </thead>
          <tbody>
            {maquinas.map((m) => (
              <tr key={m.maquina} className="border-t border-slate-200">
                <td className="px-2 py-1.5 text-slate-800 font-semibold whitespace-nowrap">{m.maquina}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">{m.ops}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-slate-800 font-bold whitespace-nowrap">{fmtNum(m.tempo)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-slate-600 whitespace-nowrap">{fmtNum(m.setup)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-slate-600 whitespace-nowrap">{fmtNum(m.parada)}</td>
                <td className={`px-2 py-1.5 text-right tabular-nums whitespace-nowrap ${m.retrabalho > 0 ? "text-rose-600 font-bold" : "text-slate-400"}`}>{m.retrabalho > 0 ? fmtNum(m.retrabalho) : "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-200 font-bold border-t-2 border-slate-300">
              <td className="px-2 py-1.5 text-slate-800 uppercase text-[10px]">Total</td>
              <td className="px-2 py-1.5 text-right tabular-nums text-slate-700">{maquinas.reduce((s, m) => s + m.ops, 0)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums text-slate-900">{fmtNum(totalTempo)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums text-slate-700">{fmtNum(totalSetup)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums text-slate-700">{fmtNum(totalParada)}</td>
              <td className="px-2 py-1.5"></td>
            </tr>
          </tfoot>
        </table>
      </td>
    </tr>
  );
}