-- =============================================================================
-- PasantIA — Fundación multi-tenant (ADAPTATIVA al esquema existente)
--
-- Esquema previo:  casos + documentos + timeline_eventos + chat_mensajes
--   (relacional, FK por caso_id, SIN user_id, RLS = allow_all). 0 filas, 0 users.
--
-- Esta migración:
--   • crea organizaciones / perfiles / invitaciones
--   • añade tenencia (user_id, organizacion_id) a casos (ALTER, no recrea)
--   • reemplaza allow_all por RLS estricto:
--        individual → solo el creador   |   despacho → toda la organización
--   • los hijos (documentos/timeline/chat) heredan el acceso de su caso padre
--
-- Aplicar:  supabase db push  ·  SQL Editor  ·  Management API
-- =============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- NUEVAS TABLAS
-- ----------------------------------------------------------------------------

create table if not exists public.organizaciones (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  logotipo_url text,
  creado_by    uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now()
);

create table if not exists public.perfiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  nombre_completo     text,
  cedula              text,
  especialidad        text,
  logotipo_url        text,
  rol_sistema         text not null default 'usuario'    check (rol_sistema      in ('superadmin','usuario')),
  tipo_plan           text not null default 'individual' check (tipo_plan        in ('individual','despacho')),
  organizacion_id     uuid references public.organizaciones (id) on delete set null,
  rol_organizacion    text not null default 'ninguno'    check (rol_organizacion in ('dueno','invitado','ninguno')),
  tema                text not null default 'auto'       check (tema             in ('claro','oscuro','auto')),
  onboarding_completo boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.invitaciones (
  id              uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones (id) on delete cascade,
  email_invitado  text not null,
  token           uuid not null default gen_random_uuid() unique,
  estado          text not null default 'pendiente' check (estado in ('pendiente','aceptada','expirada')),
  invitado_by     uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '14 days')
);

-- ----------------------------------------------------------------------------
-- TENENCIA EN EL ESQUEMA EXISTENTE (casos)
-- ----------------------------------------------------------------------------

alter table public.casos
  add column if not exists user_id         uuid default auth.uid() references auth.users (id) on delete cascade,
  add column if not exists organizacion_id uuid references public.organizaciones (id) on delete set null;

create index if not exists idx_casos_user        on public.casos (user_id);
create index if not exists idx_casos_org         on public.casos (organizacion_id);
create index if not exists idx_perfiles_org      on public.perfiles (organizacion_id);
create index if not exists idx_invitaciones_tok  on public.invitaciones (token);

-- ----------------------------------------------------------------------------
-- HELPERS  (SECURITY DEFINER → evitan recursión de RLS)
-- ----------------------------------------------------------------------------

create or replace function public.mi_organizacion_id()
returns uuid language sql stable security definer set search_path = public as $$
  select organizacion_id from public.perfiles where id = auth.uid()
$$;

create or replace function public.es_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select rol_sistema = 'superadmin' from public.perfiles where id = auth.uid()), false)
$$;

-- ¿El usuario actual puede ver/editar este caso? (dueño, misma org, o superadmin).
-- Lo usan las políticas de los hijos para heredar el acceso del caso padre.
create or replace function public.puede_acceder_caso(p_caso uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.casos c
    where c.id = p_caso
      and ( c.user_id = auth.uid()
            or (c.organizacion_id is not null and c.organizacion_id = public.mi_organizacion_id())
            or public.es_superadmin() )
  )
$$;

-- ----------------------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------------------

-- Crea el perfil al registrarse. El dueño del producto queda como superadmin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, nombre_completo, rol_sistema)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    case when new.email = 'omixtega@gmail.com' then 'superadmin' else 'usuario' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Estampa user_id + organizacion_id del caso desde el perfil del creador.
-- (No falsificable: el cliente no decide con qué org se comparte.)
create or replace function public.set_caso_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is null then new.user_id := auth.uid(); end if;
  new.organizacion_id := (select organizacion_id from public.perfiles where id = new.user_id);
  return new;
end;
$$;

drop trigger if exists trg_set_caso_org on public.casos;
create trigger trg_set_caso_org
  before insert on public.casos for each row execute function public.set_caso_org();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists trg_perfiles_touch on public.perfiles;
create trigger trg_perfiles_touch before update on public.perfiles
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- RPCs  (operaciones privilegiadas)
-- ----------------------------------------------------------------------------

