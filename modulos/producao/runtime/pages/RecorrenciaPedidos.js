import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect, useMemo } from "react";
import { Upload, FileText, Calendar } from "lucide-react";
import DayFilter from "@/components/desempenho/DayFilter";
import ImportRecorrenciaDialog from "@/components/recorrencia/ImportRecorrenciaDialog";
import RecorrenciaSearch from "@/components/recorrencia/RecorrenciaSearch";
import RecorrenciaRelatorioGeralDialog from "@/components/recorrencia/RecorrenciaRelatorioGeralDialog";
import ProductCalendarDialog from "@/components/recorrencia/ProductCalendarDialog";
function pad(n) { return String(n).padStart(2, "0"); }
function todayIso() {
    const t = new Date();
    return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}
const fmtNum = (v) => (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const HERO_IMG = "./assets/producao-bg.svg";
export default function RecorrenciaPedidos() {
    const [records, setRecords] = useState([]);
    const [selectedDays, setSelectedDays] = useState(() => {
        try {
            const saved = localStorage.getItem("recorrencia_selected_days");
            if (saved) {
                const arr = JSON.parse(saved);
                if (Array.isArray(arr) && arr.length)
                    return arr;
            }
        }
        catch (e) { }
        return [todayIso()];
    });
    const [loading, setLoading] = useState(true);
    const [importOpen, setImportOpen] = useState(false);
    const [relatorioOpen, setRelatorioOpen] = useState(false);
    const [busca, setBusca] = useState("");
    const [calendarProduct, setCalendarProduct] = useState(null);
    useEffect(() => {
        try {
            localStorage.setItem("recorrencia_selected_days", JSON.stringify(selectedDays));
        }
        catch (e) { }
    }, [selectedDays]);
    const load = async () => {
        try {
            setLoading(true);
            const data = await db.entities.RecorrenciaPedido.list();
            setRecords(data);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);
    const filtered = useMemo(() => records.filter((r) => selectedDays.includes(r.data)), [records, selectedDays]);
    const buscaTrim = busca.trim().toLowerCase();
    const buscaAtiva = buscaTrim.length > 0;
    const filteredBusca = useMemo(() => buscaAtiva
        ? filtered.filter((r) => {
            const cod = (r.codigo_produto || "").toLowerCase();
            const desc = (r.descricao_produto || "").toLowerCase();
            return cod.includes(buscaTrim) || desc.includes(buscaTrim);
        })
        : filtered, [filtered, buscaTrim, buscaAtiva]);
    const porCodigo = useMemo(() => {
        const map = {};
        filteredBusca.forEach((r) => {
            const cod = r.codigo_produto;
            if (!cod)
                return;
            if (!map[cod])
                map[cod] = { codigo: cod, descricao: r.descricao_produto || "", count: 0, metragem: 0, pedidos: [] };
            map[cod].count += 1;
            map[cod].metragem += r.metragem || 0;
            map[cod].pedidos.push({ data: r.data, op: r.num_op || "", metragem: r.metragem || 0 });
        });
        return Object.values(map).sort((a, b) => b.count - a.count);
    }, [filteredBusca]);
    const porMetragem = useMemo(() => [...porCodigo].sort((a, b) => b.count - a.count || b.metragem - a.metragem), [porCodigo]);
    const kpis = useMemo(() => {
        const total = porCodigo.length;
        const comRecorrencia = porCodigo.filter((p) => p.count > 1).length;
        const recorrenciaGeral = total > 0 ? Math.round((comRecorrencia / total) * 100) : 0;
        return { recorrenciaGeral, comRecorrencia, total };
    }, [porCodigo]);
    const maxCount = Math.max(1, ...porCodigo.map((d) => d.count || 0));
    const totalMetragem = porMetragem.reduce((s, d) => s + (d.metragem || 0), 0);
    const totalPedidos = porMetragem.reduce((s, d) => s + (d.count || 0), 0);
    const pctComRecorrencia = kpis.total > 0 ? Math.round((kpis.comRecorrencia / kpis.total) * 100) : 0;
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-[60vh]", children: _jsx("div", { className: "w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" }) }));
    }
    return (_jsxs("div", { className: "recorrencia-aurora", children: [_jsx("div", { className: "ra-wash" }), _jsxs("div", { className: "ra-content", children: [_jsxs("section", { className: "ra-hero", children: [_jsx("img", { src: HERO_IMG, alt: "" }), _jsxs("div", { className: "ra-hero-copy", children: [_jsx("div", { className: "ra-eyebrow", children: "An\u00E1lise em tempo real" }), _jsx("h1", { children: "Recorr\u00EAncia de Pedidos" }), _jsx("p", { children: "An\u00E1lise de recorr\u00EAncia de c\u00F3digos de produto" })] }), _jsxs("div", { className: "ra-hero-toolbar", children: [_jsxs("button", { className: "ra-tool ra-primary", onClick: () => setImportOpen(true), children: [_jsx(Upload, { className: "w-3.5 h-3.5" }), " Importar"] }), _jsxs("button", { className: "ra-tool", onClick: () => setRelatorioOpen(true), children: [_jsx(FileText, { className: "w-3.5 h-3.5" }), " Relat\u00F3rio Geral"] }), _jsx(RecorrenciaSearch, { value: busca, onChange: setBusca }), _jsx(DayFilter, { selectedDays: selectedDays, onSelect: setSelectedDays })] })] }), _jsx("section", { className: "ra-section", children: _jsxs("div", { className: "ra-kpis", children: [_jsxs("article", { className: "ra-card ra-kpi", children: [_jsx("div", { className: "ra-kpi-label", children: "Recorr\u00EAncia Geral (%)" }), _jsxs("div", { className: "ra-kpi-value", children: [kpis.recorrenciaGeral, _jsx("span", { children: "%" })] }), _jsx("div", { className: "ra-progress", children: _jsx("i", { style: { width: `${kpis.recorrenciaGeral}%` } }) })] }), _jsxs("article", { className: "ra-card ra-kpi", children: [_jsx("div", { className: "ra-kpi-label", children: "Produtos com Recorr\u00EAncia" }), _jsx("div", { className: "ra-kpi-value", children: kpis.comRecorrencia }), _jsx("div", { className: "ra-progress ra-alt", children: _jsx("i", { style: { width: `${pctComRecorrencia}%` } }) })] })] }) }), _jsxs("div", { className: "ra-grid-2col", children: [_jsxs("section", { className: "ra-section", children: [_jsxs("div", { className: "ra-section-head", children: [_jsx("h2", { children: "Ranking Top 10 produtos" }), _jsx("div", { className: "ra-section-note", children: "Desempenho por recorr\u00EAncia" })] }), _jsxs("div", { className: "ra-card ra-ranking", children: [porCodigo.slice(0, 10).map((d, i) => (_jsxs("div", { className: "ra-rank-row", children: [_jsx("div", { className: "ra-rank-num", children: String(i + 1).padStart(2, "0") }), _jsxs("div", { children: [_jsx("div", { className: "ra-rank-name", children: d.descricao || d.codigo }), _jsx("div", { className: "ra-rank-code", children: d.codigo })] }), _jsx("div", { className: "ra-rank-meter", children: _jsx("i", { style: { width: `${((d.count || 0) / maxCount) * 100}%` } }) }), _jsxs("div", { className: "ra-rank-count", children: [d.count, " pedido", d.count !== 1 ? "s" : ""] })] }, i))), porCodigo.length === 0 && (_jsx("div", { className: "ra-rank-empty", children: "Nenhum dado para o per\u00EDodo selecionado." }))] })] }), _jsxs("section", { className: "ra-section", children: [_jsxs("div", { className: "ra-section-head", children: [_jsx("h2", { children: "Tabela de produtos" }), _jsx("div", { className: "ra-section-note", children: "Vis\u00E3o consolidada" })] }), _jsx("div", { className: "ra-card ra-table-card", children: _jsx("div", { className: "ra-table-wrap", children: _jsxs("table", { className: "ra-data", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "C\u00F3digo" }), _jsx("th", { children: "Descri\u00E7\u00E3o" }), _jsx("th", { children: "Metragem" }), _jsx("th", { children: "Pedido total" })] }) }), _jsxs("tbody", { children: [porMetragem.map((d, i) => (_jsxs("tr", { children: [_jsx("td", { children: _jsxs("span", { className: "ra-code-cell", children: [d.codigo, _jsx("button", { className: "ra-cal-btn", title: "Ver datas", onClick: () => setCalendarProduct(d), children: _jsx(Calendar, { className: "w-3.5 h-3.5" }) })] }) }), _jsx("td", { children: d.descricao || "—" }), _jsx("td", { children: fmtNum(d.metragem) }), _jsx("td", { children: d.count })] }, i))), porMetragem.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 4, className: "ra-empty-row", children: "Nenhum dado para o per\u00EDodo selecionado." }) }))] }), porMetragem.length > 0 && (_jsx("tfoot", { children: _jsxs("tr", { children: [_jsx("td", { colSpan: 2, children: "Total" }), _jsx("td", { children: fmtNum(totalMetragem) }), _jsx("td", { children: totalPedidos })] }) }))] }) }) })] })] }), _jsxs("div", { className: "ra-foot", children: [_jsxs("span", { children: [_jsx("i", { className: "ra-pulse" }), "Dados sincronizados"] }), _jsx("span", { children: "Faturamento" })] })] }), _jsx(ImportRecorrenciaDialog, { open: importOpen, onOpenChange: setImportOpen, onImported: load }), _jsx(RecorrenciaRelatorioGeralDialog, { open: relatorioOpen, onOpenChange: setRelatorioOpen, data: porCodigo }), _jsx(ProductCalendarDialog, { product: calendarProduct, open: !!calendarProduct, onOpenChange: (o) => !o && setCalendarProduct(null) })] }));
}
