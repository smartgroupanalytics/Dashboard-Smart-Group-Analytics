import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ScrollToTop from '@/components/ScrollToTop';
import DashboardLayout from '@/components/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Faturamento from '@/pages/Faturamento';
import Revisao from '@/pages/Revisao';
import DesempenhoMaquina from '@/pages/DesempenhoMaquina';
import GerenciarDesempenho from '@/pages/GerenciarDesempenho';
import ControleEficiencia from '@/pages/ControleEficiencia';
import Rotatividade from '@/pages/Rotatividade';
import Produtividade from '@/pages/Produtividade';
import CombustivelProducao from '@/pages/CombustivelProducao';
import TempoOcioso from '@/pages/TempoOcioso';
import AderenciaProgramacao from '@/pages/AderenciaProgramacao';
import Disponibilidade from '@/pages/Disponibilidade';
import InsumosQuimicos from '@/pages/InsumosQuimicos';
import DefeitosProducao from '@/pages/DefeitosProducao';
import AnaliseRetrabalho from '@/pages/AnaliseRetrabalho';
import CargaMaquina from '@/pages/CargaMaquina';
import ControlePedidos from '@/pages/ControlePedidos';
import RecorrenciaPedidos from '@/pages/RecorrenciaPedidos';
import GastosIndustriais from '@/pages/GastosIndustriais';
import AproveitamentoOP from '@/pages/AproveitamentoOP';
import ProducaoGeral from '@/pages/ProducaoGeral';
import ComparativoRevisao from '@/pages/ComparativoRevisao';
function AccessDenied({ message }) {
    return _jsx("div", { className: "min-h-screen flex items-center justify-center bg-slate-50 p-6", children: _jsxs("div", { className: "max-w-lg rounded-2xl border bg-white p-6 shadow-sm text-center", children: [_jsx("h1", { className: "text-xl font-bold text-slate-900", children: "Acesso ao m\u00F3dulo Produ\u00E7\u00E3o" }), _jsx("p", { className: "mt-2 text-sm text-slate-600", children: message }), _jsx("button", { className: "mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white", onClick: () => window.top.location.replace(new URL('../../index.html', window.location.href).href), children: "Voltar ao Analytics" })] }) });
}
function AuthenticatedApp() {
    const { isLoadingAuth, authError, isAuthenticated } = useAuth();
    if (isLoadingAuth)
        return _jsx("div", { className: "fixed inset-0 flex items-center justify-center", children: _jsx("div", { className: "w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" }) });
    if (authError?.type === 'user_not_registered')
        return _jsx(UserNotRegisteredError, {});
    if (!isAuthenticated)
        return _jsx(AccessDenied, { message: authError?.message || 'Faça login no Smart Group Analytics para acessar.' });
    return _jsxs(Routes, { children: [_jsx(Route, { element: _jsx(ProtectedRoute, { unauthenticatedElement: _jsx(AccessDenied, { message: "Sua sess\u00E3o expirou. Entre novamente no Smart Group Analytics." }) }), children: _jsxs(Route, { element: _jsx(DashboardLayout, {}), children: [_jsx(Route, { path: "/", element: _jsx(Revisao, {}) }), _jsx(Route, { path: "/revisao", element: _jsx(Revisao, {}) }), _jsx(Route, { path: "/faturamento", element: _jsx(Faturamento, {}) }), _jsx(Route, { path: "/desempenho-maquina", element: _jsx(DesempenhoMaquina, {}) }), _jsx(Route, { path: "/controle-eficiencia", element: _jsx(ControleEficiencia, {}) }), _jsx(Route, { path: "/rotatividade", element: _jsx(Rotatividade, {}) }), _jsx(Route, { path: "/produtividade", element: _jsx(Produtividade, {}) }), _jsx(Route, { path: "/combustivel", element: _jsx(CombustivelProducao, {}) }), _jsx(Route, { path: "/tempo-ocioso", element: _jsx(TempoOcioso, {}) }), _jsx(Route, { path: "/aderencia-programacao", element: _jsx(AderenciaProgramacao, {}) }), _jsx(Route, { path: "/disponibilidade", element: _jsx(Disponibilidade, {}) }), _jsx(Route, { path: "/insumos-quimicos", element: _jsx(InsumosQuimicos, {}) }), _jsx(Route, { path: "/defeitos-producao", element: _jsx(DefeitosProducao, {}) }), _jsx(Route, { path: "/analise-retrabalho", element: _jsx(AnaliseRetrabalho, {}) }), _jsx(Route, { path: "/carga-maquina", element: _jsx(CargaMaquina, {}) }), _jsx(Route, { path: "/controle-pedidos", element: _jsx(ControlePedidos, {}) }), _jsx(Route, { path: "/recorrencia-pedidos", element: _jsx(RecorrenciaPedidos, {}) }), _jsx(Route, { path: "/gastos-industriais", element: _jsx(GastosIndustriais, {}) }), _jsx(Route, { path: "/aproveitamento-op", element: _jsx(AproveitamentoOP, {}) }), _jsx(Route, { path: "/producao-geral", element: _jsx(ProducaoGeral, {}) }), _jsx(Route, { path: "/comparativo-revisao", element: _jsx(ComparativoRevisao, {}) }), _jsx(Route, { path: "/gerenciar-desempenho", element: _jsx(GerenciarDesempenho, {}) })] }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] });
}
export default function App() {
    return _jsx(AuthProvider, { children: _jsxs(QueryClientProvider, { client: queryClientInstance, children: [_jsxs(HashRouter, { children: [_jsx(ScrollToTop, {}), _jsx(AuthenticatedApp, {})] }), _jsx(Toaster, {})] }) });
}
