import React from "react";
import { FileSpreadsheet, Gauge as GaugeIcon, Download, Trash2, Loader2 } from "lucide-react";

export default function MachineCard({ maquina, records, active, onSelect, onImport, onClear, clearing, onRelatorio, relatorioAtivo }) {
  const retrabalhos = records.filter((r) => r.is_retrabalho);
  const retrMetros = retrabalhos.reduce((s, r) => s + (r.metragem || 0), 0);

  return (
    <article
      className={`ce-machine ${active ? "active" : ""}`}
      tabIndex={0}
      onClick={onSelect}
    >
      <div className="ce-machine-top">
        <div className="ce-machine-icon">
          <GaugeIcon className="w-[18px] h-[18px]" />
        </div>
        <h3>{maquina}</h3>
        <button
          type="button"
          title={`Limpar dados de ${maquina}`}
          aria-label={`Limpar dados de ${maquina}`}
          disabled={clearing}
          className="ml-auto inline-flex h-6 items-center justify-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 text-[9px] font-extrabold text-rose-600 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-35"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
        >
          {clearing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          {clearing ? "Limpando" : "Limpar"}
        </button>
      </div>
      {retrabalhos.length > 0 && (
        <div className="ce-machine-alert">
          {retrabalhos.length} retrabalho{retrabalhos.length > 1 ? "s" : ""} • {retrMetros.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} m
        </div>
      )}
      <div className="ce-machine-actions">
        <button
          className={`ce-mini ${relatorioAtivo ? "active-report" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onRelatorio(maquina);
          }}
        >
          <Download className="w-3 h-3" /> Relatório
        </button>
        <button
          className="ce-mini primary"
          onClick={(e) => {
            e.stopPropagation();
            onImport();
          }}
        >
          <FileSpreadsheet className="w-3 h-3" /> Importar
        </button>
      </div>
    </article>
  );
}