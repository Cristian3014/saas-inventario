import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function RecoverPasswordPage() {
  const { resetPassword } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!email) {
      setError('Ingresa tu correo');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Correo no válido');
      return;
    }
    setError(undefined);
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      toast(error, 'error');
    } else {
      setSent(true);
      toast('Enlace de recuperación enviado', 'success');
    }
  };

  return (
    <AuthLayout
      title="Recuperar contraseña"
      subtitle="Te enviaremos un enlace para restablecer tu contraseña"
      footer={
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 font-medium text-slate-900 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a iniciar sesión
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
          <h3 className="font-semibold text-emerald-900 mb-2">
            Revisa tu correo
          </h3>
          <p className="text-sm text-emerald-700 leading-relaxed">
            Hemos enviado un enlace de recuperación a{' '}
            <strong>{email}</strong>. Sigue las instrucciones del correo para
            restablecer tu contraseña.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Correo electrónico"
            name="email"
            type="email"
            placeholder="tu@correo.com"
            icon={<Mail className="w-4 h-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
            autoComplete="email"
          />
          <Button type="submit" size="lg" loading={loading} className="w-full">
            Enviar enlace
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
