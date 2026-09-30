import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, Search, X, Package, AlertTriangle, Hash, Ruler } from "lucide-react";
import { fmtMeters } from "@/lib/format";

export default function RelatorioProdutoDefeitoDialog({ open, onOpenChange, records, selectedDays }) {
  const [filtroProduto, setFiltroProduto] = useState("");
  const diasTexto = selectedDays && selectedDays.length > 0
    ? selectedDays.map((d) => d.split("-").reverse().join("/")).join(", ")
    : "Todos";

  const rows = useMemo(() => {
    const map = {};
    const filtro = filtroProduto.trim().toLowerCase();
    records.forEach((r) => {
      if (!r.defeito || !String(r.defeito).trim()) return;
      if (filtro && !String(r.produto || "").toLowerCase().includes(filtro)) return;
      const key = `${r.produto || "—"}|${r.defeito}`;
      if (!map[key]) {
        map[key] = {
          produto: r.produto || "—",
          descricao: r.descricao || "—",
          defeito: r.defeito || "—",
          ocorrencias: 0,
          metros_defeito: 0,
        };
      }
      map[key].ocorrencias += 1;
      map[key].metros_defeito += r.metros_defeito || 0;
    });
    return Object.values(map)
      .map((e) => ({ ...e, metros_defeito: Math.round(e.metros_defeito * 100) / 100 }))
      .sort((a, b) => b.ocorrencias - a.ocorrencias || b.metros_defeito - a.metros_defeito);
  }, [records, filtroProduto]);

  const totalOcorrencias = rows.reduce((s, r) => s + r.ocorrencias, 0);
  const totalMetros = rows.reduce((s, r) => s + r.metros_defeito, 0);
  const totalProdutos = new Set(rows.map((r) => r.produto)).size;
  const totalDefeitos = new Set(rows.map((r) => r.defeito)).size;

  const handlePrint = () => {
    document.body.classList.add("printing-relatorio-produto");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-relatorio-produto"), 500);
  };

  const maxOcorrencias = Math.max(1, ...rows.map((r) => r.ocorrencias));

  const KPIS = [
    { label: "Produtos", value: totalProdutos, icon: Package, tone: "teal" },
    { label: "Tipos de Defeito", value: totalDefeitos, icon: AlertTriangle, tone: "rose" },
    { label: "Ocorrências", value: totalOcorrencias, icon: Hash, tone: "blue" },
    { label: "Metros de Defeito", value: fmtMeters(totalMetros), icon: Ruler, tone: "amber" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 border-0">
        {/* Header com gradiente */}
        <DialogHeader className="px-6 py-5 bg-gradient-to-r from-[#0a2540] via-[#0e3a5e] to-[#00798C] text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_85%_20%,#fff,transparent_45%)]" />
          <DialogTitle className="flex items-center justify-between relative z-10">
            <span className="flex items-center gap-3 text-lg font-extrabold tracking-tight">
              <span className="w-10 h-10 rounded-xl bg-white/15 grid place-items-center backdrop-blur-sm">
                <AlertTriangle className="w-5 h-5" />
              </span>
              Relatório de Ocorrências por Produto
            </span>
            <button
              onClick={() => onOpenChange(false)}
              className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 grid place-items-center transition-colors print-hide"
            >
              <X className="w-4 h-4" />
            </button>
          </DialogTitle>
          <p className="text-cyan-100 text-xs mt-2 relative z-10 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-white/10 font-semibold">Período: {diasTexto}</span>
          </p>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 bg-slate-50/50">
          <div className="relatorio-produto-root p-6 space-y-5">
            {/* KPIs animados */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print-hide">
              {KPIS.map((k, i) => (
                <motion.div
                  key={k.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.06 }}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-7 h-7 rounded-lg grid place-items-center ${
                      k.tone === "teal" ? "bg-[#00798C]/10 text-[#00798C]" :
                      k.tone === "rose" ? "bg-rose-50 text-rose-500" :
                      k.tone === "blue" ? "bg-blue-50 text-blue-500" :
                      "bg-amber-50 text-amber-500"
                    }`}>
                      <k.icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">{k.label}</span>
                  </div>
                  <div className="text-xl font-extrabold text-slate-900 tabular-nums">{k.value}</div>
                </motion.div>
              ))}
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 flex-wrap print-hide">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  placeholder="Filtrar por código do produto..."
                  value={filtroProduto}
                  onChange={(e) => setFiltroProduto(e.target.value)}
                  className="w-full h-10 pl-9 pr-9 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#00798C] focus:ring-2 focus:ring-[#00798C]/15 transition-all"
                />
                {filtroProduto && (
                  <button
                    onClick={() => setFiltroProduto("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md hover:bg-slate-100 grid place-items-center text-slate-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#00798C] hover:bg-[#006674] text-white text-sm font-bold shadow-sm transition-colors"
              >
                <Printer className="w-4 h-4" /> Imprimir
              </button>
            </div>

            <p className="print-only hidden text-center font-extrabold text-gray-900 text-lg mb-1">Relatório de Ocorrências por Produto</p>
            <p className="print-only hidden text-center text-sm text-gray-700 mb-3">{diasTexto}</p>

            {/* Tabela moderna */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left font-bold text-slate-600 text-xs uppercase tracking-wide whitespace-nowrap">Produto</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-600 text-xs uppercase tracking-wide">Descrição</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-600 text-xs uppercase tracking-wide">Defeito</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-600 text-xs uppercase tracking-wide whitespace-nowrap">Ocorrências</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-600 text-xs uppercase tracking-wide whitespace-nowrap">Metros Defeito</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="text-sm font-medium">Nenhum dado para o período selecionado.</p>
                        </td>
                      </tr>
                    ) : (
                      rows.map((r, i) => {
                        const pctBar = (r.ocorrencias / maxOcorrencias) * 100;
                        return (
                          <motion.tr
                            key={i}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.4) }}
                            className="border-b border-slate-100 last:border-0 hover:bg-[#00798C]/[0.03] transition-colors group"
                          >
                            <td className="px-4 py-3 whitespace-nowrap font-bold text-[#00798C] font-mono text-xs">{r.produto}</td>
                            <td className="px-4 py-3 text-slate-700 text-xs max-w-[260px] truncate" title={r.descricao}>{r.descricao}</td>
                            <td className="px-4 py-3 text-slate-700 text-xs max-w-[200px] truncate" title={r.defeito}>{r.defeito}</td>
                            <td className="px-4 py-3 text-right align-middle">
                              <div className="flex items-center justify-end gap-2">
                                <div className="hidden md:block w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pctBar}%` }}
                                    transition={{ duration: 0.5, delay: Math.min(i * 0.02, 0.4) }}
                                    className="h-full rounded-full bg-gradient-to-r from-[#00798C] to-[#36aaa8]"
                                  />
                                </div>
                                <span className="tabular-nums font-bold text-slate-900 text-sm">{r.ocorrencias}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums font-bold text-rose-600 whitespace-nowrap">{fmtMeters(r.metros_defeito)}</td>
                          </motion.tr>
                        );
                      })
                    )}
                  </tbody>
                  {rows.length > 0 && (
                    <tfoot>
                      <tr className="bg-gradient-to-r from-slate-100 to-slate-50 border-t-2 border-slate-200">
                        <td colSpan={3} className="px-4 py-3 font-bold text-right text-slate-700 text-xs uppercase tracking-wide">Total</td>
                        <td className="px-4 py-3 text-right tabular-nums font-extrabold text-slate-900">{totalOcorrencias}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-extrabold text-rose-600">{fmtMeters(totalMetros)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}