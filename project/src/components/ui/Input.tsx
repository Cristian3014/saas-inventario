import { type InputHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  error?: string;
}

export function Input({ label, icon, error, className = '', id, ...props }: InputProps) {
  const inputId = id || props.name;
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full h-11 rounded-lg border bg-white text-slate-900 text-sm placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 ${
            icon ? 'pl-10 pr-4' : 'px-4'
          } ${error ? 'border-red-300 focus:ring-red-500/10 focus:border-red-500' : 'border-slate-300'} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
