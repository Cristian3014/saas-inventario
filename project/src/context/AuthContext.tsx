import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import type { AuthUser, Company, CompanyMembership, Profile } from '@/types/database';

interface AuthContextValue {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signUp: (params: {
    fullName: string;
    email: string;
    password: string;
    companyName: string;
  }) => Promise<{ error: string | null }>;
  signIn: (params: {
    email: string;
    password: string;
  }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadAuthUser(userId: string): Promise<AuthUser | null> {
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle<Profile>();

  if (profileErr) return null;
  if (!profile) return null;

  const { data: memberships, error: membershipsErr } = await supabase
    .from('company_memberships')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (membershipsErr) return null;
  if (!memberships || memberships.length === 0) return null;

  const typedMemberships = memberships as unknown as CompanyMembership[];
  const primaryMembership = typedMemberships[0];

  const { data: company, error: companyErr } = await supabase
    .from('companies')
    .select('*')
    .eq('id', primaryMembership.company_id)
    .maybeSingle<Company>();

  if (companyErr) return null;
  if (!company) return null;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: primaryMembership.role,
    companyId: primaryMembership.company_id,
    company,
    memberships: typedMemberships,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) {
        loadAuthUser(data.session.user.id).then((u) => {
          if (!active) return;
          setUser(u);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        if (event === 'SIGNED_OUT' || !newSession) {
          setUser(null);
          setLoading(false);
          return;
        }
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          (async () => {
            const u = await loadAuthUser(newSession.user.id);
            if (!active) return;
            setUser(u);
            setLoading(false);
          })();
        }
      }
    );

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      signUp: async ({ fullName, email, password, companyName }) => {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });

        if (authError) return { error: translateAuthError(authError.message) };
        if (!authData.user) return { error: 'No se pudo crear el usuario.' };

        const newUserId = authData.user.id;

        const { error: rpcError } = await supabase.rpc('register_new_company', {
          p_company_name: companyName,
          p_full_name: fullName,
          p_email: email,
        });

        if (rpcError) {
          return {
            error: `Error al crear la empresa: ${rpcError.message}`,
          };
        }

        const u = await loadAuthUser(newUserId);
        if (!u) {
          await supabase.auth.signOut();
          return {
            error:
              'La cuenta se creó pero no se pudo cargar el perfil. Intenta iniciar sesión.',
          };
        }
        setUser(u);
        return { error: null };
      },
      signIn: async ({ email, password }) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) return { error: translateAuthError(error.message) };
        if (!data.session) return { error: 'No se pudo iniciar sesión.' };

        const u = await loadAuthUser(data.session.user.id);
        if (!u) {
          await supabase.auth.signOut();
          return {
            error:
              'Tu cuenta no tiene una empresa asociada. Regístrate nuevamente para crear tu empresa.',
          };
        }
        setUser(u);
        return { error: null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
      },
      resetPassword: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) return { error: translateAuthError(error.message) };
        return { error: null };
      },
    }),
    [user, session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function translateAuthError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('invalid login credentials'))
    return 'Correo o contraseña incorrectos.';
  if (lower.includes('user already registered'))
    return 'Ya existe una cuenta con este correo.';
  if (lower.includes('password should be at least'))
    return 'La contraseña debe tener al menos 6 caracteres.';
  if (lower.includes('email not confirmed'))
    return 'Debes confirmar tu correo antes de iniciar sesión.';
  if (lower.includes('rate limit') || lower.includes('too many'))
    return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
  return msg;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
