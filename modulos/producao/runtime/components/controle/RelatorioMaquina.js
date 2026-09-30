import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect, useRef } from "react";
import { getSpeed, tempoEsperadoHoras, tempoRealHoras, setupPrevistoMinutos } from "@/lib/controleSpeed";
import { Printer, X, Check } from "lucide-react";
function fmtHoras(v) {
    if (!v && v !== 0)
        return "—";
    const abs = Math.abs(v);
    const h = Math.floor(abs);
    const m = Math.round((abs - h) * 60);
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    return `${v < 0 ? "-" : ""}${hh}:${mm}`;
}
function fmtNum(v, dec = 1) {
    if (v == null || isNaN(v))
        return "—";
    return v.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtMinutos(v) {
    if (!v && v !== 0)
        return "—";
    const abs = Math.abs(v);
    const h = Math.floor(abs / 60);
    const m = Math.round(abs % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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
const inputBase = "w-full text-[11px] bg-white border border-slate-200 outline-none focus:bg-cyan-50 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-200 rounded px-1.5 py-1";
function EditCell({ value, field, onCommit, onInput }) {
    const [local, setLocal] = useState(() => (field.type === "minutesTime" ? minToTime(value) : value ?? ""));
    useEffect(() => setLocal(field.type === "minutesTime" ? minToTime(value) : value ?? ""), [value]);
    if (field.type === "number") {
        const colorClass = field.color ? "" : "text-[#00008B]";
        return (_jsx("input", { type: "number", step: "0.01", value: local, style: field.color ? { color: field.color, fontWeight: field.noBold ? 400 : 850 } : undefined, onChange: (e) => {
                setLocal(e.target.value);
                onInput(e.target.value === "" ? 0 : parseFloat(e.target.value));
            }, onBlur: () => onCommit(local === "" ? 0 : parseFloat(local)), onKeyDown: (e) => { if (e.key === "Enter")
                e.target.blur(); }, className: `${inputBase} text-center tabular-nums font-normal ${colorClass}` }));
    }
    if (field.type === "time") {
        return (_jsx("input", { type: "text", inputMode: "text", placeholder: "HH:MM", value: local || "", onChange: (e) => { setLocal(e.target.value); onInput(e.target.value); }, onBlur: () => onCommit(local), onKeyDown: (e) => { if (e.key === "Enter")
                e.target.blur(); }, className: `${inputBase} text-center tabular-nums font-normal text-[#00008B]` }));
    }
    if (field.type === "minutesTime") {
        const colorStyle = field.color ? { color: field.color, fontWeight: 400 } : undefined;
        return (_jsx("input", { type: "text", inputMode: "text", placeholder: "", value: local || "", onChange: (e) => { setLocal(e.target.value); onInput(timeToMin(e.target.value)); }, onBlur: () => onCommit(timeToMin(local)), onKeyDown: (e) => { if (e.key === "Enter")
                e.target.blur(); }, className: `${inputBase} text-center tabular-nums font-normal`, style: colorStyle }));
    }
    if (field.type === "dateText") {
        return (_jsx("input", { type: "text", inputMode: "text", placeholder: "dd/mm/aa", value: local || "", onChange: (e) => { setLocal(e.target.value); onInput(e.target.value); }, onBlur: () => onCommit(local), onKeyDown: (e) => { if (e.key === "Enter")
                e.target.blur(); }, className: `${inputBase} font-normal text-[#00008B]` }));
    }
    if (field.type === "date") {
        return (_jsx("input", { type: "date", value: local || "", onChange: (e) => { setLocal(e.target.value); onCommit(e.target.value); }, className: inputBase }));
    }
    return (_jsx("input", { type: "text", value: local, onChange: (e) => { setLocal(e.target.value); onInput(e.target.value); }, onBlur: () => onCommit(local), onKeyDown: (e) => { if (e.key === "Enter")
            e.target.blur(); }, className: inputBase }));
}
const EDITABLE = {
    data: { type: "dateText" },
    num_op: { type: "text" },
    descricao_produto: { type: "text" },
    metragem: { type: "number", color: "#000000", noBold: true },
    hora_inicial: { type: "time" },
    hora_final: { type: "time" },
    setup: { type: "minutesTime", color: "#8B4000" },
    parada: { type: "number", color: "#C00000" },
};
export default function RelatorioMaquina({ maquina, records, onClose, onSaved }) {
    const rootRef = useRef(null);
    const [rows, setRows] = useState(records);
    const [savedId, setSavedId] = useState(null);
    const [familias, setFamilias] = useState([]);
    const [familiasEstampa, setFamiliasEstampa] = useState([]);
    useEffect(() => setRows(records), [records]);
    // Carrega famílias/cilindros cadastrados para a máquina — usado para casar a família
    // da descrição (prefixo multi-palavra; o restante é a cor) e identificar mesmo cilindro.
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const all = await db.entities.FamiliaCilindro.list();
                if (!active)
                    return;
                const norm = String(maquina || "").trim().toLowerCase();
                const filtered = (all || []).filter((f) => String(f.maquina || "").trim().toLowerCase() === norm);
                setFamilias(filtered);
            }
            catch {
                /* erro silencioso */
            }
        })();
        return () => { active = false; };
    }, [maquina]);
    // Carrega famílias de Estampa com tempo de setup cadastrado
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const all = await db.entities.FamiliaEstampa.list();
                if (!active)
                    return;
                setFamiliasEstampa(all || []);
            }
            catch {
                /* erro silencioso */
            }
        })();
        return () => { active = false; };
    }, []);
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
            setSavedId(`${id}-${field}-${Date.now()}`);
            setTimeout(() => setSavedId(null), 1200);
            if (onSaved)
                onSaved();
        }
        catch (e) {
            /* erro silencioso */
        }
    };
    const handlePrint = async () => {
        const root = rootRef.current;
        if (!root) {
            window.print();
            return;
        }
        const styleEl = document.createElement("style");
        styleEl.id = "relatorio-landscape-page";
        styleEl.textContent = "@page { size: A4 landscape; margin: 8mm; }";
        document.head.appendChild(styleEl);
        document.body.classList.add("printing-relatorio");
        await new Promise((res) => setTimeout(res, 300));
        const cleanup = () => {
            document.body.classList.remove("printing-relatorio");
            styleEl.remove();
            window.removeEventListener("afterprint", cleanup);
        };
        window.addEventListener("afterprint", cleanup);
        window.print();
    };
    // Ordena OPs por hora inicial (menor para o maior)
    const sortedRows = [...rows].sort((a, b) => {
        const ta = a.hora_inicial ? timeToMin(a.hora_inicial) : 0;
        const tb = b.hora_inicial ? timeToMin(b.hora_inicial) : 0;
        return ta - tb;
    });
    const isEstampa = maquina === "Estampa 1" || maquina === "Estampa 2" || maquina === "Estampa 3";
    const isGR2 = maquina === "GR2";
    const isGravadora = maquina === "Gravadora";
    // Casa a descrição com as famílias cadastradas (prefixo multi-palavra; o restante é a cor).
    // Retorna o cilindro da família casada, ou cai para a 1ª palavra da descrição.
    const matchCilindro = (desc) => {
        const d = (desc || "").trim().toUpperCase();
        if (!d)
            return "";
        const sorted = [...familias].sort((a, b) => (b.familia || "").length - (a.familia || "").length);
        for (const f of sorted) {
            const fam = (f.familia || "").trim().toUpperCase();
            if (!fam)
                continue;
            if (d === fam || d.startsWith(fam + " ")) {
                return (f.cilindro || f.familia || "").trim().toUpperCase();
            }
        }
        return d.split(/\s+/)[0] || "";
    };
    // Separa registros com OP (aparecem como linhas) e sem OP (setup/parada somados direto no total)
    // Nas Estampas: OPs consecutivas (hora inicial = hora final da anterior) não têm setup previsto
    // GR2/Gravadora: OPs consecutivas com o mesmo cilindro (mesma família cadastrada) só contam setup na primeira
    let prevHoraFinalMin = null;
    let prevCilindro = "";
    // Gravadora: agrupa por cilindro — só o 1º setup de cada cilindro conta no previsto
    const cilindrosVistosGravadora = new Set();
    const allRows = sortedRows.map((r) => {
        const tempo = r.tempo && r.tempo > 0 ? r.tempo : tempoRealHoras(r.hora_inicial, r.hora_final);
        const velocPrev = getSpeed(maquina, r.processo);
        const velocReal = tempo > 0 ? (r.metragem || 0) / (tempo * 60) : 0;
        const tempoEsperado = tempoEsperadoHoras(r.metragem, maquina, r.processo);
        let setupPrev = setupPrevistoMinutos(maquina, r.processo);
        const familia = (r.descricao_produto || "").trim().split(/\s+/)[0]?.toUpperCase() || "";
        const cilindro = matchCilindro(r.descricao_produto);
        // Estampas: casa família cadastrada (prefixo) e usa tempo de setup configurado
        if (isEstampa) {
            const descUp = (r.descricao_produto || "").trim().toUpperCase();
            const procUp = String(r.processo || "").trim().toUpperCase();
            const fe = [...familiasEstampa]
                .sort((a, b) => (b.familia || "").length - (a.familia || "").length)
                .find((f) => {
                const fam = (f.familia || "").trim().toUpperCase();
                if (!fam || !(descUp === fam || descUp.startsWith(fam + " ")))
                    return false;
                // Se o processo estiver cadastrado, deve bater; se não, serve para qualquer estampa
                const fProc = String(f.processo || "").trim().toUpperCase();
                return !fProc || fProc === procUp;
            });
            if (fe && typeof fe.tempo_setup === "number") {
                setupPrev = fe.tempo_setup;
            }
            else if (familia === "CHASSI") {
                setupPrev = 60;
            }
        }
        const isConsecutive = prevHoraFinalMin !== null && r.hora_inicial && timeToMin(r.hora_inicial) === prevHoraFinalMin;
        // Estampas: OP consecutiva (atrás da outra) → sem setup
        if (isEstampa && isConsecutive) {
            setupPrev = 0;
        }
        // GR2: OP consecutiva com mesmo cilindro → sem setup (só a primeira conta)
        if (isGR2 && isConsecutive && prevCilindro && cilindro && cilindro === prevCilindro) {
            setupPrev = 0;
        }
        // Gravadora: agrupa por cilindro — só o 1º setup de cada cilindro conta no previsto.
        // OPs seguintes do mesmo cilindro (sequenciais ou não) ficam sem setup previsto;
        // quando não estão em sequência, indica que fizeram um setup não previsto.
        if (isGravadora && cilindro) {
            if (cilindrosVistosGravadora.has(cilindro)) {
                setupPrev = 0;
            }
            else {
                cilindrosVistosGravadora.add(cilindro);
            }
        }
        if (r.hora_final)
            prevHoraFinalMin = timeToMin(r.hora_final);
        prevCilindro = cilindro;
        const difTempo = tempo - tempoEsperado;
        const difPct = velocPrev > 0 ? ((velocReal - velocPrev) / velocPrev) * 100 : 0;
        return { ...r, tempo, velocPrev, velocReal, tempoEsperado, setupPrev, difTempo, difPct };
    });
    const semOp = allRows.filter((r) => !r.num_op && (r.setup || r.parada));
    const visibleRows = allRows.filter((r) => r.num_op || (!r.num_op && !(r.setup || r.parada)));
    const totals = visibleRows.reduce((acc, r) => {
        // OPs com tempo de produção 0 não contam como produzido (metragem/tempo)
        const produziu = r.tempo && r.tempo > 0;
        if (produziu) {
            acc.metragem += r.metragem || 0;
            acc.tempo += r.tempo;
            acc.tempoEsperado += r.tempoEsperado;
        }
        acc.setup += r.setup || 0;
        acc.setupPrev += r.setupPrev || 0;
        acc.parada += r.parada || 0;
        return acc;
    }, { metragem: 0, tempo: 0, tempoEsperado: 0, setup: 0, setupPrev: 0, parada: 0 });
    semOp.forEach((r) => {
        totals.setup += r.setup || 0;
        totals.parada += r.parada || 0;
    });
    totals.velocReal = totals.tempo > 0 ? totals.metragem / (totals.tempo * 60) : 0;
    totals.difTempo = totals.tempo - totals.tempoEsperado;
    totals.velocPrev = totals.tempoEsperado > 0 ? totals.metragem / (totals.tempoEsperado * 60) : 0;
    totals.difPct = totals.velocPrev > 0 ? ((totals.velocReal - totals.velocPrev) / totals.velocPrev) * 100 : 0;
    const isoToDdMmAa = (iso) => {
        if (!iso)
            return "";
        const d = new Date(iso + "T00:00:00");
        if (isNaN(d.getTime()))
            return "";
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const aa = String(d.getFullYear()).slice(-2);
        return `${dd}/${mm}/${aa}`;
    };
    const ddMmAaToIso = (val) => {
        if (!val)
            return "";
        const m = val.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
        if (!m)
            return val;
        let [, dd, mm, yy] = m;
        if (yy.length === 2)
            yy = "20" + yy;
        return `${yy}-${mm}-${dd}`;
    };
    const renderCell = (r, key) => {
        const field = EDITABLE[key];
        if (!field)
            return null;
        const value = field.type === "dateText" ? isoToDdMmAa(r[key]) : r[key];
        const commitVal = field.type === "dateText" ? ddMmAaToIso : undefined;
        return (_jsx(EditCell, { value: value, field: field, onInput: (v) => updateRow(r.id, key, field.type === "dateText" ? ddMmAaToIso(v) : v), onCommit: (v) => commit(r.id, key, commitVal ? commitVal(v) : v) }));
    };
    return (_jsxs("div", { ref: rootRef, className: "relatorio-root ce-report", children: [_jsxs("div", { className: "ce-report-head", children: [_jsxs("div", { children: [_jsxs("h2", { children: ["Relat\u00F3rio \u2014 ", maquina] }), _jsxs("p", { children: [visibleRows.length, " OP(s) registrada(s)", semOp.length > 0 && ` • ${semOp.length} registro(s) de setup/parada sem OP`, _jsx("span", { className: "ml-2 text-cyan-600", children: "\u2022 Edi\u00E7\u00E3o habilitada nas c\u00E9lulas" }), savedId && (_jsxs("span", { className: "ml-2 inline-flex items-center gap-1 text-emerald-600 font-semibold", children: [_jsx(Check, { className: "w-3 h-3" }), " Salvo"] }))] })] }), _jsxs("div", { className: "ce-report-actions", children: [_jsxs("button", { className: "ce-report-button", onClick: handlePrint, children: [_jsx(Printer, { className: "w-3.5 h-3.5" }), " Imprimir"] }), _jsx("button", { className: "ce-report-button", onClick: onClose, children: _jsx(X, { className: "w-3.5 h-3.5" }) })] })] }), _jsx("div", { className: "ce-table-wrap", children: _jsxs("table", { className: "ce-table", children: [_jsxs("colgroup", { children: [_jsx("col", { style: { width: "7%" } }), _jsx("col", { style: { width: "7%" } }), _jsx("col", { style: { width: "22%" } }), _jsx("col", { style: { width: "10%" } }), _jsx("col", { style: { width: "7%" } }), _jsx("col", { style: { width: "7%" } }), _jsx("col", { style: { width: "7%" } }), _jsx("col", { style: { width: "5%" } }), _jsx("col", { style: { width: "5%" } }), _jsx("col", { style: { width: "5%" } }), _jsx("col", { style: { width: "5%" } }), _jsx("col", { style: { width: "6%" } }), _jsx("col", { style: { width: "6%" } }), _jsx("col", { style: { width: "6%" } }), _jsx("col", { style: { width: "5%" } })] }), _jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Data" }), _jsx("th", { children: "OP" }), _jsx("th", { children: "Produto" }), _jsx("th", { children: "Proc." }), _jsx("th", { children: "Metragem" }), _jsx("th", { children: "Hora Inicial" }), _jsx("th", { children: "Hora Final" }), _jsx("th", { children: "Tempo" }), _jsx("th", { children: "Setup Prev." }), _jsx("th", { children: "Setup" }), _jsx("th", { children: "Parada" }), _jsx("th", { children: "Veloc. Prevista" }), _jsx("th", { children: "Veloc. Real" }), _jsx("th", { children: "Dif. Tempo" }), _jsx("th", { children: "Dif. %" })] }) }), _jsxs("tbody", { children: [visibleRows.map((r) => {
                                    const difPositive = r.difTempo <= 0;
                                    const pctPositive = r.difPct >= 0;
                                    return (_jsxs("tr", { children: [_jsx("td", { className: "ce-edit-cell", children: renderCell(r, "data") }), _jsx("td", { className: `ce-edit-cell ${r.is_retrabalho ? "ce-bad" : ""}`, children: renderCell(r, "num_op") }), _jsx("td", { className: `ce-edit-cell ce-prod-col ${r.is_retrabalho ? "ce-bad" : ""}`, title: r.descricao_produto, children: renderCell(r, "descricao_produto") }), _jsx("td", { className: `ce-edit-cell ce-proc-col ${r.is_retrabalho ? "ce-bad" : ""}`, children: r.processo || "—" }), _jsx("td", { className: "ce-edit-cell", children: renderCell(r, "metragem") }), _jsx("td", { className: "ce-edit-cell", children: renderCell(r, "hora_inicial") }), _jsx("td", { className: "ce-edit-cell", children: renderCell(r, "hora_final") }), _jsx("td", { className: "ce-strong", children: fmtHoras(r.tempo) }), _jsx("td", { className: "ce-veloc-col", style: { color: "#8B4000" }, children: r.setupPrev ? fmtMinutos(r.setupPrev) : "—" }), _jsx("td", { className: "ce-edit-cell ce-setup-col", children: renderCell(r, "setup") }), _jsx("td", { className: "ce-edit-cell ce-parada-col", children: renderCell(r, "parada") }), _jsx("td", { className: "ce-veloc-col", children: fmtNum(r.velocPrev, 1) }), _jsx("td", { className: "ce-veloc-col", children: r.tempo > 0 ? fmtNum(r.velocReal, 1) : "—" }), _jsx("td", { className: difPositive ? "ce-good" : "ce-bad", children: r.tempo > 0 ? (difPositive ? "-" : "+") + fmtHoras(Math.abs(r.difTempo)) : "—" }), _jsx("td", { className: `ce-difpct-col ${pctPositive ? "ce-good" : "ce-bad"}`, children: r.tempo > 0 ? (pctPositive ? "+" : "") + fmtNum(r.difPct, 0) + "%" : "—" })] }, r.id));
                                }), visibleRows.length === 0 && (_jsx("tr", { children: _jsxs("td", { colSpan: 15, style: { textAlign: "center", padding: "32px", color: "#64748b", fontWeight: 700 }, children: ["Nenhuma OP registrada para ", maquina, "."] }) }))] }), visibleRows.length > 0 && (_jsx("tfoot", { children: _jsxs("tr", { children: [_jsx("td", { colSpan: 4, children: "Total" }), _jsx("td", { style: { color: "#000000" }, children: fmtNum(totals.metragem, 2) }), _jsx("td", { colSpan: 2 }), _jsx("td", { style: { color: "#000000" }, children: fmtHoras(totals.tempo) }), _jsx("td", { style: { color: "#8B4000" }, children: fmtMinutos(totals.setupPrev) }), _jsx("td", { style: { color: "#8B4000" }, children: fmtMinutos(totals.setup) }), _jsx("td", { style: { color: "#C00000" }, children: fmtMinutos(totals.parada) }), _jsx("td", { style: { color: "#000000" }, children: totals.velocPrev > 0 ? fmtNum(totals.velocPrev, 1) : "—" }), _jsx("td", { style: { color: "#000000" }, children: totals.tempo > 0 ? fmtNum(totals.velocReal, 1) : "—" }), _jsx("td", { className: totals.difTempo <= 0 ? "ce-good" : "ce-bad", children: (totals.difTempo <= 0 ? "-" : "+") + fmtHoras(Math.abs(totals.difTempo)) }), _jsx("td", { className: `ce-difpct-col ${totals.difPct >= 0 ? "ce-good" : "ce-bad"}`, children: (totals.difPct >= 0 ? "+" : "") + fmtNum(totals.difPct, 0) + "%" })] }) }))] }) })] }));
}
