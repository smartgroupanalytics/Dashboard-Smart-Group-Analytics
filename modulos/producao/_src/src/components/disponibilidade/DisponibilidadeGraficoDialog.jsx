import React, { useMemo, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { BarChart3, Filter, Check, ChevronDown } from "lucide-react";
import { MESES } from "@/lib/format";

const CATEGORIAS = [
  { key: "produzindo", label: "Produzindo", color: "#16a34a" },
  { key: "setup", label: "Setup", color: "#f97316" },
  { key: "parada_maq", label: "Parada de Máquina", color: "#f59e0b" },
  { key: "amostras", label: "Amostras", color: "#3b82f6" },
  { key: "retrabalho", label: "Retrabalho", color: "#8b5cf6" },
  { key: "ociosa", label: "Ociosa", color: "#ef4444" },
];

function MiniTooltip({ active, payload, label, color }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-slate-800 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
        <span className="font-semibold text-slate-800 tabular-nums">
          {(payload[0].value ?? 0).toFixed(1).replace(".", ",")}%
        </span>
      </div>
    </div>
  );
}

function MiniChart({ dataKey, label, color, data }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-3 h-3 rounded-sm" style={{ background: color }} />
        <h3 className="text-sm font-bold text-slate-700">{label}</h3>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 10, fontWeight: 600, fill: "#64748b" }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<MiniTooltip color={color} />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
          <Bar dataKey={dataKey} radius={[5, 5, 0, 0]} maxBarSize={42}>
            {data.map((_, i) => (
              <Cell key={i} fill={color} />
            ))}
            <LabelList
              dataKey={dataKey}
              position="top"
              formatter={(v) => `${(v ?? 0).toFixed(1).replace(".", ",")}%`}
              style={{ fontSize: 9, fontWeight: 700, fill: "#475569" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function DisponibilidadeGraficoDialog({ open, onOpenChange, records, ano = 2026 }) {
  const [selectedCats, setSelectedCats] = useState(CATEGORIAS.map((c) => c.key));
  const [popOpen, setPopOpen] = useState(false);

  useEffect(() => {
    if (open) setSelectedCats(CATEGORIAS.map((c) => c.key));
  }, [open]);

  const toggleCat = (key) => {
    setSelectedCats((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const data = useMemo(() => {
    return records
      .filter((r) => r.ano === ano)
      .sort((a, b) => a.mes - b.mes)
      .map((r) => {
        const entry = { mes: MESES[r.mes - 1]?.label || `Mês ${r.mes}` };
        CATEGORIAS.forEach((c) => {
          entry[c.key] = Number(r[c.key] ?? 0);
        });
        return entry;
      });
  }, [records, ano]);

  const visibleCats = CATEGORIAS.filter((c) => selectedCats.includes(c.key));
  const summary =
    selectedCats.length === CATEGORIAS.length
      ? "Todas"
      : selectedCats.length === 1
      ? CATEGORIAS.find((c) => c.key === selectedCats[0])?.label
      : `${selectedCats.length} selecionadas`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl bg-white border border-slate-200 shadow-2xl rounded-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-slate-100 sticky top-0 bg-white z-20">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2 text-slate-800 text-lg font-bold">
              <span className="w-9 h-9 rounded-xl bg-slate-900 grid place-items-center text-white">
                <BarChart3 className="w-5 h-5" />
              </span>
              Disponibilidade — {ano}
            </DialogTitle>
            <div className="relative">
              <button
                onClick={() => setPopOpen((v) => !v)}
                className="flex items-center gap-2 h-9 px-3.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                <Filter className="w-4 h-4 text-slate-500" />
                Categoria: <span className="text-slate-900">{summary}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              {popOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setPopOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 z-40 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Selecionar categorias
                    </div>
                    {CATEGORIAS.map((c) => {
                      const checked = selectedCats.includes(c.key);
                      return (
                        <button
                          key={c.key}
                          onClick={() => toggleCat(c.key)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              checked ? "border-transparent" : "border-slate-300"
                            }`}
                            style={checked ? { background: c.color } : {}}
                          >
                            {checked && <Check className="w-3 h-3 text-white" />}
                          </span>
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} />
                          {c.label}
                        </button>
                      );
                    })}
                    <div className="border-t border-slate-100 mt-1 pt-1 px-3 flex gap-2">
                      <button
                        onClick={() => setSelectedCats(CATEGORIAS.map((c) => c.key))}
                        className="flex-1 text-xs font-semibold text-slate-600 hover:text-slate-900 py-1.5"
                      >
                        Todas
                      </button>
                      <button
                        onClick={() => setSelectedCats([])}
                        className="flex-1 text-xs font-semibold text-slate-600 hover:text-slate-900 py-1.5"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogHeader>
        <div className="px-6 py-5">
          {data.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">Nenhum dado disponível para {ano}.</p>
            </div>
          ) : visibleCats.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Filter className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">Selecione ao menos uma categoria.</p>
            </div>
          ) : (
            <div
              className={`grid gap-4 ${
                visibleCats.length === 1
                  ? "grid-cols-1 max-w-2xl mx-auto"
                  : visibleCats.length === 2
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {visibleCats.map((c) => (
                <MiniChart
                  key={c.key}
                  dataKey={c.key}
                  label={c.label}
                  color={c.color}
                  data={data}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}