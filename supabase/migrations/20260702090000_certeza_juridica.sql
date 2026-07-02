-- Motor de Certeza Jurídica — corpus de tesis/jurisprudencia (SJF) + índice CJF.
--
-- FUENTES OFICIALES (conectores documentados; la ingesta corre con
-- scripts/tesis-ingest.mjs desde un entorno permitido por Cloudflare):
--   · SJF / SCJN   https://sjf2.scjn.gob.mx      (detalle: /detalle/tesis/{registro})
--   · Buscador Jurídico SCJN   https://bj.scjn.gob.mx
--   · CJF (sentencias de JD y TCC)   https://www.cjf.gob.mx
--   · Cámara de Diputados (leyes vigentes)   https://www.diputados.gob.mx/LeyesBiblio/
--     → ya ingerido en leyes_articulos (7,399 artículos)
--   · DOF (reformas)   https://www.dof.gob.mx

create table if not exists tesis (
  registro bigint primary key,          -- Número de Registro Digital oficial del SJF
  clave text,                           -- p. ej. 'P./J. 20/2014 (10a.)'
  rubro text not null,
  sintesis text not null,               -- síntesis del criterio (texto íntegro: SJF)
  tipo text not null check (tipo in ('jurisprudencia','aislada')),
  epoca text,
  instancia text,
  materia text not null default 'comun',
  vigente boolean not null default true,
  fuente text not null default 'Semanario Judicial de la Federación',
  fts tsvector generated always as (to_tsvector('spanish', coalesce(rubro,'') || ' ' || coalesce(sintesis,''))) stored,
  creado_en timestamptz not null default now()
);
create index if not exists tesis_fts_idx on tesis using gin (fts);
create index if not exists tesis_materia_idx on tesis (materia);

alter table tesis enable row level security;
drop policy if exists tesis_public_read on tesis;
create policy tesis_public_read on tesis for select using (true);
revoke all on tesis from anon, authenticated;
grant select on tesis to anon, authenticated;

-- Índice de sentencias del CJF (arquitectura lista; se llena con la ingesta).
create table if not exists cjf_sentencias (
  id bigint generated always as identity primary key,
  circuito smallint not null check (circuito between 1 and 32),
  organo text not null,
  materia text,
  expediente text,
  fecha date,
  extracto text,
  url text,
  fts tsvector generated always as (to_tsvector('spanish', coalesce(expediente,'') || ' ' || coalesce(extracto,''))) stored
);
create index if not exists cjf_fts_idx on cjf_sentencias using gin (fts);
create index if not exists cjf_filtros_idx on cjf_sentencias (circuito, organo, materia);
alter table cjf_sentencias enable row level security;
drop policy if exists cjf_public_read on cjf_sentencias;
create policy cjf_public_read on cjf_sentencias for select using (true);
revoke all on cjf_sentencias from anon, authenticated;
grant select on cjf_sentencias to anon, authenticated;

-- Búsqueda FTS de tesis (sin costo de embeddings; ampliable a vector después).
create or replace function buscar_tesis(
  q text default '',
  p_materia text default null,
  p_tipo text default null,
  p_limit int default 8
)
returns setof tesis
language sql stable
as $fn$
  select t.* from tesis t
  where (p_materia is null or t.materia = p_materia or t.materia = 'comun')
    and (p_tipo is null or t.tipo = p_tipo)
    and (
      coalesce(q, '') = ''
      or t.fts @@ websearch_to_tsquery('spanish', q)
      or t.rubro ilike '%' || q || '%'
    )
  order by
    (t.fts @@ websearch_to_tsquery('spanish', coalesce(nullif(q, ''), 'x'))) desc,
    ts_rank(t.fts, websearch_to_tsquery('spanish', coalesce(nullif(q, ''), 'x'))) desc,
    t.tipo asc, t.registro desc
  limit greatest(p_limit, 1)
$fn$;
grant execute on function buscar_tesis(text, text, text, int) to anon, authenticated;

-- Semilla: criterios rectores con Registro Digital real, verificables en un clic en
-- https://sjf2.scjn.gob.mx/detalle/tesis/{registro}. La síntesis es descriptiva; el
-- texto íntegro debe consultarse en la fuente oficial.
insert into tesis (registro, clave, rubro, sintesis, tipo, epoca, instancia, materia) values
(2006224, 'P./J. 20/2014 (10a.)', 'DERECHOS HUMANOS CONTENIDOS EN LA CONSTITUCIÓN Y EN LOS TRATADOS INTERNACIONALES. CONSTITUYEN EL PARÁMETRO DE CONTROL DE REGULARIDAD CONSTITUCIONAL, PERO CUANDO EN LA CONSTITUCIÓN HAYA UNA RESTRICCIÓN EXPRESA AL EJERCICIO DE AQUÉLLOS, SE DEBE ESTAR A LO QUE ESTABLECE EL TEXTO CONSTITUCIONAL.', 'Las normas de derechos humanos de fuente constitucional y convencional integran un solo parámetro de regularidad constitucional; ante una restricción expresa de la Constitución debe estarse a ésta. Derivada de la contradicción de tesis 293/2011.', 'jurisprudencia', 'Décima Época', 'Pleno', 'comun'),
(2006225, 'P./J. 21/2014 (10a.)', 'JURISPRUDENCIA EMITIDA POR LA CORTE INTERAMERICANA DE DERECHOS HUMANOS. ES VINCULANTE PARA LOS JUECES MEXICANOS SIEMPRE QUE SEA MÁS FAVORABLE A LA PERSONA.', 'Los criterios de la Corte IDH vinculan a los jueces mexicanos con independencia de que el Estado mexicano haya sido parte en el litigio, siempre que resulten más favorables a la persona (principio pro persona). Contradicción de tesis 293/2011.', 'jurisprudencia', 'Décima Época', 'Pleno', 'comun'),
(160589, 'P. LXVII/2011 (9a.)', 'CONTROL DE CONVENCIONALIDAD EX OFFICIO EN UN MODELO DE CONTROL DIFUSO DE CONSTITUCIONALIDAD.', 'Todos los jueces del país deben ejercer control de convencionalidad ex officio entre normas internas y la Convención Americana, en el marco del artículo 1o. constitucional. Derivada del expediente Varios 912/2010 (caso Radilla Pacheco).', 'aislada', 'Novena Época', 'Pleno', 'comun'),
(2002000, '1a./J. 107/2012 (10a.)', 'PRINCIPIO PRO PERSONA. CRITERIO DE SELECCIÓN DE LA NORMA DE DERECHO FUNDAMENTAL APLICABLE.', 'Ante varias normas o interpretaciones posibles en materia de derechos humanos debe elegirse la que brinde mayor protección a la persona (artículos 1o. y 133 constitucionales).', 'jurisprudencia', 'Décima Época', 'Primera Sala', 'comun'),
(2007921, 'P./J. 50/2014 (10a.)', 'INTERÉS LEGÍTIMO. CONTENIDO Y ALCANCE PARA EFECTOS DE LA PROCEDENCIA DEL JUICIO DE AMPARO (INTERPRETACIÓN DEL ARTÍCULO 107, FRACCIÓN I, DE LA CONSTITUCIÓN POLÍTICA DE LOS ESTADOS UNIDOS MEXICANOS).', 'El interés legítimo requiere un agravio diferenciado, actual y jurídicamente relevante, derivado de la especial situación del quejoso frente al orden jurídico; punto intermedio entre el interés simple y el interés jurídico.', 'jurisprudencia', 'Décima Época', 'Pleno', 'amparo')
on conflict (registro) do nothing;
