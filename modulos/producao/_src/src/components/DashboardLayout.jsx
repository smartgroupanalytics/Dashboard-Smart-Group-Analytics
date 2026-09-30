import { Outlet, NavLink } from "react-router-dom";
import { Wallet, ClipboardCheck, Cog, Gauge, RefreshCw, TrendingUp, Fuel, Clock, ListChecks, Activity, FlaskConical, Bug, Repeat, CalendarClock, ClipboardList, Hash, Factory, Target, BarChart3, Scale, Database } from "lucide-react";

const TABS = [
  { to: "/", label: "Revisão", icon: ClipboardCheck, end: true },
  { to: "/comparativo-revisao", label: "Entrada vs Saída", icon: Scale },
  { to: "/desempenho-maquina", label: "Desempenho de Máquina", icon: Cog },
  { to: "/controle-eficiencia", label: "Controle de Eficiência", icon: Gauge },
  { to: "/rotatividade", label: "Rotatividade", icon: RefreshCw },
  { to: "/produtividade", label: "Produtividade", icon: TrendingUp },
  { to: "/combustivel", label: "Combustível", icon: Fuel },
  { to: "/tempo-ocioso", label: "Tempo Ocioso", icon: Clock },
  { to: "/aderencia-programacao", label: "Aderência", icon: ListChecks },
  { to: "/disponibilidade", label: "Disponibilidade", icon: Activity },
  { to: "/insumos-quimicos", label: "Insumos Químicos", icon: FlaskConical },
  { to: "/defeitos-producao", label: "Defeitos de Produção", icon: Bug },
  { to: "/analise-retrabalho", label: "Análise de Retrabalho", icon: Repeat },
  { to: "/carga-maquina", label: "Carteira de Pedido", icon: CalendarClock },
  { to: "/controle-pedidos", label: "Carga de Máquina", icon: ClipboardList },
  { to: "/recorrencia-pedidos", label: "Recorrência de Pedidos", icon: Hash },
  { to: "/gastos-industriais", label: "Gastos Industriais", icon: Factory },
  { to: "/aproveitamento-op", label: "Aproveitamento OP", icon: Target },
  { to: "/producao-geral", label: "Orçamento 2027", icon: BarChart3 },
  { to: "/faturamento", label: "INDICADORE PRODUÇÃO", icon: Wallet },
];

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-border print:hidden">
        <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 overflow-x-auto scrollbar-none whitespace-nowrap">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors shrink-0 ${
                    isActive
                      ? "border-slate-900 text-slate-900"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
      <Outlet />
    </div>
  );
}