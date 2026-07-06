-- =============================================================================
-- PasantIA — Costo estimado de IA por cuenta
--   • ia_tokens_diario: tokens entrada/salida por usuario/día/modelo
--   • registrar_tokens_ia: lo alimentan los endpoints tras cada respuesta
--   • admin_dashboard v3 / admin_cuenta_detalle v2: agregan ia_modelos (30 días)
--     El costo en USD se calcula en la UI (mapa de precios por modelo) para
--     poder actualizar precios sin tocar la base.
-- =============================================================================

create table if not exists public.ia_tokens_diario (
  user_id    uuid   not null,
  dia        date   not null,
  modelo     text   not null,
  n          int    not null default 0,
  tokens_in  bigint not null default 0,
  tokens_out bigint not null default 0,
  primary key (user_id, dia, modelo)
);
alter table public.ia_tokens_diario enable row level security; -- sin policies: solo definer/service role

create or replace function public.registrar_tokens_ia(p_user uuid, p_modelo text, p_in bigint, p_out bigint)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into ia_tokens_diario (user_id, dia, modelo, n, tokens_in, tokens_out)
  values (p_user, current_date, coalesce(nullif(p_modelo, ''), 'desconocido'), 1, greatest(p_in, 0), greatest(p_out, 0))
  on conflict (user_id, dia, modelo) do update
    set n          = ia_tokens_diario.n + 1,
        tokens_in  = ia_tokens_diario.tokens_in  + excluded.tokens_in,
        tokens_out = ia_tokens_diario.tokens_out + excluded.tokens_out;
  -- Limpieza oportunista (~1% de llamadas): 13 meses de historial bastan.
  if random() < 0.01 then
    delete from ia_tokens_diario where dia < current_date - 400;
  end if;
end
$fn$;
revoke all on function public.registrar_tokens_ia(uuid, text, bigint, bigint) from public, anon, authenticated;

-- ── Dashboard v3: ia_modelos global y por cuenta ─────────────────────────────
create or replace function public.admin_dashboard()
returns json language plpgsql stable security definer set search_path = public, auth as $$
declare result json;
begin
  if not public.es_superadmin() then
    raise exception 'No autorizado';
  end if;

  select json_build_object(
    'usuarios',    (select count(*) from public.perfiles),
    'despachos',   (select count(*) from public.organizaciones),
    'expedientes', (select count(*) from public.casos),
    'ia_hoy',      (select coalesce(sum(n), 0) from public.api_uso_diario where dia = current_date),
    'ia_mes',      (select coalesce(sum(n), 0) from public.api_uso_diario where dia > current_date - 30),
    'ia_modelos', coalesce((
      select json_agg(row_to_json(g)) from (
        select modelo, sum(tokens_in)::bigint as tin, sum(tokens_out)::bigint as tout
        from public.ia_tokens_diario where dia > current_date - 30
        group by modelo
      ) g
    ), '[]'::json),
    'cuentas', coalesce((
      select json_agg(row_to_json(c) order by c.expedientes desc, c.nombre)
      from (
        select
          p.id,
          coalesce(nullif(p.nombre_completo, ''), 'Sin nombre') as nombre,
          u.email,
          p.tipo_plan,
          p.rol_organizacion,
          p.especialidad,
          p.suspendida,
          p.cuota_ia,
          p.created_at,
          u.last_sign_in_at,
          o.nombre as organizacion,
          (select count(*) from public.casos k where k.user_id = p.id) as expedientes,
          (select coalesce(sum(d.n), 0) from public.api_uso_diario d
            where d.user_id = p.id and d.dia > current_date - 30) as ia_mes,
          (select coalesce(json_agg(row_to_json(x)), '[]'::json) from (
            select modelo, sum(tokens_in)::bigint as tin, sum(tokens_out)::bigint as tout
            from public.ia_tokens_diario td
            where td.user_id = p.id and td.dia > current_date - 30
            group by modelo
          ) x) as ia_modelos
        from public.perfiles p
        left join public.organizaciones o on o.id = p.organizacion_id
        left join auth.users u on u.id = p.id
      ) c
    ), '[]'::json),
    'auditoria', coalesce((
      select json_agg(row_to_json(a))
      from (
        select aa.accion, aa.detalle, aa.created_at,
               coalesce(nullif(pa.nombre_completo, ''), 'Admin')  as admin,
               coalesce(nullif(po.nombre_completo, ''), 'Cuenta') as objetivo
        from public.admin_auditoria aa
        left join public.perfiles pa on pa.id = aa.admin_id
        left join public.perfiles po on po.id = aa.objetivo
        order by aa.created_at desc
        limit 20
      ) a
    ), '[]'::json)
  ) into result;

  return result;
end;
$$;

-- ── Ficha v2: desglose de tokens por modelo ──────────────────────────────────
create or replace function public.admin_cuenta_detalle(p_id uuid)
returns json language plpgsql stable security definer set search_path = public, auth as $$
declare result json;
begin
  if not public.es_superadmin() then
    raise exception 'No autorizado';
  end if;

  select json_build_object(
    'perfil', (
      select row_to_json(x) from (
        select p.id,
               coalesce(nullif(p.nombre_completo, ''), 'Sin nombre') as nombre,
               u.email, p.cedula, p.especialidad, p.tipo_plan, p.rol_organizacion,
               p.suspendida, p.cuota_ia, p.onboarding_completo, p.created_at,
               u.last_sign_in_at, o.nombre as organizacion
        from public.perfiles p
        left join public.organizaciones o on o.id = p.organizacion_id
        left join auth.users u on u.id = p.id
        where p.id = p_id
      ) x
    ),
    'casos_activos',    (select count(*) from public.casos where user_id = p_id and not archivado),
    'casos_archivados', (select count(*) from public.casos where user_id = p_id and archivado),
    'documentos', (select count(*) from public.documentos d
                    join public.casos c on c.id = d.caso_id where c.user_id = p_id),
    'mensajes',   (select count(*) from public.chat_mensajes m
                    join public.casos c on c.id = m.caso_id where c.user_id = p_id),
    'plazos_activos', (select count(*) from public.timeline_eventos t
                        join public.casos c on c.id = t.caso_id
                        where c.user_id = p_id and t.severidad = 'deadline'
                          and t.iso ~ '^\d{4}-\d{2}-\d{2}' and (t.iso)::date >= current_date),
    'materias', coalesce((
      select json_agg(row_to_json(m) order by m.n desc) from (
        select rama, count(*)::int as n from public.casos where user_id = p_id group by rama
      ) m
    ), '[]'::json),
    'ia_serie', coalesce((
      select json_agg(row_to_json(s) order by s.dia) from (
        select dia, n from public.api_uso_diario where user_id = p_id and dia > current_date - 30
      ) s
    ), '[]'::json),
    'ia_modelos', coalesce((
      select json_agg(row_to_json(x)) from (
        select modelo, sum(tokens_in)::bigint as tin, sum(tokens_out)::bigint as tout
        from public.ia_tokens_diario
        where user_id = p_id and dia > current_date - 30
        group by modelo
      ) x
    ), '[]'::json)
  ) into result;

  return result;
end;
$$;
