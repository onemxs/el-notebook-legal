# Ejecutar Migración en Supabase

> Crea las tablas para casos, documentos y chat en tu proyecto Supabase.

## ⚡ Opción 1: SQL Editor (Más rápido)

1. Ve a [supabase.com/dashboard](https://supabase.com/dashboard) → Tu proyecto
2. Abre **SQL Editor** (izquierda) → **+ New query**
3. Copia TODO el contenido de `/supabase/migrations/0002_casos_documentos_chat.sql`
4. Pega en el editor
5. Clic en **RUN** (esquina superior derecha)

✅ Verás: _"success — 20 rows"_ (tablas, índices, triggers, policies creadas)

---

## ⚡ Opción 2: CLI (Recomendado para team)

Si tienes Supabase CLI instalado:

```bash
# Desde la raíz del proyecto
supabase db push
```

(Esto usa las migraciones en `supabase/migrations/` automáticamente)

---

## Verificar que funcionó

**En SQL Editor:**

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

Deberías ver:
- `casos`
- `documentos`
- `chat_mensajes`
- `timeline_eventos`

---

## Qué se creó

| Tabla | Propósito |
|-------|-----------|
| **casos** | Expedientes (nombre, rama, partes, fechas clave, leyes sugeridas) |
| **documentos** | PDF, videos, transcripciones, imágenes (con vector embedding para RAG) |
| **chat_mensajes** | Conversaciones con el asistente de IA (user + assistant) |
| **timeline_eventos** | Línea del tiempo del caso (eventos con fechas y severidad) |

---

## Notas sobre la estructura

- **vector(1536)**: Para embeddings OpenAI `text-embedding-3-small`. Cuando ingreses documentos, un trigger o función supabase los convertirá en embeddings (próximo paso).
- **RLS**: Habilitado pero con `ALLOW ALL` por ahora. En producción, agrega `auth.users` y restringe por `user_id`.
- **Storage**: Los documentos grandes (PDF, video) se guardan en Supabase Storage, la tabla solo guarda la referencia (`storage_path`).

---

## Próximos pasos en el código

Una vez ejecutes la migración:

1. **En `src/lib/supabase.ts`**: Agregar funciones para guardar casos/documentos
2. **En `vite-plugin-claude.ts`**: Guardar transcripciones directamente en `documentos` table
3. **En `workspace.tsx`**: Cargar casos desde Supabase en lugar de usar estado local

Te guío cuando estés listo. 🚀
