import React, { useMemo, useRef } from "react";
import { getSpeed, tempoEsperadoHoras, tempoRealHoras } from "@/lib/controleSpeed";
import { Printer, X, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

function fmtHoras(v) {
  if (!v && v !== 0) return "—";
  const abs = Math.abs(v);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${v < 0 ? "-" : ""}${hh}:${mm}`;
}

function fmtNum(v, dec = 1) {
  if (v == null || isNaN(v)) return "—";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtMinutos(v) {
  if (!v && v !== 0) return "—";
  const abs = Math.abs(v);
  const h = Math.floor(abs / 60);
  const m = Math.round(abs % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function RelatorioProdutoMaquinas({ products, records, onClose }) {
  const rootRef = useRef(null);

  const handlePrint = async () => {
    const root = rootRef.current;
    if (!root) { window.print(); return; }
    const styleEl = document.createElement("style");
    styleEl.id = "relatorio-landscape-page";
    styleEl.textContent = "@page { size: A4 landscape; margin: 8mm; }";
    document.head.appendChild(styleEl);
    document.body.classList.add("printing-relatorio");
    await new Promise((res) => setTimeout(res, 300));
    const cleanup = () => {
      document.body.classList.remove("printing-relatorio");
      styleEl.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  };

  // Agrupa registros por máquina
  const byMachine = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      const m = r.maquina || "—";
      if (!map[m]) {
        map[m] = {
          maquina: m,
          rows: [],
          metragem: 0,
          tempo: 0,
          setup: 0,
          parada: 0,
          tempoEsperado: 0,
          ops: new Set(),
        };
      }
      const tempo = r.tempo && r.tempo > 0 ? r.tempo : tempoRealHoras(r.hora_inicial, r.hora_final);
      const tempoEsperado = tempoEsperadoHoras(r.metragem, m, r.processo);
      map[m].rows.push({ ...r, tempo, tempoEsperado });
      map[m].metragem += r.metragem || 0;
      map[m].tempo += tempo;
      map[m].tempoEsperado += tempoEsperado;
      map[m].setup += r.setup || 0;
      map[m].parada += r.parada || 0;
      if (r.num_op) map[m].ops.add(r.num_op);
    });
    return Object.values(map).sort((a, b) => b.tempo - a.tempo);
  }, [records]);

  const totalGeral = useMemo(() => {
    return byMachine.reduce(
      (acc, m) => {
        acc.metragem += m.metragem;
        acc.tempo += m.tempo;
        acc.tempoEsperado += m.tempoEsperado;
        acc.setup += m.setup;
        acc.parada += m.parada;
        return acc;
      },
      { metragem: 0, tempo: 0, tempoEsperado: 0, setup: 0, parada: 0 }
    );
  }, [byMachine]);

  const titulo =
    products.length === 1 ? products[0] : `${products.length} produtos`;

  return (
    <div ref={rootRef} className="relatorio-root rounded-2xl border border-slate-300 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Relatório por Produto — {titulo}
          </h3>
          <p className="text-xs text-slate-900 font-medium">
            {byMachine.length} máquina(s) • {records.length} registro(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1 bg-white text-slate-800 border-slate-300 hover:bg-slate-100" onClick={handlePrint}>
            <Printer className="w-4 h-4" /> Imprimir
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:bg-slate-100" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Resumo por máquina */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 mb-4">
        <table className="w-full text-xs border-collapse table-fixed">
          <thead className="bg-emerald-100/70">
            <tr className="text-left text-slate-900">
              <th className="px-3 py-2.5 font-medium whitespace-nowrap w-[18%]">Máquina</th>
              <th className="px-3 py-2.5 font-medium text-center whitespace-nowrap w-[10%]">OPs</th>
              <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap w-[14%]">Metragem</th>
              <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap w-[12%]">Tempo Real</th>
              <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap w-[12%]">Tempo Previsto</th>
              <th className="px-3 py-2.5 font-medium text-center whitespace-nowrap w-[10%]">Setup</th>
              <th className="px-3 py-2.5 font-medium text-center whitespace-nowrap w-[10%]">Parada</th>
              <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap w-[14%]">Dif. Tempo</th>
            </tr>
          </thead>
          <tbody>
            {byMachine.map((m, idx) => {
              const dif = m.tempo - m.tempoEsperado;
              const difPositive = dif <= 0;
              return (
                <tr key={m.maquina} className={`border-t border-slate-200 text-slate-900 hover:bg-slate-100 ${idx % 2 === 1 ? "bg-emerald-100/40" : "bg-white"}`}>
                  <td className="px-3 py-2 font-semibold whitespace-nowrap">{m.maquina}</td>
                  <td className="px-3 py-2 text-center tabular-nums">{m.ops.size}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold text-[13px]">{fmtNum(m.metragem, 2)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold text-cyan-700 text-[13px]">{fmtHoras(m.tempo)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold text-blue-700 text-[13px]">{fmtHoras(m.tempoEsperado)}</td>
                  <td className="px-3 py-2 text-center tabular-nums font-bold text-amber-600 text-[13px]">{m.setup ? fmtMinutos(m.setup) : "—"}</td>
                  <td className="px-3 py-2 text-center tabular-nums font-bold text-rose-600 text-[13px]">{m.parada ? fmtMinutos(m.parada) : "—"}</td>
                  <td className={`px-3 py-2 text-right tabular-nums font-bold text-[13px] ${difPositive ? "text-emerald-600" : "text-rose-600"}`}>
                    {(difPositive ? "-" : "+") + fmtHoras(Math.abs(dif))}
                  </td>
                </tr>
              );
            })}
            {byMachine.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-900 font-medium">
                  Nenhum registro encontrado para o(s) produto(s) selecionado(s).
                </td>
              </tr>
            )}
          </tbody>
          {byMachine.length > 0 && (
            <tfoot className="bg-slate-100 border-t-2 border-slate-300">
              <tr className="text-xs font-bold text-slate-900">
                <td className="px-3 py-2.5">Total Geral</td>
                <td className="px-3 py-2.5"></td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(totalGeral.metragem, 2)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums font-bold text-cyan-700 text-[14px]">{fmtHoras(totalGeral.tempo)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums font-bold text-blue-700 text-[14px]">{fmtHoras(totalGeral.tempoEsperado)}</td>
                <td className="px-3 py-2.5 text-center tabular-nums font-bold text-amber-600 text-[14px]">{totalGeral.setup ? fmtMinutos(totalGeral.setup) : "—"}</td>
                <td className="px-3 py-2.5 text-center tabular-nums font-bold text-rose-600 text-[14px]">{totalGeral.parada ? fmtMinutos(totalGeral.parada) : "—"}</td>
                <td className={`px-3 py-2.5 text-right tabular-nums font-bold text-[14px] ${totalGeral.tempo - totalGeral.tempoEsperado <= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {((totalGeral.tempo - totalGeral.tempoEsperado) <= 0 ? "-" : "+") + fmtHoras(Math.abs(totalGeral.tempo - totalGeral.tempoEsperado))}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Detalhamento por máquina — OPs individuais */}
      {byMachine.map((m) => (
        <div key={m.maquina} className="mb-4">
          <h4 className="text-sm font-bold text-slate-900 mb-2 pb-1 border-b border-slate-300">
            {m.maquina} <span className="text-xs font-normal text-slate-500">({m.rows.length} registro(s))</span>
          </h4>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs border-collapse table-fixed">
              <thead className="bg-slate-100">
                <tr className="text-left text-slate-900">
                  <th className="px-2 py-2 font-medium whitespace-nowrap w-[10%] text-right pr-4">Data</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap w-[8%] text-center">OP</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap w-[8%]">Proc.</th>
                  <th className="px-3 py-2 font-medium text-right whitespace-nowrap w-[10%]">Metragem</th>
                  <th className="px-3 py-2 font-medium text-center whitespace-nowrap w-[9%]">Hora Inicial</th>
                  <th className="px-3 py-2 font-medium text-center whitespace-nowrap w-[9%]">Hora Final</th>
                  <th className="px-3 py-2 font-medium text-right whitespace-nowrap w-[8%]">Tempo</th>
                  <th className="px-3 py-2 font-medium text-center whitespace-nowrap w-[8%]">Setup</th>
                  <th className="px-3 py-2 font-medium text-center whitespace-nowrap w-[8%]">Parada</th>
                  <th className="px-3 py-2 font-medium text-right whitespace-nowrap w-[10%]">Previsto</th>
                  <th className="px-3 py-2 font-medium text-right whitespace-nowrap w-[10%]">Dif. Tempo</th>
                </tr>
              </thead>
              <tbody>
                {m.rows.map((r, idx) => {
                  const dif = r.tempo - r.tempoEsperado;
                  const difPositive = dif <= 0;
                  return (
                    <tr key={r.id || idx} className={`border-t border-slate-200 text-slate-900 ${idx % 2 === 1 ? "bg-emerald-100/40" : "bg-white"}`}>
                      <td className="px-2 py-1.5 whitespace-nowrap tabular-nums text-[11px] text-right pr-4">{r.data ? r.data.split("-").reverse().join("/") : "—"}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-center">{r.num_op || "—"}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-[11px]">{r.processo || "—"}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-bold text-[13px]">{fmtNum(r.metragem, 2)}</td>
                      <td className="px-3 py-1.5 text-center tabular-nums font-bold text-[13px]">{r.hora_inicial || "—"}</td>
                      <td className="px-3 py-1.5 text-center tabular-nums font-bold text-[13px]">{r.hora_final || "—"}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-bold text-cyan-700 text-[13px]">{fmtHoras(r.tempo)}</td>
                      <td className="px-3 py-1.5 text-center tabular-nums font-bold text-amber-600 text-[13px]">{r.setup ? fmtMinutos(r.setup) : "—"}</td>
                      <td className="px-3 py-1.5 text-center tabular-nums font-bold text-rose-600 text-[13px]">{r.parada ? fmtMinutos(r.parada) : "—"}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-bold text-blue-700 text-[13px]">{fmtHoras(r.tempoEsperado)}</td>
                      <td className={`px-3 py-1.5 text-right tabular-nums font-bold text-[13px] ${difPositive ? "text-emerald-600" : "text-rose-600"}`}>
                        {r.tempo > 0 ? (difPositive ? "-" : "+") + fmtHoras(Math.abs(dif)) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}