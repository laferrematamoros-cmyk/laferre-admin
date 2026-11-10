-- Inventario por letra (docs/superpowers/specs/2026-11-09-inventario-por-letra-design.md).
-- Correr en el SQL Editor de Supabase ANTES de subir el panel. Se puede correr dos veces.
begin;

create table if not exists public.inventory_plans (
  company_id      uuid primary key references public.companies(id) on delete cascade,
  every_weeks     int  not null check (every_weeks between 1 and 52),
  first_open_date date not null,
  due_amount      int  not null check (due_amount between 1 and 60),
  due_unit        text not null check (due_unit in ('days','weeks')),
  is_active       boolean not null default true,
  updated_at      timestamptz not null default now()
);

create table if not exists public.inventory_letters (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  code        text not null check (char_length(code) between 1 and 6),
  name        text check (name is null or char_length(name) <= 60),
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (company_id, code)
);

create table if not exists public.inventory_rounds (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  scheduled_for date,
  opened_at     timestamptz not null default now(),
  due_at        timestamptz not null,
  closed_at     timestamptz,
  close_reason  text check (close_reason in ('completed','superseded')),
  notices       jsonb not null default '{}'::jsonb,
  opened_by     text not null default 'cron',
  unique (company_id, scheduled_for)
);
-- Nunca dos rondas abiertas en la misma empresa.
create unique index if not exists inventory_rounds_one_open
  on public.inventory_rounds (company_id) where closed_at is null;

create table if not exists public.inventory_sections (
  id                   uuid primary key default gen_random_uuid(),
  round_id             uuid not null references public.inventory_rounds(id) on delete cascade,
  company_id           uuid not null references public.companies(id) on delete cascade,
  letter_id            uuid references public.inventory_letters(id) on delete set null,
  code                 text not null,
  name                 text,
  sort_order           int  not null default 0,
  status               text not null default 'pending' check (status in ('pending','in_progress','done')),
  claimed_by           uuid references public.employees(id),
  claimed_at           timestamptz,
  done_by              uuid references public.employees(id),
  done_at              timestamptz,
  shelf_photo          text,
  report_photos        text[] not null default '{}',
  area_state           text check (area_state in ('bien','regular','mal')),
  observations         text,
  improvement          text,
  action_taken         text,
  had_differences      boolean,
  differences_resolved boolean,
  pending_note         text,
  redo_note            text,
  redo_requested_at    timestamptz,
  unique (round_id, letter_id)
);
create index if not exists inventory_sections_round on public.inventory_sections (round_id);
create index if not exists inventory_sections_done on public.inventory_sections (company_id, done_at);

create table if not exists public.inventory_pendings (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  round_id        uuid not null references public.inventory_rounds(id) on delete cascade,
  section_id      uuid not null references public.inventory_sections(id) on delete cascade,
  note            text not null,
  reported_by     uuid references public.employees(id),
  reported_at     timestamptz not null default now(),
  resolved_at     timestamptz,
  resolved_by     text,
  resolution_note text
);
create index if not exists inventory_pendings_open on public.inventory_pendings (company_id) where resolved_at is null;

-- ── Permisos: anon sólo LEE letras, rondas y fichas. Planes y pendientes, nada. ──
-- Explícitos: en proyectos nuevos las tablas no siempre quedan expuestas solas, y así
-- tampoco dependemos de los permisos por omisión.
revoke all on public.inventory_plans, public.inventory_letters, public.inventory_rounds,
              public.inventory_sections, public.inventory_pendings from anon, authenticated;
grant select on public.inventory_letters, public.inventory_rounds, public.inventory_sections to anon, authenticated;
grant all on public.inventory_plans, public.inventory_letters, public.inventory_rounds,
             public.inventory_sections, public.inventory_pendings to service_role;

alter table public.inventory_plans    enable row level security;
alter table public.inventory_letters  enable row level security;
alter table public.inventory_rounds   enable row level security;
alter table public.inventory_sections enable row level security;
alter table public.inventory_pendings enable row level security;

