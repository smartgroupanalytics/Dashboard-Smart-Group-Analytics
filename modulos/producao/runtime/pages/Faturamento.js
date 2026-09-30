import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Pencil, DollarSign, Ruler, TrendingUp, Calculator, BarChart3, Wallet, LayoutDashboard, Table, Presentation, X, Upload, Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import MonthFilter from "@/components/faturamento/MonthFilter";
import EditFaturamentoDialog from "@/components/faturamento/EditFaturamentoDialog";
import ImportFaturamentoDialog from "@/components/faturamento/ImportFaturamentoDialog";
import FaturamentoTable from "@/components/faturamento/FaturamentoTable";
import { fmtCurrency, fmtMeters, fmtPrice, mesLabel } from "@/lib/format";

export default function Faturamento() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMeses, setSelectedMeses] = useState([new Date().getMonth() + 1]);
    const [editOpen, setEditOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [viewMode, setViewMode] = useState("dashboard");
    const [presenting, setPresenting] = useState(false);
    const rootRef = useRef(null);
    const contentRef = useRef(null);
    const [scale, setScale] = useState(1);
    const startPresentation = async () => {
        setViewMode("dashboard");
        setPresenting(true);
        try {
            await rootRef.current?.requestFullscreen?.();
        }
        catch (e) {
            /* fullscreen pode ser bloqueado — ainda assim entra no modo apresentação */
        }
    };
    const exitPresentation = () => {
        setPresenting(false);
        if (document.fullscreenElement)
            document.exitFullscreen?.();
    };
    useEffect(() => {
        const onFsChange = () => {
            if (!document.fullscreenElement)
                setPresenting(false);
        };
        document.addEventListener("fullscreenchange", onFsChange);
        return () => document.removeEventListener("fullscreenchange", onFsChange);
    }, []);
    useLayoutEffect(() => {
        if (!presenting) {
            setScale(1);
            return;
        }
        const compute = () => {
            const el = contentRef.current;
            if (!el)
                return;
            const vh = window.innerHeight;
            const ch = el.scrollHeight;
            if (ch > 0)
                setScale(Math.min(1.6, vh / ch));
        };
        compute();
        const t = setTimeout(compute, 50);
        window.addEventListener("resize", compute);
        return () => {
            clearTimeout(t);
            window.removeEventListener("resize", compute);
        };
    }, [presenting, viewMode, selectedMeses, records]);
    const load = async () => {
        try {
            setLoading(true);
            const data = await db.entities.Faturamento.list("mes");
            setRecords(data);
        }
        finally {
            setLoading(false);
        }
    };
    const handleDeleteAll = async () => {
        await db.entities.Faturamento.deleteMany({});
        await load();
    };
    useEffect(() => {
        load();
    }, []);
    const selectedRecords = useMemo(() => records.filter((r) => selectedMeses.includes(r.mes)), [records, selectedMeses]);
    const agg = useMemo(() => {
        if (selectedRecords.length === 0)
            return null;
        const sum = (fn) => selectedRecords.reduce((s, r) => s + (fn(r) || 0), 0);
        const sg = sum((r) => r.faturamento_smart_group);
        const msg = sum((r) => r.metros_smart_group);
        const stk = sum((r) => r.faturamento_stk);
        const mstk = sum((r) => r.metros_stk);
        const totalFat = sg + stk;
        const totalMetros = msg + mstk;
        const fat2025 = sum((r) => r.faturamento_2025);
        const previsto = sum((r) => r.faturamento_previsto_2026);
        const metros2025 = sum((r) => r.metros_2025);
        const orcadoAvg = selectedRecords.reduce((s, r) => s + (r.preco_medio_orcado || 0), 0) / selectedRecords.length;
        const realizadoAvg = totalMetros ? totalFat / totalMetros : 0;
        const ano = selectedRecords[0]?.ano;
        const dif2025Valor = totalFat - fat2025;
        const dif2025Pct = fat2025 ? (dif2025Valor / fat2025) * 100 : 0;
        const difPrevistoValor = totalFat - previsto;
        const difPrevistoPct = previsto ? (difPrevistoValor / previsto) * 100 : 0;
        const metrosOrcado = sum((r) => r.preco_medio_orcado ? (r.faturamento_previsto_2026 || 0) / r.preco_medio_orcado : 0);
        const difMetrosValor = totalMetros - metrosOrcado;
        const difMetrosPct = metrosOrcado ? (difMetrosValor / metrosOrcado) * 100 : 0;
        return {
            sg, msg, stk, mstk, totalFat, totalMetros, fat2025, previsto,
            preco_medio_orcado: orcadoAvg,
            preco_medio_realizado: realizadoAvg,
            ano, count: selectedRecords.length,
            dif2025Valor, dif2025Pct, difPrevistoValor, difPrevistoPct,
            metrosOrcado, difMetrosValor, difMetrosPct,
            precoSG: msg ? sg / msg : 0,
            precoSTK: mstk ? stk / mstk : 0,
            precoGeral: totalMetros ? totalFat / totalMetros : 0,
        };
    }, [selectedRecords]);
    const mesesLabel = useMemo(() => (selectedMeses.length === 0 ? "—" : selectedMeses.map((m) => mesLabel(m)).join(", ")), [selectedMeses]);
    if (loading) {
        return (_jsx("div", { className: "ft-page", children: _jsx("div", { className: "flex items-center justify-center", style: { minHeight: "60vh" }, children: _jsx("div", { className: "w-8 h-8 border-4 border-slate-200 border-t-[#00798c] rounded-full animate-spin" }) }) }));
    }
    if (!agg) {
        return (_jsxs("div", { className: "ft-page", children: [_jsxs("div", { className: "ft-shell", children: [_jsx("header", { className: "ft-hero", children: _jsxs("div", { className: "ft-hero-content", children: [_jsxs("div", { className: "ft-hero-brand", children: [_jsx("div", { className: "ft-hero-mark", children: _jsx(Wallet, { className: "w-4 h-4" }) }), _jsxs("div", { children: [_jsx("h1", { children: "Faturamento" }), _jsxs("p", { children: ["Dashboard gerencial \u2014 ", mesesLabel] })] })] }), _jsx("div", { className: "ft-actions", children: _jsxs("button", { className: "ft-btn", onClick: () => setImportOpen(true), children: [_jsx(Upload, { className: "w-3.5 h-3.5" }), " Importar"] }) })] }) }), _jsxs("div", { className: "ft-empty", children: [_jsxs("p", { className: "text-slate-600 text-sm", children: ["Nenhum dado encontrado para ", mesesLabel, "."] }), _jsx(MonthFilter, { selectedMeses: selectedMeses, onSelect: setSelectedMeses }), _jsxs(AlertDialog, { children: [_jsx(AlertDialogTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", size: "sm", className: "gap-1.5 text-rose-600 hover:bg-rose-50", children: [_jsx(Trash2, { className: "w-4 h-4" }), " Limpar dados"] }) }), _jsxs(AlertDialogContent, { children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { children: "Limpar todos os dados?" }), _jsx(AlertDialogDescription, { children: "Esta a\u00E7\u00E3o ir\u00E1 apagar todos os registros de faturamento. N\u00E3o pode ser desfeita." })] }), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { children: "Cancelar" }), _jsx(AlertDialogAction, { onClick: handleDeleteAll, className: "bg-rose-600 hover:bg-rose-700", children: "Apagar" })] })] })] })] })] }), _jsx(ImportFaturamentoDialog, { open: importOpen, onOpenChange: setImportOpen, onImported: load })] }));
    }
    const kpiCards = [
        { title: "Fat. Smart Group", value: fmtCurrency(agg.sg), icon: DollarSign, bar: 76 },
        { title: "Fat. STK", value: fmtCurrency(agg.stk), icon: DollarSign, bar: 62 },
    ];
    return (_jsxs("div", { ref: rootRef, className: `ft-page ${presenting ? "ft-presenting" : ""}`, children: [_jsxs("div", { ref: contentRef, className: "ft-shell", style: presenting ? { transform: `scale(${scale})`, transformOrigin: "top center" } : undefined, children: [_jsx("header", { className: "ft-hero", children: _jsxs("div", { className: "ft-hero-content", children: [_jsxs("div", { className: "ft-hero-brand", children: [_jsx("div", { className: "ft-hero-mark", children: _jsx(Wallet, { className: "w-4 h-4" }) }), _jsxs("div", { children: [_jsx("h1", { children: "Faturamento" }), _jsxs("p", { children: ["Dashboard gerencial \u2014 ", mesesLabel, " ", agg.ano] })] })] }), !presenting && (_jsxs("div", { className: "ft-actions", children: [_jsxs("div", { className: "ft-toggle", children: [_jsx("button", { className: `ft-btn ${viewMode === "dashboard" ? "ft-active" : ""}`, onClick: () => setViewMode("dashboard"), children: _jsx(LayoutDashboard, { className: "w-3.5 h-3.5" }) }), _jsx("button", { className: `ft-btn ${viewMode === "tabela" ? "ft-active" : ""}`, onClick: () => setViewMode("tabela"), children: _jsx(Table, { className: "w-3.5 h-3.5" }) })] }), _jsxs("button", { className: "ft-btn", onClick: () => setImportOpen(true), children: [_jsx(Upload, { className: "w-3.5 h-3.5" }), " Importar"] }), viewMode === "dashboard" && (_jsxs(_Fragment, { children: [_jsx(MonthFilter, { selectedMeses: selectedMeses, onSelect: setSelectedMeses }), selectedMeses.length === 1 && (_jsx("button", { className: "ft-btn", onClick: () => setEditOpen(true), children: _jsx(Pencil, { className: "w-3.5 h-3.5" }) }))] })), _jsx("button", { className: "ft-btn ft-primary", onClick: startPresentation, children: _jsx(Presentation, { className: "w-3.5 h-3.5" }) })] })), presenting && (_jsxs("div", { className: "ft-actions", children: [_jsx(MonthFilter, { selectedMeses: selectedMeses, onSelect: setSelectedMeses }), _jsx("button", { className: "ft-btn", onClick: exitPresentation, children: _jsx(X, { className: "w-3.5 h-3.5" }) })] }))] }) }), viewMode === "tabela" ? (_jsx(FaturamentoTable, { records: records, onSaved: load })) : (_jsxs(_Fragment, { children: [_jsxs("section", { className: "ft-section", children: [_jsxs("div", { className: "ft-section-head", children: [_jsx("span", { className: "ft-mark", children: _jsx(BarChart3, {}) }), _jsx("h2", { children: "Indicadores" })] }), _jsx("div", { className: "ft-kpis", children: kpiCards.map((k, i) => (_jsxs("div", { className: "ft-kpi", children: [_jsxs("div", { className: "ft-kpi-top", children: [_jsx("span", { children: k.title }), _jsx("span", { className: "ft-kpi-icon", children: _jsx(k.icon, {}) })] }), _jsx("strong", { children: k.value }), _jsx("div", { className: "ft-bar", children: _jsx("i", { style: { "--w": `${k.bar}%` } }) })] }, i))) })] }), _jsxs("div", { className: "ft-main-grid", children: [_jsxs("div", { className: "ft-left-col", children: [_jsxs("section", { className: "ft-section", children: [_jsxs("div", { className: "ft-section-head", children: [_jsx("span", { className: "ft-mark", children: _jsx(BarChart3, {}) }), _jsx("h2", { children: "An\u00E1lise de Faturamento" })] }), _jsxs("div", { className: "ft-analysis", children: [_jsxs("div", { className: "ft-unit", children: [_jsxs("div", { className: "ft-unit-top", children: [_jsx("span", { className: "ft-dot" }), _jsx("strong", { children: "SMART GROUP" })] }), _jsxs("div", { className: "ft-metric", children: [_jsx("span", { children: "Metros" }), _jsx("b", { children: fmtMeters(agg.msg) })] }), _jsxs("div", { className: "ft-metric", children: [_jsx("span", { children: "Valor" }), _jsx("b", { children: fmtCurrency(agg.sg) })] }), _jsxs("div", { className: "ft-metric", children: [_jsx("span", { children: "Pre\u00E7o M\u00E9dio" }), _jsx("b", { children: fmtPrice(agg.precoSG) })] })] }), _jsxs("div", { className: "ft-unit", children: [_jsxs("div", { className: "ft-unit-top", children: [_jsx("span", { className: "ft-dot" }), _jsx("strong", { children: "STK" })] }), _jsxs("div", { className: "ft-metric", children: [_jsx("span", { children: "Metros" }), _jsx("b", { children: fmtMeters(agg.mstk) })] }), _jsxs("div", { className: "ft-metric", children: [_jsx("span", { children: "Valor" }), _jsx("b", { children: fmtCurrency(agg.stk) })] }), _jsxs("div", { className: "ft-metric", children: [_jsx("span", { children: "Pre\u00E7o M\u00E9dio" }), _jsx("b", { children: fmtPrice(agg.precoSTK) })] })] })] })] }), _jsxs("section", { className: "ft-section", children: [_jsxs("div", { className: "ft-section-head", children: [_jsx("span", { className: "ft-mark", children: _jsx(TrendingUp, {}) }), _jsx("h2", { children: "Comparativo" })] }), _jsxs("div", { className: "ft-compare", children: [_jsxs("div", { className: "ft-compare-card", children: [_jsx("label", { children: "2025" }), _jsx("b", { children: fmtCurrency(agg.fat2025) })] }), _jsxs("div", { className: "ft-compare-card", children: [_jsx("label", { children: "2026" }), _jsx("b", { children: fmtCurrency(agg.totalFat) })] }), _jsxs("div", { className: "ft-compare-card", children: [_jsx("label", { children: "Diferen\u00E7a" }), _jsxs("b", { children: [_jsx("span", { className: "ft-sign", children: agg.dif2025Valor >= 0 ? "+" : "−" }), fmtCurrency(Math.abs(agg.dif2025Valor))] })] }), _jsxs("div", { className: "ft-compare-card", children: [_jsx("label", { children: "Varia\u00E7\u00E3o %" }), _jsxs("b", { children: [_jsx("span", { className: "ft-sign", children: agg.dif2025Pct >= 0 ? "+" : "−" }), agg.dif2025Pct.toFixed(2).replace(".", ","), "%"] })] })] })] })] }), _jsxs("section", { className: "ft-section ft-forecast", children: [_jsxs("div", { className: "ft-section-head", children: [_jsx("span", { className: "ft-mark", children: _jsx(Calculator, {}) }), _jsx("h2", { children: "Previs\u00E3o vs Realizado" })] }), _jsxs("div", { className: "ft-badges", children: [_jsxs("div", { className: "ft-badge", children: [agg.difPrevistoValor >= 0 ? _jsx(ArrowUpRight, { className: "w-3.5 h-3.5" }) : _jsx(ArrowDownRight, { className: "w-3.5 h-3.5" }), _jsx("strong", { children: "Dif. Valor" }), agg.difPrevistoValor >= 0 ? "+" : "", fmtCurrency(agg.difPrevistoValor)] }), _jsxs("div", { className: "ft-badge", children: [agg.difPrevistoPct >= 0 ? _jsx(ArrowUpRight, { className: "w-3.5 h-3.5" }) : _jsx(ArrowDownRight, { className: "w-3.5 h-3.5" }), _jsx("strong", { children: "Varia\u00E7\u00E3o %" }), agg.difPrevistoPct >= 0 ? "+" : "", agg.difPrevistoPct.toFixed(2).replace(".", ","), "%"] }), _jsxs("div", { className: "ft-badge", children: [agg.difMetrosValor >= 0 ? _jsx(ArrowUpRight, { className: "w-3.5 h-3.5" }) : _jsx(ArrowDownRight, { className: "w-3.5 h-3.5" }), _jsx("strong", { children: "Dif. Metros" }), agg.difMetrosValor >= 0 ? "+" : "", fmtMeters(agg.difMetrosValor)] }), _jsxs("div", { className: "ft-badge", children: [agg.difMetrosPct >= 0 ? _jsx(ArrowUpRight, { className: "w-3.5 h-3.5" }) : _jsx(ArrowDownRight, { className: "w-3.5 h-3.5" }), _jsx("strong", { children: "Var. Metros %" }), agg.difMetrosPct >= 0 ? "+" : "", agg.difMetrosPct.toFixed(2).replace(".", ","), "%"] })] }), _jsxs("div", { className: "ft-stackcols", children: [_jsxs("div", { className: "ft-stackcol", children: [_jsx("h3", { children: "Previs\u00E3o" }), _jsx("p", { children: "Or\u00E7ado 2026" }), _jsxs("div", { className: "ft-stackcards", children: [_jsxs("div", { className: "ft-stackcard ft-sc-blue", children: [_jsx("span", { className: "ft-sc-icon", children: _jsx(DollarSign, { className: "w-3.5 h-3.5" }) }), _jsxs("div", { className: "ft-sc-body", children: [_jsx("p", { children: "Pre\u00E7o M\u00E9dio" }), _jsx("b", { children: fmtPrice(agg.preco_medio_orcado) })] })] }), _jsxs("div", { className: "ft-stackcard ft-sc-indigo", children: [_jsx("span", { className: "ft-sc-icon", children: _jsx(Ruler, { className: "w-3.5 h-3.5" }) }), _jsxs("div", { className: "ft-sc-body", children: [_jsx("p", { children: "Metros" }), _jsx("b", { children: fmtMeters(agg.metrosOrcado) })] })] }), _jsxs("div", { className: "ft-stackcard ft-sc-violet", children: [_jsx("span", { className: "ft-sc-icon", children: _jsx(Wallet, { className: "w-3.5 h-3.5" }) }), _jsxs("div", { className: "ft-sc-body", children: [_jsx("p", { children: "Valor Total" }), _jsx("b", { children: fmtCurrency(agg.previsto) })] })] })] })] }), _jsxs("div", { className: "ft-stackcol", children: [_jsx("h3", { children: "Realizado" }), _jsx("p", { children: "2026" }), _jsxs("div", { className: "ft-stackcards", children: [_jsxs("div", { className: "ft-stackcard ft-sc-amber", children: [_jsx("span", { className: "ft-sc-icon", children: _jsx(DollarSign, { className: "w-3.5 h-3.5" }) }), _jsxs("div", { className: "ft-sc-body", children: [_jsx("p", { children: "Pre\u00E7o M\u00E9dio" }), _jsx("b", { children: fmtPrice(agg.preco_medio_realizado) })] })] }), _jsxs("div", { className: "ft-stackcard ft-sc-orange", children: [_jsx("span", { className: "ft-sc-icon", children: _jsx(Ruler, { className: "w-3.5 h-3.5" }) }), _jsxs("div", { className: "ft-sc-body", children: [_jsx("p", { children: "Metros" }), _jsx("b", { children: fmtMeters(agg.totalMetros) })] })] }), _jsxs("div", { className: "ft-stackcard ft-sc-red", children: [_jsx("span", { className: "ft-sc-icon", children: _jsx(Wallet, { className: "w-3.5 h-3.5" }) }), _jsxs("div", { className: "ft-sc-body", children: [_jsx("p", { children: "Valor Total" }), _jsx("b", { children: fmtCurrency(agg.totalFat) })] })] })] })] })] })] })] })] }))] }), selectedMeses.length === 1 && (_jsx(EditFaturamentoDialog, { open: editOpen, onOpenChange: setEditOpen, record: selectedRecords[0], onSaved: load })), _jsx(ImportFaturamentoDialog, { open: importOpen, onOpenChange: setImportOpen, onImported: load })] }));
}
