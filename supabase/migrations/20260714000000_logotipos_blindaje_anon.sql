-- =============================================================================
-- PasantIA — Blindaje del bucket `logotipos` contra escritura anónima
--
-- CONTEXTO: este proyecto Supabase está COMPARTIDO con otras apps. Una política
-- PERMISIVA preexistente en storage.objects (sin filtro de bucket, de otra app)
-- permite que CUALQUIER anónimo suba archivos a CUALQUIER bucket. Como las
-- políticas permisivas se combinan con OR, anulaba nuestro `logotipos_insert`
-- (que era solo para authenticated). Verificado empíricamente: un anónimo, con
-- solo la anon key pública, subía a `logotipos` (HTTP 200).
--
-- SOLUCIÓN: políticas RESTRICTIVAS (se combinan con AND → VETAN). Solo aplican
-- al rol `anon` y solo cuando el bucket es `logotipos`, así que:
--   • Vetan la subida/edición/borrado anónimo en `logotipos`.
--   • NO tocan a los usuarios autenticados (la política no les aplica).
--   • NO tocan los demás buckets (bucket_id <> 'logotipos' pasa el filtro).
--   • NO tocan la LECTURA pública de logotipos (no hay restricción de SELECT).
--
-- No borramos la política permisiva de la otra app (podría sostener algo suyo);
-- solo la vetamos para lo nuestro.
-- =============================================================================

-- Subida (INSERT) anónima a logotipos → vetada.
drop policy if exists logotipos_no_anon_insert on storage.objects;
create policy logotipos_no_anon_insert on storage.objects
  as restrictive for insert to anon
  with check (bucket_id <> 'logotipos');

-- Sobrescritura (UPDATE) anónima de un logo existente → vetada (defensa en profundidad).
drop policy if exists logotipos_no_anon_update on storage.objects;
create policy logotipos_no_anon_update on storage.objects
  as restrictive for update to anon
  using (bucket_id <> 'logotipos')
  with check (bucket_id <> 'logotipos');

-- Borrado (DELETE) anónimo → vetado (defensa en profundidad; ya estaba bloqueado
-- por ausencia de política permisiva, pero lo dejamos explícito).
drop policy if exists logotipos_no_anon_delete on storage.objects;
create policy logotipos_no_anon_delete on storage.objects
  as restrictive for delete to anon
  using (bucket_id <> 'logotipos');
