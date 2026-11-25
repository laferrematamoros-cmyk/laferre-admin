-- Pruebas de 013_varias_fotos.sql. Correr DESPUÉS de la migración.
-- NO guarda nada: arma una actividad de prueba, prueba todo y al final truena A PROPÓSITO
-- con los resultados (el editor de Supabase no enseña los NOTICE). Debe salir:
--   ERROR: RESULTADOS (no se guardó nada): … y cada renglón con OK.
-- Si algún renglón dice FALLA, mandar el texto completo.
do $$
declare
  co   uuid := 'a6798a18-9565-4f2b-929a-0c6771e7ef54';
  lau  uuid := '0ddf2629-36b8-4aa1-b769-39d45740bb43';
  hoy  date := (now() at time zone 'America/Matamoros')::date;
  lun  date;
  act  uuid;
  i1   uuid;
  i2   uuid;
  run  uuid;
  r    jsonb;
  p    text[];
  got  text[];
  st   text;
  res  text := '';
begin
  lun := hoy - (extract(isodow from hoy)::int - 1);
  insert into activities (title, company_id, start_time, limit_time, days_of_week, checklist_enabled)
  values ('PRUEBA FOTOS (no se guarda)', co, '00:00', '23:59', '{0,1,2,3,4,5,6}', true) returning id into act;
  insert into checklist_items (activity_id, area, label, days, needs_photo, photo_count, sort)
  values (act, 'Unidad 1', 'Llantas', '{0,1,2,3,4,5,6}', true, 3, 1) returning id into i1;
  insert into checklist_items (activity_id, area, label, days, needs_photo, sort)
  values (act, 'Unidad 1', 'Aceite', '{0,1,2,3,4,5,6}', true, 2) returning id into i2;
  insert into activity_rotations (activity_id, employee_ids, anchor_week, valid_from) values (act, array[lau], lun, lun - 7);

  -- 1. Abrir copia cuántas fotos pide cada tarea
  r := chk_open(act, lau);
  run := (r->'run'->>'id')::uuid;
  res := res || E'\n' || case when (select (x->>'photo_count')::int from jsonb_array_elements(r->'marks') x where x->>'label' = 'Llantas') = 3
                                and (select (x->>'photo_count')::int from jsonb_array_elements(r->'marks') x where x->>'label' = 'Aceite') = 1
                              then 'OK    ' else 'FALLA ' end || '1 abrir: Llantas pide 3, Aceite 1';

  p := array[run || '/' || i1 || '/1700000000001.jpg', run || '/' || i1 || '/1700000000002.jpg', run || '/' || i1 || '/1700000000003.jpg'];

  -- 2. App vieja (una sola foto) en una tarea de 3
  r := chk_mark(run, i1, lau, 'done', null, p[1]);
  res := res || E'\n' || case when r->>'error' like 'Esta tarea pide 3 fotos%' then 'OK    ' else 'FALLA ' end || '2 app vieja: ' || coalesce(r->>'error', r::text);

  -- 3. Faltan, sobran, repetida
  r := chk_mark(run, i1, lau, 'done', null, null, p[1:2]);
  res := res || E'\n' || case when r->>'error' like 'Faltan fotos%' then 'OK    ' else 'FALLA ' end || '3a faltan: ' || coalesce(r->>'error', r::text);
  r := chk_mark(run, i1, lau, 'done', null, null, p || (run || '/' || i1 || '/1700000000004.jpg'));
  res := res || E'\n' || case when r->>'error' like 'Son demasiadas%' then 'OK    ' else 'FALLA ' end || '3b sobran: ' || coalesce(r->>'error', r::text);
  r := chk_mark(run, i1, lau, 'done', null, null, array[p[1], p[1], p[2]]);
  res := res || E'\n' || case when r->>'error' like 'Hay una foto repetida%' then 'OK    ' else 'FALLA ' end || '3c repetida: ' || coalesce(r->>'error', r::text);

  -- 4. Fotos que no se subieron
  r := chk_mark(run, i1, lau, 'done', null, null, p);
  res := res || E'\n' || case when r->>'error' like 'Una foto no se terminó%' then 'OK    ' else 'FALLA ' end || '4 sin subir: ' || coalesce(r->>'error', r::text);

  -- 5. Las tres subidas: se guardan todas, la primera también en photo_path
  insert into storage.objects (bucket_id, name) select 'listas', unnest(p);
  r := chk_mark(run, i1, lau, 'done', null, null, p);
  select photo_paths, photo_path into got, st from checklist_marks where run_id = run and item_id = i1;
  res := res || E'\n' || case when (r->>'ok')::boolean and got = p and st = p[1] then 'OK    ' else 'FALLA ' end || '5 tres fotos: ' || coalesce(r->>'error', r::text);

  -- 6. Deshacer borra las fotos de la tarea
  perform chk_mark(run, i1, lau, 'pending', null, null);
  select photo_paths into got from checklist_marks where run_id = run and item_id = i1;
  res := res || E'\n' || case when got is null then 'OK    ' else 'FALLA ' end || '6 deshacer';

  -- 7. Tarea de 1 foto con la app vieja: sigue sirviendo
  insert into storage.objects (bucket_id, name) values ('listas', run || '/' || i2 || '/1700000000009.jpg');
  r := chk_mark(run, i2, lau, 'done', null, run || '/' || i2 || '/1700000000009.jpg');
  select photo_paths into got from checklist_marks where run_id = run and item_id = i2;
  res := res || E'\n' || case when (r->>'ok')::boolean and got = array[run || '/' || i2 || '/1700000000009.jpg'] then 'OK    ' else 'FALLA ' end
             || '7 una foto, app vieja: ' || coalesce(r->>'error', r::text);

  -- 8. chk_open regresa las fotos de cada tarea
  perform chk_mark(run, i1, lau, 'done', null, null, p);
  r := chk_open(act, lau);
  res := res || E'\n' || case when (select jsonb_array_length(x->'photo_paths') from jsonb_array_elements(r->'marks') x where x->>'label' = 'Llantas') = 3
                              then 'OK    ' else 'FALLA ' end || '8 abrir regresa las 3 fotos';

  -- 9. Regresar una tarea borra sus fotos
  r := chk_finish(run, lau);
  r := chk_return(run, array[i1], 'otra vez las llantas');
  select photo_paths into got from checklist_marks where run_id = run and item_id = i1;
  res := res || E'\n' || case when (r->>'ok')::boolean and got is null then 'OK    ' else 'FALLA ' end || '9 regresar: ' || coalesce(r->>'error', r::text);

  raise exception 'RESULTADOS (no se guardó nada):%', res;
end $$;
