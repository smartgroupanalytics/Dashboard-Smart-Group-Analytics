import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ListChecks, UploadCloud, Gauge as GaugeIcon, Printer, Save, Loader2, LineChart as LineChartIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ImportProgramacaoDialog from "@/components/aderencia/ImportProgramacaoDialog";
import AderenciaChartDialog from "@/components/aderencia/AderenciaChartDialog";
import DayFilter from "@/components/desempenho/DayFilter";
import LightHeader from "@/components/ui/LightHeader";
const MACHINES = ["Gravadora", "JR", "Estampa 1", "Estampa 2", "GR", "Revisão"];
function sisterEstampa(maquina) {
    if (maquina === "Estampa 1")
        return "Estampa 2";
    if (maquina === "Estampa 2")
        return "Estampa 1";
    return null;
}
function isDoneStatus(status) {
    return status.startsWith("PRONTA") || status === "FEITO NA OUTRA ESTAMPA" || status === "FEITO NA OUTRA MÁQUINA" || status === "FEITO NA REVISÃO" || status === "FEITA NO DIA ANTERIOR";
}
// Escolhe o melhor registro de produção para uma OP dado o dia programado (entrega):
// prefere o dia exato, depois o mais recente antes da entrega, depois o mais cedo depois.
function pickBestProd(arr, entregaIso) {
    if (!arr || arr.length === 0)
        return null;
    if (!entregaIso)
        return arr[0];
    const exact = arr.find((p) => p.data === entregaIso);
    if (exact)
        return exact;
    const before = arr
        .filter((p) => p.data && p.data < entregaIso)
        .sort((a, b) => b.data.localeCompare(a.data))[0];
    if (before)
        return before;
    const after = arr
        .filter((p) => p.data && p.data > entregaIso)
        .sort((a, b) => a.data.localeCompare(b.data))[0];
    return after || null;
}
function normalizeMachine(maquina) {
    const upper = (maquina || "").trim().toUpperCase();
    if (upper === "GR2" || upper === "GR 2" || upper === "GR")
        return "GR";
    if (upper === "GRAVADORA")
        return "Gravadora";
    if (upper === "JR")
        return "JR";
    if (upper === "ESTAMPA 1")
        return "Estampa 1";
    if (upper === "ESTAMPA 2")
        return "Estampa 2";
    if (upper === "REVISAO" || upper === "REVISÃO")
        return "Revisão";
    return null;
}
function entregaToIso(entrega) {
    if (!entrega)
        return null;
    const parts = entrega.split("/");
    if (parts.length === 3)
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    return null;
}
export default function AderenciaProgramacao() {
    const [programacao, setProgramacao] = useState([]);
    const [producao, setProducao] = useState([]);
    const [revisaoOPs, setRevisaoOPs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [active, setActive] = useState(null);
    const [importOpen, setImportOpen] = useState(false);
    const [chartOpen, setChartOpen] = useState(false);
    const [selectedDays, setSelectedDays] = useState(() => {
        try {
            const saved = localStorage.getItem("aderencia_selectedDays");
            return saved ? JSON.parse(saved) : [];
        }
        catch {
            return [];
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem("aderencia_selectedDays", JSON.stringify(selectedDays));
        }
        catch { }
    }, [selectedDays]);
    const load = async () => {
        try {
            setLoading(true);
            const [prog, prod, rev] = await Promise.all([
                db.entities.ProgramacaoOP.list("-created_date", 5000),
                db.entities.ControleEficiencia.list("-created_date", 5000),
                db.entities.DetalheRevisaoOP.list("-created_date", 5000),
            ]);
            setProgramacao(prog);
            setProducao(prod);
            setRevisaoOPs(rev);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);
    // Registros de revisão (DetalheRevisaoOP) mapeados para o mesmo formato de produção
    const revisaoAsProducao = useMemo(() => {
        return revisaoOPs.map((r) => ({
            ...r,
            num_op: r.op,
            maquina: "Revisão",
            metragem: r.qtd_revisada,
            descricao_produto: r.descricao || r.produto,
        }));
    }, [revisaoOPs]);
    // Produção combinada: ControleEficiencia (exceto Revisão) + revisão (DetalheRevisaoOP)
    // Revisão NÃO usa ControleEficiencia — apenas DetalheRevisaoOP
    const producaoCombinada = useMemo(() => {
        const producaoSemRevisao = producao.filter((r) => normalizeMachine(r.maquina) !== "Revisão");
        return [...producaoSemRevisao, ...revisaoAsProducao];
    }, [producao, revisaoAsProducao]);
    // Produção filtrada pelos dias selecionados (vazio = todas)
    const producaoFiltrada = useMemo(() => {
        if (selectedDays.length === 0)
            return producaoCombinada;
        return producaoCombinada.filter((r) => r.data && selectedDays.includes(r.data));
    }, [producaoCombinada, selectedDays]);
    // Mapa de OPs produzidas por máquina: "maquina:num_op" → lista de registros (todos os dias)
    const producaoByMachineOp = useMemo(() => {
        const map = {};
        producaoCombinada.forEach((r) => {
            const machineKey = normalizeMachine(r.maquina);
            if (!machineKey || !r.num_op)
                return;
            const key = `${machineKey}:${r.num_op}`;
            if (!map[key])
                map[key] = [];
            map[key].push(r);
        });
        return map;
    }, [producaoCombinada]);
    // Mapa de OPs revisadas (DetalheRevisaoOP) por número de OP
    const revisaoMapByOp = useMemo(() => {
        const map = {};
        revisaoOPs.forEach((r) => {
            if (r.op && !map[String(r.op)])
                map[String(r.op)] = r;
        });
        return map;
    }, [revisaoOPs]);
    // Conjunto de OPs programadas por máquina/dia: "maquina:iso:num_op"
    const programmedOpsMachineDay = useMemo(() => {
        const set = new Set();
        programacao.forEach((r) => {
            const iso = entregaToIso(r.entrega) || r.data;
            if (iso && r.maquina && r.num_op)
                set.add(`${r.maquina}:${iso}:${String(r.num_op)}`);
        });
        return set;
    }, [programacao]);
    // Agrupa programação por máquina e verifica se cada OP foi produzida NA MESMA MÁQUINA
    const byMachine = useMemo(() => {
        const map = {};
        MACHINES.forEach((m) => (map[m] = []));
        programacao.forEach((r) => {
            if (map[r.maquina]) {
                const entregaIso = entregaToIso(r.entrega);
                const produced = pickBestProd(producaoByMachineOp[`${r.maquina}:${r.num_op}`], entregaIso);
                const sister = sisterEstampa(r.maquina);
                const producedSister = sister ? pickBestProd(producaoByMachineOp[`${sister}:${r.num_op}`], entregaIso) : null;
                let dataProd = produced?.data || null;
                let metragemProd = produced?.metragem || null;
                let status = "A FAZER";
                if (produced) {
                    if (dataProd && entregaIso) {
                        if (dataProd > entregaIso) {
                            status = "PRONTA EM ATRASO";
                        }
                        else if (dataProd < entregaIso) {
                            status = "PRONTA / ADIANTADA";
                        }
                        else {
                            status = "PRONTA";
                        }
                    }
                    else {
                        status = "PRONTA";
                    }
                }
                else if (producedSister) {
                    status = "FEITO NA OUTRA MÁQUINA";
                    dataProd = producedSister.data || null;
                    metragemProd = producedSister.metragem || null;
                }
                else if (r.maquina !== "Revisão" && revisaoMapByOp[String(r.num_op)]) {
                    // OP aparece no detalhe da revisão → foi produzida e revisada
                    status = "FEITO NA REVISÃO";
                    dataProd = revisaoMapByOp[String(r.num_op)].data || null;
                    metragemProd = revisaoMapByOp[String(r.num_op)].qtd_revisada || null;
                }
                map[r.maquina].push({
                    ...r,
                    status,
                    dataProducao: dataProd,
                    metragemProduzida: metragemProd,
                });
            }
        });
        return map;
    }, [programacao, producaoByMachineOp, revisaoMapByOp]);
    // OPs produzidas que NÃO estão programadas para a máquina naquele dia
    // → "FORA DA PROGRAMAÇÃO"
    const foraByMachine = useMemo(() => {
        const map = {};
        MACHINES.forEach((m) => (map[m] = []));
        const programmedOpsMachineDay = new Set();
        // Mapa: "machine:op" → lista de datas de entrega programadas (ISO)
        const programmedEntregasByOp = {};
        programacao.forEach((r) => {
            const iso = entregaToIso(r.entrega) || r.data;
            if (iso && r.maquina && r.num_op) {
                programmedOpsMachineDay.add(`${r.maquina}:${iso}:${String(r.num_op)}`);
            }
            if (r.maquina && r.num_op) {
                const key = `${r.maquina}:${String(r.num_op)}`;
                if (!programmedEntregasByOp[key])
                    programmedEntregasByOp[key] = [];
                if (iso)
                    programmedEntregasByOp[key].push(iso);
            }
        });
        const added = new Set();
        producaoFiltrada.forEach((r) => {
            const machineKey = normalizeMachine(r.maquina);
            if (!machineKey || !r.num_op || !r.data)
                return;
            const isProgrammedForDay = programmedOpsMachineDay.has(`${machineKey}:${r.data}:${String(r.num_op)}`);
            // OP programada para outro dia: só deixa de ser FORA se houver entrega
            // programada >= data de produção (adiantada). Se a produção foi DEPOIS
            // de todas as entregas programadas, é produção extra → FORA.
            const entregas = programmedEntregasByOp[`${machineKey}:${String(r.num_op)}`] || [];
            const isAdiantada = entregas.some((iso) => iso >= r.data);
            if (!isProgrammedForDay && !isAdiantada) {
                const key = `${machineKey}:${r.num_op}`;
                if (!added.has(key)) {
                    added.add(key);
                    map[machineKey].push({
                        id: `fora-${r.id}`,
                        num_op: r.num_op,
                        produto: r.descricao_produto,
                        metragem: null,
                        metragemProduzida: r.metragem,
                        dataProducao: r.data,
                        status: "FORA",
                    });
                }
            }
        });
        return map;
    }, [programacao, producaoFiltrada]);
    const totals = useMemo(() => {
        const t = {};
        const hasDays = selectedDays.length > 0;
        MACHINES.forEach((m) => {
            const recs = (byMachine[m] || []).filter((r) => !hasDays || selectedDays.includes(entregaToIso(r.entrega) || r.dataProducao));
            const fora = foraByMachine[m] || [];
            const prontas = recs.filter((r) => isDoneStatus(r.status)).length;
            t[m] = {
                total: recs.length,
                prontas,
                aFazer: recs.length - prontas,
                fora: fora.length,
                aderencia: recs.length > 0 ? (prontas / recs.length) * 100 : 0,
            };
        });
        return t;
    }, [byMachine, foraByMachine, selectedDays]);
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-[60vh]", children: _jsx("div", { className: "w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" }) }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100", children: [_jsxs("div", { className: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3", children: [_jsx(LightHeader, { icon: ListChecks, title: "Ader\u00EAncia de Programa\u00E7\u00E3o", subtitle: "Comparativo entre OPs programadas e produzidas", className: "mb-3", children: _jsxs("div", { className: "flex items-center gap-3", children: [(() => {
                                    const totalGeral = Object.values(totals).reduce((s, t) => s + t.total, 0);
                                    const prontasGeral = Object.values(totals).reduce((s, t) => s + t.prontas, 0);
                                    const aderenciaGeral = totalGeral > 0 ? (prontasGeral / totalGeral) * 100 : 0;
                                    return (_jsxs("div", { className: "flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white", children: [_jsx("span", { className: "text-xs font-semibold uppercase tracking-wide opacity-90", children: "Ader\u00EAncia Geral" }), _jsxs("span", { className: "text-lg font-extrabold tabular-nums", children: [aderenciaGeral.toFixed(0), "%"] })] }));
                                })(), _jsx(DayFilter, { selectedDays: selectedDays, onSelect: setSelectedDays }), selectedDays.length > 0 && (_jsx(Button, { variant: "ghost", size: "sm", className: "h-9 text-slate-700 hover:bg-slate-100", onClick: () => setSelectedDays([]), children: "Limpar data" })), _jsxs(Button, { variant: "default", size: "sm", className: "h-9 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm", onClick: () => setChartOpen(true), children: [_jsx(LineChartIcon, { className: "w-4 h-4" }), " Gr\u00E1fico"] }), _jsxs(Button, { variant: "default", size: "sm", className: "h-9 gap-1.5 bg-slate-900 text-white hover:bg-slate-800", onClick: () => setImportOpen(true), children: [_jsx(UploadCloud, { className: "w-4 h-4" }), " Importar Programa\u00E7\u00E3o"] })] }) }), programacao.length === 0 && (_jsxs("div", { className: "text-center py-20", children: [_jsx(ListChecks, { className: "w-12 h-12 text-slate-400 mx-auto mb-3" }), _jsx("p", { className: "text-slate-600 font-medium", children: "Nenhuma programa\u00E7\u00E3o importada ainda." }), _jsx("p", { className: "text-slate-500 text-sm mt-1", children: "Clique em \"Importar Programa\u00E7\u00E3o\" para come\u00E7ar." })] })), programacao.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-3", children: MACHINES.map((m, idx) => {
                                    const t = totals[m];
                                    const isActive = active === m;
                                    return (_jsx(motion.div, { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25, delay: idx * 0.05 }, onClick: () => setActive(isActive ? null : m), className: `group relative rounded-2xl p-[1.5px] cursor-pointer transition-all duration-300 ${isActive
                                            ? "bg-slate-400 shadow-lg scale-[1.02]"
                                            : "bg-slate-300 hover:bg-slate-400 hover:-translate-y-1 hover:shadow-md"}`, children: _jsx("div", { className: "relative rounded-[14px] bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-3 h-full overflow-hidden", children: _jsxs("div", { className: "relative flex flex-col h-full", children: [_jsx("h3", { className: "text-sm font-bold text-slate-900 tracking-tight truncate", children: m }), _jsx("p", { className: "text-[9px] text-slate-500 uppercase font-semibold tracking-widest mt-0.5", children: "Ader\u00EAncia" }), _jsxs("div", { className: "flex items-end justify-between gap-2 mt-0.5", children: [_jsx("p", { className: "text-2xl font-extrabold tabular-nums leading-none text-slate-900", children: t.total > 0 ? `${t.aderencia.toFixed(0)}%` : "—" }), _jsxs("div", { className: "flex flex-col gap-0.5 items-end", children: [_jsxs("span", { className: "flex items-center gap-1 text-[10px] font-semibold text-emerald-600", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-emerald-500" }), t.prontas, " prontas"] }), _jsxs("span", { className: "flex items-center gap-1 text-[10px] font-semibold text-amber-600", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-amber-500" }), t.aFazer, " a fazer"] }), t.fora > 0 && (_jsxs("span", { className: "flex items-center gap-1 text-[10px] font-semibold text-orange-600", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-orange-500" }), t.fora, " fora prog."] }))] })] }), _jsx("div", { className: "mt-2 pt-1.5 border-t border-slate-200 flex items-center justify-between", children: _jsxs("span", { className: "flex items-center gap-1 text-[10px] font-medium text-blue-600", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-blue-500" }), t.total, " OP(s) programada(s)"] }) })] }) }) }, m));
                                }) }), active && (_jsx(AderenciaRelatorio, { maquina: active, records: byMachine[active] || [], foraRecords: foraByMachine[active] || [], selectedDays: selectedDays }))] }))] }), _jsx(ImportProgramacaoDialog, { open: importOpen, onOpenChange: setImportOpen, onImported: load }), _jsx(AderenciaChartDialog, { open: chartOpen, onOpenChange: setChartOpen, byMachine: byMachine, selectedDays: selectedDays })] }));
}
function AderenciaRelatorio({ maquina, records, foraRecords, selectedDays }) {
    const { toast } = useToast();
    const rootRef = useRef(null);
    const [saving, setSaving] = useState(false);
    const entregaToIso = (entrega) => {
        if (!entrega)
            return null;
        const parts = entrega.split("/");
        if (parts.length === 3)
            return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        return null;
    };
    const inSelectedDays = (row) => {
        if (!selectedDays || selectedDays.length === 0)
            return true;
        const iso = entregaToIso(row.entrega) || row.dataProducao || null;
        return iso ? selectedDays.includes(iso) : false;
    };
    const filteredRecords = useMemo(() => records.filter(inSelectedDays), [records, selectedDays]);
    const filteredFora = useMemo(() => foraRecords.filter(inSelectedDays), [foraRecords, selectedDays]);
    const prontas = filteredRecords.filter((r) => isDoneStatus(r.status)).length;
    const total = filteredRecords.length;
    const foraCount = filteredFora.length;
    const aderencia = total > 0 ? (prontas / total) * 100 : 0;
    const handleSave = async () => {
        // A data vem sempre da coluna Entrega dos registros importados
        const uniqueDates = [...new Set([...records, ...foraRecords].map((r) => r.data).filter(Boolean))];
        if (uniqueDates.length === 0) {
            toast({ title: "Sem data de entrega", description: "Importe a programação para obter a data de entrega.", variant: "destructive" });
            return;
        }
        setSaving(true);
        try {
            const allRows = [...records, ...foraRecords].map((r) => ({
                num_op: r.num_op,
                produto: r.produto,
                metragem: r.metragem,
                metragem_produzida: r.metragemProduzida,
                data_producao: r.dataProducao,
                entrega: r.entrega,
                status: r.status,
            }));
            for (const data of uniqueDates) {
                const existing = await db.entities.AderenciaHistorico.filter({ data, maquina });
                const payload = {
                    data,
                    maquina,
                    total_ops: total,
                    prontas,
                    a_fazer: total - prontas,
                    fora: foraCount,
                    aderencia,
                    detalhes: JSON.stringify(allRows),
                };
                if (existing.length > 0) {
                    await db.entities.AderenciaHistorico.update(existing[0].id, payload);
                }
                else {
                    await db.entities.AderenciaHistorico.create(payload);
                }
            }
        }
        catch (e) {
            toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
        }
        finally {
            setSaving(false);
        }
    };
    const handlePrint = async () => {
        const root = rootRef.current;
        if (!root) {
            window.print();
            return;
        }
        await handleSave();
        const styleEl = document.createElement("style");
        styleEl.id = "aderencia-landscape-page";
        styleEl.textContent = "@page { size: A4 landscape; margin: 8mm; }";
        document.head.appendChild(styleEl);
        document.body.classList.add("printing-aderencia");
        await new Promise((res) => setTimeout(res, 300));
        const cleanup = () => {
            document.body.classList.remove("printing-aderencia");
            styleEl.remove();
            window.removeEventListener("afterprint", cleanup);
        };
        window.addEventListener("afterprint", cleanup);
        window.print();
    };
    const allRows = [...filteredRecords, ...filteredFora];
    const toDateKey = (entrega) => {
        if (!entrega)
            return "9999-99-99";
        const parts = entrega.split("/");
        if (parts.length === 3)
            return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        return entrega;
    };
    const grouped = useMemo(() => {
        const map = {};
        allRows.forEach((r) => {
            const key = r.entrega || "Sem data de entrega";
            if (!map[key])
                map[key] = [];
            map[key].push(r);
        });
        return Object.keys(map)
            .sort((a, b) => toDateKey(a).localeCompare(toDateKey(b)))
            .map((k) => ({ entrega: k, rows: map[k] }));
    }, [allRows]);
    return (_jsxs(motion.div, { ref: rootRef, initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 }, className: "aderencia-root rounded-2xl border border-slate-300 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5 shadow-sm", children: [_jsxs("div", { className: "aderencia-header flex items-center justify-between mb-4 rounded-xl bg-slate-100 border border-slate-200 px-4 py-3", children: [_jsxs("div", { children: [_jsxs("h3", { className: "text-lg font-bold text-slate-900", children: ["Relat\u00F3rio \u2014 ", maquina] }), _jsxs("p", { className: "text-xs text-slate-600", children: [total, " OP(s) programada(s) \u2022 ", prontas, " produzida(s)", foraRecords.length > 0 && ` • ${foraRecords.length} fora da programação`, _jsxs("span", { className: "ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold tabular-nums text-sm", children: ["Ader\u00EAncia: ", aderencia.toFixed(0), "%"] })] })] }), _jsxs("div", { className: "flex items-center gap-2 print-hide", children: [_jsxs(Button, { variant: "outline", size: "sm", className: "h-8 gap-1 bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700", onClick: handleSave, disabled: saving, children: [saving ? _jsx(Loader2, { className: "w-4 h-4 animate-spin" }) : _jsx(Save, { className: "w-4 h-4" }), " Salvar"] }), _jsxs(Button, { variant: "outline", size: "sm", className: "h-8 gap-1 bg-white text-slate-800 border-slate-300 hover:bg-slate-100", onClick: handlePrint, children: [_jsx(Printer, { className: "w-4 h-4" }), " Imprimir"] })] })] }), _jsx("div", { className: "overflow-x-auto rounded-xl border border-slate-200", children: _jsxs("table", { className: "w-full text-xs border-collapse", children: [_jsx("thead", { className: "bg-slate-100", children: _jsxs("tr", { className: "text-left text-slate-700", children: [_jsx("th", { className: "px-3 py-2.5 font-medium whitespace-nowrap w-[10%]", children: "Data Produ\u00E7\u00E3o" }), _jsx("th", { className: "px-3 py-2.5 font-medium whitespace-nowrap w-[8%]", children: "Entrega" }), _jsx("th", { className: "px-3 py-2.5 font-medium whitespace-nowrap w-[8%]", children: "OP" }), _jsx("th", { className: "px-3 py-2.5 font-medium whitespace-nowrap w-[35%]", children: "Produto" }), _jsx("th", { className: "px-3 py-2.5 font-medium text-right whitespace-nowrap w-[10%]", children: "Metragem" }), _jsx("th", { className: "px-3 py-2.5 font-medium text-right whitespace-nowrap w-[10%]", children: "Mts Produzidos" }), _jsx("th", { className: "px-3 py-2.5 font-medium text-center whitespace-nowrap w-[14%]", children: "Situa\u00E7\u00E3o" })] }) }), _jsxs("tbody", { children: [grouped.map((g) => {
                                    const prontasG = g.rows.filter((r) => r.status.startsWith("PRONTA")).length;
                                    return (_jsxs(React.Fragment, { children: [_jsx("tr", { className: "bg-blue-50 border-t-2 border-blue-200", children: _jsxs("td", { colSpan: 7, className: "px-3 py-2 text-blue-800 font-bold text-[12px] uppercase tracking-wide", children: ["Entrega: ", g.entrega, " \u2022 ", g.rows.length, " OP(s) \u2022 ", prontasG, " pronta(s)"] }) }), g.rows.map((r, idx) => {
                                                const fora = r.status === "FORA";
                                                return (_jsxs("tr", { className: `row-data border-t border-slate-200 text-slate-700 hover:bg-slate-100 ${idx % 2 === 0 ? "bg-white" : "bg-slate-100 row-gray"}`, children: [_jsx("td", { className: "px-3 py-2 whitespace-nowrap tabular-nums text-[11px]", children: r.dataProducao ? r.dataProducao.split("-").reverse().join("/") : "—" }), _jsx("td", { className: "px-3 py-2 whitespace-nowrap text-[11px]", children: r.entrega ? (_jsx("span", { className: "badge-entrega inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium", children: r.entrega })) : "—" }), _jsx("td", { className: "px-3 py-2 whitespace-nowrap text-center font-semibold text-slate-900", children: r.num_op }), _jsx("td", { className: "px-3 py-2 max-w-[280px] truncate text-[12px] font-bold text-black", title: r.produto, children: r.produto || "—" }), _jsx("td", { className: "px-3 py-2 text-right tabular-nums", children: r.metragem != null ? r.metragem.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—" }), _jsx("td", { className: "px-3 py-2 text-right tabular-nums text-emerald-700", children: r.metragemProduzida != null ? r.metragemProduzida.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—" }), _jsxs("td", { className: "px-3 py-2 text-center", children: [r.status === "PRONTA" && (_jsx("span", { className: "badge-pronta inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800", children: "PRONTA" })), r.status === "PRONTA EM ATRASO" && (_jsx("span", { className: "badge-atraso inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800", children: "PRONTA EM ATRASO" })), r.status === "PRONTA / ADIANTADA" && (_jsx("span", { className: "badge-adiantada inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-cyan-100 text-cyan-800", children: "PRONTA / ADIANTADA" })), r.status === "FEITO NA OUTRA ESTAMPA" && (_jsx("span", { className: "badge-outra inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800", children: "FEITO NA OUTRA ESTAMPA" })), r.status === "FEITO NA OUTRA MÁQUINA" && (_jsx("span", { className: "badge-outra inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800", children: "FEITO NA OUTRA M\u00C1QUINA" })), r.status === "FEITO NA REVISÃO" && (_jsx("span", { className: "badge-revisao inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800", children: "FEITO NA REVIS\u00C3O" })), fora && (_jsx("span", { className: "badge-fora inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800", children: "FORA DA PROGRAMA\u00C7\u00C3O" })), r.status === "A FAZER" && (_jsx("span", { className: "badge-afazer inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800", children: "A FAZER" }))] })] }, r.id));
                                            })] }, g.entrega));
                                }), allRows.length === 0 && (_jsx("tr", { children: _jsxs("td", { colSpan: 7, className: "px-3 py-8 text-center text-slate-500", children: ["Nenhuma OP programada para ", maquina, "."] }) }))] })] }) })] }));
}
