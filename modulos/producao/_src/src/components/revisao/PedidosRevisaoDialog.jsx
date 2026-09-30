const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useMemo } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package, Boxes, TrendingUp, Loader2, ShoppingBag, Calendar } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import ImportPedidosRevisaoDialog from "./ImportPedidosRevisaoDialog";
import DayFilter from "@/components/desempenho/DayFilter";

const COLORS = {
  VENDA: "#0ea5e9",
  BENEFICIAMENTO: "#f59e0b",
  ESTOQUE: "#10b981",
};

const COLORS_LIGHT = {
  VENDA: "#e0f2fe",
  BENEFICIAMENTO: "#fef3c7",
  ESTOQUE: "#d1fae5",
};

function fmtNum(n) {
  return (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtPct(n) {
  return (n || 0).toFixed(1).replace(".", ",") + "%";
}

function fmtDate(d) {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}`;
}

export default function PedidosRevisaoDialog({ open, onOpenChange }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState(() => {
    try {
      const saved = localStorage.getItem("pedidosRevisao_selectedDays");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("pedidosRevisao_selectedDays", JSON.stringify(selectedDays));
    } catch {}
  }, [selectedDays]);

  const filteredRecords = useMemo(() => {
    if (selectedDays.length === 0) return records;
    return records.filter((r) => r.data && selectedDays.includes(r.data));
  }, [records, selectedDays]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await db.entities.PedidoRevisao.list("-data", 2000);
      setRecords(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  // Agrupa por dia → classificação
  const dayData = useMemo(() => {
    const map = {};
    for (const r of filteredRecords) {
      if (!r.data) continue;
      if (!map[r.data]) map[r.data] = { data: r.data, VENDA: 0, BENEFICIAMENTO: 0, ESTOQUE: 0, total: 0 };
      const cls = ["VENDA", "BENEFICIAMENTO", "ESTOQUE"].includes(r.classificacao) ? r.classificacao : "ESTOQUE";
      map[r.data][cls] += r.qtd_revisada || 0;
      map[r.data].total += r.qtd_revisada || 0;
    }
    return Object.values(map).sort((a, b) => a.data.localeCompare(b.data));
  }, [filteredRecords]);

  // Totais gerais
  const totals = useMemo(() => {
    const t = { VENDA: 0, BENEFICIAMENTO: 0, ESTOQUE: 0, total: 0 };
    for (const d of dayData) {
      t.VENDA += d.VENDA;
      t.BENEFICIAMENTO += d.BENEFICIAMENTO;
      t.ESTOQUE += d.ESTOQUE;
      t.total += d.total;
    }
    return t;
  }, [dayData]);

  // Média por OP: conta OPs únicas por categoria e divide metragem total
  const opStats = useMemo(() => {
    const opsPorCategoria = { VENDA: new Set(), BENEFICIAMENTO: new Set(), ESTOQUE: new Set() };
    for (const r of filteredRecords) {
      if (!r.op) continue;
      const cls = ["VENDA", "BENEFICIAMENTO", "ESTOQUE"].includes(r.classificacao) ? r.classificacao : "ESTOQUE";
      opsPorCategoria[cls].add(r.op);
    }
    return {
      VENDA: { numOps: opsPorCategoria.VENDA.size, media: opsPorCategoria.VENDA.size ? totals.VENDA / opsPorCategoria.VENDA.size : 0 },
      BENEFICIAMENTO: { numOps: opsPorCategoria.BENEFICIAMENTO.size, media: opsPorCategoria.BENEFICIAMENTO.size ? totals.BENEFICIAMENTO / opsPorCategoria.BENEFICIAMENTO.size : 0 },
      ESTOQUE: { numOps: opsPorCategoria.ESTOQUE.size, media: opsPorCategoria.ESTOQUE.size ? totals.ESTOQUE / opsPorCategoria.ESTOQUE.size : 0 },
    };
  }, [filteredRecords, totals]);

  const totalOps = opStats.VENDA.numOps + opStats.BENEFICIAMENTO.numOps + opStats.ESTOQUE.numOps;

  const periodLabel = useMemo(() => {
    if (dayData.length === 0) return "—";
    const first = dayData[0].data;
    const last = dayData[dayData.length - 1].data;
    if (first === last) return fmtDate(first);
    return `${fmtDate(first)} → ${fmtDate(last)}`;
  }, [dayData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Header com gradiente */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-cyan-900 to-slate-800 px-6 py-5">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 grid place-items-center shadow-lg shadow-cyan-500/30">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-extrabold text-white tracking-tight">
                  Pedidos — Revisão
                </DialogTitle>
                <p className="text-cyan-200/80 text-xs mt-0.5 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> {periodLabel} · {dayData.length} dia(s) · {totalOps} OP(s)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DayFilter
                selectedDays={selectedDays}
                onSelect={setSelectedDays}
                triggerClassName="bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-sm"
              />
              <Button
                variant="default"
                size="sm"
                className="gap-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm"
                onClick={() => setImportOpen(true)}
              >
                <ShoppingBag className="w-4 h-4" /> Importar
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-cyan-600" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <ShoppingBag className="w-12 h-12 text-slate-300" />
            <p className="text-slate-500 font-medium">Nenhum dado de pedidos importado.</p>
            <p className="text-slate-400 text-sm">Clique em "Importar" para carregar a planilha.</p>
          </div>
        ) : (
          <div className="overflow-auto flex-1 px-6 py-5 space-y-5 bg-slate-50">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Venda", value: totals.VENDA, pct: totals.total ? (totals.VENDA / totals.total) * 100 : 0, icon: ShoppingCart, color: COLORS.VENDA, bg: COLORS_LIGHT.VENDA },
                { label: "Beneficiamento", value: totals.BENEFICIAMENTO, pct: totals.total ? (totals.BENEFICIAMENTO / totals.total) * 100 : 0, icon: Package, color: COLORS.BENEFICIAMENTO, bg: COLORS_LIGHT.BENEFICIAMENTO },
                { label: "Estoque", value: totals.ESTOQUE, pct: totals.total ? (totals.ESTOQUE / totals.total) * 100 : 0, icon: Boxes, color: COLORS.ESTOQUE, bg: COLORS_LIGHT.ESTOQUE },
              ].map((c, i) => (
                <div
                  key={c.label}
                  className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  style={{ animation: `pedidos-rise 0.5s ${i * 0.08}s both` }}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-40" style={{ background: c.bg }} />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{c.label}</p>
                      <p className="text-3xl font-extrabold mt-2 tabular-nums" style={{ color: c.color }}>
                        {fmtNum(c.value)} <span className="text-base font-bold text-slate-400">m</span>
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${c.pct}%`, background: c.color }}
                          />
                        </div>
                        <span className="text-sm font-bold tabular-nums" style={{ color: c.color }}>{fmtPct(c.pct)}</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: c.bg }}>
                      <c.icon className="w-5 h-5" style={{ color: c.color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Três gráficos de rosca — um por categoria, com média por OP ao lado */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Distribuição & Média por OP</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { key: "VENDA", label: "Venda", value: totals.VENDA, pct: totals.total ? (totals.VENDA / totals.total) * 100 : 0, color: COLORS.VENDA, bg: COLORS_LIGHT.VENDA, icon: ShoppingCart },
                  { key: "BENEFICIAMENTO", label: "Beneficiamento", value: totals.BENEFICIAMENTO, pct: totals.total ? (totals.BENEFICIAMENTO / totals.total) * 100 : 0, color: COLORS.BENEFICIAMENTO, bg: COLORS_LIGHT.BENEFICIAMENTO, icon: Package },
                  { key: "ESTOQUE", label: "Estoque", value: totals.ESTOQUE, pct: totals.total ? (totals.ESTOQUE / totals.total) * 100 : 0, color: COLORS.ESTOQUE, bg: COLORS_LIGHT.ESTOQUE, icon: Boxes },
                ].map((c, i) => {
                  const restante = Math.max(0, 100 - c.pct);
                  const stat = opStats[c.key];
                  return (
                    <div
                      key={c.label}
                      className="relative flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4"
                      style={{ animation: `pedidos-rise 0.5s ${i * 0.1}s both` }}
                    >
                      {/* Rosca */}
                      <div className="relative w-[170px] h-[170px] shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: c.label, value: c.pct },
                                { name: "Restante", value: restante },
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={58}
                              outerRadius={82}
                              startAngle={90}
                              endAngle={-270}
                              paddingAngle={2}
                              dataKey="value"
                              stroke="none"
                            >
                              <Cell fill={c.color} />
                              <Cell fill="#e2e8f0" />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-2xl font-extrabold tabular-nums" style={{ color: c.color }}>
                            {fmtPct(c.pct)}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400 mt-0.5">{fmtNum(c.value)} m</span>
                        </div>
                      </div>
                      {/* Média por OP ao lado */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2">
                          <c.icon className="w-3.5 h-3.5" style={{ color: c.color }} />
                          {c.label}
                        </p>
                        <div className="space-y-2">
                          <div>
                            <p className="text-[10px] font-semibold uppercase text-slate-400">Nº de OPs</p>
                            <p className="text-xl font-extrabold tabular-nums text-slate-700">{stat.numOps}</p>
                          </div>
                          <div className="pt-2 border-t border-slate-200">
                            <p className="text-[10px] font-semibold uppercase text-slate-400">Média por OP</p>
                            <p className="text-xl font-extrabold tabular-nums" style={{ color: c.color }}>
                              {fmtNum(stat.media)} <span className="text-xs font-bold text-slate-400">m</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tabela por dia */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Detalhamento por Dia</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600">
                      <th className="px-4 py-2.5 text-left font-bold whitespace-nowrap">Data</th>
                      <th className="px-4 py-2.5 text-right font-bold whitespace-nowrap text-sky-700">Venda (m)</th>
                      <th className="px-4 py-2.5 text-right font-bold whitespace-nowrap text-sky-600">%</th>
                      <th className="px-4 py-2.5 text-right font-bold whitespace-nowrap text-amber-700">Benef. (m)</th>
                      <th className="px-4 py-2.5 text-right font-bold whitespace-nowrap text-amber-600">%</th>
                      <th className="px-4 py-2.5 text-right font-bold whitespace-nowrap text-emerald-700">Estoque (m)</th>
                      <th className="px-4 py-2.5 text-right font-bold whitespace-nowrap text-emerald-600">%</th>
                      <th className="px-4 py-2.5 text-right font-bold whitespace-nowrap text-slate-800 bg-slate-100">Total (m)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayData.map((d, i) => (
                      <tr key={d.data} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} style={{ animation: `pedidos-rise 0.3s ${i * 0.03}s both` }}>
                        <td className="px-4 py-2.5 font-semibold text-slate-700 whitespace-nowrap">{fmtDate(d.data)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-sky-700 whitespace-nowrap">{fmtNum(d.VENDA)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-sky-600 whitespace-nowrap">{fmtPct(d.total ? (d.VENDA / d.total) * 100 : 0)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-amber-700 whitespace-nowrap">{fmtNum(d.BENEFICIAMENTO)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-amber-600 whitespace-nowrap">{fmtPct(d.total ? (d.BENEFICIAMENTO / d.total) * 100 : 0)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-emerald-700 whitespace-nowrap">{fmtNum(d.ESTOQUE)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600 whitespace-nowrap">{fmtPct(d.total ? (d.ESTOQUE / d.total) * 100 : 0)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-bold text-slate-800 bg-slate-100/60 whitespace-nowrap">{fmtNum(d.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-300">
                      <td className="px-4 py-3 font-extrabold text-slate-800">Total</td>
                      <td className="px-4 py-3 text-right tabular-nums font-extrabold text-sky-700">{fmtNum(totals.VENDA)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-sky-600">{fmtPct(totals.total ? (totals.VENDA / totals.total) * 100 : 0)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-extrabold text-amber-700">{fmtNum(totals.BENEFICIAMENTO)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-amber-600">{fmtPct(totals.total ? (totals.BENEFICIAMENTO / totals.total) * 100 : 0)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-extrabold text-emerald-700">{fmtNum(totals.ESTOQUE)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-emerald-600">{fmtPct(totals.total ? (totals.ESTOQUE / totals.total) * 100 : 0)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-extrabold text-slate-900 bg-slate-200/60">{fmtNum(totals.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

          </div>
        )}

        <ImportPedidosRevisaoDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          onImported={() => load()}
        />
      </DialogContent>
    </Dialog>
  );
}