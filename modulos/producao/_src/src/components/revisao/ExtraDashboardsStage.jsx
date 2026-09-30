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
export default function ExtraDashboardsStage({
  show,
  refProdutividade,
  refDisponibilidade,
  refTempoOcioso,
  refRelatorioProgramar,
  refControlePedidos,
  refCargaMaquina,
  refRotatividade,
}) {
  if (!show) return null;
  return (
    <>
      <div ref={refProdutividade} aria-hidden="true" style={{ ...STAGE_STYLE, background: "#F4F7FC" }}>
        <Produtividade />
      </div>
      <div ref={refDisponibilidade} aria-hidden="true" style={{ ...STAGE_STYLE, background: "#ffffff" }}>
        <Disponibilidade />
      </div>
      <div ref={refTempoOcioso} aria-hidden="true" style={{ ...STAGE_STYLE, background: "#ffffff" }}>
        <TempoOcioso />
      </div>
      <div ref={refRelatorioProgramar} aria-hidden="true" style={{ ...STAGE_STYLE, background: "#ffffff" }}>
        <RelatorioProgramarPrint />
      </div>
      <div ref={refControlePedidos} aria-hidden="true" style={{ ...STAGE_STYLE, background: "#ffffff" }}>
        <ControlePedidos />
      </div>
      <div ref={refCargaMaquina} aria-hidden="true" style={{ ...STAGE_STYLE, background: "#F8F9FC" }}>
        <CargaMaquina />
      </div>
      <div ref={refRotatividade} aria-hidden="true" style={{ ...STAGE_STYLE, background: "#ffffff" }}>
        <Rotatividade />
      </div>
    </>
  );
}