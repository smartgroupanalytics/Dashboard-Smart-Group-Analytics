import React from "react";
import { fmtMeters } from "@/lib/format";

function Row({ label, value, target }) {
  const pct = target ? ((value - target) / target) * 100 : 0;
  const above = pct >= 0;
  const fillPct = Math.min(Math.max(target ? (value / target) * 100 : 0, 0), 100);
  const pctLabel = `${above ? "+" : "-"}${Math.abs(pct).toFixed(1).replace(".", ",")}% ${above ? "acima" : "abaixo"}`;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[16px] leading-[1.3] font-bold text-slate-600 max-w-[150px]">{label}</div>
        <div className="text-[32px] leading-none font-extrabold tracking-tight text-slate-900 whitespace-nowrap">
          {fmtMeters(value)}
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="h-[7px] flex-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="meta-fill h-full rounded-full"
            style={{ width: `${fillPct}%`, background: above ? "#00A86B" : "#dc4c4c" }}
          />
        </div>
        <div
          className="text-sm leading-none font-extrabold whitespace-nowrap"
          style={{ color: above ? "#00A86B" : "#dc4c4c" }}
        >
          {pctLabel}
        </div>
      </div>
      <div className="text-[15px] font-semibold -mt-1" style={{ color: "#0000FF" }}>
        Meta: {fmtMeters(target)}
      </div>
    </div>
  );
}

export default function MetaReportCard({ mediaRevisados, media1, metaRevisados, meta1 }) {
  return (
    <div className="h-full bg-white border border-slate-200/80 rounded-2xl shadow-[0_14px_32px_rgba(15,23,42,0.10)] p-4 flex flex-col">
      <style>{`@keyframes metaLoad{from{transform:scaleX(0);opacity:.35}to{transform:scaleX(1);opacity:1}}.meta-fill{transform-origin:left center;animation:metaLoad .8s cubic-bezier(.2,.8,.2,1) both}`}</style>
      <div className="h-full bg-white border border-slate-200 rounded-[14px] p-4 flex flex-col justify-between shadow-[0_6px_18px_rgba(15,23,42,0.07)]">
        <Row label="Média de Metros Revisados" value={mediaRevisados} target={metaRevisados} />
        <div className="h-px bg-slate-100" />
        <Row label="Média de Metros de 1°" value={media1} target={meta1} />
      </div>
    </div>
  );
}