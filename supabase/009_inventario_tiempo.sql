-- Inventario: cuánto tardaron en cada letra (lo anota el empleado al terminarla).
-- La hora en que la tomaron (claimed_at) y la terminaron (done_at) ya se guardaban; ésas sólo
-- las ve el administrador en el panel.
-- Correr en el SQL Editor de Supabase ANTES de mandar la actualización de la app. Se puede correr dos veces.
-- p_minutes va con default null: un teléfono que todavía no baja la actualización sigue pudiendo terminar.
begin;

alter table public.inventory_sections add column if not exists minutes_taken int
  check (minutes_taken is null or minutes_taken between 1 and 720);

-- Se borra la versión sin p_minutes para que no queden dos funciones con el mismo nombre
-- (PostgREST no sabría a cuál llamar).
drop function if exists public.inv_finish_section(uuid, uuid, text, text[], text, text, text, text, boolean, boolean, text);

create or replace function public.inv_finish_section(
  p_section uuid, p_employee uuid, p_shelf_photo text, p_report_photos text[],
  p_area_state text, p_observations text, p_improvement text, p_action_taken text,
  p_had_differences boolean, p_differences_resolved boolean, p_pending_note text,
  p_minutes int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s inventory_sections;
  r inventory_rounds;
  pat text;
  ph text;
  all_photos text[];
  found_n int;
  left_n int;
  obs text := nullif(btrim(left(coalesce(p_observations, ''), 2000)), '');
  imp text := nullif(btrim(left(coalesce(p_improvement, ''), 2000)), '');
  act text := nullif(btrim(left(coalesce(p_action_taken, ''), 2000)), '');
  pend text := nullif(btrim(left(coalesce(p_pending_note, ''), 1000)), '');
  open_pending boolean;
begin
  select * into s from inventory_sections where id = p_section for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'No se encontró la letra.'); end if;
  select * into r from inventory_rounds where id = s.round_id for update;
  if r.closed_at is not null then return jsonb_build_object('ok', false, 'error', 'Este inventario ya se cerró.'); end if;
  if s.status <> 'in_progress' or s.claimed_by is distinct from p_employee then
    return jsonb_build_object('ok', false, 'error', 'Esta letra la tiene otra persona. Vuelve a tomarla.');
  end if;

  pat := '^' || s.round_id::text || '/' || s.id::text || '/[0-9]{13}\.jpg$';
  if p_shelf_photo is null or p_shelf_photo !~ pat then
    return jsonb_build_object('ok', false, 'error', 'Falta la foto del estante.');
  end if;
  if coalesce(array_length(p_report_photos, 1), 0) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Falta la foto del reporte de Sicar.');
  end if;
  if array_length(p_report_photos, 1) > 12 then
    return jsonb_build_object('ok', false, 'error', 'Son demasiadas fotos del reporte (máximo 12).');
  end if;
  foreach ph in array p_report_photos loop
    if ph is null or ph !~ pat then return jsonb_build_object('ok', false, 'error', 'Una foto del reporte no es válida.'); end if;
  end loop;
  all_photos := array(select distinct x from unnest(array_append(p_report_photos, p_shelf_photo)) as x);
  select count(*) into found_n from storage.objects where bucket_id = 'inventario' and name = any(all_photos);
  if found_n <> array_length(all_photos, 1) then
    return jsonb_build_object('ok', false, 'error', 'Alguna foto no se terminó de subir. Vuelve a tomarla.');
  end if;

  if p_area_state is null or p_area_state not in ('bien', 'regular', 'mal') then
    return jsonb_build_object('ok', false, 'error', 'Elige cómo está el área.');
  end if;
  if p_area_state in ('regular', 'mal') and obs is null then
    return jsonb_build_object('ok', false, 'error', 'Escribe en observaciones por qué está ' || p_area_state || '.');
  end if;
  if p_had_differences is null then return jsonb_build_object('ok', false, 'error', 'Contesta si hubo diferencias.'); end if;
  if p_had_differences and p_differences_resolved is null then
    return jsonb_build_object('ok', false, 'error', 'Contesta si las diferencias quedaron solucionadas.');
  end if;
  open_pending := p_had_differences and not p_differences_resolved;
  if open_pending and pend is null then
    return jsonb_build_object('ok', false, 'error', 'Escribe qué falta por resolver.');
  end if;
  if p_minutes is not null and (p_minutes < 1 or p_minutes > 720) then
    return jsonb_build_object('ok', false, 'error', 'Revisa el tiempo: de 1 minuto a 12 horas.');
  end if;

  update inventory_sections set
    status = 'done', done_by = p_employee, done_at = now(),
    shelf_photo = p_shelf_photo, report_photos = p_report_photos,
    area_state = p_area_state, observations = obs, improvement = imp, action_taken = act,
    had_differences = p_had_differences,
    differences_resolved = case when p_had_differences then p_differences_resolved else null end,
    pending_note = case when open_pending then pend else null end,
    minutes_taken = p_minutes,
    redo_note = null, redo_requested_at = null
  where id = p_section;

  delete from inventory_pendings where section_id = p_section and resolved_at is null;
  if open_pending then
    insert into inventory_pendings (company_id, round_id, section_id, note, reported_by)
    values (s.company_id, s.round_id, s.id, pend, p_employee);
  end if;

  select count(*) into left_n from inventory_sections where round_id = s.round_id and status <> 'done';
  if left_n = 0 then
    update inventory_rounds set closed_at = now(), close_reason = 'completed' where id = s.round_id;
  end if;
  return jsonb_build_object('ok', true, 'roundClosed', left_n = 0);
end $$;

revoke all on function public.inv_finish_section(uuid, uuid, text, text[], text, text, text, text, boolean, boolean, text, int) from public;
grant execute on function public.inv_finish_section(uuid, uuid, text, text[], text, text, text, text, boolean, boolean, text, int) to anon, authenticated;

commit;
