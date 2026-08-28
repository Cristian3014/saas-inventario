import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { formatCOP } from '@/lib/format';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  accent: string;
  iconBg: string;
}

function MetricCard({
  label,
  value,
  icon: Icon,
  trend = 'neutral',
  trendLabel,
  accent,
  iconBg,
}: MetricCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'up'
      ? 'text-emerald-600 bg-emerald-50'
      : trend === 'down'
        ? 'text-red-600 bg-red-50'
        : 'text-slate-500 bg-slate-100';

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-300 transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-6 h-6 ${accent}`} />
        </div>
        {trendLabel && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${trendColor}`}
          >
            <TrendIcon className="w-3 h-3" />
            {trendLabel}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
    </div>
  );
}

const placeholderMetrics: MetricCardProps[] = [
  {
    label: 'Ventas del mes',
    value: formatCOP(0),
    icon: DollarSign,
    accent: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    trend: 'neutral',
    trendLabel: 'Sin datos',
  },
  {
    label: 'Órdenes totales',
    value: '0',
    icon: ShoppingCart,
    accent: 'text-sky-600',
    iconBg: 'bg-sky-50',
    trend: 'neutral',
    trendLabel: 'Sin datos',
  },
  {
    label: 'Productos en inventario',
    value: '0',
    icon: Package,
    accent: 'text-amber-600',
    iconBg: 'bg-amber-50',
    trend: 'neutral',
    trendLabel: 'Sin datos',
  },
  {
    label: 'Clientes activos',
    value: '0',
    icon: Users,
    accent: 'text-violet-600',
    iconBg: 'bg-violet-50',
    trend: 'neutral',
    trendLabel: 'Sin datos',
  },
];

export function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">
            Resumen general de {user.company.name}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Sistema activo
          </span>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {placeholderMetrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* Estado vacío + confirmación multi-tenant */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-8 lg:p-10">
          <div className="flex flex-col items-center text-center max-w-md mx-auto py-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">
              ¡Tu empresa está lista!
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              Has configurado correctamente tu espacio de trabajo en Bodega.
              Los datos de <strong>{user.company.name}</strong> están
              completamente aislados y seguros. Próximamente podrás empezar a
              registrar tus productos, ventas y clientes.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {['Productos', 'Inventario', 'Ventas', 'Clientes'].map((mod) => (
                <span
                  key={mod}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-500"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  {mod} · En preparación
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Seguridad multi-tenant */}
        <div className="bg-slate-900 rounded-2xl p-6 lg:p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center mb-5">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Aislamiento multi-empresa
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-5">
              Row Level Security (RLS) activo en PostgreSQL. Nadie puede
              acceder a los datos de tu empresa desde fuera.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300">Datos 100% aislados</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300">RLS habilitada</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300">Acceso por roles</span>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Tu empresa</span>
                <span className="font-medium text-emerald-400">
                  {user.company.name}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-slate-400">Tu rol</span>
                <span className="font-medium capitalize">{user.role}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sección próxima */}
      <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 p-6 lg:p-8">
        <div className="flex items-center gap-2 mb-5">
          <ArrowUpRight className="w-5 h-5 text-slate-400" />
          <h3 className="text-base font-semibold text-slate-900">
            Próximos módulos
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Productos', icon: Package },
            { label: 'Inventario', icon: ShoppingCart },
            { label: 'Ventas', icon: DollarSign },
            { label: 'Clientes', icon: Users },
            { label: 'Proveedores', icon: ArrowUpRight },
            { label: 'Reportes', icon: TrendingUp },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-slate-200 opacity-60"
              >
                <Icon className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-medium text-slate-500">
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
