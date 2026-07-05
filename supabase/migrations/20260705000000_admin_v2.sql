-- =============================================================================
-- PasantIA — Panel de superadmin v2
--   • api_uso_diario: agregado diario del consumo de IA (api_uso se borra a 24h)
--   • perfiles.suspendida / perfiles.cuota_ia: controles por cuenta
--   • registrar_uso_api ahora devuelve 'ok' | 'limite' | 'suspendida'
--   • admin_auditoria: bitácora de acciones del superadmin
--   • admin_actualizar_cuenta / admin_cuenta_detalle / admin_dashboard v2
-- =============================================================================

-- ── Controles por cuenta ─────────────────────────────────────────────────────
-- Sin GRANT de UPDATE a authenticated: solo cambian vía RPC de superadmin.
alter table public.perfiles
  add column if not exists suspendida boolean not null default false,
  add column if not exists cuota_ia   int;  -- null = usa el límite global

-- ── Consumo diario de IA ─────────────────────────────────────────────────────
create table if not exists public.api_uso_diario (
  user_id uuid not null,
  dia     date not null,
  n       int  not null default 0,
  primary key (user_id, dia)
);
alter table public.api_uso_diario enable row level security; -- sin policies: solo definer/service role

-- ── registrar_uso_api v2 ─────────────────────────────────────────────────────
-- Cambia el tipo de retorno (boolean → text), hay que soltar la vieja.
drop function if exists public.registrar_uso_api(uuid, int);
create function public.registrar_uso_api(p_user uuid, p_limite int default 60)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_n int;
  v_susp boolean;
  v_cuota int;
begin
  select suspendida, cuota_ia into v_susp, v_cuota from perfiles where id = p_user;
  if coalesce(v_susp, false) then return 'suspendida'; end if;

  insert into api_uso (user_id, ventana, n)
  values (p_user, date_trunc('hour', now()), 1)
  on conflict (user_id, ventana) do update set n = api_uso.n + 1
  returning n into v_n;

  insert into api_uso_diario (user_id, dia, n)
  values (p_user, current_date, 1)
  on conflict (user_id, dia) do update set n = api_uso_diario.n + 1;

  -- Limpieza oportunista cada ~100 llamadas.
  if v_n % 100 = 0 then
    delete from api_uso where ventana < now() - interval '24 hours';
    delete from api_uso_diario where dia < current_date - 120;
  end if;

  return case when v_n <= coalesce(v_cuota, p_limite) then 'ok' else 'limite' end;
end
$fn$;
revoke all on function public.registrar_uso_api(uuid, int) from public, anon, authenticated;

-- ── Bitácora de acciones administrativas ─────────────────────────────────────
create table if not exists public.admin_auditoria (
  id         uuid primary key default gen_random_uuid(),
  admin_id   uuid not null references auth.users (id) on delete cascade,
  accion     text not null,
  objetivo   uuid,
  detalle    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_auditoria enable row level security; -- sin policies: solo vía RPCs definer

-- ── Acciones del superadmin sobre una cuenta ─────────────────────────────────
-- Parámetros null = "no cambiar". p_reset_cuota true = volver al límite global.
create or replace function public.admin_actualizar_cuenta(
  p_id          uuid,
  p_suspendida  boolean default null,
  p_tipo_plan   text    default null,
  p_cuota_ia    int     default null,
  p_reset_cuota boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_cambios jsonb := '{}'::jsonb;
begin
  if not public.es_superadmin() then raise exception 'No autorizado'; end if;
  if p_id = auth.uid() and coalesce(p_suspendida, false) then
    raise exception 'No puedes suspender tu propia cuenta';
  end if;

  if p_suspendida is not null then
    update perfiles set suspendida = p_suspendida where id = p_id;
    v_cambios := v_cambios || jsonb_build_object('suspendida', p_suspendida);
  end if;

  if p_tipo_plan is not null then
    if p_tipo_plan not in ('individual', 'despacho') then raise exception 'Plan inválido'; end if;
    update perfiles set tipo_plan = p_tipo_plan where id = p_id;
    v_cambios := v_cambios || jsonb_build_object('tipo_plan', p_tipo_plan);
  end if;

  if p_reset_cuota then
    update perfiles set cuota_ia = null where id = p_id;
    v_cambios := v_cambios || jsonb_build_object('cuota_ia', 'global');
  elsif p_cuota_ia is not null then
    if p_cuota_ia < 1 then raise exception 'Cuota inválida'; end if;
    update perfiles set cuota_ia = p_cuota_ia where id = p_id;
    v_cambios := v_cambios || jsonb_build_object('cuota_ia', p_cuota_ia);
  end if;

  if v_cambios <> '{}'::jsonb then
    insert into admin_auditoria (admin_id, accion, objetivo, detalle)
    values (auth.uid(), 'actualizar_cuenta', p_id, v_cambios);
  end if;
end;
$$;
grant execute on function public.admin_actualizar_cuenta(uuid, boolean, text, int, boolean) to authenticated;

-- ── Dashboard v2 ─────────────────────────────────────────────────────────────
-- Añade: email, última conexión, suspendida, cuota, IA 30 días por cuenta;
-- métricas globales de IA; últimas 20 entradas de auditoría.
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
            where d.user_id = p.id and d.dia > current_date - 30) as ia_mes
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

-- ── Ficha completa de una cuenta ─────────────────────────────────────────────
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
    ), '[]'::json)
  ) into result;

  return result;
end;
$$;
grant execute on function public.admin_cuenta_detalle(uuid) to authenticated;
