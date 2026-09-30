import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect, useMemo } from "react";
import { Check, X } from "lucide-react";
import { tempoOciosoTempoReal } from "@/lib/tempoOcioso";
import { useTempoReal } from "@/hooks/useTempoReal";
const EDITABLE_FIELDS = [
    { key: "tempo_produzido", label: "Produzido", time: true, tone: "good" },
    { key: "setup", label: "Setup", time: true, tone: "bad" },
    { key: "tempo_parado", label: "Parada", time: true, tone: "bad" },
    { key: "retrabalho", label: "Retrabalho", time: true, tone: "bad" },
    { key: "amostras", label: "Amostras", time: true, tone: "bad" },
    { key: "tempo_ocioso", label: "T. Ocioso", time: true, tone: "bad" },
    { key: "num_ops", label: "N° OPs", tone: "neutral" },
    { key: "metros_realizados", label: "Metros", formatted: true, tone: "good" },
];
const MACHINE_ORDER = ["JR", "Gravadora", "Estampa 1", "Estampa 2", "Digital Solvente", "Digital UV", "GR2"];
function pctProduzindo(r) {
    const p = r.tempo_produzido || 0;
    const total = (r.tempo_produzido || 0) +
        (r.tempo_parado || 0) +
        (r.setup || 0) +
        (r.retrabalho || 0) +
        (r.amostras || 0) +
        (r.tempo_ocioso || 0);
    return total ? (p / total) * 100 : 0;
}
// horas decimais -> "HH:MM"
function decToHHMM(v) {
    if (v == null || v === "" || isNaN(v))
        return "00:00";
    const totalMin = Math.round(Number(v) * 60);
    const h = Math.floor(totalMin / 60);
    const min = Math.abs(totalMin) % 60;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
// "HH:MM" -> horas decimais
function hhmmToDec(s) {
    if (s == null)
        return 0;
    const str = String(s).trim();
    const m = str.match(/^(\d{1,3}):([0-5]?\d)$/);
    if (m)
        return (Number(m[1]) * 60 + Number(m[2])) / 60;
    const n = parseFloat(str.replace(",", "."));
    return isNaN(n) ? 0 : n;
}
// número -> "2.400,99" (formato brasileiro)
function fmtBR(v, decimals = 2) {
    if (v == null || v === "" || isNaN(v))
        return "0,00";
    return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
// "2.400,99" -> número
function parseBR(s) {
    if (s == null)
        return 0;
    const str = String(s).trim().replace(/\./g, "").replace(",", ".");
    const n = parseFloat(str);
    return isNaN(n) ? 0 : n;
}
function EditableCell({ value, onCommit, onInput, status }) {
    const [local, setLocal] = useState(value ?? "");
    useEffect(() => setLocal(value ?? ""), [value]);
    return (_jsx("td", { className: "px-1 py-1 text-center", children: _jsx("input", { type: "number", step: "0.01", value: local, onChange: (e) => {
                setLocal(e.target.value);
                onInput(e.target.value === "" ? 0 : parseFloat(e.target.value));
            }, onBlur: () => onCommit(local === "" ? 0 : parseFloat(local)), onKeyDown: (e) => {
                if (e.key === "Enter")
                    e.target.blur();
            }, className: `dm-cell-input ${status === "ok" ? "dm-cell-ok" : status === "no" ? "dm-cell-no" : ""}` }) }));
}
function FormattedCell({ value, onCommit, onInput, status }) {
    const [local, setLocal] = useState(fmtBR(value));
    const [focused, setFocused] = useState(false);
    useEffect(() => setLocal(fmtBR(value)), [value]);
    return (_jsx("td", { className: "px-1 py-1 text-center", children: _jsx("input", { type: "text", inputMode: "decimal", value: local, onFocus: () => { setFocused(true); setLocal(value == null ? "" : String(value).replace(".", ",")); }, onChange: (e) => {
                const v = e.target.value;
                setLocal(v);
                onInput(parseBR(v));
            }, onBlur: () => {
                setFocused(false);
                const dec = parseBR(local);
                setLocal(fmtBR(dec));
                onCommit(dec);
            }, onKeyDown: (e) => {
                if (e.key === "Enter")
                    e.target.blur();
            }, className: `dm-cell-input ${status === "ok" ? "dm-cell-ok" : status === "no" ? "dm-cell-no" : ""}` }) }));
}
function TimeCell({ value, onCommit, onInput, status }) {
    const [local, setLocal] = useState(decToHHMM(value));
    useEffect(() => setLocal(decToHHMM(value)), [value]);
    return (_jsx("td", { className: "px-1 py-1 text-center", children: _jsx("input", { type: "text", inputMode: "text", placeholder: "HH:MM", value: local, onChange: (e) => {
                const v = e.target.value;
                setLocal(v);
                onInput(hhmmToDec(v));
            }, onBlur: () => {
                const dec = hhmmToDec(local);
                setLocal(decToHHMM(dec));
                onCommit(dec);
            }, onKeyDown: (e) => {
                if (e.key === "Enter")
                    e.target.blur();
            }, className: `dm-cell-input ${status === "ok" ? "dm-cell-ok" : status === "no" ? "dm-cell-no" : ""}` }) }));
}
export default function DesempenhoTable({ records, onSaved }) {
    const [rows, setRows] = useState(records);
    const [savedId, setSavedId] = useState(null);
    const now = useTempoReal();
    useEffect(() => setRows(records), [records]);
    // Agrega por máquina — soma todos os valores (dias selecionados) sem duplicar
    const aggregated = useMemo(() => {
        const map = {};
        rows.forEach((r) => {
            if (!map[r.maquina]) {
                const base = { maquina: r.maquina, ids: [], data: r.data };
                EDITABLE_FIELDS.forEach((f) => (base[f.key] = 0));
                map[r.maquina] = base;
            }
            EDITABLE_FIELDS.forEach((f) => {
                if (f.key === "tempo_ocioso") {
                    // Sem apontamento de produção, setup nem amostras → tempo ocioso em tempo real
                    const semApontamento = (r.tempo_produzido || 0) === 0 && (r.setup || 0) === 0 && (r.amostras || 0) === 0;
                    map[r.maquina][f.key] += semApontamento
                        ? tempoOciosoTempoReal(r.maquina, r.data)
                        : Number(r.tempo_ocioso || 0);
                }
                else {
                    map[r.maquina][f.key] += Number(r[f.key] || 0);
                }
            });
            map[r.maquina].ids.push(r.id);
        });
        return MACHINE_ORDER.filter((m) => map[m]).map((m) => map[m]);
    }, [rows, now]);
    const updateRow = (machine, field, value) => {
        setRows((prev) => prev.map((r) => (r.maquina === machine ? { ...r, [field]: value } : r)));
    };
    const commit = async (machine, field, value) => {
        const src = rows.filter((r) => r.maquina === machine);
        if (src.length === 0)
            return;
        try {
            // Um único registro (um dia) — atualiza direto
            if (src.length === 1) {
                await db.entities.DesempenhoMaquina.update(src[0].id, { [field]: value });
            }
            else {
                // Múltiplos dias — distribui o valor igualmente entre os registros
                const part = value / src.length;
                await Promise.all(src.map((r) => db.entities.DesempenhoMaquina.update(r.id, { [field]: part })));
            }
            setSavedId(`${machine}-${field}-${Date.now()}`);
            setTimeout(() => setSavedId(null), 1200);
            if (onSaved)
                onSaved();
        }
        catch (e) {
            /* erro silencioso */
        }
    };
    const totalProduzido = aggregated.reduce((s, r) => s + (r.tempo_produzido || 0), 0);
    const totalGeral = aggregated.reduce((s, r) => s +
        (r.tempo_produzido || 0) +
        (r.tempo_parado || 0) +
        (r.setup || 0) +
        (r.retrabalho || 0) +
        (r.amostras || 0) +
        (r.tempo_ocioso || 0), 0);
    const pctGeral = totalGeral > 0 ? (totalProduzido / totalGeral) * 100 : 0;
    const metaOk = pctGeral >= 45;
    return (_jsxs("section", { className: "dm-table-card", children: [_jsxs("div", { className: "dm-table-head", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("h2", { children: "Desempenho de M\u00E1quina" }), savedId && (_jsxs("span", { className: "dm-saved", children: [_jsx(Check, {}), " Salvo"] }))] }), _jsxs("div", { className: "dm-goal", children: [_jsx("span", { children: "Meta: \u2265 45% tempo produzindo" }), _jsxs("div", { className: `dm-goal-value ${metaOk ? "dm-goal-ok" : "dm-goal-no"}`, children: [_jsx("b", { children: "Tempo Produzido" }), _jsxs("strong", { children: [pctGeral.toFixed(1).replace(".", ","), "%"] })] })] })] }), _jsx("div", { className: "dm-table-wrap", children: _jsxs("table", { className: "dm-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "M\u00E1quina" }), EDITABLE_FIELDS.map((f) => (_jsx("th", { children: f.label }, f.key))), _jsx("th", { children: "% Prod." }), _jsx("th", { children: "Status" })] }) }), _jsxs("tbody", { children: [aggregated.map((r) => {
                                    const pct = pctProduzindo(r);
                                    const ok = pct >= 45;
                                    const multi = r.ids.length > 1;
                                    return (_jsxs("tr", { children: [_jsxs("td", { className: "dm-machine-col", children: [r.maquina, multi && _jsxs("span", { children: ["(", r.ids.length, "d)"] })] }), EDITABLE_FIELDS.map((f) => {
                                                const Cell = f.time ? TimeCell : f.formatted ? FormattedCell : EditableCell;
                                                return (_jsx(Cell, { value: r[f.key], status: ok ? "ok" : "no", onInput: (v) => updateRow(r.maquina, f.key, v), onCommit: (v) => commit(r.maquina, f.key, v) }, f.key));
                                            }), _jsxs("td", { className: `dm-pct ${ok ? "dm-pct-ok" : "dm-pct-no"}`, children: [pct.toFixed(1).replace(".", ","), "%"] }), _jsx("td", { children: _jsx("span", { className: `dm-status ${ok ? "ok" : "no"}`, children: ok ? _jsx(Check, {}) : _jsx(X, {}) }) })] }, r.maquina));
                                }), aggregated.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 11, className: "px-3 py-6 text-center text-slate-500", children: "Selecione datas para registrar os valores." }) }))] })] }) })] }));
}
