import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
export default function LightHeader({ icon: Icon, title, subtitle, children, className = "" }) {
    return (_jsxs("div", { className: `relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-300 bg-gradient-to-br from-white via-slate-50 to-slate-100 px-4 py-4 shadow-sm ${className}`, children: [_jsxs("div", { className: "flex items-center gap-3", children: [Icon && (_jsx("div", { className: "p-2.5 rounded-xl bg-slate-100 text-slate-700 ring-1 ring-slate-200", children: _jsx(Icon, { className: "w-5 h-5" }) })), _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-extrabold tracking-tight text-slate-900", children: title }), subtitle && _jsx("p", { className: "text-xs text-slate-500", children: subtitle })] })] }), children] }));
}
