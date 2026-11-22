-- Pruebas de 011_capacitaciones.sql. Correr DESPUÉS de la migración.
-- NO guarda nada: arma dos capacitaciones y seis empleados de prueba, prueba todo y al final truena
-- A PROPÓSITO con los resultados (el editor de Supabase no enseña los NOTICE). Debe salir:
--   ERROR: RESULTADOS (no se guardó nada): … y cada renglón con OK.
-- Si algún renglón dice FALLA, mandar el texto completo.
-- Dentro del bloque now() no cambia: el paso del tiempo se simula moviendo opened_at y published_at.
-- No depende de los empleados reales: usa los suyos, de La Ferre y de BFM.
do $$
declare
  co       uuid := 'a6798a18-9565-4f2b-929a-0c6771e7ef54';  -- La Ferre
  bfm      uuid;
  base_co  int;
  base_bfm int;
  prueba   uuid;
  otra     uuid;
  antiguo  uuid;  -- La Ferre, dado de alta hace 90 días
  nuevo    uuid;  -- La Ferre, dado de alta hoy
  baja     uuid;  -- La Ferre, inactivo
  ent      uuid;  -- La Ferre, la entiende en la v2
  dud      uuid;  -- La Ferre, tiene dudas en la v2
  ajeno    uuid;  -- BFM
  sid      uuid;
  viejo    uuid;
  dl       timestamptz;
  r        jsonb;
  r2       jsonb;
  st       text;
  st2      text;
  got      text;
  ok1      boolean;
  ok2      boolean;
  ok3      boolean;
  ok4      boolean;
  ok5      boolean;
  n        int;
  n2       int;
  n3       int;
  res      text := '';
