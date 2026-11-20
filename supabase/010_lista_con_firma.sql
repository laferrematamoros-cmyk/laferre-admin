-- Lista con firma (primera: LIMPIEZA). Diseño: docs/superpowers/specs/2026-11-20-lista-con-firma-design.md
-- Pegar en Supabase → SQL Editor → Run. Se puede correr dos veces.
-- El teléfono sólo escribe con las funciones chk_* (SECURITY DEFINER); el panel firma, regresa y pone
-- el PIN con funciones que sólo puede llamar service_role.
begin;

create extension if not exists pgcrypto with schema extensions;

alter table public.activities add column if not exists checklist_enabled boolean not null default false;

-- ── Tareas de la lista (se archivan, no se borran: la bitácora vieja las sigue enseñando) ──
create table if not exists public.checklist_items (
  id          uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  area        text not null check (length(btrim(area)) between 1 and 60),
  label       text not null check (length(btrim(label)) between 1 and 120),
  days        int[] not null default '{1,2,3,4,5,6}' check (days <@ array[0,1,2,3,4,5,6] and cardinality(days) > 0),
  needs_photo boolean not null default false,
  sort        int not null default 0,
  archived_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists checklist_items_activity_idx on public.checklist_items (activity_id);

-- ── Rol semanal, por versiones: cambiar el orden no reescribe las semanas pasadas ──
-- Le toca a employee_ids[1] la semana de anchor_week (lunes), a [2] la siguiente, y se repite.
create table if not exists public.activity_rotations (
  id           uuid primary key default gen_random_uuid(),
  activity_id  uuid not null references public.activities(id) on delete cascade,
  employee_ids uuid[] not null check (cardinality(employee_ids) between 1 and 20),
  anchor_week  date not null check (extract(isodow from anchor_week) = 1),
  valid_from   date not null default ((now() at time zone 'America/Matamoros')::date),
  created_at   timestamptz not null default now()
);
create index if not exists activity_rotations_idx on public.activity_rotations (activity_id, valid_from desc);

-- ── Cambios: una semana (lun–dom) o un día (from = to). Gana el más reciente. ──
create table if not exists public.activity_duty_overrides (
  id          uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  from_date   date not null,
  to_date     date not null check (to_date >= from_date),
  employee_id uuid not null references public.employees(id),
  created_at  timestamptz not null default now()
);
create index if not exists activity_duty_overrides_idx on public.activity_duty_overrides (activity_id, from_date);

-- ── Una lista por actividad y día ──
create table if not exists public.checklist_runs (
  id             uuid primary key default gen_random_uuid(),
  activity_id    uuid not null references public.activities(id) on delete cascade,
  company_id     uuid not null references public.companies(id),
  scheduled_date date not null,
  employee_id    uuid not null references public.employees(id),
  status         text not null default 'in_progress'
                 check (status in ('in_progress', 'awaiting_signature', 'returned', 'signed')),
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  was_late       boolean,
  notified_at    timestamptz,
  signed_at      timestamptz,
  signed_by_name text,
  signed_via     text check (signed_via in ('pin', 'panel')),
  return_note    text,
  returned_at    timestamptz,
  completion_id  uuid references public.completions(id) on delete set null,
  unique (activity_id, scheduled_date)
);
create index if not exists checklist_runs_status_idx on public.checklist_runs (status, scheduled_date);

-- ── Palomitas: copia de la tarea al abrir la lista (renombrar después no cambia la bitácora) ──
create table if not exists public.checklist_marks (
  run_id      uuid not null references public.checklist_runs(id) on delete cascade,
  item_id     uuid not null references public.checklist_items(id),
  area        text not null,
  label       text not null,
  needs_photo boolean not null default false,
  sort        int not null default 0,
  state       text not null default 'pending' check (state in ('pending', 'done', 'skipped')),
  reason      text,
  photo_path  text,
  marked_by   uuid references public.employees(id),
  marked_at   timestamptz,
  primary key (run_id, item_id)
);

-- ── Quién firma (una sola configuración para las dos empresas). anon NO la puede leer. ──
create table if not exists public.signer_settings (
  id                  boolean primary key default true check (id),
  signer_name         text not null default 'Administrador',
  pin_hash            text,
  notify_emails       text[] not null default '{}',
  failed_pin_attempts int not null default 0,
  pin_locked_until    timestamptz,
  lock_notified       boolean not null default true,
  updated_at          timestamptz not null default now()
);
insert into public.signer_settings (id) values (true) on conflict (id) do nothing;

-- ── Permisos: anon sólo LEE (menos signer_settings). Escribe con las funciones. ──
revoke all on public.checklist_items, public.activity_rotations, public.activity_duty_overrides,
              public.checklist_runs, public.checklist_marks, public.signer_settings from anon, authenticated;
grant select on public.checklist_items, public.activity_rotations, public.activity_duty_overrides,
                public.checklist_runs, public.checklist_marks to anon, authenticated;
grant all on public.checklist_items, public.activity_rotations, public.activity_duty_overrides,
             public.checklist_runs, public.checklist_marks, public.signer_settings to service_role;

alter table public.checklist_items         enable row level security;
alter table public.activity_rotations      enable row level security;
alter table public.activity_duty_overrides enable row level security;
alter table public.checklist_runs          enable row level security;
alter table public.checklist_marks         enable row level security;
alter table public.signer_settings         enable row level security;

drop policy if exists "anon_select_checklist_items" on public.checklist_items;
drop policy if exists "anon_select_activity_rotations" on public.activity_rotations;
drop policy if exists "anon_select_activity_duty_overrides" on public.activity_duty_overrides;
drop policy if exists "anon_select_checklist_runs" on public.checklist_runs;
drop policy if exists "anon_select_checklist_marks" on public.checklist_marks;
create policy "anon_select_checklist_items" on public.checklist_items for select to anon using (true);
create policy "anon_select_activity_rotations" on public.activity_rotations for select to anon using (true);
create policy "anon_select_activity_duty_overrides" on public.activity_duty_overrides for select to anon using (true);
create policy "anon_select_checklist_runs" on public.checklist_runs for select to anon using (true);
create policy "anon_select_checklist_marks" on public.checklist_marks for select to anon using (true);

-- ── A quién le toca una actividad un día (null = nadie / sin rol) ──
create or replace function public.duty_employee(p_activity uuid, p_date date)
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select o.employee_id from activity_duty_overrides o
      where o.activity_id = p_activity and p_date between o.from_date and o.to_date
      order by o.created_at desc limit 1),
    (select r.employee_ids[1 + ((floor((p_date - r.anchor_week)::numeric / 7)::int % cardinality(r.employee_ids))
                               + cardinality(r.employee_ids)) % cardinality(r.employee_ids)]
       from activity_rotations r
      where r.activity_id = p_activity and r.valid_from <= p_date
      order by r.valid_from desc, r.created_at desc limit 1)
  );
