-- Pruebas del inventario. NO deja nada guardado: al final lanza un ERROR a propósito con
-- todos los resultados, y ese error deshace todo lo que hizo la prueba.
-- Correr DESPUÉS de 007_inventario.sql. Debe terminar en un error que empieza con
-- "RESULTADOS (no se guardó nada)": copiar ese texto completo.
do $$
declare
  co uuid; other_co uuid; emp uuid; emp2 uuid; other_emp uuid;
  rid uuid; sid uuid; res jsonb; p1 text; p2 text; n int; txt text;
  out text := '';
begin
  select id into co from companies where slug = 'laferre';
  select id into other_co from companies where slug = 'bfm';
  select id into emp from employees where company_id = co and is_active order by name limit 1;
  select id into emp2 from employees where company_id = co and is_active and id <> emp order by name limit 1;
  select id into other_emp from employees where company_id = other_co and is_active limit 1;

  insert into inventory_rounds (company_id, due_at, opened_by) values (co, now() + interval '7 days', 'prueba') returning id into rid;
  insert into inventory_sections (round_id, company_id, code, name) values (rid, co, 'ZZ', 'Prueba') returning id into sid;
  p1 := rid || '/' || sid || '/1700000000001.jpg';
  p2 := rid || '/' || sid || '/1700000000002.jpg';

  set local role anon;
  res := inv_claim_section(sid, other_emp, false);   out := out || E'\n1 (otra tienda → error): ' || res;
  res := inv_claim_section(sid, emp, false);         out := out || E'\n2 (tomar → ok): ' || res;
  res := inv_claim_section(sid, emp2, false);        out := out || E'\n3 (ocupada → busy): ' || res;
  res := inv_finish_section(sid, emp, p1, array[p2], 'bien', '', '', '', false, null, '');
  out := out || E'\n4 (fotos no subidas → error): ' || res;
  reset role;

  insert into storage.objects (bucket_id, name) values ('inventario', p1), ('inventario', p2);

  set local role anon;
  res := inv_finish_section(sid, emp, p1, array['otra/ruta/1700000000003.jpg'], 'bien', '', '', '', false, null, '');
  out := out || E'\n5 (foto ajena → error): ' || res;
  res := inv_finish_section(sid, emp, p1, array[p2], 'mal', '', '', '', false, null, '');
  out := out || E'\n6 (mal sin observaciones → error): ' || res;
  res := inv_finish_section(sid, emp, p1, array[p2], 'regular', 'Desordenado', '', '', true, false, '');
  out := out || E'\n7 (diferencias sin nota → error): ' || res;
  res := inv_finish_section(sid, emp2, p1, array[p2], 'bien', '', '', '', false, null, '');
  out := out || E'\n8 (no es quien la tomó → error): ' || res;
  res := inv_finish_section(sid, emp, p1, array[p2], 'regular', 'Desordenado', 'Separar tornillos', 'Se acomodó', true, false, 'Faltan 3 brocas 1/4');
  out := out || E'\n9 (terminar → ok, roundClosed true): ' || res;
  reset role;

  select count(*) into n from inventory_pendings where section_id = sid and resolved_at is null;
  out := out || E'\n10 (pendiente creado → 1): ' || n;
  select close_reason into txt from inventory_rounds where id = rid;
  out := out || E'\n11 (ronda cerrada → completed): ' || coalesce(txt, 'NULL');

  set local role anon;
  begin
    insert into inventory_rounds (company_id, due_at) values (co, now());
    out := out || E'\n12 (anon no inserta rondas): FALLÓ, sí pudo';
  exception when others then
    out := out || E'\n12 (anon no inserta rondas): ok, bloqueado';
  end;
  begin
    select count(*) into n from inventory_pendings;
    out := out || E'\n13 (anon no lee pendientes): FALLÓ, sí pudo leer (' || n || ')';
  exception when others then
    out := out || E'\n13 (anon no lee pendientes): ok, bloqueado';
  end;
  reset role;

  raise exception 'RESULTADOS (no se guardó nada):%', out;
end $$;
