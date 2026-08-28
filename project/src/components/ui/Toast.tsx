import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const toastConfig: Record<
  ToastType,
  { icon: typeof CheckCircle2; classes: string; iconClass: string }
> = {
  success: {
    icon: CheckCircle2,
    classes: 'border-emerald-200 bg-white',
    iconClass: 'text-emerald-600',
  },
  error: {
    icon: XCircle,
    classes: 'border-red-200 bg-white',
    iconClass: 'text-red-600',
  },
  warning: {
    icon: AlertTriangle,
    classes: 'border-amber-200 bg-white',
    iconClass: 'text-amber-600',
  },
  info: {
    icon: Info,
    classes: 'border-sky-200 bg-white',
    iconClass: 'text-sky-600',
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {toasts.map((t) => {
          const cfg = toastConfig[t.type];
          const Icon = cfg.icon;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border shadow-lg shadow-slate-200/50 p-4 animate-toast-in ${cfg.classes}`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${cfg.iconClass}`} />
              <p className="text-sm text-slate-700 flex-1 leading-relaxed">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
