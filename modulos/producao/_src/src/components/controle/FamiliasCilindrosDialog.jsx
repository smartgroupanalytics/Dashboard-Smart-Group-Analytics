const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Plus, Trash2, Search } from "lucide-react";

const MAQUINAS = ["Gravadora", "Estampa 1", "Estampa 2", "GR2", "JR", "Digital Solvente", "Digital UV"];

const inputBase =
  "w-full text-sm bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-200 rounded px-2 py-1.5";

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

export default function FamiliasCilindrosDialog({ open, onOpenChange }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [filterFamilia, setFilterFamilia] = useState("");
  const [filterCilindro, setFilterCilindro] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const data = await db.entities.FamiliaCilindro.list();
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
      await db.entities.FamiliaCilindro.update(id, { [field]: value });
      setSavedId(`${id}-${Date.now()}`);
      setTimeout(() => setSavedId(null), 1200);
    } catch (e) {
      /* erro silencioso */
    }
  };

  const addRow = async () => {
    try {
      await db.entities.FamiliaCilindro.create({ familia: "", cilindro: "", maquina: "Gravadora" });
      load();
    } catch (e) {
      /* erro silencioso */
    }
  };

  const removeRow = async (id) => {
    try {
      await db.entities.FamiliaCilindro.delete(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      /* erro silencioso */
    }
  };

  const filtered = records.filter((r) => {
    const f = filterFamilia.trim().toLowerCase();
    const c = filterCilindro.trim().toLowerCase();
    const okF = !f || (r.familia || "").toLowerCase().includes(f);
    const okC = !c || (r.cilindro || "").toLowerCase().includes(c);
    return okF && okC;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Famílias e Cilindros</DialogTitle>
          <DialogDescription>
            Cadastre a vinculação entre famílias de produto e cilindros. Usado no setup previsto da gravação — OPs com o mesmo cilindro contam o setup apenas uma vez.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por família..."
                value={filterFamilia}
                onChange={(e) => setFilterFamilia(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-200 rounded w-52"
              />
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por cilindro..."
                value={filterCilindro}
                onChange={(e) => setFilterCilindro(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-200 rounded w-52"
              />
            </div>
            {(filterFamilia || filterCilindro) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => { setFilterFamilia(""); setFilterCilindro(""); }}
              >
                Limpar filtros
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
                  <th className="px-3 py-2 font-medium w-[30%]">Cilindro</th>
                  <th className="px-3 py-2 font-medium w-[20%]">Máquina</th>
                  <th className="px-3 py-2 font-medium text-center w-[10%]"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-2 py-1.5">
                      <TextCell
                        value={r.familia}
                        placeholder="Ex: RAFIA"
                        onInput={(v) => updateRow(r.id, "familia", v)}
                        onCommit={(v) => commit(r.id, "familia", v)}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <TextCell
                        value={r.cilindro}
                        placeholder="Ex: ZURICH"
                        onInput={(v) => updateRow(r.id, "cilindro", v)}
                        onCommit={(v) => commit(r.id, "cilindro", v)}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={r.maquina || ""}
                        onChange={(e) => {
                          updateRow(r.id, "maquina", e.target.value);
                          commit(r.id, "maquina", e.target.value);
                        }}
                        className={inputBase}
                      >
                        {MAQUINAS.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
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
                      {(filterFamilia || filterCilindro) ? "Nenhum resultado para os filtros." : "Nenhum registro. Clique em \"Adicionar linha\"."}
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