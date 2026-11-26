-- Pruebas de 015_nombre_completo.sql. Correr DESPUÉS de la migración.
-- NO guarda nada: usa un empleado de prueba y al final truena A PROPÓSITO con los resultados
-- (el editor de Supabase no enseña los NOTICE). Debe salir: ERROR: RESULTADOS (no se guardó nada): … todo OK.
do $$
declare
  co  uuid := 'a6798a18-9565-4f2b-929a-0c6771e7ef54';
  e   uuid := gen_random_uuid();
  r   jsonb;
  res text := '';
  got text;
begin
  insert into employees (id, name, company_id, is_active) values (e, 'PRUEBA NOMBRE', co, true);

  res := res || E'\n' || case when identity_missing(e) then 'OK    ' else 'FALLA ' end || '1 sin nombre: falta';

  r := set_my_full_name(e, 'Juan');
  res := res || E'\n' || case when r->>'error' like 'Escribe tu nombre y tus apellidos%' then 'OK    ' else 'FALLA ' end || '2 sin apellido: ' || coalesce(r->>'error', r::text);

  r := set_my_full_name(e, '  juan   pérez  lópez ');
  select full_name into got from employee_identity where employee_id = e;
  res := res || E'\n' || case when (r->>'ok')::boolean and got = 'JUAN PÉREZ LÓPEZ' then 'OK    ' else 'FALLA ' end || '3 guarda limpio y en mayúsculas: ' || coalesce(got, r::text);

  res := res || E'\n' || case when not identity_missing(e) then 'OK    ' else 'FALLA ' end || '4 ya no falta';

  r := set_my_full_name(e, 'Otro Nombre Distinto');
  select full_name into got from employee_identity where employee_id = e;
  res := res || E'\n' || case when r->>'error' like 'Tu nombre ya está guardado%' and got = 'JUAN PÉREZ LÓPEZ' then 'OK    ' else 'FALLA ' end || '5 no se cambia desde el teléfono';

  update employees set is_active = false where id = e;
  res := res || E'\n' || case when not identity_missing(e) then 'OK    ' else 'FALLA ' end || '6 inactivo: no se pide';

  res := res || E'\n' || case when not has_table_privilege('anon', 'public.employee_identity', 'select')
                               and not has_table_privilege('authenticated', 'public.employee_identity', 'select')
                              then 'OK    ' else 'FALLA ' end || '7 la tabla está cerrada a la llave pública';

  raise exception 'RESULTADOS (no se guardó nada):%', res;
end $$;