-- individual → despacho: crea org, nombra dueño y ELEVA todos sus expedientes.
create or replace function public.migrar_a_despacho(p_nombre text, p_logotipo_url text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;

  select organizacion_id into v_org from public.perfiles where id = auth.uid();
  if v_org is not null then return v_org; end if;  -- idempotente

  insert into public.organizaciones (nombre, logotipo_url, creado_by)
  values (coalesce(nullif(p_nombre, ''), 'Mi Despacho'), p_logotipo_url, auth.uid())
  returning id into v_org;

  update public.perfiles
     set tipo_plan = 'despacho', organizacion_id = v_org, rol_organizacion = 'dueno', updated_at = now()
   where id = auth.uid();

  update public.casos set organizacion_id = v_org where user_id = auth.uid();

  return v_org;
end;
$$;

-- Aceptar invitación por token: vincula al usuario actual a la organización.
create or replace function public.aceptar_invitacion(p_token uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_estado text; v_exp timestamptz;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;

  select organizacion_id, estado, expires_at into v_org, v_estado, v_exp
    from public.invitaciones where token = p_token;

  if v_org is null           then raise exception 'Invitación no encontrada'; end if;
  if v_estado <> 'pendiente' then raise exception 'La invitación ya fue utilizada'; end if;
  if v_exp < now() then
    update public.invitaciones set estado = 'expirada' where token = p_token;
    raise exception 'La invitación expiró';
  end if;

  update public.perfiles
     set organizacion_id = v_org, rol_organizacion = 'invitado', updated_at = now()
   where id = auth.uid();

  update public.invitaciones set estado = 'aceptada' where token = p_token;
  return v_org;
end;
$$;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

alter table public.organizaciones enable row level security;
alter table public.perfiles       enable row level security;
alter table public.invitaciones   enable row level security;
alter table public.casos             enable row level security;
alter table public.documentos        enable row level security;
alter table public.timeline_eventos  enable row level security;
alter table public.chat_mensajes     enable row level security;

-- Fuera las políticas abiertas previas
drop policy if exists allow_all_casos     on public.casos;
drop policy if exists allow_all_documentos on public.documentos;
drop policy if exists allow_all_timeline   on public.timeline_eventos;
drop policy if exists allow_all_chat       on public.chat_mensajes;

-- perfiles
drop policy if exists perfiles_select on public.perfiles;
create policy perfiles_select on public.perfiles for select using (
  id = auth.uid()
  or (organizacion_id is not null and organizacion_id = public.mi_organizacion_id())
  or public.es_superadmin()
);
drop policy if exists perfiles_insert on public.perfiles;
create policy perfiles_insert on public.perfiles for insert with check (id = auth.uid());
drop policy if exists perfiles_update on public.perfiles;
create policy perfiles_update on public.perfiles for update using (id = auth.uid() or public.es_superadmin());

-- organizaciones
drop policy if exists orgs_select on public.organizaciones;
create policy orgs_select on public.organizaciones for select using (
  id = public.mi_organizacion_id() or creado_by = auth.uid() or public.es_superadmin()
);
drop policy if exists orgs_insert on public.organizaciones;
create policy orgs_insert on public.organizaciones for insert with check (creado_by = auth.uid());
drop policy if exists orgs_update on public.organizaciones;
create policy orgs_update on public.organizaciones for update using (
  creado_by = auth.uid() or public.es_superadmin()
);

-- invitaciones (solo el dueño del despacho crea)
drop policy if exists inv_select on public.invitaciones;
create policy inv_select on public.invitaciones for select using (
  organizacion_id = public.mi_organizacion_id() or public.es_superadmin()
);
drop policy if exists inv_insert on public.invitaciones;
create policy inv_insert on public.invitaciones for insert with check (
  organizacion_id = public.mi_organizacion_id()
  and exists (select 1 from public.perfiles where id = auth.uid() and rol_organizacion = 'dueno')
);
drop policy if exists inv_update on public.invitaciones;
create policy inv_update on public.invitaciones for update using (
  organizacion_id = public.mi_organizacion_id() or public.es_superadmin()
);

-- casos — REGLA CENTRAL (individual = privado, despacho = compartido por org)
drop policy if exists casos_select on public.casos;
create policy casos_select on public.casos for select using (
  user_id = auth.uid()
  or (organizacion_id is not null and organizacion_id = public.mi_organizacion_id())
  or public.es_superadmin()
);
drop policy if exists casos_insert on public.casos;
create policy casos_insert on public.casos for insert with check (user_id = auth.uid());
drop policy if exists casos_modificar on public.casos;
create policy casos_modificar on public.casos for update using (
  user_id = auth.uid()
  or (organizacion_id is not null and organizacion_id = public.mi_organizacion_id())
);
drop policy if exists casos_borrar on public.casos;
create policy casos_borrar on public.casos for delete using (
  user_id = auth.uid()
  or (organizacion_id is not null and organizacion_id = public.mi_organizacion_id())
);

-- hijos: heredan el acceso del caso padre
drop policy if exists documentos_all on public.documentos;
create policy documentos_all on public.documentos for all
  using (public.puede_acceder_caso(caso_id)) with check (public.puede_acceder_caso(caso_id));

drop policy if exists timeline_all on public.timeline_eventos;
create policy timeline_all on public.timeline_eventos for all
  using (public.puede_acceder_caso(caso_id)) with check (public.puede_acceder_caso(caso_id));

drop policy if exists chat_all on public.chat_mensajes;
create policy chat_all on public.chat_mensajes for all
  using (public.puede_acceder_caso(caso_id)) with check (public.puede_acceder_caso(caso_id));

-- ----------------------------------------------------------------------------
-- GRANTS
-- ----------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.organizaciones, public.invitaciones,
  public.casos, public.documentos, public.timeline_eventos, public.chat_mensajes
  to authenticated;

-- Anti-escalada en perfiles: NO se otorga UPDATE a nivel tabla (un GRANT de tabla
-- no se puede acotar con REVOKE(col) — privilegios de tabla y columna son
-- independientes en PostgreSQL). En su lugar, UPDATE solo en columnas seguras;
-- rol_sistema/tipo_plan/organizacion_id/rol_organizacion cambian solo vía RPC.
grant select, insert on public.perfiles to authenticated;
grant update (nombre_completo, cedula, especialidad, logotipo_url, tema, onboarding_completo)
  on public.perfiles to authenticated;

grant execute on function public.migrar_a_despacho(text, text) to authenticated;
grant execute on function public.aceptar_invitacion(uuid)      to authenticated;
grant execute on function public.mi_organizacion_id()          to authenticated;
grant execute on function public.es_superadmin()               to authenticated;
grant execute on function public.puede_acceder_caso(uuid)      to authenticated;
