import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Cog, FileSpreadsheet, Timer, Printer } from "lucide-react";
import DesempenhoTable from "@/components/desempenho/DesempenhoTable";
import DesempenhoPorMaquina from "@/components/desempenho/DesempenhoPorMaquina";
import DayFilter from "@/components/desempenho/DayFilter";
import ImportDesempenhoDialog from "@/components/desempenho/ImportDesempenhoDialog";
import ImportSetupDialog from "@/components/desempenho/ImportSetupDialog";

const MACHINES = ["JR", "Gravadora", "Estampa 1", "Estampa 2", "Digital Solvente", "Digital UV", "GR2"];
function pad(n) {
    return String(n).padStart(2, "0");
}
function todayIso() {
    const t = new Date();
    return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}
export default function DesempenhoMaquina() {
    const [records, setRecords] = useState([]);
    const [selectedDays, setSelectedDays] = useState([todayIso()]);
    const [loading, setLoading] = useState(true);
    const [importOpen, setImportOpen] = useState(false);
    const [setupOpen, setSetupOpen] = useState(false);
    const [defaultApplied, setDefaultApplied] = useState(false);
    const ensuringRef = useRef(false);
    const load = async (silent = false) => {
        try {
            if (!silent)
                setLoading(true);
            const data = await db.entities.DesempenhoMaquina.list();
            setRecords(data);
            // Na primeira carga, seleciona o dia mais recente que tenha produção importada
            if (!defaultApplied) {
                const comDados = data
                    .filter((r) => r.tempo_produzido && r.tempo_produzido > 0)
                    .map((r) => r.data)
                    .sort();
                if (comDados.length) {
                    setSelectedDays([comDados[comDados.length - 1]]);
                }
                setDefaultApplied(true);
            }
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        load();
    }, []);
    // Cria registros faltantes (data + máquina) para os dias selecionados
    // Consulta o banco a cada chamada para evitar duplicatas por estado stale
    const ensureForDays = async (days) => {
        if (!days.length)
            return;
        if (ensuringRef.current)
            return;
        ensuringRef.current = true;
        try {
            const fresh = await db.entities.DesempenhoMaquina.filter({ data: { $in: days } });
            const existing = new Set(fresh.map((r) => `${r.data}|${r.maquina}`));
            const toCreate = [];
            days.forEach((d) => {
                MACHINES.forEach((m) => {
                    if (!existing.has(`${d}|${m}`))
                        toCreate.push({ data: d, maquina: m });
                });
            });
            if (toCreate.length) {
                await db.entities.DesempenhoMaquina.bulkCreate(toCreate);
                await load(true);
            }
        }
        finally {
            ensuringRef.current = false;
        }
    };
    useEffect(() => {
        if (!loading && selectedDays.length)
            ensureForDays(selectedDays);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDays, loading]);
    const filtered = useMemo(() => records.filter((r) => selectedDays.includes(r.data)), [records, selectedDays]);
    const handlePrint = () => {
        const styleEl = document.createElement("style");
        styleEl.id = "desempenho-landscape-page";
        styleEl.textContent = "@page { size: A4 landscape; margin: 5mm; }";
        document.head.appendChild(styleEl);
        document.body.classList.add("printing-desempenho");
        const cleanup = () => {
            document.body.classList.remove("printing-desempenho");
            styleEl.remove();
            window.removeEventListener("afterprint", cleanup);
        };
        window.addEventListener("afterprint", cleanup);
        window.print();
        setTimeout(cleanup, 1000);
    };
    if (loading) {
        return (_jsx("div", { className: "dm-page flex items-center justify-center", children: _jsx("div", { className: "w-8 h-8 border-4 border-cyan-100 border-t-cyan-600 rounded-full animate-spin" }) }));
    }
    return (_jsxs("div", { className: "dm-page", children: [_jsx("div", { className: "dm-ambient" }), _jsxs("div", { className: "dm-shell", children: [_jsxs("header", { className: "dm-topbar", children: [_jsxs("div", { className: "dm-heading", children: [_jsx("div", { className: "dm-gear", children: _jsx(Cog, {}) }), _jsxs("div", { children: [_jsx("h1", { children: "Desempenho de M\u00E1quina" }), _jsx("p", { children: "Tempo produzido, parado e produtividade por m\u00E1quina" })] })] }), _jsxs("div", { className: "dm-actions", children: [_jsxs("button", { className: "dm-btn primary", onClick: () => setImportOpen(true), children: [_jsx(FileSpreadsheet, {}), " Importar Produ\u00E7\u00E3o"] }), _jsxs("button", { className: "dm-btn primary", onClick: () => setSetupOpen(true), children: [_jsx(Timer, {}), " Importar Setup"] }), _jsxs("button", { className: "dm-btn print-hide", onClick: handlePrint, children: [_jsx(Printer, {}), " Imprimir"] }), _jsx(DayFilter, { selectedDays: selectedDays, onSelect: setSelectedDays, triggerClassName: "dm-filter" })] })] }), _jsx("div", { className: "print-hide", children: _jsx(DesempenhoPorMaquina, { records: filtered }) }), _jsx("div", { className: "desempenho-print-root", children: _jsx(DesempenhoTable, { records: filtered, onSaved: load }) }), _jsx(ImportDesempenhoDialog, { open: importOpen, onOpenChange: setImportOpen, onImported: async (data) => {
                            await load();
                            if (data?.datas?.length) {
                                setSelectedDays((prev) => Array.from(new Set([...data.datas, ...prev])).sort());
                            }
                        } }), _jsx(ImportSetupDialog, { open: setupOpen, onOpenChange: setSetupOpen, onImported: async (data) => {
                            await load();
                            if (data?.datas?.length) {
                                setSelectedDays((prev) => Array.from(new Set([...data.datas, ...prev])).sort());
                            }
                        } })] })] }));
}
