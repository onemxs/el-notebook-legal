-- Cuota de uso de los endpoints de IA (auth obligatoria + límite horario).
-- Solo el service role escribe aquí: RLS activo sin policies = negado a anon/authenticated.
create table if not exists api_uso (
  user_id uuid not null,
  ventana timestamptz not null, -- inicio de la hora (date_trunc)
  n int not null default 0,
  primary key (user_id, ventana)
);
alter table api_uso enable row level security;

-- Incrementa el contador del usuario en la ventana actual y devuelve si sigue
-- dentro del límite. Limpieza oportunista de ventanas viejas cada ~100 llamadas.
create or replace function registrar_uso_api(p_user uuid, p_limite int default 60)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_n int;
begin
  insert into api_uso (user_id, ventana, n)
  values (p_user, date_trunc('hour', now()), 1)
  on conflict (user_id, ventana) do update set n = api_uso.n + 1
  returning n into v_n;
  if v_n % 100 = 0 then
    delete from api_uso where ventana < now() - interval '24 hours';
  end if;
  return v_n <= p_limite;
end
$fn$;
revoke all on function registrar_uso_api(uuid, int) from public, anon, authenticated;
