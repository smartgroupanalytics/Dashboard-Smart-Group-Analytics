import React from "react";
import { Card } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

const fmt = (v) =>
  v == null
    ? "—"
    : v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function PerdaOpCards({ perda2025, perda2026 }) {
  const hasData =
    perda2025 != null && perda2026 != null && Number(perda2025) !== 0;
  const diff = hasData ? ((perda2026 - perda2025) / perda2025) * 100 : null;
  const DiffIcon = diff == null ? Minus : diff < 0 ? TrendingDown : TrendingUp;
  // perda menor em 2026 (diff negativo) é bom -> verde; maior -> vermelho
  const diffColor = diff == null ? "#64748b" : diff < 0 ? "#00A86B" : "#dc2626";

  return (
    <>
      <Card className="p-4 flex flex-col justify-between bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "#007BFF" }} />
          <p className="text-xs font-semibold text-slate-600">Média de Perda por OP 2025</p>
        </div>
        <div className="mt-2">
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums leading-none">{fmt(perda2025)}</p>
          <p className="text-[11px] text-slate-400 mt-1">média por OP</p>
        </div>
      </Card>

      <Card className="p-4 flex flex-col justify-between bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "#00A86B" }} />
          <p className="text-xs font-semibold text-slate-600">Média de Perda por OP 2026</p>
        </div>
        <div className="mt-2">
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums leading-none">{fmt(perda2026)}</p>
          <p className="text-[11px] text-slate-400 mt-1">média por OP</p>
        </div>
      </Card>

      <Card className="p-4 flex items-center justify-between bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] rounded-2xl sm:col-span-2">
        <p className="text-xs font-semibold text-slate-600">Diferença percentual</p>
        <div className="flex items-center gap-1.5">
          <DiffIcon className="w-4 h-4" style={{ color: diffColor }} />
          <span className="text-lg font-extrabold tabular-nums" style={{ color: diffColor }}>
            {diff == null
              ? "—"
              : (diff > 0 ? "+" : "") + diff.toFixed(1).replace(".", ",") + "%"}
          </span>
        </div>
      </Card>
    </>
  );
}