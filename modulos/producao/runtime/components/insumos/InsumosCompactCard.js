import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
export default function InsumosCompactCard({ label, value, type = "number", delay = 0, white = false, variant = "default", actionIcon: ActionIcon, onAction, icon: Icon, tone = "values" }) {
    const isDensa = variant === "densa";
    const isPastel = variant === "pastel";
    const isCobalt = variant === "cobalt";
    const formatValue = () => {
        if (value == null)
            return "—";
        if (type === "currency")
            return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        if (type === "percentage")
            return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
        if (type === "integer")
            return value.toLocaleString("pt-BR");
        return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    const isWarn = type === "difference" || type === "percentage";
    if (isPastel) {
        return (_jsxs("article", { className: "iq-metric", style: { animationDelay: `${delay}s` }, children: [_jsxs("div", { className: "iq-metric-label", children: [Icon && (_jsx("span", { className: "iq-metric-icon", children: _jsx(Icon, {}) })), label] }), _jsx("strong", { className: isWarn ? "iq-warning" : "", children: formatValue() }), ActionIcon && onAction && (_jsx("button", { type: "button", onClick: (e) => { e.stopPropagation(); onAction(); }, className: "absolute bottom-1.5 right-1.5 grid place-items-center w-5 h-5 rounded-md bg-violet-600 text-white hover:bg-violet-700 transition-colors", title: "Ver relat\u00F3rio", children: _jsx(ActionIcon, { className: "w-3 h-3" }) }))] }));
    }
    if (isCobalt) {
        return (_jsxs("article", { className: "bc-card", style: { animationDelay: `${delay}s` }, children: [_jsx("span", { className: "bc-label", children: label }), _jsx("strong", { className: "bc-value", style: { animationDelay: `${delay + 0.08}s` }, children: formatValue() }), ActionIcon && onAction && (_jsx("button", { type: "button", onClick: (e) => { e.stopPropagation(); onAction(); }, className: "absolute bottom-1.5 right-1.5 grid place-items-center w-5 h-5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors", title: "Ver relat\u00F3rio", children: _jsx(ActionIcon, { className: "w-3 h-3" }) }))] }));
    }
    if (isDensa) {
        return (_jsxs("article", { className: "densa-card relative min-w-0 min-h-[72px] p-2.5 rounded-[10px] border border-blue-200 bg-white transition-all duration-[180ms] shadow-[0_4px_12px_rgba(30,64,175,0.08)] hover:bg-[#f8fbff] hover:shadow-[0_7px_16px_rgba(37,99,235,0.16)] active:shadow-[0_2px_7px_rgba(37,99,235,0.12)] flex flex-col justify-between", style: { animation: `insumos-grid-in 0.55s both ${delay}s` }, children: [_jsx("span", { className: "text-[11px] leading-[1.15] uppercase tracking-[0.055em] text-slate-500 font-extrabold", children: label }), _jsx("strong", { className: `mt-[7px] text-[19px] leading-[1.05] font-extrabold tracking-[-0.035em] whitespace-nowrap ${isWarn ? "text-blue-700" : "text-slate-800"}`, children: formatValue() }), ActionIcon && onAction && (_jsx("button", { type: "button", onClick: (e) => { e.stopPropagation(); onAction(); }, className: "absolute bottom-1 right-1 grid place-items-center w-5 h-5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors", title: "Ver relat\u00F3rio", children: _jsx(ActionIcon, { className: "w-3 h-3" }) }))] }));
    }
    return (_jsxs("article", { className: "relative min-w-0 min-h-[91px] p-3 rounded-[10px] border border-slate-300 shadow-sm flex flex-col justify-between", style: {
            background: white ? "rgba(255,255,255,0.9)" : "linear-gradient(145deg, #ffffff, #e9eef4)",
            animation: `insumos-rise 0.55s both ${delay}s`,
        }, children: [_jsx("span", { className: "text-[11px] leading-[1.2] uppercase tracking-[0.06em] text-slate-500 font-extrabold", children: label }), _jsx("strong", { className: `text-[21px] leading-[1.1] font-extrabold tracking-[-0.03em] whitespace-nowrap ${isWarn ? "text-amber-700" : "text-slate-800"}`, children: formatValue() }), ActionIcon && onAction && (_jsx("button", { type: "button", onClick: (e) => { e.stopPropagation(); onAction(); }, className: "absolute bottom-1 right-1 grid place-items-center w-5 h-5 rounded-md bg-slate-700 text-white hover:bg-slate-800 transition-colors", title: "Ver relat\u00F3rio", children: _jsx(ActionIcon, { className: "w-3 h-3" }) }))] }));
}
