import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email) e.email = 'Ingresa tu correo';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Correo no válido';
    if (!password) e.password = 'Ingresa tu contraseña';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const { error } = await signIn({ email, password });
    setLoading(false);
    if (error) {
      toast(error, 'error');
    } else {
      toast('Sesión iniciada correctamente', 'success');
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <AuthLayout
      title="Iniciar sesión"
      subtitle="Ingresa a tu panel de gestión empresarial"
      footer={
        <>
          ¿No tienes cuenta?{' '}
          <Link
            to="/signup"
            className="font-medium text-slate-900 hover:underline"
          >
            Regístrate aquí
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Correo electrónico"
          name="email"
          type="email"
          placeholder="tu@correo.com"
          icon={<Mail className="w-4 h-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          autoComplete="email"
        />
        <Input
          label="Contraseña"
          name="password"
          type="password"
          placeholder="••••••••"
          icon={<Lock className="w-4 h-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          autoComplete="current-password"
        />
        <div className="flex justify-end">
          <Link
            to="/recover-password"
            className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <Button type="submit" size="lg" loading={loading} className="w-full">
          Iniciar sesión
          <ArrowRight className="w-4 h-4" />
        </Button>
      </form>
    </AuthLayout>
  );
}
