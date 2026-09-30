import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { getProcessos, getSpeed, tempoEsperadoHoras, tempoRealHoras } from "@/lib/controleSpeed";
const EDITABLE_FIELDS = [
    { key: "data", label: "Data", type: "date", width: "w-32" },
    { key: "num_op", label: "N° da OP", type: "text", width: "w-28" },
    { key: "descricao_produto", label: "Descrição do Produto", type: "text", width: "w-56" },
    { key: "metragem", label: "Metragem", type: "number", width: "w-24" },
    { key: "hora_inicial", label: "Hora Inicial", type: "time", width: "w-28" },
    { key: "hora_final", label: "Hora Final", type: "time", width: "w-28" },
];
const inputBase = "text-xs bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-200 rounded px-2 py-1.5";
function Cell({ value, field, onCommit, onInput }) {
    const [local, setLocal] = useState(value ?? "");
    useEffect(() => setLocal(value ?? ""), [value]);
    if (field.type === "number") {
        return (_jsx("input", { type: "number", step: "0.01", value: local, onChange: (e) => {
                setLocal(e.target.value);
                onInput(e.target.value === "" ? 0 : parseFloat(e.target.value));
            }, onBlur: () => onCommit(local === "" ? 0 : parseFloat(local)), onKeyDown: (e) => { if (e.key === "Enter")
                e.target.blur(); }, className: `${inputBase} ${field.width} text-right tabular-nums font-normal text-[#00008B]` }));
    }
    if (field.type === "time") {
        return (_jsx("input", { type: "time", value: local || "", onChange: (e) => { setLocal(e.target.value); onCommit(e.target.value); }, className: `${inputBase} ${field.width} font-normal text-[#00008B]` }));
    }
    if (field.type === "date") {
        return (_jsx("input", { type: "date", value: local || "", onChange: (e) => { setLocal(e.target.value); onCommit(e.target.value); }, className: `${inputBase} ${field.width}` }));
    }
    return (_jsx("input", { type: "text", value: local, onChange: (e) => { setLocal(e.target.value); onInput(e.target.value); }, onBlur: () => onCommit(local), onKeyDown: (e) => { if (e.key === "Enter")
            e.target.blur(); }, className: `${inputBase} ${field.width}` }));
}
function fmtHoras(v) {
    if (!v && v !== 0)
        return "—";
    const abs = Math.abs(v);
    const h = Math.floor(abs);
    const m = Math.round((abs - h) * 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
export default function ControleTable({ records, maquina, onSaved }) {
    const [rows, setRows] = useState(records);
    const processos = getProcessos(maquina);
    const hasProcesso = processos.length > 1;
    useEffect(() => setRows(records), [records]);
    const updateRow = (id, field, value) => {
        setRows((prev) => prev.map((r) => {
            if (r.id !== id)
                return r;
            const next = { ...r, [field]: value };
            if (field === "hora_inicial" || field === "hora_final") {
                next.tempo = tempoRealHoras(next.hora_inicial, next.hora_final);
            }
            return next;
        }));
    };
    const commit = async (id, field, value) => {
        const row = rows.find((r) => r.id === id);
        const patch = { [field]: value };
        if ((field === "hora_inicial" || field === "hora_final") && row) {
            const hi = field === "hora_inicial" ? value : row.hora_inicial;
            const hf = field === "hora_final" ? value : row.hora_final;
            patch.tempo = tempoRealHoras(hi, hf);
        }
        try {
            await db.entities.ControleEficiencia.update(id, patch);
            if (onSaved)
                onSaved();
        }
        catch (e) {
            /* erro silencioso */
        }
    };
    const addRow = async () => {
        try {
            const processo = processos[0];
            const today = new Date();
            const data = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
            await db.entities.ControleEficiencia.create({ maquina, processo, data });
            if (onSaved)
                onSaved();
        }
        catch (e) {
            /* erro silencioso */
        }
    };
    const removeRow = async (id) => {
        try {
            await db.entities.ControleEficiencia.delete(id);
            setRows((prev) => prev.filter((r) => r.id !== id));
            if (onSaved)
                onSaved();
        }
        catch (e) {
            /* erro silencioso */
        }
    };
    const totals = rows.reduce((acc, r) => {
        const esp = tempoEsperadoHoras(r.metragem, maquina, r.processo);
        const real = r.tempo > 0 ? r.tempo : tempoRealHoras(r.hora_inicial, r.hora_final);
        acc.metragem += r.metragem || 0;
        acc.tempoReal += real;
        acc.tempoEsperado += esp;
        return acc;
    }, { metragem: 0, tempoReal: 0, tempoEsperado: 0 });
    // Ordena OPs por hora inicial (menor para o maior)
    const sortedRows = [...rows].sort((a, b) => {
        const toMin = (s) => {
            if (!s)
                return 0;
            const m = s.match(/^(\d{1,2}):(\d{1,2})$/);
            return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 0;
        };
        return toMin(a.hora_inicial) - toMin(b.hora_inicial);
    });
    return (_jsxs(Card, { className: "p-5", children: [_jsxs("div", { className: "flex items-center justify-between mb-4 gap-4", children: [_jsx("div", { className: "flex items-center gap-2", children: _jsxs("h3", { className: "text-sm font-semibold", children: ["Controle de ", maquina] }) }), _jsxs(Button, { size: "sm", className: "gap-1 h-8 print:hidden", onClick: addRow, children: [_jsx(Plus, { className: "w-4 h-4" }), " Nova OP"] })] }), _jsxs("p", { className: "text-[11px] text-muted-foreground mb-3", children: ["Edite as c\u00E9lulas diretamente (estilo planilha) \u2014 o Tempo \u00E9 calculado automaticamente pela Hora Inicial e Final. O comparativo usa a velocidade prevista da m\u00E1quina", hasProcesso ? "/processo" : "", " (", getSpeed(maquina, processos[0]), " m/min", hasProcesso ? " variável por processo" : "", ")."] }), _jsx("div", { className: "overflow-x-auto rounded-lg border border-border", children: _jsxs("table", { className: "w-full text-xs border-collapse", children: [_jsx("thead", { className: "bg-slate-50", children: _jsxs("tr", { className: "text-left text-muted-foreground", children: [hasProcesso && _jsx("th", { className: "px-3 py-2 font-medium", children: "Processo" }), EDITABLE_FIELDS.map((f) => (_jsx("th", { className: `px-3 py-2 font-medium ${f.type === "number" ? "text-right" : ""}`, children: f.label }, f.key))), _jsx("th", { className: "px-3 py-2 font-medium text-right", children: "Tempo" }), _jsx("th", { className: "px-3 py-2 font-medium text-right", children: "Veloc. Prev. (m/min)" }), _jsx("th", { className: "px-3 py-2 font-medium text-right", children: "Veloc. Real (m/min)" }), _jsx("th", { className: "px-3 py-2 font-medium text-right", children: "Tempo Esperado" }), _jsx("th", { className: "px-3 py-2 font-medium text-right", children: "Diferen\u00E7a" }), _jsx("th", { className: "px-3 py-2 font-medium text-right", children: "% Efici\u00EAncia" }), _jsx("th", { className: "px-3 py-2 font-medium text-center print:hidden" })] }) }), _jsxs("tbody", { children: [sortedRows.map((r) => {
                                    const esp = tempoEsperadoHoras(r.metragem, maquina, r.processo);
                                    const real = r.tempo > 0 ? r.tempo : tempoRealHoras(r.hora_inicial, r.hora_final);
                                    const diff = real - esp;
                                    const eff = real > 0 ? (esp / real) * 100 : 0;
                                    const effBg = real > 0 ? (eff >= 95 ? "#dcfce7" : "#fee2e2") : "transparent";
                                    const effColor = real > 0 ? (eff >= 95 ? "#166534" : "#991b1b") : "text-muted-foreground";
                                    const speed = getSpeed(maquina, r.processo);
                                    return (_jsxs("tr", { className: "border-t border-border", children: [hasProcesso && (_jsx("td", { className: `px-2 py-1.5 ${r.is_retrabalho ? "text-red-600 font-bold" : ""}`, children: _jsx("select", { value: r.processo || processos[0], onChange: (e) => commit(r.id, "processo", e.target.value), className: `${inputBase} w-28 text-[10px] ${r.is_retrabalho ? "text-red-600 font-bold" : ""}`, children: processos.map((p) => (_jsx("option", { value: p, children: p }, p))) }) })), EDITABLE_FIELDS.map((f) => {
                                                const isRedField = r.is_retrabalho && (f.key === "num_op" || f.key === "descricao_produto" || f.key === "processo");
                                                return (_jsx("td", { className: `px-2 py-1.5 ${f.type === "number" ? "text-right" : ""} ${isRedField ? "text-red-600 font-bold" : ""}`, children: _jsx(Cell, { value: r[f.key], field: f, onInput: (v) => updateRow(r.id, f.key, v), onCommit: (v) => commit(r.id, f.key, v) }) }, f.key));
                                            }), _jsx("td", { className: "px-3 py-1.5 text-right tabular-nums font-normal text-base text-[#00008B]", children: real ? fmtHoras(real) : "—" }), _jsx("td", { className: "px-3 py-1.5 text-right tabular-nums", children: speed.toString().replace(".", ",") }), _jsx("td", { className: "px-3 py-1.5 text-right tabular-nums font-medium", children: real > 0 && r.metragem ? (r.metragem / (real * 60)).toFixed(1).replace(".", ",") : "—" }), _jsx("td", { className: "px-3 py-1.5 text-right tabular-nums font-bold text-base text-blue-700", children: fmtHoras(esp) }), _jsx("td", { className: `px-3 py-1.5 text-right tabular-nums ${diff <= 0 ? "text-emerald-600" : "text-rose-600"}`, children: real > 0 ? (diff >= 0 ? "+" : "") + fmtHoras(diff) : "—" }), _jsx("td", { className: "px-3 py-1.5 text-right", children: _jsx("span", { className: "inline-block min-w-[3rem] px-2 py-0.5 rounded-md text-right tabular-nums font-semibold", style: { background: effBg, color: effColor }, children: real > 0 ? eff.toFixed(0) + "%" : "—" }) }), _jsx("td", { className: "px-2 py-1.5 text-center print:hidden", children: _jsx(Button, { variant: "ghost", size: "icon", className: "h-8 w-8 text-rose-500 hover:text-rose-700 print:hidden", onClick: () => removeRow(r.id), children: _jsx(Trash2, { className: "w-4 h-4" }) }) })] }, r.id));
                                }), rows.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: EDITABLE_FIELDS.length + (hasProcesso ? 7 : 6), className: "px-3 py-6 text-center text-muted-foreground", children: "Nenhuma OP registrada. Clique em \"Nova OP\"." }) }))] }), rows.length > 0 && (_jsx("tfoot", { className: "bg-slate-50 border-t-2 border-slate-200", children: _jsxs("tr", { className: "text-xs font-semibold", children: [_jsx("td", { className: "px-3 py-2 text-muted-foreground", colSpan: hasProcesso ? 4 : 3, children: "Total" }), _jsx("td", { className: "px-3 py-2 text-right tabular-nums font-normal text-[#00008B]", children: (totals.metragem || 0).toLocaleString("pt-BR") }), _jsx("td", { className: "px-3 py-2", colSpan: 2 }), _jsx("td", { className: "px-3 py-2 text-right tabular-nums text-base font-normal text-[#00008B]", children: fmtHoras(totals.tempoReal) }), _jsx("td", { className: "px-3 py-2" }), _jsx("td", { className: "px-3 py-2 text-right tabular-nums font-medium", children: totals.tempoReal > 0 ? (totals.metragem / (totals.tempoReal * 60)).toFixed(1).replace(".", ",") : "—" }), _jsx("td", { className: "px-3 py-2 text-right tabular-nums text-base font-bold text-blue-700", children: fmtHoras(totals.tempoEsperado) }), _jsx("td", { className: `px-3 py-2 text-right tabular-nums ${totals.tempoReal - totals.tempoEsperado <= 0 ? "text-emerald-600" : "text-rose-600"}`, children: (totals.tempoReal - totals.tempoEsperado >= 0 ? "+" : "") + fmtHoras(totals.tempoReal - totals.tempoEsperado) }), _jsx("td", { className: `px-3 py-2 text-right tabular-nums ${totals.tempoReal > 0 && (totals.tempoEsperado / totals.tempoReal) * 100 >= 95 ? "text-emerald-600" : totals.tempoReal > 0 ? "text-rose-600" : "text-muted-foreground"}`, children: totals.tempoReal > 0 ? ((totals.tempoEsperado / totals.tempoReal) * 100).toFixed(0) + "%" : "—" }), _jsx("td", { className: "px-3 py-2" })] }) }))] }) })] }));
}
