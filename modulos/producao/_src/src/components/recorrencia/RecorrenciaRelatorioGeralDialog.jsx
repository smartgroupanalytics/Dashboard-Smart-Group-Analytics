import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FileText, X, CalendarDays, Repeat, Package, Ruler, Printer } from "lucide-react";
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

export default function RecorrenciaRelatorioGeralDialog({ open, onOpenChange, data }) {
  const [expandido, setExpandido] = useState({});

  const ordenado = useMemo(
    () => [...data].sort((a, b) => b.count - a.count || b.metragem - a.metragem),
    [data]
  );

  const totalMetragem = ordenado.reduce((s, d) => s + (d.metragem || 0), 0);
  const totalPedidos = ordenado.reduce((s, d) => s + (d.count || 0), 0);
  const totalProdutos = ordenado.length;

  const handlePrint = () => {
    document.body.classList.add("printing-recorrencia-geral");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-recorrencia-geral"), 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 bg-gradient-to-r from-[#00798C] to-[#005f6e] text-white">
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-lg font-extrabold">
              <FileText className="w-5 h-5" /> Relatório Geral de Recorrência
            </span>
            <button
              onClick={handlePrint}
              className="hidden md:flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition-colors print-hide"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </button>
          </DialogTitle>
          <p className="text-xs text-white/80 mt-1">
            {totalProdutos} produto(s) · {totalPedidos} pedido(s) · {fmtNum(totalMetragem)} m total
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-6 py-4 recorrencia-relatorio-root">
          {ordenado.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum dado para exibir no relatório.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ordenado.map((d, i) => {
                const key = d.codigo || i;
                const isOpen = !!expandido[key];
                const datasOrdenadas = [...(d.pedidos || [])].sort((a, b) =>
                  (a.data || "").localeCompare(b.data || "")
                );
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(i * 0.015, 0.4) }}
                    className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Linha principal */}
                    <button
                      type="button"
                      onClick={() => setExpandido((s) => ({ ...s, [key]: !s[key] }))}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#00798C]/10 grid place-items-center">
                        <span className="text-xs font-extrabold text-[#00798C]">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-slate-900 text-sm">{d.codigo}</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00798C] text-white text-[10px] font-bold">
                            <Repeat className="w-2.5 h-2.5" /> {d.count}x
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{d.descricao || "—"}</p>
                      </div>
                      <div className="hidden sm:flex flex-col items-end gap-0.5">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide flex items-center gap-1">
                          <Ruler className="w-3 h-3" /> Metragem
                        </span>
                        <span className="text-sm font-bold tabular-nums text-slate-900">{fmtNum(d.metragem)}</span>
                      </div>
                      <div className="hidden md:flex flex-col items-end gap-0.5 min-w-[140px]">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" /> Datas
                        </span>
                        <div className="flex flex-wrap gap-1 justify-end max-w-[260px]">
                          {datasOrdenadas.slice(0, 3).map((p, idx) => (
                            <span key={idx} className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              {fmtDate(p.data)}
                            </span>
                          ))}
                          {datasOrdenadas.length > 3 && (
                            <span className="text-[10px] font-bold text-[#00798C] bg-[#00798C]/10 px-1.5 py-0.5 rounded">
                              +{datasOrdenadas.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`flex-shrink-0 w-7 h-7 rounded-lg grid place-items-center transition-all ${isOpen ? "bg-[#00798C] text-white rotate-90" : "bg-slate-100 text-slate-500"}`}>
                        <X className={`w-4 h-4 ${isOpen ? "hidden" : "block"} rotate-45`} />
                        <span className={`${isOpen ? "block" : "hidden"} text-lg leading-none`}>×</span>
                      </div>
                    </button>

                    {/* Detalhe expandido — todas as datas */}
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="border-t border-slate-100 bg-slate-50/60 px-4 py-3"
                      >
                        <p className="text-[10px] uppercase tracking-wide font-bold text-slate-500 mb-2 flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" /> Recorrência de Datas ({datasOrdenadas.length})
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                          {datasOrdenadas.map((p, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] font-bold text-slate-400 tabular-nums">{String(idx + 1).padStart(2, "0")}</span>
                                <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">{fmtDate(p.data)}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 tabular-nums ml-2">{fmtNum(p.metragem)}m</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}