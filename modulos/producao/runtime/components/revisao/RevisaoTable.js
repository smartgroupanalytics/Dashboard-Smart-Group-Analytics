import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Check } from "lucide-react";
import { MESES } from "@/lib/format";
const EDITABLE_FIELDS = [
    { key: "metros_jumpados", label: "Metros Jumbados" },
    { key: "metros_revisados", label: "Metros Revisados" },
    { key: "metros_quebra", label: "Metros de Quebra" },
    { key: "ops_revisadas", label: "OPs Revisadas" },
];
function pctQuebra(r) {
    const j = r.metros_jumpados || 0;
    const m1 = r.metros_1 || 0;
    return j ? ((j - m1) / j) * 100 : 0;
}
function EditableCell({ value, onCommit, onInput }) {
    const [local, setLocal] = useState(value ?? "");
    useEffect(() => setLocal(value ?? ""), [value]);
    return (_jsx("td", { className: "px-1 py-1 text-right", children: _jsx("input", { type: "number", step: "0.01", value: local, onChange: (e) => {
                setLocal(e.target.value);
                onInput(e.target.value === "" ? 0 : parseFloat(e.target.value));
            }, onBlur: () => onCommit(local === "" ? 0 : parseFloat(local)), onKeyDown: (e) => {
                if (e.key === "Enter")
                    e.target.blur();
            }, className: "w-28 text-right text-xs tabular-nums bg-transparent outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-200 rounded px-1.5 py-1" }) }));
}
export default function RevisaoTable({ records, onSaved }) {
    const [search, setSearch] = useState("");
    const [rows, setRows] = useState(records);
    const [savedId, setSavedId] = useState(null);
    useEffect(() => setRows(records), [records]);
    const updateRow = (id, field, value) => {
        setRows((prev) => prev.map((r) => {
            if (r.id !== id)
                return r;
            const next = { ...r, [field]: value };
            if (field === "metros_revisados" || field === "metros_quebra") {
                next.metros_1 = Math.round(((next.metros_revisados || 0) - (next.metros_quebra || 0)) * 100) / 100;
            }
            return next;
        }));
    };
    const commit = async (id, field, value) => {
        try {
            const payload = { [field]: value };
            const row = rows.find((r) => r.id === id);
            if (field === "metros_revisados" || field === "metros_quebra") {
                const rev = field === "metros_revisados" ? value : row.metros_revisados || 0;
                const quebra = field === "metros_quebra" ? value : row.metros_quebra || 0;
                payload.metros_1 = Math.round((rev - quebra) * 100) / 100;
            }
            await db.entities.Revisao.update(id, payload);
            setSavedId(`${id}-${field}-${Date.now()}`);
            setTimeout(() => setSavedId(null), 1200);
            if (onSaved)
                onSaved();
        }
        catch (e) {
            /* erro silencioso */
        }
    };
    const fmtData = (r) => {
        if (r.data) {
            const [y, m, d] = String(r.data).split("-");
            return `${d}/${m}/${y}`;
        }
        return MESES[r.mes - 1]?.label || "—";
    };
    const filtered = useMemo(() => {
        const sorted = rows.slice().sort((a, b) => {
            const da = a.data || "";
            const db = b.data || "";
            if (da && db)
                return db.localeCompare(da);
            if (da)
                return -1;
            if (db)
                return 1;
            return b.mes - a.mes;
        });
        if (!search)
            return sorted;
        const q = search.toLowerCase();
        return sorted.filter((r) => {
            const m = (MESES[r.mes - 1]?.label || "").toLowerCase();
            const d = (r.data || "").toLowerCase();
            const df = fmtData(r).toLowerCase();
            return m.includes(q) || d.includes(q) || df.includes(q);
        });
    }, [rows, search]);
    const medias = useMemo(() => {
        const n = filtered.length || 1;
        const sum = (k) => filtered.reduce((s, r) => s + (r[k] || 0), 0);
        return {
            metros_revisados: sum("metros_revisados") / n,
            metros_1: sum("metros_1") / n,
        };
    }, [filtered]);
    return (_jsxs(Card, { className: "p-5", children: [_jsxs("div", { className: "flex items-center justify-between mb-4 gap-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h3", { className: "text-sm font-semibold", children: "Tabela de Revis\u00E3o" }), savedId && (_jsxs("span", { className: "flex items-center gap-1 text-[11px] text-emerald-600", children: [_jsx(Check, { className: "w-3 h-3" }), " Salvo"] }))] }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" }), _jsx(Input, { placeholder: "Buscar data/m\u00EAs...", value: search, onChange: (e) => setSearch(e.target.value), className: "pl-8 h-8 w-48" })] })] }), _jsx("p", { className: "text-[11px] text-muted-foreground mb-3", children: "Edite as c\u00E9lulas diretamente \u2014 as altera\u00E7\u00F5es s\u00E3o salvas ao sair do campo. A coluna % de Quebra atualiza em tempo real." }), _jsx("div", { className: "overflow-x-auto rounded-lg border border-border", children: _jsxs("table", { className: "w-full text-xs border-collapse", children: [_jsx("thead", { className: "bg-slate-50", children: _jsxs("tr", { className: "text-left text-muted-foreground", children: [_jsx("th", { className: "px-3 py-2 font-medium sticky left-0 bg-slate-50 z-10", children: "Data" }), EDITABLE_FIELDS.map((f) => (_jsx("th", { className: "px-3 py-2 font-medium text-right", children: f.label }, f.key))), _jsx("th", { className: "px-3 py-2 font-medium text-right", children: "Metros de 1\u00B0" }), _jsx("th", { className: "px-3 py-2 font-medium text-right", children: "% de Quebra" }), _jsx("th", { className: "px-3 py-2 font-medium text-right bg-blue-50/60", children: "M\u00E9dia Metros Revisados" }), _jsx("th", { className: "px-3 py-2 font-medium text-right bg-emerald-50/60", children: "M\u00E9dia Metros de 1\u00B0" })] }) }), _jsxs("tbody", { children: [filtered.map((r) => (_jsxs("tr", { className: "border-t border-border", children: [_jsx("td", { className: "px-3 py-1 font-medium sticky left-0 bg-white whitespace-nowrap z-10", children: fmtData(r) }), EDITABLE_FIELDS.map((f) => (_jsx(EditableCell, { value: r[f.key], onInput: (v) => updateRow(r.id, f.key, v), onCommit: (v) => commit(r.id, f.key, v) }, f.key))), _jsx("td", { className: "px-3 py-2 text-right tabular-nums whitespace-nowrap bg-emerald-50/40 font-medium", children: (r.metros_1 ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }), _jsx("td", { className: "px-3 py-2 text-right tabular-nums whitespace-nowrap bg-slate-50/60", children: _jsxs("span", { className: "inline-flex items-center gap-1.5", children: [pctQuebra(r).toFixed(1).replace(".", ","), "%", _jsx("span", { className: `inline-block w-2 h-2 rounded-full ${pctQuebra(r) < 5 ? "bg-emerald-500" : "bg-rose-500"}`, title: pctQuebra(r) < 5 ? "Abaixo de 5%" : "Acima de 5%" })] }) }), _jsx(EditableCell, { value: r.media_metros_revisados ?? medias.metros_revisados, onInput: (v) => updateRow(r.id, "media_metros_revisados", v), onCommit: (v) => commit(r.id, "media_metros_revisados", v) }), _jsx(EditableCell, { value: r.media_metros_1 ?? medias.metros_1, onInput: (v) => updateRow(r.id, "media_metros_1", v), onCommit: (v) => commit(r.id, "media_metros_1", v) })] }, r.id))), filtered.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 9, className: "px-3 py-6 text-center text-muted-foreground", children: "Nenhum resultado." }) }))] })] }) })] }));
}
