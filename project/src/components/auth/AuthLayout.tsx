import { type ReactNode } from 'react';
import { Boxes } from 'lucide-react';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        <div className="relative flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
              <Boxes className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Bodega</span>
          </div>
          <div className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight">
              Gestiona tu inventario,
              <br />
              ventas y clientes
              <br />
              en un solo lugar.
            </h2>
            <p className="text-lg text-slate-300 leading-relaxed max-w-md">
              Plataforma multi-empresa para pequeños almacenes, tiendas y
              talleres en Colombia. Datos aislados, seguros y siempre
              disponibles.
            </p>
            <div className="flex gap-8 pt-4">
              <div>
                <p className="text-3xl font-bold text-emerald-400">100%</p>
                <p className="text-sm text-slate-400">Aislamiento de datos</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-sky-400">COP</p>
                <p className="text-sm text-slate-400">Moneda regional</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-slate-400">
            © 2026 Bodega. Todos los derechos reservados.
          </p>
        </div>
      </div>

      {/* Panel derecho - formulario */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Logo móvil */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
              <Boxes className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-lg font-semibold text-slate-900">Bodega</span>
          </div>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          </div>
          {children}
          {footer && <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
