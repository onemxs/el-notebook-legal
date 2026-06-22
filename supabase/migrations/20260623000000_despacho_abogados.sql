-- Arquitectura de Despacho Multi-Abogado
-- 1. Última conexión en perfiles
-- 2. Abogado asignado en casos
-- 3. Código de colaboración en organizaciones
-- 4. RPCs para unirse por código y registrar conexión

alter table public.perfiles
  add column if not exists ultima_conexion timestamptz;

alter table public.casos
  add column if not exists abogado_asignado_id uuid references auth.users (id) on delete set null;

create index if not exists idx_casos_abogado on public.casos (abogado_asignado_id);

alter table public.organizaciones
  add column if not exists codigo_colaboracion text unique;

-- Actualiza la última conexión del usuario actual
create or replace function public.tocar_conexion()
returns void
language sql
security definer
as $$
  update public.perfiles set ultima_conexion = now() where id = auth.uid();
$$;

-- Genera / regenera el código de colaboración del despacho (solo dueño)
create or replace function public.generar_codigo_colaboracion()
returns text
language plpgsql
security definer
as $$
declare
  v_code text;
  v_org_id uuid;
begin
  select organizacion_id into v_org_id
  from public.perfiles
  where id = auth.uid() and rol_organizacion = 'dueno';
  if v_org_id is null then
    raise exception 'Solo el dueño del despacho puede generar el código de colaboración.';
  end if;
  v_code := 'PAS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4)) || '-MX';
  update public.organizaciones set codigo_colaboracion = v_code where id = v_org_id;
  return v_code;
end;
$$;

-- Ingresa a un despacho usando su código de colaboración
create or replace function public.unirse_por_codigo(p_codigo text)
returns text
language plpgsql
security definer
as $$
declare
  v_org_id uuid;
  v_org_nombre text;
begin
  select id, nombre into v_org_id, v_org_nombre
  from public.organizaciones
  where codigo_colaboracion = upper(trim(p_codigo));
  if v_org_id is null then
    raise exception 'Código de colaboración inválido.';
  end if;
  update public.perfiles
  set organizacion_id = v_org_id,
      rol_organizacion = 'invitado',
      tipo_plan = 'despacho'
  where id = auth.uid();
  return v_org_nombre;
end;
$$;

-- Obtiene el código de colaboración del despacho del usuario actual
create or replace function public.obtener_codigo_colaboracion()
returns text
language sql
security definer
as $$
  select o.codigo_colaboracion
  from public.perfiles p
  join public.organizaciones o on o.id = p.organizacion_id
  where p.id = auth.uid();
$$;

grant execute on function public.tocar_conexion            to authenticated;
grant execute on function public.generar_codigo_colaboracion to authenticated;
grant execute on function public.unirse_por_codigo          to authenticated;
grant execute on function public.obtener_codigo_colaboracion to authenticated;
