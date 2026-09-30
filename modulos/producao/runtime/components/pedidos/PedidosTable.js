import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
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
    if (!v)
        return "—";
    return v.split("-").reverse().join("/");
}
function fmtMeters(v) {
    if (v == null || isNaN(v))
        return "—";
    return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function prazoDias(entrada, entrega) {
    if (!entrada || !entrega)
        return null;
    const e1 = new Date(entrada + "T00:00:00");
    const e2 = new Date(entrega + "T00:00:00");
    return Math.round((e2 - e1) / 86400000);
}
function EditableText({ value, onCommit, placeholder = "—" }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value ?? "");
    if (editing) {
        return (_jsx("input", { autoFocus: true, type: "text", value: draft, onChange: (e) => setDraft(e.target.value), onBlur: () => { setEditing(false); if ((draft ?? "") !== (value ?? ""))
                onCommit(draft); }, onKeyDown: (e) => {
                if (e.key === "Enter")
                    e.target.blur();
                if (e.key === "Escape") {
                    setEditing(false);
                    setDraft(value ?? "");
                }
            }, className: "w-full bg-white border border-blue-400 outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5 text-xs" }));
    }
    return (_jsxs("span", { onClick: () => { setDraft(value ?? ""); setEditing(true); }, className: "group relative inline-flex items-center gap-1 cursor-text rounded px-1 py-0.5 hover:bg-blue-50 hover:ring-1 hover:ring-blue-200", title: "Clique para editar", children: [value ? String(value) : _jsx("span", { className: "text-slate-400", children: placeholder }), _jsx(Pencil, { className: "w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100" })] }));
}
function EditableNumber({ value, onCommit, placeholder = "0" }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value ?? "");
    if (editing) {
        return (_jsx("input", { autoFocus: true, type: "number", step: "0.01", value: draft, onChange: (e) => setDraft(e.target.value), onBlur: () => { setEditing(false); const n = draft === "" ? 0 : parseFloat(draft); if (n !== (value ?? 0))
                onCommit(n); }, onKeyDown: (e) => {
                if (e.key === "Enter")
                    e.target.blur();
                if (e.key === "Escape") {
                    setEditing(false);
                    setDraft(value ?? "");
                }
            }, className: "w-20 text-right bg-white border border-blue-400 outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5 text-xs tabular-nums" }));
    }
    return (_jsxs("span", { onClick: () => { setDraft(value ?? ""); setEditing(true); }, className: "group inline-flex items-center gap-1 cursor-text rounded px-1 py-0.5 hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 tabular-nums", title: "Clique para editar", children: [value ? fmtMeters(value) : _jsx("span", { className: "text-slate-400", children: placeholder }), _jsx(Pencil, { className: "w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100" })] }));
}
function EditableDate({ value, onCommit }) {
    const [editing, setEditing] = useState(false);
    if (editing) {
        return (_jsx("input", { autoFocus: true, type: "date", defaultValue: value || "", onChange: (e) => { setEditing(false); onCommit(e.target.value || null); }, onBlur: () => setEditing(false), className: "bg-white border border-blue-400 outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5 text-[11px]" }));
    }
    return (_jsxs("span", { onClick: () => setEditing(true), className: "group inline-flex items-center gap-1 cursor-text rounded px-1 py-0.5 hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 whitespace-nowrap", title: "Clique para editar", children: [value ? fmtDate(value) : _jsx("span", { className: "text-slate-400", children: "\u2014" }), _jsx(Pencil, { className: "w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100" })] }));
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
    const hasPending = rows.some((r) => r._dirty) || newRows.length > 0 || removedIds.length > 0;
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
                await db.entities.ControlePedido.bulkUpdate(dirty.map((r) => {
                    const { _dirty, id, ...rest } = r;
                    return { id, ...rest };
                }));
            }
            // Cria novas linhas
            if (newRows.length > 0) {
                await db.entities.ControlePedido.bulkCreate(newRows.map((r) => ({
                    op: r.op.trim(),
                    descricao: r.descricao.trim(),
                    metros: r.metros ? Number(String(r.metros).replace(",", ".")) : 0,
                    data_entrada: r.data_entrada || null,
                    data_entrega: r.data_entrega || null,
                    complicador: (r.complicador || "").trim(),
                    status: r.status || "Aberto",
                })));
            }
            // Remove linhas excluídas
            if (removedIds.length > 0) {
                await Promise.all(removedIds.map((id) => db.entities.ControlePedido.delete(id)));
            }
            setSavedAt(Date.now());
            setTimeout(() => setSavedAt(null), 1500);
            if (onChanged)
                onChanged();
        }
        finally {
            setSaving(false);
        }
    };
    const renderRow = (r, isNew = false) => {
        const id = isNew ? r._tempId : r.id;
        const days = prazoDias(r.data_entrada, r.data_entrega);
        const prazoCls = days == null ? "text-slate-400" :
            days < 0 ? "text-rose-600 font-bold" :
                days <= 2 ? "text-amber-600 font-semibold" :
                    "text-emerald-600";
        const prazoLabel = days == null ? "—" : `${days}d`;
        const setF = isNew ? (f, v) => setNewField(id, f, v) : (f, v) => setField(id, f, v);
        const remove = isNew ? () => removeNewRow(id) : () => removeRow(id);
        const statusVal = r.status || "Aberto";
        return (_jsxs("tr", { className: `border-t border-slate-200 text-slate-700 hover:bg-slate-50/60 ${isNew ? "bg-blue-50/40" : ""}`, children: [_jsx("td", { className: "px-3 py-1.5 whitespace-nowrap font-medium text-slate-900", children: isNew ? (_jsx("input", { type: "text", placeholder: "OP", value: r.op, onChange: (e) => setF("op", e.target.value), className: "w-20 bg-white border border-slate-200 outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5" })) : (_jsx(EditableText, { value: r.op, onCommit: (v) => setF("op", v), placeholder: "\u2014" })) }), _jsx("td", { className: "px-3 py-1.5 min-w-[180px]", children: isNew ? (_jsx("input", { type: "text", placeholder: "Descri\u00E7\u00E3o", value: r.descricao, onChange: (e) => setF("descricao", e.target.value), className: "w-full min-w-[180px] bg-white border border-slate-200 outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5" })) : (_jsx(EditableText, { value: r.descricao, onCommit: (v) => setF("descricao", v), placeholder: "\u2014" })) }), _jsx("td", { className: "px-3 py-1.5 text-right", children: isNew ? (_jsx("input", { type: "number", step: "0.01", placeholder: "0", value: r.metros, onChange: (e) => setF("metros", e.target.value), className: "w-20 text-right bg-white border border-slate-200 outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5 tabular-nums" })) : (_jsx(EditableNumber, { value: r.metros, onCommit: (v) => setF("metros", v) })) }), _jsx("td", { className: "px-3 py-1.5 whitespace-nowrap", children: isNew ? (_jsx("input", { type: "date", value: r.data_entrada, onChange: (e) => setF("data_entrada", e.target.value), className: "bg-white border border-slate-200 outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5 text-[11px]" })) : (_jsx(EditableDate, { value: r.data_entrada, onCommit: (v) => setF("data_entrada", v) })) }), _jsx("td", { className: "px-3 py-1.5 whitespace-nowrap", children: isNew ? (_jsx("input", { type: "date", value: r.data_entrega, onChange: (e) => setF("data_entrega", e.target.value), className: "bg-white border border-slate-200 outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5 text-[11px]" })) : (_jsx(EditableDate, { value: r.data_entrega, onCommit: (v) => setF("data_entrega", v) })) }), _jsx("td", { className: `px-3 py-1.5 whitespace-nowrap tabular-nums ${prazoCls}`, children: prazoLabel }), _jsx("td", { className: "px-3 py-1.5 min-w-[140px]", children: isNew ? (_jsx("input", { type: "text", placeholder: "Complicador", value: r.complicador, onChange: (e) => setF("complicador", e.target.value), className: "w-full min-w-[140px] bg-white border border-slate-200 outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5" })) : (_jsx(EditableText, { value: r.complicador, onCommit: (v) => setF("complicador", v), placeholder: "\u2014" })) }), _jsx("td", { className: "px-3 py-1.5", children: _jsx("select", { value: statusVal, onChange: (e) => setF("status", e.target.value), className: `text-[11px] font-medium rounded border px-2 py-0.5 outline-none cursor-pointer ${STATUS_STYLES[statusVal]}`, children: STATUS_OPTIONS.map((s) => (_jsx("option", { value: s, children: s }, s))) }) }), _jsx("td", { className: "px-2 py-1.5 text-center", children: _jsx("button", { onClick: remove, className: "text-slate-400 hover:text-rose-600 transition-colors", title: "Excluir", children: _jsx(Trash2, { className: "w-3.5 h-3.5" }) }) })] }, id));
    };
    return (_jsxs(Card, { className: "p-4 holographic-border", children: [_jsx("div", { className: "flex items-center justify-end mb-3 gap-4 print-hide", children: _jsxs("div", { className: "flex items-center gap-2", children: [savedAt && (_jsx("span", { className: "text-[11px] text-emerald-600 font-medium", children: "Salvo!" })), _jsxs(Button, { size: "sm", className: "h-8 gap-1 bg-blue-700 hover:bg-blue-800 text-white", onClick: saveAll, disabled: saving || !hasPending, children: [_jsx(Save, { className: "w-4 h-4" }), " Salvar"] })] }) }), _jsxs("p", { className: "text-[11px] text-slate-500 mb-3", children: ["Edite as c\u00E9lulas clicando e use o bot\u00E3o ", _jsx("strong", { children: "Salvar" }), " para persistir todas as altera\u00E7\u00F5es."] }), _jsx("div", { className: "overflow-x-auto rounded-lg border border-slate-200", children: _jsxs("table", { className: "w-full text-xs border-collapse", children: [_jsx("thead", { className: "bg-slate-100", children: _jsxs("tr", { className: "text-left text-slate-700", children: [_jsx("th", { className: "px-3 py-2 font-medium", children: "OP" }), _jsx("th", { className: "px-3 py-2 font-medium", children: "Descri\u00E7\u00E3o" }), _jsx("th", { className: "px-3 py-2 font-medium text-right", children: "Metros" }), _jsx("th", { className: "px-3 py-2 font-medium", children: "Entrada" }), _jsx("th", { className: "px-3 py-2 font-medium", children: "Entrega" }), _jsx("th", { className: "px-3 py-2 font-medium", children: "Prazo" }), _jsx("th", { className: "px-3 py-2 font-medium", children: "Complicador" }), _jsx("th", { className: "px-3 py-2 font-medium", children: "Status" }), _jsx("th", { className: "px-2 py-2 font-medium text-center" })] }) }), _jsxs("tbody", { children: [rows.map((r) => renderRow(r, false)), newRows.map((r) => renderRow(r, true)), rows.length === 0 && newRows.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 9, className: "px-3 py-6 text-center text-slate-500", children: "Nenhum pedido cadastrado. Clique em \"Novo Pedido\" para adicionar." }) }))] })] }) }), _jsx("div", { className: "mt-3 print-hide", children: _jsxs(Button, { size: "sm", variant: "outline", className: "h-8 gap-1 bg-white text-slate-700 border-slate-300 hover:bg-slate-100", onClick: addNewRow, children: [_jsx(Plus, { className: "w-4 h-4" }), " Novo Pedido"] }) })] }));
}