begin
  select id into bfm from companies where slug = 'bfm';
  base_co  := cap_doubt_count(co);   -- dudas reales que ya hubiera (se restan en el caso 18)
  base_bfm := cap_doubt_count(bfm);

  insert into trainings (slug, title, sort_order, is_active, deadline_days, min_seconds)
  values ('prueba-cap', 'PRUEBA CAPACITACIÓN (no se guarda)', 999, true, 7, 30) returning id into prueba;
  insert into employees (id, name, role, initials, company_id, is_active, created_at)
  values (gen_random_uuid(), 'PRUEBA ANTIGUO (no se guarda)', 'Prueba', 'PA', co, true, now() - interval '90 days') returning id into antiguo;
  insert into employees (id, name, role, initials, company_id, is_active, created_at)
  values (gen_random_uuid(), 'PRUEBA NUEVO (no se guarda)', 'Prueba', 'PN', co, true, now()) returning id into nuevo;
  insert into employees (id, name, role, initials, company_id, is_active, created_at)
  values (gen_random_uuid(), 'PRUEBA BAJA (no se guarda)', 'Prueba', 'PB', co, false, now() - interval '90 days') returning id into baja;
  insert into employees (id, name, role, initials, company_id, is_active, created_at)
  values (gen_random_uuid(), 'PRUEBA ENTENDIDA (no se guarda)', 'Prueba', 'PE', co, true, now() - interval '90 days') returning id into ent;
  insert into employees (id, name, role, initials, company_id, is_active, created_at)
  values (gen_random_uuid(), 'PRUEBA DUDA (no se guarda)', 'Prueba', 'PD', co, true, now() - interval '90 days') returning id into dud;
  insert into employees (id, name, role, initials, company_id, is_active, created_at)
  values (gen_random_uuid(), 'PRUEBA BFM (no se guarda)', 'Prueba', 'PF', bfm, true, now() - interval '90 days') returning id into ajeno;

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

  -- 3. La lista de antiguo
  got := (select e->>'status' from jsonb_array_elements(cap_list(antiguo)) e where e->>'slug' = 'prueba-cap');
  res := res || E'\n' || case when got = 'pending' then 'OK    ' else 'FALLA ' end
             || '3 cap_list(antiguo) trae prueba-cap: ' || coalesce(got, 'no viene');

  -- 4. Publicada hace 10 días: antiguo atrasado, el nuevo cuenta desde su alta;
  --    si el atrasado contesta "dudas", ya no sale atrasado sino con dudas
  update trainings set published_at = now() - interval '10 days' where id = prueba;
  got := (select e->>'status' from jsonb_array_elements(cap_list(antiguo)) e where e->>'slug' = 'prueba-cap');
  st  := (select e->>'status' from jsonb_array_elements(cap_list(nuevo)) e where e->>'slug' = 'prueba-cap');
  r := cap_open(prueba, antiguo);
  r := cap_answer((r->>'session')::uuid, 'doubt', 'Duda de antiguo');
  st2 := (select e->>'status' from jsonb_array_elements(cap_list(antiguo)) e where e->>'slug' = 'prueba-cap');
  res := res || E'\n' || case when got = 'overdue' and st = 'pending' and (r->>'ok')::boolean and st2 = 'doubt'
                            then 'OK    ' else 'FALLA ' end
             || '4 hace 10 días: antiguo ' || coalesce(got, 'no viene') || ', nuevo ' || coalesce(st, 'no viene')
             || ', antiguo con dudas ' || coalesce(st2, r::text);

  -- 5. Abrir una pausada
  update trainings set is_active = false where id = prueba;
  r := cap_open(prueba, nuevo);
  got := coalesce((select 'viene' from jsonb_array_elements(cap_list(antiguo)) e where e->>'slug' = 'prueba-cap'), 'no viene');
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

  -- 14. Avisos
  --     En la v2: nuevo ya está capacitado; ent la entiende y dud tiene dudas
  r := cap_open(prueba, ent);
  sid := (r->>'session')::uuid;
  update training_sessions set opened_at = now() - interval '40 seconds' where id = sid;
  perform cap_answer(sid, 'understood');
  r := cap_open(prueba, dud);
  perform cap_answer((r->>'session')::uuid, 'doubt', 'Duda de prueba');
  -- a) "nueva" para antiguo; nada para los que ya contestaron
  select count(*) filter (where c.employee_id = antiguo and c.kind = 'new'),
         count(*) filter (where c.employee_id in (nuevo, ent, dud))
    into n, n2
    from cap_claim_notices(now()) c where c.training_id = prueba;
  ok1 := n = 1 and n2 = 0;
  -- b) la segunda llamada ya no la regresa
  select count(*) into n from cap_claim_notices(now()) c
   where c.training_id = prueba and c.employee_id = antiguo;
  ok2 := n = 0;
  -- c) un día antes del plazo: "por vencer" para antiguo; ni "nueva" repetida ni nada a los que contestaron
  select deadline into dl from cap_rows(now()) c where c.training_id = prueba and c.employee_id = antiguo;
  select count(*) filter (where c.employee_id = antiguo and c.kind = 'due_soon'),
         count(*) filter (where c.kind = 'new'),
         count(*) filter (where c.employee_id in (nuevo, ent, dud))
    into n, n2, n3
    from cap_claim_notices(dl - interval '1 day') c where c.training_id = prueba;
  ok3 := n = 1 and n2 = 0 and n3 = 0;
  -- d) un empleado reactivado que ya está atrasado: le llega "nueva" y no "por vencer"
  update employees set is_active = true where id = baja;
  select count(*) filter (where c.kind = 'new'), count(*) filter (where c.kind = 'due_soon')
    into n, n2
    from cap_claim_notices(dl + interval '1 day') c where c.training_id = prueba and c.employee_id = baja;
  ok4 := n = 1 and n2 = 0
         and (select c.status from cap_rows(dl + interval '1 day') c where c.training_id = prueba and c.employee_id = baja) = 'overdue';
  update employees set is_active = false where id = baja;
  -- e) pausar y reactivar es empezar de cero: "nueva" y "por vencer" se vuelven a apartar
  update trainings set is_active = false where id = prueba;
  update trainings set is_active = true where id = prueba;
  select count(*) into n from cap_claim_notices(now()) c
   where c.training_id = prueba and c.employee_id = antiguo and c.kind = 'new';
  select deadline into dl from cap_rows(now()) c where c.training_id = prueba and c.employee_id = antiguo;
  select count(*) into n2 from cap_claim_notices(dl - interval '1 day') c
   where c.training_id = prueba and c.employee_id = antiguo and c.kind = 'due_soon';
  ok5 := n = 1 and n2 = 1;
  res := res || E'\n' || case when ok1 and ok2 and ok3 and ok4 and ok5 then 'OK    ' else 'FALLA ' end
             || '14 avisos: nueva ' || ok1 || ', no se repite ' || ok2 || ', por vencer ' || ok3
             || ', reactivado atrasado ' || ok4 || ', otra vez al reactivarla ' || ok5;

  -- 15. Freno por capacitación: con 20 aperturas de la misma (versión y origen) en la última hora
  --     regresa la más reciente de esas, sin crear otra; no frena otras capacitaciones; y nunca
  --     le da al teléfono una sesión del panel
  insert into trainings (slug, title, sort_order, is_active)
  values ('prueba-cap-2', 'PRUEBA CAPACITACIÓN 2 (no se guarda)', 998, true) returning id into otra;
  update training_sessions set opened_at = now() - interval '2 hours'   -- las de antes ya no cuentan
   where training_id = prueba and employee_id = nuevo;
  insert into training_sessions (training_id, employee_id, version, source, opened_at)
  select prueba, nuevo, 2, 'app', now() - interval '30 minutes' from generate_series(1, 19);
  insert into training_sessions (training_id, employee_id, version, source, opened_at)
  values (prueba, nuevo, 2, 'app', now() - interval '2 minutes') returning id into sid;  -- la más reciente de las 20
  insert into training_sessions (training_id, employee_id, version, source, opened_at) values
    (prueba, nuevo,   2, 'panel', now() - interval '1 minute'),   -- otro origen: no
    (prueba, nuevo,   1, 'app',   now() - interval '1 minute'),   -- versión vieja: no
    (prueba, antiguo, 2, 'app',   now() - interval '1 minute');   -- otra persona: no
  select count(*) into n from training_sessions where employee_id = nuevo;
  r := cap_open(prueba, nuevo);
  select count(*) into n2 from training_sessions where employee_id = nuevo;
  ok1 := (r->>'ok')::boolean and (r->>'session')::uuid = sid and (r->>'reused')::boolean
         and r->>'slug' = 'prueba-cap' and n2 = n;
  r := cap_open(otra, nuevo);
  select count(*) into n3 from training_sessions where employee_id = nuevo;
  ok2 := (r->>'ok')::boolean and r->'reused' is null and n3 = n2 + 1
         and exists (select 1 from training_sessions where id = (r->>'session')::uuid and training_id = otra and source = 'app');
  insert into training_sessions (training_id, employee_id, version, source, opened_at)
  select otra, ent, 1, 'panel', now() - interval '10 minutes' from generate_series(1, 20);
  r  := cap_open(otra, ent);
  r2 := cap_open_panel(otra, ent);
  ok3 := (r->>'ok')::boolean and r->'reused' is null
         and (select source from training_sessions where id = (r->>'session')::uuid) = 'app'
         and (r2->>'reused')::boolean
         and (select source from training_sessions where id = (r2->>'session')::uuid) = 'panel';
  res := res || E'\n' || case when ok1 and ok2 and ok3 then 'OK    ' else 'FALLA ' end
             || '15 freno: regresa la más reciente sin crear ' || ok1 || ' (sesiones ' || n || ' → ' || n2 || ')'
             || ', otra capacitación sí abre ' || ok2 || ', con 20 del panel el teléfono recibe una suya ' || ok3;

  -- 16. Permisos: anon no lee las tablas ni usa las funciones internas o del panel; sí ve su lista
  execute 'set role anon';
  got := 'leyó';
  begin perform 1 from trainings; exception when insufficient_privilege then got := 'bloqueado'; end;
  st := got;
  got := 'pudo';
  begin perform * from cap_matrix(co); exception when insufficient_privilege then got := 'bloqueado'; end;
  st := st || ' / matrix ' || got;
  got := 'pudo';
  begin perform cap_mark_trained(prueba, nuevo, 'x'); exception when insufficient_privilege then got := 'bloqueado'; end;
  st := st || ' / marcar ' || got;
  got := 'pudo';
  begin perform * from cap_claim_notices(); exception when insufficient_privilege then got := 'bloqueado'; end;
  st := st || ' / avisos ' || got;
  got := 'pudo';
  begin perform * from cap_rows(); exception when insufficient_privilege then got := 'bloqueado'; end;
  st := st || ' / filas ' || got;
  got := 'pudo';
  begin perform cap_deadline(now(), 7); exception when insufficient_privilege then got := 'bloqueado'; end;
  st := st || ' / plazo ' || got;
  got := 'pudo';
  begin perform cap_doubt_count(co); exception when insufficient_privilege then got := 'bloqueado'; end;
  st := st || ' / dudas ' || got;
  got := 'no';
  begin
    got := coalesce((select e->>'status' from jsonb_array_elements(cap_list(antiguo)) e where e->>'slug' = 'prueba-cap'), 'no viene');
  exception when insufficient_privilege then got := 'bloqueado';
  end;
  st := st || ' / lista ' || got;
  execute 'reset role';
  -- la función del trigger no se puede llamar directo; basta revisar que anon no tenga el permiso
  st := st || ' / trigger ' || case when has_function_privilege('anon', 'public.trainings_publish()', 'execute')
                                    then 'pudo' else 'bloqueado' end;
  res := res || E'\n' || case when st = 'bloqueado / matrix bloqueado / marcar bloqueado / avisos bloqueado'
                                       || ' / filas bloqueado / plazo bloqueado / dudas bloqueado / lista pending'
                                       || ' / trigger bloqueado'
                            then 'OK    ' else 'FALLA ' end
             || '16 anon: tablas ' || st;

  -- 17. Origen: anon abre y contesta como 'app', pero no puede abrir como panel; el panel sí
  execute 'set role anon';
  got := 'bloqueado';
  begin
    r := cap_open(prueba, antiguo);
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
  begin perform cap_open_panel(prueba, antiguo); exception when insufficient_privilege then got := 'bloqueado'; end;
  st := st || ' / cap_open_panel ' || got;
  got := 'pudo';
  begin perform cap_open_as(prueba, antiguo, 'panel'); exception when insufficient_privilege then got := 'bloqueado'; end;
  st := st || ' / cap_open_as ' || got;
  execute 'reset role';
  ok1 := (select source = 'app' from training_sessions where id = sid);
  r := cap_open_panel(prueba, antiguo);
  ok2 := (r->>'ok')::boolean and (select source = 'panel' from training_sessions where id = (r->>'session')::uuid);
  -- ya no existe el cap_open de tres parámetros (con origen)
  ok3 := (select count(*) = 1 and min(p.pronargs) = 2 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
           where ns.nspname = 'public' and p.proname = 'cap_open');
  res := res || E'\n' || case when st = 'cap_open abre / cap_answer too_soon / cap_open_panel bloqueado / cap_open_as bloqueado'
                                and ok1 and ok2 and ok3 then 'OK    ' else 'FALLA ' end
             || '17 origen: anon ' || st || ' / sesión de anon es app ' || coalesce(ok1::text, 'no')
             || ' / panel crea origen panel ' || coalesce(ok2::text, 'no') || ' / sin cap_open de 3 ' || coalesce(ok3::text, 'no');

  -- 18. Numerito de dudas por empresa: cuenta las dudas vigentes de la prueba.
  --     Ya había una de La Ferre (dud, caso 14); las de la v1 (casos 4 y 10) ya no cuentan.
  r := cap_open(prueba, antiguo);
  r := cap_answer((r->>'session')::uuid, 'doubt', 'Duda de prueba 2');
  ok1 := (r->>'ok')::boolean;
  r := cap_open(otra, nuevo);
  r := cap_answer((r->>'session')::uuid, 'doubt');
  ok1 := ok1 and (r->>'ok')::boolean;
  r := cap_open(prueba, ajeno);
  r := cap_answer((r->>'session')::uuid, 'doubt');
  ok1 := ok1 and (r->>'ok')::boolean;
  n  := cap_doubt_count(co) - base_co;
  n2 := cap_doubt_count(bfm) - base_bfm;
  res := res || E'\n' || case when ok1 and n = 3 and n2 = 1 then 'OK    ' else 'FALLA ' end
             || '18 cap_doubt_count: La Ferre ' || n || ' (esperadas 3), BFM ' || n2 || ' (esperada 1)';

  -- 19. Tabla de avance por empresa (Supabase no regresa más de 1,000 filas: el panel la pide por empresa)
  --     La Ferre: sólo gente de La Ferre, con los 4 de prueba activos (ni baja ni el de BFM)
  select count(*) filter (where m.company_id is distinct from co),
         count(distinct m.employee_id) filter (where m.employee_id in (antiguo, nuevo, ent, dud)),
         count(*) filter (where m.employee_id in (baja, ajeno))
    into n, n2, n3
    from cap_matrix(co) m;
  ok1 := n = 0 and n2 = 4 and n3 = 0;
  st := 'La Ferre: ajenas ' || n || ', de prueba ' || n2 || ' de 4, baja o BFM ' || n3;
  --     BFM: el de BFM en cada capacitación activa y nadie de La Ferre
  select count(*) filter (where m.company_id is distinct from bfm),
         count(*) filter (where m.employee_id = ajeno),
         count(*) filter (where m.employee_id in (antiguo, nuevo, ent, dud))
    into n, n2, n3
    from cap_matrix(bfm) m;
  ok2 := n = 0 and n2 = (select count(*) from trainings where is_active) and n3 = 0;
  st := st || ' / BFM: ajenas ' || n || ', ajeno en ' || n2 || ', de La Ferre ' || n3;
  --     llega en orden: persona, y dentro de cada persona el orden de las capacitaciones
  ok3 := (select bool_and(m.ordinality = m.esperado) from (
            select x.ordinality,
                   row_number() over (order by x.employee_name, x.employee_id, x.sort_order, x.title, x.training_id) as esperado
              from cap_matrix(co) with ordinality x) m);
  --     sólo queda la de un parámetro
  ok4 := (select count(*) = 1 and min(p.pronargs) = 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
           where ns.nspname = 'public' and p.proname = 'cap_matrix');
  res := res || E'\n' || case when ok1 and ok2 and ok3 and ok4 then 'OK    ' else 'FALLA ' end
             || '19 cap_matrix por empresa: ' || st || ' / en orden ' || coalesce(ok3::text, 'no')
             || ' / sólo cap_matrix(empresa) ' || coalesce(ok4::text, 'no');

  raise exception 'RESULTADOS (no se guardó nada):%', res;
end $$;