$$;

-- ── Lo de hoy para la pantalla de Inicio del teléfono ──
create or replace function public.chk_today(p_company uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare d date := (now() at time zone 'America/Matamoros')::date;
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'activity_id', a.id,
      'duty_id', duty_employee(a.id, d),
      'duty_name', (select e.name from employees e where e.id = duty_employee(a.id, d)),
      'run_id', r.id,
      'status', r.status,
      'run_employee', r.employee_id,
      'return_note', r.return_note,
      'done', (select count(*) from checklist_marks m where m.run_id = r.id and m.state <> 'pending'),
      'total', case when r.id is null
                 then (select count(*) from checklist_items i where i.activity_id = a.id and i.archived_at is null
                          and extract(dow from d)::int = any(i.days))
                 else (select count(*) from checklist_marks m where m.run_id = r.id) end))
    from activities a
    left join checklist_runs r on r.activity_id = a.id and r.scheduled_date = d
    where a.company_id = p_company and a.checklist_enabled and a.is_active and a.archived_at is null
      and extract(dow from d)::int = any(a.days_of_week)
  ), '[]'::jsonb);
end $$;

-- ── Abrir (o crear) la lista de hoy ──
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
    insert into checklist_marks (run_id, item_id, area, label, needs_photo, sort)
    select run.id, i.id, i.area, i.label, i.needs_photo, i.sort
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
                'sort', m.sort, 'state', m.state, 'reason', m.reason, 'photo_path', m.photo_path)
              order by m.sort, m.label) from checklist_marks m where m.run_id = run.id), '[]'::jsonb));
end $$;

