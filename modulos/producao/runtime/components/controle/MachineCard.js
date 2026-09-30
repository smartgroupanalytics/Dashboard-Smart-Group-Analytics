import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { FileSpreadsheet, Gauge as GaugeIcon, Download } from "lucide-react";
export default function MachineCard({ maquina, records, active, onSelect, onImport, onRelatorio, relatorioAtivo }) {
    const retrabalhos = records.filter((r) => r.is_retrabalho);
    const retrMetros = retrabalhos.reduce((s, r) => s + (r.metragem || 0), 0);
    return (_jsxs("article", { className: `ce-machine ${active ? "active" : ""}`, tabIndex: 0, onClick: onSelect, children: [_jsxs("div", { className: "ce-machine-top", children: [_jsx("div", { className: "ce-machine-icon", children: _jsx(GaugeIcon, { className: "w-[18px] h-[18px]" }) }), _jsx("h3", { children: maquina })] }), retrabalhos.length > 0 && (_jsxs("div", { className: "ce-machine-alert", children: [retrabalhos.length, " retrabalho", retrabalhos.length > 1 ? "s" : "", " \u2022 ", retrMetros.toLocaleString("pt-BR", { maximumFractionDigits: 0 }), " m"] })), _jsxs("div", { className: "ce-machine-actions", children: [_jsxs("button", { className: `ce-mini ${relatorioAtivo ? "active-report" : ""}`, onClick: (e) => {
                            e.stopPropagation();
                            onRelatorio(maquina);
                        }, children: [_jsx(Download, { className: "w-3 h-3" }), " Relat\u00F3rio"] }), _jsxs("button", { className: "ce-mini primary", onClick: (e) => {
                            e.stopPropagation();
                            onImport();
                        }, children: [_jsx(FileSpreadsheet, { className: "w-3 h-3" }), " Importar"] })] })] }));
}
