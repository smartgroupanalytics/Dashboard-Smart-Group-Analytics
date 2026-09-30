import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect, useMemo } from "react";
import { Clock, AlertTriangle, Percent, Upload } from "lucide-react";
import { MESES } from "@/lib/format";
import ImportTempoOciosoDialog from "@/components/tempo-ocioso/ImportTempoOciosoDialog";
import TempoOciosoGraficoDialog from "@/components/tempo-ocioso/TempoOciosoGraficoDialog";
const ORDEM_MAQUINAS = ["JR", "Gravadora", "Estampa 1", "Estampa 2", "GR 2", "GR 3", "Digital Solvente", "Digital UV"];
const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").trim();
const ORDEM_NORM = ORDEM_MAQUINAS.map(normalize);
const HERO_IMG = "./assets/producao-bg.svg";
function fmtMin(v) {
    return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);
}
function fmtPct(v) {
    return `${(v || 0).toFixed(2).replace(".", ",")}%`;
}
export default function TempoOcioso() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [importOpen, setImportOpen] = useState(false);
    const [graficoOpen, setGraficoOpen] = useState(false);
    const now = new Date();
    const [selectedMes, setSelectedMes] = useState(now.getMonth() + 1);
    const load = async () => {
        try {
            setLoading(true);
            const data = await db.entities.TempoOcioso.list("-data", 5000);
            setRecords(data || []);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);
    const filtered = useMemo(() => records.filter((r) => {
        if (!r.data)
            return false;
        const m = parseInt(String(r.data).split("-")[1], 10);
        return m === selectedMes;
    }), [records, selectedMes]);
    const machineData = useMemo(() => {
        const map = {};
        filtered.forEach((r) => {
            const key = r.maquina;
            if (!map[key])
                map[key] = { tempo_ocioso: 0, tempo_disponivel: 0 };
            map[key].tempo_ocioso += r.tempo_ocioso || 0;
            map[key].tempo_disponivel += r.tempo_disponivel || 0;
        });
        const result = Object.entries(map).map(([maquina, v]) => {
            const disponivel = v.tempo_disponivel;
            const ocioso = v.tempo_ocioso;
            const pct = disponivel > 0 ? (ocioso / disponivel) * 100 : 0;
            return { maquina, disponivel, ocioso, pct };
        });
        result.sort((a, b) => {
            const ia = ORDEM_NORM.indexOf(normalize(a.maquina));
            const ib = ORDEM_NORM.indexOf(normalize(b.maquina));
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        });
        return result;
    }, [filtered]);
    const totais = useMemo(() => {
        const disponivel = machineData.reduce((s, m) => s + m.disponivel, 0);
        const ocioso = machineData.reduce((s, m) => s + m.ocioso, 0);
        const pct = disponivel > 0 ? (ocioso / disponivel) * 100 : 0;
        return { disponivel, ocioso, pct };
    }, [machineData]);
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-screen bg-white", children: _jsx("div", { className: "w-8 h-8 border-4 border-slate-200 border-t-[#00798c] rounded-full animate-spin" }) }));
    }
    const KPIS = [
        { label: "Tempo Total Disponível", value: fmtMin(totais.disponivel), unit: "min", icon: Clock },
        { label: "Tempo Total Ocioso", value: fmtMin(totais.ocioso), unit: "min", icon: AlertTriangle },
        { label: "% Tempo Ocioso", value: fmtPct(totais.pct), unit: "", icon: Percent },
    ];
    return (_jsxs("div", { className: "to-aurora", children: [_jsx("div", { className: "to-orb" }), _jsxs("section", { className: "to-hero", children: [_jsx("img", { src: HERO_IMG, alt: "", className: "to-hero-img" }), _jsxs("div", { className: "to-hero-content", children: [_jsx("h1", { children: "AN\u00C1LISE DE TEMPO OCIOSO (MINUTOS)" }), _jsxs("div", { className: "to-toolbar", children: [_jsx("div", {}), _jsxs("div", { className: "to-toolbar-right", children: [_jsxs("button", { className: "to-btn", onClick: () => setImportOpen(true), children: [_jsx(Upload, { className: "w-4 h-4" }), " Importar"] }), _jsxs("button", { className: "to-btn", onClick: () => setGraficoOpen(true), children: [_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M3 3v18h18" }), _jsx("rect", { x: "7", y: "10", width: "3", height: "8" }), _jsx("rect", { x: "12", y: "6", width: "3", height: "12" }), _jsx("rect", { x: "17", y: "13", width: "3", height: "5" })] }), "Gr\u00E1fico"] }), _jsxs("label", { className: "to-month", children: ["M\u00EAs:", _jsx("select", { value: selectedMes, onChange: (e) => setSelectedMes(Number(e.target.value)), className: "to-select", children: MESES.map((m) => (_jsx("option", { value: m.value, children: m.label }, m.value))) })] })] })] })] })] }), _jsx("div", { className: "to-kpis", children: KPIS.map((k, i) => (_jsxs("article", { className: "to-kpi", children: [_jsxs("div", { className: "to-kpi-top", children: [_jsx("div", {}), _jsx("div", { className: "to-kpi-icon", children: _jsx(k.icon, {}) })] }), _jsx("p", { className: "to-kpi-label", children: k.label }), _jsxs("p", { className: "to-kpi-value", children: [k.value, k.unit && _jsx("span", { className: "to-unit", children: k.unit })] })] }, i))) }), _jsxs("section", { className: "to-data-card", children: [_jsxs("div", { className: "to-data-head", children: [_jsxs("h2", { children: ["Detalhamento por M\u00E1quina \u2014 ", MESES[selectedMes - 1]?.label] }), _jsx("span", { children: "Tempo Ocioso" })] }), _jsx("div", { className: "to-table-wrap", children: _jsxs("table", { className: "to-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "M\u00E1quinas" }), _jsx("th", { children: "Tempo Dispon\u00EDvel" }), _jsx("th", { children: "Tempo Ocioso" }), _jsx("th", { children: "% Tempo Ocioso" })] }) }), _jsxs("tbody", { children: [machineData.map((m) => (_jsxs("tr", { children: [_jsx("td", { children: m.maquina }), _jsxs("td", { className: "to-available", children: [fmtMin(m.disponivel), " min"] }), _jsxs("td", { className: "to-idle", children: [fmtMin(m.ocioso), " min"] }), _jsx("td", { className: "to-percent", children: fmtPct(m.pct) })] }, m.maquina))), machineData.length === 0 && (_jsx("tr", { children: _jsxs("td", { colSpan: 4, style: { textAlign: "center", color: "#54767c", padding: "24px 16px" }, children: ["Nenhum dado encontrado para ", MESES[selectedMes - 1]?.label, "."] }) }))] }), machineData.length > 0 && (_jsx("tfoot", { children: _jsxs("tr", { children: [_jsx("td", { children: "Total" }), _jsxs("td", { className: "to-available", children: [fmtMin(totais.disponivel), " min"] }), _jsxs("td", { className: "to-idle", children: [fmtMin(totais.ocioso), " min"] }), _jsx("td", { className: "to-percent", children: fmtPct(totais.pct) })] }) }))] }) })] }), _jsx(ImportTempoOciosoDialog, { open: importOpen, onOpenChange: setImportOpen, onImported: load }), _jsx(TempoOciosoGraficoDialog, { open: graficoOpen, onOpenChange: setGraficoOpen })] }));
}
