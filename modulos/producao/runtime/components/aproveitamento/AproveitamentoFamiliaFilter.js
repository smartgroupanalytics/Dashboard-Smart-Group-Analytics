import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronDown, Search, Layers, X, BarChart3 } from "lucide-react";
// Limpa a descrição: remove o prefixo "Produto: XXXX -: "
function cleanDesc(desc) {
    if (!desc)
        return "";
    const s = String(desc);
    const m = s.match(/-\s*:\s*(.+)$/);
    return m ? m[1].trim() : s.trim();
}
// Palavras que são cores ou acabamentos (não fazem parte do nome da família)
const COLOR_WORDS = new Set([
    "OURO", "PRATA", "BEGE", "PRETO", "BRANCO", "CINZA", "MARROM", "AZUL", "VERDE",
    "VERMELHO", "AMARELO", "LARANJA", "ROXO", "ROSA", "MARFIM", "CREME", "OFF",
    "WHITE", "BLACK", "GREY", "GRAY", "SILVER", "GOLD", "RED", "BLUE", "GREEN",
    "TAN", "NAVY", "COBRE", "BRONZE", "AREIA", "NATURAL", "PETROLEO", "CHUMBO",
    "CAMEL", "CACAU", "VINHO", "BLUSH", "ROSADO", "LIGHT", "FOSCO", "BRILHO",
    "MASCAVO", "AVEIA", "COFFEE", "CAFE", "CAFÉ", "CASTOR", "CARAMEL", "MOKA", "MOCHA",
    "TABACO", "COGNAC", "BELLINI", "GRAFITE", "GRAFITO", "ESCURO", "CLARO", "CARBON",
    "FUME", "FUMÊ", "PIOMBO", "TORTORA", "PIRITA", "NICKEL", "DIAMANTE", "CRISTAL",
    "BURGUNDY", "ESPRESSO", "NUDE", "HIBISCO", "WHISKY", "TERRA", "CARAMELO",
    "BROWN", "NEW", "MILITAR", "CONHAQUE", "AVELA", "MANTEIGA", "TITANIO",
    "ROCHA", "CREAM", "PELE", "ANTIQUE", "MARINHO", "CANELA", "SOLARE",
    "ROSE", "CHOCOLATE", "PISTACHE", "OSTRA", "TAUPE", "MOSTARDA", "AMEIXA",
    "INDIGO", "CAPPUCCINO", "CHAMPAGNE", "CEREJA",
]);
// Verifica se a palavra é um número ou código (ex.: 1277, 1.0)
function isNumberOrCode(w) {
    return /^[\d.]+$/.test(w);
}
// Remove acentos para servir como chave de agrupamento (ex.: GRAVACAO == GRAVAÇÃO)
export function familiaKey(familia) {
    if (!familia)
        return "";
    return String(familia)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .trim();
}
// Extrai a família de uma descrição (até 2 palavras, parando ao encontrar cor ou número)
export function extractFamilia(desc) {
    if (!desc)
        return "";
    const clean = cleanDesc(desc);
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0)
        return "";
    const familyParts = [];
    for (let i = 0; i < parts.length && familyParts.length < 3; i++) {
        const w = parts[i].toUpperCase();
        // Sempre inclui a primeira palavra; nas seguintes, para em cor/número
        if (familyParts.length > 0 && (COLOR_WORDS.has(w) || isNumberOrCode(w)))
            break;
        familyParts.push(w);
    }
    return familyParts.join(" ");
}
export default function AproveitamentoFamiliaFilter({ rows, selected, onChange, onAnalise, triggerClassName }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const familias = useMemo(() => {
        const map = new Map(); // key (sem acento) -> display (preferindo a forma acentuada)
        const hasAccent = (s) => s !== familiaKey(s);
        rows.forEach((r) => {
            const f = extractFamilia(r.descricao_produto);
            if (!f)
                return;
            const key = familiaKey(f);
            const existing = map.get(key);
            if (!existing || (hasAccent(f) && !hasAccent(existing)))
                map.set(key, f);
        });
        return Array.from(map.values()).sort((a, b) => familiaKey(a).localeCompare(familiaKey(b)));
    }, [rows]);
    const filtered = useMemo(() => {
        if (!search)
            return familias;
        const s = search.toUpperCase();
        return familias.filter((f) => f.includes(s));
    }, [familias, search]);
    const toggle = (f) => {
        if (selected.includes(f)) {
            onChange(selected.filter((x) => x !== f));
        }
        else {
            onChange([...selected, f]);
        }
    };
    const clear = () => onChange([]);
    return (_jsxs(Popover, { open: open, onOpenChange: setOpen, children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs("button", { type: "button", className: `inline-flex items-center gap-1.5 h-9 px-3 rounded-md border text-xs font-semibold transition-colors ${selected.length > 0
                        ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"} ${triggerClassName || ""}`, children: [_jsx(Layers, { className: "w-4 h-4" }), "Fam\u00EDlia", selected.length > 0 && (_jsx("span", { className: "ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-white/20 text-[10px] font-bold", children: selected.length })), _jsx(ChevronDown, { className: "w-3.5 h-3.5 opacity-70" })] }) }), _jsxs(PopoverContent, { className: "w-80 p-0", align: "end", children: [_jsxs("div", { className: "flex items-center justify-between px-3 py-2 border-b border-slate-200", children: [_jsx("span", { className: "text-xs font-bold text-slate-700 uppercase tracking-wide", children: "Fam\u00EDlia" }), selected.length > 0 && (_jsxs("button", { onClick: clear, className: "text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1", children: [_jsx(X, { className: "w-3 h-3" }), " limpar"] }))] }), _jsx("div", { className: "p-2 border-b border-slate-200", children: _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" }), _jsx("input", { type: "text", value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Buscar fam\u00EDlia...", className: "w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200" })] }) }), _jsx("div", { className: "max-h-72 overflow-y-auto py-1", children: filtered.length === 0 ? (_jsx("p", { className: "px-3 py-4 text-center text-xs text-slate-400", children: "Nenhuma fam\u00EDlia encontrada." })) : (filtered.map((f) => {
                            const checked = selected.includes(f);
                            return (_jsxs("div", { className: `flex items-center gap-1 px-2 py-1.5 transition-colors ${checked ? "bg-indigo-50" : "hover:bg-slate-50"}`, children: [_jsxs("button", { onClick: () => toggle(f), className: `flex items-center gap-2 flex-1 text-left text-xs ${checked ? "text-indigo-700 font-semibold" : "text-slate-700"}`, children: [_jsx("span", { className: `w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${checked ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`, children: checked && _jsx(Check, { className: "w-3 h-3 text-white" }) }), _jsx("span", { className: "truncate", children: f })] }), _jsx("button", { onClick: () => onAnalise(f), className: "p-1 rounded text-indigo-500 hover:bg-indigo-100 hover:text-indigo-700 transition-colors flex-shrink-0", title: "An\u00E1lise da fam\u00EDlia", children: _jsx(BarChart3, { className: "w-3.5 h-3.5" }) })] }, f));
                        })) }), familias.length > 0 && (_jsxs("div", { className: "px-3 py-1.5 border-t border-slate-200 text-[10px] text-slate-400 text-center", children: [familias.length, " fam\u00EDlia(s) dispon\u00EDvel(is)"] }))] })] }));
}
