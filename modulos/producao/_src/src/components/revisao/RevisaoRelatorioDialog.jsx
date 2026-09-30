import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fmtMeters } from "@/lib/format";
import Gauge from "@/components/revisao/Gauge";
import { FileBarChart, Calendar, Ruler, Hash, TrendingUp, Target, Printer } from "lucide-react";

const META_REVISADOS = 5126.1;
const META_1 = 4882.0;

export default function RevisaoRelatorioDialog({ open, onOpenChange, records }) {
  const rows = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      const key = r.data || "Sem data";
      if (!map[key]) map[key] = { data: key, metros: 0, ops: 0 };
      map[key].metros += r.metros_revisados || 0;
      map[key].ops += r.ops_revisadas || 0;
    });
    return Object.values(map).sort((a, b) => (a.data < b.data ? -1 : 1));
  }, [records]);

  const totais = useMemo(() => {
    const metros = rows.reduce((s, r) => s + r.metros, 0);
    const ops = rows.reduce((s, r) => s + r.ops, 0);
    return { metros, ops, media: ops > 0 ? metros / ops : 0 };
  }, [rows]);

  const medias = useMemo(() => {
    if (records.length === 0) return { revisados: 0, p1: 0 };
    const sum = (fn) => records.reduce((s, r) => s + (fn(r) || 0), 0);
    const revisados = sum((r) => r.metros_revisados);
    const p1 = sum((r) => r.metros_1);
    const revManual = sum((r) => r.media_metros_revisados);
    const p1Manual = sum((r) => r.media_metros_1);
    const count = records.length;
    return {
      revisados: revManual ? revManual / count : revisados / count,
      p1: p1Manual ? p1Manual / count : p1 / count,
    };
  }, [records]);

  const fmtData = (iso) => {
    if (iso === "Sem data") return iso;
    const parts = iso.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return iso;
  };

  const handlePrint = () => {
    document.body.classList.add("printing-revisao-relatorio");
    const styleEl = document.createElement("style");
    styleEl.id = "revisao-relatorio-page";
    styleEl.textContent = "@page { size: A4 landscape; margin: 8mm; }";
    document.head.appendChild(styleEl);
    window.print();
    setTimeout(() => {
      document.body.classList.remove("printing-revisao-relatorio");
      styleEl.remove();
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] max-h-[90vh] overflow-hidden p-0 border-slate-300 bg-gradient-to-br from-white via-slate-50 to-slate-100 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.2)]">
        <DialogHeader className="px-6 pt-1 pb-1 border-b border-slate-200 bg-white/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 ring-1 ring-slate-200 shadow-sm">
              <FileBarChart className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-extrabold text-slate-900">
                Relatório de Revisão
              </DialogTitle>
              <p className="text-xs text-slate-500">Métricas gerenciais por data</p>
            </div>
            <Button variant="default" size="sm" className="gap-1.5 ml-auto" onClick={handlePrint}>
              <Printer className="w-4 h-4" /> Imprimir
            </Button>
          </div>
        </DialogHeader>

        <div className="revisao-relatorio-root px-6 py-1 overflow-y-auto flex-1">
          <h2 className="print-only hidden text-2xl font-extrabold text-black mb-2">Relatório de Revisão</h2>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500 py-10 text-center">
              Nenhum dado encontrado para o período selecionado.
            </p>
          ) : (
            <>
              {/* Gauges de Metas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                <div className="gauge-card rounded-xl border border-slate-300 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-3 flex flex-col items-center shadow-sm">
                  <p className="text-xs font-semibold text-slate-700 mb-0.5 inline-flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" /> Média de Metros Revisados
                  </p>
                  <Gauge value={medias.revisados} target={META_REVISADOS} color="#2563eb" compact formatValue={(v) => fmtMeters(v)} />
                </div>
                <div className="gauge-card rounded-xl border border-slate-300 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-3 flex flex-col items-center shadow-sm">
                  <p className="text-xs font-semibold text-slate-700 mb-0.5 inline-flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" /> Média de Metros de 1°
                  </p>
                  <Gauge value={medias.p1} target={META_1} color="#16a34a" compact formatValue={(v) => fmtMeters(v)} />
                </div>
              </div>

            <div className="rounded-xl border border-slate-300 overflow-hidden shadow-sm">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700">
                    <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Data</span>
                    </th>
                    <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5"><Ruler className="w-3.5 h-3.5" /> Metragem</span>
                    </th>
                    <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> N° de OPS</span>
                    </th>
                    <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Média Metros/OP</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={r.data}
                      className={`border-t border-slate-200 text-slate-700 transition-colors hover:bg-slate-100 ${
                        i % 2 === 0 ? "bg-white" : "bg-slate-50"
                      }`}
                    >
                      <td className="px-4 py-2.5 font-semibold whitespace-nowrap tabular-nums">{fmtData(r.data)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtMeters(r.metros)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{Math.round(r.ops).toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-bold text-blue-700">
                        {r.ops > 0 ? fmtMeters(r.metros / r.ops) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gradient-to-r from-slate-200 to-slate-100 text-slate-900 border-t-2 border-slate-300">
                    <td className="px-4 py-3 font-extrabold uppercase tracking-wide text-slate-800">Total</td>
                    <td className="px-4 py-3 text-right tabular-nums font-extrabold">{fmtMeters(totais.metros)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-extrabold">{Math.round(totais.ops).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-extrabold text-blue-700">
                      {totais.ops > 0 ? fmtMeters(totais.media) : "—"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}