drop policy if exists "anon_select_inventory_letters"  on public.inventory_letters;
drop policy if exists "anon_select_inventory_rounds"   on public.inventory_rounds;
drop policy if exists "anon_select_inventory_sections" on public.inventory_sections;
create policy "anon_select_inventory_letters"  on public.inventory_letters  for select to anon using (true);
create policy "anon_select_inventory_rounds"   on public.inventory_rounds   for select to anon using (true);
create policy "anon_select_inventory_sections" on public.inventory_sections for select to anon using (true);

-- ── Tomar una letra ──
create or replace function public.inv_claim_section(p_section uuid, p_employee uuid, p_force boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s inventory_sections;
  r inventory_rounds;
  e_company uuid;
  who text;
begin
  select * into s from inventory_sections where id = p_section for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'No se encontró la letra.'); end if;
  select * into r from inventory_rounds where id = s.round_id;
  if r.closed_at is not null then return jsonb_build_object('ok', false, 'error', 'Este inventario ya se cerró.'); end if;
  select company_id into e_company from employees where id = p_employee and is_active;
  if e_company is null or e_company <> s.company_id then
    return jsonb_build_object('ok', false, 'error', 'Tu usuario no es de esta tienda.');
  end if;
  if s.status = 'done' then return jsonb_build_object('ok', false, 'error', 'Esta letra ya está hecha.'); end if;
  if s.status = 'in_progress' and s.claimed_by is distinct from p_employee and not coalesce(p_force, false) then
    select name into who from employees where id = s.claimed_by;
    return jsonb_build_object('ok', false, 'code', 'busy', 'by', coalesce(who, 'otra persona'),
                              'error', coalesce(who, 'Otra persona') || ' ya la empezó.');
  end if;
  update inventory_sections set status = 'in_progress', claimed_by = p_employee, claimed_at = now() where id = p_section;
  return jsonb_build_object('ok', true);
end $$;

-- ── Terminar una letra ──
create or replace function public.inv_finish_section(
  p_section uuid, p_employee uuid, p_shelf_photo text, p_report_photos text[],
  p_area_state text, p_observations text, p_improvement text, p_action_taken text,
  p_had_differences boolean, p_differences_resolved boolean, p_pending_note text)
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

  update inventory_sections set
    status = 'done', done_by = p_employee, done_at = now(),
    shelf_photo = p_shelf_photo, report_photos = p_report_photos,
    area_state = p_area_state, observations = obs, improvement = imp, action_taken = act,
    had_differences = p_had_differences,
    differences_resolved = case when p_had_differences then p_differences_resolved else null end,
    pending_note = case when open_pending then pend else null end,
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

revoke all on function public.inv_claim_section(uuid, uuid, boolean) from public;
revoke all on function public.inv_finish_section(uuid, uuid, text, text[], text, text, text, text, boolean, boolean, text) from public;
grant execute on function public.inv_claim_section(uuid, uuid, boolean) to anon, authenticated;
grant execute on function public.inv_finish_section(uuid, uuid, text, text[], text, text, text, text, boolean, boolean, text) to anon, authenticated;

-- ── Depósito de fotos del inventario (fuera de la limpieza de 21 días de "evidence") ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('inventario', 'inventario', true, 5242880, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg'];

drop policy if exists "inventario_anon_upload" on storage.objects;
create policy "inventario_anon_upload" on storage.objects for insert to anon with check (
  bucket_id = 'inventario'
  and exists (
    select 1 from public.inventory_sections s
    join public.inventory_rounds r on r.id = s.round_id
    where r.closed_at is null and s.status = 'in_progress'
      and storage.objects.name ~ ('^' || s.round_id::text || '/' || s.id::text || '/[0-9]{13}\.jpg$')
  )
);

commit;
)
  )
);

commit;
