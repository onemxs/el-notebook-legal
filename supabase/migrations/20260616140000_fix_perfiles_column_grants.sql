-- =============================================================================
-- PasantIA — Fix anti-escalada en perfiles
--
-- Bug: en la migración inicial se hizo `grant update` a nivel TABLA y luego
-- `revoke update (cols)`. En PostgreSQL los privilegios de tabla y de columna son
-- INDEPENDIENTES: un REVOKE de columna NO acota un GRANT de tabla, así que el
-- usuario conservaba UPDATE sobre todas las columnas (incluida rol_sistema) y
-- podía auto-promoverse a superadmin.
--
-- Fix: quitar el UPDATE a nivel tabla y otorgar UPDATE solo en columnas seguras.
-- rol_sistema / tipo_plan / organizacion_id / rol_organizacion cambian EXCLUSIVAMENTE
-- vía los RPC SECURITY DEFINER (migrar_a_despacho, aceptar_invitacion).
-- =============================================================================

revoke update on public.perfiles from authenticated;

grant update (nombre_completo, cedula, especialidad, logotipo_url, tema, onboarding_completo)
  on public.perfiles to authenticated;
