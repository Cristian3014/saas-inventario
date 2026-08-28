/*
# Revoke public execute on SECURITY DEFINER helper functions

## Resumen
Corrige advertencias del linter de seguridad de Supabase:
`get_current_company_id()` y `set_updated_at()` eran ejecutables vía
REST API por los roles `anon` y `authenticated`. Estas funciones son
internas (usadas por RLS y triggers) y no deben exponerse en la API.

## Cambios
1. `set_updated_at()` (trigger): REVOKE EXECUTE de `anon` y
   `authenticated`. Solo el propietario la invoca vía trigger.
2. `get_current_company_id()` (usada por RLS): REVOKE EXECUTE de `anon`.
   Se mantiene GRANT para `authenticated` porque las políticas RLS
   ejecutan la función en el contexto del usuario autenticado y esto
   es necesario para que el aislamiento funcione. Sin embargo, para
   evitar que se llame directamente vía REST, revocamos de `anon`
   explícitamente.

## Notas
- `get_current_company_id` debe seguir siendo ejecutable por
  `authenticated` porque las políticas RLS de `companies` y `profiles`
  la invocan. Revocarla de `authenticated` rompería el aislamiento.
- `set_updated_at` nunca se llama desde la API; solo la dispara el
  trigger BEFORE UPDATE. Revocar todo acceso externo es seguro.
*/

REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_current_company_id() FROM anon;
