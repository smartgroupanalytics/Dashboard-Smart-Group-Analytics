import React, { useState } from "react";
import { Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function fmtNum(v) {
  return (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso) {
  if (!iso) return "—";
  return iso.split("-").reverse().join("/");
}

export default function RecorrenciaTable({ data }) {
  const [selected, setSelected] = useState(null);
  const totalMetragem = data.reduce((s, d) => s + (d.metragem || 0), 0);
  const totalPedidos = data.reduce((s, d) => s + (d.count || 0), 0);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wide bg-[#00798C] rounded-lg px-3 py-2">Tabela de Produtos</h3>
      <div className="overflow-auto max-h-[400px]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 px-2 font-semibold text-slate-600">Código</th>
              <th className="text-left py-2 px-2 font-semibold text-slate-600">Descrição</th>
              <th className="text-right py-2 px-2 font-semibold text-slate-600">Metragem</th>
              <th className="text-right py-2 px-2 font-semibold text-slate-600">Pedido total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 px-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-semibold text-slate-900">{d.codigo}</span>
                    <button
                      type="button"
                      onClick={() => setSelected(d)}
                      title="Ver pedidos"
                      className="inline-flex items-center justify-center w-6 h-6 rounded-md text-slate-500 hover:bg-[#00798C] hover:text-white transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
                <td className="py-2 px-2 text-slate-600 max-w-[200px] truncate">{d.descricao}</td>
                <td className="py-2 px-2 text-right tabular-nums text-slate-900">{fmtNum(d.metragem)}</td>
                <td className="py-2 px-2 text-right tabular-nums font-bold text-slate-900">{d.count}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400">Nenhum dado para exibir</td>
              </tr>
            )}
          </tbody>
          {data.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100 font-bold text-slate-900">
                <td className="py-2 px-2" colSpan={2}>Total</td>
                <td className="py-2 px-2 text-right tabular-nums">{fmtNum(totalMetragem)}</td>
                <td className="py-2 px-2 text-right tabular-nums">{totalPedidos}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#00798C]" />
              <span className="font-mono">{selected?.codigo}</span>
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div>
              <p className="text-sm text-slate-600 mb-3 truncate">{selected.descricao || "—"}</p>
              <div className="flex items-center justify-between mb-2 text-xs text-slate-500">
                <span>{selected.count} pedido(s)</span>
                <span>Metragem total: {fmtNum(selected.metragem)}</span>
              </div>
              <div className="max-h-72 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-3 font-semibold text-slate-600">#</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-600">Data</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-600">OP</th>
                      <th className="text-right py-2 px-3 font-semibold text-slate-600">Metragem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...selected.pedidos]
                      .sort((a, b) => (b.data || "").localeCompare(a.data || ""))
                      .map((p, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-medium text-slate-900">{fmtDate(p.data)}</td>
                          <td className="py-2 px-3 font-mono text-slate-700">{p.op || "—"}</td>
                          <td className="py-2 px-3 text-right tabular-nums text-slate-900">{fmtNum(p.metragem)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}