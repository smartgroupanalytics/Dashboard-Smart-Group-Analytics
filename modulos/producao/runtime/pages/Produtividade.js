import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect, useMemo } from "react";
import { TrendingUp, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProdutividadeMachineTable from "@/components/produtividade/ProdutividadeMachineTable";
import GlassNeonKpiCard from "@/components/produtividade/GlassNeonKpiCard";
import ImportProdutividadeDialog from "@/components/produtividade/ImportProdutividadeDialog";
import DayFilter from "@/components/desempenho/DayFilter";
import LightHeader from "@/components/ui/LightHeader";
export default function Produtividade() {
    const [records, setRecords] = useState([]);
    const [selectedDays, setSelectedDays] = useState(() => {
        try {
            const saved = localStorage.getItem("produtividade_selectedDays");
            return saved ? JSON.parse(saved) : [];
        }
        catch {
            return [];
        }
    });
    const [importOpen, setImportOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const load = async () => {
        try {
            setLoading(true);
            const data = await db.entities.ProdutividadeDiaria.list("-data", 5000);
            setRecords(data || []);
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
            localStorage.setItem("produtividade_selectedDays", JSON.stringify(selectedDays));
        }
        catch { }
    }, [selectedDays]);
    const temFiltro = selectedDays.length > 0;
    const filtered = useMemo(() => (temFiltro ? records.filter((r) => selectedDays.includes(r.data)) : records), [records, selectedDays, temFiltro]);
    // Agrupar por máquina e calcular médias
    const machineData = useMemo(() => {
        const normalizeMaquina = (s) => {
            const norm = String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
            if (norm === "gr3" || norm === "gr 3")
                return "GR 1";
            return s;
        };
        const map = {};
        filtered.forEach((r) => {
            const maquinaNorm = normalizeMaquina(r.maquina);
            if (!map[maquinaNorm]) {
                map[maquinaNorm] = { utilizacao: [], produtividade: [], eficiencia_producao: [], eficiencia_setup: [], maquina_inoperante: [] };
            }
            const m = map[maquinaNorm];
            m.utilizacao.push(r.utilizacao || 0);
            m.produtividade.push(r.produtividade || 0);
            m.eficiencia_producao.push(r.eficiencia_producao || 0);
            m.eficiencia_setup.push(r.eficiencia_setup || 0);
            m.maquina_inoperante.push(r.maquina_inoperante || 0);
        });
        const result = Object.entries(map).map(([maquina, arr]) => {
            const avg = (list) => (list.length ? list.reduce((s, v) => s + v, 0) / list.length : 0);
            return {
                maquina,
                metrics: {
                    utilizacao: avg(arr.utilizacao),
                    produtividade: avg(arr.produtividade),
                    eficiencia_producao: avg(arr.eficiencia_producao),
                    eficiencia_setup: avg(arr.eficiencia_setup),
                    maquina_inoperante: avg(arr.maquina_inoperante),
                },
            };
        });
        const ORDEM_MAQUINAS = ["JR", "Gravadora", "Estampa 1", "Estampa 2", "GR 2", "Digital UV", "Digital Solvente", "GR 1"];
        const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const ordemNormalizada = ORDEM_MAQUINAS.map(normalize);
        result.sort((a, b) => {
            const ia = ordemNormalizada.indexOf(normalize(a.maquina));
            const ib = ordemNormalizada.indexOf(normalize(b.maquina));
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        });
        return result;
    }, [filtered]);
    // Cálculo geral conforme fórmulas:
    // Produtividade Geral = (ΣJ + ΣK) / ΣC
    // Utilização Geral = ΣD / ΣC
    // Eficiência de Produção Geral = ΣJ / ΣD
    // Eficiência de Setup Geral = ΣK / ΣE
    const geral = useMemo(() => {
        const sumC = filtered.reduce((s, r) => s + (r.col_c || 0), 0);
        const sumD = filtered.reduce((s, r) => s + (r.col_d || 0), 0);
        const sumE = filtered.reduce((s, r) => s + (r.col_e || 0), 0);
        const sumJ = filtered.reduce((s, r) => s + (r.col_j || 0), 0);
        const sumK = filtered.reduce((s, r) => s + (r.col_k || 0), 0);
        return {
            produtividade: sumC ? (sumJ + sumK) / sumC : 0,
            utilizacao: sumC ? sumD / sumC : 0,
            eficiencia_producao: sumD ? sumJ / sumD : 0,
            eficiencia_setup: sumE ? sumK / sumE : 0,
        };
    }, [filtered]);
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-[60vh]", children: _jsx("div", { className: "w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" }) }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-[#F4F7FC]", children: [_jsxs("div", { className: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2", children: [_jsx(LightHeader, { icon: TrendingUp, title: "Produtividade", subtitle: "Indicadores de efici\u00EAncia por m\u00E1quina", className: "mb-2", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Button, { variant: "outline", size: "sm", className: "h-9 gap-2 bg-white text-slate-800 hover:bg-slate-100", onClick: () => setImportOpen(true), children: [_jsx(FileSpreadsheet, { className: "w-4 h-4" }), " Importar"] }), _jsx(DayFilter, { selectedDays: selectedDays, onSelect: setSelectedDays }), temFiltro && (_jsx(Button, { variant: "ghost", size: "sm", className: "h-9 text-slate-700 hover:bg-slate-100", onClick: () => setSelectedDays([]), children: "Limpar" }))] }) }), _jsx("div", { className: "mb-2", children: _jsx(GlassNeonKpiCard, { geral: geral, index: 0 }) }), _jsx(ProdutividadeMachineTable, { machineData: machineData }), machineData.length === 0 && (_jsxs("div", { className: "text-center py-20 text-slate-500", children: [_jsx("p", { className: "text-lg", children: "Nenhum dado encontrado." }), _jsx("p", { className: "text-sm mt-1", children: "Clique em \"Importar\" para carregar os dados da planilha." })] }))] }), _jsx(ImportProdutividadeDialog, { open: importOpen, onOpenChange: setImportOpen, onImported: load })] }));
}
