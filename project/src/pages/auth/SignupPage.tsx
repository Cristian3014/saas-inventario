import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Building2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function SignupPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    companyName?: string;
  }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!fullName.trim()) e.fullName = 'Ingresa tu nombre completo';
    if (!email) e.email = 'Ingresa tu correo';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Correo no válido';
    if (!password) e.password = 'Ingresa una contraseña';
    else if (password.length < 6)
      e.password = 'Mínimo 6 caracteres';
    if (!companyName.trim()) e.companyName = 'Ingresa el nombre de tu empresa';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const { error } = await signUp({ fullName, email, password, companyName });
    setLoading(false);
    if (error) {
      toast(error, 'error');
    } else {
      toast('Cuenta creada correctamente', 'success');
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <AuthLayout
      title="Crear cuenta"
      subtitle="Registra tu empresa y empieza a gestionar tu negocio"
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link
            to="/login"
            className="font-medium text-slate-900 hover:underline"
          >
            Inicia sesión
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Nombre completo"
          name="fullName"
          placeholder="Juan Pérez"
          icon={<User className="w-4 h-4" />}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
          autoComplete="name"
        />
        <Input
          label="Nombre de la empresa"
          name="companyName"
          placeholder="Almacén La Esquina"
          icon={<Building2 className="w-4 h-4" />}
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          error={errors.companyName}
        />
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
          placeholder="Mínimo 6 caracteres"
          icon={<Lock className="w-4 h-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          autoComplete="new-password"
        />
        <Button type="submit" size="lg" loading={loading} className="w-full">
          Crear cuenta
          <ArrowRight className="w-4 h-4" />
        </Button>
        <p className="text-xs text-slate-400 text-center leading-relaxed">
          Al registrarte serás el propietario (owner) de la empresa y podrás
          gestionar usuarios y datos.
        </p>
      </form>
    </AuthLayout>
  );
}
