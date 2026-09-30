import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect, useMemo } from "react";
import { Bug, UploadCloud, Hash, Ruler, AlertTriangle, Percent, ChevronRight, Trophy, Printer, FileText } from "lucide-react";
import { fmtMeters } from "@/lib/format";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import DayFilter from "@/components/desempenho/DayFilter";
import ImportDefeitosDialog from "@/components/defeitos/ImportDefeitosDialog";
import RankingDefeitosDialog from "@/components/defeitos/RankingDefeitosDialog";
import RelatorioProdutoDefeitoDialog from "@/components/defeitos/RelatorioProdutoDefeitoDialog";
const HERO_IMG = "./assets/producao-bg.svg";
function todayIso() {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}
function pct(def, total) {
    if (!total)
        return 0;
    return (def / total) * 100;
}
export default function DefeitosProducao() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [importOpen, setImportOpen] = useState(false);
    const [rankingOpen, setRankingOpen] = useState(false);
    const [relatorioOpen, setRelatorioOpen] = useState(false);
    const [selectedDays, setSelectedDays] = useState(() => {
        try {
            const saved = localStorage.getItem("defeitos_selectedDays");
            return saved ? JSON.parse(saved) : [todayIso()];
        }
        catch {
            return [todayIso()];
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem("defeitos_selectedDays", JSON.stringify(selectedDays));
        }
        catch { }
    }, [selectedDays]);
    const load = async () => {
        try {
            setLoading(true);
            const data = await db.entities.DefeitoProducao.list("-data", 5000);
            setRecords(data);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        load();
    }, []);
    const filtered = useMemo(() => {
        if (selectedDays.length === 0)
            return records;
        return records.filter((r) => r.data && selectedDays.includes(r.data));
    }, [records, selectedDays]);
    // Consolida por OP: uma linha por OP, somando a metragem (coluna K / Qtd.aprovada)
    const byOp = useMemo(() => {
        const map = {};
        filtered.forEach((r) => {
            if (!map[r.op]) {
                map[r.op] = {
                    op: r.op,
                    produto: r.produto || "",
                    descricao: r.descricao || "",
                    defeitos: {},
                    metros_defeito: 0,
                    metragem: 0,
                    qtd_op: 0,
                    qtd_refug: 0,
                    count: 0,
                };
            }
            const e = map[r.op];
            e.count += 1;
            e.metragem += r.metragem || 0;
            e.metros_defeito += r.metros_defeito || 0;
            if (!e.produto && r.produto)
                e.produto = r.produto;
            if (!e.descricao && r.descricao)
                e.descricao = r.descricao;
            if (r.defeito)
                e.defeitos[r.defeito] = (e.defeitos[r.defeito] || 0) + (r.metros_defeito || 0);
            if (!e.qtd_op && r.qtd_op)
                e.qtd_op = r.qtd_op;
            if (!e.qtd_refug && r.qtd_refug)
                e.qtd_refug = r.qtd_refug;
        });
        return Object.values(map)
            .map((e) => ({
            ...e,
            defeitosLista: Object.entries(e.defeitos).map(([texto, metros]) => ({ texto, metros })),
        }))
            .sort((a, b) => String(a.op).localeCompare(String(b.op)));
    }, [filtered]);
    const totals = useMemo(() => {
        const totalMetragem = byOp.reduce((s, r) => s + r.metragem, 0);
        const totalDefeitos = byOp.reduce((s, r) => s + r.qtd_refug, 0);
        const totalOp = byOp.reduce((s, r) => s + r.qtd_op, 0);
        return {
            ops: byOp.length,
            metragem: totalMetragem,
            defeitos: totalDefeitos,
            pct: pct(totalDefeitos, totalOp),
        };
    }, [byOp]);
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-[60vh]", children: _jsx("div", { className: "w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" }) }));
    }
    const KPIS = [
        { label: "Nº de OPs", value: totals.ops.toLocaleString("pt-BR"), icon: Hash },
        { label: "Total Produzido", value: fmtMeters(totals.metragem), icon: Ruler },
        { label: "Total Defeitos", value: fmtMeters(totals.defeitos), icon: AlertTriangle },
        { label: "% Defeitos", value: `${totals.pct.toFixed(1)}%`, icon: Percent },
    ];
    return (_jsxs("div", { className: "df-dashboard", children: [_jsxs("section", { className: "df-hero", children: [_jsx("img", { src: HERO_IMG, alt: "", className: "df-hero-img" }), _jsxs("div", { className: "df-hero-content", children: [_jsxs("div", { className: "df-hero-title", children: [_jsx("div", { className: "df-hero-icon", children: _jsx(Bug, { className: "w-5 h-5" }) }), _jsxs("div", { children: [_jsx("h1", { children: "Defeitos de Produ\u00E7\u00E3o" }), _jsx("p", { children: "Acompanhamento de refugos por OP" })] })] }), _jsxs("div", { className: "df-actions", children: [_jsx(DayFilter, { selectedDays: selectedDays, onSelect: setSelectedDays, triggerClassName: "df-dayfilter" }), selectedDays.length > 0 && (_jsx("button", { className: "df-action", onClick: () => setSelectedDays([]), children: "Limpar data" })), _jsxs("button", { className: "df-action teal", onClick: () => setImportOpen(true), children: [_jsx(UploadCloud, { className: "w-4 h-4" }), " Importar"] }), _jsxs("button", { className: "df-action cyan", onClick: () => setRankingOpen(true), children: [_jsx(Trophy, { className: "w-4 h-4" }), " Ranking"] }), _jsxs("button", { className: "df-action dark", onClick: () => setRelatorioOpen(true), children: [_jsx(FileText, { className: "w-4 h-4" }), " Relat\u00F3rio"] })] })] })] }), byOp.length === 0 ? (_jsxs("div", { className: "df-empty", children: [_jsx(Bug, { className: "w-12 h-12 text-amber-500 mx-auto mb-3" }), _jsx("p", { className: "text-slate-600 font-medium", children: "Nenhum defeito encontrado para o per\u00EDodo selecionado." }), _jsx("p", { className: "text-slate-500 text-sm mt-1", children: "Clique em \"Importar\" para carregar o relat\u00F3rio." })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "df-kpis", children: KPIS.map((k) => (_jsxs("article", { className: "df-kpi", children: [_jsxs("div", { className: "df-kpi-top", children: [_jsx("span", { className: "df-kpi-mark", children: _jsx(k.icon, { className: "w-4 h-4" }) }), _jsx("span", { children: k.label })] }), _jsx("div", { className: "df-kpi-value", children: k.value })] }, k.label))) }), _jsx(DefeitosTable, { rows: byOp, selectedDays: selectedDays })] })), _jsx(ImportDefeitosDialog, { open: importOpen, onOpenChange: setImportOpen, onImported: load }), _jsx(RankingDefeitosDialog, { open: rankingOpen, onOpenChange: setRankingOpen, records: records }), _jsx(RelatorioProdutoDefeitoDialog, { open: relatorioOpen, onOpenChange: setRelatorioOpen, records: filtered, selectedDays: selectedDays })] }));
}
function DefeitosTable({ rows, selectedDays }) {
    const handlePrint = () => {
        document.body.classList.add("printing-defeitos");
        window.print();
        setTimeout(() => document.body.classList.remove("printing-defeitos"), 500);
    };
    const diasTexto = selectedDays && selectedDays.length > 0
        ? selectedDays.map((d) => d.split("-").reverse().join("/")).join(", ")
        : "Todos";
    return (_jsxs("div", { className: "df-table-card defeitos-root", children: [_jsxs("div", { className: "df-table-head", children: [_jsx("span", { className: "df-warning", children: _jsx(AlertTriangle, { className: "w-4 h-4" }) }), _jsx("h2", { children: "Defeitos do Dia" }), _jsxs("span", { className: "df-count", children: [rows.length, " OP(s)"] }), _jsxs("button", { className: "df-print print-hide", onClick: handlePrint, children: [_jsx(Printer, { className: "w-4 h-4" }), " Imprimir"] })] }), _jsx("p", { className: "print-only hidden text-center font-extrabold text-[#0a2540] text-lg mb-1", children: "Defeitos do Dia" }), _jsx("p", { className: "print-only hidden text-center text-sm text-gray-700 mb-2", children: diasTexto }), _jsx("div", { className: "df-table-wrap", children: _jsxs("table", { className: "df-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "OP" }), _jsx("th", { children: "Produto" }), _jsx("th", { children: "Descri\u00E7\u00E3o" }), _jsx("th", { children: "Defeito" }), _jsx("th", { children: "Metros de Defeito" }), _jsx("th", { children: "Metragem" }), _jsx("th", { children: "Qtd.OP" }), _jsx("th", { children: "% Def." })] }) }), _jsx("tbody", { children: rows.map((r) => {
                                const p = pct(r.qtd_refug, r.qtd_op);
                                return (_jsxs("tr", { children: [_jsx("td", { className: "df-op", children: r.op }), _jsx("td", { className: "whitespace-nowrap", children: r.produto || "—" }), _jsx("td", { className: "truncate df-desc", title: r.descricao, children: r.descricao || "—" }), _jsx("td", { className: "defeito-print", children: _jsx(DefeitoCell, { defeitos: r.defeitosLista }) }), _jsx("td", { className: "df-num df-rose", children: r.metros_defeito ? fmtMeters(r.metros_defeito) : "—" }), _jsx("td", { className: "df-num df-blue", children: fmtMeters(r.metragem) }), _jsx("td", { className: "df-num df-blue", children: fmtMeters(r.qtd_op) }), _jsxs("td", { className: `df-num ${p > 5 ? "df-rose" : p > 2 ? "df-amber" : "df-green"}`, children: [p.toFixed(1), "%"] })] }, r.op));
                            }) })] }) })] }));
}
function DefeitoCell({ defeitos }) {
    if (!defeitos || defeitos.length === 0) {
        return _jsx("span", { className: "text-slate-400", children: "\u2014" });
    }
    const multiple = defeitos.length > 1;
    const summary = multiple ? `${defeitos.length} defeitos` : defeitos[0].texto;
    return (_jsxs(Popover, { children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs("button", { className: "df-defect-count", children: [_jsx("span", { className: "truncate", children: summary }), _jsx(ChevronRight, { className: "w-3 h-3 shrink-0" })] }) }), _jsxs(PopoverContent, { className: "w-80 p-0 border-0 shadow-2xl rounded-2xl overflow-hidden", align: "start", children: [_jsx("div", { className: "relative px-4 py-3 bg-gradient-to-r from-[#0a2540] to-[#0e3a5e] text-white", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "w-7 h-7 rounded-lg bg-white/15 grid place-items-center", children: _jsx(AlertTriangle, { className: "w-3.5 h-3.5" }) }), _jsxs("div", { children: [_jsx("div", { className: "text-[10px] uppercase tracking-wider text-cyan-200 font-bold", children: "Defeitos da OP" }), _jsxs("div", { className: "text-sm font-extrabold", children: [defeitos.length, " tipo", defeitos.length > 1 ? "s" : "", " registrado", defeitos.length > 1 ? "s" : ""] })] })] }) }), _jsx("div", { className: "max-h-72 overflow-y-auto bg-white", children: defeitos.map((d, i) => (_jsxs("div", { className: "flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors", children: [_jsxs("div", { className: "flex items-center gap-2.5 min-w-0", children: [_jsx("span", { className: "w-5 h-5 rounded-md bg-rose-50 text-rose-500 grid place-items-center text-[10px] font-bold tabular-nums shrink-0", children: i + 1 }), _jsx("span", { className: "text-xs text-slate-700 leading-tight", children: d.texto })] }), _jsx("span", { className: "text-xs font-bold text-rose-600 tabular-nums shrink-0", children: d.metros ? fmtMeters(d.metros) : "—" })] }, i))) })] })] }));
}
