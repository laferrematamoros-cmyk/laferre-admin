-- Pruebas de 010_lista_con_firma.sql. Correr DESPUÉS de la migración.
-- NO guarda nada: arma una actividad de prueba, prueba todo y al final truena A PROPÓSITO
-- con los resultados (el editor de Supabase no enseña los NOTICE). Debe salir:
--   ERROR: RESULTADOS (no se guardó nada): … y cada renglón con OK.
-- Si algún renglón dice FALLA, mandar el texto completo.
do $$
declare
  co   uuid := 'a6798a18-9565-4f2b-929a-0c6771e7ef54';
  lau  uuid := '0ddf2629-36b8-4aa1-b769-39d45740bb43';
  yaj  uuid := 'c3334c82-4fa4-4668-ad0a-2265b1f89ebf';
  hoy  date := (now() at time zone 'America/Matamoros')::date;
  lun  date;
  otro date;
  act  uuid;
  i1   uuid;
  i2   uuid;
  run  uuid;
  r    jsonb;
  st   text;
  got  text;
  n    int;
  res  text := '';
begin
  lun  := hoy - (extract(isodow from hoy)::int - 1);
  otro := case when hoy = lun then lun + 1 else lun end;  -- otro día de esta misma semana

  insert into activities (title, company_id, start_time, limit_time, days_of_week, checklist_enabled)
  values ('PRUEBA LISTA (no se guarda)', co, '00:00', '23:59', '{0,1,2,3,4,5,6}', true) returning id into act;
  insert into checklist_items (activity_id, area, label, days, needs_photo, sort)
  values (act, 'Área', 'Tarea sin foto', '{0,1,2,3,4,5,6}', false, 1) returning id into i1;
  insert into checklist_items (activity_id, area, label, days, needs_photo, sort)
  values (act, 'Área', 'Tarea con foto', '{0,1,2,3,4,5,6}', true, 2) returning id into i2;
  insert into activity_rotations (activity_id, employee_ids, anchor_week, valid_from)
  values (act, array[lau, yaj], lun, lun - 7);
  perform chk_set_pin('2468');

  -- 1. Rol
  res := res || E'\n' || case when duty_employee(act, hoy) = lau and duty_employee(act, hoy + 7) = yaj
                                and duty_employee(act, hoy - 7) = yaj then 'OK    ' else 'FALLA ' end
             || '1 rol: esta semana Laura, la siguiente y la anterior Yajaira';

  -- 2. Cambio de un día
  insert into activity_duty_overrides (activity_id, from_date, to_date, employee_id) values (act, hoy, hoy, yaj);
  res := res || E'\n' || case when duty_employee(act, hoy) = yaj and duty_employee(act, otro) = lau then 'OK    ' else 'FALLA ' end
             || '2 cambio de un día: hoy Yajaira, otro día de la semana Laura';
  delete from activity_duty_overrides where activity_id = act;

  -- 3. Abrir sin estar de turno
  r := chk_open(act, yaj);
  res := res || E'\n' || case when (r->>'ok')::boolean = false and r->>'error' like '%le toca a%' then 'OK    ' else 'FALLA ' end
             || '3 abrir sin turno: ' || coalesce(r->>'error', r::text);

  -- 4. Abrir estando de turno
  r := chk_open(act, lau);
  run := (r->'run'->>'id')::uuid;
  res := res || E'\n' || case when (r->>'ok')::boolean and jsonb_array_length(r->'marks') = 2 then 'OK    ' else 'FALLA ' end
             || '4 abrir de turno: 2 tareas';

  -- 5. Palomear la de foto sin foto
  r := chk_mark(run, i2, lau, 'done', null, null);
  res := res || E'\n' || case when r->>'error' = 'Falta la foto.' then 'OK    ' else 'FALLA ' end || '5 sin foto: ' || coalesce(r->>'error', r::text);

  -- 6. "No se pudo" sin motivo
  r := chk_mark(run, i1, lau, 'skipped', '  ', null);
  res := res || E'\n' || case when r->>'error' like 'Escribe por qué%' then 'OK    ' else 'FALLA ' end || '6 sin motivo: ' || coalesce(r->>'error', r::text);

  -- 7. Terminar con pendientes
  r := chk_finish(run, lau);
  res := res || E'\n' || case when r->>'error' like 'Faltan tareas%' then 'OK    ' else 'FALLA ' end || '7 terminar con pendientes: ' || coalesce(r->>'error', r::text);

  -- 8. Resolver las dos y terminar
  perform chk_mark(run, i1, lau, 'done', null, null);
  perform chk_mark(run, i2, lau, 'skipped', 'no había luz', null);
  r := chk_finish(run, lau);
  select status into st from checklist_runs where id = run;
  res := res || E'\n' || case when (r->>'ok')::boolean and st = 'awaiting_signature' then 'OK    ' else 'FALLA ' end
             || '8 terminar: ' || st;

  -- 9. Candado: no se puede dar por hecha directo
  got := 'se dejó';
  begin
    insert into completions (activity_id, employee_id, scheduled_date) values (act, lau, hoy);
  exception when others then got := sqlerrm;
  end;
  res := res || E'\n' || case when got like '%Actualiza la app%' then 'OK    ' else 'FALLA ' end || '9 candado de completions: ' || got;

  -- 10. PIN equivocado 4 veces
  for n in 1..4 loop r := chk_sign_pin(run, '1111'); end loop;
  res := res || E'\n' || case when r->>'error' = 'PIN equivocado. Te queda 1 intento.' then 'OK    ' else 'FALLA ' end
             || '10 PIN malo x4: ' || coalesce(r->>'error', r::text);

  -- 11. El 5º bloquea
  r := chk_sign_pin(run, '1111');
  res := res || E'\n' || case when r->>'code' = 'locked'
                                and (select pin_locked_until > now() and not lock_notified from signer_settings where id) then 'OK    ' else 'FALLA ' end
             || '11 bloqueo: ' || coalesce(r->>'error', r::text);

  -- 12. Bloqueado, ni el bueno pasa
  r := chk_sign_pin(run, '2468');
  res := res || E'\n' || case when r->>'code' = 'locked' then 'OK    ' else 'FALLA ' end || '12 bloqueado con PIN bueno: ' || coalesce(r->>'error', r::text);

  -- 12b. Segundo bloqueo seguido: 30 minutos
  update signer_settings set pin_locked_until = null where id;  -- como si ya hubieran pasado los 15 min
  for n in 1..5 loop r := chk_sign_pin(run, '1111'); end loop;
  res := res || E'\n' || case when r->>'error' = 'PIN equivocado. Se bloqueó 30 minutos.' then 'OK    ' else 'FALLA ' end
             || '12b segundo bloqueo: ' || coalesce(r->>'error', r::text);

  -- 12c. Tercer bloqueo: se apaga la firma con PIN (nadie prueba más de 15)
  update signer_settings set pin_locked_until = null where id;
  for n in 1..5 loop r := chk_sign_pin(run, '1111'); end loop;
  res := res || E'\n' || case when r->>'code' = 'disabled' and (select pin_disabled from signer_settings where id) then 'OK    ' else 'FALLA ' end
             || '12c tercer bloqueo apaga el PIN: ' || coalesce(r->>'error', r::text);
  r := chk_sign_pin(run, '2468');
  res := res || E'\n' || case when r->>'code' = 'disabled' then 'OK    ' else 'FALLA ' end || '12d apagado, ni el bueno pasa';

  -- 13. Regresar una tarea (antes, un PIN nuevo vuelve a prender la firma con PIN)
  r := chk_set_pin('2468');
  res := res || E'\n' || case when (r->>'ok')::boolean
                                and (select not pin_disabled and pin_lock_count = 0 and pin_locked_until is null from signer_settings where id)
                            then 'OK    ' else 'FALLA ' end || '12e PIN nuevo lo vuelve a prender';
  r := chk_return(run, array[i1], 'Repetir');
  select status into st from checklist_runs where id = run;
  res := res || E'\n' || case when (r->>'ok')::boolean and st = 'returned'
                                and (select state from checklist_marks where run_id = run and item_id = i1) = 'pending'
                                and (select state from checklist_marks where run_id = run and item_id = i2) = 'skipped' then 'OK    ' else 'FALLA ' end
             || '13 regresar sólo la elegida: ' || st;
  r := chk_sign_pin(run, '2468');
  res := res || E'\n' || case when r->>'error' = 'Todavía no la terminan.' then 'OK    ' else 'FALLA ' end || '13b firmar una regresada: ' || coalesce(r->>'error', r::text);

  -- 14. Corregir, terminar y firmar con el PIN bueno
  perform chk_mark(run, i1, lau, 'done', null, null);
  perform chk_finish(run, lau);
  r := chk_sign_pin(run, '2468');
  select status into st from checklist_runs where id = run;
  res := res || E'\n' || case when (r->>'ok')::boolean and st = 'signed'
                                and (select completion_id is not null and signed_via = 'pin' and signed_by_name is not null from checklist_runs where id = run)
                                and exists (select 1 from completions where activity_id = act and scheduled_date = hoy and employee_id = lau and not was_late)
                            then 'OK    ' else 'FALLA ' end
             || '14 firmada con PIN y creada la actividad hecha: ' || st;

  -- 15. Firmar otra vez
  r := chk_sign_panel(run, 'Prueba');
  res := res || E'\n' || case when r->>'error' like '%ya está firmada%' then 'OK    ' else 'FALLA ' end || '15 doble firma: ' || coalesce(r->>'error', r::text);
  r := chk_mark(run, i1, lau, 'pending', null, null);
  res := res || E'\n' || case when r->>'error' like '%ya está firmada%' then 'OK    ' else 'FALLA ' end || '15b mover una firmada: ' || coalesce(r->>'error', r::text);

  -- 16. Lo de hoy para el teléfono
  r := chk_today(co);
  res := res || E'\n' || case when exists (select 1 from jsonb_array_elements(r) e
                                            where e->>'activity_id' = act::text and e->>'status' = 'signed' and (e->>'total')::int = 2) then 'OK    ' else 'FALLA ' end
             || '16 chk_today trae la de prueba firmada';

  -- 17. Permisos: anon no lee la firma ni pone PIN
  execute 'set local role anon';
  got := 'leyó';
  begin perform 1 from signer_settings; exception when insufficient_privilege then got := 'bloqueado'; end;
  res := res || E'\n' || case when got = 'bloqueado' then 'OK    ' else 'FALLA ' end || '17 anon no lee signer_settings: ' || got;
  got := 'pudo';
  begin perform chk_set_pin('0000'); exception when insufficient_privilege then got := 'bloqueado'; end;
  res := res || E'\n' || case when got = 'bloqueado' then 'OK    ' else 'FALLA ' end || '17b anon no pone PIN: ' || got;
  got := 'pudo';
  begin perform chk_sign_panel(run, 'x'); exception when insufficient_privilege then got := 'bloqueado'; end;
  res := res || E'\n' || case when got = 'bloqueado' then 'OK    ' else 'FALLA ' end || '17c anon no firma como panel: ' || got;
  got := 'no';
  begin perform 1 from checklist_items limit 1; got := 'sí'; exception when insufficient_privilege then got := 'bloqueado'; end;
  res := res || E'\n' || case when got = 'sí' then 'OK    ' else 'FALLA ' end || '17d anon sí lee las tareas: ' || got;
  execute 'reset role';

  raise exception 'RESULTADOS (no se guardó nada):%', res;
end $$;
