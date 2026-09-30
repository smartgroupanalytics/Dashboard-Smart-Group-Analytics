const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Plus, Trash2, Search } from "lucide-react";

const inputBase =
  "w-full text-sm bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-200 rounded px-2 py-1.5";

const PROCESSOS_ESTAMPA = ["Estampa 1", "Estampa 2", "Estampa 3"];

function SelectCell({ value, options, onCommit, onInput }) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => setLocal(value ?? ""), [value]);
  return (
    <select
      value={local || ""}
      onChange={(e) => { setLocal(e.target.value); onInput(e.target.value); }}
      onBlur={() => onCommit(local)}
      className={`${inputBase} text-center`}
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function TextCell({ value, onCommit, onInput, placeholder }) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => setLocal(value ?? ""), [value]);
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={local}
      onChange={(e) => { setLocal(e.target.value); onInput(e.target.value); }}
      onBlur={() => onCommit(local)}
      onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
      className={inputBase}
    />
  );
}

function minToTime(v) {
  if (v == null || v === "" || (typeof v === "number" && isNaN(v))) return "";
  const abs = Math.abs(v);
  const h = Math.floor(abs / 60);
  const m = Math.round(abs % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeToMin(s) {
  if (!s) return 0;
  const match = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return parseFloat(s) || 0;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function TimeCell({ value, onCommit, onInput, placeholder }) {
  const [local, setLocal] = useState(() => minToTime(value));
  useEffect(() => setLocal(minToTime(value)), [value]);
  return (
    <input
      type="text"
      inputMode="text"
      placeholder={placeholder || "HH:MM"}
      value={local || ""}
      onChange={(e) => { setLocal(e.target.value); onInput(timeToMin(e.target.value)); }}
      onBlur={() => onCommit(timeToMin(local))}
      onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
      className={`${inputBase} text-center tabular-nums`}
    />
  );
}

export default function FamiliaEstampaDialog({ open, onOpenChange }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [filter, setFilter] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const data = await db.entities.FamiliaEstampa.list();
      setRecords(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open) load(); }, [open]);

  const updateRow = (id, field, value) => {
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const commit = async (id, field, value) => {
    try {
      await db.entities.FamiliaEstampa.update(id, { [field]: value });
      setSavedId(`${id}-${Date.now()}`);
      setTimeout(() => setSavedId(null), 1200);
    } catch (e) {
      /* erro silencioso */
    }
  };

  const addRow = async () => {
    try {
      await db.entities.FamiliaEstampa.create({ familia: "", processo: "", tempo_setup: 0 });
      load();
    } catch (e) {
      /* erro silencioso */
    }
  };

  const removeRow = async (id) => {
    try {
      await db.entities.FamiliaEstampa.delete(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      /* erro silencioso */
    }
  };

  const filtered = records.filter((r) => {
    const f = filter.trim().toLowerCase();
    return !f || (r.familia || "").toLowerCase().includes(f);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Famílias das Estampas</DialogTitle>
          <DialogDescription>
            Cadastre as famílias de produto e seus tempos de setup previstos para as Estampas 1 e 2. A família casa com o início da descrição (o restante é a cor).
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por família..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-200 rounded w-52"
              />
            </div>
            {filter && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setFilter("")}>
                Limpar
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {savedId && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                <Check className="w-3 h-3" /> Salvo
              </span>
            )}
            <Button size="sm" className="gap-1 h-8" onClick={addRow}>
              <Plus className="w-4 h-4" /> Adicionar linha
            </Button>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground mb-3">
          Edite as células diretamente (estilo planilha) — as alterações são salvas ao sair do campo.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-7 h-7 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-50">
                <tr className="text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium w-[40%]">Família</th>
                  <th className="px-3 py-2 font-medium w-[20%] text-center">Processo</th>
                  <th className="px-3 py-2 font-medium w-[25%] text-center">Tempo de Setup (horas)</th>
                  <th className="px-3 py-2 font-medium text-center w-[15%]"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-2 py-1.5">
                      <TextCell
                        value={r.familia}
                        placeholder="Ex: CHASSI"
                        onInput={(v) => updateRow(r.id, "familia", v)}
                        onCommit={(v) => commit(r.id, "familia", v)}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <SelectCell
                        value={r.processo}
                        options={PROCESSOS_ESTAMPA}
                        onInput={(v) => updateRow(r.id, "processo", v)}
                        onCommit={(v) => commit(r.id, "processo", v)}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <TimeCell
                        value={r.tempo_setup}
                        placeholder="HH:MM"
                        onInput={(v) => updateRow(r.id, "tempo_setup", v)}
                        onCommit={(v) => commit(r.id, "tempo_setup", v)}
                      />
                    </td>
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
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                      {filter ? "Nenhum resultado para o filtro." : "Nenhum registro. Clique em \"Adicionar linha\"."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}