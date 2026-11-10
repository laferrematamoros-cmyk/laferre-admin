-- Pruebas del inventario. NO deja nada: todo termina en ROLLBACK.
-- Correr DESPUÉS de 007_inventario.sql. Cada línea "PRUEBA" debe decir lo esperado.
begin;
do $$
declare
  co uuid; other_co uuid; emp uuid; emp2 uuid; other_emp uuid;
  rid uuid; sid uuid; res jsonb; p1 text; p2 text;
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
  res := inv_claim_section(sid, other_emp, false);   raise notice 'PRUEBA 1 (otra tienda → error): %', res;
  res := inv_claim_section(sid, emp, false);         raise notice 'PRUEBA 2 (tomar → ok): %', res;
  res := inv_claim_section(sid, emp2, false);        raise notice 'PRUEBA 3 (ocupada → busy): %', res;
  res := inv_finish_section(sid, emp, p1, array[p2], 'bien', '', '', '', false, null, '');
  raise notice 'PRUEBA 4 (fotos no subidas → error): %', res;
  reset role;

  insert into storage.objects (bucket_id, name) values ('inventario', p1), ('inventario', p2);

  set local role anon;
  res := inv_finish_section(sid, emp, p1, array['otra/ruta/1700000000003.jpg'], 'bien', '', '', '', false, null, '');
  raise notice 'PRUEBA 5 (foto ajena → error): %', res;
  res := inv_finish_section(sid, emp, p1, array[p2], 'mal', '', '', '', false, null, '');
  raise notice 'PRUEBA 6 (mal sin observaciones → error): %', res;
  res := inv_finish_section(sid, emp, p1, array[p2], 'regular', 'Desordenado', '', '', true, false, '');
  raise notice 'PRUEBA 7 (diferencias sin nota → error): %', res;
  res := inv_finish_section(sid, emp2, p1, array[p2], 'bien', '', '', '', false, null, '');
  raise notice 'PRUEBA 8 (no es quien la tomó → error): %', res;
  res := inv_finish_section(sid, emp, p1, array[p2], 'regular', 'Desordenado', 'Separar tornillos', 'Se acomodó', true, false, 'Faltan 3 brocas 1/4');
  raise notice 'PRUEBA 9 (terminar → ok y roundClosed true): %', res;
  reset role;

  raise notice 'PRUEBA 10 (pendiente creado → 1): %', (select count(*) from inventory_pendings where section_id = sid and resolved_at is null);
  raise notice 'PRUEBA 11 (ronda cerrada → completed): %', (select close_reason from inventory_rounds where id = rid);

  set local role anon;
  begin
    insert into inventory_rounds (company_id, due_at) values (co, now());
    raise notice 'PRUEBA 12 (anon no inserta rondas): FALLÓ, sí pudo';
  exception when others then
    raise notice 'PRUEBA 12 (anon no inserta rondas): ok, bloqueado';
  end;
  raise notice 'PRUEBA 13 (anon no lee pendientes → 0): %', (select count(*) from inventory_pendings);
  reset role;
end $$;
rollback;
