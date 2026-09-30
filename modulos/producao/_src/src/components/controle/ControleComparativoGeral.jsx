import React, { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
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

  if (data.length === 0) return null;

  return (
    <Card className="p-5 mb-6">
      <h3 className="text-sm font-semibold mb-1">Comparativo Geral — Tempo Previsto vs Realizado</h3>
      <p className="text-[11px] text-muted-foreground mb-4">
        Soma do tempo previsto (metragem ÷ velocidade) vs tempo realizado (registrado) por máquina.
      </p>
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="maquina" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit=" h" />
            <Tooltip formatter={(v) => v + " h"} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Tempo Previsto" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Tempo Realizado" fill="#f97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}