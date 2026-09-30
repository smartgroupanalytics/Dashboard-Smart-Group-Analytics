const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Save, Pencil } from "lucide-react";

const STATUS_STYLES = {
  "Aberto": "bg-blue-100 text-blue-700 border-blue-300",
  "Em Produção": "bg-amber-100 text-amber-700 border-amber-300",
  "Concluído": "bg-emerald-100 text-emerald-700 border-emerald-300",
  "Atrasado": "bg-rose-100 text-rose-700 border-rose-300",
  "Cancelado": "bg-red-200 text-red-800 border-red-500 font-bold",
};

const STATUS_OPTIONS = ["Aberto", "Em Produção", "Concluído", "Atrasado", "Cancelado"];

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function fmtDate(v) {
  if (!v) return "—";
  return v.split("-").reverse().join("/");
}

function fmtMeters(v) {
  if (v == null || isNaN(v)) return "—";
  return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function prazoDias(entrada, entrega) {
  if (!entrada || !entrega) return null;
  const e1 = new Date(entrada + "T00:00:00");
  const e2 = new Date(entrega + "T00:00:00");
  return Math.round((e2 - e1) / 86400000);
}

function EditableText({ value, onCommit, placeholder = "—" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); if ((draft ?? "") !== (value ?? "")) onCommit(draft); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.target.blur();
          if (e.key === "Escape") { setEditing(false); setDraft(value ?? ""); }
        }}
        className="w-full bg-white border border-blue-400 outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5 text-xs"
      />
    );
  }
  return (
    <span
      onClick={() => { setDraft(value ?? ""); setEditing(true); }}
      className="group relative inline-flex items-center gap-1 cursor-text rounded px-1 py-0.5 hover:bg-blue-50 hover:ring-1 hover:ring-blue-200"
      title="Clique para editar"
    >
      {value ? String(value) : <span className="text-slate-400">{placeholder}</span>}
      <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100" />
    </span>
  );
}

function EditableNumber({ value, onCommit, placeholder = "0" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        step="0.01"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); const n = draft === "" ? 0 : parseFloat(draft); if (n !== (value ?? 0)) onCommit(n); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.target.blur();
          if (e.key === "Escape") { setEditing(false); setDraft(value ?? ""); }
        }}
        className="w-20 text-right bg-white border border-blue-400 outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5 text-xs tabular-nums"
      />
    );
  }
  return (
    <span
      onClick={() => { setDraft(value ?? ""); setEditing(true); }}
      className="group inline-flex items-center gap-1 cursor-text rounded px-1 py-0.5 hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 tabular-nums"
      title="Clique para editar"
    >
      {value ? fmtMeters(value) : <span className="text-slate-400">{placeholder}</span>}
      <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100" />
    </span>
  );
}

function EditableDate({ value, onCommit }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <input
        autoFocus
        type="date"
        defaultValue={value || ""}
        onChange={(e) => { setEditing(false); onCommit(e.target.value || null); }}
        onBlur={() => setEditing(false)}
        className="bg-white border border-blue-400 outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5 text-[11px]"
      />
    );
  }
  return (
    <span
      onClick={() => setEditing(true)}
      className="group inline-flex items-center gap-1 cursor-text rounded px-1 py-0.5 hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 whitespace-nowrap"
      title="Clique para editar"
    >
      {value ? fmtDate(value) : <span className="text-slate-400">—</span>}
      <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100" />
    </span>
  );
}

