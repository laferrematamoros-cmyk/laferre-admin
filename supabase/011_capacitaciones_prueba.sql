-- Pruebas de 011_capacitaciones.sql. Correr DESPUÉS de la migración.
-- NO guarda nada: arma dos capacitaciones y dos empleados de prueba, prueba todo y al final truena
-- A PROPÓSITO con los resultados (el editor de Supabase no enseña los NOTICE). Debe salir:
--   ERROR: RESULTADOS (no se guardó nada): … y cada renglón con OK.
-- Si algún renglón dice FALLA, mandar el texto completo.
-- Dentro del bloque now() no cambia: el paso del tiempo se simula moviendo opened_at y published_at.
do $$
declare
  co     uuid := 'a6798a18-9565-4f2b-929a-0c6771e7ef54';  -- La Ferre
  lau    uuid := '0ddf2629-36b8-4aa1-b769-39d45740bb43';  -- Laura
  prueba uuid;
  nuevo  uuid;
  baja   uuid;
  otra   uuid;
  sid    uuid;
  viejo  uuid;
  dl     timestamptz;
  r      jsonb;
  r2     jsonb;
  st     text;
  got    text;
  ok1    boolean;
  ok2    boolean;
  ok3    boolean;
  n      int;
  n2     int;
  res    text := '';
