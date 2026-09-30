const db = globalThis.__SMART_PRODUCAO_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useMemo } from "react";

import RelatorioMacroPanel from "./RelatorioMacroPanel";

const TEAL = "#008B8B";

function fmtNum(n) {
  return (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtPct(n) {
  return (n || 0).toFixed(1).replace(".", ",") + "%";
}

// Versão standalone (sem Dialog) do Relatório a Programar para captura offscreen no PDF.
export default function RelatorioProgramarPrint() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await db.entities.ItemProgramar.list("-created_date", 500);
        if (active) setItems(data);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const grupos = useMemo(() => {
    const map = {};
    for (const it of items) {
      const m = (it.motivo || "Sem motivo").trim();
      if (!map[m]) map[m] = { motivo: m, metros: 0, ops: [] };
      map[m].metros += it.metragem || 0;
      map[m].ops.push(it);
    }
    return Object.values(map).sort((a, b) => b.metros - a.metros);
  }, [items]);

  const totalMetros = grupos.reduce((s, g) => s + g.metros, 0);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Relatório a Programar</h1>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="relatorio-programar-root">
            <div className="flex items-center justify-between px-1 pb-3">
              <p className="text-base text-slate-500">
                Total: <span className="font-bold text-slate-900">{fmtNum(totalMetros)} m</span> · {grupos.length} motivo(s)
              </p>
            </div>
            <div className="flex gap-4">
              <div className="flex-1 overflow-auto">
                <table className="w-full text-base border-collapse">
                  <thead>
                    <tr className="text-white" style={{ background: TEAL }}>
                      <th className="px-4 py-3 text-right font-bold whitespace-nowrap rounded-tl-lg">Metros</th>
                      <th className="px-4 py-3 text-left font-bold">Motivo</th>
                      <th className="px-4 py-3 text-right font-bold rounded-tr-lg w-24">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupos.map((g, i) => {
                      const pct = totalMetros > 0 ? (g.metros / totalMetros) * 100 : 0;
                      return (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-900 whitespace-nowrap">{fmtNum(g.metros)}</td>
                          <td className="px-4 py-3 text-slate-800 font-semibold">{g.motivo}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-bold text-[#1e3a8a] whitespace-nowrap">{fmtPct(pct)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {grupos.length > 0 && (
                <RelatorioMacroPanel grupos={grupos} totalMetros={totalMetros} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}