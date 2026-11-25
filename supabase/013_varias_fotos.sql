-- 013: varias fotos por tarea de la lista con firma (ej. "Revisar llantas": 4 fotos).
-- · checklist_items.photo_count: cuántas fotos pide la tarea (1 a 6) cuando needs_photo.
-- · checklist_marks.photo_count: la copia del día (igual que needs_photo); photo_paths: todas sus fotos.
--   photo_path se queda con la primera, para lo que ya la lee.
-- · chk_mark acepta p_photos (lista). La app vieja, que sólo manda p_photo, sigue sirviendo en
--   las tareas de 1 foto; en una de varias le dice que actualice la app.
-- Sólo agrega columnas y cambia funciones: no borra nada. Con todo en 1 foto, todo funciona igual que antes.

alter table public.checklist_items
  add column if not exists photo_count smallint not null default 1 check (photo_count between 1 and 6);
alter table public.checklist_marks
  add column if not exists photo_count smallint not null default 1 check (photo_count between 1 and 6);
alter table public.checklist_marks add column if not exists photo_paths text[];
update public.checklist_marks set photo_paths = array[photo_path] where photo_path is not null and photo_paths is null;

-- ── Abrir la lista del día (copia también photo_count; regresa photo_count y photo_paths) ──
create or replace function public.chk_open(p_activity uuid, p_employee uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a activities;
  d date := (now() at time zone 'America/Matamoros')::date;
  dow int := extract(dow from (now() at time zone 'America/Matamoros'))::int;
  e_company uuid;
  duty uuid;
  run checklist_runs;
  who text;
begin
  select * into a from activities where id = p_activity;
  if not found or not a.checklist_enabled then return jsonb_build_object('ok', false, 'error', 'Esta actividad no tiene lista.'); end if;
  select company_id into e_company from employees where id = p_employee and is_active;
  if e_company is null or e_company <> a.company_id then
    return jsonb_build_object('ok', false, 'error', 'Tu usuario no es de esta tienda.');
  end if;

  select * into run from checklist_runs where activity_id = p_activity and scheduled_date = d;
  if not found then
    if not a.is_active or a.archived_at is not null or not (dow = any(a.days_of_week)) then
      return jsonb_build_object('ok', false, 'error', 'Hoy no toca esta actividad.');
    end if;
    duty := duty_employee(p_activity, d);
    if duty is distinct from p_employee then
      select name into who from employees where id = duty;
      return jsonb_build_object('ok', false, 'error',
        case when who is null then 'Hoy no hay nadie de turno para esta lista.' else 'Esta semana le toca a ' || who || '.' end);
    end if;
    if not exists (select 1 from checklist_items i where i.activity_id = p_activity and i.archived_at is null and dow = any(i.days)) then
      return jsonb_build_object('ok', false, 'error', 'Hoy no hay tareas en la lista.');
    end if;
    insert into checklist_runs (activity_id, company_id, scheduled_date, employee_id)
    values (p_activity, a.company_id, d, p_employee)
    on conflict (activity_id, scheduled_date) do nothing;
    select * into run from checklist_runs where activity_id = p_activity and scheduled_date = d;
    insert into checklist_marks (run_id, item_id, area, label, needs_photo, photo_count, sort)
    select run.id, i.id, i.area, i.label, i.needs_photo, i.photo_count, i.sort
      from checklist_items i
     where i.activity_id = p_activity and i.archived_at is null and dow = any(i.days)
    on conflict do nothing;
  end if;

  if run.employee_id <> p_employee then
    select name into who from employees where id = run.employee_id;
    return jsonb_build_object('ok', false, 'error', 'Esta lista la está haciendo ' || coalesce(who, 'otra persona') || '.');
  end if;

  return jsonb_build_object('ok', true,
    'run', jsonb_build_object('id', run.id, 'status', run.status, 'employee_id', run.employee_id,
                              'scheduled_date', run.scheduled_date, 'finished_at', run.finished_at,
                              'return_note', run.return_note),
    'marks', coalesce((select jsonb_agg(jsonb_build_object(
                'item_id', m.item_id, 'area', m.area, 'label', m.label, 'needs_photo', m.needs_photo,
                'photo_count', m.photo_count, 'sort', m.sort, 'state', m.state, 'reason', m.reason,
                'photo_path', m.photo_path, 'photo_paths', to_jsonb(m.photo_paths))
              order by m.sort, m.label) from checklist_marks m where m.run_id = run.id), '[]'::jsonb));
end $$;

-- ── Palomear / "No se pudo" / deshacer una tarea (ahora con varias fotos) ──
drop function if exists public.chk_mark(uuid, uuid, uuid, text, text, text);
create or replace function public.chk_mark(p_run uuid, p_item uuid, p_employee uuid, p_state text, p_reason text,
                                           p_photo text, p_photos text[] default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  run checklist_runs;
  m checklist_marks;
  why text := nullif(btrim(left(coalesce(p_reason, ''), 300)), '');
  shots text[];
  s text;
begin
  select * into run from checklist_runs where id = p_run for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'No se encontró la lista.'); end if;
  if run.employee_id <> p_employee then return jsonb_build_object('ok', false, 'error', 'Esta lista es de otra persona.'); end if;
  if run.status = 'awaiting_signature' then return jsonb_build_object('ok', false, 'error', 'Ya la entregaste. Espera la firma.'); end if;
  if run.status = 'signed' then return jsonb_build_object('ok', false, 'error', 'Esta lista ya está firmada.'); end if;
  if p_state is null or p_state not in ('pending', 'done', 'skipped') then
    return jsonb_build_object('ok', false, 'error', 'Estado no válido.');
  end if;
  select * into m from checklist_marks where run_id = p_run and item_id = p_item for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Esa tarea no es de hoy.'); end if;
  if p_state = 'skipped' and why is null then
    return jsonb_build_object('ok', false, 'error', 'Escribe por qué no se pudo.');
  end if;
  if p_state = 'done' and m.needs_photo then
    shots := coalesce(p_photos, case when p_photo is null then null else array[p_photo] end);
    if coalesce(cardinality(shots), 0) = 0 then
      return jsonb_build_object('ok', false, 'error', 'Falta la foto.');
    end if;
    if cardinality(shots) < m.photo_count then
      return jsonb_build_object('ok', false, 'error',
        case when p_photos is null
             then 'Esta tarea pide ' || m.photo_count || ' fotos. Cierra la app y ábrela otra vez para que se actualice.'
             else 'Faltan fotos: esta tarea pide ' || m.photo_count || '.' end);
    end if;
    if cardinality(shots) > m.photo_count then
      return jsonb_build_object('ok', false, 'error', 'Son demasiadas fotos: esta tarea pide ' || m.photo_count || '.');
    end if;
    if (select count(distinct x) from unnest(shots) x) <> cardinality(shots) then
      return jsonb_build_object('ok', false, 'error', 'Hay una foto repetida. Tómala otra vez.');
    end if;
    foreach s in array shots loop
      if s is null or s !~ ('^' || run.id::text || '/' || p_item::text || '/[0-9]{13}\.jpg$') then
        return jsonb_build_object('ok', false, 'error', 'Falta la foto.');
      end if;
      if not exists (select 1 from storage.objects where bucket_id = 'listas' and name = s) then
        return jsonb_build_object('ok', false, 'error', 'Una foto no se terminó de subir. Tómala otra vez.');
      end if;
    end loop;
  end if;
  update checklist_marks set
    state = p_state,
    reason = case when p_state = 'skipped' then why else null end,
    photo_path = case when p_state = 'done' and m.needs_photo then shots[1] else null end,
    photo_paths = case when p_state = 'done' and m.needs_photo then shots else null end,
    marked_by = case when p_state = 'pending' then null else p_employee end,
    marked_at = case when p_state = 'pending' then null else now() end
  where run_id = p_run and item_id = p_item;
  return jsonb_build_object('ok', true);
end $$;

-- ── Regresar tareas: también borra la lista de fotos ──
create or replace function public.chk_return(p_run uuid, p_items uuid[], p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  run checklist_runs;
  note text := nullif(btrim(left(coalesce(p_note, ''), 300)), '');
  n int;
begin
  select * into run from checklist_runs where id = p_run for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'No se encontró la lista.'); end if;
  if run.status <> 'awaiting_signature' then
    return jsonb_build_object('ok', false, 'error', 'Sólo se puede regresar una lista terminada y sin firmar.');
  end if;
  if note is null then return jsonb_build_object('ok', false, 'error', 'Escribe qué hay que corregir.'); end if;
  if coalesce(cardinality(p_items), 0) = 0 then return jsonb_build_object('ok', false, 'error', 'Elige las tareas que hay que rehacer.'); end if;
  update checklist_marks set state = 'pending', reason = null, photo_path = null, photo_paths = null, marked_by = null, marked_at = null
   where run_id = p_run and item_id = any(p_items);
  get diagnostics n = row_count;
  if n = 0 then return jsonb_build_object('ok', false, 'error', 'Esas tareas no son de esta lista.'); end if;
  update checklist_runs set status = 'returned', return_note = note, returned_at = now(),
    finished_at = null, was_late = null, notified_at = null
  where id = p_run;
  return jsonb_build_object('ok', true, 'employee_id', run.employee_id);
end $$;

revoke all on function public.chk_mark(uuid, uuid, uuid, text, text, text, text[]) from public;
grant execute on function public.chk_mark(uuid, uuid, uuid, text, text, text, text[]) to anon, authenticated;

notify pgrst, 'reload schema';

-- Debe salir: photo_count_tareas | 1 · photo_count_dia | 1 · chk_mark_args | 7
select (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'checklist_items' and column_name = 'photo_count') as photo_count_tareas,
       (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'checklist_marks' and column_name = 'photo_count') as photo_count_dia,
       (select pronargs from pg_proc where proname = 'chk_mark' and pronamespace = 'public'::regnamespace) as chk_mark_args;
