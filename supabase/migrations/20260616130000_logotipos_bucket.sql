-- =============================================================================
-- PasantIA — Bucket público de logotipos (despachos / perfiles)
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('logotipos', 'logotipos', true)
on conflict (id) do nothing;

-- Lectura pública (el bucket es público) + escritura para usuarios autenticados.
drop policy if exists logotipos_read on storage.objects;
create policy logotipos_read on storage.objects for select
  using (bucket_id = 'logotipos');

drop policy if exists logotipos_insert on storage.objects;
create policy logotipos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'logotipos');

drop policy if exists logotipos_update on storage.objects;
create policy logotipos_update on storage.objects for update to authenticated
  using (bucket_id = 'logotipos');

drop policy if exists logotipos_delete on storage.objects;
create policy logotipos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'logotipos');
