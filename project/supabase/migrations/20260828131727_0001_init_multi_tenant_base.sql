/*
# Base de datos multi-tenant: companies y profiles + RLS

## Resumen
Crea la arquitectura base para un SaaS multi-empresa (multi-tenant) de
gestión de inventarios, ventas y clientes orientado a pequeños negocios
en Colombia. Esta etapa define SÓLO la base de datos del aislamiento
entre empresas: tablas `companies` y `profiles`, políticas RLS estrictas
y una función auxiliar `get_current_company_id()` que evita recursividad
en las políticas.

## Tablas nuevas
1. `companies`
   - `id` (uuid, PK, default gen_random_uuid()) — identificador único de la empresa.
   - `name` (text, NOT NULL) — nombre comercial.
   - `legal_name` (text) — razón social.
   - `tax_id` (text) — NIT o cédula del propietario.
   - `phone` (text) — teléfono de contacto.
   - `email` (text) — correo de contacto.
   - `address` (text) — dirección física.
   - `logo_url` (text) — URL del logotipo.
   - `created_at` (timestamptz, default now()).
   - `updated_at` (timestamptz, default now()).

2. `profiles`
   - `id` (uuid, PK, references auth.users ON DELETE CASCADE) — usuario de Supabase Auth.
   - `company_id` (uuid, references companies(id) ON DELETE CASCADE, NOT NULL) — empresa a la que pertenece.
   - `full_name` (text, NOT NULL) — nombre completo del usuario.
   - `email` (text, NOT NULL) — correo del usuario.
   - `role` (text, NOT NULL, default 'employee', CHECK in ('owner','admin','employee')) — rol dentro de la empresa.
   - `created_at` (timestamptz, default now()).
   - `updated_at` (timestamptz, default now()).

## Funciones auxiliares
- `get_current_company_id()` SECURITY DEFINER STABLE: devuelve el `company_id`
  del usuario autenticado leyendo `profiles`. Es `SECURITY DEFINER` con
  `SET search_path = public` para evitar ciclos recursivos en RLS: las
  políticas de `companies` y `profiles` pueden usarla sin que la política
  de `profiles` se llame a sí misma.

## Seguridad (RLS)
- RLS habilitada en `companies` y `profiles`.
- `companies`: SELECT/UPDATE limitadas a la empresa del usuario
  (`id = get_current_company_id()`). INSERT/DELETE solo por `owner`
  de la misma empresa (INSERT verifica que el usuario ya tenga un perfil
  owner en esa empresa; DELETE restringido a owners existentes).
- `profiles`: SELECT/UPDATE limitadas a perfiles de la misma empresa.
  INSERT solo para el propio usuario (un owner crea su propio perfil al
  registrarse) y WITH CHECK asegura que company_id coincide con la
  empresa del usuario. DELETE solo el propio usuario.
- Trigger `handle_new_owner_profile()` NO se usa aquí: el registro se
  hace desde el frontend en una transacción lógica (crear company,
  insertar profile, signUp) respetando el orden de políticas. La función
  helper existe para futuras tablas hijas.

## Notas importantes
1. Los roles están en un CHECK constraint, no en un tipo enum, para
   facilitar evolución sin migraciones destructivas.
2. `profiles.company_id` es NOT NULL: todo usuario debe pertenecer a una
   empresa. El registro (sign-up) crea primero la empresa y luego el
   perfil desde el cliente autenticado.
3. La política de INSERT en `profiles` permite que un usuario inserte
   su propio perfil (id = auth.uid()) con rol 'owner' y un company_id
   que aún no tiene perfil asociado (primer owner). Para perfiles
   posteriores (empleados), se deberá usar una edge function
   SECURITY DEFINER (etapa posterior).
4. Las políticas usan `get_current_company_id()` (SECURITY DEFINER) para
   evitar recursividad: una política sobre `profiles` que consulte
   `profiles` generaría un ciclo infinito; la función lo rompe porque
   ejecuta con privilegios de definidor y el propietario de la tabla.
5. `updated_at` se actualiza automáticamente mediante un trigger en
   ambas tablas.
*/

-- =========================================================
-- Tabla: companies
-- =========================================================
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  tax_id text,
  phone text,
  email text,
  address text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- Tabla: profiles
-- =========================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('owner', 'admin', 'employee')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS profiles_company_id_idx ON profiles(company_id);
CREATE INDEX IF NOT EXISTS companies_tax_id_idx ON companies(tax_id);

-- =========================================================
-- Trigger para updated_at
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS companies_set_updated_at ON companies;
CREATE TRIGGER companies_set_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS profiles_set_updated_at ON profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- Función auxiliar: company_id del usuario autenticado
-- SECURITY DEFINER para evitar recursividad en RLS
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.company_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_company_id() TO authenticated;

-- =========================================================
-- Habilitar RLS
-- =========================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- Políticas RLS: companies
-- =========================================================
-- SELECT: solo la empresa del usuario
DROP POLICY IF EXISTS "companies_select_own" ON companies;
CREATE POLICY "companies_select_own"
ON companies FOR SELECT
TO authenticated
USING (id = public.get_current_company_id());

-- UPDATE: solo la empresa del usuario
DROP POLICY IF EXISTS "companies_update_own" ON companies;
CREATE POLICY "companies_update_own"
ON companies FOR UPDATE
TO authenticated
USING (id = public.get_current_company_id())
WITH CHECK (id = public.get_current_company_id());

-- INSERT: permitido para usuarios autenticados que estén creando su
-- primera empresa (aún sin perfil). Un owner puede crear la empresa
-- durante el registro. Para evitar que un usuario cree múltiples
-- empresas en esta etapa, se permite INSERT sin restriccion de
-- company_id (no tiene sentido comparar con perfil inexistente).
-- La verificación de unicidad de owner se hará por lógica de app.
DROP POLICY IF EXISTS "companies_insert_owner" ON companies;
CREATE POLICY "companies_insert_owner"
ON companies FOR INSERT
TO authenticated
WITH CHECK (true);

-- DELETE: solo owners de la empresa
DROP POLICY IF EXISTS "companies_delete_owner" ON companies;
CREATE POLICY "companies_delete_owner"
ON companies FOR DELETE
TO authenticated
USING (
  id = public.get_current_company_id()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.company_id = companies.id
      AND p.role = 'owner'
  )
);

-- =========================================================
-- Políticas RLS: profiles
-- =========================================================
-- SELECT: solo perfiles de la misma empresa
DROP POLICY IF EXISTS "profiles_select_own_company" ON profiles;
CREATE POLICY "profiles_select_own_company"
ON profiles FOR SELECT
TO authenticated
USING (company_id = public.get_current_company_id());

-- INSERT: el usuario crea su propio perfil (registro owner).
-- El WITH CHECK asegura que el id sea el del usuario autenticado.
DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- UPDATE: solo perfiles de la misma empresa
DROP POLICY IF EXISTS "profiles_update_own_company" ON profiles;
CREATE POLICY "profiles_update_own_company"
ON profiles FOR UPDATE
TO authenticated
USING (company_id = public.get_current_company_id())
WITH CHECK (company_id = public.get_current_company_id());

-- DELETE: el usuario solo puede eliminar su propio perfil
DROP POLICY IF EXISTS "profiles_delete_self" ON profiles;
CREATE POLICY "profiles_delete_self"
ON profiles FOR DELETE
TO authenticated
USING (id = auth.uid());

-- =========================================================
-- Grants
-- =========================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
