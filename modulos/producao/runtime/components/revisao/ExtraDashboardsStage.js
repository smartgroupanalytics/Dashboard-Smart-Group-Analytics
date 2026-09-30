import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import Produtividade from "@/pages/Produtividade";
import Disponibilidade from "@/pages/Disponibilidade";
import TempoOcioso from "@/pages/TempoOcioso";
import CargaMaquina from "@/pages/CargaMaquina";
import ControlePedidos from "@/pages/ControlePedidos";
import Rotatividade from "@/pages/Rotatividade";
import RelatorioProgramarPrint from "@/components/carteira/RelatorioProgramarPrint";
const STAGE_STYLE = {
    position: "fixed",
    left: "-10000px",
    top: 0,
    width: "1280px",
    pointerEvents: "none",
};
// Renderiza os dashboards extras offscreen apenas para captura no PDF de apresentação.
export default function ExtraDashboardsStage({ show, refProdutividade, refDisponibilidade, refTempoOcioso, refRelatorioProgramar, refControlePedidos, refCargaMaquina, refRotatividade, }) {
    if (!show)
        return null;
    return (_jsxs(_Fragment, { children: [_jsx("div", { ref: refProdutividade, "aria-hidden": "true", style: { ...STAGE_STYLE, background: "#F4F7FC" }, children: _jsx(Produtividade, {}) }), _jsx("div", { ref: refDisponibilidade, "aria-hidden": "true", style: { ...STAGE_STYLE, background: "#ffffff" }, children: _jsx(Disponibilidade, {}) }), _jsx("div", { ref: refTempoOcioso, "aria-hidden": "true", style: { ...STAGE_STYLE, background: "#ffffff" }, children: _jsx(TempoOcioso, {}) }), _jsx("div", { ref: refRelatorioProgramar, "aria-hidden": "true", style: { ...STAGE_STYLE, background: "#ffffff" }, children: _jsx(RelatorioProgramarPrint, {}) }), _jsx("div", { ref: refControlePedidos, "aria-hidden": "true", style: { ...STAGE_STYLE, background: "#ffffff" }, children: _jsx(ControlePedidos, {}) }), _jsx("div", { ref: refCargaMaquina, "aria-hidden": "true", style: { ...STAGE_STYLE, background: "#F8F9FC" }, children: _jsx(CargaMaquina, {}) }), _jsx("div", { ref: refRotatividade, "aria-hidden": "true", style: { ...STAGE_STYLE, background: "#ffffff" }, children: _jsx(Rotatividade, {}) })] }));
}
