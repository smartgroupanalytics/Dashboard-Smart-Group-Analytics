import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Ruler, Scissors, TrendingDown, Hash, Gauge as GaugeIcon, FileSpreadsheet, ListChecks, FileBarChart, Presentation, X, ShoppingBag, } from "lucide-react";
import DayFilter from "@/components/desempenho/DayFilter";
import RevisaoTable from "@/components/revisao/RevisaoTable";
import MetaReportCard from "@/components/revisao/MetaReportCard";
import RevisaoKpiCard from "@/components/revisao/RevisaoKpiCard";
import ImportRevisaoExcelDialog from "@/components/revisao/ImportRevisaoExcelDialog";
import ImportPerdaOpMensalDialog from "@/components/revisao/ImportPerdaOpMensalDialog";
import DetalheRevisaoDialog from "@/components/revisao/DetalheRevisaoDialog";
import RevisaoRelatorioDialog from "@/components/revisao/RevisaoRelatorioDialog";
import PedidosRevisaoDialog from "@/components/revisao/PedidosRevisaoDialog";
import { fmtMeters, mesLabel } from "@/lib/format";
import { exportRevisaoPresentationToPdf } from "@/lib/exportRevisaoPdf";
import ExtraDashboardsStage from "@/components/revisao/ExtraDashboardsStage";
import PerdaOpMensalReport from "@/components/revisao/PerdaOpMensalReport";

