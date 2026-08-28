/*
# Reestructuración multi-tenant: company_memberships + registro transaccional

## Resumen
Corrige tres problemas de la arquitectura inicial:
1. El registro creaba company + profile desde el frontend en pasos
   separados → si un paso fallaba, quedaban datos huérfanos (usuario
   sin empresa). Ahora el registro es atómico vía una función RPC
   SECURITY DEFINER.
2. El role venía del frontend → ahora se verifica server-side en RLS
   consultando `company_memberships.role`.
3. Cada usuario solo podía pertenecer a una empresa (profiles.company_id)
   → ahora `company_memberships` permite que un usuario pertenezca a
   múltiples empresas con roles distintos.

## Pasos de la migración
1. Eliminar políticas RLS antiguas que referencian profiles.company_id.
2. Eliminar columnas company_id y role de profiles.
3. Crear tabla company_memberships.
4. Crear/actualizar funciones: get_current_company_id, has_company_role,
   register_new_company.
5. Crear nuevas políticas RLS en companies, profiles, company_memberships.
6. Configurar grants y permisos de EXECUTE.

## Notas
- Las tablas estaban vacías, no hay pérdida de datos.
- El frontend ahora llama supabase.rpc('register_new_company', ...).
- Las funciones SECURITY DEFINER bypassan RLS para operaciones internas.
*/

-- =========================================================
-- 1. Eliminar políticas antiguas que dependen de profiles.company_id
-- =========================================================
DROP POLICY IF EXISTS "companies_select_own" ON companies;
DROP POLICY IF EXISTS "companies_update_own" ON companies;
DROP POLICY IF EXISTS "companies_insert_owner" ON companies;
DROP POLICY IF EXISTS "companies_delete_owner" ON companies;
DROP POLICY IF EXISTS "profiles_select_own_company" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own_company" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_self" ON profiles;

-- =========================================================
-- 2. Eliminar columnas obsoletas de profiles
-- =========================================================
ALTER TABLE profiles DROP COLUMN IF EXISTS company_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS role;

-- =========================================================
-- 3. Crear tabla company_memberships
-- =========================================================
CREATE TABLE IF NOT EXISTS company_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('owner', 'admin', 'employee')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

CREATE INDEX IF NOT EXISTS company_memberships_user_id_idx ON company_memberships(user_id);
CREATE INDEX IF NOT EXISTS company_memberships_company_id_idx ON company_memberships(company_id);

-- =========================================================
-- 4. Trigger updated_at para company_memberships
-- =========================================================
DROP TRIGGER IF EXISTS company_memberships_set_updated_at ON company_memberships;
CREATE TRIGGER company_memberships_set_updated_at
  BEFORE UPDATE ON company_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 5. Función: get_current_company_id (actualizada)
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cm.company_id
  FROM public.company_memberships cm
  WHERE cm.user_id = auth.uid()
  ORDER BY cm.created_at ASC
  LIMIT 1;
$$;

-- =========================================================
-- 6. Función: has_company_role
-- =========================================================
CREATE OR REPLACE FUNCTION public.has_company_role(p_company uuid, p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = auth.uid()
      AND company_id = p_company
      AND role = p_role
  );
$$;

-- =========================================================
-- 7. Función: register_new_company (transaccional)
-- =========================================================
CREATE OR REPLACE FUNCTION public.register_new_company(
  p_company_name text,
  p_full_name text,
  p_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Crear empresa
  INSERT INTO public.companies (name)
  VALUES (p_company_name)
  RETURNING id INTO v_company_id;

  -- Crear perfil (INSERT ... ON CONFLICT para idempotencia)
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (v_user_id, p_full_name, p_email)
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        updated_at = now();

  -- Crear membresía owner
  INSERT INTO public.company_memberships (user_id, company_id, role)
  VALUES (v_user_id, v_company_id, 'owner')
  ON CONFLICT (user_id, company_id) DO NOTHING;

  RETURN v_company_id;
END;
$$;

-- =========================================================
-- 8. Grants de EXECUTE (solo authenticated)
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.get_current_company_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_company_role(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.register_new_company(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_company_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_new_company(text, text, text) TO authenticated;

-- =========================================================
-- 9. Habilitar RLS en company_memberships
-- =========================================================
ALTER TABLE company_memberships ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 10. Políticas RLS: companies
-- =========================================================
-- SELECT: solo si el usuario es miembro de la empresa
DROP POLICY IF EXISTS "companies_select_own" ON companies;
CREATE POLICY "companies_select_own"
ON companies FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE company_memberships.user_id = auth.uid()
      AND company_memberships.company_id = companies.id
  )
);

-- UPDATE: solo si el usuario es miembro
DROP POLICY IF EXISTS "companies_update_own" ON companies;
CREATE POLICY "companies_update_own"
ON companies FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE company_memberships.user_id = auth.uid()
      AND company_memberships.company_id = companies.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE company_memberships.user_id = auth.uid()
      AND company_memberships.company_id = companies.id
  )
);

-- INSERT: bloqueado desde el cliente (registro vía RPC)
DROP POLICY IF EXISTS "companies_insert_owner" ON companies;
CREATE POLICY "companies_insert_owner"
ON companies FOR INSERT
TO authenticated
WITH CHECK (false);

-- DELETE: solo owners de la empresa
DROP POLICY IF EXISTS "companies_delete_owner" ON companies;
CREATE POLICY "companies_delete_owner"
ON companies FOR DELETE
TO authenticated
USING (
  public.has_company_role(companies.id, 'owner')
);

-- =========================================================
-- 11. Políticas RLS: profiles
-- =========================================================
-- SELECT: el usuario ve solo su propio perfil
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- UPDATE: el usuario edita su propio perfil
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- INSERT: bloqueado desde el cliente (creación vía RPC)
DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (false);

-- DELETE: bloqueado desde el cliente
DROP POLICY IF EXISTS "profiles_delete_self" ON profiles;
CREATE POLICY "profiles_delete_self"
ON profiles FOR DELETE
TO authenticated
USING (false);

-- =========================================================
-- 12. Políticas RLS: company_memberships
-- =========================================================
-- SELECT: el usuario ve sus membresías y las de empresas donde es miembro
DROP POLICY IF EXISTS "memberships_select_own" ON company_memberships;
CREATE POLICY "memberships_select_own"
ON company_memberships FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR company_id = public.get_current_company_id()
);

-- INSERT: bloqueado desde el cliente
DROP POLICY IF EXISTS "memberships_insert_blocked" ON company_memberships;
CREATE POLICY "memberships_insert_blocked"
ON company_memberships FOR INSERT
TO authenticated
WITH CHECK (false);

-- UPDATE: bloqueado desde el cliente
DROP POLICY IF EXISTS "memberships_update_blocked" ON company_memberships;
CREATE POLICY "memberships_update_blocked"
ON company_memberships FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

-- DELETE: bloqueado desde el cliente
DROP POLICY IF EXISTS "memberships_delete_blocked" ON company_memberships;
CREATE POLICY "memberships_delete_blocked"
ON company_memberships FOR DELETE
TO authenticated
USING (false);

-- =========================================================
-- 13. Grants
-- =========================================================
GRANT SELECT, UPDATE ON companies TO authenticated;
GRANT SELECT, UPDATE ON profiles TO authenticated;
GRANT SELECT ON company_memberships TO authenticated;
