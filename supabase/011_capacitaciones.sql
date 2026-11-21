-- Capacitaciones. Diseño: docs/superpowers/specs/2026-11-21-capacitaciones-design.md
-- Pegar en Supabase → SQL Editor → Run. Se puede correr dos veces.
-- Las tablas NO se leen con la llave pública: el teléfono usa cap_list / cap_open / cap_answer
-- (SECURITY DEFINER) y el panel usa la llave de servicio. Las 13 capacitaciones las da de alta
-- el panel desde su catálogo (lib/capacitaciones/catalog.ts), pausadas.
begin;

create table if not exists public.trainings (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9-]{1,40}$'),
  title         text not null check (length(btrim(title)) between 1 and 80),
  sort_order    int  not null default 0,
  is_active     boolean not null default false,
  deadline_days int  not null default 7  check (deadline_days between 1 and 60),
  min_seconds   int  not null default 30 check (min_seconds between 5 and 600),
  version       int  not null default 1  check (version >= 1),
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.training_sessions (
  id          uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  version     int  not null,
  source      text not null default 'app' check (source in ('app', 'panel')),
  opened_at   timestamptz not null default now(),
  answered_at timestamptz
);
create index if not exists training_sessions_who_idx on public.training_sessions (employee_id, opened_at);
-- Una copia anterior de este archivo lo creó sin opened_at: se borra y se vuelve a crear con las 4 columnas.
drop index if exists public.training_sessions_tev_idx;
create index if not exists training_sessions_tev_idx on public.training_sessions (training_id, employee_id, version, opened_at);

create table if not exists public.training_progress (
  id          uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  version     int  not null,
  status      text not null check (status in ('understood', 'doubt', 'trained')),
  doubt_note  text check (doubt_note is null or length(doubt_note) <= 500),
  answered_at timestamptz not null default now(),
  trained_at  timestamptz,
  trained_by  text,
  unique (training_id, employee_id, version)
);

create table if not exists public.training_notices (
  training_id uuid not null references public.trainings(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  version     int  not null,
  kind        text not null check (kind in ('new', 'due_soon')),
  sent_at     timestamptz not null default now(),
  primary key (training_id, employee_id, version, kind)
);

-- ── Permisos: anon no toca las tablas; todo pasa por las funciones ──
revoke all on public.trainings, public.training_sessions, public.training_progress, public.training_notices
  from anon, authenticated;
grant all on public.trainings, public.training_sessions, public.training_progress, public.training_notices
  to service_role;
alter table public.trainings         enable row level security;
alter table public.training_sessions enable row level security;
alter table public.training_progress enable row level security;
alter table public.training_notices  enable row level security;

-- ── Al activarla (o subirle la versión estando activa) arranca el plazo ──
create or replace function public.trainings_publish()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    if new.is_active then new.published_at := now(); end if;
  elsif new.is_active and (not old.is_active or new.version > old.version) then
    new.published_at := now();
    -- Reactivarla es empezar de cero: el plazo vuelve a contar desde hoy, así que se borran los
    -- avisos ya apartados de esta versión para que "nueva" y "por vencer" se manden otra vez con
    -- el plazo nuevo. Al subir la versión no hace falta: los avisos se apartan por versión.
    if not old.is_active then
      delete from training_notices where training_id = new.id and version = new.version;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trainings_publish on public.trainings;
create trigger trainings_publish before insert or update on public.trainings
  for each row execute function public.trainings_publish();

-- Plazo: inicio del día siguiente a (fecha base en Matamoros + días), en hora de Matamoros.
create or replace function public.cap_deadline(p_base timestamptz, p_days int)
returns timestamptz language sql stable set search_path = public as $$
  select ((((p_base at time zone 'America/Matamoros')::date + p_days + 1))::timestamp) at time zone 'America/Matamoros'
$$;

-- Una fila por empleado activo × capacitación activa (versión actual). Toda la regla de estados vive aquí.
create or replace function public.cap_rows(p_now timestamptz default now())
returns table (
  employee_id uuid, employee_name text, company_id uuid,
  training_id uuid, slug text, title text, sort_order int, version int,
  status text, deadline timestamptz, answered_at timestamptz, doubt_note text,
  trained_at timestamptz, trained_by text, views int)
language sql stable security definer set search_path = public as $$
  select e.id, e.name, e.company_id,
         t.id, t.slug, t.title, t.sort_order, t.version,
         case when p.status is not null then p.status
              when p_now >= cap_deadline(greatest(t.published_at, e.created_at), t.deadline_days) then 'overdue'
              else 'pending' end,
         cap_deadline(greatest(t.published_at, e.created_at), t.deadline_days),
         p.answered_at, p.doubt_note, p.trained_at, p.trained_by,
         (select count(*)::int from training_sessions s
           where s.training_id = t.id and s.employee_id = e.id and s.version = t.version)
    from trainings t
    cross join employees e
    left join training_progress p
      on p.training_id = t.id and p.employee_id = e.id and p.version = t.version
   where t.is_active and e.is_active
$$;

-- Teléfono y practicante: lo de UNA persona.
create or replace function public.cap_list(p_employee uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', r.training_id, 'slug', r.slug, 'title', r.title, 'sort_order', r.sort_order,
           'version', r.version, 'status', r.status, 'deadline', r.deadline, 'answered_at', r.answered_at)
           order by r.sort_order, r.title), '[]'::jsonb)
    from cap_rows(now()) r
   where r.employee_id = p_employee
