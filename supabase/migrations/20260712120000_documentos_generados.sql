-- =============================================================================
-- PasantIA — Documentos generados sin expediente (Notaría Express)
-- Los contratos/plantillas de Notaría Express no cuelgan de un caso, así que
-- viven en su propia tabla con tenencia individual/despacho (como prospectos).
-- Los escritos generados DESDE un expediente siguen guardándose en `documentos`.
-- =============================================================================

create table if not exists public.documentos_generados (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  organizacion_id uuid references public.organizaciones (id) on delete set null,
  tipo            text not null,          -- id de plantilla: arrendamiento, pagare, nda, …
  nombre          text not null,
  contenido       text not null,          -- HTML del documento
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_docgen_user on public.documentos_generados (user_id);
create index if not exists idx_docgen_org  on public.documentos_generados (organizacion_id);

-- Estampa la organización desde el perfil del creador (no falsificable).
create or replace function public.set_docgen_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is null then new.user_id := auth.uid(); end if;
  new.organizacion_id := (select organizacion_id from public.perfiles where id = new.user_id);
  return new;
end;
$$;
drop trigger if exists trg_set_docgen_org on public.documentos_generados;
create trigger trg_set_docgen_org
  before insert on public.documentos_generados for each row execute function public.set_docgen_org();

drop trigger if exists trg_docgen_touch on public.documentos_generados;
create trigger trg_docgen_touch before update on public.documentos_generados
  for each row execute function public.touch_updated_at();

-- RLS: individual = dueño; despacho = toda la organización; superadmin ve todo.
alter table public.documentos_generados enable row level security;

drop policy if exists docgen_select on public.documentos_generados;
create policy docgen_select on public.documentos_generados for select using (
  user_id = auth.uid()
  or (organizacion_id is not null and organizacion_id = public.mi_organizacion_id())
  or public.es_superadmin()
);
drop policy if exists docgen_insert on public.documentos_generados;
create policy docgen_insert on public.documentos_generados for insert with check (user_id = auth.uid());
drop policy if exists docgen_update on public.documentos_generados;
create policy docgen_update on public.documentos_generados for update using (
  user_id = auth.uid()
  or (organizacion_id is not null and organizacion_id = public.mi_organizacion_id())
);
drop policy if exists docgen_delete on public.documentos_generados;
create policy docgen_delete on public.documentos_generados for delete using (
  user_id = auth.uid()
  or (organizacion_id is not null and organizacion_id = public.mi_organizacion_id())
);

grant select, insert, update, delete on public.documentos_generados to authenticated;
