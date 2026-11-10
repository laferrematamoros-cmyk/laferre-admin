-- Pruebas de register_device. NO deja nada guardado: termina en un ERROR a propósito con
-- los resultados, y ese error deshace todo. Correr DESPUÉS de 008_telefonos.sql y copiar
-- el texto que empieza con "RESULTADOS (no se guardó nada)".
do $$
declare
  co uuid; other_co uuid; emp uuid; emp2 uuid; other_emp uuid;
  tok text := 'ExponentPushToken[prueba-no-real-123456]';
  res jsonb; r record; out text := '';
begin
  select id into co from companies where slug = 'laferre';
  select id into other_co from companies where slug = 'bfm';
  select id into emp from employees where company_id = co and is_active order by name limit 1;
  select id into emp2 from employees where company_id = co and is_active and id <> emp order by name limit 1;
  select id into other_emp from employees where company_id = other_co and is_active limit 1;

  set local role anon;
  res := register_device(tok, co, emp, '1.1.0', null, null);
  out := out || E'\n1 (registrar → ok): ' || res;
  res := register_device('cualquier-cosa', co, emp, '1.1.0', null, null);
  out := out || E'\n2 (token falso → error): ' || res;
  res := register_device(tok, null, emp, '1.1.0', null, null);
  out := out || E'\n3 (sin empresa → error): ' || res;
  reset role;

  select * into r from device_tokens where token = tok;
  out := out || E'\n4 (guardó versión y persona → 1.1.0 / sí): ' || coalesce(r.app_version, 'NULL') || ' / ' || case when r.employee_id = emp then 'sí' else 'no' end;

  set local role anon;
  res := register_device(tok, co, other_emp, '1.1.0', 'abc-123', '2026-11-12T16:30:00Z');
  reset role;
  select * into r from device_tokens where token = tok;
  out := out || E'\n5 (persona de otra tienda no se guarda → se queda la anterior): ' || case when r.employee_id = emp then 'ok' else 'FALLÓ' end;
  out := out || E'\n6 (actualización → abc-123): ' || coalesce(r.update_id, 'NULL');

  set local role anon;
  res := register_device(tok, co, emp2, '1.1.0', null, null);
  reset role;
  select * into r from device_tokens where token = tok;
  out := out || E'\n7 (otra persona de la tienda → cambia): ' || case when r.employee_id = emp2 then 'ok' else 'FALLÓ' end;
  out := out || E'\n8 (volvió a la de fábrica → sin actualización): ' || coalesce(r.update_id, 'NULL');

  raise exception 'RESULTADOS (no se guardó nada):%', out;
end $$;
