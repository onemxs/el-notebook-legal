-- Añade archivado lógico + índice
alter table public.casos
  add column archivado boolean not null default false;

create index if not exists idx_casos_archivado on public.casos (archivado);