$$;

-- Interna: abre una capacitación con el origen que le pasen y crea la sesión (es el ?s= del enlace).
-- Nadie la llama directo: el teléfono usa cap_open ('app') y el panel cap_open_panel ('panel').
create or replace function public.cap_open_as(p_training uuid, p_employee uuid, p_source text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  t   trainings;
  sid uuid;
  n   int;
begin
  if p_source is null or p_source not in ('app', 'panel') then
    return jsonb_build_object('ok', false, 'error', 'Origen no válido.');
  end if;
  select * into t from trainings where id = p_training;
  if not found or not t.is_active then
    return jsonb_build_object('ok', false, 'error', 'Esta capacitación está en pausa.');
  end if;
  if not exists (select 1 from employees where id = p_employee and is_active) then
    return jsonb_build_object('ok', false, 'error', 'Tu nombre no está activo. Pídele ayuda al Ing.');
  end if;
  -- Freno: si esta persona ya abrió ESTA capacitación (misma versión y mismo origen) 20 veces en la
  -- última hora, no se crea otra sesión: se regresa la más reciente de esas 20. Nunca se rechaza
  -- (así nadie puede dejar a otro sin ver su capacitación abriéndola muchas veces a su nombre) y
  -- nunca se regresa una sesión de otro origen (una del panel no le llega a la llave pública).
  select count(*) into n from training_sessions
   where training_id = t.id and employee_id = p_employee and version = t.version
     and source = p_source and opened_at > now() - interval '1 hour';
  if n >= 20 then
    select id into sid from training_sessions
     where training_id = t.id and employee_id = p_employee and version = t.version
       and source = p_source and opened_at > now() - interval '1 hour'
     order by opened_at desc
     limit 1;
    return jsonb_build_object('ok', true, 'session', sid, 'slug', t.slug, 'reused', true);
  end if;
  insert into training_sessions (training_id, employee_id, version, source)
  values (t.id, p_employee, t.version, p_source) returning id into sid;
  return jsonb_build_object('ok', true, 'session', sid, 'slug', t.slug);
end $$;

-- Teléfono (anon): abre una capacitación. Siempre es origen 'app': la llave pública no puede decir 'panel'.
-- Una copia anterior de este archivo tenía cap_open con un tercer parámetro (el origen): se quita.
drop function if exists public.cap_open(uuid, uuid, text);
create or replace function public.cap_open(p_training uuid, p_employee uuid)
returns jsonb language sql security definer set search_path = public as $$
  select cap_open_as(p_training, p_employee, 'app')
$$;

-- Panel (service_role): la practicante abre una capacitación desde el panel.
create or replace function public.cap_open_panel(p_training uuid, p_employee uuid)
returns jsonb language sql security definer set search_path = public as $$
  select cap_open_as(p_training, p_employee, 'panel')
$$;

-- Contesta: 'understood' (Entendí) o 'doubt' (que el Ing. me la explique).
create or replace function public.cap_answer(p_session uuid, p_answer text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s      training_sessions;
  t      trainings;
  cur    training_progress;
  left_s int;
  note   text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if p_answer is null or p_answer not in ('understood', 'doubt') then
    return jsonb_build_object('ok', false, 'code', 'answer', 'error', 'Respuesta no válida.');
  end if;
  select * into s from training_sessions where id = p_session for update;
  if not found or s.opened_at < now() - interval '12 hours' then
    return jsonb_build_object('ok', false, 'code', 'expired', 'error', 'Este enlace ya no sirve. Ábrela otra vez desde la app.');
  end if;
  select * into t from trainings where id = s.training_id;
  if not t.is_active then
    return jsonb_build_object('ok', false, 'code', 'paused', 'error', 'Esta capacitación está en pausa.');
  end if;
  if t.version <> s.version then
    return jsonb_build_object('ok', false, 'code', 'version', 'error', 'Esta capacitación se actualizó. Ábrela otra vez desde la app.');
  end if;
  if not exists (select 1 from employees where id = s.employee_id and is_active) then
    return jsonb_build_object('ok', false, 'code', 'employee', 'error', 'Tu nombre no está activo. Pídele ayuda al Ing.');
  end if;
  if p_answer = 'understood' then
    left_s := ceil(t.min_seconds - extract(epoch from (now() - s.opened_at)))::int;
    if left_s > 0 then
      return jsonb_build_object('ok', false, 'code', 'too_soon', 'seconds_left', left_s,
                                'error', format('Todavía no termina; faltan %s segundos.', left_s));
    end if;
  end if;
  if note is not null and length(note) > 500 then
    return jsonb_build_object('ok', false, 'code', 'note', 'error', 'La nota es muy larga (máximo 500 letras).');
  end if;

  select * into cur from training_progress
   where training_id = t.id and employee_id = s.employee_id and version = t.version for update;
  if found and cur.status = 'trained' then
    update training_sessions set answered_at = coalesce(answered_at, now()) where id = s.id;
    return jsonb_build_object('ok', true, 'already', true, 'status', 'trained');
  end if;

  insert into training_progress (training_id, employee_id, version, status, doubt_note, answered_at)
  values (t.id, s.employee_id, t.version, p_answer, case when p_answer = 'doubt' then note end, now())
  on conflict (training_id, employee_id, version) do update
     set status = excluded.status, doubt_note = excluded.doubt_note, answered_at = excluded.answered_at
   where training_progress.status <> 'trained';
  update training_sessions set answered_at = now() where id = s.id;
  return jsonb_build_object('ok', true, 'status', p_answer);
end $$;

-- Panel (service_role): tabla de avance.
create or replace function public.cap_matrix()
returns table (
  employee_id uuid, employee_name text, company_id uuid,
  training_id uuid, slug text, title text, sort_order int, version int,
  status text, deadline timestamptz, answered_at timestamptz, doubt_note text,
  trained_at timestamptz, trained_by text, views int)
language sql stable security definer set search_path = public as $$
  select * from cap_rows(now())
$$;

-- Panel (service_role): cuántas dudas esperan al Ing. en una empresa (el numerito del menú),
-- sin bajar la tabla completa de cap_matrix.
create or replace function public.cap_doubt_count(p_company uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from cap_rows(now()) r
   where r.company_id = p_company and r.status = 'doubt'
$$;

-- Panel (service_role): "Ya lo capacité".
create or replace function public.cap_mark_trained(p_training uuid, p_employee uuid, p_by text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update training_progress p
     set status = 'trained', trained_at = now(),
         trained_by = left(coalesce(nullif(btrim(p_by), ''), 'Admin'), 80)
    from trainings t
   where t.id = p_training and p.training_id = t.id and p.employee_id = p_employee
     and p.version = t.version and p.status = 'doubt';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Esa duda ya no está abierta.');
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- Cron (service_role): aparta los avisos que tocan y regresa SÓLO los que apartó en esta llamada.
create or replace function public.cap_claim_notices(p_now timestamptz default now())
returns table (employee_id uuid, employee_name text, company_id uuid, training_id uuid,
               title text, kind text, deadline timestamptz)
language sql security definer set search_path = public as $$
  with cand as (
    select r.employee_id, r.employee_name, r.company_id, r.training_id, r.title, r.version, r.deadline, k.kind
      from cap_rows(p_now) r
      cross join (values ('new'::text), ('due_soon'::text)) as k(kind)
     -- "nueva": a quien no ha contestado, aunque ya esté atrasada (p. ej. un empleado reactivado);
     -- "por vencer": sólo a quien sigue a tiempo y le quedan 48 h o menos.
     where (k.kind = 'new' and r.status in ('pending', 'overdue'))
        or (k.kind = 'due_soon' and r.status = 'pending' and r.deadline - p_now <= interval '48 hours')
  ), ins as (
    insert into training_notices (training_id, employee_id, version, kind, sent_at)
    select c.training_id, c.employee_id, c.version, c.kind, p_now from cand c
    on conflict do nothing
    returning training_notices.training_id, training_notices.employee_id, training_notices.kind
  )
  select c.employee_id, c.employee_name, c.company_id, c.training_id, c.title, c.kind, c.deadline
    from ins i
    join cand c on c.training_id = i.training_id and c.employee_id = i.employee_id and c.kind = i.kind
$$;

revoke all on function public.trainings_publish() from public, anon, authenticated;
revoke all on function public.cap_deadline(timestamptz, int) from public, anon, authenticated;
revoke all on function public.cap_rows(timestamptz) from public, anon, authenticated;
revoke all on function public.cap_list(uuid) from public;
revoke all on function public.cap_open_as(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.cap_open(uuid, uuid) from public;
revoke all on function public.cap_open_panel(uuid, uuid) from public, anon, authenticated;
revoke all on function public.cap_answer(uuid, text, text) from public;
revoke all on function public.cap_matrix() from public, anon, authenticated;
revoke all on function public.cap_doubt_count(uuid) from public, anon, authenticated;
revoke all on function public.cap_mark_trained(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.cap_claim_notices(timestamptz) from public, anon, authenticated;
grant execute on function public.cap_deadline(timestamptz, int) to service_role;
grant execute on function public.cap_list(uuid) to anon, authenticated, service_role;
grant execute on function public.cap_open(uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.cap_open_panel(uuid, uuid) to service_role;
grant execute on function public.cap_answer(uuid, text, text) to anon, authenticated, service_role;
grant execute on function public.cap_matrix() to service_role;
grant execute on function public.cap_doubt_count(uuid) to service_role;
grant execute on function public.cap_mark_trained(uuid, uuid, text) to service_role;
grant execute on function public.cap_claim_notices(timestamptz) to service_role;

commit;

-- Comprobación: deben salir las 4 tablas.
select table_name from information_schema.tables
 where table_schema = 'public' and table_name like 'training%' order by 1;
