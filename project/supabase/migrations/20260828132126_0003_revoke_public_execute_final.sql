/*
# Revoke PUBLIC execute on SECURITY DEFINER helper functions

## Resumen
PostgreSQL otorga EXECUTE a PUBLIC por defecto en las funciones. Las
revocaciones anteriores (de `anon` y `authenticated`) no eliminaron el
acceso vía PUBLIC. Esta migración revoca EXECUTE de PUBLIC y luego
re-concede solo lo estrictamente necesario.

## Cambios
1. `set_updated_at()` — trigger interno. REVOKE de PUBLIC. No se
   re-concede a nadie; solo el propietario la invoca vía trigger.
2. `get_current_company_id()` — usada por políticas RLS. REVOKE de
   PUBLIC, luego GRANT solo a `authenticated` (necesario para que las
   políticas RLS funcionen en el contexto del usuario autenticado).
*/

REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_current_company_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_company_id() TO authenticated;
