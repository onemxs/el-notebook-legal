-- =============================================================================
-- PasantIA — Ubicación del despacho en el perfil
-- Para que los escritos se fechen y se firmen en el lugar REAL del abogado
-- (no "Ciudad de México" por defecto) y para el domicilio de notificaciones.
-- =============================================================================

alter table public.perfiles
  add column if not exists ciudad_despacho    text,
  add column if not exists entidad_despacho   text,  -- estado (Veracruz, Jalisco, …)
  add column if not exists domicilio_despacho text,  -- calle, número, colonia, CP
  add column if not exists telefono_despacho  text;

-- El usuario puede editar estos campos de su propio perfil (UPDATE por columna;
-- rol_sistema/tipo_plan/organizacion_id siguen cambiando solo vía RPC).
grant update (ciudad_despacho, entidad_despacho, domicilio_despacho, telefono_despacho)
  on public.perfiles to authenticated;
