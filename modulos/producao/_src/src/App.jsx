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
  return <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6"><div className="max-w-lg rounded-2xl border bg-white p-6 shadow-sm text-center"><h1 className="text-xl font-bold text-slate-900">Acesso ao módulo Produção</h1><p className="mt-2 text-sm text-slate-600">{message}</p><button className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={() => window.top.location.replace(new URL('../../index.html', window.location.href).href)}>Voltar ao Analytics</button></div></div>;
}

function AuthenticatedApp() {
  const { isLoadingAuth, authError, isAuthenticated } = useAuth();
  if (isLoadingAuth) return <div className="fixed inset-0 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  if (authError?.type === 'user_not_registered') return <UserNotRegisteredError />;
  if (!isAuthenticated) return <AccessDenied message={authError?.message || 'Faça login no Smart Group Analytics para acessar.'} />;

  return <Routes>
    <Route element={<ProtectedRoute unauthenticatedElement={<AccessDenied message="Sua sessão expirou. Entre novamente no Smart Group Analytics." />} />}>
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Revisao />} />
        <Route path="/revisao" element={<Revisao />} />
        <Route path="/faturamento" element={<Faturamento />} />
        <Route path="/desempenho-maquina" element={<DesempenhoMaquina />} />
        <Route path="/controle-eficiencia" element={<ControleEficiencia />} />
        <Route path="/rotatividade" element={<Rotatividade />} />
        <Route path="/produtividade" element={<Produtividade />} />
        <Route path="/combustivel" element={<CombustivelProducao />} />
        <Route path="/tempo-ocioso" element={<TempoOcioso />} />
        <Route path="/aderencia-programacao" element={<AderenciaProgramacao />} />
        <Route path="/disponibilidade" element={<Disponibilidade />} />
        <Route path="/insumos-quimicos" element={<InsumosQuimicos />} />
        <Route path="/defeitos-producao" element={<DefeitosProducao />} />
        <Route path="/analise-retrabalho" element={<AnaliseRetrabalho />} />
        <Route path="/carga-maquina" element={<CargaMaquina />} />
        <Route path="/controle-pedidos" element={<ControlePedidos />} />
        <Route path="/recorrencia-pedidos" element={<RecorrenciaPedidos />} />
        <Route path="/gastos-industriais" element={<GastosIndustriais />} />
        <Route path="/aproveitamento-op" element={<AproveitamentoOP />} />
        <Route path="/producao-geral" element={<ProducaoGeral />} />
        <Route path="/comparativo-revisao" element={<ComparativoRevisao />} />
        <Route path="/gerenciar-desempenho" element={<GerenciarDesempenho />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

export default function App() {
  return <AuthProvider><QueryClientProvider client={queryClientInstance}><HashRouter><ScrollToTop /><AuthenticatedApp /></HashRouter><Toaster /></QueryClientProvider></AuthProvider>;
}
