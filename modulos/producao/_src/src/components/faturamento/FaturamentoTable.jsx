const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useMemo, useState, useEffect } from "react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Check } from "lucide-react";
import { MESES, fmtCurrency, fmtPrice } from "@/lib/format";

const EDITABLE_FIELDS = [
  "faturamento_smart_group",
  "metros_smart_group",
  "faturamento_stk",
  "metros_stk",
  "faturamento_previsto_2026",
  "faturamento_2025",
  "metros_2025",
  "preco_medio_orcado",
  "preco_medio_realizado",
];

const diffFmt = (v) => {
  const sign = v > 0 ? "+" : "";
  return sign + new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
};

const pctFmt = (v) => {
  const sign = v > 0 ? "+" : "";
  return sign + v.toFixed(1).replace(".", ",") + "%";
};

function calcRow(r) {
  const sg = r.faturamento_smart_group || 0;
  const msg = r.metros_smart_group || 0;
  const stk = r.faturamento_stk || 0;
  const mstk = r.metros_stk || 0;
  const fat2025 = r.faturamento_2025 || 0;
  const previsto = r.faturamento_previsto_2026 || 0;
  const totalFat = sg + stk;
  const totalMetros = msg + mstk;
  return {
    precoSG: msg ? sg / msg : 0,
    precoSTK: mstk ? stk / mstk : 0,
    precoGeral: totalMetros ? totalFat / totalMetros : 0,
    dif2025Valor: totalFat - fat2025,
    dif2025Pct: fat2025 ? ((totalFat - fat2025) / fat2025) * 100 : 0,
    difPrevistoValor: totalFat - previsto,
    difPrevistoPct: previsto ? ((totalFat - previsto) / previsto) * 100 : 0,
  };
}

function EditableCell({ value, onCommit, onInput }) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => setLocal(value ?? ""), [value]);
  return (
    <td className="px-1 py-1 text-right">
      <input
        type="number"
        step="0.01"
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          onInput(e.target.value === "" ? 0 : parseFloat(e.target.value));
        }}
        onBlur={() => onCommit(local === "" ? 0 : parseFloat(local))}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.target.blur();
        }}
        className="w-28 text-right text-xs tabular-nums bg-transparent outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-200 rounded px-1.5 py-1"
      />
    </td>
  );
}

function DiffCell({ valor, pct }) {
  const color = valor > 0 ? "text-emerald-600" : valor < 0 ? "text-rose-600" : "text-muted-foreground";
  return (
    <td className={`px-3 py-2 text-right tabular-nums align-top ${color}`}>
      <div>{diffFmt(valor)}</div>
      <div className="text-[10px]">{pctFmt(pct)}</div>
    </td>
  );
}

export default function FaturamentoTable({ records, onSaved }) {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState(records);
  const [savedId, setSavedId] = useState(null);

  useEffect(() => setRows(records), [records]);

  const updateRow = (id, field, value) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const commit = async (id, field, value) => {
    try {
      await db.entities.Faturamento.update(id, { [field]: value });
      setSavedId(`${id}-${field}-${Date.now()}`);
      setTimeout(() => setSavedId(null), 1200);
      if (onSaved) onSaved();
    } catch (e) {
      /* erro silencioso */
    }
  };

  const filtered = useMemo(() => {
    const sorted = rows.slice().sort((a, b) => a.mes - b.mes);
    if (!search) return sorted;
    const q = search.toLowerCase();
    return sorted.filter((r) => MESES[r.mes - 1]?.label.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Tabela de Faturamento</h3>
          {savedId && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-600">
              <Check className="w-3 h-3" /> Salvo
            </span>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar mês..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 w-48"
          />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        Edite as células diretamente — as alterações são salvas ao sair do campo. As colunas calculadas atualizam em tempo real.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-slate-50">
            <tr className="text-left text-muted-foreground">
              <th className="px-3 py-2 font-medium sticky left-0 bg-slate-50 z-10">Mês</th>
              <th className="px-3 py-2 font-medium text-right">Fat. Smart Group</th>
              <th className="px-3 py-2 font-medium text-right">Metros Smart Group</th>
              <th className="px-3 py-2 font-medium text-right">Fat. STK</th>
              <th className="px-3 py-2 font-medium text-right">Metros STK</th>
              <th className="px-3 py-2 font-medium text-right">Previsto 2026</th>
              <th className="px-3 py-2 font-medium text-right">Fat. 2025</th>
              <th className="px-3 py-2 font-medium text-right">Metros 2025</th>
              <th className="px-3 py-2 font-medium text-right">Preço Orçado</th>
              <th className="px-3 py-2 font-medium text-right">Preço Realizado</th>
              <th className="px-3 py-2 font-medium text-right">Preço SG</th>
              <th className="px-3 py-2 font-medium text-right">Preço STK</th>
              <th className="px-3 py-2 font-medium text-right">Preço Geral</th>
              <th className="px-3 py-2 font-medium text-right">Dif vs 2025</th>
              <th className="px-3 py-2 font-medium text-right">Dif vs Previsto</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const c = calcRow(r);
              return (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-1 font-medium sticky left-0 bg-white whitespace-nowrap z-10">
                    {MESES[r.mes - 1]?.label}
                  </td>
                  {EDITABLE_FIELDS.map((field) => (
                    <EditableCell
                      key={field}
                      value={r[field]}
                      onInput={(v) => updateRow(r.id, field, v)}
                      onCommit={(v) => commit(r.id, field, v)}
                    />
                  ))}
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap bg-slate-50/60">{fmtPrice(c.precoSG)}</td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap bg-slate-50/60">{fmtPrice(c.precoSTK)}</td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap bg-slate-50/60">{fmtPrice(c.precoGeral)}</td>
                  <DiffCell valor={c.dif2025Valor} pct={c.dif2025Pct} />
                  <DiffCell valor={c.difPrevistoValor} pct={c.difPrevistoPct} />
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={15} className="px-3 py-6 text-center text-muted-foreground">
                  Nenhum resultado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}