import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, } from "recharts";
import { Card } from "@/components/ui/card";
import { MACHINE_SPEEDS, tempoEsperadoHoras } from "@/lib/controleSpeed";
export default function ControleComparativoGeral({ records }) {
    const data = useMemo(() => {
        return Object.keys(MACHINE_SPEEDS).map((m) => {
            const rows = records.filter((r) => r.maquina === m);
            const real = rows.reduce((s, r) => s + (r.tempo || 0), 0);
            const esperado = rows.reduce((s, r) => s + tempoEsperadoHoras(r.metragem, m, r.processo), 0);
            return {
                maquina: m,
                "Tempo Previsto": Number(esperado.toFixed(2)),
                "Tempo Realizado": Number(real.toFixed(2)),
            };
        }).filter((d) => d["Tempo Previsto"] > 0 || d["Tempo Realizado"] > 0);
    }, [records]);
    if (data.length === 0)
        return null;
    return (_jsxs(Card, { className: "p-5 mb-6", children: [_jsx("h3", { className: "text-sm font-semibold mb-1", children: "Comparativo Geral \u2014 Tempo Previsto vs Realizado" }), _jsx("p", { className: "text-[11px] text-muted-foreground mb-4", children: "Soma do tempo previsto (metragem \u00F7 velocidade) vs tempo realizado (registrado) por m\u00E1quina." }), _jsx("div", { className: "w-full h-72", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: data, margin: { top: 8, right: 16, left: 0, bottom: 8 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", vertical: false, stroke: "#e2e8f0" }), _jsx(XAxis, { dataKey: "maquina", tick: { fontSize: 11 } }), _jsx(YAxis, { tick: { fontSize: 11 }, unit: " h" }), _jsx(Tooltip, { formatter: (v) => v + " h", contentStyle: { fontSize: 12, borderRadius: 8 } }), _jsx(Legend, { wrapperStyle: { fontSize: 12 } }), _jsx(Bar, { dataKey: "Tempo Previsto", fill: "#3b82f6", radius: [4, 4, 0, 0] }), _jsx(Bar, { dataKey: "Tempo Realizado", fill: "#f97316", radius: [4, 4, 0, 0] })] }) }) })] }));
}