export default function PedidosTable({ records, onChanged }) {
  // Estado local das linhas (edição sem salvar ainda)
  const [rows, setRows] = useState(records.map((r) => ({ ...r, _dirty: false })));
  const [removedIds, setRemovedIds] = useState([]);
  const [newRows, setNewRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    setRows(records.map((r) => ({ ...r, _dirty: false })));
    setRemovedIds([]);
    setNewRows([]);
  }, [records]);

  const hasPending =
    rows.some((r) => r._dirty) || newRows.length > 0 || removedIds.length > 0;

  const setField = (id, field, value) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value, _dirty: true } : r)));
  };

  const removeRow = (id) => {
    setRemovedIds((prev) => [...prev, id]);
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const addNewRow = () => {
    setNewRows((prev) => [
      ...prev,
      { _tempId: `new-${Date.now()}`, op: "", descricao: "", metros: "", data_entrada: todayISO(), data_entrega: "", complicador: "", status: "Aberto" },
    ]);
  };

  const setNewField = (tempId, field, value) => {
    setNewRows((prev) => prev.map((r) => (r._tempId === tempId ? { ...r, [field]: value } : r)));
  };

  const removeNewRow = (tempId) => {
    setNewRows((prev) => prev.filter((r) => r._tempId !== tempId));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      // Atualiza linhas editadas
      const dirty = rows.filter((r) => r._dirty);
      if (dirty.length > 0) {
        await db.entities.ControlePedido.bulkUpdate(
          dirty.map((r) => {
            const { _dirty, id, ...rest } = r;
            return { id, ...rest };
          })
        );
      }
      // Cria novas linhas
      if (newRows.length > 0) {
        await db.entities.ControlePedido.bulkCreate(
          newRows.map((r) => ({
            op: r.op.trim(),
            descricao: r.descricao.trim(),
            metros: r.metros ? Number(String(r.metros).replace(",", ".")) : 0,
            data_entrada: r.data_entrada || null,
            data_entrega: r.data_entrega || null,
            complicador: (r.complicador || "").trim(),
            status: r.status || "Aberto",
          }))
        );
      }
      // Remove linhas excluídas
      if (removedIds.length > 0) {
        await Promise.all(removedIds.map((id) => db.entities.ControlePedido.delete(id)));
      }
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 1500);
      if (onChanged) onChanged();
    } finally {
      setSaving(false);
    }
  };

  const renderRow = (r, isNew = false) => {
    const id = isNew ? r._tempId : r.id;
    const days = prazoDias(r.data_entrada, r.data_entrega);
    const prazoCls =
      days == null ? "text-slate-400" :
      days < 0 ? "text-rose-600 font-bold" :
      days <= 2 ? "text-amber-600 font-semibold" :
      "text-emerald-600";
    const prazoLabel = days == null ? "—" : `${days}d`;

    const setF = isNew ? (f, v) => setNewField(id, f, v) : (f, v) => setField(id, f, v);
    const remove = isNew ? () => removeNewRow(id) : () => removeRow(id);
    const statusVal = r.status || "Aberto";

    return (
      <tr key={id} className={`border-t border-slate-200 text-slate-700 hover:bg-slate-50/60 ${isNew ? "bg-blue-50/40" : ""}`}>
        <td className="px-3 py-1.5 whitespace-nowrap font-medium text-slate-900">
          {isNew ? (
            <input
              type="text"
              placeholder="OP"
              value={r.op}
              onChange={(e) => setF("op", e.target.value)}
              className="w-20 bg-white border border-slate-200 outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5"
            />
          ) : (
            <EditableText value={r.op} onCommit={(v) => setF("op", v)} placeholder="—" />
          )}
        </td>
        <td className="px-3 py-1.5 min-w-[180px]">
          {isNew ? (
            <input
              type="text"
              placeholder="Descrição"
              value={r.descricao}
              onChange={(e) => setF("descricao", e.target.value)}
              className="w-full min-w-[180px] bg-white border border-slate-200 outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5"
            />
          ) : (
            <EditableText value={r.descricao} onCommit={(v) => setF("descricao", v)} placeholder="—" />
          )}
        </td>
        <td className="px-3 py-1.5 text-right">
          {isNew ? (
            <input
              type="number"
              step="0.01"
              placeholder="0"
              value={r.metros}
              onChange={(e) => setF("metros", e.target.value)}
              className="w-20 text-right bg-white border border-slate-200 outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5 tabular-nums"
            />
          ) : (
            <EditableNumber value={r.metros} onCommit={(v) => setF("metros", v)} />
          )}
        </td>
        <td className="px-3 py-1.5 whitespace-nowrap">
          {isNew ? (
            <input
              type="date"
              value={r.data_entrada}
              onChange={(e) => setF("data_entrada", e.target.value)}
              className="bg-white border border-slate-200 outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5 text-[11px]"
            />
          ) : (
            <EditableDate value={r.data_entrada} onCommit={(v) => setF("data_entrada", v)} />
          )}
        </td>
        <td className="px-3 py-1.5 whitespace-nowrap">
          {isNew ? (
            <input
              type="date"
              value={r.data_entrega}
              onChange={(e) => setF("data_entrega", e.target.value)}
              className="bg-white border border-slate-200 outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5 text-[11px]"
            />
          ) : (
            <EditableDate value={r.data_entrega} onCommit={(v) => setF("data_entrega", v)} />
          )}
        </td>
        <td className={`px-3 py-1.5 whitespace-nowrap tabular-nums ${prazoCls}`}>{prazoLabel}</td>
        <td className="px-3 py-1.5 min-w-[140px]">
          {isNew ? (
            <input
              type="text"
              placeholder="Complicador"
              value={r.complicador}
              onChange={(e) => setF("complicador", e.target.value)}
              className="w-full min-w-[140px] bg-white border border-slate-200 outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5"
            />
          ) : (
            <EditableText value={r.complicador} onCommit={(v) => setF("complicador", v)} placeholder="—" />
          )}
        </td>
        <td className="px-3 py-1.5">
          <select
            value={statusVal}
            onChange={(e) => setF("status", e.target.value)}
            className={`text-[11px] font-medium rounded border px-2 py-0.5 outline-none cursor-pointer ${STATUS_STYLES[statusVal]}`}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </td>
        <td className="px-2 py-1.5 text-center">
          <button
            onClick={remove}
            className="text-slate-400 hover:text-rose-600 transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </td>
      </tr>
    );
  };

  return (
    <Card className="p-4 holographic-border">
      <div className="flex items-center justify-end mb-3 gap-4 print-hide">
        <div className="flex items-center gap-2">
          {savedAt && (
            <span className="text-[11px] text-emerald-600 font-medium">Salvo!</span>
          )}
          <Button
            size="sm"
            className="h-8 gap-1 bg-blue-700 hover:bg-blue-800 text-white"
            onClick={saveAll}
            disabled={saving || !hasPending}
          >
            <Save className="w-4 h-4" /> Salvar
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-slate-500 mb-3">
        Edite as células clicando e use o botão <strong>Salvar</strong> para persistir todas as alterações.
      </p>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-slate-100">
            <tr className="text-left text-slate-700">
              <th className="px-3 py-2 font-medium">OP</th>
              <th className="px-3 py-2 font-medium">Descrição</th>
              <th className="px-3 py-2 font-medium text-right">Metros</th>
              <th className="px-3 py-2 font-medium">Entrada</th>
              <th className="px-3 py-2 font-medium">Entrega</th>
              <th className="px-3 py-2 font-medium">Prazo</th>
              <th className="px-3 py-2 font-medium">Complicador</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-2 py-2 font-medium text-center"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => renderRow(r, false))}
            {newRows.map((r) => renderRow(r, true))}
            {rows.length === 0 && newRows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-slate-500">
                  Nenhum pedido cadastrado. Clique em "Novo Pedido" para adicionar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 print-hide">
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1 bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
          onClick={addNewRow}
        >
          <Plus className="w-4 h-4" /> Novo Pedido
        </Button>
      </div>
    </Card>
  );
}