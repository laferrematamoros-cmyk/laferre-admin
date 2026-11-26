-- 015: nombre completo de cada empleado, para que la app de RH (bfm-rrhh) lo reconozca y se puedan vincular.
-- Va en una tabla APARTE y CERRADA: la tabla employees la lee la llave pública (el teléfono enseña los nombres
-- para escoger), y el nombre completo no tiene por qué quedar expuesto igual.
-- · El teléfono sólo puede preguntar si falta (identity_missing) y guardarlo UNA vez (set_my_full_name).
-- · Corregirlo después: sólo el panel (llave de servicio), en Equipo.
-- · La app de RH lo recibe por el puente del panel (/api/rh/personas), nunca directo de la base.
-- Sólo agrega cosas: no toca ninguna tabla existente.

create table if not exists public.employee_identity (
  employee_id uuid primary key references public.employees(id) on delete cascade,
  full_name   text not null check (length(btrim(full_name)) between 5 and 120),
  updated_at  timestamptz not null default now(),
  updated_by  text not null default 'app'
);
alter table public.employee_identity enable row level security;
-- Sin políticas: ni la llave pública ni un usuario con sesión la leen o la escriben. Sólo la llave de servicio y estas funciones.
revoke all on public.employee_identity from anon, authenticated;

-- ¿A este empleado le falta su nombre completo? (para que el teléfono se lo pida una vez)
create or replace function public.identity_missing(p_employee uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from employees e where e.id = p_employee and e.is_active)
     and not exists (select 1 from employee_identity i where i.employee_id = p_employee)
$$;

-- El empleado guarda su nombre completo desde el teléfono, UNA sola vez.
create or replace function public.set_my_full_name(p_employee uuid, p_full_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  n text := regexp_replace(btrim(coalesce(p_full_name, '')), '\s+', ' ', 'g');
begin
  if not exists (select 1 from employees where id = p_employee and is_active) then
    return jsonb_build_object('ok', false, 'error', 'Tu usuario no está activo.');
  end if;
  if length(n) < 5 or length(n) > 120 or n !~ '\S+ \S+' then
    return jsonb_build_object('ok', false, 'error', 'Escribe tu nombre y tus apellidos.');
  end if;
  if exists (select 1 from employee_identity where employee_id = p_employee) then
    return jsonb_build_object('ok', false, 'error', 'Tu nombre ya está guardado. Si hay que corregirlo, pídeselo al encargado.');
  end if;
  insert into employee_identity (employee_id, full_name, updated_by) values (p_employee, upper(n), 'app');
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.identity_missing(uuid) from public;
revoke all on function public.set_my_full_name(uuid, text) from public;
grant execute on function public.identity_missing(uuid) to anon, authenticated, service_role;
grant execute on function public.set_my_full_name(uuid, text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

-- Debe salir: tabla | 1 · rls | true · anon_lee | false
select (select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'employee_identity') as tabla,
       (select relrowsecurity from pg_class where oid = 'public.employee_identity'::regclass) as rls,
       has_table_privilege('anon', 'public.employee_identity', 'select') as anon_lee;
