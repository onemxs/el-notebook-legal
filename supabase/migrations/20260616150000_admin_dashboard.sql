-- =============================================================================
-- PasantIA — RPC del panel de superadmin
-- Devuelve métricas globales + tabla de cuentas en una sola llamada.
-- SECURITY DEFINER: lee todo el sistema, pero SOLO si el llamante es superadmin.
-- =============================================================================

create or replace function public.admin_dashboard()
returns json language plpgsql stable security definer set search_path = public as $$
declare result json;
begin
  if not public.es_superadmin() then
    raise exception 'No autorizado';
  end if;

  select json_build_object(
    'usuarios',    (select count(*) from public.perfiles),
    'despachos',   (select count(*) from public.organizaciones),
    'expedientes', (select count(*) from public.casos),
    'cuentas', coalesce((
      select json_agg(row_to_json(c) order by c.expedientes desc, c.nombre)
      from (
        select
          p.id,
          coalesce(nullif(p.nombre_completo, ''), 'Sin nombre') as nombre,
          p.tipo_plan,
          p.rol_organizacion,
          p.especialidad,
          o.nombre as organizacion,
          (select count(*) from public.casos k where k.user_id = p.id) as expedientes,
          p.created_at
        from public.perfiles p
        left join public.organizaciones o on o.id = p.organizacion_id
      ) c
    ), '[]'::json)
  ) into result;

  return result;
end;
$$;

grant execute on function public.admin_dashboard() to authenticated;
