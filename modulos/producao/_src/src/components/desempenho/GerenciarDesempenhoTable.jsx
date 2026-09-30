const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Plus, Trash2 } from "lucide-react";

const EDITABLE_FIELDS = [
  { key: "tempo_produzido", label: "Tempo Produzido (h)", type: "number" },
  { key: "tempo_parado", label: "Parada de Máquina (h)", type: "number" },
  { key: "setup", label: "Setup (h)", type: "number" },
  { key: "retrabalho", label: "Retrabalho (h)", type: "number" },
  { key: "amostras", label: "Amostras (h)", type: "number" },
  { key: "tempo_ocioso", label: "Tempo Ocioso (h)", type: "number" },
  { key: "num_ops", label: "N° de OPs", type: "number" },
  { key: "metros_realizados", label: "Metros Realizados", type: "number" },
];

const MACHINE_ORDER = ["JR", "Gravadora", "Estampa 1", "Estampa 2", "Digital Solvente", "Digital UV", "GR2"];

function sortByDate(a, b) {
  return (a.data || "").localeCompare(b.data || "");
}

function NumCell({ value, onCommit, onInput }) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => setLocal(value ?? ""), [value]);
  return (
    <input
      type="number"
      step="0.01"
      value={local}
      onChange={(e) => {
        setLocal(e.target.value);
        onInput(e.target.value === "" ? 0 : parseFloat(e.target.value));
      }}
      onBlur={() => onCommit(local === "" ? 0 : parseFloat(local))}
      onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
      className="w-28 text-right text-sm tabular-nums bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-200 rounded px-2 py-1.5"
    />
  );
}

export default function GerenciarDesempenhoTable({ records, onSaved }) {
  const [rows, setRows] = useState(records);
  const [savedId, setSavedId] = useState(null);

  useEffect(() => setRows(records), [records]);

  const sorted = rows.slice().sort(sortByDate);

  const updateRow = (id, field, value) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const commit = async (id, field, value) => {
    try {
      await db.entities.DesempenhoMaquina.update(id, { [field]: value });
      setSavedId(`${id}-${Date.now()}`);
      setTimeout(() => setSavedId(null), 1200);
      if (onSaved) onSaved();
    } catch (e) {
      /* erro silencioso */
    }
  };

  const addRow = async () => {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    try {
      await db.entities.DesempenhoMaquina.create({ data: iso, maquina: MACHINE_ORDER[0] });
      if (onSaved) onSaved();
    } catch (e) {
      /* erro silencioso */
    }
  };

  const removeRow = async (id) => {
    try {
      await db.entities.DesempenhoMaquina.delete(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      if (onSaved) onSaved();
    } catch (e) {
      /* erro silencioso */
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Gerenciar Registros</h3>
          {savedId && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-600">
              <Check className="w-3 h-3" /> Salvo
            </span>
          )}
        </div>
        <Button size="sm" className="gap-1 h-8" onClick={addRow}>
          <Plus className="w-4 h-4" /> Adicionar linha
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        Edite as células diretamente (estilo planilha) — as alterações são salvas ao sair do campo.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-slate-50">
            <tr className="text-left text-muted-foreground">
              <th className="px-3 py-2 font-medium">Data</th>
              <th className="px-3 py-2 font-medium">Máquina</th>
              {EDITABLE_FIELDS.map((f) => (
                <th key={f.key} className="px-3 py-2 font-medium text-right">{f.label}</th>
              ))}
              <th className="px-3 py-2 font-medium text-center"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-2 py-1.5">
                  <input
                    type="date"
                    value={r.data ? r.data.slice(0, 10) : ""}
                    onChange={(e) => {
                      updateRow(r.id, "data", e.target.value);
                      commit(r.id, "data", e.target.value);
                    }}
                    className="text-sm bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-200 rounded px-2 py-1.5"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={r.maquina || ""}
                    onChange={(e) => {
                      updateRow(r.id, "maquina", e.target.value);
                      commit(r.id, "maquina", e.target.value);
                    }}
                    className="text-sm bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-200 rounded px-2 py-1.5"
                  >
                    {MACHINE_ORDER.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </td>
                {EDITABLE_FIELDS.map((f) => (
                  <td key={f.key} className="px-1 py-1 text-right">
                    <NumCell
                      value={r[f.key]}
                      onInput={(v) => updateRow(r.id, f.key, v)}
                      onCommit={(v) => commit(r.id, f.key, v)}
                    />
                  </td>
                ))}
                <td className="px-2 py-1.5 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-rose-500 hover:text-rose-700"
                    onClick={() => removeRow(r.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">
                  Nenhum registro. Clique em "Adicionar linha".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}