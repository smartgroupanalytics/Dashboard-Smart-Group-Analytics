import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FlaskConical } from "lucide-react";

export default function InsumosDistintosDialog({ open, onOpenChange, records }) {
  const insumos = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      const key = r.descricao_insumo || "(sem insumo)";
      if (!map[key]) map[key] = { descricao: key, ops: new Set(), produtos: new Set(), qtde: 0, qtdePrev: 0, valor: 0, valorPrev: 0 };
      if (r.num_op) map[key].ops.add(r.num_op);
      if (r.descricao_produto) map[key].produtos.add(r.descricao_produto);
      map[key].qtde += r.qtde_realizada || 0;
      map[key].qtdePrev += r.qtde_prevista || 0;
      map[key].valor += r.valor_realizado || 0;
      map[key].valorPrev += r.valor_previsto || 0;
    });
    return Object.values(map)
      .map((v) => {
        const difValor = v.valor - v.valorPrev;
        const difPct = v.valorPrev ? (difValor / v.valorPrev) * 100 : 0;
        return {
          descricao: v.descricao,
          numOps: v.ops.size,
          produtos: [...v.produtos].sort(),
          qtde: v.qtde,
          valor: v.valor,
          difValor,
          difPct,
        };
      })
      .filter((ins) => (ins.qtde > 0 || ins.valor > 0) && ins.descricao !== "(sem insumo)")
      .sort((a, b) => b.qtde - a.qtde);
  }, [records]);

  const fmtNum = (v) => (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtCurrency = (v) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtPct = (v) => `${v > 0 ? "+" : ""}${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  const difColor = (v) => (v > 0 ? "text-rose-600" : "text-emerald-600");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-blue-600" />
            Insumos Distintos ({insumos.length})
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto rounded-md border border-slate-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-100">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-slate-700">Descrição do Insumo</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-700">Produtos / Códigos</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">Nº OPs</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">Qtde Realizada</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">Valor Realizado</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">Dif. Valor</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">Dif. %</th>
              </tr>
            </thead>
            <tbody>
              {insumos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500">Nenhum insumo encontrado.</td>
                </tr>
              ) : insumos.map((ins, i) => (
                <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 align-top">
                  <td className="px-3 py-2 text-slate-800 font-medium">{ins.descricao}</td>
                  <td className="px-3 py-2 text-slate-600 text-xs leading-relaxed">
                    {ins.produtos.length === 0 ? "—" : ins.produtos.join(", ")}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700">{ins.numOps}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700">{fmtNum(ins.qtde)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-800 font-semibold whitespace-nowrap">{fmtCurrency(ins.valor)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums font-semibold whitespace-nowrap ${difColor(ins.difValor)}`}>{fmtCurrency(ins.difValor)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums font-semibold whitespace-nowrap ${difColor(ins.difPct)}`}>{fmtPct(ins.difPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}