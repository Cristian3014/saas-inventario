import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  fullscreen?: boolean;
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export function Spinner({ size = 'md', label, fullscreen = false }: SpinnerProps) {
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
        <Loader2 className={`${sizeMap[size]} animate-spin text-slate-900`} />
        {label && <p className="mt-4 text-sm text-slate-500">{label}</p>}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-3 py-4">
      <Loader2 className={`${sizeMap[size]} animate-spin text-slate-900`} />
      {label && <span className="text-sm text-slate-500">{label}</span>}
    </div>
  );
}
