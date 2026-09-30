import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Package } from "lucide-react";
import { fmtMeters } from "@/lib/format";

export default function RelatorioRetrabalhoProduto({ open, onOpenChange, rows, periodoLabel }) {
  const handlePrint = () => {
    document.body.classList.add("printing-retrabalho-produto");
    setTimeout(() => {
      window.print();
      setTimeout(() => document.body.classList.remove("printing-retrabalho-produto"), 500);
    }, 100);
  };

  // Agrupa por produto → OP → descrição do retrabalho (contagem e metros)
  const grouped = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      const produto = r.produto || "Sem produto";
      if (!map[produto]) map[produto] = { ops: {}, totalMetros: 0, totalReg: 0 };
      map[produto].totalMetros += r.metros || 0;
      map[produto].totalReg += 1;
      const op = r.op || "—";
      if (!map[produto].ops[op]) map[produto].ops[op] = { retrabalhos: {}, totalMetros: 0, totalReg: 0 };
      map[produto].ops[op].totalMetros += r.metros || 0;
      map[produto].ops[op].totalReg += 1;
      const desc = r.descricao_retrabalho || "Não informado";
      if (!map[produto].ops[op].retrabalhos[desc]) {
        map[produto].ops[op].retrabalhos[desc] = { count: 0, metros: 0 };
      }
      map[produto].ops[op].retrabalhos[desc].count += 1;
      map[produto].ops[op].retrabalhos[desc].metros += r.metros || 0;
    });
    return Object.entries(map)
      .map(([produto, data]) => ({
        produto,
        ...data,
        ops: Object.entries(data.ops).map(([op, opData]) => ({
          op,
          ...opData,
          retrabalhos: Object.entries(opData.retrabalhos)
            .map(([desc, d]) => ({ desc, ...d }))
            .sort((a, b) => b.count - a.count),
        })).sort((a, b) => b.totalReg - a.totalReg),
      }))
      .sort((a, b) => b.totalReg - a.totalReg);
  }, [rows]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-violet-600" />
            Relatório de Retrabalhos por Produto
          </DialogTitle>
          <DialogDescription>
            Agrupado por produto e OP, mostrando os tipos de retrabalho e suas ocorrências.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end mb-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handlePrint}>
            <Printer className="w-4 h-4" /> Imprimir
          </Button>
        </div>

        <div className="retrabalho-produto-root space-y-4">
          <h3 className="text-center text-lg font-extrabold text-slate-900 print-only">
            Relatório de Retrabalhos por Produto
          </h3>
          {grouped.length === 0 && (
            <p className="text-center text-slate-500 py-8">Nenhum registro para o período selecionado.</p>
          )}
          {grouped.map((prod) => (
            <div key={prod.produto} className="rounded-xl border border-slate-300 overflow-hidden">
              <div className="bg-violet-700 text-white px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Package className="w-4 h-4 shrink-0" />
                  <span className="font-bold text-sm truncate" title={prod.produto}>{prod.produto}</span>
                </div>
                <div className="flex items-center gap-3 text-xs shrink-0 ml-3">
                  <span className="bg-white/20 px-2 py-0.5 rounded">{prod.ops.length} OP(s)</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded">{prod.totalReg} retrab.</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded tabular-nums">{fmtMeters(prod.totalMetros)} m</span>
                </div>
              </div>

              <table className="w-full text-xs border-collapse">
                <thead className="bg-slate-100">
                  <tr className="text-left text-slate-700">
                    <th className="px-3 py-2 font-medium whitespace-nowrap w-[12%]">OP</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap w-[42%]">Descrição do Retrabalho</th>
                    <th className="px-3 py-2 font-medium text-center whitespace-nowrap w-[12%]">Ocorrências</th>
                    <th className="px-3 py-2 font-medium text-right whitespace-nowrap w-[16%]">Metros Retrab.</th>
                    <th className="px-3 py-2 font-medium text-center whitespace-nowrap w-[18%]">% do Produto</th>
                  </tr>
                </thead>
                <tbody>
                  {prod.ops.flatMap((opData, opIdx) => {
                    const rows = [];
                    opData.retrabalhos.forEach((rt, rtIdx) => {
                      rows.push(
                        <tr
                          key={`${opData.op}-${rt.desc}`}
                          className={`border-t border-slate-200 text-slate-700 ${
                            (opIdx + rtIdx) % 2 === 0 ? "bg-white" : "bg-slate-50"
                          }`}
                        >
                          <td className="px-3 py-2 whitespace-nowrap text-center font-semibold text-slate-900">
                            {rtIdx === 0 ? opData.op : ""}
                          </td>
                          <td className="px-3 py-2">{rt.desc}</td>
                          <td className="px-3 py-2 text-center tabular-nums font-bold text-violet-700">{rt.count}x</td>
                          <td className="px-3 py-2 text-right tabular-nums">{fmtMeters(rt.metros)}</td>
                          <td className="px-3 py-2 text-center tabular-nums">
                            {prod.totalMetros > 0 ? `${((rt.metros / prod.totalMetros) * 100).toFixed(1)}%` : "—"}
                          </td>
                        </tr>
                      );
                    });
                    // linha de subtotal da OP
                    rows.push(
                      <tr key={`sub-${opData.op}`} className="bg-slate-100 border-t-2 border-slate-300">
                        <td className="px-3 py-1.5 text-right font-bold text-slate-600 text-[11px]" colSpan={2}>
                          Subtotal OP {opData.op}
                        </td>
                        <td className="px-3 py-1.5 text-center tabular-nums font-bold text-slate-700 text-[11px]">
                          {opData.totalReg}x
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-bold text-slate-700 text-[11px]">
                          {fmtMeters(opData.totalMetros)}
                        </td>
                        <td className="px-3 py-1.5 text-center tabular-nums font-bold text-slate-700 text-[11px]">
                          {prod.totalMetros > 0 ? `${((opData.totalMetros / prod.totalMetros) * 100).toFixed(1)}%` : "—"}
                        </td>
                      </tr>
                    );
                    return rows;
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}