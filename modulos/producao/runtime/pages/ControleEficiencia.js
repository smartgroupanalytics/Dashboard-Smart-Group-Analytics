import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect, useMemo } from "react";
import { Printer, Timer, Clock, Gauge as GaugeIcon, TrendingUp, Search, X, BarChart3, List, Database } from "lucide-react";
import ControleTable from "@/components/controle/ControleTable";
import MachineCard from "@/components/controle/MachineCard";
import RelatorioMaquina from "@/components/controle/RelatorioMaquina";
import RelatorioProdutoMaquinas from "@/components/controle/RelatorioProdutoMaquinas";
import OpJourneyPanel from "@/components/controle/OpJourneyPanel";
import AnaliseEficienciaDashboard from "@/components/controle/AnaliseEficienciaDashboard";
import DayFilter from "@/components/desempenho/DayFilter";
import ProductFilter from "@/components/controle/ProductFilter";
import ImportExcelDialog from "@/components/controle/ImportExcelDialog";
import ImportSetupDialog from "@/components/controle/ImportSetupDialog";
import FamiliasCilindrosDialog from "@/components/controle/FamiliasCilindrosDialog";
import FamiliaEstampaDialog from "@/components/controle/FamiliaEstampaDialog";
import { tempoEsperadoHoras, tempoRealHoras } from "@/lib/controleSpeed";
import "@/components/controle/controle-vibrante.css";
const MACHINES = ["JR", "Gravadora", "Estampa 1", "Estampa 2", "GR2", "Digital UV", "Digital Solvente", "Tumbler"];
function fmtHoras(v) {
    if (!v && v !== 0)
        return "00:00";
    const abs = Math.abs(v);
    const h = Math.floor(abs);
    const m = Math.round((abs - h) * 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
export default function ControleEficiencia() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [active, setActive] = useState(MACHINES[0]);
    const [selectedDays, setSelectedDaysState] = useState(() => {
        try {
            const saved = localStorage.getItem("controle_eficiencia_selected_days");
            return saved ? JSON.parse(saved) : [];
        }
        catch {
            return [];
        }
    });
    const setSelectedDays = (days) => {
        setSelectedDaysState(days);
        try {
            localStorage.setItem("controle_eficiencia_selected_days", JSON.stringify(days));
        }
        catch {
            // ignore
        }
    };
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [opSearch, setOpSearch] = useState("");
    const [importOpen, setImportOpen] = useState(false);
    const [setupOpen, setSetupOpen] = useState(false);
    const [familiasOpen, setFamiliasOpen] = useState(false);
    const [familiasEstampaOpen, setFamiliasEstampaOpen] = useState(false);
    const [importMachine, setImportMachine] = useState(null);
    const [relatorioMaquina, setRelatorioMaquina] = useState(null);
    const [viewMode, setViewMode] = useState("maquinas"); // "maquinas" | "analise"
    const [clearingMachine, setClearingMachine] = useState(null);
    const toggleRelatorio = (m) => {
        setRelatorioMaquina((prev) => (prev === m ? null : m));
    };
    const load = async () => {
        try {
            setLoading(true);
            const data = await db.entities.ControleEficiencia.list("-created_date", 5000);
            setRecords(data);
        }
        finally {
            setLoading(false);
        }
    };
    // Recarrega registros sem flash de loading — preserva filtros e relatório aberto
    const reload = async () => {
        const data = await db.entities.ControleEficiencia.list("-created_date", 5000);
        setRecords(data);
    };
    const handleClearMachine = async (maquina) => {
        if (!maquina || clearingMachine)
            return;
        try {
            setClearingMachine(maquina);
            // Consulta diretamente o Firestore para não depender do limite de 5.000
            // registros carregados na tela. Assim o botão funciona para qualquer máquina.
            const machineRecords = await db.entities.ControleEficiencia.filter({ maquina });
            if (!machineRecords.length) {
                window.alert(`Não há dados carregados para ${maquina}.`);
                return;
            }
            const confirmed = window.confirm(`Limpar os ${machineRecords.length} registro(s) do Controle de Eficiência da máquina ${maquina}?\n\n` +
                `Esta ação remove somente os registros desta máquina e não altera as demais. ` +
                `Use esta opção quando uma planilha incorreta tiver sido importada.\n\n` +
                `A exclusão não poderá ser desfeita.`);
            if (!confirmed)
                return;
            const result = await db.entities.ControleEficiencia.deleteMany({ maquina });
            await reload();
            if (relatorioMaquina === maquina)
                setRelatorioMaquina(null);
            if (importMachine === maquina)
                setImportMachine(null);
            const deleted = Number(result?.deleted || 0);
            window.alert(deleted > 0
                ? `${deleted} registro(s) de ${maquina} foram removidos com sucesso.`
                : `Os dados de ${maquina} foram limpos.`);
        }
        catch (error) {
            console.error("Erro ao limpar dados da máquina", maquina, error);
            window.alert(`Não foi possível limpar os dados de ${maquina}. Nenhum dado das outras máquinas foi alterado.`);
        }
        finally {
            setClearingMachine(null);
        }
    };
    useEffect(() => { load(); }, []);
    useEffect(() => {
        if (selectedDays.length > 0) {
            setRelatorioMaquina(active);
        }
    }, [selectedDays]);
    const opActive = opSearch.trim() !== "";
    const filtered = useMemo(() => {
        return records.filter((r) => {
            // Busca por OP: ignora filtro de datas e produtos, varre todos os registros
            if (opActive) {
                if (!r.num_op || !String(r.num_op).toLowerCase().includes(opSearch.trim().toLowerCase()))
                    return false;
                return true;
            }
            if (selectedDays.length > 0 && (!r.data || !selectedDays.includes(r.data)))
                return false;
            if (selectedProducts.length > 0 && (!r.descricao_produto || !selectedProducts.includes(r.descricao_produto)))
                return false;
            // Só aparece registro que foi efetivamente produzido (tempo ou metragem > 0)
            // ou que seja retrabalho. Setup/parada sem produção (ex.: OP 8000) fica oculto.
            // GR2: tempo de 1 minuto (00:01) não considera como produção
            const tempo = r.tempo > 0 ? r.tempo : tempoRealHoras(r.hora_inicial, r.hora_final);
            const isGR2Curto = r.maquina === "GR2" && tempo > 0 && Math.round(tempo * 60) <= 1;
            const temProducao = ((r.tempo || 0) > 0 || (r.metragem || 0) > 0) && !isGR2Curto;
            const isRetrabalho = !!r.is_retrabalho;
            if (!temProducao && !isRetrabalho)
                return false;
            return true;
        });
    }, [records, selectedDays, selectedProducts, opSearch, opActive]);
    const byMachine = useMemo(() => {
        const map = {};
        MACHINES.forEach((m) => (map[m] = []));
        filtered.forEach((r) => {
            if (map[r.maquina])
                map[r.maquina].push(r);
        });
        return map;
    }, [filtered]);
    // Lista de produtos de TODAS as máquinas (filtrado por dias) — permite buscar
    // um produto independente da máquina ativa e ver por onde ele passou
    const productsForFilter = useMemo(() => {
        const dayRecords = records.filter((r) => {
            if (selectedDays.length > 0 && (!r.data || !selectedDays.includes(r.data)))
                return false;
            return true;
        });
        return [...new Set(dayRecords.map((r) => r.descricao_produto).filter(Boolean))];
    }, [records, selectedDays]);
    const temFiltro = selectedDays.length > 0 || selectedProducts.length > 0 || opSearch.trim() !== "";
    const totaisActive = useMemo(() => {
        const recs = byMachine[active] || [];
        const real = recs.reduce((s, r) => s + (r.tempo > 0 ? r.tempo : tempoRealHoras(r.hora_inicial, r.hora_final)), 0);
        const esperado = recs.reduce((s, r) => s + tempoEsperadoHoras(r.metragem, active, r.processo), 0);
        return { real, esperado, eficiencia: real > 0 ? (esperado / real) * 100 : 0 };
    }, [byMachine, active]);
    // Hero stats globais
    const heroStats = useMemo(() => {
        const machinesAtivas = MACHINES.filter((m) => (byMachine[m] || []).length > 0).length;
        let totalReal = 0;
        let totalEsperado = 0;
        MACHINES.forEach((m) => {
            const recs = byMachine[m] || [];
            recs.forEach((r) => {
                totalReal += r.tempo > 0 ? r.tempo : tempoRealHoras(r.hora_inicial, r.hora_final);
                totalEsperado += tempoEsperadoHoras(r.metragem, m, r.processo);
            });
        });
        const efMedia = totalReal > 0 ? (totalEsperado / totalReal) * 100 : 0;
        return { machinesAtivas, totalReal, efMedia };
    }, [byMachine]);
    const corEfGeral = totaisActive.eficiencia >= 95 ? "#10b981" : "#ef4444";
    const handlePrint = async () => {
        // Se houver um relatório aberto, imprime apenas ele em paisagem (paginação natural)
        const relatorio = document.querySelector(".relatorio-root");
        if (relatorio) {
            document.body.classList.add("printing-relatorio");
            const reset = () => {
                document.body.classList.remove("printing-relatorio");
                window.removeEventListener("afterprint", reset);
            };
            window.addEventListener("afterprint", reset);
            window.print();
            return;
        }
        const area = document.querySelector(".print-area");
        if (!area) {
            window.print();
            return;
        }
        const prevDisplay = area.style.display;
        area.style.display = "block";
        const reset = () => { area.style.display = prevDisplay; window.removeEventListener("afterprint", reset); };
        window.addEventListener("afterprint", reset);
        window.print();
    };
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-[60vh]", children: _jsx("div", { className: "w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" }) }));
    }
    return (_jsxs("div", { className: "ce-page", children: [_jsxs("div", { className: "ce-shell", children: [_jsxs("header", { className: "ce-hero", children: [_jsxs("div", { className: "ce-top", children: [_jsxs("div", { className: "ce-identity", children: [_jsx("div", { className: "ce-mark", children: _jsxs("svg", { viewBox: "0 0 24 24", children: [_jsx("path", { d: "M12 3a9 9 0 1 0 9 9" }), _jsx("path", { d: "M12 7v5l3 2" }), _jsx("path", { d: "M12 3v4M21 12h-4" })] }) }), _jsxs("div", { children: [_jsx("div", { className: "ce-title", children: "Controle de Efici\u00EAncia de M\u00E1quinas" }), _jsx("div", { className: "ce-subtitle", children: "Registro de OPs, metragem e tempo por m\u00E1quina" })] })] }), _jsxs("div", { className: "ce-tools", children: [_jsxs("div", { className: "flex rounded-lg border border-slate-200 bg-white p-0.5", children: [_jsxs("button", { className: `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${viewMode === "maquinas" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`, onClick: () => setViewMode("maquinas"), children: [_jsx(List, { className: "w-3.5 h-3.5" }), " M\u00E1quinas"] }), _jsxs("button", { className: `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${viewMode === "analise" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`, onClick: () => setViewMode("analise"), children: [_jsx(BarChart3, { className: "w-3.5 h-3.5" }), " An\u00E1lise"] })] }), _jsxs("button", { className: "ce-btn", onClick: handlePrint, children: [_jsx(Printer, { className: "w-4 h-4" }), " Imprimir"] }), _jsxs("button", { className: "ce-btn primary", onClick: () => setSetupOpen(true), children: [_jsx(Timer, { className: "w-4 h-4" }), " Importar Setup"] }), _jsxs("button", { className: "ce-btn", onClick: () => setFamiliasOpen(true), children: [_jsx(Database, { className: "w-4 h-4" }), " Fam\u00EDlias e Cilindros"] }), _jsxs("button", { className: "ce-btn", onClick: () => setFamiliasEstampaOpen(true), children: [_jsx(Database, { className: "w-4 h-4" }), " Fam\u00EDlias Estampas"] }), _jsx(DayFilter, { selectedDays: selectedDays, onSelect: setSelectedDays, triggerClassName: "ce-filter" }), _jsx(ProductFilter, { products: productsForFilter, selected: selectedProducts, onSelect: setSelectedProducts, triggerClassName: "ce-filter" }), _jsxs("div", { className: "ce-op-search", children: [_jsx(Search, { className: "w-4 h-4 text-slate-400" }), _jsx("input", { type: "text", placeholder: "Buscar OP...", value: opSearch, onChange: (e) => setOpSearch(e.target.value), className: "ce-op-input" }), opSearch && (_jsx("button", { onClick: () => setOpSearch(""), className: "ce-op-clear", children: _jsx(X, { className: "w-3.5 h-3.5" }) }))] }), temFiltro && (_jsx("button", { className: "ce-btn", onClick: () => { setSelectedDays([]); setSelectedProducts([]); setOpSearch(""); }, children: "Limpar filtros" }))] })] }), _jsxs("div", { className: "ce-hero-stats", children: [_jsxs("div", { className: "ce-hero-stat", children: [_jsx("strong", { children: String(heroStats.machinesAtivas).padStart(2, "0") }), _jsx("span", { children: "M\u00E1quinas monitoradas" })] }), _jsxs("div", { className: "ce-hero-stat", children: [_jsx("strong", { children: fmtHoras(heroStats.totalReal) }), _jsx("span", { children: "Tempo registrado" })] }), _jsxs("div", { className: "ce-hero-stat", children: [_jsxs("strong", { children: [heroStats.efMedia > 0 ? Math.round(heroStats.efMedia) : 0, "%"] }), _jsx("span", { children: "Efici\u00EAncia m\u00E9dia" })] })] })] }), viewMode === "analise" ? (_jsxs("section", { className: "ce-section", children: [_jsxs("div", { className: "ce-section-head", children: [_jsx("h2", { children: "An\u00E1lise de Efici\u00EAncia" }), _jsx("span", { className: "ce-section-note", children: "Vis\u00E3o consolidada por m\u00E1quina" })] }), _jsx(AnaliseEficienciaDashboard, { records: filtered, selectedDays: selectedDays })] })) : (_jsxs(_Fragment, { children: [_jsxs("section", { className: "ce-section", children: [_jsxs("div", { className: "ce-section-head", children: [_jsx("h2", { children: "M\u00E1quinas" }), _jsx("span", { className: "ce-section-note", children: "Selecione uma m\u00E1quina para visualizar o relat\u00F3rio" })] }), _jsx("div", { className: "ce-machines", children: MACHINES.map((m) => (_jsx(MachineCard, { maquina: m, records: byMachine[m] || [], active: active === m, onSelect: () => { setActive(m); setRelatorioMaquina(m); }, onImport: () => { setImportMachine(m); setImportOpen(true); }, onClear: () => handleClearMachine(m), clearing: clearingMachine === m, onRelatorio: toggleRelatorio, relatorioAtivo: relatorioMaquina === m }, m))) })] }), _jsx("section", { className: "ce-section", children: opActive ? (_jsx(OpJourneyPanel, { op: opSearch.trim(), records: filtered, onClose: () => setOpSearch("") })) : selectedProducts.length > 0 ? (_jsx(RelatorioProdutoMaquinas, { products: selectedProducts, records: filtered, onClose: () => setSelectedProducts([]) })) : (relatorioMaquina && (byMachine[relatorioMaquina] || []).length >= 0 && (_jsx(RelatorioMaquina, { maquina: relatorioMaquina, records: byMachine[relatorioMaquina] || [], onClose: () => setRelatorioMaquina(null), onSaved: load }))) })] }))] }), _jsx(ImportExcelDialog, { open: importOpen, maquina: importMachine, onOpenChange: setImportOpen, onImported: reload }), _jsx(ImportSetupDialog, { open: setupOpen, onOpenChange: setSetupOpen, onImported: reload }), _jsx(FamiliasCilindrosDialog, { open: familiasOpen, onOpenChange: setFamiliasOpen }), _jsx(FamiliaEstampaDialog, { open: familiasEstampaOpen, onOpenChange: setFamiliasEstampaOpen }), _jsxs("div", { className: "hidden print:block print-area", children: [_jsxs("div", { className: "mb-6 pb-4 border-b-2 border-slate-900", children: [_jsxs("h1", { className: "text-2xl font-bold", children: ["Controle de Efici\u00EAncia \u2014 ", active] }), _jsxs("p", { className: "text-sm text-slate-600", children: [temFiltro ? "Relatório filtrado" : "Relatório completo", " \u2014 gerado em ", new Date().toLocaleDateString("pt-BR")] })] }), _jsxs("div", { className: "print-machine", children: [_jsxs("div", { className: "flex gap-3 mb-4 print-cards", children: [_jsxs("div", { className: "flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2", children: [_jsx(Clock, { className: "w-4 h-4 text-emerald-600" }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] text-emerald-700/70 uppercase font-medium", children: "Total Real" }), _jsxs("p", { className: "text-sm font-bold text-emerald-700 tabular-nums", children: [totaisActive.real.toFixed(2).replace(".", ","), " h"] })] })] }), _jsxs("div", { className: "flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2", children: [_jsx(TrendingUp, { className: "w-4 h-4 text-blue-600" }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] text-blue-700/70 uppercase font-medium", children: "Total Previsto" }), _jsxs("p", { className: "text-sm font-bold text-blue-700 tabular-nums", children: [totaisActive.esperado.toFixed(2).replace(".", ","), " h"] })] })] }), _jsxs("div", { className: "flex items-center gap-2 rounded-lg px-3 py-2", style: { background: corEfGeral }, children: [_jsx(GaugeIcon, { className: "w-4 h-4 text-white" }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] text-white/80 uppercase font-medium", children: "Efici\u00EAncia" }), _jsxs("p", { className: "text-sm font-bold tabular-nums text-white", children: [totaisActive.eficiencia.toFixed(0), "%"] })] })] })] }), _jsx(ControleTable, { records: byMachine[active], maquina: active, onSaved: load })] })] })] }));
}
