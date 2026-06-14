# Corpus jurídico — Cómo cargar las leyes reales

El sistema ya trae **el dataset de las leyes federales esenciales parseado** (7,399
artículos de 8 ordenamientos) y todo el pipeline listo. Solo falta conectarlo a tu
Supabase. La app funciona en **modo demostración** mientras tanto.

## Qué ya está hecho (sin credenciales)
- `data/leyes_articulos.json` — 7,399 artículos con su **texto literal oficial**, generado con
  `npm run corpus:build` desde la Cámara de Diputados (`.doc` → `textutil` → parser por artículo).

| Código | Ley | Artículos |
|--------|-----|-----------|
| CPEUM | Constitución | 136 |
| LFT | Ley Federal del Trabajo | 1,078 |
| Cód. Comercio | Código de Comercio | 1,527 |
| CFF | Código Fiscal de la Federación | 280 |
| CCF | Código Civil Federal | 3,085 |
| CNPP | Cód. Nacional de Proc. Penales | 490 |
| CPF | Código Penal Federal | 531 |
| Ley de Amparo | Ley de Amparo | 272 |

## Pasos para activarlo (con tus credenciales)

### 1. Proyecto Supabase
Crea un proyecto en [supabase.com](https://supabase.com). Copia la **Project URL**, la
**anon key** y la **service_role key** (Settings → API).

### 2. Esquema (tabla + pgvector + búsqueda)
En el **SQL Editor** de Supabase, pega y ejecuta
[`supabase/migrations/0001_leyes_articulos.sql`](../supabase/migrations/0001_leyes_articulos.sql).
Crea la tabla `leyes_articulos`, el índice vectorial y la función `match_articulos`.

### 3. Variables de entorno
Copia `.env.example` a `.env` y llena:
```
SUPABASE_URL=…              VITE_SUPABASE_URL=…   (la misma)
SUPABASE_SERVICE_ROLE_KEY=… VITE_SUPABASE_ANON_KEY=…
OPENAI_API_KEY=…            EMBED_MODEL=text-embedding-3-small
```

### 4. Construir + indexar el corpus
```bash
npm run corpus:build     # ya genera data/leyes_articulos.json (re-descarga si falta)
npm run corpus:ingest    # genera embeddings y los sube a Supabase
```
> 💲 Costo único de embeddings ≈ **$0.04 USD** (≈2.2 M tokens con text-embedding-3-small).
> Es idempotente: puedes re-correrlo o filtrar con `--rama civil` / `--limit 50`.

### 5. Edge Function para el chat semántico
```bash
supabase functions deploy consultar
supabase secrets set OPENAI_API_KEY=sk-…   # (SUPABASE_URL/SERVICE_ROLE ya existen)
```

### 6. Reinicia la app
Con `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` presentes, la app cambia sola al modo real:
- **Visor de artículos** → trae el texto literal completo desde Supabase.
- **Chat** → búsqueda semántica real sobre el corpus (vía la Edge Function), con citas verificables.
- Si algo no está configurado, hace *fallback* al modo demostración sin romperse.

## Siguiente fase (cuando quieras)
- Añadir las leyes que faltan por rama (LGIPE/LGSMIME electoral, LISR/LIVA fiscal, LFPA/LOTFJA
  administrativo) y los **32 códigos civiles y penales estatales** — solo agrégalas al
  `CATALOGO` de [`scripts/construir_corpus.mjs`](../scripts/construir_corpus.mjs) y re-ingesta.
- Generación del *texto de respuesta* con un modelo de chat (hoy el chat lista los artículos
  más relevantes; el siguiente paso es redactar la respuesta citándolos, a temperatura 0.0).
