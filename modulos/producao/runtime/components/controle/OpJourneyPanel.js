import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo } from "react";
import { X, MapPin, Clock, Package, AlertTriangle, Cog } from "lucide-react";
import { tempoEsperadoHoras, tempoRealHoras } from "@/lib/controleSpeed";
function fmtHoras(v) {
    if (!v && v !== 0)
        return "00:00";
    const abs = Math.abs(v);
    const h = Math.floor(abs);
    const m = Math.round((abs - h) * 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function fmtNum(n) {
    return (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtDate(d) {
    if (!d)
        return "—";
    const [y, m, dd] = d.split("-");
    return `${dd}/${m}/${y}`;
}
export default function OpJourneyPanel({ op, records, onClose }) {
    // Agrupa por máquina
    const byMachine = useMemo(() => {
        const map = {};
        records.forEach((r) => {
            if (!r.maquina)
                return;
            if (!map[r.maquina])
                map[r.maquina] = [];
            map[r.maquina].push(r);
        });
        return Object.entries(map).sort((a, b) => {
            const aDate = a[1][0]?.data || "";
            const bDate = b[1][0]?.data || "";
            return aDate.localeCompare(bDate);
        });
    }, [records]);
    const totais = useMemo(() => {
        let tempo = 0;
        let metros = 0;
        let setups = 0;
        let paradas = 0;
        let retrabalhos = 0;
        records.forEach((r) => {
            tempo += r.tempo > 0 ? r.tempo : tempoRealHoras(r.hora_inicial, r.hora_final);
            metros += r.metragem || 0;
            setups += r.setup || 0;
            paradas += r.parada || 0;
            if (r.is_retrabalho)
                retrabalhos += 1;
        });
        return { tempo, metros, setups, paradas, retrabalhos };
    }, [records]);
    const datasUnicas = useMemo(() => {
        const set = new Set(records.map((r) => r.data).filter(Boolean));
        return [...set].sort();
    }, [records]);
    return (_jsxs("div", { className: "ce-op-journey", children: [_jsxs("div", { className: "ce-op-journey-head", children: [_jsxs("div", { className: "ce-op-journey-title", children: [_jsx("div", { className: "ce-op-journey-mark", children: _jsx(MapPin, { className: "w-5 h-5" }) }), _jsxs("div", { children: [_jsxs("h3", { children: ["Trajeto da OP ", _jsx("span", { className: "ce-op-journey-num", children: op })] }), _jsxs("p", { children: [byMachine.length, " m\u00E1quina(s) \u00B7 ", records.length, " registro(s) \u00B7", " ", datasUnicas.length === 1
                                                ? fmtDate(datasUnicas[0])
                                                : `${fmtDate(datasUnicas[0])} → ${fmtDate(datasUnicas[datasUnicas.length - 1])}`] })] })] }), _jsxs("button", { className: "ce-op-journey-close", onClick: onClose, children: [_jsx(X, { className: "w-4 h-4" }), " Fechar busca"] })] }), _jsxs("div", { className: "ce-op-journey-totals", children: [_jsxs("div", { className: "ce-op-journey-stat", children: [_jsx(Clock, { className: "w-4 h-4 text-cyan-600" }), _jsxs("div", { children: [_jsx("p", { children: "Tempo Total" }), _jsx("strong", { children: fmtHoras(totais.tempo) })] })] }), _jsxs("div", { className: "ce-op-journey-stat", children: [_jsx(Package, { className: "w-4 h-4 text-emerald-600" }), _jsxs("div", { children: [_jsx("p", { children: "Metragem" }), _jsxs("strong", { children: [fmtNum(totais.metros), " m"] })] })] }), _jsxs("div", { className: "ce-op-journey-stat", children: [_jsx(Cog, { className: "w-4 h-4 text-blue-600" }), _jsxs("div", { children: [_jsx("p", { children: "Setup" }), _jsxs("strong", { children: [fmtNum(totais.setups), " min"] })] })] }), _jsxs("div", { className: "ce-op-journey-stat", children: [_jsx(AlertTriangle, { className: "w-4 h-4 text-amber-600" }), _jsxs("div", { children: [_jsx("p", { children: "Parada" }), _jsxs("strong", { children: [fmtNum(totais.paradas), " min"] })] })] }), totais.retrabalhos > 0 && (_jsxs("div", { className: "ce-op-journey-stat ce-op-journey-stat-retrab", children: [_jsx(AlertTriangle, { className: "w-4 h-4 text-rose-600" }), _jsxs("div", { children: [_jsx("p", { children: "Retrabalhos" }), _jsx("strong", { children: totais.retrabalhos })] })] }))] }), _jsx("div", { className: "ce-op-journey-machines", children: byMachine.map(([maquina, recs]) => {
                    const tempoMaq = recs.reduce((s, r) => s + (r.tempo > 0 ? r.tempo : tempoRealHoras(r.hora_inicial, r.hora_final)), 0);
                    const metrosMaq = recs.reduce((s, r) => s + (r.metragem || 0), 0);
                    const temRetrab = recs.some((r) => r.is_retrabalho);
                    return (_jsxs("div", { className: "ce-op-journey-machine", children: [_jsxs("div", { className: "ce-op-journey-machine-head", children: [_jsxs("div", { className: "ce-op-journey-machine-name", children: [_jsx(Cog, { className: "w-4 h-4" }), _jsx("span", { children: maquina }), temRetrab && _jsx("span", { className: "ce-op-journey-badge", children: "Retrabalho" })] }), _jsxs("div", { className: "ce-op-journey-machine-stats", children: [_jsxs("span", { children: [_jsx(Clock, { className: "w-3 h-3" }), " ", fmtHoras(tempoMaq)] }), _jsxs("span", { children: [_jsx(Package, { className: "w-3 h-3" }), " ", fmtNum(metrosMaq), " m"] }), _jsxs("span", { className: "ce-op-journey-count", children: [recs.length, " reg."] })] })] }), _jsx("div", { className: "ce-op-journey-records", children: recs.map((r) => (_jsxs("div", { className: "ce-op-journey-record", children: [_jsx("span", { className: "ce-op-journey-date", children: fmtDate(r.data) }), _jsx("span", { className: "ce-op-journey-prod", title: r.descricao_produto, children: r.descricao_produto || "—" }), _jsx("span", { className: "ce-op-journey-time", children: fmtHoras(r.tempo > 0 ? r.tempo : tempoRealHoras(r.hora_inicial, r.hora_final)) }), _jsxs("span", { className: "ce-op-journey-meters", children: [fmtNum(r.metragem || 0), " m"] }), r.is_retrabalho && _jsx("span", { className: "ce-op-journey-tag", children: "Retrab." })] }, r.id))) })] }, maquina));
                }) })] }));
}
