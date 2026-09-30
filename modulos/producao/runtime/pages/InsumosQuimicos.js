import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { UploadCloud, FlaskConical, Loader2, DollarSign, ArrowRight, TrendingUp, Package, Hash, Boxes } from "lucide-react";
import InsumosCompactCard from "@/components/insumos/InsumosCompactCard";
import ImportInsumosDialog from "@/components/insumos/ImportInsumosDialog";
import InsumosReport from "@/components/insumos/InsumosReport";
import InsumosCombinedFilter from "@/components/insumos/InsumosCombinedFilter";
import { toast } from "@/components/ui/use-toast";
import { LayoutGrid, BarChart3, Table2, Rows3, PanelTop, Columns3, SquareStack, Target, Grid3x3, FileText, Droplets } from "lucide-react";
import InsumosDistintosDialog from "@/components/insumos/InsumosDistintosDialog";
import ConsumoReport from "@/components/insumos/ConsumoReport";

const LAYOUTS = [
    { id: "branco-linha", label: "Branco Linha", icon: Columns3 },
    { id: "consumo", label: "Consumo", icon: Droplets },
];
const WHITE_LAYOUTS = new Set(["branco-painel", "branco-linha", "branco-stack", "branco-foco", "consumo"]);
export default function InsumosQuimicos() {
    const [records, setRecords] = useState([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedDays, setSelectedDaysState] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("insumos_selected_days") || "[]");
        }
        catch {
            return [];
        }
    });
    const [importOpen, setImportOpen] = useState(false);
    const [distintosOpen, setDistintosOpen] = useState(false);
    const [opFilter, setOpFilter] = useState("");
    const [layout, setLayout] = useState(() => {
        const saved = localStorage.getItem("insumos_layout");
        const valid = ["branco-linha", "consumo"];
        return valid.includes(saved) ? saved : "branco-linha";
    });
    const setSelectedDays = (days) => { setSelectedDaysState(days); try {
        localStorage.setItem("insumos_selected_days", JSON.stringify(days));
    }
    catch { } };
    const switchLayout = (l) => { setLayout(l); localStorage.setItem("insumos_layout", l); };
    const handleParsed = async (parsed) => {
        setSaving(true);
        try {
            if (parsed.length > 0) {
                const dates = [...new Set(parsed.map((r) => r.data).filter(Boolean))];
                for (const d of dates) {
                    await db.entities.InsumosQuimicos.deleteMany({ data: d });
                }
                await db.entities.InsumosQuimicos.bulkCreate(parsed);
            }
            await load();
            toast({ title: `${parsed.length} registro(s) salvo(s) no banco.` });
            setImportOpen(false);
        }
        catch (e) {
            console.error(e);
            toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
        }
        finally {
            setSaving(false);
        }
    };
    const load = async () => {
        try {
            setLoading(true);
            const data = await db.entities.InsumosQuimicos.list("-created_date", 2000);
            setRecords(data);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);
    const filtered = useMemo(() => {
        const isAnotacao = (s) => {
            const n = String(s ?? '').toLowerCase()
                .replace(/[áàâã]/g, 'a').replace(/[éèê]/g, 'e').replace(/[íìî]/g, 'i')
                .replace(/[óòôõ]/g, 'o').replace(/[úùû]/g, 'u').replace(/ç/g, 'c')
                .replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
            return n.includes('nro ordem prod') || n.includes('nro ordem') || n.includes('inclui');
        };
        const clean = records.filter((r) => !isAnotacao(r.num_op) && !isAnotacao(r.descricao_produto) && !isAnotacao(r.descricao_insumo));
        const tokens = opFilter.trim() ? opFilter.split(/[\n\r,;\t]+/).map((t) => t.trim().toLowerCase()).filter(Boolean) : [];
        if (tokens.length > 0) {
            return clean.filter((r) => {
                const op = String(r.num_op || "").toLowerCase();
                return tokens.some((t) => op.includes(t));
            });
        }
        if (selectedDays.length === 0)
            return clean;
        return clean.filter((r) => r.data && selectedDays.includes(r.data));
    }, [records, selectedDays, opFilter]);
    const totals = useMemo(() => filtered.reduce((acc, r) => ({
        valor_previsto: acc.valor_previsto + (r.valor_previsto || 0),
        valor_realizado: acc.valor_realizado + (r.valor_realizado || 0),
        qtde_prevista: acc.qtde_prevista + (r.qtde_prevista || 0),
        qtde_realizada: acc.qtde_realizada + (r.qtde_realizada || 0),
    }), { valor_previsto: 0, valor_realizado: 0, qtde_prevista: 0, qtde_realizada: 0 }), [filtered]);
    const difValor = totals.valor_realizado - totals.valor_previsto;
    const difValorPct = totals.valor_previsto ? (difValor / totals.valor_previsto) * 100 : 0;
    const difKg = totals.qtde_realizada - totals.qtde_prevista;
    const difKgPct = totals.qtde_prevista ? (difKg / totals.qtde_prevista) * 100 : 0;
    const numOPs = useMemo(() => new Set(filtered.map((r) => r.num_op).filter(Boolean)).size, [filtered]);
    const numInsumos = useMemo(() => new Set(filtered.map((r) => r.descricao_insumo).filter(Boolean)).size, [filtered]);
    const custoMedioOP = numOPs ? totals.valor_realizado / numOPs : 0;
    const consumoMedioOP = numOPs ? totals.qtde_realizada / numOPs : 0;
    // Layout flags
    const isDensa = layout === "grade-densa";
    const isCobalt = layout === "indicadores";
    const isWhite = WHITE_LAYOUTS.has(layout);
    const showValores = ["completo", "indicadores", "branco-painel", "branco-linha", "branco-stack"].includes(layout);
    const showKG = ["completo", "indicadores", "branco-painel", "branco-linha", "branco-stack"].includes(layout);
    const showWhite = ["completo", "indicadores", "compacto", "branco-painel", "branco-linha", "branco-stack", "branco-foco"].includes(layout);
    const showMetrics = showValores || showKG || showWhite;
    const showReport = ["completo", "relatorio", "compacto", "branco-painel", "branco-linha", "branco-stack", "branco-foco", "grade-densa"].includes(layout);
    const twoColumn = ["completo", "compacto", "branco-painel"].includes(layout);
    const threeColMetrics = layout === "branco-linha";
    const stackedFull = ["branco-stack", "branco-foco"].includes(layout);
    // Densa: all 12 cards in a single 6-col grid
    const densaCards = useMemo(() => isDensa ? [
        { label: "Valor Previsto", value: totals.valor_previsto, type: "currency" },
        { label: "Valor Realizado", value: totals.valor_realizado, type: "currency" },
        { label: "Dif. Valor", value: difValor, type: "difference" },
        { label: "Dif. %", value: difValorPct, type: "percentage" },
        { label: "KG Previsto", value: totals.qtde_prevista, type: "number" },
        { label: "KG Realizado", value: totals.qtde_realizada, type: "number" },
        { label: "Dif. KG", value: difKg, type: "difference" },
        { label: "Dif. %", value: difKgPct, type: "percentage" },
        { label: "Nº OPs", value: numOPs, type: "integer" },
        { label: "Insumos Distintos", value: numInsumos, type: "integer", actionIcon: FileText, onAction: () => setDistintosOpen(true) },
        { label: "Custo Médio/OP", value: custoMedioOP, type: "currency" },
        { label: "Consumo Médio/OP", value: consumoMedioOP, type: "number" },
    ] : [], [isDensa, totals, difValor, difValorPct, difKg, difKgPct, numOPs, numInsumos, custoMedioOP, consumoMedioOP]);
    // Styling
    const pageBgCls = isDensa ? "bg-[#eff6ff]" : isWhite ? "bg-white" : "bg-slate-100";
    const topbarCls = isDensa
        ? "bg-white/88 border-blue-200 backdrop-blur-[14px]"
        : isWhite ? "bg-white border-slate-200"
            : "bg-white/76 border-slate-300 backdrop-blur-[12px]";
    const markCls = isDensa ? "bg-blue-600 shadow-[0_5px_12px_rgba(37,99,235,0.28)]" : "bg-slate-700 shadow-md";
    const brandTextCls = isDensa ? "text-blue-800" : "text-slate-800";
    const toggleCls = isDensa ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-300";
    const btnActive = isDensa ? "bg-blue-600 text-white shadow-sm" : "bg-slate-700 text-white shadow-sm";
    const btnInactive = isDensa ? "text-blue-800 hover:bg-blue-100" : "text-slate-600 hover:bg-slate-200";
    const importCls = isDensa ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-700 text-white hover:bg-slate-800";
    const filterTrigger = isDensa ? "bg-white border-blue-200" : "bg-white border-slate-300";
    const heroStyle = isDensa
        ? { background: "linear-gradient(112deg, #1e40af, #2563eb 58%, #3b82f6)", animation: "insumos-rise 0.62s 0.06s both" }
        : isWhite
            ? { background: "linear-gradient(110deg, #ffffff, #f1f5f9)", border: "1px solid #e2e8f0", animation: "insumos-rise 0.7s 0.08s both" }
            : { background: "linear-gradient(110deg, #334155, #475569)", animation: "insumos-rise 0.7s 0.08s both" };
    const heroTitleCls = isDensa ? "text-white" : isWhite ? "text-slate-800" : "text-white";
    const heroSubCls = isDensa ? "text-blue-100" : isWhite ? "text-slate-500" : "text-slate-300";
    const heroMetaCls = isDensa ? "text-blue-100" : isWhite ? "text-slate-500" : "text-slate-200";
    const sectionCls = isDensa
        ? "bg-white/70 border border-blue-200 rounded-[15px] p-4 shadow-sm backdrop-blur-[12px]"
        : isWhite
            ? "bg-white border border-slate-200 rounded-[14px] p-4 shadow-sm"
            : "bg-white/68 border border-slate-300 rounded-[14px] p-4 shadow-sm backdrop-blur-[10px]";
    const sectionTitleCls = isDensa ? "text-blue-800" : "text-slate-700";
    const sectionBarCls = isDensa ? "bg-blue-600" : "bg-slate-500";
    const whiteBarCls = isDensa ? "bg-blue-600" : "bg-slate-400";
    const cardGridCls = threeColMetrics ? "grid grid-cols-2 gap-2.5" : isDensa ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-[9px]" : "grid grid-cols-2 sm:grid-cols-4 gap-2.5";
    const emptyCls = isDensa ? "bg-white border-blue-200" : isWhite ? "bg-white border-slate-200" : "bg-white/68 border-slate-300";
    // Sections as variables for flexible arrangement
    const valoresSection = showValores && (_jsxs("section", { className: sectionCls, children: [_jsxs("h2", { className: `flex items-center gap-2.5 mb-3 text-xs tracking-[0.11em] uppercase font-bold ${sectionTitleCls}`, children: [_jsx("span", { className: `w-1 h-[18px] rounded-[3px] ${sectionBarCls}` }), "Valores"] }), _jsxs("div", { className: cardGridCls, children: [_jsx(InsumosCompactCard, { label: "Valor Previsto", value: totals.valor_previsto, type: "currency", delay: 0 }), _jsx(InsumosCompactCard, { label: "Valor Realizado", value: totals.valor_realizado, type: "currency", delay: 0.06 }), _jsx(InsumosCompactCard, { label: "Dif. Valor", value: difValor, type: "difference", delay: 0.12 }), _jsx(InsumosCompactCard, { label: "Dif. %", value: difValorPct, type: "percentage", delay: 0.18 })] })] }));
    const kgSection = showKG && (_jsxs("section", { className: sectionCls, children: [_jsxs("h2", { className: `flex items-center gap-2.5 mb-3 text-xs tracking-[0.11em] uppercase font-bold ${sectionTitleCls}`, children: [_jsx("span", { className: `w-1 h-[18px] rounded-[3px] ${sectionBarCls}` }), "Consumo em KG"] }), _jsxs("div", { className: cardGridCls, children: [_jsx(InsumosCompactCard, { label: "KG Previsto", value: totals.qtde_prevista, type: "number", delay: 0 }), _jsx(InsumosCompactCard, { label: "KG Realizado", value: totals.qtde_realizada, type: "number", delay: 0.06 }), _jsx(InsumosCompactCard, { label: "Dif. KG", value: difKg, type: "difference", delay: 0.12 }), _jsx(InsumosCompactCard, { label: "Dif. %", value: difKgPct, type: "percentage", delay: 0.18 })] })] }));
    const whiteSection = showWhite && (_jsxs("section", { className: sectionCls, children: [_jsxs("h2", { className: `flex items-center gap-2.5 mb-3 text-xs tracking-[0.11em] uppercase font-bold ${sectionTitleCls}`, children: [_jsx("span", { className: `w-1 h-[18px] rounded-[3px] ${whiteBarCls}` }), "Indicadores Operacionais"] }), _jsxs("div", { className: cardGridCls, children: [_jsx(InsumosCompactCard, { label: "N\u00BA OPs", value: numOPs, type: "integer", delay: 0, white: true }), _jsx(InsumosCompactCard, { label: "Insumos Distintos", value: numInsumos, type: "integer", delay: 0.06, white: true, actionIcon: FileText, onAction: () => setDistintosOpen(true) }), _jsx(InsumosCompactCard, { label: "Custo M\u00E9dio/OP", value: custoMedioOP, type: "currency", delay: 0.12, white: true }), _jsx(InsumosCompactCard, { label: "Consumo M\u00E9dio/OP", value: consumoMedioOP, type: "number", delay: 0.18, white: true })] })] }));
    const reportEl = showReport && _jsx(InsumosReport, { records: filtered, variant: isDensa ? "densa" : "default", opFilter: opFilter, onOpFilterChange: setOpFilter });
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-[60vh] bg-slate-100", children: _jsx("div", { className: "w-8 h-8 border-4 border-slate-200 border-t-slate-700 rounded-full animate-spin" }) }));
    }
    if (isCobalt) {
        return (_jsxs("div", { className: "bc-page", children: [_jsx("div", { className: "relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6", children: _jsxs("div", { className: "bc-shell", children: [_jsxs("header", { className: "bc-topbar", children: [_jsxs("div", { className: "bc-brand", children: [_jsx("div", { className: "bc-mark", children: _jsx(FlaskConical, { className: "w-[22px] h-[22px]" }) }), _jsx("strong", { children: "INSUMOS-QU\u00CDMICOS" })] }), _jsxs("div", { className: "bc-actions", children: [_jsx("div", { className: "bc-layouts", children: LAYOUTS.map((l) => (_jsxs("button", { className: `bc-btn ${layout === l.id ? "active" : ""}`, onClick: () => switchLayout(l.id), title: l.label, children: [_jsx(l.icon, { className: "w-[15px] h-[15px]" }), _jsx("span", { className: "hidden sm:inline", children: l.label })] }, l.id))) }), _jsx(InsumosCombinedFilter, { selectedDays: selectedDays, onSelect: setSelectedDays, triggerClassName: "bc-filter" }), _jsxs(Button, { variant: "default", size: "sm", className: "bc-import h-[36px] gap-1.5 rounded-lg px-3", onClick: () => setImportOpen(true), children: [saving ? _jsx(Loader2, { className: "w-4 h-4 animate-spin" }) : _jsx(UploadCloud, { className: "w-4 h-4" }), " Importa\u00E7\u00E3o"] })] })] }), filtered.length === 0 ? (_jsxs("div", { className: "bc-empty", children: [_jsx(FlaskConical, { className: "w-12 h-12 mx-auto mb-3" }), _jsx("p", { className: "font-bold", children: selectedDays.length > 0 ? "Nenhum dado encontrado para o período selecionado." : "Nenhum dado de insumos químicos importado." }), _jsx("p", { children: "Clique em \"Importa\u00E7\u00E3o\" para carregar a planilha." })] })) : (_jsxs("main", { className: "bc-main", children: [_jsxs("div", { className: "bc-column", children: [_jsxs("section", { className: "bc-section", children: [_jsx("h2", { className: "bc-section-head", children: "Valores" }), _jsxs("div", { className: "bc-cards", children: [_jsx(InsumosCompactCard, { label: "Previsto", value: totals.valor_previsto, type: "currency", delay: 0, variant: "cobalt" }), _jsx(InsumosCompactCard, { label: "Realizado", value: totals.valor_realizado, type: "currency", delay: 0.06, variant: "cobalt" }), _jsx(InsumosCompactCard, { label: "Dif. Valor", value: difValor, type: "difference", delay: 0.12, variant: "cobalt" }), _jsx(InsumosCompactCard, { label: "Dif. %", value: difValorPct, type: "percentage", delay: 0.18, variant: "cobalt" })] })] }), _jsxs("section", { className: "bc-section", children: [_jsx("h2", { className: "bc-section-head", children: "Consumo em KG" }), _jsxs("div", { className: "bc-cards", children: [_jsx(InsumosCompactCard, { label: "Previsto", value: totals.qtde_prevista, type: "number", delay: 0, variant: "cobalt" }), _jsx(InsumosCompactCard, { label: "Realizado", value: totals.qtde_realizada, type: "number", delay: 0.06, variant: "cobalt" }), _jsx(InsumosCompactCard, { label: "Dif. KG", value: difKg, type: "difference", delay: 0.12, variant: "cobalt" }), _jsx(InsumosCompactCard, { label: "Dif. %", value: difKgPct, type: "percentage", delay: 0.18, variant: "cobalt" })] })] }), _jsxs("section", { className: "bc-section", children: [_jsx("h2", { className: "bc-section-head", children: "Indicadores Operacionais" }), _jsxs("div", { className: "bc-cards", children: [_jsx(InsumosCompactCard, { label: "N\u00BA OPs", value: numOPs, type: "integer", delay: 0, variant: "cobalt" }), _jsx(InsumosCompactCard, { label: "Insumos Distintos", value: numInsumos, type: "integer", delay: 0.06, variant: "cobalt", actionIcon: FileText, onAction: () => setDistintosOpen(true) }), _jsx(InsumosCompactCard, { label: "Custo M\u00E9dio/OP", value: custoMedioOP, type: "currency", delay: 0.12, variant: "cobalt" }), _jsx(InsumosCompactCard, { label: "Consumo M\u00E9dio/OP", value: consumoMedioOP, type: "number", delay: 0.18, variant: "cobalt" })] })] })] }), _jsx(InsumosReport, { records: filtered, variant: "cobalt", opFilter: opFilter, onOpFilterChange: setOpFilter })] }))] }) }), _jsx(ImportInsumosDialog, { open: importOpen, onOpenChange: setImportOpen, onParsed: handleParsed }), _jsx(InsumosDistintosDialog, { open: distintosOpen, onOpenChange: setDistintosOpen, records: filtered })] }));
    }
    return (_jsxs("div", { className: `min-h-screen relative overflow-hidden ${pageBgCls}`, children: [!isWhite && (_jsx("div", { className: "absolute inset-0 pointer-events-none", style: isDensa
                    ? { background: "radial-gradient(circle at 92% 2%, rgba(147,197,253,.42), transparent 30%), linear-gradient(145deg, #eff6ff 0%, #dbeafe 48%, #eff6ff 100%)" }
                    : { background: "radial-gradient(circle at 88% 5%, rgba(148,163,184,.2), transparent 28%), linear-gradient(135deg, rgba(255,255,255,.72), transparent 55%)" } })), _jsx("div", { className: "relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6", children: _jsxs("div", { className: "insumos-shell flex flex-col gap-5", style: { animation: `insumos-enter ${isDensa ? 0.58 : 0.65}s cubic-bezier(.2,.75,.25,1) both` }, children: [_jsxs("header", { className: `flex items-center justify-between gap-5 px-5 py-[18px] border rounded-[14px] shadow-sm ${topbarCls}`, style: isDensa ? { animation: "insumos-rise 0.5s both" } : undefined, children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: `w-[38px] h-[38px] rounded-[10px] text-white grid place-items-center ${markCls}`, children: _jsx(FlaskConical, { className: "w-[18px] h-[18px]" }) }), _jsx("strong", { className: `text-[18px] tracking-[0.08em] font-extrabold ${brandTextCls}`, children: "INSUMOS-QU\u00CDMICOS" })] }), _jsxs("div", { className: "flex items-center gap-2 flex-wrap justify-end", children: [_jsx("div", { className: `flex gap-[3px] p-[3px] border rounded-[10px] flex-wrap ${toggleCls}`, children: LAYOUTS.map((l) => (_jsxs("button", { className: `densa-btn h-[34px] rounded-lg px-3 text-xs font-bold transition-all ${layout === l.id ? btnActive : btnInactive}`, onClick: () => switchLayout(l.id), title: l.label, children: [_jsx(l.icon, { className: "w-3.5 h-3.5 inline sm:mr-1" }), _jsx("span", { className: "hidden sm:inline", children: l.label })] }, l.id))) }), _jsx(InsumosCombinedFilter, { selectedDays: selectedDays, onSelect: setSelectedDays, triggerClassName: filterTrigger }), _jsxs(Button, { variant: "default", size: "sm", className: `h-[34px] gap-1.5 rounded-lg px-3 ${importCls}`, onClick: () => setImportOpen(true), children: [saving ? _jsx(Loader2, { className: "w-4 h-4 animate-spin" }) : _jsx(UploadCloud, { className: "w-4 h-4" }), " Importa\u00E7\u00E3o"] })] })] }), filtered.length === 0 ? (_jsxs("div", { className: `text-center py-20 border rounded-[14px] ${emptyCls}`, children: [_jsx(FlaskConical, { className: "w-12 h-12 text-slate-400 mx-auto mb-3" }), _jsx("p", { className: "text-slate-600 font-medium", children: selectedDays.length > 0 ? "Nenhum dado encontrado para o período selecionado." : "Nenhum dado de insumos químicos importado." }), _jsx("p", { className: "text-slate-500 text-sm mt-1", children: "Clique em \"Importa\u00E7\u00E3o\" para carregar a planilha." })] })) : layout === "consumo" ? (_jsx(ConsumoReport, { records: filtered })) : isDensa ? (_jsxs("div", { className: "flex flex-col gap-5", children: [_jsxs("section", { className: sectionCls, style: { animation: "insumos-grid-in 0.55s 0.16s both" }, children: [_jsxs("h2", { className: `flex items-center gap-2 mb-3 text-xs uppercase tracking-[0.1em] font-bold ${sectionTitleCls}`, children: [_jsx("span", { className: `w-1 h-4 rounded-[3px] ${sectionBarCls}` }), "Indicadores"] }), _jsx("div", { className: cardGridCls, children: densaCards.map((c) => (_jsx(InsumosCompactCard, { label: c.label, value: c.value, type: c.type, delay: 0.16, variant: "densa", actionIcon: c.actionIcon, onAction: c.onAction }, c.label))) })] }), reportEl] })) : twoColumn ? (_jsxs("div", { className: "grid lg:grid-cols-2 gap-5 items-stretch", children: [_jsxs("div", { className: "flex flex-col gap-[18px] min-w-0", children: [valoresSection, kgSection, whiteSection] }), _jsx("div", { className: "min-w-0 self-stretch", children: reportEl })] })) : threeColMetrics ? (_jsxs("div", { className: "flex flex-col gap-5", children: [_jsxs("div", { className: "grid lg:grid-cols-3 gap-5", children: [valoresSection, kgSection, whiteSection] }), reportEl] })) : stackedFull ? (_jsxs("div", { className: "flex flex-col gap-5", children: [valoresSection, kgSection, whiteSection, reportEl] })) : (_jsxs("div", { className: "flex flex-col gap-[18px]", children: [showMetrics && (_jsxs("div", { className: "flex flex-col gap-[18px] min-w-0", children: [valoresSection, kgSection, whiteSection] })), reportEl] }))] }) }), _jsx(ImportInsumosDialog, { open: importOpen, onOpenChange: setImportOpen, onParsed: handleParsed }), _jsx(InsumosDistintosDialog, { open: distintosOpen, onOpenChange: setDistintosOpen, records: filtered })] }));
}
