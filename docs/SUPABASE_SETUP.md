# Supabase — Todo lo que debes configurar

> Guía completa y en orden de **todo lo que hay que crear/configurar en Supabase**
> para El Notebook Legal. Mientras no hagas esto, la app funciona en **modo
> demostración** (corpus local de 14 artículos + análisis con Anthropic si pones
> la API key — ver `docs/ANTHROPIC_SETUP.md`).
>
> Marca cada casilla conforme avances. ⏱️ Tiempo total ≈ 30–45 min.

---

## 0. Resumen de lo que vas a crear

| # | Qué | Dónde | Para qué |
|---|-----|-------|----------|
| 1 | Proyecto Supabase | supabase.com | El backend |
| 2 | Extensión `pgvector` | SQL Editor | Búsqueda semántica |
| 3 | Tabla `leyes_articulos` | SQL Editor | Corpus de leyes (texto + embeddings) |
| 4 | Políticas RLS | SQL Editor | Lectura pública segura |
| 5 | Función `match_articulos` | SQL Editor | Búsqueda vectorial |
| 6 | Edge Function `consultar` | CLI / Dashboard | Chat semántico (guarda la key de OpenAI) |
| 7 | Secrets de la Edge Function | CLI / Dashboard | OPENAI_API_KEY |
| 8 | Variables `.env` | Tu computadora | Conectar la app + correr la ingesta |
| 9 | Ingesta del corpus | Tu computadora | Subir las 7,399 leyes |

Todo el SQL y el código ya están escritos en el repo. Solo los **ejecutas**.

---

## 1. Crear el proyecto

- [ ] Entra a [supabase.com](https://supabase.com) → **New project**.
- [ ] Nombre: `el-notebook-legal` (o el que quieras). Región: la más cercana (ej. `East US`).
- [ ] Guarda la **Database Password** que te pida (la usarás si conectas por CLI).
- [ ] Cuando termine de aprovisionar, ve a **Settings → API** y copia estos 3 valores:

| Valor | Dónde se usa | ¿Secreto? |
|-------|--------------|-----------|
| **Project URL** (`https://xxx.supabase.co`) | `VITE_SUPABASE_URL` y `SUPABASE_URL` | No |
| **anon public** key | `VITE_SUPABASE_ANON_KEY` (frontend) | No (protegida por RLS) |
| **service_role** key | `SUPABASE_SERVICE_ROLE_KEY` (solo scripts) | **SÍ — nunca en el navegador** |

---

## 2–5. Esquema: extensión, tabla, RLS y función (todo en un paso)

- [ ] En el Dashboard de Supabase abre **SQL Editor → New query**.
- [ ] Abre el archivo del repo **`supabase/migrations/0001_leyes_articulos.sql`**, copia TODO su contenido, pégalo y dale **Run**.

Eso crea de una sola vez:
- ✅ La extensión `vector` (pgvector).
- ✅ La tabla `leyes_articulos` (`codigo`, `full_code`, `rama`, `articulo`, `texto`, `source`, `embedding`).
- ✅ Los índices (incluyendo el índice vectorial `ivfflat`).
- ✅ La política **RLS de lectura pública** (la `anon key` solo puede leer, nunca escribir).
- ✅ La función `match_articulos(...)` para la búsqueda semántica.

> Verifícalo: **Table Editor** debe mostrar la tabla `leyes_articulos` (vacía por ahora).

---

## 6–7. Edge Function `consultar` (chat semántico)

Esta función vive en Supabase, recibe la pregunta del abogado, genera su embedding
y busca los artículos más parecidos. Guarda la API key de OpenAI **del lado del
servidor** (nunca llega al navegador).

**Necesitas el [CLI de Supabase](https://supabase.com/docs/guides/cli):**

```bash
# Instalar (macOS)
brew install supabase/tap/supabase

# Conectar tu proyecto (te pide la Project Ref que sale en Settings → General)
supabase login
supabase link --project-ref TU_PROJECT_REF
```

- [ ] **Desplegar la función** (el código ya está en `supabase/functions/consultar/index.ts`):
  ```bash
  supabase functions deploy consultar
  ```
- [ ] **Configurar el secret** (la key de embeddings; `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya existen en el entorno de Functions):
  ```bash
  supabase secrets set OPENAI_API_KEY=sk-tu_api_key_de_openai
  ```

> ¿Sin ganas de CLI? También puedes crear la función desde **Dashboard → Edge
> Functions → Deploy a new function**, pegar el código, y poner el secret en
> **Edge Functions → Manage secrets**.

---

## 8. Variables de entorno (`.env`)

- [ ] En la raíz del proyecto, copia `.env.example` a `.env` y llena:

```bash
# Frontend (público — la app las usa en el navegador)
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_publica

# Scripts de ingesta (secretos — solo en tu computadora)
SUPABASE_URL=https://TU_PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
OPENAI_API_KEY=sk-tu_api_key_de_openai
EMBED_MODEL=text-embedding-3-small
```

> `EMBED_MODEL` debe coincidir con la dimensión del esquema (1536). Si cambias de
> modelo de embeddings, ajusta `vector(1536)` en el SQL.

---

## 9. Subir el corpus (las 7,399 leyes)

- [ ] Generar el dataset (ya descarga y parsea las 8 leyes oficiales):
  ```bash
  npm run corpus:build
  ```
- [ ] Generar embeddings y subir a Supabase:
  ```bash
  npm run corpus:ingest
  ```
  - 💲 Costo único ≈ **$0.04 USD** (~2.2 M tokens con text-embedding-3-small).
  - Es reanudable e idempotente. Para probar primero: `npm run corpus:ingest -- --limit 50`.

> Verifícalo: en **Table Editor → leyes_articulos** ya deben verse miles de filas,
> y la columna `embedding` con valores.

---

## ✅ Listo — qué cambia en la app

En cuanto `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` estén en `.env` y reinicies (`npm run dev`):

- **Visor de artículos** → trae el **texto literal completo** desde Supabase (no el extracto demo).
- **Chat del asistente** → búsqueda semántica real sobre el corpus, con citas verificables.
- Si algo falta, la app hace *fallback* al modo demostración sin romperse.

---

## Opcional — Storage para documentos de clientes (a futuro)

Si más adelante quieres **guardar los PDFs subidos** (en vez de solo procesarlos
en memoria), crea un bucket:

- [ ] **Storage → New bucket** → nombre `expedientes`, **Private**.
- [ ] Política RLS: acceso solo al dueño (cuando agregues login).
- [ ] Para el **Modo Sesión Segura**, programa el borrado del bucket + filas al
  cerrar sesión (ya está la lógica de wipe en el cliente; faltaría el borrado server-side).

> Esto **no es necesario** para el funcionamiento actual — el análisis con IA
> procesa el documento sin almacenarlo. Solo agrégalo si quieres persistencia.

---

## Checklist final

- [ ] Proyecto creado, 3 keys copiadas
- [ ] SQL `0001_leyes_articulos.sql` ejecutado (tabla + pgvector + RLS + función)
- [ ] Edge Function `consultar` desplegada
- [ ] Secret `OPENAI_API_KEY` configurado en la función
- [ ] `.env` lleno
- [ ] `npm run corpus:build` y `npm run corpus:ingest` corridos
- [ ] Filas visibles en `leyes_articulos`
- [ ] `npm run dev` → el visor de artículos y el chat usan datos reales
