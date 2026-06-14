-- El Notebook Legal — corpus jurídico vectorial
-- Ejecutar en el SQL Editor de Supabase (o `supabase db push`).

-- 1) Extensión de vectores
create extension if not exists vector;

-- 2) Tabla de artículos (texto literal + embedding)
create table if not exists public.leyes_articulos (
  id          bigint generated always as identity primary key,
  codigo      text not null,        -- "CPEUM", "Cód. Comercio", "LFT"…
  full_code   text not null,        -- nombre completo de la ley
  rama        text not null,        -- penal | civil | mercantil | …
  articulo    text not null,        -- "16", "1391", "16 Bis"
  texto       text not null,        -- texto literal del artículo
  source      text not null,        -- procedencia (DOF / Cámara de Diputados)
  embedding   vector(1536),         -- text-embedding-3-small
  updated_at  timestamptz default now(),
  unique (codigo, articulo)
);

create index if not exists idx_leyes_codigo_articulo on public.leyes_articulos (codigo, articulo);
create index if not exists idx_leyes_rama            on public.leyes_articulos (rama);
create index if not exists idx_leyes_embedding       on public.leyes_articulos
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- 3) Seguridad: lectura pública del texto (anon), escritura solo service_role
alter table public.leyes_articulos enable row level security;

drop policy if exists "lectura publica de articulos" on public.leyes_articulos;
create policy "lectura publica de articulos"
  on public.leyes_articulos for select
  to anon, authenticated
  using (true);

-- 4) Búsqueda semántica (la usa la Edge Function `consultar`)
create or replace function public.match_articulos (
  query_embedding vector(1536),
  match_count     int default 6,
  filtro_rama     text default null,
  filtro_codigos  text[] default null
)
returns table (
  codigo text, full_code text, rama text, articulo text,
  texto text, source text, similarity float
)
language sql stable
as $$
  select
    la.codigo, la.full_code, la.rama, la.articulo, la.texto, la.source,
    1 - (la.embedding <=> query_embedding) as similarity
  from public.leyes_articulos la
  where la.embedding is not null
    and (filtro_rama is null or la.rama = filtro_rama)
    and (filtro_codigos is null or la.codigo = any (filtro_codigos))
  order by la.embedding <=> query_embedding
  limit match_count;
$$;
