import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { FileSpreadsheet, Gauge as GaugeIcon, Download, Trash2, Loader2 } from "lucide-react";
export default function MachineCard({ maquina, records, active, onSelect, onImport, onClear, clearing, onRelatorio, relatorioAtivo }) {
    const retrabalhos = records.filter((r) => r.is_retrabalho);
    const retrMetros = retrabalhos.reduce((s, r) => s + (r.metragem || 0), 0);
    return (_jsxs("article", { className: `ce-machine ${active ? "active" : ""}`, tabIndex: 0, onClick: onSelect, children: [_jsxs("div", { className: "ce-machine-top", children: [_jsx("div", { className: "ce-machine-icon", children: _jsx(GaugeIcon, { className: "w-[18px] h-[18px]" }) }), _jsx("h3", { children: maquina }), _jsxs("button", { type: "button", title: `Limpar dados de ${maquina}`, "aria-label": `Limpar dados de ${maquina}`, disabled: clearing, className: "ml-auto inline-flex h-6 items-center justify-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 text-[9px] font-extrabold text-rose-600 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-35", onClick: (e) => {
                            e.stopPropagation();
                            onClear();
                        }, children: [clearing ? _jsx(Loader2, { className: "w-3 h-3 animate-spin" }) : _jsx(Trash2, { className: "w-3 h-3" }), clearing ? "Limpando" : "Limpar"] })] }), retrabalhos.length > 0 && (_jsxs("div", { className: "ce-machine-alert", children: [retrabalhos.length, " retrabalho", retrabalhos.length > 1 ? "s" : "", " \u2022 ", retrMetros.toLocaleString("pt-BR", { maximumFractionDigits: 0 }), " m"] })), _jsxs("div", { className: "ce-machine-actions", children: [_jsxs("button", { className: `ce-mini ${relatorioAtivo ? "active-report" : ""}`, onClick: (e) => {
                            e.stopPropagation();
                            onRelatorio(maquina);
                        }, children: [_jsx(Download, { className: "w-3 h-3" }), " Relat\u00F3rio"] }), _jsxs("button", { className: "ce-mini primary", onClick: (e) => {
                            e.stopPropagation();
                            onImport();
                        }, children: [_jsx(FileSpreadsheet, { className: "w-3 h-3" }), " Importar"] })] })] }));
}
