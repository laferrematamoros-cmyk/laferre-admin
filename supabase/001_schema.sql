-- ══════════════════════════════════════════════
--  LA FERRE ACTIVIDADES — Schema inicial
--  Pega este SQL en Supabase → SQL Editor → Run
-- ══════════════════════════════════════════════

-- 1. Empleados
create table if not exists employees (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  role       text not null,
  initials   text not null,
  color      text not null default '#6E6E73',
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Actividades
create table if not exists activities (
  id                    uuid primary key default gen_random_uuid(),
  title                 text not null,
  description           text,
  start_time            time not null,
  limit_time            time not null,
  recurrence            text not null default 'once',
  -- 0=Dom 1=Lun 2=Mar 3=Mié 4=Jue 5=Vie 6=Sáb
  days_of_week          int[] not null default '{1,2,3,4,5}',
  -- vacío = actividad general (cualquiera puede realizarla)
  assigned_employee_ids uuid[] not null default '{}',
  is_urgent             boolean not null default false,
  reminder_minutes      int not null default 10,
  evidence_photo        boolean not null default true,
  evidence_name         boolean not null default true,
  evidence_note         boolean not null default false,
  evidence_signature    boolean not null default false,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now()
);

-- 3. Confirmaciones
create table if not exists completions (
  id             uuid primary key default gen_random_uuid(),
  activity_id    uuid not null references activities(id) on delete cascade,
  employee_id    uuid not null references employees(id),
  completed_at   timestamptz not null default now(),
  scheduled_date date not null default current_date,
  photo_url      text,
  note           text,
  was_late       boolean not null default false,
  created_at     timestamptz not null default now()
);

-- ── Índices ──────────────────────────────────
create index if not exists completions_date_idx
  on completions (scheduled_date, activity_id);

-- ── Row Level Security ────────────────────────
alter table employees  enable row level security;
alter table activities enable row level security;
alter table completions enable row level security;

-- Lecturas públicas (anon key del dispositivo del empleado)
create policy "employees_select"   on employees  for select using (true);
create policy "activities_select"  on activities for select using (true);
create policy "completions_select" on completions for select using (true);

-- El empleado inserta sus propias confirmaciones
create policy "completions_insert" on completions for insert with check (true);

-- El panel admin crea/edita actividades
create policy "activities_insert" on activities for insert with check (true);
create policy "activities_update" on activities for update using (true);

-- Solo el admin (service role) puede crear/editar actividades y empleados
-- (Se controla desde el panel Next.js con SUPABASE_SERVICE_ROLE_KEY)

-- ── Storage: bucket de evidencias ────────────
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', true)
on conflict do nothing;

create policy "evidence_read"
  on storage.objects for select
  using (bucket_id = 'evidence');

create policy "evidence_insert"
  on storage.objects for insert
  with check (bucket_id = 'evidence');

-- ── Datos iniciales ───────────────────────────
insert into employees (name, role, initials, color) values
  ('Carlos M.', 'Mostrador', 'CM', '#E11D2E'),
  ('Lupita R.', 'Caja',      'LR', '#0F0F10'),
  ('Miguel T.', 'Almacén',   'MT', '#6E6E73'),
  ('Andrea S.', 'Mostrador', 'AS', '#B8121F'),
  ('Pedro G.',  'Almacén',   'PG', '#3A3A3D')
on conflict do nothing;

-- Actividades de ejemplo (Lun-Vie)
with emp as (select id, name from employees)
insert into activities
  (title, description, start_time, limit_time, recurrence, days_of_week,
   assigned_employee_ids, is_urgent, reminder_minutes)
values
  ('Acomodar pasillo de tornillería',
   'Organizar y acomodar el pasillo completo.',
   '09:00', '10:00', 'mon-fri', '{1,2,3,4,5}',
   array[(select id from emp where name='Carlos M.')], false, 10),

  ('Limpiar mostrador principal',
   'Limpiar y desinfectar el mostrador.',
   '10:00', '10:30', 'mon-fri', '{1,2,3,4,5}',
   array[(select id from emp where name='Lupita R.')], false, 10),

  ('Inventario de pintura',
   'Contar y registrar inventario de pinturas.',
   '11:00', '12:30', 'mon-fri', '{1,2,3,4,5}',
   array[(select id from emp where name='Miguel T.')], false, 10),

  ('Reabastecer herramienta eléctrica',
   'Revisar y reabastecer la sección de herramienta eléctrica.',
   '13:00', '14:00', 'mon-fri', '{1,2,3,4,5}',
   array[(select id from emp where name='Pedro G.')], true, 10),

  -- Actividad GENERAL (cualquiera puede hacerla)
  ('Barrer entrada y banqueta', null,
   '14:30', '15:00', 'daily', '{0,1,2,3,4,5,6}',
   '{}', false, 5),

  ('Cierre de caja y arqueo', null,
   '19:30', '20:00', 'mon-sat', '{1,2,3,4,5,6}',
   array[(select id from emp where name='Lupita R.')], false, 15)
on conflict do nothing;
