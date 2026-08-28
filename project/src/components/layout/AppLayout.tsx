import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ShoppingCart,
  Users,
  Truck,
  BarChart3,
  Settings,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Boxes,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import type { UserRole } from '@/types/database';

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  enabled: boolean;
  to?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, enabled: true, to: '/dashboard' },
  { label: 'Verificación de seguridad', icon: ShieldCheck, enabled: true, to: '/verify' },
  { label: 'Productos', icon: Package, enabled: false },
  { label: 'Inventario', icon: Warehouse, enabled: false },
  { label: 'Ventas', icon: ShoppingCart, enabled: false },
  { label: 'Clientes', icon: Users, enabled: false },
  { label: 'Proveedores', icon: Truck, enabled: false },
  { label: 'Reportes', icon: BarChart3, enabled: false },
  { label: 'Configuración', icon: Settings, enabled: false },
];

const roleLabels: Record<UserRole, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  employee: 'Empleado',
};

const roleColors: Record<UserRole, string> = {
  owner: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  admin: 'bg-sky-50 text-sky-700 border-sky-200',
  employee: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    setLogoutModal(false);
    await signOut();
    toast('Sesión cerrada', 'info');
    navigate('/login');
  };

  const NavList = () => (
    <nav className="flex flex-col gap-1 px-3">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isCurrentRoute = item.to === location.pathname;
        return (
          <button
            key={item.label}
            onClick={() => {
              if (item.enabled && item.to) navigate(item.to);
              if (!item.enabled) toast(`${item.label} estará disponible pronto`, 'info');
              setSidebarOpen(false);
            }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              isCurrentRoute
                ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/20'
                : item.enabled
                  ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-not-allowed'
            }`}
            title={item.enabled ? item.label : `${item.label} (en preparación)`}
          >
            <Icon className="w-[18px] h-[18px] shrink-0" />
            <span className="flex-1 text-left">{item.label}</span>
            {!item.enabled && (
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Pronto
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  const UserBadge = () => (
    <div className="flex items-center gap-3 px-3 py-3 border-t border-slate-200">
      <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold shrink-0">
        {user.fullName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">
          {user.fullName}
        </p>
        <p className="text-xs text-slate-500 truncate">{user.email}</p>
      </div>
      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center">
              <Boxes className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <span className="text-base font-semibold text-slate-900 block leading-tight">
                Bodega
              </span>
              <span className="text-[11px] text-slate-400 leading-tight">
                Gestión empresarial
              </span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <NavList />
        </div>

        <div className="shrink-0">
          <UserBadge />
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-20 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-600 hover:text-slate-900 p-1"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-base font-semibold text-slate-900">
                {user.company.name}
              </h1>
              <span
                className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleColors[user.role]}`}
              >
                {roleLabels[user.role]}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-slate-900 leading-tight">
                {user.fullName}
              </p>
              <p className="text-xs text-slate-500 leading-tight">{user.email}</p>
            </div>
            <button
              onClick={() => setLogoutModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </div>
        </header>

        {/* Contenido */}
        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">{children}</main>
      </div>

      <Modal
        open={logoutModal}
        title="Cerrar sesión"
        message="¿Estás seguro de que deseas cerrar tu sesión? Tendrás que volver a iniciar sesión para acceder a tu panel."
        confirmLabel="Cerrar sesión"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleLogout}
        onCancel={() => setLogoutModal(false)}
      />
    </div>
  );
}
