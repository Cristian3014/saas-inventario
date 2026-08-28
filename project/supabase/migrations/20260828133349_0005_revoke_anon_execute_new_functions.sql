/*
# Revoke anon execute on new SECURITY DEFINER functions

## Resumen
Las funciones `has_company_role` y `register_new_company` mantenían
acceso EXECUTE para el rol `anon` a pesar del REVOKE FROM PUBLIC
previo. Esta migración revoca explícitamente de `anon` y `PUBLIC`,
manteniendo el grant solo para `authenticated`.

## Notas
- `register_new_company` es llamada por el frontend después de
  signUp, cuando el usuario YA está autenticado, por lo que solo
  necesita `authenticated`.
- `has_company_role` es usada internamente por políticas RLS, que
  se evalúan en el contexto del usuario autenticado.
*/

REVOKE EXECUTE ON FUNCTION public.has_company_role(uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.register_new_company(text, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_current_company_id() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_company_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_new_company(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_company_id() TO authenticated;
