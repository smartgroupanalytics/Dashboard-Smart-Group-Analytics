import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Droplets, Palette, Hash } from "lucide-react";
function normalize(s) {
    return (s || "").toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}
function isPigmentoOrPasta(desc) {
    const n = normalize(desc);
    return ["pigmento", "pasta", "corante", "tinta"].some((kw) => n.includes(kw));
}
function fmtNum(v) {
    return (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtCurrency(v) {
    return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function ConsumoColumn({ title, icon: Icon, items, theme, delay }) {
    const totals = useMemo(() => items.reduce((acc, i) => ({
        count: acc.count + i.count,
        qtde_prevista: acc.qtde_prevista + i.qtde_prevista,
        qtde_realizada: acc.qtde_realizada + i.qtde_realizada,
        valor_previsto: acc.valor_previsto + i.valor_previsto,
        valor_realizado: acc.valor_realizado + i.valor_realizado,
    }), { count: 0, qtde_prevista: 0, qtde_realizada: 0, valor_previsto: 0, valor_realizado: 0 }), [items]);
    const themeMap = {
        blue: {
            headerBg: "from-blue-600 to-blue-800",
            iconBg: "bg-blue-500/30",
            badge: "bg-blue-100 text-blue-700",
            cardBorder: "border-blue-50",
        },
        purple: {
            headerBg: "from-purple-600 to-purple-800",
            iconBg: "bg-purple-500/30",
            badge: "bg-purple-100 text-purple-700",
            cardBorder: "border-purple-50",
        },
    };
    const t = themeMap[theme] || themeMap.blue;
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay }, className: "flex flex-col rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm", children: [_jsxs("div", { className: `bg-gradient-to-r ${t.headerBg} px-5 py-4 flex items-center gap-3`, children: [_jsx("div", { className: `w-10 h-10 rounded-xl ${t.iconBg} grid place-items-center shrink-0`, children: _jsx(Icon, { className: "w-5 h-5 text-white" }) }), _jsxs("div", { className: "min-w-0", children: [_jsx("h3", { className: "text-white font-extrabold text-base truncate", children: title }), _jsxs("p", { className: "text-white/70 text-xs", children: [items.length, " insumo(s) \u2022 ", totals.count, " uso(s)"] })] })] }), _jsx("div", { className: "flex-1 overflow-y-auto max-h-[560px]", children: items.length === 0 ? (_jsxs("div", { className: "text-center py-12 text-slate-400 text-sm", children: [_jsx(Icon, { className: "w-8 h-8 mx-auto mb-2 opacity-40" }), "Nenhum insumo encontrado."] })) : items.map((item, i) => {
                    const difValor = item.valor_realizado - item.valor_previsto;
                    const difQtde = item.qtde_realizada - item.qtde_prevista;
                    return (_jsxs("div", { className: `px-5 py-3.5 border-b ${t.cardBorder} hover:bg-slate-50 transition-colors`, children: [_jsxs("div", { className: "flex items-start justify-between gap-3 mb-2", children: [_jsx("span", { className: "text-sm font-bold text-slate-800 leading-tight flex-1", children: item.descricao }), _jsxs("span", { className: `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${t.badge} whitespace-nowrap shrink-0`, children: [_jsx(Hash, { className: "w-3 h-3" }), item.count, "x"] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-x-4 gap-y-1 text-xs", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-500", children: "Qtde Prev:" }), _jsx("span", { className: "font-semibold text-slate-700 tabular-nums", children: fmtNum(item.qtde_prevista) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-500", children: "Qtde Real:" }), _jsx("span", { className: `font-semibold tabular-nums ${difQtde > 0 ? "text-rose-600" : "text-emerald-600"}`, children: fmtNum(item.qtde_realizada) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-500", children: "Valor Prev:" }), _jsx("span", { className: "font-semibold text-slate-700 tabular-nums", children: fmtCurrency(item.valor_previsto) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-500", children: "Valor Real:" }), _jsx("span", { className: `font-semibold tabular-nums ${difValor > 0 ? "text-rose-600" : "text-emerald-600"}`, children: fmtCurrency(item.valor_realizado) })] })] })] }, i));
                }) }), _jsx("div", { className: "px-5 py-3.5 bg-slate-50 border-t-2 border-slate-200", children: _jsxs("div", { className: "grid grid-cols-2 gap-x-4 gap-y-1 text-xs", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-500 font-semibold", children: "Qtde Prev:" }), _jsx("span", { className: "font-bold text-slate-800 tabular-nums", children: fmtNum(totals.qtde_prevista) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-500 font-semibold", children: "Qtde Real:" }), _jsx("span", { className: "font-bold text-slate-800 tabular-nums", children: fmtNum(totals.qtde_realizada) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-500 font-semibold", children: "Valor Prev:" }), _jsx("span", { className: "font-bold text-slate-800 tabular-nums", children: fmtCurrency(totals.valor_previsto) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-500 font-semibold", children: "Valor Real:" }), _jsx("span", { className: "font-bold text-slate-800 tabular-nums", children: fmtCurrency(totals.valor_realizado) })] })] }) })] }));
}
export default function ConsumoReport({ records }) {
    const { resinas, pigmentos } = useMemo(() => {
        const resinasMap = {};
        const pigmentosMap = {};
        records.forEach((r) => {
            const key = r.descricao_insumo || "(sem insumo)";
            if (key === "(sem insumo)")
                return;
            const isPig = isPigmentoOrPasta(key);
            const map = isPig ? pigmentosMap : resinasMap;
            if (!map[key])
                map[key] = {
                    descricao: key,
                    count: 0,
                    qtde_prevista: 0,
                    qtde_realizada: 0,
                    valor_previsto: 0,
                    valor_realizado: 0,
                };
            const e = map[key];
            e.count += 1;
            e.qtde_prevista += r.qtde_prevista || 0;
            e.qtde_realizada += r.qtde_realizada || 0;
            e.valor_previsto += r.valor_previsto || 0;
            e.valor_realizado += r.valor_realizado || 0;
        });
        const toArr = (map) => Object.values(map)
            .filter((v) => v.qtde_realizada > 0 || v.valor_realizado > 0 || v.qtde_prevista > 0 || v.valor_previsto > 0)
            .sort((a, b) => b.count - a.count || b.valor_realizado - a.valor_realizado);
        return {
            resinas: toArr(resinasMap),
            pigmentos: toArr(pigmentosMap),
        };
    }, [records]);
    return (_jsxs("div", { className: "grid lg:grid-cols-2 gap-4", children: [_jsx(ConsumoColumn, { title: "Resinas e Solventes", icon: Droplets, items: resinas, theme: "blue", delay: 0 }), _jsx(ConsumoColumn, { title: "Pigmentos e Pastas", icon: Palette, items: pigmentos, theme: "purple", delay: 0.1 })] }));
}
