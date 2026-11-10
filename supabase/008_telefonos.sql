-- Teléfonos: qué versión de la app trae cada uno y quién lo usa.
-- La app nueva (1.1.0 con actualizaciones por internet) registra el teléfono con la función
-- register_device en vez de escribir directo en la tabla. La app vieja sigue con su upsert
-- y deja las columnas nuevas vacías: así el panel distingue los teléfonos sin actualizar.
-- Correr en el SQL Editor de Supabase. Se puede correr dos veces.
begin;

alter table public.device_tokens add column if not exists app_version text;
alter table public.device_tokens add column if not exists update_id   text;
alter table public.device_tokens add column if not exists update_at   timestamptz;
alter table public.device_tokens add column if not exists employee_id uuid references public.employees(id) on delete set null;

create or replace function public.register_device(
  p_token text, p_company uuid, p_employee uuid default null,
  p_app_version text default null, p_update_id text default null, p_update_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  emp uuid := p_employee;
begin
  if p_token is null or char_length(p_token) > 200 or p_token !~ '^Expo(nent)?PushToken\[[^]]+\]$' then
    return jsonb_build_object('ok', false, 'error', 'token no válido');
  end if;
  if p_company is null or not exists (select 1 from companies where id = p_company) then
    return jsonb_build_object('ok', false, 'error', 'empresa no válida');
  end if;
  -- Una persona de otra tienda no se guarda (el teléfono sí).
  if emp is not null and not exists (select 1 from employees where id = emp and company_id = p_company) then
    emp := null;
  end if;

  insert into device_tokens as d (token, company_id, employee_id, app_version, update_id, update_at, updated_at)
  values (p_token, p_company, emp, left(p_app_version, 20), left(p_update_id, 64), p_update_at, now())
  on conflict (token) do update set
    company_id  = excluded.company_id,
    employee_id = coalesce(excluded.employee_id, d.employee_id),
    app_version = excluded.app_version,
    update_id   = excluded.update_id,
    update_at   = excluded.update_at,
    updated_at  = now();
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.register_device(text, uuid, uuid, text, text, timestamptz) from public;
grant execute on function public.register_device(text, uuid, uuid, text, text, timestamptz) to anon, authenticated;

commit;

-- MÁS ADELANTE, cuando el panel diga que los 6 teléfonos ya traen la 1.1.0:
-- la app vieja necesita leer la tabla para su upsert; la nueva ya no. Entonces se puede cerrar:
--   drop policy if exists "anon_select_devicetokens" on public.device_tokens;
--   revoke select, insert, update on public.device_tokens from anon;
