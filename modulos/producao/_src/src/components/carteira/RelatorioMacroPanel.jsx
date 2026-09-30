import React from "react";

function fmtNum(n) {
  return (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtPct(n) {
  return (n || 0).toFixed(1).replace(".", ",") + "%";
}

// Palavras-chave de cada macro-categoria
const MACROS = [
  {
    nome: "Desenvolvimento / Engenharia",
    keywords: ["REDESENVOLVIMENTO", "ENGENHARIA"],
    color: "#1D2436",
    bg: "#F0F1F4",
    border: "#D1D5DB",
  },
  {
    nome: "Compras / Logística",
    keywords: ["COMPRAS E LOGÍSTICA", "COMPRAS E LOGISTICA", "LOGÍSTICA", "LOGISTICA", "TRANSFER", "BASE", "FILME"],
    color: "#B45309",
    bg: "#FEF6EE",
    border: "#E5D3C0",
  },
  {
    nome: "Comercial",
    keywords: ["COMERCIAL", "LIBERAR", "PEDIDO"],
    color: "#047857",
    bg: "#EDF8F2",
    border: "#C4E5D5",
  },
  {
    nome: "PCP",
    keywords: ["PCP", "RETRABALHAR", "SALDO EM ESTOQUE"],
    color: "#1D4ED8",
    bg: "#EFF6FF",
    border: "#BFDBFE",
  },
];

export default function RelatorioMacroPanel({ grupos, totalMetros }) {
  const macros = MACROS.map((m) => {
    const motivosIn = grupos.filter((g) => {
      const up = g.motivo.toUpperCase();
      return m.keywords.some((k) => up.includes(k));
    });
    const metros = motivosIn.reduce((s, g) => s + g.metros, 0);
    const pct = totalMetros > 0 ? (metros / totalMetros) * 100 : 0;
    return { ...m, metros, pct, motivos: motivosIn };
  });

  return (
    <div className="w-72 shrink-0 space-y-3">
      {macros.map((m, i) => (
        <div
          key={i}
          className="rounded-lg border p-4"
          style={{ background: m.bg, borderColor: m.border }}
        >
          <h4 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: m.color }}>
            {m.nome}
          </h4>
          <div className="flex items-end justify-between mb-2">
            <span className="text-2xl font-extrabold tabular-nums text-slate-900">{fmtNum(m.metros)}</span>
            <span className="text-sm font-bold tabular-nums" style={{ color: m.color }}>{fmtPct(m.pct)}</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#E0E4E7" }}>
            <div className="h-full rounded-full" style={{ width: `${Math.max(m.pct, 0)}%`, background: m.color }} />
          </div>
          {m.motivos.length > 0 && (
            <ul className="mt-3 space-y-1">
              {m.motivos.map((g, j) => (
                <li key={j} className="text-xs text-slate-600 flex justify-between gap-2">
                  <span className="leading-tight">{g.motivo}</span>
                  <span className="font-semibold tabular-nums whitespace-nowrap">{fmtNum(g.metros)} m</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}