const META_REVISADOS = 5126.1;
const META_1 = 4882.0;
// Aguarda um dashboard offscreen ficar pronto (conteúdo presente e sem spinner).
async function waitForReady(ref, timeout = 8000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
        const el = ref.current;
        if (el) {
            const content = el.querySelector(".max-w-7xl");
            const spinning = el.querySelector(".animate-spin");
            if (content && !spinning)
                return true;
        }
        await new Promise((r) => setTimeout(r, 150));
    }
    return false;
}
// Retorna o elemento de conteúdo (.max-w-7xl) de um dashboard offscreen.
function contentOf(ref) {
    if (!ref.current)
        return null;
    return ref.current.querySelector(".max-w-7xl") || ref.current;
}
// Retorna os 5 dias úteis (seg a sex) da semana atual no formato YYYY-MM-DD.
function getCurrentWeekDays() {
    const today = new Date();
    const dow = today.getDay();
    // Segunda-feira: pega a semana passada (seg a sex)
    const offset = dow === 1 ? -7 : 0;
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + offset);
    const days = [];
    for (let i = 0; i < 5; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        days.push(`${y}-${m}-${dd}`);
    }
    return days;
}
function SectionTitle({ icon: Icon, title }) {
    return (_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(Icon, { className: "w-4 h-4 text-slate-700" }), _jsx("h2", { className: "text-xs font-bold text-slate-900 uppercase tracking-wider", children: title })] }));
}
export default function Revisao() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMeses, setSelectedMeses] = useState([new Date().getMonth() + 1]);
    const [selectedDays, setSelectedDays] = useState(() => {
        try {
            const saved = localStorage.getItem("revisao_selectedDays");
            return saved ? JSON.parse(saved) : [];
        }
        catch {
            return [];
        }
    });
    const [viewMode, setViewMode] = useState("dashboard");
    const [importOpen, setImportOpen] = useState(false);
    const [importPerdaOpen, setImportPerdaOpen] = useState(false);
    const [perdaVersion, setPerdaVersion] = useState(0);
    const [detalheOpen, setDetalheOpen] = useState(false);
    const [relatorioOpen, setRelatorioOpen] = useState(false);
    const [relatorioRecords, setRelatorioRecords] = useState(null);
    const [pedidosOpen, setPedidosOpen] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [showExtra, setShowExtra] = useState(false);
    const [presentationMode, setPresentationMode] = useState(false);
    const dashboardRef = useRef(null);
    useEffect(() => {
        if (presentationMode) {
            document.body.classList.add("revisao-presentation");
        }
        else {
            document.body.classList.remove("revisao-presentation");
        }
        return () => document.body.classList.remove("revisao-presentation");
    }, [presentationMode]);
    const refProdutividade = useRef(null);
    const refDisponibilidade = useRef(null);
    const refTempoOcioso = useRef(null);
    const refRelatorioProgramar = useRef(null);
    const refControlePedidos = useRef(null);
    const refCargaMaquina = useRef(null);
    const refRotatividade = useRef(null);
    const load = async () => {
        try {
            setLoading(true);
            const data = await db.entities.Revisao.list("mes");
            setRecords(data);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        load();
    }, []);
    useEffect(() => {
        try {
            localStorage.setItem("revisao_selectedDays", JSON.stringify(selectedDays));
        }
        catch { }
    }, [selectedDays]);
    const selectedRecords = useMemo(() => selectedDays.length > 0
        ? records.filter((r) => r.data && selectedDays.includes(r.data))
        : records.filter((r) => selectedMeses.includes(r.mes)), [records, selectedMeses, selectedDays]);
    const agg = useMemo(() => {
        if (selectedRecords.length === 0)
            return null;
        const sum = (fn) => selectedRecords.reduce((s, r) => s + (fn(r) || 0), 0);
        const jumpados = sum((r) => r.metros_jumpados);
        const revisados = sum((r) => r.metros_revisados);
        const p1 = sum((r) => r.metros_1);
        const quebra = jumpados - p1;
        const ops = sum((r) => r.ops_revisadas);
        const revManual = sum((r) => r.media_metros_revisados);
        const p1Manual = sum((r) => r.media_metros_1);
        const count = selectedRecords.length;
        return {
            jumpados,
            revisados,
            p1,
            quebra,
            ops,
            count,
            pctQuebra: jumpados ? (quebra / jumpados) * 100 : 0,
            mediaRevisados: revManual ? revManual / count : revisados / count,
            media1: p1Manual ? p1Manual / count : p1 / count,
            mediaJumbados: jumpados / count,
        };
    }, [selectedRecords]);
    const mesesLabel = useMemo(() => selectedDays.length > 0
        ? selectedDays.map((d) => d.split("-").reverse().join("/")).join(", ")
        : selectedMeses.length === 0
            ? "—"
            : selectedMeses.map((m) => mesLabel(m)).join(", "), [selectedMeses, selectedDays]);
    const handleExportPdf = async () => {
        try {
            setExporting(true);
            // Abre o relatório da semana (seg a sex) para capturar junto ao dashboard
            const weekDays = getCurrentWeekDays();
            const weekRecords = records.filter((r) => r.data && weekDays.includes(r.data));
            setRelatorioRecords(weekRecords);
            setRelatorioOpen(true);
            // Renderiza os dashboards extras offscreen para captura (páginas 3 a 7)
            setShowExtra(true);
            // aguarda o dialog e os dashboards renderizarem
            await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
            await new Promise((res) => setTimeout(res, 200));
            const relReady = (async () => {
                const t0 = Date.now();
                while (Date.now() - t0 < 8000 && !document.querySelector(".revisao-relatorio-root")) {
                    await new Promise((r) => setTimeout(r, 150));
                }
            })();
            await Promise.all([
                relReady,
                waitForReady(refProdutividade),
                waitForReady(refDisponibilidade),
                waitForReady(refTempoOcioso),
                waitForReady(refRelatorioProgramar),
                waitForReady(refControlePedidos),
                waitForReady(refCargaMaquina),
                waitForReady(refRotatividade),
            ]);
            // tempo extra para gráficos/SVG/animações assentarem
            await new Promise((res) => setTimeout(res, 600));
            const relRoot = document.querySelector(".revisao-relatorio-root");
            const extraPages = [
                { el: contentOf(refRotatividade), bg: [255, 255, 255] },
                { el: contentOf(refProdutividade), bg: [244, 247, 252] },
                { el: contentOf(refDisponibilidade), bg: [255, 255, 255] },
                { el: contentOf(refTempoOcioso), bg: [255, 255, 255] },
                { el: contentOf(refCargaMaquina), bg: [248, 249, 252] },
                { el: contentOf(refRelatorioProgramar), bg: [255, 255, 255] },
                { el: contentOf(refControlePedidos), bg: [255, 255, 255], hideSelector: ".print-hide, .pdf-hide-comparativo" },
            ];
            await exportRevisaoPresentationToPdf(dashboardRef.current, relRoot, `Relatório de Revisão`, extraPages);
            setRelatorioOpen(false);
            setRelatorioRecords(null);
            setShowExtra(false);
        }
        catch (e) {
            console.error(e);
            alert("Erro ao gerar PDF: " + (e?.message || e));
            setRelatorioOpen(false);
            setRelatorioRecords(null);
            setShowExtra(false);
        }
        finally {
            setExporting(false);
        }
    };
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-[60vh]", children: _jsx("div", { className: "w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" }) }));
    }
    if (!agg) {
        return (_jsx("div", { className: "min-h-screen bg-[#F8F9FA]", children: _jsxs("div", { className: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex flex-col items-center gap-6", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full rounded-xl border border-slate-100 bg-white px-5 py-4 shadow-sm", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-2.5 rounded-xl", style: { background: "#D1E7FF" }, children: _jsx(ClipboardCheck, { className: "w-5 h-5", style: { color: "#007BFF" } }) }), _jsx("div", { children: _jsx("h1", { className: "text-2xl font-extrabold tracking-tight text-slate-900", children: "Revis\u00E3o" }) })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs(Button, { variant: "default", size: "sm", className: "gap-1.5", onClick: () => setImportOpen(true), children: [_jsx(FileSpreadsheet, { className: "w-4 h-4" }), " Importar Excel"] }), _jsx(DayFilter, { selectedDays: selectedDays, onSelect: setSelectedDays, triggerClassName: "bg-white text-slate-800 hover:bg-slate-100" })] })] }), _jsxs("p", { className: "text-slate-600", children: ["Nenhum dado encontrado para ", mesesLabel, "."] }), _jsx(ImportRevisaoExcelDialog, { open: importOpen, onOpenChange: setImportOpen, onImported: async (registro) => {
                            await load();
                            if (registro?.data) {
                                setSelectedDays((prev) => (prev.includes(registro.data) ? prev : [registro.data]));
                            }
                            else if (registro?.mes) {
                                setSelectedMeses((prev) => (prev.includes(registro.mes) ? prev : [...prev, registro.mes].sort((a, b) => a - b)));
                                setSelectedDays([]);
                            }
                        } })] }) }));
    }
    const cards = [
        { title: "Metros Jumbados", value: fmtMeters(agg.jumpados), icon: Ruler, accent: "blue" },
        { title: "Metros Revisados", value: fmtMeters(agg.revisados), icon: ClipboardCheck, accent: "green" },
        { title: "Metros de 1°", value: fmtMeters(agg.p1), icon: Ruler, accent: "yellow" },
        { title: "Metros de Quebra", value: fmtMeters(agg.quebra), icon: Scissors, accent: "pink" },
        {
            title: "% de Quebra",
            value: (_jsxs("span", { className: "inline-flex items-center gap-1.5", children: [agg.pctQuebra.toFixed(1).replace(".", ",") + "%", _jsx("span", { className: "inline-block w-2 h-2 rounded-full", style: { background: agg.pctQuebra < 5 ? "#00A86B" : "#E83E8C" }, title: agg.pctQuebra < 5 ? "Abaixo de 5%" : "Acima de 5%" })] })),
            icon: TrendingDown,
            accent: "yellow",
        },
        {
            title: "N° de OPs Revisadas",
            value: Math.round(agg.ops).toLocaleString("pt-BR"),
            icon: Hash,
            accent: "pink",
        },
    ];
    return (_jsxs("div", { className: "min-h-screen bg-[#F8F9FA]", children: [_jsxs("button", { onClick: () => setPresentationMode((v) => !v), className: `fixed top-2 right-2 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg transition-all ${presentationMode
                    ? "bg-rose-500 text-white hover:bg-rose-600"
                    : "bg-slate-900 text-white hover:bg-slate-700"}`, title: presentationMode ? "Sair do modo apresentação" : "Modo apresentação (TV)", children: [presentationMode ? _jsx(X, { className: "w-3.5 h-3.5" }) : _jsx(Presentation, { className: "w-3.5 h-3.5" }), presentationMode ? "Sair" : "TV"] }), _jsxs("div", { ref: dashboardRef, className: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 revisao-dashboard", children: [_jsxs("div", { className: "revisao-header flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-2 rounded-xl", style: { background: "#D1E7FF" }, children: _jsx(ClipboardCheck, { className: "w-4 h-4", style: { color: "#007BFF" } }) }), _jsx("div", { children: _jsx("h1", { className: "text-xl font-extrabold tracking-tight text-slate-900 leading-tight", children: "Revis\u00E3o" }) })] }), _jsxs("div", { className: "flex items-center gap-3 pdf-hide", children: [_jsxs(Button, { variant: "default", size: "sm", className: "gap-1.5", onClick: () => setImportOpen(true), children: [_jsx(FileSpreadsheet, { className: "w-4 h-4" }), " Importar Excel"] }), _jsxs(Button, { variant: "default", size: "sm", className: "gap-1.5", onClick: () => setImportPerdaOpen(true), children: [_jsx(TrendingDown, { className: "w-4 h-4" }), " Importar Perdas"] }), _jsxs(Button, { variant: "default", size: "sm", className: "gap-1.5", onClick: () => setDetalheOpen(true), children: [_jsx(ListChecks, { className: "w-4 h-4" }), " Detalhes do Dia"] }), _jsxs(Button, { variant: "default", size: "sm", className: "gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white", onClick: () => setPedidosOpen(true), children: [_jsx(ShoppingBag, { className: "w-4 h-4" }), " Pedidos"] }), _jsxs(Button, { variant: "default", size: "sm", className: "gap-1.5", onClick: () => setRelatorioOpen(true), children: [_jsx(FileBarChart, { className: "w-4 h-4" }), " Relat\u00F3rio"] }), _jsxs(Button, { variant: "default", size: "sm", className: "gap-1.5 bg-[#008B8B] hover:bg-[#006d6d] text-white", onClick: handleExportPdf, disabled: exporting, children: [_jsx(Presentation, { className: "w-4 h-4" }), " ", exporting ? "Gerando..." : "Exportar PDF"] }), _jsx(DayFilter, { selectedDays: selectedDays, onSelect: setSelectedDays, triggerClassName: "bg-white text-slate-800 hover:bg-slate-100" })] })] }), viewMode === "tabela" ? (_jsx(RevisaoTable, { records: records, onSaved: load })) : (_jsxs(_Fragment, { children: [_jsx(SectionTitle, { icon: Ruler, title: "Indicadores" }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4", children: cards.map((c, i) => (_jsx(RevisaoKpiCard, { ...c, index: i }, c.title))) }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-3", children: [_jsxs("div", { className: "lg:col-span-1 flex flex-col gap-2", children: [_jsx(SectionTitle, { icon: GaugeIcon, title: "Metas (m\u00E9dia mensal)" }), _jsx(MetaReportCard, { mediaRevisados: agg.mediaRevisados, media1: agg.media1, metaRevisados: META_REVISADOS, meta1: META_1 })] }), _jsxs("div", { className: "lg:col-span-2 flex flex-col gap-2", children: [_jsx(SectionTitle, { icon: TrendingDown, title: "Perda por OP \u2014 Mensal" }), _jsx("div", { className: "flex-1 min-h-0", children: _jsx(PerdaOpMensalReport, {}, perdaVersion) })] })] })] })), _jsx(DetalheRevisaoDialog, { open: detalheOpen, onOpenChange: setDetalheOpen, datas: selectedDays }), _jsx(RevisaoRelatorioDialog, { open: relatorioOpen, onOpenChange: setRelatorioOpen, records: relatorioRecords || selectedRecords }), _jsx(PedidosRevisaoDialog, { open: pedidosOpen, onOpenChange: setPedidosOpen }), _jsx(ImportRevisaoExcelDialog, { open: importOpen, onOpenChange: setImportOpen, onImported: async (registro) => {
                            await load();
                            if (registro?.data) {
                                setSelectedDays((prev) => (prev.includes(registro.data) ? prev : [registro.data]));
                            }
                            else if (registro?.mes) {
                                setSelectedMeses((prev) => (prev.includes(registro.mes) ? prev : [...prev, registro.mes].sort((a, b) => a - b)));
                                setSelectedDays([]);
                            }
                        } }), _jsx(ImportPerdaOpMensalDialog, { open: importPerdaOpen, onOpenChange: setImportPerdaOpen, onImported: () => { load(); setPerdaVersion((v) => v + 1); } })] }), _jsx(ExtraDashboardsStage, { show: showExtra, refProdutividade: refProdutividade, refDisponibilidade: refDisponibilidade, refTempoOcioso: refTempoOcioso, refRelatorioProgramar: refRelatorioProgramar, refControlePedidos: refControlePedidos, refCargaMaquina: refCargaMaquina, refRotatividade: refRotatividade })] }));
}
