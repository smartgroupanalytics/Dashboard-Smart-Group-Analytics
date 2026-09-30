import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo } from "react";
import { tempoOciosoTempoReal } from "@/lib/tempoOcioso";
import { useTempoReal } from "@/hooks/useTempoReal";
const MACHINES = ["JR", "Gravadora", "Estampa 1", "Estampa 2", "Digital Solvente", "Digital UV", "GR2"];
function fmtHoras(v) {
    const totalMin = Math.round((v || 0) * 60);
    const h = Math.floor(totalMin / 60);
    const min = Math.abs(totalMin) % 60;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
export default function DesempenhoPorMaquina({ records }) {
    const now = useTempoReal();
    const porMaquina = useMemo(() => {
        const map = {};
        MACHINES.forEach((m) => { map[m] = { produzindo: 0, parado: 0 }; });
        records.forEach((r) => {
            if (map[r.maquina]) {
                map[r.maquina].produzindo += (r.tempo_produzido || 0) + (r.retrabalho || 0);
                // Sem apontamento de produção, setup nem amostras → tempo ocioso em tempo real
                const semApontamento = (r.tempo_produzido || 0) === 0 && (r.setup || 0) === 0 && (r.amostras || 0) === 0;
                const ocioso = semApontamento
                    ? tempoOciosoTempoReal(r.maquina, r.data)
                    : (r.tempo_ocioso || 0);
                map[r.maquina].parado += (r.tempo_parado || 0) + (r.setup || 0) + (r.amostras || 0) + ocioso;
            }
        });
        return map;
    }, [records, now]);
    return (_jsx("section", { className: "dm-machine-grid", children: MACHINES.map((m) => (_jsxs("article", { className: "dm-machine-card", children: [_jsx("div", { className: "dm-machine-name", children: m }), _jsx("div", { className: "dm-rule" }), _jsxs("div", { className: "dm-metric-label", children: [_jsx("i", {}), " Tempo Produzindo"] }), _jsx("div", { className: "dm-metric", children: fmtHoras(porMaquina[m].produzindo) }), _jsxs("div", { className: "dm-metric-label stop", children: [_jsx("i", {}), " Tempo Parado"] }), _jsx("div", { className: "dm-metric stop", children: fmtHoras(porMaquina[m].parado) })] }, m))) }));
}
