-- =============================================================================
-- PasantIA — CRM de prospectos (captación de clientes)
--   Mismo modelo de tenencia que casos: individual = privado del creador,
--   despacho = compartido por organización. Convertible a expediente.
-- =============================================================================

create table if not exists public.prospectos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  organizacion_id uuid references public.organizaciones (id) on delete set null,
  nombre          text not null,
  telefono        text,
  email           text,
  asunto          text,
  rama            text,
  fuente          text,                              -- recomendación, redes, web, etc.
  estado          text not null default 'nuevo'
    check (estado in ('nuevo','contactado','reunion','propuesta','ganado','perdido')),
  valor_estimado  numeric,                           -- honorarios potenciales (MXN)
  notas           text,
  caso_id         uuid references public.casos (id) on delete set null, -- si se convirtió
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_prospectos_user on public.prospectos (user_id);
create index if not exists idx_prospectos_org  on public.prospectos (organizacion_id);
create index if not exists idx_prospectos_estado on public.prospectos (estado);

-- Estampa la organización desde el perfil del creador (no falsificable por el cliente).
create or replace function public.set_prospecto_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is null then new.user_id := auth.uid(); end if;
  new.organizacion_id := (select organizacion_id from public.perfiles where id = new.user_id);
  return new;
end;
$$;
drop trigger if exists trg_set_prospecto_org on public.prospectos;
create trigger trg_set_prospecto_org
  before insert on public.prospectos for each row execute function public.set_prospecto_org();

drop trigger if exists trg_prospectos_touch on public.prospectos;
create trigger trg_prospectos_touch before update on public.prospectos
  for each row execute function public.touch_updated_at();

-- RLS: individual = dueño; despacho = toda la organización; superadmin ve todo.
alter table public.prospectos enable row level security;

drop policy if exists prospectos_select on public.prospectos;
create policy prospectos_select on public.prospectos for select using (
  user_id = auth.uid()
  or (organizacion_id is not null and organizacion_id = public.mi_organizacion_id())
  or public.es_superadmin()
);
drop policy if exists prospectos_insert on public.prospectos;
create policy prospectos_insert on public.prospectos for insert with check (user_id = auth.uid());
drop policy if exists prospectos_update on public.prospectos;
create policy prospectos_update on public.prospectos for update using (
  user_id = auth.uid()
  or (organizacion_id is not null and organizacion_id = public.mi_organizacion_id())
);
drop policy if exists prospectos_delete on public.prospectos;
create policy prospectos_delete on public.prospectos for delete using (
  user_id = auth.uid()
  or (organizacion_id is not null and organizacion_id = public.mi_organizacion_id())
);

grant select, insert, update, delete on public.prospectos to authenticated;