-- ── Palomear / "No se pudo" / deshacer una tarea ──
create or replace function public.chk_mark(p_run uuid, p_item uuid, p_employee uuid, p_state text, p_reason text, p_photo text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  run checklist_runs;
  m checklist_marks;
  why text := nullif(btrim(left(coalesce(p_reason, ''), 300)), '');
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
    if p_photo is null or p_photo !~ ('^' || run.id::text || '/' || p_item::text || '/[0-9]{13}\.jpg$') then
      return jsonb_build_object('ok', false, 'error', 'Falta la foto.');
    end if;
    if not exists (select 1 from storage.objects where bucket_id = 'listas' and name = p_photo) then
      return jsonb_build_object('ok', false, 'error', 'La foto no se terminó de subir. Tómala otra vez.');
    end if;
  end if;
  update checklist_marks set
    state = p_state,
    reason = case when p_state = 'skipped' then why else null end,
    photo_path = case when p_state = 'done' and m.needs_photo then p_photo else null end,
    marked_by = case when p_state = 'pending' then null else p_employee end,
    marked_at = case when p_state = 'pending' then null else now() end
  where run_id = p_run and item_id = p_item;
  return jsonb_build_object('ok', true);
end $$;

-- ── "Terminé" ──
create or replace function public.chk_finish(p_run uuid, p_employee uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  run checklist_runs;
  lim time;
begin
  select * into run from checklist_runs where id = p_run for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'No se encontró la lista.'); end if;
  if run.employee_id <> p_employee then return jsonb_build_object('ok', false, 'error', 'Esta lista es de otra persona.'); end if;
  if run.status not in ('in_progress', 'returned') then
    return jsonb_build_object('ok', false, 'error', 'Esta lista ya se entregó.');
  end if;
  if exists (select 1 from checklist_marks where run_id = p_run and state = 'pending') then
    return jsonb_build_object('ok', false, 'error', 'Faltan tareas por palomear.');
  end if;
  select limit_time into lim from activities where id = run.activity_id;
  update checklist_runs set
    status = 'awaiting_signature',
    finished_at = now(),
    was_late = now() > ((run.scheduled_date + lim) at time zone 'America/Matamoros'),
    notified_at = null
  where id = p_run;
  return jsonb_build_object('ok', true);
end $$;

-- ── Firmar (interna: crea la fila de completions). Sólo la llaman chk_sign_pin y chk_sign_panel. ──
create or replace function public.chk_sign_internal(p_run uuid, p_name text, p_via text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  run checklist_runs;
  cid uuid;
begin
  select * into run from checklist_runs where id = p_run for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'No se encontró la lista.'); end if;
  if run.status = 'signed' then return jsonb_build_object('ok', false, 'error', 'Esta lista ya está firmada.'); end if;
  if run.status <> 'awaiting_signature' then return jsonb_build_object('ok', false, 'error', 'Todavía no la terminan.'); end if;
  select id into cid from completions where activity_id = run.activity_id and scheduled_date = run.scheduled_date limit 1;
  if cid is null then
    perform set_config('lf.chk_sign', 'on', true);
    insert into completions (activity_id, employee_id, scheduled_date, completed_at, was_late)
    values (run.activity_id, run.employee_id, run.scheduled_date, run.finished_at, coalesce(run.was_late, false))
    returning id into cid;
    perform set_config('lf.chk_sign', 'off', true);
  end if;
  update checklist_runs set status = 'signed', signed_at = now(), signed_by_name = p_name, signed_via = p_via, completion_id = cid
  where id = p_run;
  return jsonb_build_object('ok', true);
end $$;

-- ── Firmar en persona con PIN (teléfono). 5 equivocados → 15 min bloqueado + correo. ──
create or replace function public.chk_sign_pin(p_run uuid, p_pin text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s signer_settings;
  st text;
  n int;
begin
  select status into st from checklist_runs where id = p_run;
  if st is null then return jsonb_build_object('ok', false, 'error', 'No se encontró la lista.'); end if;
  if st <> 'awaiting_signature' then
    return jsonb_build_object('ok', false, 'error', case when st = 'signed' then 'Esta lista ya está firmada.' else 'Todavía no la terminan.' end);
  end if;
  select * into s from signer_settings where id for update;
  if s.pin_hash is null then
    return jsonb_build_object('ok', false, 'error', 'Todavía no hay PIN. Créalo en el panel → Ajustes.');
  end if;
  if s.pin_locked_until is not null and s.pin_locked_until > now() then
    return jsonb_build_object('ok', false, 'code', 'locked', 'error',
      'Demasiados intentos. Espera ' || ceil(extract(epoch from s.pin_locked_until - now()) / 60)::int || ' min o firma desde el panel.');
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{4,6}$' or extensions.crypt(p_pin, s.pin_hash) <> s.pin_hash then
    n := s.failed_pin_attempts + 1;
    if n >= 5 then
      update signer_settings set failed_pin_attempts = 0, pin_locked_until = now() + interval '15 minutes', lock_notified = false where id;
      return jsonb_build_object('ok', false, 'code', 'locked', 'error', 'PIN equivocado. Se bloqueó 15 minutos.');
    end if;
    update signer_settings set failed_pin_attempts = n where id;
    return jsonb_build_object('ok', false, 'code', 'bad_pin', 'error',
      'PIN equivocado. Te quedan ' || (5 - n) || case when 5 - n = 1 then ' intento.' else ' intentos.' end);
  end if;
  update signer_settings set failed_pin_attempts = 0 where id;
  return chk_sign_internal(p_run, s.signer_name, 'pin');
end $$;

-- ── Firmar desde el panel (service_role; el panel ya revisó que sea admin) ──
create or replace function public.chk_sign_panel(p_run uuid, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  return chk_sign_internal(p_run, coalesce(nullif(btrim(p_name), ''), (select signer_name from signer_settings where id)), 'panel');
end $$;

-- ── Regresar (service_role): reabre sólo las tareas elegidas ──
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
  update checklist_marks set state = 'pending', reason = null, photo_path = null, marked_by = null, marked_at = null
   where run_id = p_run and item_id = any(p_items);
  get diagnostics n = row_count;
  if n = 0 then return jsonb_build_object('ok', false, 'error', 'Esas tareas no son de esta lista.'); end if;
  update checklist_runs set status = 'returned', return_note = note, returned_at = now(),
    finished_at = null, was_late = null, notified_at = null
  where id = p_run;
  return jsonb_build_object('ok', true, 'employee_id', run.employee_id);
end $$;

-- ── Poner / cambiar el PIN (service_role) ──
create or replace function public.chk_set_pin(p_pin text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if p_pin is null or p_pin !~ '^[0-9]{4,6}$' then
    return jsonb_build_object('ok', false, 'error', 'El PIN debe ser de 4 a 6 números.');
  end if;
  update signer_settings set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf')),
    failed_pin_attempts = 0, pin_locked_until = null, lock_notified = true, updated_at = now()
  where id;
  return jsonb_build_object('ok', true);
end $$;

-- ── Fotos viejas del depósito (service_role, para /api/cleanup) ──
create or replace function public.chk_old_photos(p_days int default 21)
returns setof text language sql stable security definer set search_path = public, storage as $$
  select name from storage.objects
   where bucket_id = 'listas' and created_at < now() - make_interval(days => p_days)
   order by created_at limit 1000;
$$;

revoke all on function public.duty_employee(uuid, date) from public;
revoke all on function public.chk_today(uuid) from public;
revoke all on function public.chk_open(uuid, uuid) from public;
revoke all on function public.chk_mark(uuid, uuid, uuid, text, text, text) from public;
revoke all on function public.chk_finish(uuid, uuid) from public;
revoke all on function public.chk_sign_internal(uuid, text, text) from public, anon, authenticated;
revoke all on function public.chk_sign_pin(uuid, text) from public;
revoke all on function public.chk_sign_panel(uuid, text) from public, anon, authenticated;
revoke all on function public.chk_return(uuid, uuid[], text) from public, anon, authenticated;
revoke all on function public.chk_set_pin(text) from public, anon, authenticated;
revoke all on function public.chk_old_photos(int) from public, anon, authenticated;
grant execute on function public.duty_employee(uuid, date) to anon, authenticated, service_role;
grant execute on function public.chk_today(uuid) to anon, authenticated;
grant execute on function public.chk_open(uuid, uuid) to anon, authenticated;
grant execute on function public.chk_mark(uuid, uuid, uuid, text, text, text) to anon, authenticated;
grant execute on function public.chk_finish(uuid, uuid) to anon, authenticated;
grant execute on function public.chk_sign_pin(uuid, text) to anon, authenticated;
grant execute on function public.chk_sign_panel(uuid, text) to service_role;
grant execute on function public.chk_return(uuid, uuid[], text) to service_role;
grant execute on function public.chk_set_pin(text) to service_role;
grant execute on function public.chk_old_photos(int) to service_role;

-- ── Candado: una actividad con lista sólo se da por hecha al firmar (frena a los teléfonos sin actualizar) ──
create or replace function public.chk_block_direct_completion()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('lf.chk_sign', true), '') <> 'on'
     and exists (select 1 from activities where id = new.activity_id and checklist_enabled) then
    raise exception 'Esta actividad ahora se hace con la lista. Actualiza la app.' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists chk_block_direct_completion on public.completions;
create trigger chk_block_direct_completion before insert on public.completions
  for each row execute function public.chk_block_direct_completion();

-- ── Depósito de fotos: PRIVADO; el panel usa enlaces firmados. ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listas', 'listas', false, 5242880, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg'];

drop policy if exists "listas_anon_upload" on storage.objects;
create policy "listas_anon_upload" on storage.objects for insert to anon with check (
  bucket_id = 'listas'
  and exists (
    select 1 from public.checklist_marks m
    join public.checklist_runs r on r.id = m.run_id
    where r.status in ('in_progress', 'returned') and m.needs_photo
      and storage.objects.name ~ ('^' || r.id::text || '/' || m.item_id::text || '/[0-9]{13}\.jpg$')
  )
);

-- ── LIMPIEZA de La Ferre: la hoja de papel y el rol (Eddie → Laura → Yajaira; Eddie la semana del 16 nov 2026).
--    NO prende la lista: eso se hace en el panel cuando todo esté listo. ──
do $$
declare act uuid;
begin
  select id into act from activities
   where company_id = 'a6798a18-9565-4f2b-929a-0c6771e7ef54' and upper(btrim(title)) = 'LIMPIEZA' and archived_at is null
   order by created_at limit 1;
  if act is null then return; end if;
  if not exists (select 1 from checklist_items where activity_id = act) then
    insert into checklist_items (activity_id, area, label, days, sort) values
      (act, 'Baño', 'Limpiar retrete', '{2,4,6}', 10),
      (act, 'Baño', 'Limpiar lavabo', '{2,4,6}', 20),
      (act, 'Baño', 'Limpiar rack(s)', '{2,4,6}', 30),
      (act, 'Mostrador y tienda', 'Barrer en general', '{1,2,3,4,5,6}', 110),
      (act, 'Mostrador y tienda', 'Trapear en general', '{2,5}', 120),
      (act, 'Mostrador y tienda', 'Limpiar mostradores', '{1,2,3,4,5,6}', 130),
      (act, 'Mostrador y tienda', 'Limpiar muestrario de lavabo y fregadero', '{1}', 140),
      (act, 'Mostrador y tienda', 'Vaciar cestos de basura', '{2,4,6}', 150),
      (act, 'Mostrador y tienda', 'Limpiar puertas y ventanas', '{3}', 160),
      (act, 'Mostrador y tienda', 'Barrer estacionamiento', '{1,4}', 170),
      (act, 'Cocina / Comedor', 'Rellenar atomizadores', '{1}', 210),
      (act, 'Cocina / Comedor', 'Rellenar dispensadores de jabón', '{1}', 220),
      (act, 'Cocina / Comedor', 'Lavar trastes', '{1,2,3,4,5,6}', 230),
      (act, 'Cocina / Comedor', 'Limpiar comedor', '{1,2,3,4,5,6}', 240),
      (act, 'Cocina / Comedor', 'Rellenar humificador', '{1}', 250),
      (act, 'Cocina / Comedor', 'Lavar fregadero', '{1,2,3,4,5,6}', 260),
      (act, 'Cocina / Comedor', 'Limpiar microondas', '{5}', 270),
      (act, 'Cocina / Comedor', 'Limpiar refrigerador', '{5}', 280);
  end if;
  if not exists (select 1 from activity_rotations where activity_id = act) then
    insert into activity_rotations (activity_id, employee_ids, anchor_week)
    values (act, array['ce1c69d4-c909-419b-928a-d4ca1442755c', '0ddf2629-36b8-4aa1-b769-39d45740bb43',
                       'c3334c82-4fa4-4668-ad0a-2265b1f89ebf']::uuid[], date '2026-11-16');
  end if;
end $$;

commit;

-- Comprobación: debe salir LIMPIEZA con 18 tareas y su rol.
select a.title, (select count(*) from checklist_items i where i.activity_id = a.id) as tareas,
       (select count(*) from activity_rotations r where r.activity_id = a.id) as roles
  from activities a where a.company_id = 'a6798a18-9565-4f2b-929a-0c6771e7ef54' and upper(btrim(a.title)) = 'LIMPIEZA';
