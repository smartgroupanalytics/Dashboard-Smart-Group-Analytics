import React from "react";

export default function InsumosOpDetail({ rows, className = "" }) {
  const fmtNum = (v) => (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtCurrency = (v) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const overClass = (realizado, previsto) => realizado > previsto ? "text-rose-600 font-bold" : "text-slate-700";

  const isNaoPrevisto = (r) => {
    const v = String(r.previsto || "").toLowerCase().trim();
    return v === "nao previsto" || v === "não previsto" || v === "naoprevisto" || v === "n";
  };

  return (
    <tr className={`border-b border-slate-200 ${className}`}>
      <td colSpan={6} className="p-0">
        <div className="bg-slate-50 px-4 py-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 text-xs uppercase tracking-wide border-b border-slate-200">
                <th className="px-2 py-1.5 text-left font-semibold">Insumo</th>
                <th className="px-2 py-1.5 text-right font-semibold whitespace-nowrap">Qtde Prevista</th>
                <th className="px-2 py-1.5 text-right font-semibold whitespace-nowrap">Qtde Realizada</th>
                <th className="px-2 py-1.5 text-right font-semibold whitespace-nowrap">Valor Previsto</th>
                <th className="px-2 py-1.5 text-right font-semibold whitespace-nowrap">Valor Realizado</th>
                <th className="px-2 py-1.5 text-center font-semibold whitespace-nowrap">Previsto</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const foraFormulacao = (!r.qtde_prevista || r.qtde_prevista === 0) && (r.qtde_realizada || 0) > 0;
                const naoPrev = isNaoPrevisto(r);
                const insumoLabel = naoPrev
                  ? (r.descricao_nao_previsto || r.descricao_insumo || "—")
                  : foraFormulacao
                    ? (r.descricao_produto || r.descricao_insumo || "—")
                    : (r.descricao_insumo || "—");
                return (
                  <tr key={r.id || i} className={`border-b border-slate-100 hover:bg-slate-100 ${foraFormulacao ? "bg-amber-50" : ""} ${naoPrev ? "bg-rose-50" : ""}`}>
                    <td className="px-2 py-1.5 text-slate-700 max-w-[320px] truncate" title={insumoLabel}>
                      {foraFormulacao && (
                        <span className="inline-block mr-1.5 px-1.5 py-0.5 rounded bg-amber-200 text-amber-800 text-[10px] font-bold uppercase whitespace-nowrap">Fora Formulação</span>
                      )}
                      {insumoLabel}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-700 whitespace-nowrap">{fmtNum(r.qtde_prevista)}</td>
                    <td className={`px-2 py-1.5 text-right tabular-nums whitespace-nowrap ${overClass(r.qtde_realizada, r.qtde_prevista)}`}>{fmtNum(r.qtde_realizada)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-700 whitespace-nowrap">{fmtCurrency(r.valor_previsto)}</td>
                    <td className={`px-2 py-1.5 text-right tabular-nums whitespace-nowrap ${overClass(r.valor_realizado, r.valor_previsto)}`}>
                      {fmtCurrency(naoPrev && r.valor_realizado_nao_previsto ? r.valor_realizado_nao_previsto : r.valor_realizado)}
                    </td>
                    <td className="px-2 py-1.5 text-center whitespace-nowrap">
                      {r.previsto ? (
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${naoPrev ? "bg-rose-200 text-rose-800" : "bg-emerald-200 text-emerald-800"}`}>
                          {naoPrev ? "Não" : "Sim"}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  );
}