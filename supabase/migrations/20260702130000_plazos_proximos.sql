-- Plazos deadline que caen en los hitos de aviso (T-7, T-3, T-1) con el correo
-- del abogado dueño del caso. SECURITY DEFINER: accede a auth.users; se ejecuta
-- solo desde el backend con service role (revocado a anon/authenticated).
create or replace function plazos_proximos(p_hitos int[] default array[7,3,1])
returns table (email text, caso text, titulo text, iso text, dias int)
language sql
security definer
set search_path = public, auth
as $fn$
  select u.email::text, c.nombre, t.titulo, t.iso,
         ((t.iso)::date - current_date)::int as dias
  from timeline_eventos t
  join casos c on c.id = t.caso_id
  join auth.users u on u.id = c.user_id
  where t.severidad = 'deadline'
    and u.email is not null
    and t.iso ~ '^\d{4}-\d{2}-\d{2}'
    and ((t.iso)::date - current_date) = any(p_hitos)
  order by u.email, t.iso
$fn$;
revoke all on function plazos_proximos(int[]) from public, anon, authenticated;
