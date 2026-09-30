import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import GerenciarDesempenhoTable from "@/components/desempenho/GerenciarDesempenhoTable";
export default function GerenciarDesempenho() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const load = async () => {
        try {
            setLoading(true);
            const data = await db.entities.DesempenhoMaquina.list();
            setRecords(data);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-[60vh]", children: _jsx("div", { className: "w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" }) }));
    }
    return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100", children: _jsxs("div", { className: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3", children: [_jsxs("div", { className: "flex items-center justify-between mb-3 gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold tracking-tight text-slate-900 leading-tight", children: "Gerenciar Registros de Desempenho" }), _jsx("p", { className: "text-xs text-slate-500 leading-tight", children: "Edite todos os registros diretamente na tabela" })] }), _jsx(Button, { asChild: true, variant: "outline", size: "sm", className: "gap-1", children: _jsxs(Link, { to: "/desempenho-maquina", children: [_jsx(ArrowLeft, { className: "w-4 h-4" }), " Voltar"] }) })] }), _jsx(GerenciarDesempenhoTable, { records: records, onSaved: load })] }) }));
}
