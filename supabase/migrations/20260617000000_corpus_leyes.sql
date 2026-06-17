-- =============================================================================
-- PasantIA — Corpus legal para RAG (leyes_articulos + match_articulos)
-- Embeddings: OpenAI text-embedding-3-small (1536 dims).
-- =============================================================================

create extension if not exists vector;

create table if not exists public.leyes_articulos (
  id        bigint generated always as identity primary key,
  codigo    text not null,
  full_code text,
  rama      text,
  articulo  text not null,
  texto     text not null,
  source    text,
  embedding vector(1536),
  unique (codigo, articulo)
);

create index if not exists idx_leyes_rama on public.leyes_articulos (rama);
-- HNSW (no requiere datos previos ni entrenamiento, a diferencia de ivfflat).
create index if not exists idx_leyes_embedding
  on public.leyes_articulos using hnsw (embedding vector_cosine_ops);

-- Búsqueda por similitud coseno. La llama la Edge Function `consultar` y el
-- endpoint de generación de documentos (ambos con el service role).
create or replace function public.match_articulos(
  query_embedding vector(1536),
  match_count     int default 6,
  filtro_rama     text default null,
  filtro_codigos  text[] default null
)
returns table (
  codigo text, full_code text, rama text, articulo text, texto text, source text, similarity float
)
language sql stable as $$
  select l.codigo, l.full_code, l.rama, l.articulo, l.texto, l.source,
         1 - (l.embedding <=> query_embedding) as similarity
  from public.leyes_articulos l
  where (filtro_rama is null or l.rama = filtro_rama)
    and (filtro_codigos is null or l.codigo = any (filtro_codigos))
  order by l.embedding <=> query_embedding
  limit match_count
$$;

-- El corpus son leyes públicas → lectura abierta.
alter table public.leyes_articulos enable row level security;
drop policy if exists leyes_lectura on public.leyes_articulos;
create policy leyes_lectura on public.leyes_articulos for select using (true);

grant select on public.leyes_articulos to anon, authenticated;
grant execute on function public.match_articulos(vector, int, text, text[])
  to anon, authenticated, service_role;
