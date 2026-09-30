const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useMemo } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import RelatorioMacroPanel from "./RelatorioMacroPanel";

const TEAL = "#008785";
const ROW_BG = "#F8F9FA";

function fmtNum(n) {
  return (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtPct(n) {
  return (n || 0).toFixed(1).replace(".", ",") + "%";
}

export default function RelatorioProgramarDialog({ open, onOpenChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await db.entities.ItemProgramar.list("-created_date", 500);
        if (active) setItems(data);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [open]);

  // Normaliza rótulos de motivo para o relatório
  const normalizeMotivo = (raw) => {
    const m = (raw || "Sem motivo").trim();
    const lower = m.toLowerCase();
    if (lower.includes("retrabalhar") || lower.includes("saldo em estoque")) return "PCP";
    if (lower.includes("aguardando aprovacao") || lower.includes("aguardando aprovação")) return "Comercial";
    if (lower.startsWith("aguardando ")) return m.replace(/^aguardando\s+/i, "").trim();
    if (lower.includes("comercial") || lower.includes("pedido")) return "Comercial";
    if (lower.includes("transfer") || lower.includes("logística") || lower.includes("logistica")) return "Compras e Logística";
    return m;
  };

  // Agrupa por motivo
  const grupos = useMemo(() => {
    const map = {};
    for (const it of items) {
      const m = normalizeMotivo(it.motivo);
      if (!map[m]) map[m] = { motivo: m, metros: 0, ops: [] };
      map[m].metros += it.metragem || 0;
      map[m].ops.push(it);
    }
    const arr = Object.values(map).sort((a, b) => b.metros - a.metros);
    return arr;
  }, [items]);

  const totalMetros = grupos.reduce((s, g) => s + g.metros, 0);

  const handlePrint = () => {
    document.body.classList.add("printing-relatorio-programar");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-relatorio-programar"), 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold text-slate-900">
            Relatório a Programar
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between px-1 pb-3">
          <p className="text-base text-slate-500">
            Total: <span className="font-bold text-slate-900">{fmtNum(totalMetros)} m</span> · {grupos.length} motivo(s)
          </p>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={handlePrint}
            disabled={grupos.length === 0}
          >
            <Printer className="w-4 h-4" /> Imprimir
          </Button>
        </div>

        <div className="flex gap-4 flex-1 overflow-hidden">
          <div className="overflow-auto flex-1 relatorio-programar-root">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-7 h-7 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
            </div>
          ) : grupos.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-slate-400 font-medium">Nenhum item a programar com motivo.</p>
              <p className="text-slate-500 text-sm mt-1">Importe a planilha com a coluna L preenchida.</p>
            </div>
          ) : (
            <table className="w-full text-base border-collapse">
              <thead>
                <tr className="text-white" style={{ background: TEAL }}>
                  <th className="px-4 py-3 text-right font-bold whitespace-nowrap rounded-tl-lg">Metros</th>
                  <th className="px-4 py-3 text-left font-bold">Motivo</th>
                  <th className="px-4 py-3 text-right font-bold rounded-tr-lg w-24">%</th>
                </tr>
              </thead>
              <tbody>
                {grupos.map((g, i) => {
                  const pct = totalMetros > 0 ? (g.metros / totalMetros) * 100 : 0;
                  const isOpen = expanded === i;
                  return (
                    <React.Fragment key={i}>
                      <tr
                        className={`cursor-pointer hover:bg-slate-100 ${i % 2 === 0 ? "bg-white" : ""}`}
                        style={i % 2 !== 0 ? { background: ROW_BG } : undefined}
                        onClick={() => setExpanded(isOpen ? null : i)}
                      >
                        <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-900 whitespace-nowrap">
                          <span className="inline-flex items-center gap-2 justify-end w-full">
                            {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                            {fmtNum(g.metros)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-800 font-semibold">{g.motivo}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold text-[#1e3a8a] whitespace-nowrap">{fmtPct(pct)}</td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-slate-100/70">
                          <td colSpan={3} className="px-5 py-3">
                            <div className="rounded-lg bg-white border border-slate-200 overflow-hidden max-h-[280px] overflow-y-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-slate-100 text-slate-600">
                                    <th className="px-4 py-2 text-left font-semibold">Descrição (OP)</th>
                                    <th className="px-4 py-2 text-right font-semibold whitespace-nowrap">Metros</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {g.ops.map((op, j) => (
                                    <tr key={op.id || j} className="border-t border-slate-100">
                                      <td className="px-4 py-2 text-slate-700">{op.descricao || op.produto || "—"}</td>
                                      <td className="px-4 py-2 text-right tabular-nums font-semibold text-slate-900 whitespace-nowrap">{fmtNum(op.metragem)} m</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
          </div>
          {!loading && grupos.length > 0 && (
            <RelatorioMacroPanel grupos={grupos} totalMetros={totalMetros} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}