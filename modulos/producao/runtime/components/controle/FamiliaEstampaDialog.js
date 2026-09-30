import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Plus, Trash2, Search } from "lucide-react";
const inputBase = "w-full text-sm bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-200 rounded px-2 py-1.5";
const PROCESSOS_ESTAMPA = ["Estampa 1", "Estampa 2", "Estampa 3"];
function SelectCell({ value, options, onCommit, onInput }) {
    const [local, setLocal] = useState(value ?? "");
    useEffect(() => setLocal(value ?? ""), [value]);
    return (_jsxs("select", { value: local || "", onChange: (e) => { setLocal(e.target.value); onInput(e.target.value); }, onBlur: () => onCommit(local), className: `${inputBase} text-center`, children: [_jsx("option", { value: "", children: "\u2014" }), options.map((o) => (_jsx("option", { value: o, children: o }, o)))] }));
}
function TextCell({ value, onCommit, onInput, placeholder }) {
    const [local, setLocal] = useState(value ?? "");
    useEffect(() => setLocal(value ?? ""), [value]);
    return (_jsx("input", { type: "text", placeholder: placeholder, value: local, onChange: (e) => { setLocal(e.target.value); onInput(e.target.value); }, onBlur: () => onCommit(local), onKeyDown: (e) => { if (e.key === "Enter")
            e.target.blur(); }, className: inputBase }));
}
function minToTime(v) {
    if (v == null || v === "" || (typeof v === "number" && isNaN(v)))
        return "";
    const abs = Math.abs(v);
    const h = Math.floor(abs / 60);
    const m = Math.round(abs % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function timeToMin(s) {
    if (!s)
        return 0;
    const match = s.match(/^(\d{1,2}):(\d{1,2})$/);
    if (!match)
        return parseFloat(s) || 0;
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}
function TimeCell({ value, onCommit, onInput, placeholder }) {
    const [local, setLocal] = useState(() => minToTime(value));
    useEffect(() => setLocal(minToTime(value)), [value]);
    return (_jsx("input", { type: "text", inputMode: "text", placeholder: placeholder || "HH:MM", value: local || "", onChange: (e) => { setLocal(e.target.value); onInput(timeToMin(e.target.value)); }, onBlur: () => onCommit(timeToMin(local)), onKeyDown: (e) => { if (e.key === "Enter")
            e.target.blur(); }, className: `${inputBase} text-center tabular-nums` }));
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
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { if (open)
        load(); }, [open]);
    const updateRow = (id, field, value) => {
        setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    };
    const commit = async (id, field, value) => {
        try {
            await db.entities.FamiliaEstampa.update(id, { [field]: value });
            setSavedId(`${id}-${Date.now()}`);
            setTimeout(() => setSavedId(null), 1200);
        }
        catch (e) {
            /* erro silencioso */
        }
    };
    const addRow = async () => {
        try {
            await db.entities.FamiliaEstampa.create({ familia: "", processo: "", tempo_setup: 0 });
            load();
        }
        catch (e) {
            /* erro silencioso */
        }
    };
    const removeRow = async (id) => {
        try {
            await db.entities.FamiliaEstampa.delete(id);
            setRecords((prev) => prev.filter((r) => r.id !== id));
        }
        catch (e) {
            /* erro silencioso */
        }
    };
    const filtered = records.filter((r) => {
        const f = filter.trim().toLowerCase();
        return !f || (r.familia || "").toLowerCase().includes(f);
    });
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-3xl max-h-[85vh] overflow-y-auto", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Fam\u00EDlias das Estampas" }), _jsx(DialogDescription, { children: "Cadastre as fam\u00EDlias de produto e seus tempos de setup previstos para as Estampas 1 e 2. A fam\u00EDlia casa com o in\u00EDcio da descri\u00E7\u00E3o (o restante \u00E9 a cor)." })] }), _jsxs("div", { className: "flex items-center justify-between mb-4 gap-4 flex-wrap", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "relative", children: [_jsx(Search, { className: "w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" }), _jsx("input", { type: "text", placeholder: "Filtrar por fam\u00EDlia...", value: filter, onChange: (e) => setFilter(e.target.value), className: "pl-8 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-200 rounded w-52" })] }), filter && (_jsx(Button, { variant: "ghost", size: "sm", className: "h-8 text-xs", onClick: () => setFilter(""), children: "Limpar" }))] }), _jsxs("div", { className: "flex items-center gap-2", children: [savedId && (_jsxs("span", { className: "flex items-center gap-1 text-[11px] text-emerald-600", children: [_jsx(Check, { className: "w-3 h-3" }), " Salvo"] })), _jsxs(Button, { size: "sm", className: "gap-1 h-8", onClick: addRow, children: [_jsx(Plus, { className: "w-4 h-4" }), " Adicionar linha"] })] })] }), _jsx("p", { className: "text-[11px] text-muted-foreground mb-3", children: "Edite as c\u00E9lulas diretamente (estilo planilha) \u2014 as altera\u00E7\u00F5es s\u00E3o salvas ao sair do campo." }), loading ? (_jsx("div", { className: "flex items-center justify-center py-10", children: _jsx("div", { className: "w-7 h-7 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" }) })) : (_jsx("div", { className: "overflow-x-auto rounded-lg border border-border", children: _jsxs("table", { className: "w-full text-sm border-collapse", children: [_jsx("thead", { className: "bg-slate-50", children: _jsxs("tr", { className: "text-left text-muted-foreground", children: [_jsx("th", { className: "px-3 py-2 font-medium w-[40%]", children: "Fam\u00EDlia" }), _jsx("th", { className: "px-3 py-2 font-medium w-[20%] text-center", children: "Processo" }), _jsx("th", { className: "px-3 py-2 font-medium w-[25%] text-center", children: "Tempo de Setup (horas)" }), _jsx("th", { className: "px-3 py-2 font-medium text-center w-[15%]" })] }) }), _jsxs("tbody", { children: [filtered.map((r) => (_jsxs("tr", { className: "border-t border-border", children: [_jsx("td", { className: "px-2 py-1.5", children: _jsx(TextCell, { value: r.familia, placeholder: "Ex: CHASSI", onInput: (v) => updateRow(r.id, "familia", v), onCommit: (v) => commit(r.id, "familia", v) }) }), _jsx("td", { className: "px-2 py-1.5", children: _jsx(SelectCell, { value: r.processo, options: PROCESSOS_ESTAMPA, onInput: (v) => updateRow(r.id, "processo", v), onCommit: (v) => commit(r.id, "processo", v) }) }), _jsx("td", { className: "px-2 py-1.5", children: _jsx(TimeCell, { value: r.tempo_setup, placeholder: "HH:MM", onInput: (v) => updateRow(r.id, "tempo_setup", v), onCommit: (v) => commit(r.id, "tempo_setup", v) }) }), _jsx("td", { className: "px-2 py-1.5 text-center", children: _jsx(Button, { variant: "ghost", size: "icon", className: "h-8 w-8 text-rose-500 hover:text-rose-700", onClick: () => removeRow(r.id), children: _jsx(Trash2, { className: "w-4 h-4" }) }) })] }, r.id))), filtered.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 4, className: "px-3 py-6 text-center text-muted-foreground", children: filter ? "Nenhum resultado para o filtro." : "Nenhum registro. Clique em \"Adicionar linha\"." }) }))] })] }) }))] }) }));
}