begin
  insert into trainings (slug, title, sort_order, is_active, deadline_days, min_seconds)
  values ('prueba-cap', 'PRUEBA CAPACITACIÓN (no se guarda)', 999, true, 7, 30) returning id into prueba;
  insert into employees (id, name, role, initials, company_id, is_active, created_at)
  values (gen_random_uuid(), 'PRUEBA NUEVO (no se guarda)', 'Prueba', 'PN', co, true, now()) returning id into nuevo;
  insert into employees (id, name, role, initials, company_id, is_active)
  values (gen_random_uuid(), 'PRUEBA BAJA (no se guarda)', 'Prueba', 'PB', co, false) returning id into baja;

  -- 1. El trigger pone published_at
  select published_at = now() into ok1 from trainings where id = prueba;
  update trainings set published_at = now() - interval '3 days' where id = prueba;
  update trainings set is_active = false where id = prueba;
  update trainings set is_active = true where id = prueba;
  select published_at = now() into ok2 from trainings where id = prueba;
  update trainings set published_at = now() - interval '3 days' where id = prueba;
  update trainings set version = version + 1 where id = prueba;
  select published_at = now() and version = 2 into ok3 from trainings where id = prueba;
  update trainings set version = 1 where id = prueba;  -- de regreso a la v1 para los casos de abajo
  res := res || E'\n' || case when ok1 and ok2 and ok3 then 'OK    ' else 'FALLA ' end
             || '1 published_at: al crearla ' || ok1 || ', al reactivarla ' || ok2 || ', al subir versión ' || ok3;

  -- 2. Plazo: inicio del día siguiente a fecha + días, en hora de Matamoros
  dl := cap_deadline('2026-11-23 15:00-06', 7);
  res := res || E'\n' || case when dl = '2026-12-01 00:00-06'::timestamptz then 'OK    ' else 'FALLA ' end
             || '2 cap_deadline(23 nov 15:00, 7) = ' || dl;

  -- 3. La lista de Laura
  got := (select e->>'status' from jsonb_array_elements(cap_list(lau)) e where e->>'slug' = 'prueba-cap');
  res := res || E'\n' || case when got = 'pending' then 'OK    ' else 'FALLA ' end
             || '3 cap_list(Laura) trae prueba-cap: ' || coalesce(got, 'no viene');

  -- 4. Publicada hace 10 días: Laura atrasada, el nuevo cuenta desde su alta
  update trainings set published_at = now() - interval '10 days' where id = prueba;
  got := (select e->>'status' from jsonb_array_elements(cap_list(lau)) e where e->>'slug' = 'prueba-cap');
  st  := (select e->>'status' from jsonb_array_elements(cap_list(nuevo)) e where e->>'slug' = 'prueba-cap');
  res := res || E'\n' || case when got = 'overdue' and st = 'pending' then 'OK    ' else 'FALLA ' end
             || '4 hace 10 días: Laura ' || coalesce(got, 'no viene') || ', nuevo ' || coalesce(st, 'no viene');

  -- 5. Abrir una pausada
  update trainings set is_active = false where id = prueba;
  r := cap_open(prueba, nuevo);
  got := coalesce((select 'viene' from jsonb_array_elements(cap_list(lau)) e where e->>'slug' = 'prueba-cap'), 'no viene');
  res := res || E'\n' || case when (r->>'ok')::boolean = false and r->>'error' like '%pausa%' and got = 'no viene' then 'OK    ' else 'FALLA ' end
             || '5 abrir pausada: ' || coalesce(r->>'error', r::text) || ' (en la lista: ' || got || ')';
  update trainings set is_active = true where id = prueba;
  update trainings set published_at = now() - interval '10 days' where id = prueba;

  -- 6. Abrir con un empleado dado de baja
  r := cap_open(prueba, baja);
  res := res || E'\n' || case when (r->>'ok')::boolean = false and r->>'error' like '%no está activo%' then 'OK    ' else 'FALLA ' end
             || '6 abrir con empleado de baja: ' || coalesce(r->>'error', r::text);

  -- 7. Abrir bien
  r := cap_open(prueba, nuevo);
  sid := (r->>'session')::uuid;
  res := res || E'\n' || case when (r->>'ok')::boolean and sid is not null and r->>'slug' = 'prueba-cap'
                                and exists (select 1 from training_sessions where id = sid and version = 1 and source = 'app')
                            then 'OK    ' else 'FALLA ' end
             || '7 abrir: sesión creada, slug ' || coalesce(r->>'slug', r::text);

  -- 8. "Entendí" en el acto
  r := cap_answer(sid, 'understood');
  res := res || E'\n' || case when r->>'code' = 'too_soon' and (r->>'seconds_left')::int = 30 then 'OK    ' else 'FALLA ' end
             || '8 entendí en el acto: ' || coalesce(r->>'error', r::text);

  -- 9. "Entendí" a los 40 segundos
  update training_sessions set opened_at = now() - interval '40 seconds' where id = sid;
  r := cap_answer(sid, 'understood');
  got := (select e->>'status' from jsonb_array_elements(cap_list(nuevo)) e where e->>'slug' = 'prueba-cap');
  res := res || E'\n' || case when (r->>'ok')::boolean and got = 'understood'
                                and (select answered_at is not null from training_sessions where id = sid)
                            then 'OK    ' else 'FALLA ' end
             || '9 entendí a los 40 s: ' || coalesce(got, r::text);

  -- 10. Dudas con nota (cambia la respuesta: manda la última) y nota demasiado larga
  r := cap_open(prueba, nuevo);
  viejo := (r->>'session')::uuid;  -- se queda abierta en la v1 para el caso 12
  r := cap_answer(viejo, 'doubt', '  No entendí el paso 2  ');
  got := (select e->>'status' from jsonb_array_elements(cap_list(nuevo)) e where e->>'slug' = 'prueba-cap');
  st  := (select doubt_note from training_progress where training_id = prueba and employee_id = nuevo and version = 1);
  r2  := cap_answer(viejo, 'doubt', repeat('a', 501));
  res := res || E'\n' || case when (r->>'ok')::boolean and got = 'doubt' and st = 'No entendí el paso 2'
                                and r2->>'code' = 'note' then 'OK    ' else 'FALLA ' end
             || '10 dudas: ' || coalesce(got, r::text) || ' / nota "' || coalesce(st, '') || '" / 501 letras: '
             || coalesce(r2->>'error', r2::text);

  -- 11. Enlace de hace 13 horas
  r := cap_open(prueba, nuevo);
  sid := (r->>'session')::uuid;
  update training_sessions set opened_at = now() - interval '13 hours' where id = sid;
  r := cap_answer(sid, 'doubt');
  res := res || E'\n' || case when r->>'code' = 'expired' then 'OK    ' else 'FALLA ' end
             || '11 enlace de 13 h: ' || coalesce(r->>'error', r::text);

  -- 12. Versión nueva: la sesión vieja ya no sirve y se vuelve a pedir
  update trainings set version = 2 where id = prueba;
  r := cap_answer(viejo, 'doubt');
  got := (select e->>'status' || ' v' || (e->>'version') from jsonb_array_elements(cap_list(nuevo)) e where e->>'slug' = 'prueba-cap');
  res := res || E'\n' || case when r->>'code' = 'version' and got = 'pending v2' then 'OK    ' else 'FALLA ' end
             || '12 versión nueva: ' || coalesce(r->>'error', r::text) || ' / nuevo ' || coalesce(got, 'no viene');

  -- 13. En la v2: dudas → "Ya lo capacité" → ya no cambia
  r := cap_open(prueba, nuevo);
  sid := (r->>'session')::uuid;
  perform cap_answer(sid, 'doubt', 'Otra duda');
  r := cap_mark_trained(prueba, nuevo, '  Ing. Prueba  ');
  select status, trained_by into st, got from training_progress
   where training_id = prueba and employee_id = nuevo and version = 2;
  ok1 := (r->>'ok')::boolean and st = 'trained' and got = 'Ing. Prueba'
         and (select trained_at is not null from training_progress where training_id = prueba and employee_id = nuevo and version = 2);
  r := cap_mark_trained(prueba, nuevo, 'Ing. Prueba');
  ok2 := (r->>'ok')::boolean = false;
  r := cap_open(prueba, nuevo);
  sid := (r->>'session')::uuid;
  update training_sessions set opened_at = now() - interval '40 seconds' where id = sid;
  r := cap_answer(sid, 'understood');
  st := (select status from training_progress where training_id = prueba and employee_id = nuevo and version = 2);
  ok3 := (r->>'ok')::boolean and (r->>'already')::boolean and st = 'trained'
         and (select e->>'status' from jsonb_array_elements(cap_list(nuevo)) e where e->>'slug' = 'prueba-cap') = 'trained';
  res := res || E'\n' || case when ok1 and ok2 and ok3 then 'OK    ' else 'FALLA ' end
             || '13 capacitado: marcar ' || ok1 || ', segunda vez rechazada ' || ok2 || ', entendí después no lo cambia ' || ok3;

  -- 14. Avisos: "nueva" una sola vez; "por vencer" un día antes del plazo
  select count(*) into n from cap_claim_notices(now()) c
   where c.training_id = prueba and c.employee_id = lau and c.kind = 'new';
  ok1 := n = 1;
  select count(*) into n from cap_claim_notices(now()) c
   where c.training_id = prueba and c.employee_id = lau;
  ok2 := n = 0;
  select deadline into dl from cap_rows(now()) c where c.training_id = prueba and c.employee_id = lau;
  select count(*) filter (where c.employee_id = lau and c.kind = 'due_soon'),
         count(*) filter (where c.kind = 'new')
    into n, n2
    from cap_claim_notices(dl - interval '1 day') c
   where c.training_id = prueba;
  res := res || E'\n' || case when ok1 and ok2 and n = 1 and n2 = 0 then 'OK    ' else 'FALLA ' end
             || '14 avisos: nueva ' || ok1 || ', no se repite ' || ok2 || ', por vencer ' || n || ', nuevas repetidas ' || n2;

  -- 15. Freno: con 60 aperturas en la última hora no crea más; regresa la que ya tenga de esa
  --     capacitación y versión (si sirve) y, si no tiene, frena
  insert into trainings (slug, title, sort_order, is_active)
  values ('prueba-cap-2', 'PRUEBA CAPACITACIÓN 2 (no se guarda)', 998, true) returning id into otra;
  update training_sessions set opened_at = now() - interval '13 hours'   -- las de la v2 ya vencieron
   where training_id = prueba and employee_id = nuevo and version = 2;
  insert into training_sessions (training_id, employee_id, version, source, opened_at)
  values (prueba, nuevo, 2, 'app', now() - interval '5 minutes') returning id into sid;  -- la que sí sirve
  insert into training_sessions (training_id, employee_id, version, source, opened_at)
  select prueba, nuevo, 1, 'app', now() - interval '1 minute' from generate_series(1, 60);  -- versión vieja: no sirve
  insert into training_sessions (training_id, employee_id, version, source, opened_at)
  values (prueba, lau, 2, 'app', now());  -- de otra persona: no sirve
  select count(*) into n from training_sessions where employee_id = nuevo;
  r  := cap_open(prueba, nuevo);
  r2 := cap_open(otra, nuevo);
  select count(*) into n2 from training_sessions where employee_id = nuevo;
  res := res || E'\n' || case when (r->>'ok')::boolean and (r->>'session')::uuid = sid and (r->>'reused')::boolean
                                and r->>'slug' = 'prueba-cap'
                                and (r2->>'ok')::boolean = false and r2->>'error' like 'Demasiados%'
                                and n2 = n then 'OK    ' else 'FALLA ' end
             || '15 freno de 60 por hora: regresa la suya ' || ((r->>'session')::uuid is not distinct from sid)
             || ', sin sesión válida: ' || coalesce(r2->>'error', r2::text) || ', sesiones ' || n || ' → ' || n2;

  -- 16. Permisos: anon no lee las tablas ni usa las funciones del panel; sí ve su lista
  execute 'set role anon';
  got := 'leyó';
  begin perform 1 from trainings; exception when insufficient_privilege then got := 'bloqueado'; end;
  st := got;
  got := 'pudo';
  begin perform * from cap_matrix(); exception when insufficient_privilege then got := 'bloqueado'; end;
  st := st || ' / matrix ' || got;
  got := 'pudo';
  begin perform cap_mark_trained(prueba, nuevo, 'x'); exception when insufficient_privilege then got := 'bloqueado'; end;
  st := st || ' / marcar ' || got;
  got := 'pudo';
  begin perform * from cap_claim_notices(); exception when insufficient_privilege then got := 'bloqueado'; end;
  st := st || ' / avisos ' || got;
  got := 'no';
  begin
    got := coalesce((select e->>'status' from jsonb_array_elements(cap_list(lau)) e where e->>'slug' = 'prueba-cap'), 'no viene');
  exception when insufficient_privilege then got := 'bloqueado';
  end;
  st := st || ' / lista ' || got;
  execute 'reset role';
  res := res || E'\n' || case when st = 'bloqueado / matrix bloqueado / marcar bloqueado / avisos bloqueado / lista pending'
                            then 'OK    ' else 'FALLA ' end
             || '16 anon: tablas ' || st;

  -- 17. Origen: anon abre y contesta como 'app', pero no puede abrir como panel; el panel sí
  execute 'set role anon';
  got := 'bloqueado';
  begin
    r := cap_open(prueba, lau);
    sid := (r->>'session')::uuid;
    got := case when (r->>'ok')::boolean and sid is not null then 'abre' else coalesce(r->>'error', r::text) end;
  exception when insufficient_privilege then got := 'bloqueado';
  end;
  st := 'cap_open ' || got;
  got := 'bloqueado';
  begin
    r := cap_answer(sid, 'understood');
    got := coalesce(r->>'code', r::text);
  exception when insufficient_privilege then got := 'bloqueado';
  end;
  st := st || ' / cap_answer ' || got;
  got := 'pudo';
  begin perform cap_open_panel(prueba, lau); exception when insufficient_privilege then got := 'bloqueado'; end;
  st := st || ' / cap_open_panel ' || got;
  got := 'pudo';
  begin perform cap_open_as(prueba, lau, 'panel'); exception when insufficient_privilege then got := 'bloqueado'; end;
  st := st || ' / cap_open_as ' || got;
  execute 'reset role';
  ok1 := (select source = 'app' from training_sessions where id = sid);
  r := cap_open_panel(prueba, lau);
  ok2 := (r->>'ok')::boolean and (select source = 'panel' from training_sessions where id = (r->>'session')::uuid);
  -- ya no existe el cap_open de tres parámetros (con origen)
  ok3 := (select count(*) = 1 and min(p.pronargs) = 2 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
           where ns.nspname = 'public' and p.proname = 'cap_open');
  res := res || E'\n' || case when st = 'cap_open abre / cap_answer too_soon / cap_open_panel bloqueado / cap_open_as bloqueado'
                                and ok1 and ok2 and ok3 then 'OK    ' else 'FALLA ' end
             || '17 origen: anon ' || st || ' / sesión de anon es app ' || coalesce(ok1::text, 'no')
             || ' / panel crea origen panel ' || coalesce(ok2::text, 'no') || ' / sin cap_open de 3 ' || coalesce(ok3::text, 'no');

  raise exception 'RESULTADOS (no se guardó nada):%', res;
end $$;
