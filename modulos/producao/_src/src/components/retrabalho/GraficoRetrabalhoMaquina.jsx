import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChartBar, Cog } from "lucide-react";
import PentagonalBarChart from "@/components/retrabalho/PentagonalBarChart";
import HorizontalPentagonalBarChart from "@/components/retrabalho/HorizontalPentagonalBarChart";

export default function GraficoRetrabalhoMaquina({ open, onOpenChange, rows, periodoLabel }) {
  const porRetrabalho = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      const desc = r.descricao_retrabalho || "Não informado";
      map[desc] = (map[desc] || 0) + 1;
    });
    return Object.entries(map).map(([descricao, total]) => ({ descricao, total }));
  }, [rows]);

  const porMaquina = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      const maq = r.maquina || "Sem máquina";
      map[maq] = (map[maq] || 0) + 1;
    });
    return Object.entries(map).map(([maquina, total]) => ({ maquina, total }));
  }, [rows]);

  const semDados = porRetrabalho.length === 0 && porMaquina.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] overflow-hidden flex flex-col bg-white">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ChartBar className="w-5 h-5 text-violet-500" />
            Retrabalhos por Máquina
          </DialogTitle>
          <DialogDescription>
            Quantidade de retrabalhos e ocorrências por máquina.
          </DialogDescription>
        </DialogHeader>

        {semDados ? (
          <p className="text-center text-slate-400 py-8">Nenhum registro para exibir.</p>
        ) : (
          <div className="flex-1 overflow-auto flex flex-col gap-4 min-h-0 pr-1">
            {/* Chart 1 — Nº de retrabalhos por tipo */}
            <div className="flex flex-col flex-shrink-0">
              <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.15em] mb-2 flex items-center gap-1.5">
                <ChartBar className="w-3.5 h-3.5 text-violet-400" />
                Nº de Retrabalhos (por tipo)
              </h3>
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <HorizontalPentagonalBarChart data={porRetrabalho} labelKey="descricao" valueKey="total" height={420} maxItems={10} />
              </div>
            </div>

            {/* Chart 2 — Ocorrências por máquina */}
            <div className="flex flex-col flex-shrink-0">
              <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.15em] mb-2 flex items-center gap-1.5">
                <Cog className="w-3.5 h-3.5 text-cyan-400" />
                Ocorrências por Máquina
              </h3>
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <PentagonalBarChart data={porMaquina} labelKey="maquina" valueKey="total" height={280} maxItems={8} />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}