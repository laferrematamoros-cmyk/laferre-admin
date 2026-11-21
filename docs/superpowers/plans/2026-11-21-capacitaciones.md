# Capacitaciones — plan de construcción

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada empleado (teléfono) y la practicante (panel) vean las 13 animaciones de procesos, contesten "Entendí" o "Tengo dudas", y que el admin vea el avance y cierre las dudas.

**Architecture:**
- La lógica de estados, plazos y avisos vive en SQL (`supabase/011_capacitaciones.sql`), con funciones `cap_*`.
- El panel (Next.js 16) tiene el catálogo en código, la página pública de la animación (`/ver-capacitacion/[slug]?s=<sesión>`), la página del admin y la de la practicante, y el cron de avisos.
- La app (Expo) lista con `cap_list`, abre con `cap_open` y manda al navegador. Va por OTA, sin APK nueva.

**Tech Stack:**
- Supabase (Postgres, funciones SECURITY DEFINER);
- Next.js 16.2 App Router, CSS modules, jest + ts-jest;
- Expo Router 6 + expo-linking;
- pruebas de SQL en PGlite 0.3.16 (scratchpad).

**Diseño:** `docs/superpowers/specs/2026-11-21-capacitaciones-design.md` (léelo antes de empezar).

---

## Reglas para quien construye

- Rama `capacitaciones` en los dos repos (`C:\Users\jose_\laferre-admin`, ya creada; `C:\Users\jose_\laferre-actividades`, crearla desde `master`).
- **Nunca `git add -A`**: agregar archivo por archivo. Un commit por tarea, con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **No desplegar, no `git push`, no OTA.** El panel se sube sólo cuando el dueño dice "súbelo", y la app se manda sólo con "sí, mándala".
- **La base de pruebas es producción.** El SQL lo corre el dueño. Antes se prueba en PGlite. Nada que guarde datos reales.
- No llamar `/api/reminders` ni `/api/cleanup` con la clave.
- En archivos `'use server'` no usar `export { … }` ni `export type { … }` (lo prohíbe `lib/__tests__/use-server-exports.test.ts`).
- Next 16: `params` y `searchParams` son Promesas. Leer `node_modules/next/dist/docs/` ante la duda.
- Archivos descargados = sólo lectura. Se copian, no se ejecutan desde su carpeta. Fuente: `C:\Users\jose_\Downloads\Nueva carpeta (12)\BFM Ferretería design versions actualizado\handoff-app-v2`.
- Pruebas: panel `npx jest` (215 hoy); app `npx jest` (39 hoy). Tipos: `npx tsc --noEmit` en los dos.

## Archivos

**Panel (`laferre-admin`)**

| Archivo | Qué |
|---|---|
| `supabase/011_capacitaciones.sql` | tablas, trigger, funciones `cap_*`, permisos |
| `supabase/011_capacitaciones_prueba.sql` | prueba que no guarda nada |
| `lib/capacitaciones/catalog.ts` | las 13 en código |
| `lib/capacitaciones/sync.ts` | `catalogSyncPlan` (puro) |
| `lib/capacitaciones/status.ts` | tipos, etiquetas, `dueLabel`, `summarize`, `buildMatrix`, `openDoubts` (puro) |
| `lib/capacitaciones/notices.ts` | `groupClaims`, `noticeText`, `inNoticeHours` (puro) |
| `lib/capacitaciones/server.ts` | `syncCatalog`, `runTrainingTick` (server-only) |
| `lib/capacitaciones/viewer.ts` | `loadViewer` (server-only) |
| `lib/__tests__/capacitaciones.test.ts` | pruebas de lo puro y del catálogo |
| `components/capacitaciones/anim/*.jsx` | las 16 animaciones copiadas |
| `components/capacitaciones/registry.tsx` | componente → `import()` dinámico |
| `components/capacitaciones/TrainingContent.tsx` | pinta las partes de un slug |
| `components/capacitaciones/TrainingViewer.tsx` + `viewer.module.css` | página de la animación con botones |
| `components/capacitaciones/Matrix.tsx`, `DoubtList.tsx`, `TrainingSettings.tsx` + `capacitaciones.module.css` | pestañas del admin |
| `app/ver-capacitacion/[slug]/page.tsx` | pública (teléfono) |
| `app/capacitaciones/page.tsx`, `app/capacitaciones/actions.ts`, `app/capacitaciones/ver/[slug]/page.tsx` | admin |
| `app/mis-capacitaciones/page.tsx`, `app/mis-capacitaciones/[slug]/page.tsx`, `app/mis-capacitaciones/actions.ts` | practicante |
| `public/bfm-assets/**`, `public/aislamax-recorte.webp` | fotos de las animaciones |
| modificar `middleware.ts`, `lib/session-context.tsx`, `components/AdminShell.tsx`, `app/api/reminders/route.ts` | |

**App (`laferre-actividades`)**

| Archivo | Qué |
|---|---|
| `lib/training.ts` + `lib/__tests__/training.test.ts` | tipos y reglas puras |
| `lib/trainingApi.ts` | `loadTrainings`, `openTraining` |
| `lib/trainingBadge.ts` | numerito compartido de la pestaña |
| `app/(employee)/capacitacion.tsx` | pestaña |
| `components/TrainingCard.tsx` | tarjeta de Hoy |
| modificar `app/(employee)/_layout.tsx`, `components/PanelTabBar.tsx`, `components/TabIcon.tsx`, `app/(employee)/index.tsx` | |

---

## Fase 1 — Base de datos

### Task 1: `011_capacitaciones.sql` y su prueba

**Files:**
- Create: `supabase/011_capacitaciones.sql`
- Create: `supabase/011_capacitaciones_prueba.sql`

- [ ] **Step 1: Escribir la migración**

```sql
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
create index if not exists training_sessions_tev_idx on public.training_sessions (training_id, employee_id, version);

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

-- Abre una capacitación: crea la sesión (es el ?s= del enlace).
create or replace function public.cap_open(p_training uuid, p_employee uuid, p_source text default 'app')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  t   trainings;
  sid uuid;
begin
  if p_source not in ('app', 'panel') then
    return jsonb_build_object('ok', false, 'error', 'Origen no válido.');
  end if;
  select * into t from trainings where id = p_training;
  if not found or not t.is_active then
    return jsonb_build_object('ok', false, 'error', 'Esta capacitación está en pausa.');
  end if;
  if not exists (select 1 from employees where id = p_employee and is_active) then
    return jsonb_build_object('ok', false, 'error', 'Tu nombre no está activo. Pídele ayuda al Ing.');
  end if;
  if (select count(*) from training_sessions
       where employee_id = p_employee and opened_at > now() - interval '1 hour') >= 60 then
    return jsonb_build_object('ok', false, 'error', 'Demasiados intentos. Espera un rato.');
  end if;
  insert into training_sessions (training_id, employee_id, version, source)
  values (t.id, p_employee, t.version, p_source) returning id into sid;
  return jsonb_build_object('ok', true, 'session', sid, 'slug', t.slug);
end $$;

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
     where r.status = 'pending'
       and (k.kind = 'new' or r.deadline - p_now <= interval '48 hours')
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

revoke all on function public.cap_deadline(timestamptz, int) from public, anon, authenticated;
revoke all on function public.cap_rows(timestamptz) from public, anon, authenticated;
revoke all on function public.cap_list(uuid) from public;
revoke all on function public.cap_open(uuid, uuid, text) from public;
revoke all on function public.cap_answer(uuid, text, text) from public;
revoke all on function public.cap_matrix() from public, anon, authenticated;
revoke all on function public.cap_mark_trained(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.cap_claim_notices(timestamptz) from public, anon, authenticated;
grant execute on function public.cap_deadline(timestamptz, int) to service_role;
grant execute on function public.cap_list(uuid) to anon, authenticated, service_role;
grant execute on function public.cap_open(uuid, uuid, text) to anon, authenticated, service_role;
grant execute on function public.cap_answer(uuid, text, text) to anon, authenticated, service_role;
grant execute on function public.cap_matrix() to service_role;
grant execute on function public.cap_mark_trained(uuid, uuid, text) to service_role;
grant execute on function public.cap_claim_notices(timestamptz) to service_role;

commit;

-- Comprobación: deben salir las 4 tablas.
select table_name from information_schema.tables
 where table_schema = 'public' and table_name like 'training%' order by 1;
```

- [ ] **Step 2: Escribir la prueba**

Mismo formato que `010_lista_con_firma_prueba.sql`: un bloque `do $$` que acumula renglones `OK`/`FALLA` en `res` y al final hace `raise exception 'RESULTADOS (no se guardó nada):%', res;`. Usa a Laura (`0ddf2629-36b8-4aa1-b769-39d45740bb43`) y a La Ferre (`a6798a18-9565-4f2b-929a-0c6771e7ef54`). Crea dentro del bloque:
- una capacitación `prueba-cap` (activa, `min_seconds` 30, `deadline_days` 7);
- un empleado `nuevo` activo, con `created_at = now()` y `role`/`initials` de relleno;
- un empleado `baja` inactivo.

Casos (cada uno, un renglón numerado):

1. Al insertar activa, `published_at = now()`. Con `published_at` puesto 3 días atrás: pausar → activar lo regresa a `now()`; con 3 días atrás y la versión subida estando activa, también.
2. `cap_deadline('2026-11-23 15:00-06', 7) = '2026-12-01 00:00-06'`.
3. `cap_list(laura)` trae `prueba-cap` con `status` `pending`.
4. Con `published_at = now() - 10 días`: Laura sale `overdue` y `nuevo` sale `pending` (su plazo cuenta desde su alta).
5. `cap_open` con la capacitación pausada → `ok:false`. Se vuelve a activar y se pone `published_at = now() - 10 días` otra vez.
6. `cap_open` con `baja` → `ok:false`.
7. `cap_open(prueba, nuevo)` → `ok:true`, regresa `session` y `slug = 'prueba-cap'`.
8. `cap_answer(sesión, 'understood')` en el acto → `code = 'too_soon'` y `seconds_left = 30`.
9. Con `opened_at` 40 s atrás, `understood` → `ok:true`, y `cap_list(nuevo)` dice `understood`.
10. Una sesión nueva con `doubt` y nota → `doubt` y la nota guardada. Una nota de 501 letras → `code = 'note'`.
11. Sesión con `opened_at` 13 h atrás → `code = 'expired'`.
12. Subir la versión: la sesión vieja → `code = 'version'`, y `cap_list(nuevo)` vuelve a `pending` en la versión 2.
13. En v2: `doubt` → `cap_mark_trained` → `ok:true` y `trained`, con `trained_by`. La segunda llamada → `ok:false`. Un `understood` después (con una sesión de 40 s) → `already:true`, y sigue `trained`.
14. `cap_claim_notices(now())` aparta `new` para Laura en `prueba-cap`. La segunda llamada ya no la regresa. Con `p_now = plazo − 1 día` aparta `due_soon` (contar con `where training_id = prueba`).
15. Con 60 sesiones de `nuevo` en la última hora, `cap_open` → `ok:false`.
16. Con `execute 'set role anon'`:
   - `select from trainings` → `insufficient_privilege`;
   - `cap_matrix()`, `cap_mark_trained(...)` y `cap_claim_notices()` → bloqueadas;
   - `cap_list(laura)` sí funciona.

   Luego `execute 'reset role'`.

Ojo: dentro del bloque `now()` no cambia. Por eso el paso del tiempo se simula moviendo `opened_at` y `published_at` con `update` (como `postgres`).

- [ ] **Step 3: Correr las dos en PGlite**

El arnés está en `C:\Users\jose_\AppData\Local\Temp\claude\4e3eeb89855ea564\8ceeb3ac-ee4c-4971-857e-e0b13eb07ef9\scratchpad\pglite\` (`run.mjs` + `prelude.sql`). Si el scratchpad se borró, rehacerlo:
- `npm i @electric-sql/pglite@0.3.16`;
- el preludio imita roles (`anon`, `authenticated`, `service_role`), `companies`, `employees`, y a Eddie, Laura y Yajaira.

A `employees` del preludio le faltan columnas de producción. Agregar al final del preludio:

```sql
alter table public.employees add column if not exists role text, add column if not exists initials text,
  add column if not exists created_at timestamptz not null default now() - interval '90 days';
```

Run: `node run.mjs C:/Users/jose_/laferre-admin/supabase/011_capacitaciones.sql C:/Users/jose_/laferre-admin/supabase/011_capacitaciones.sql C:/Users/jose_/laferre-admin/supabase/011_capacitaciones_prueba.sql`

Expected:
- dos `OK` de la migración (prueba que se puede correr dos veces);
- la prueba termina con `ERR … RESULTADOS (no se guardó nada):` y los 16 renglones con `OK`.

Si alguno dice `FALLA`, arreglar y repetir.

- [ ] **Step 4: Commit**

```bash
git add supabase/011_capacitaciones.sql supabase/011_capacitaciones_prueba.sql
git commit -m "feat(capacitaciones): tablas y funciones cap_* con su prueba"
```

---

## Fase 2 — Panel: lógica pura

### Task 2: catálogo y plan de sincronización

**Files:**
- Create: `lib/capacitaciones/catalog.ts`
- Create: `lib/capacitaciones/sync.ts`
- Create: `lib/__tests__/capacitaciones.test.ts`

- [ ] **Step 1: Prueba que falla**

```ts
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG, catalogBySlug } from '../capacitaciones/catalog';
import { catalogSyncPlan } from '../capacitaciones/sync';

describe('catálogo', () => {
  it('13 capacitaciones con slug único', () => {
    expect(CATALOG).toHaveLength(13);
    expect(new Set(CATALOG.map(c => c.slug)).size).toBe(13);
    CATALOG.forEach(c => expect(c.slug).toMatch(/^[a-z0-9-]{1,40}$/));
  });
  it('cada parte existe en components/capacitaciones/anim', () => {
    for (const c of CATALOG) for (const p of c.parts)
      expect(existsSync(join(process.cwd(), 'components/capacitaciones/anim', `${p}.jsx`))).toBe(true);
  });
  it('tiempos dentro de lo que acepta la base', () => {
    CATALOG.forEach(c => { expect(c.minSeconds).toBeGreaterThanOrEqual(5); expect(c.minSeconds).toBeLessThanOrEqual(600); });
    expect(catalogBySlug('fregadero')?.parts).toEqual(['InstalarFregadero']);
    expect(catalogBySlug('nada')).toBeNull();
  });
});

describe('catalogSyncPlan', () => {
  const cat = [
    { slug: 'a', title: 'A', version: 1, minSeconds: 30, parts: ['X'] },
    { slug: 'b', title: 'B nueva', version: 2, minSeconds: 40, parts: ['Y'] },
    { slug: 'c', title: 'C', version: 1, minSeconds: 20, parts: ['Z'] },
  ];
  it('base vacía: todas pausadas en el orden del catálogo', () => {
    const p = catalogSyncPlan(cat, []);
    expect(p.inserts.map(i => [i.slug, i.sort_order, i.is_active, i.min_seconds])).toEqual([['a', 1, false, 30], ['b', 2, false, 40], ['c', 3, false, 20]]);
    expect(p.updates).toEqual([]);
  });
  it('sube versión y título; nunca baja; las nuevas van al final', () => {
    const rows = [
      { id: '1', slug: 'a', title: 'A', version: 3, sort_order: 5 },
      { id: '2', slug: 'b', title: 'B', version: 1, sort_order: 2 },
    ];
    const p = catalogSyncPlan(cat, rows);
    expect(p.updates).toEqual([{ id: '2', title: 'B nueva', version: 2 }]);
    expect(p.inserts.map(i => [i.slug, i.sort_order])).toEqual([['c', 6]]);
  });
});
```

- [ ] **Step 2: Correrla y ver que falla**

Run: `npx jest lib/__tests__/capacitaciones.test.ts`. Expected: FAIL (no existen los módulos).

- [ ] **Step 3: Implementar**

`lib/capacitaciones/catalog.ts`:

```ts
// Capacitaciones en código (diseño: docs/superpowers/specs/2026-11-21-capacitaciones-design.md).
// Agregar una: su .jsx en components/capacitaciones/anim/, su entrada en registry.tsx y aquí.
// Cambiar una animación: subir `version` (a todos les vuelve a salir). Nunca bajarla.

export interface CatalogEntry {
  slug: string;
  title: string;
  version: number;
  /** Tiempo mínimo inicial (s): una vuelta completa de la animación, redondeada hacia arriba a 5 s. El admin lo cambia. */
  minSeconds: number;
  /** Componentes de components/capacitaciones/anim/ (sin .jsx), en orden. */
  parts: string[];
}

export const CATALOG: CatalogEntry[] = [
  { slug: 'fregadero',            title: 'Instalar un fregadero',       version: 1, minSeconds: 30, parts: ['InstalarFregadero'] },
  { slug: 'lavabo',               title: 'Instalar un lavabo',          version: 1, minSeconds: 30, parts: ['InstalarLavabo'] },
  { slug: 'gas-estufa',           title: 'Conectar el gas a la estufa', version: 1, minSeconds: 30, parts: ['InstalarGasEstufa'] },
  { slug: 'bomba',                title: 'Instalar una bomba',          version: 1, minSeconds: 30, parts: ['InstalarBomba'] },
  { slug: 'hidroneumatico',       title: 'Instalar un hidroneumático',  version: 1, minSeconds: 30, parts: ['InstalarHidroneumatico'] },
  { slug: 'errores-bombas',       title: 'Errores comunes con bombas',  version: 1, minSeconds: 30, parts: ['BombaSistemasIncorrectos'] },
  { slug: 'brocas-metal',         title: 'Brocas para metal',           version: 1, minSeconds: 30, parts: ['BrocaMetal'] },
  { slug: 'cables-interruptores', title: 'Cables e interruptores',      version: 1, minSeconds: 30, parts: ['CableDelgadoPeligro', 'CableEInterruptor'] },
  { slug: 'extension',            title: 'Extensión sobrecargada',      version: 1, minSeconds: 30, parts: ['ExtensionSobrecargada'] },
  { slug: 'focos-led',            title: 'Focos LED',                   version: 1, minSeconds: 30, parts: ['ComparativaFocos'] },
  { slug: 'cortinas',             title: 'Mantenimiento de cortinas',   version: 1, minSeconds: 30, parts: ['MantenimientoCortina'] },
  { slug: 'impermeabilizar',      title: 'Impermeabilizar un techo',    version: 1, minSeconds: 50, parts: ['CalculadoraYTipsImpermeabilizante', 'PasosImpermeabilizar', 'ProductosImpermeabilizante'] },
  { slug: 'pintar-pared',         title: 'Pintar una pared',            version: 1, minSeconds: 20, parts: ['PasosPintar'] },
];

export function catalogBySlug(slug: string): CatalogEntry | null {
  return CATALOG.find(c => c.slug === slug) ?? null;
}
```

Los `minSeconds` de 30 son provisionales: la Task 5 los mide y los corrige. Ya están medidos: fregadero (28.2 s → 30), impermeabilizar (49.2 s → 50) y pintar (16.5 s → 20).

`lib/capacitaciones/sync.ts`:

```ts
import type { CatalogEntry } from './catalog';

export interface DbTraining { id: string; slug: string; title: string; version: number; sort_order: number }
export interface SyncInsert { slug: string; title: string; version: number; min_seconds: number; sort_order: number; is_active: false }
export interface SyncUpdate { id: string; title?: string; version?: number }
export interface SyncPlan { inserts: SyncInsert[]; updates: SyncUpdate[] }

/** Qué cambiar en `trainings` para que coincida con el código: altas pausadas al final, títulos, versiones (sólo hacia arriba). */
export function catalogSyncPlan(catalog: CatalogEntry[], rows: DbTraining[]): SyncPlan {
  const bySlug = new Map(rows.map(r => [r.slug, r]));
  let last = rows.reduce((m, r) => Math.max(m, r.sort_order), 0);
  const inserts: SyncInsert[] = [];
  const updates: SyncUpdate[] = [];
  for (const c of catalog) {
    const r = bySlug.get(c.slug);
    if (!r) {
      inserts.push({ slug: c.slug, title: c.title, version: c.version, min_seconds: c.minSeconds, sort_order: ++last, is_active: false });
      continue;
    }
    const u: SyncUpdate = { id: r.id };
    if (r.title !== c.title) u.title = c.title;
    if (c.version > r.version) u.version = c.version;
    if (u.title !== undefined || u.version !== undefined) updates.push(u);
  }
  return { inserts, updates };
}
```

- [ ] **Step 4: Correr** — la prueba "cada parte existe" falla hasta la Task 5; marcarla `it.skip` temporalmente y quitar el `skip` en la Task 5. Run: `npx jest lib/__tests__/capacitaciones.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/capacitaciones/catalog.ts lib/capacitaciones/sync.ts lib/__tests__/capacitaciones.test.ts
git commit -m "feat(capacitaciones): catálogo en código y plan de sincronización"
```

### Task 3: estados, plazos y tabla de avance

**Files:**
- Create: `lib/capacitaciones/status.ts`
- Modify: `lib/__tests__/capacitaciones.test.ts` (agregar)

- [ ] **Step 1: Pruebas que fallan**

```ts
import { dueLabel, summarize, buildMatrix, openDoubts, type CapRow } from '../capacitaciones/status';

describe('dueLabel (plazo = inicio del día siguiente, hora de Matamoros)', () => {
  const dl = '2026-11-27T06:00:00.000Z'; // vie 27 00:00 CST → el último día que cuenta es el jue 26
  it('días', () => {
    expect(dueLabel(dl, new Date('2026-11-21T18:00:00Z'))).toBe('vence el jue 26');
    expect(dueLabel(dl, new Date('2026-11-25T18:00:00Z'))).toBe('vence mañana');
    expect(dueLabel(dl, new Date('2026-11-26T18:00:00Z'))).toBe('vence hoy');
    expect(dueLabel(dl, new Date('2026-11-27T07:00:00Z'))).toBe('venció el jue 26');
  });
});

const row = (p: Partial<CapRow>): CapRow => ({
  employee_id: 'e1', employee_name: 'EDDIE', company_id: 'c1', training_id: 't1', slug: 'a', title: 'A',
  sort_order: 1, version: 1, status: 'pending', deadline: '2026-11-27T06:00:00.000Z', answered_at: null,
  doubt_note: null, trained_at: null, trained_by: null, views: 0, ...p,
});

describe('tabla de avance', () => {
  const rows = [
    row({ status: 'understood' }),
    row({ training_id: 't2', slug: 'b', title: 'B', sort_order: 2, status: 'overdue' }),
    row({ employee_id: 'e2', employee_name: 'LAURA', status: 'doubt', answered_at: '2026-11-22T15:00:00Z' }),
    row({ employee_id: 'e2', employee_name: 'LAURA', training_id: 't2', slug: 'b', title: 'B', sort_order: 2, status: 'trained' }),
    row({ employee_id: 'e3', employee_name: 'YAJAIRA', status: 'doubt', answered_at: '2026-11-21T15:00:00Z' }),
  ];
  it('summarize', () => {
    expect(summarize(rows.map(r => r.status))).toEqual({ total: 5, done: 2, open: 1, overdue: 1, doubts: 2 });
  });
  it('buildMatrix: columnas en orden, personas por nombre, avance por fila y columna', () => {
    const m = buildMatrix(rows);
    expect(m.trainings.map(t => [t.slug, t.done, t.total])).toEqual([['a', 1, 3], ['b', 1, 2]]);
    expect(m.people.map(p => [p.name, p.done, p.total])).toEqual([['EDDIE', 1, 2], ['LAURA', 1, 2], ['YAJAIRA', 0, 1]]);
    expect(m.people[1].cells.t2.status).toBe('trained');
  });
  it('openDoubts: la más vieja primero', () => {
    expect(openDoubts(rows).map(r => r.employee_name)).toEqual(['YAJAIRA', 'LAURA']);
  });
});
```

- [ ] **Step 2: Correr** → FAIL.

- [ ] **Step 3: Implementar `lib/capacitaciones/status.ts`**

```ts
// Estados de capacitación (los calcula la base en cap_rows; aquí sólo etiquetas y conteos).

export type TrainingStatus = 'pending' | 'overdue' | 'understood' | 'doubt' | 'trained';

export const STATUS_LABEL: Record<TrainingStatus, string> = {
  pending: 'Por ver', overdue: 'Atrasada', understood: 'Entendida', doubt: 'Con dudas', trained: 'Capacitado en persona',
};

export const isDone = (s: TrainingStatus) => s === 'understood' || s === 'trained';
export const isOpen = (s: TrainingStatus) => s === 'pending' || s === 'overdue';

/** Una fila de cap_matrix(): persona × capacitación. */
export interface CapRow {
  employee_id: string; employee_name: string; company_id: string | null;
  training_id: string; slug: string; title: string; sort_order: number; version: number;
  status: TrainingStatus; deadline: string; answered_at: string | null; doubt_note: string | null;
  trained_at: string | null; trained_by: string | null; views: number;
}

const TZ = 'America/Matamoros';
const ymd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

function dayName(d: Date): string {
  const p = Object.fromEntries(new Intl.DateTimeFormat('es-MX', { timeZone: TZ, weekday: 'short', day: 'numeric' })
    .formatToParts(d).map(x => [x.type, x.value]));
  return `${String(p.weekday).replace('.', '').toLowerCase()} ${p.day}`;
}

/** "vence hoy" · "vence mañana" · "vence el jue 26" · "venció el jue 26". El plazo es el inicio del día siguiente. */
export function dueLabel(deadlineIso: string, now: Date): string {
  const end = new Date(deadlineIso).getTime();
  const last = new Date(end - 1);
  if (now.getTime() >= end) return `venció el ${dayName(last)}`;
  if (ymd(last) === ymd(now)) return 'vence hoy';
  if (ymd(last) === ymd(new Date(now.getTime() + 86_400_000))) return 'vence mañana';
  return `vence el ${dayName(last)}`;
}

export function summarize(statuses: TrainingStatus[]) {
  return {
    total: statuses.length,
    done: statuses.filter(isDone).length,
    open: statuses.filter(isOpen).length,
    overdue: statuses.filter(s => s === 'overdue').length,
    doubts: statuses.filter(s => s === 'doubt').length,
  };
}

export interface MatrixTraining { id: string; slug: string; title: string; done: number; total: number }
export interface MatrixPerson { id: string; name: string; companyId: string | null; cells: Record<string, CapRow>; done: number; total: number }

export function buildMatrix(rows: CapRow[]): { trainings: MatrixTraining[]; people: MatrixPerson[] } {
  const ts = new Map<string, MatrixTraining & { sort: number }>();
  const ps = new Map<string, MatrixPerson>();
  for (const r of rows) {
    const t = ts.get(r.training_id) ?? { id: r.training_id, slug: r.slug, title: r.title, done: 0, total: 0, sort: r.sort_order };
    t.total++; if (isDone(r.status)) t.done++;
    ts.set(r.training_id, t);
    const p = ps.get(r.employee_id) ?? { id: r.employee_id, name: r.employee_name, companyId: r.company_id, cells: {}, done: 0, total: 0 };
    p.cells[r.training_id] = r; p.total++; if (isDone(r.status)) p.done++;
    ps.set(r.employee_id, p);
  }
  return {
    trainings: [...ts.values()].sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title, 'es'))
      .map(({ sort: _s, ...t }) => t),
    people: [...ps.values()].sort((a, b) => a.name.localeCompare(b.name, 'es')),
  };
}

export function openDoubts(rows: CapRow[]): CapRow[] {
  return rows.filter(r => r.status === 'doubt')
    .sort((a, b) => (a.answered_at ?? '').localeCompare(b.answered_at ?? ''));
}
```

- [ ] **Step 4: Correr** → PASS. Si `dayName` da otro texto (ICU de Node), ajustar a que salga `jue 26` (minúsculas, sin punto ni coma).

- [ ] **Step 5: Commit** — `git add lib/capacitaciones/status.ts lib/__tests__/capacitaciones.test.ts` · `feat(capacitaciones): estados, plazos y tabla de avance`

### Task 4: textos y horario de los avisos

**Files:**
- Create: `lib/capacitaciones/notices.ts`
- Modify: `lib/__tests__/capacitaciones.test.ts`

- [ ] **Step 1: Pruebas que fallan**

```ts
import { groupClaims, noticeText, inNoticeHours, type NoticeClaim } from '../capacitaciones/notices';

const cl = (p: Partial<NoticeClaim>): NoticeClaim => ({
  employee_id: 'e1', employee_name: 'EDDIE GARCIA', company_id: 'c1', training_id: 't1', title: 'Instalar un fregadero',
  kind: 'new', deadline: '2026-11-27T06:00:00.000Z', ...p,
});
const now = new Date('2026-11-25T18:00:00Z');

describe('avisos', () => {
  it('agrupa por persona; la que está en las dos listas se queda en "por vencer"', () => {
    const g = groupClaims([cl({}), cl({ kind: 'due_soon' }), cl({ training_id: 't2', title: 'Lavabo' }), cl({ employee_id: 'e2', employee_name: 'LAURA' })]);
    expect(g.map(x => [x.name, x.news.map(n => n.training_id), x.dues.map(n => n.training_id)]))
      .toEqual([['EDDIE GARCIA', ['t2'], ['t1']], ['LAURA', ['t1'], []]]);
  });
  it('textos', () => {
    const one = groupClaims([cl({})])[0];
    expect(noticeText(one, now)).toEqual({ title: 'Capacitación', body: 'Eddie, tienes una capacitación nueva: Instalar un fregadero.' });
    const many = groupClaims([cl({}), cl({ training_id: 't2' }), cl({ training_id: 't3' })])[0];
    expect(noticeText(many, now).body).toBe('Eddie, tienes 3 capacitaciones nuevas por ver.');
    const due = groupClaims([cl({ kind: 'due_soon' })])[0];
    expect(noticeText(due, now).body).toBe('Eddie, vence mañana: Instalar un fregadero.');
    const dues = groupClaims([cl({ kind: 'due_soon' }), cl({ kind: 'due_soon', training_id: 't2' })])[0];
    expect(noticeText(dues, now).body).toBe('Eddie, tienes 2 capacitaciones por vencer.');
    const both = groupClaims([cl({ kind: 'due_soon' }), cl({ training_id: 't2' })])[0];
    expect(noticeText(both, now).body).toBe('Eddie, vence mañana: Instalar un fregadero. También tienes una nueva.');
  });
  it('horario: de 9:00 a 19:00 en Matamoros', () => {
    expect(inNoticeHours(new Date('2026-11-25T14:59:00Z'))).toBe(false); // 8:59
    expect(inNoticeHours(new Date('2026-11-25T15:00:00Z'))).toBe(true);  // 9:00
    expect(inNoticeHours(new Date('2026-11-26T00:59:00Z'))).toBe(true);  // 18:59
    expect(inNoticeHours(new Date('2026-11-26T01:00:00Z'))).toBe(false); // 19:00
  });
});
```

- [ ] **Step 2: Correr** → FAIL.

- [ ] **Step 3: Implementar `lib/capacitaciones/notices.ts`**

```ts
import { shopClock } from '@/lib/my-day';
import { dueLabel } from './status';

/** Lo que regresa cap_claim_notices(): un aviso ya apartado en la base. */
export interface NoticeClaim {
  employee_id: string; employee_name: string; company_id: string | null;
  training_id: string; title: string; kind: 'new' | 'due_soon'; deadline: string;
}
export interface NoticeGroup { employeeId: string; name: string; companyId: string | null; news: NoticeClaim[]; dues: NoticeClaim[] }

export function groupClaims(claims: NoticeClaim[]): NoticeGroup[] {
  const by = new Map<string, NoticeGroup>();
  for (const c of claims) {
    const g = by.get(c.employee_id) ?? { employeeId: c.employee_id, name: c.employee_name, companyId: c.company_id, news: [], dues: [] };
    (c.kind === 'due_soon' ? g.dues : g.news).push(c);
    by.set(c.employee_id, g);
  }
  for (const g of by.values()) {
    const due = new Set(g.dues.map(d => d.training_id));
    g.news = g.news.filter(n => !due.has(n.training_id));
  }
  return [...by.values()];
}

const firstName = (full: string) => {
  const w = full.trim().split(/\s+/)[0] ?? '';
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
};

export function noticeText(g: NoticeGroup, now: Date): { title: string; body: string } {
  const n = firstName(g.name);
  const dueTxt = g.dues.length === 1 ? `${dueLabel(g.dues[0].deadline, now)}: ${g.dues[0].title}.`
    : g.dues.length > 1 ? `tienes ${g.dues.length} capacitaciones por vencer.` : '';
  const newTxt = g.news.length === 1 ? `tienes una capacitación nueva: ${g.news[0].title}.`
    : g.news.length > 1 ? `tienes ${g.news.length} capacitaciones nuevas por ver.` : '';
  let body: string;
  if (dueTxt && newTxt) body = `${n}, ${dueTxt} También tienes ${g.news.length === 1 ? 'una nueva' : `${g.news.length} nuevas`}.`;
  else body = `${n}, ${dueTxt || newTxt}`;
  return { title: 'Capacitación', body };
}

/** Los avisos de capacitación sólo salen de 9:00 a 19:00, hora de la tienda. */
export function inNoticeHours(now: Date): boolean {
  const m = shopClock(now).minutes;
  return m >= 9 * 60 && m < 19 * 60;
}
```

- [ ] **Step 4: Correr** → PASS. **Step 5: Commit** — `feat(capacitaciones): textos y horario de avisos`

---

## Fase 3 — Panel: animaciones y página de la animación

### Task 5: copiar animaciones, registro y tiempos medidos

**Files:**
- Create: `components/capacitaciones/anim/` (16 `.jsx`), `public/bfm-assets/**`, `public/aislamax-recorte.webp`
- Create: `components/capacitaciones/registry.tsx`, `components/capacitaciones/TrainingContent.tsx`
- Modify: `lib/capacitaciones/catalog.ts` (tiempos), `lib/__tests__/capacitaciones.test.ts` (quitar `skip`)

- [ ] **Step 1: Copiar** (con PowerShell `Copy-Item`, sin ejecutar nada de la carpeta):
  - los 16 `.jsx` de la fuente a `components/capacitaciones/anim/`;
  - `bfm-assets` completo a `public/bfm-assets`;
  - `aislamax-recorte.webp` a `public/`.

  A cada `.jsx` agregar `"use client";` como primera línea, sin tocar nada más. Antes de copiar `bfm-assets`, comprobar que no choque con algo en `public/`.

- [ ] **Step 2: `components/capacitaciones/registry.tsx`**

```tsx
'use client';
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

// Cada animación se carga sólo en el navegador (usan window / IntersectionObserver).
const L = () => <div style={{ minHeight: 320, borderRadius: 24, background: '#ECECEF' }} aria-label="Cargando animación" />;
const load = (f: () => Promise<{ default: ComponentType }>) => dynamic(f, { ssr: false, loading: L });

export const PARTS: Record<string, ComponentType> = {
  InstalarFregadero:        load(() => import('./anim/InstalarFregadero')),
  InstalarLavabo:           load(() => import('./anim/InstalarLavabo')),
  InstalarGasEstufa:        load(() => import('./anim/InstalarGasEstufa')),
  InstalarBomba:            load(() => import('./anim/InstalarBomba')),
  InstalarHidroneumatico:   load(() => import('./anim/InstalarHidroneumatico')),
  BombaSistemasIncorrectos: load(() => import('./anim/BombaSistemasIncorrectos')),
  BrocaMetal:               load(() => import('./anim/BrocaMetal')),
  CableDelgadoPeligro:      load(() => import('./anim/CableDelgadoPeligro')),
  CableEInterruptor:        load(() => import('./anim/CableEInterruptor')),
  ExtensionSobrecargada:    load(() => import('./anim/ExtensionSobrecargada')),
  ComparativaFocos:         load(() => import('./anim/ComparativaFocos')),
  MantenimientoCortina:     load(() => import('./anim/MantenimientoCortina')),
  CalculadoraYTipsImpermeabilizante: load(() => import('./anim/CalculadoraYTipsImpermeabilizante')),
  PasosImpermeabilizar:     load(() => import('./anim/PasosImpermeabilizar')),
  ProductosImpermeabilizante: load(() => import('./anim/ProductosImpermeabilizante')),
  PasosPintar:              load(() => import('./anim/PasosPintar')),
};
```

Si `tsc` se queja del tipo de los `.jsx`, envolver así: `() => import('./anim/X') as Promise<{ default: ComponentType }>`.

- [ ] **Step 3: `components/capacitaciones/TrainingContent.tsx`**

```tsx
'use client';
import { catalogBySlug } from '@/lib/capacitaciones/catalog';
import { PARTS } from './registry';

/** Las partes de una capacitación, una debajo de otra. `round` cambia → se vuelven a montar (reinicia animaciones). */
export default function TrainingContent({ slug, round = 0 }: { slug: string; round?: number }) {
  const parts = catalogBySlug(slug)?.parts ?? [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {parts.map(p => { const C = PARTS[p]; return C ? <C key={`${p}-${round}`} /> : null; })}
    </div>
  );
}
```

- [ ] **Step 4: Medir los tiempos.** Por cada componente animado:
  - leer su arranque (`play()` / `cyc()` / `pinPlay()` y sus `setTimeout` o arreglos `D`) y sumar una vuelta completa;
  - si la capacitación tiene varias partes, sumar las animadas (la calculadora y los productos no suman);
  - redondear hacia arriba a 5 s y ponerlo en `minSeconds`.

  Comprobarlo en pantalla en la Task 6, con la vista previa: al llegar al tiempo, la animación debe ir en su último paso. Anotar los tiempos en el mensaje del commit.

- [ ] **Step 5: Quitar el `it.skip`.** Run: `npx jest lib/__tests__/capacitaciones.test.ts` → PASS. `npx tsc --noEmit` → sin errores.

- [ ] **Step 6: Commit**
  - `git add` de: `components/capacitaciones/anim`, `components/capacitaciones/registry.tsx`, `components/capacitaciones/TrainingContent.tsx`, `public/bfm-assets`, `public/aislamax-recorte.webp`, `lib/capacitaciones/catalog.ts` y `lib/__tests__/capacitaciones.test.ts`;
  - mensaje: `feat(capacitaciones): las 16 animaciones, su registro y tiempos medidos`.

### Task 6: página de la animación (pública y vista previa)

**Files:**
- Create: `lib/capacitaciones/viewer.ts`
- Create: `components/capacitaciones/TrainingViewer.tsx`, `components/capacitaciones/viewer.module.css`
- Create: `app/ver-capacitacion/[slug]/page.tsx`, `app/capacitaciones/ver/[slug]/page.tsx`
- Modify: `middleware.ts`, `lib/session-context.tsx`

- [ ] **Step 1: `middleware.ts`**
  - En el `matcher`, agregar `ver-capacitacion/` a la lista de exclusiones, después de `api|`: `'/((?!login|api|ver-capacitacion/|_next/static|…'`.
  - En `INTERN_ALLOWED`, sumar `'/mis-capacitaciones'`.
  - Actualizar el comentario del `matcher`: "y la página de capacitación que abre el teléfono (la protege su sesión de 12 h)".

- [ ] **Step 2: `lib/session-context.tsx`.** Cambiar la condición del redirect:

```ts
// Páginas sin sesión del panel: la entrada y la capacitación que abre el teléfono.
const PUBLIC_PATHS = ['/login', '/ver-capacitacion'];
const isPublic = (p: string | null) => !!p && PUBLIC_PATHS.some(x => p === x || p.startsWith(x + '/'));
// …
if (!d.role && !isPublic(pathname)) { window.location.replace('/login'); return; }
```

- [ ] **Step 3: `lib/capacitaciones/viewer.ts`** (server-only)

```ts
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase';
import { isUuid } from '@/lib/access-rules';
import { catalogBySlug } from './catalog';
import type { TrainingStatus } from './status';

export type ViewerInfo =
  | { ok: true; token: string; slug: string; title: string; employeeName: string; minSeconds: number;
      previous: { status: TrainingStatus; answeredAt: string } | null }
  | { ok: false; error: string };

const BAD = 'Este enlace ya no sirve. Ábrela otra vez desde la app.';
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

/** Revisa la sesión del enlace (?s=) igual que cap_answer, para no enseñar una página que no va a poder contestar. */
export async function loadViewer(slug: string, token: string | undefined): Promise<ViewerInfo> {
  if (!token || !isUuid(token) || !catalogBySlug(slug)) return { ok: false, error: BAD };
  const db = supabaseAdmin();
  const { data: s } = await db.from('training_sessions')
    .select('training_id, employee_id, version, opened_at').eq('id', token).maybeSingle();
  if (!s || Date.now() - new Date(s.opened_at as string).getTime() > MAX_AGE_MS) return { ok: false, error: BAD };
  const [t, e, p] = await Promise.all([
    db.from('trainings').select('slug, title, is_active, version, min_seconds').eq('id', s.training_id).maybeSingle(),
    db.from('employees').select('name, is_active').eq('id', s.employee_id).maybeSingle(),
    db.from('training_progress').select('status, answered_at')
      .eq('training_id', s.training_id).eq('employee_id', s.employee_id).eq('version', s.version).maybeSingle(),
  ]);
  if (!t.data || t.data.slug !== slug || !e.data?.is_active) return { ok: false, error: BAD };
  if (!t.data.is_active) return { ok: false, error: 'Esta capacitación está en pausa.' };
  if (t.data.version !== s.version) return { ok: false, error: 'Esta capacitación se actualizó. Ábrela otra vez desde la app.' };
  return {
    ok: true, token, slug, title: t.data.title as string, employeeName: e.data.name as string,
    minSeconds: t.data.min_seconds as number,
    previous: p.data ? { status: p.data.status as TrainingStatus, answeredAt: p.data.answered_at as string } : null,
  };
}
```

- [ ] **Step 4: `components/capacitaciones/TrainingViewer.tsx`** (`'use client'`)

Props:

```ts
interface Props {
  slug: string;
  title: string;
  employeeName?: string;      // "Hola, Eddie"
  minSeconds: number;
  token: string | null;       // null = vista previa del admin (no se registra nada, sin botones)
  previous?: { status: TrainingStatus; answeredAt: string } | null;
  back: { href: string; label: string };  // teléfono: laferre://capacitacion "Regresar a la app"; practicante: /mis-capacitaciones
  embedded?: boolean;         // dentro del panel (practicante / vista previa): sin barra fija de altura completa
}
```

Comportamiento (todo con estado local):

- **Cuenta regresiva.** `start = performance.now()` al montar. Un intervalo de 1 s calcula `left = max(0, minSeconds − floor((now − start)/1000))`. El botón dice `Entendí · 0:23` y queda deshabilitado hasta que `left === 0`; entonces dice `Entendí`. "Volver a verla" no reinicia la cuenta.
- **Encabezado:**
  - eyebrow `CAPACITACIÓN`, `Hola, {Nombre}` (primer nombre en tipo título, con una función local; no importar `notices.ts` en el cliente) y el título;
  - si `previous`: un letrero, *"Ya la marcaste como entendida el 21 nov."* / *"Pediste que el Ing. te la explique."* / *"Ya te capacitó el Ing. en persona."*;
  - si `previous.status === 'trained'`: sin botones de contestar, sólo el enlace de regreso.
- **Animaciones apagadas:** si `matchMedia('(prefers-reduced-motion: reduce)').matches`, una nota: *"Tu teléfono tiene las animaciones apagadas: toca cada paso para verlo."*
- **Contenido:** `<TrainingContent slug={slug} round={round} />`.
- **Barra fija abajo** (con `padding-bottom: env(safe-area-inset-bottom)`): botones de 52 px de alto mínimo, `[Tengo dudas]` (claro) y `[Entendí · m:ss]` (negro).
- **Hoja "Tengo dudas"** (overlay + panel abajo; `zIndex` en `style`, no en clase arbitraria):
  - "Volver a verla": cierra, `setRound(r+1)` y `window.scrollTo({ top: 0, behavior: 'smooth' })`;
  - "Que el Ing. me la explique": un `textarea` (`maxLength` 500, `placeholder` "¿Qué no te quedó claro? (opcional)", `font-size` 16 px para que iOS no haga zoom) y el botón "Enviar".
- **Contestar:**

```ts
const r = await supabase.rpc('cap_answer', { p_session: token, p_answer: kind, p_note: note || null });
if (r.error) setError('No hay conexión. Intenta de nuevo.');
else if (!r.data?.ok) {
  if (r.data?.code === 'too_soon') resync(r.data.seconds_left); // ajusta la cuenta a lo que dice la base
  setError(r.data?.error ?? 'No se pudo guardar.');
} else setDone(kind);
```

  (`supabase` = cliente público de `@/lib/supabase`; `resync(n)` mueve `start` para que `left = n`.) Mientras manda, el botón dice "Guardando…" y no se puede volver a tocar.
- **Pantalla final:**
  - *"¡Listo, {Nombre}!"*;
  - el texto según la respuesta: understood → *"Quedó como entendida."*; doubt → *"Le avisamos al Ing. José para que te la explique."*;
  - un botón grande `<a href={back.href}>{back.label}</a>`;
  - si `back.href` empieza con `laferre://`, debajo: *"o cierra esta pestaña"*.
- **Vista previa (`token === null`):** un letrero arriba, *"Vista previa: no se registra nada."*, y sin barra de botones.

`viewer.module.css`:
- fondo `#F4F4F6`, contenido `max-width: 1180px`, márgenes de 16 px en celular y 28 px en escritorio;
- `padding-bottom: 110px` para que la barra no tape el final;
- botones `border-radius: 999px`, letra Geist (`var(--font-geist)`).

- [ ] **Step 5: `app/ver-capacitacion/[slug]/page.tsx`** (server)

```tsx
import type { Metadata } from 'next';
import { loadViewer } from '@/lib/capacitaciones/viewer';
import TrainingViewer from '@/components/capacitaciones/TrainingViewer';

export const metadata: Metadata = { title: 'Capacitación', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function Page({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ s?: string }>;
}) {
  const { slug } = await params;
  const { s } = await searchParams;
  const v = await loadViewer(slug, s);
  if (!v.ok) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#F4F4F6', fontFamily: 'var(--font-geist), system-ui' }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>Capacitación</h1>
          <p style={{ color: '#55555B', margin: '0 0 20px' }}>{v.error}</p>
          <a href="laferre://capacitacion" style={{ display: 'inline-block', padding: '14px 22px', borderRadius: 999, background: '#0B0B0C', color: '#fff', textDecoration: 'none', fontWeight: 600 }}>Regresar a la app</a>
        </div>
      </main>
    );
  }
  return <TrainingViewer slug={v.slug} title={v.title} employeeName={v.employeeName} minSeconds={v.minSeconds}
    token={v.token} previous={v.previous} back={{ href: 'laferre://capacitacion', label: 'Regresar a la app' }} />;
}
```

- [ ] **Step 6: `app/capacitaciones/ver/[slug]/page.tsx`** (server; el middleware ya deja entrar sólo al admin: `/capacitaciones` no está en `INTERN_ALLOWED`)

```tsx
import { notFound } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import TrainingViewer from '@/components/capacitaciones/TrainingViewer';
import { catalogBySlug } from '@/lib/capacitaciones/catalog';

export default async function Preview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = catalogBySlug(slug);
  if (!c) notFound();
  return (
    <AdminShell>
      <div style={{ overflowY: 'auto', height: '100%' }}>
        <TrainingViewer slug={slug} title={c.title} minSeconds={c.minSeconds} token={null} embedded
          back={{ href: '/capacitaciones?tab=ajustes', label: 'Volver a Capacitación' }} />
      </div>
    </AdminShell>
  );
}
```

- [ ] **Step 7: Revisar en pantalla.** `next build && next start -p 3100`. Cookie de admin firmada con el `AUTH_SECRET` local: script `firmar-token.mjs` del scratchpad; rehacerlo si no está, con `jose` `SignJWT` HS256 y payload `{ role: 'admin' }`. Con playwright-core y el Chrome del sistema (`C:/Program Files (x86)/Google/Chrome/Application/chrome.exe`):
  - abrir `/capacitaciones/ver/<slug>` de las 13, a 390×844 y a 1280×800;
  - capturar pantalla y anotar los errores de consola. Deben ser 0, y la animación debe moverse: comparar dos capturas con 2 s de diferencia;
  - repetir una con `reducedMotion: 'reduce'` (debe salir la nota);
  - comprobar los tiempos de la Task 5.

  Para el flujo de contestar (que necesita la base 011), armar en el scratchpad un paquete con esbuild de `TrainingViewer`, como `scratchpad/capac/`:
  - alias de `@/lib/supabase` a un simulado cuyo `rpc('cap_answer')` regrese `too_soon` la primera vez y `ok` después;
  - alias de react a `laferre-admin/node_modules`;
  - probar: cuenta regresiva, botón deshabilitado, "Tengo dudas" → nota → pantalla final, y "Volver a verla".

- [ ] **Step 8: Pruebas y tipos.** Run: `npx jest` (todas) y `npx tsc --noEmit` → sin errores.

- [ ] **Step 9: Commit**

```bash
git add middleware.ts lib/session-context.tsx lib/capacitaciones/viewer.ts components/capacitaciones/TrainingViewer.tsx components/capacitaciones/viewer.module.css "app/ver-capacitacion/[slug]/page.tsx" "app/capacitaciones/ver/[slug]/page.tsx"
git commit -m "feat(capacitaciones): página de la animación con Entendí / Tengo dudas y vista previa"
```

---

## Fase 4 — Panel: admin, practicante, menú y cron

### Task 7: sincronización y avisos en el servidor (cron)

**Files:**
- Create: `lib/capacitaciones/server.ts`
- Modify: `app/api/reminders/route.ts`

- [ ] **Step 1: `lib/capacitaciones/server.ts`**

```ts
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CATALOG } from './catalog';
import { catalogSyncPlan, type DbTraining } from './sync';
import { groupClaims, noticeText, inNoticeHours, type NoticeClaim } from './notices';
import { personTargets, type DeviceRow, type EmployeeTokenRow } from '@/lib/push-targets';
import { pushExpo } from '@/lib/expo-push';

/** Deja `trainings` igual que el catálogo: altas pausadas, títulos y versiones (sólo hacia arriba). */
export async function syncCatalog(db: SupabaseClient): Promise<string[]> {
  const { data, error } = await db.from('trainings').select('id, slug, title, version, sort_order');
  if (error) return [`catálogo: ${error.message}`];
  const plan = catalogSyncPlan(CATALOG, (data ?? []) as DbTraining[]);
  const log: string[] = [];
  if (plan.inserts.length) {
    const r = await db.from('trainings').upsert(plan.inserts, { onConflict: 'slug', ignoreDuplicates: true });
    log.push(r.error ? `catálogo alta: ${r.error.message}` : `catálogo: ${plan.inserts.length} nuevas (pausadas)`);
  }
  for (const { id, ...patch } of plan.updates) {
    let q = db.from('trainings').update(patch).eq('id', id);
    if (patch.version !== undefined) q = q.lt('version', patch.version);
    const r = await q;
    log.push(r.error ? `catálogo ${id}: ${r.error.message}` : `catálogo: ${id} al día`);
  }
  return log;
}

/** Para el cron (cada 5 min): sincroniza y, de 9 a 19 h, manda los avisos que tocan (uno por persona). */
export async function runTrainingTick(db: SupabaseClient, now = new Date()): Promise<string[]> {
  const log = await syncCatalog(db);
  if (!inNoticeHours(now)) return log;
  const { data, error } = await db.rpc('cap_claim_notices', { p_now: now.toISOString() });
  if (error) { log.push(`capacitación avisos: ${error.message}`); return log; }
  const groups = groupClaims((data ?? []) as NoticeClaim[]);
  if (!groups.length) return log;
  const [{ data: devices }, { data: emps }] = await Promise.all([
    db.from('device_tokens').select('*'),
    db.from('employees').select('id, company_id, push_token').eq('is_active', true).not('push_token', 'is', null),
  ]);
  for (const g of groups) {
    const tokens = personTargets(g.companyId, g.employeeId, (devices ?? []) as DeviceRow[], (emps ?? []) as EmployeeTokenRow[]);
    const { title, body } = noticeText(g, now);
    await pushExpo(tokens, title, body);
    log.push(`capacitación → ${g.name}: ${g.news.length} nuevas, ${g.dues.length} por vencer (${tokens.length} tel.)`);
  }
  return log;
}
```

- [ ] **Step 2: `app/api/reminders/route.ts`.**
  - Importar `runTrainingTick`.
  - Después del bloque de `checklist` (y **antes** del `if (nowMin > END_OF_DAY)`):

```ts
  // Capacitaciones: alta del catálogo y avisos (nuevas / por vencer). Si falla, no tumba lo demás.
  let trainings: string[] = [];
  try { trainings = await runTrainingTick(supabase, new Date()); }
  catch (e) { trainings = [`capacitaciones error: ${(e as Error).message}`]; }
```

  - Agregar `trainings` a los dos `NextResponse.json` (el de "fuera de jornada" y el final).

- [ ] **Step 3:** `npx tsc --noEmit` y `npx jest` → sin errores.
- [ ] **Step 4: Commit** — `git add lib/capacitaciones/server.ts app/api/reminders/route.ts` · `feat(capacitaciones): el cron da de alta el catálogo y manda avisos`

### Task 8: página "Capacitación" del admin

**Files:**
- Create: `app/capacitaciones/actions.ts`, `app/capacitaciones/page.tsx`
- Create: `components/capacitaciones/Matrix.tsx`, `components/capacitaciones/DoubtList.tsx`, `components/capacitaciones/TrainingSettings.tsx`, `components/capacitaciones/capacitaciones.module.css`

- [ ] **Step 1: `app/capacitaciones/actions.ts`**

```ts
'use server';

import { adminAccess, fail, OK, type Result } from '@/lib/admin-access';
import { allows, isUuid } from '@/lib/access-rules';
import { supabaseAdmin as admin } from '@/lib/supabase';
import { syncCatalog } from '@/lib/capacitaciones/server';
import type { CapRow } from '@/lib/capacitaciones/status';

export interface TrainingConfig {
  id: string; slug: string; title: string; sort_order: number; is_active: boolean;
  deadline_days: number; min_seconds: number; version: number; published_at: string | null;
}
export type LoadResult = { ok: true; trainings: TrainingConfig[]; rows: CapRow[] } | { ok: false; error: string };

/** Todo lo de la página: ajustes de las 13 y la tabla (de las empresas que puede ver). */
export async function loadTrainingAdmin(): Promise<LoadResult> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const db = admin();
  await syncCatalog(db);
  const [t, m] = await Promise.all([
    db.from('trainings').select('id, slug, title, sort_order, is_active, deadline_days, min_seconds, version, published_at').order('sort_order'),
    db.rpc('cap_matrix'),
  ]);
  if (t.error) return { ok: false, error: t.error.message };
  if (m.error) return { ok: false, error: m.error.message };
  const rows = ((m.data ?? []) as CapRow[]).filter(r => allows(a.own, r.company_id));
  return { ok: true, trainings: (t.data ?? []) as TrainingConfig[], rows };
}

export async function saveTraining(id: string, patch: { is_active?: boolean; deadline_days?: number; min_seconds?: number }): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  if (!isUuid(id)) return fail('No encontrada');
  const clean: Record<string, unknown> = {};
  if (typeof patch.is_active === 'boolean') clean.is_active = patch.is_active;
  if (patch.deadline_days !== undefined) {
    if (!Number.isInteger(patch.deadline_days) || patch.deadline_days < 1 || patch.deadline_days > 60) return fail('El plazo va de 1 a 60 días.');
    clean.deadline_days = patch.deadline_days;
  }
  if (patch.min_seconds !== undefined) {
    if (!Number.isInteger(patch.min_seconds) || patch.min_seconds < 5 || patch.min_seconds > 600) return fail('El tiempo va de 5 a 600 segundos.');
    clean.min_seconds = patch.min_seconds;
  }
  if (!Object.keys(clean).length) return OK;
  const { error } = await admin().from('trainings').update(clean).eq('id', id);
  return error ? fail(error.message) : OK;
}

/** Sube (-1) o baja (+1) una capacitación en el orden: intercambia con la vecina. */
export async function moveTraining(id: string, dir: -1 | 1): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const db = admin();
  const { data, error } = await db.from('trainings').select('id, sort_order').order('sort_order').order('title');
  if (error) return fail(error.message);
  const list = (data ?? []) as { id: string; sort_order: number }[];
  const i = list.findIndex(x => x.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return OK;
  // Renumera 1..n con el cambio: así no quedan órdenes repetidos.
  [list[i], list[j]] = [list[j], list[i]];
  for (let k = 0; k < list.length; k++) {
    if (list[k].sort_order === k + 1) continue;
    const r = await db.from('trainings').update({ sort_order: k + 1 }).eq('id', list[k].id);
    if (r.error) return fail(r.error.message);
  }
  return OK;
}

/** "Ya lo capacité": cierra la duda. Sólo empleados de una empresa que este admin puede ver. */
export async function markTrained(trainingId: string, employeeId: string): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  if (!isUuid(trainingId) || !isUuid(employeeId)) return fail('No encontrado');
  const db = admin();
  const { data: e } = await db.from('employees').select('company_id').eq('id', employeeId).maybeSingle();
  if (!e || !allows(a.own, e.company_id)) return fail('No encontrado');
  const { data, error } = await db.rpc('cap_mark_trained', { p_training: trainingId, p_employee: employeeId, p_by: a.session.name ?? 'Admin' });
  if (error) return fail(error.message);
  const r = data as { ok: boolean; error?: string };
  return r.ok ? OK : fail(r.error ?? 'No se pudo.');
}

/** Numerito del menú: dudas abiertas de gente de esa empresa. */
export async function pendingDoubtCount(companyId: string): Promise<number> {
  const a = await adminAccess();
  if (!a.ok || !allows(a.own, companyId)) return 0;
  const { data } = await admin().rpc('cap_matrix');
  return ((data ?? []) as CapRow[]).filter(r => r.company_id === companyId && r.status === 'doubt').length;
}
```

Revisar que `allows` y `isUuid` existan con esa firma en `lib/access-rules.ts` (los usa `app/firmas/actions.ts`). Si `adminAccess()` regresa `{ ok: false, error }`, se devuelve tal cual (tiene la forma de `Result`).

- [ ] **Step 2: `app/capacitaciones/page.tsx`** (`'use client'`, mismo esqueleto que `app/firmas/page.tsx`)
  - Arriba, `AdminShell`, `s.page`, `s.top` con eyebrow `{empresa} · Capacitación`, título "Capacitación" y sub "Quién ya vio cada proceso y quién necesita que se lo expliques.".
  - Pestañas (botones redondos): **Avance** · **Por capacitar (N)** · **Ajustes**. La activa sale de `?tab=` (`avance` por defecto) y se cambia con `history.replaceState`.
  - `load()` llama a `loadTrainingAdmin()`. `rows` se filtra por `company.id` del selector (`useCompany().current`).
  - Avance → `<Matrix rows={rowsDeLaEmpresa} />`.
  - Por capacitar → `<DoubtList rows={openDoubts(rowsDeLaEmpresa)} onDone={async (t, e) => { const r = await markTrained(t, e); if (r.ok) { flash(...); await load(); } return r; }} />`.
  - Ajustes → `<TrainingSettings trainings={trainings} onSave={...saveTraining…} onMove={...moveTraining…} />`, y tras cada cambio, `load()`.
  - Si no hay ninguna activa: en Avance, un aviso *"Todavía no hay capacitaciones activas. Préndelas en Ajustes."* con un botón que lleva a Ajustes.

- [ ] **Step 3: `components/capacitaciones/Matrix.tsx`**
  - `buildMatrix(rows)` y una `<table>` dentro de un contenedor con `overflow-x: auto`.
  - Primera columna (persona) `position: sticky; left: 0` con fondo.
  - Encabezado de columna: título (2 líneas máximo, 104 px de ancho) y debajo `done/total`.
  - Celda: un botón de 36×36 con símbolo y color por estado. Su `aria-label` es `"{Nombre} · {Título}: {STATUS_LABEL}"`.

    | Estado | Símbolo | Color |
    |---|---|---|
    | pending | · | gris `#A0A0A7` |
    | overdue | ! | `var(--st-miss)` |
    | understood | ✓ | `var(--st-ok)` |
    | doubt | ? | `var(--st-late)` |
    | trained | ✓ con anillo | `var(--st-ok-ink)` |

  - Última columna: `done/total` de la persona.
  - Al tocar una celda se abre, debajo de la tabla, un panel con persona, capacitación, estado, plazo (`dueLabel`), contestada (fecha), nota, vistas y "capacitado por X el …".
  - Leyenda de los 5 estados arriba de la tabla.
  - Agrupado por empresa sólo si hay dos (admin sin empresa fija): un renglón separador con el nombre.

- [ ] **Step 4: `components/capacitaciones/DoubtList.tsx`**
  - Tarjetas, de la más vieja a la más nueva, con persona, capacitación, nota entre comillas (o *"Sin nota"*), *"desde el sáb 21"* y el botón **"Ya lo capacité"**.
  - Al tocar el botón se confirma en la misma tarjeta: *"¿Ya le explicaste {título} a {nombre}?"*, [Sí, ya] [Cancelar].
  - Vacío: *"No hay dudas pendientes."*

- [ ] **Step 5: `components/capacitaciones/TrainingSettings.tsx`**
  - Un renglón por capacitación, en orden, con:
    - interruptor activa/pausada (`role="switch"`, `aria-checked`);
    - título y `v{version}`;
    - plazo (`input type=number`, 1–60, guarda al salir del campo o con Enter);
    - tiempo mínimo (5–600, igual);
    - ↑ ↓;
    - "Ver" (enlace a `/capacitaciones/ver/{slug}`).
  - Abajo, una nota: *"Al prender una, a todos les llega un aviso y su plazo empieza hoy. Si prendes varias juntas, a cada quien le llega un solo aviso."*
  - Los errores de guardar salen junto al renglón.
  - En celular, los campos van debajo del título (el renglón se vuelve tarjeta).

- [ ] **Step 6: `capacitaciones.module.css`**
  - Mismos tokens que `components/panel/panel.module.css`: `var(--st-*)`, tarjetas `s.card`, botones `s.btn`.
  - Toques de 44 px como mínimo; sin barra horizontal de la página a 390 px (sólo la tabla se desliza).

- [ ] **Step 7: Revisar en pantalla.**
  - Compilación de producción + cookie de admin, como en la Task 6. Con la base de producción sin la 011, `loadTrainingAdmin` regresa el error de la tabla y la página lo enseña: está bien.
  - Las acciones corren en el servidor, así que Playwright no las puede simular. El contenido de las pestañas se revisa con un arnés esbuild en el scratchpad que monta `Matrix`, `DoubtList` y `TrainingSettings` con filas de ejemplo (las de la prueba de la Task 3), a 390 y 1280 px.

- [ ] **Step 8:** `npx jest` + `npx tsc --noEmit`. **Commit** — los 6 archivos · `feat(capacitaciones): página del admin — avance, por capacitar y ajustes`

### Task 9: "Mis capacitaciones" de la practicante

**Files:**
- Create: `app/mis-capacitaciones/actions.ts`, `app/mis-capacitaciones/page.tsx`, `app/mis-capacitaciones/[slug]/page.tsx`

- [ ] **Step 1: `app/mis-capacitaciones/actions.ts`**

```ts
'use server';

import { getSession } from '@/lib/auth';
import { supabaseAdmin as admin } from '@/lib/supabase';
import { catalogBySlug } from '@/lib/capacitaciones/catalog';
import type { TrainingStatus } from '@/lib/capacitaciones/status';

export interface MyTraining { id: string; slug: string; title: string; sort_order: number; version: number; status: TrainingStatus; deadline: string; answered_at: string | null }
export type MyList = { ok: true; items: MyTraining[] } | { ok: false; error: string };
export type MyOpen =
  | { ok: true; token: string; title: string; minSeconds: number; employeeName: string; previous: { status: TrainingStatus; answeredAt: string } | null }
  | { ok: false; error: string };

const NO_EMP = 'Tu usuario no está vinculado a un empleado. Pídeselo a un administrador.';

export async function myTrainings(): Promise<MyList> {
  const s = await getSession();
  if (!s) return { ok: false, error: 'Tu sesión terminó. Vuelve a entrar.' };
  if (!s.employeeId) return { ok: false, error: NO_EMP };
  const { data, error } = await admin().rpc('cap_list', { p_employee: s.employeeId });
  if (error) return { ok: false, error: error.message };
  return { ok: true, items: (data ?? []) as MyTraining[] };
}

/** Abre una capacitación para el empleado de la sesión (crea su sesión, como el teléfono). */
export async function openMyTraining(slug: string): Promise<MyOpen> {
  const s = await getSession();
  if (!s) return { ok: false, error: 'Tu sesión terminó. Vuelve a entrar.' };
  if (!s.employeeId) return { ok: false, error: NO_EMP };
  if (!catalogBySlug(slug)) return { ok: false, error: 'No existe esa capacitación.' };
  const db = admin();
  const { data: t } = await db.from('trainings').select('id, title, min_seconds, version').eq('slug', slug).maybeSingle();
  if (!t) return { ok: false, error: 'No existe esa capacitación.' };
  const { data, error } = await db.rpc('cap_open', { p_training: t.id, p_employee: s.employeeId, p_source: 'panel' });
  if (error) return { ok: false, error: error.message };
  const r = data as { ok: boolean; error?: string; session?: string };
  if (!r.ok || !r.session) return { ok: false, error: r.error ?? 'No se pudo abrir.' };
  const [{ data: e }, { data: p }] = await Promise.all([
    db.from('employees').select('name').eq('id', s.employeeId).maybeSingle(),
    db.from('training_progress').select('status, answered_at').eq('training_id', t.id).eq('employee_id', s.employeeId).eq('version', t.version).maybeSingle(),
  ]);
  return {
    ok: true, token: r.session, title: t.title as string, minSeconds: t.min_seconds as number,
    employeeName: (e?.name as string | undefined) ?? (s.name ?? ''),
    previous: p ? { status: p.status as TrainingStatus, answeredAt: p.answered_at as string } : null,
  };
}

/** Numerito del menú de la practicante: por ver + atrasadas. */
export async function myPendingCount(): Promise<number> {
  const r = await myTrainings();
  return r.ok ? r.items.filter(i => i.status === 'pending' || i.status === 'overdue').length : 0;
}
```

- [ ] **Step 2: `app/mis-capacitaciones/page.tsx`** (`'use client'`)
  - Arriba, `AdminShell`, `s.page`, `s.top`: eyebrow `Mis capacitaciones`, título "Mis capacitaciones" y sub *"{done} de {total} listas"*.
  - Barra de avance.
  - Lista agrupada:
    - "Por ver" (atrasadas primero y luego por orden), con *"Atrasada · venció el…"* en rojo o *"Por ver · vence el…"*;
    - "Con dudas" (*"El Ing. te la va a explicar"*);
    - "Listas" (Entendida / Capacitado en persona).
  - Cada una es un `Link` a `/mis-capacitaciones/{slug}`. Error (sin empleado) → el texto del error. Vacía → *"Por ahora no hay capacitaciones."*

- [ ] **Step 3: `app/mis-capacitaciones/[slug]/page.tsx`** (`'use client'`)
  - Toma `slug` con `useParams()`.
  - Al montar llama a `openMyTraining(slug)` **una vez**: un `useRef` evita el doble llamado del modo estricto. Abrir crea una fila, por eso no se hace en el render del servidor (el prefetch la crearía sin que nadie la vea).
  - Mientras carga, "Cargando…". Si hay error, su texto y "Volver".
  - Si sale bien: `<AdminShell><div style={{ overflowY: 'auto', height: '100%' }}><TrainingViewer slug={slug} title={r.title} employeeName={r.employeeName} minSeconds={r.minSeconds} token={r.token} previous={r.previous} embedded back={{ href: '/mis-capacitaciones', label: 'Volver a mis capacitaciones' }} /></div></AdminShell>`.

- [ ] **Step 4:** `npx jest` + `npx tsc --noEmit`. **Commit** — los 3 archivos · `feat(capacitaciones): Mis capacitaciones de la practicante`

### Task 10: menú con numeritos

**Files:**
- Modify: `components/AdminShell.tsx`

- [ ] **Step 1:**
  - Importar `pendingDoubtCount` de `@/app/capacitaciones/actions` y `myPendingCount` de `@/app/mis-capacitaciones/actions`.
  - En `NAV`, después de Conoce: `{ href: '/capacitaciones', label: 'Capacitación', icon: IconCap }`.
  - En `INTERN_NAV_ITEMS`, después de Mis actividades: `{ href: '/mis-capacitaciones', label: 'Mis capacitaciones', icon: IconCap }`. Actualizar el comentario del menú del practicante.
  - Estado `capBadge`:

```ts
  // Numerito de Capacitación: dudas abiertas (admin) o por ver + atrasadas (practicante).
  const [capBadge, setCapBadge] = useState(0);
  useEffect(() => {
    let alive = true;
    const p = isIntern ? myPendingCount() : current ? pendingDoubtCount(current.id) : Promise.resolve(0);
    p.then(n => { if (alive) setCapBadge(n); }).catch(() => {});
    return () => { alive = false; };
  }, [current, isIntern, path]);
```

  - En el `map` del menú, junto a los otros numeritos: `{(href === '/capacitaciones' || href === '/mis-capacitaciones') && capBadge > 0 && (<span aria-label={`${capBadge} pendientes`} style={…mismo estilo…}>{capBadge}</span>)}`.
  - Ícono (birrete):

```tsx
function IconCap({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></svg>;
}
```

- [ ] **Step 2:** Revisar que `path.startsWith('/capacitaciones')` no marque activa "Mis capacitaciones" ni al revés (son rutas distintas).
- [ ] **Step 3:** `npx jest` + `npx tsc --noEmit`. **Commit** — `feat(capacitaciones): entradas del menú con numerito`

---

## Fase 5 — App de teléfonos (`laferre-actividades`, rama `capacitaciones`)

### Task 11: reglas puras y llamadas

**Files:**
- Create: `lib/training.ts`, `lib/trainingApi.ts`, `lib/trainingBadge.ts`, `lib/__tests__/training.test.ts`

- [ ] **Step 1: Prueba que falla** (`lib/__tests__/training.test.ts`)

```ts
import { dueLabel, trainingSummary, rowLabel, homeCard, trainingUrl, sortForList, type TrainingItem } from '../training';

const it0 = (p: Partial<TrainingItem>): TrainingItem => ({ id: 't', slug: 'a', title: 'A', sort_order: 1, version: 1, status: 'pending', deadline: '2026-11-27T06:00:00.000Z', answered_at: null, ...p });
const now = new Date('2026-11-21T18:00:00Z');

it('plazos como el panel', () => {
  expect(dueLabel('2026-11-27T06:00:00.000Z', now)).toBe('vence el jue 26');
  expect(dueLabel('2026-11-27T06:00:00.000Z', new Date('2026-11-27T07:00:00Z'))).toBe('venció el jue 26');
});
it('resumen, etiquetas y tarjeta de Hoy', () => {
  const items = [it0({}), it0({ id: 'b', status: 'overdue' }), it0({ id: 'c', status: 'understood' }), it0({ id: 'd', status: 'doubt' }), it0({ id: 'e', status: 'trained' })];
  expect(trainingSummary(items)).toEqual({ total: 5, done: 2, open: 2, overdue: 1, doubts: 1 });
  expect(rowLabel(items[0], now)).toBe('Por ver · vence el jue 26');
  expect(rowLabel(items[3], now)).toBe('Con dudas · el Ing. te la va a explicar');
  expect(homeCard(trainingSummary(items))).toEqual({ text: '1 capacitación atrasada', late: true });
  expect(homeCard(trainingSummary([it0({}), it0({ id: 'x' })]))).toEqual({ text: 'Tienes 2 capacitaciones por ver', late: false });
  expect(homeCard(trainingSummary([it0({ status: 'understood' })]))).toBeNull();
});
it('orden: atrasadas, por ver, con dudas, listas', () => {
  const s = sortForList([it0({ id: 'l', status: 'understood', sort_order: 1 }), it0({ id: 'p', sort_order: 3 }), it0({ id: 'o', status: 'overdue', sort_order: 9 }), it0({ id: 'd', status: 'doubt', sort_order: 2 })]);
  expect(s.map(x => x.id)).toEqual(['o', 'p', 'd', 'l']);
});
it('enlace', () => {
  expect(trainingUrl('https://x.app', 'gas-estufa', 'abc')).toBe('https://x.app/ver-capacitacion/gas-estufa?s=abc');
});
```

- [ ] **Step 2: Correr** `npx jest lib/__tests__/training.test.ts` → FAIL.

- [ ] **Step 3: `lib/training.ts`**
  - Mismos `TrainingStatus`, `STATUS_LABEL`, `isDone`/`isOpen` y **la misma `dueLabel`** que `laferre-admin/lib/capacitaciones/status.ts` (copiada; son repos distintos). Encima, el comentario "copia de laferre-admin/lib/capacitaciones/status.ts: cambiar las dos".
  - Además:

```ts
export interface TrainingItem { id: string; slug: string; title: string; sort_order: number; version: number; status: TrainingStatus; deadline: string; answered_at: string | null }

export function trainingSummary(items: TrainingItem[]) {
  const st = items.map(i => i.status);
  return { total: st.length, done: st.filter(isDone).length, open: st.filter(isOpen).length,
           overdue: st.filter(s => s === 'overdue').length, doubts: st.filter(s => s === 'doubt').length };
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function rowLabel(i: TrainingItem, now: Date): string {
  switch (i.status) {
    case 'pending': return `Por ver · ${dueLabel(i.deadline, now)}`;
    case 'overdue': return `Atrasada · ${dueLabel(i.deadline, now)}`;
    case 'doubt': return 'Con dudas · el Ing. te la va a explicar';
    default: return STATUS_LABEL[i.status];
  }
}

export function homeCard(s: ReturnType<typeof trainingSummary>): { text: string; late: boolean } | null {
  if (s.overdue > 0) return { text: s.overdue === 1 ? '1 capacitación atrasada' : `${s.overdue} capacitaciones atrasadas`, late: true };
  if (s.open > 0) return { text: s.open === 1 ? 'Tienes 1 capacitación por ver' : `Tienes ${s.open} capacitaciones por ver`, late: false };
  return null;
}

const RANK: Record<TrainingStatus, number> = { overdue: 0, pending: 1, doubt: 2, understood: 3, trained: 3 };
export function sortForList(items: TrainingItem[]): TrainingItem[] {
  return [...items].sort((a, b) => RANK[a.status] - RANK[b.status] || a.sort_order - b.sort_order);
}

export function trainingUrl(panel: string, slug: string, session: string): string {
  return `${panel}/ver-capacitacion/${encodeURIComponent(slug)}?s=${encodeURIComponent(session)}`;
}
```

  (`cap` se usa en la pantalla; si no, quitarlo.)

- [ ] **Step 4: `lib/trainingApi.ts`**

```ts
import { supabase } from './supabase';
import { trainingUrl, type TrainingItem } from './training';

// Capacitaciones (supabase/011 del panel). La lista y la sesión salen de cap_list / cap_open;
// la animación se ve en el navegador, en la página del panel.
export const PANEL_URL = 'https://laferre-admin.vercel.app';
const OFFLINE = 'No hay conexión. Intenta de nuevo.';

/** null = no se pudo leer (sin conexión o la base todavía sin la 011). */
export async function loadTrainings(employeeId: string): Promise<TrainingItem[] | null> {
  const { data, error } = await supabase.rpc('cap_list', { p_employee: employeeId });
  if (error || !Array.isArray(data)) return null;
  return data as TrainingItem[];
}

export async function openTraining(trainingId: string, employeeId: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc('cap_open', { p_training: trainingId, p_employee: employeeId, p_source: 'app' });
  if (error) return { ok: false, error: OFFLINE };
  const r = data as { ok: boolean; error?: string; session?: string; slug?: string };
  if (!r?.ok || !r.session || !r.slug) return { ok: false, error: r?.error ?? 'No se pudo abrir.' };
  return { ok: true, url: trainingUrl(PANEL_URL, r.slug, r.session) };
}
```

- [ ] **Step 5: `lib/trainingBadge.ts`**

```ts
import { useSyncExternalStore } from 'react';

// Numerito de la pestaña Capacitación (por ver + atrasadas). Lo actualizan Hoy y la pestaña al cargar.
let count = 0;
const subs = new Set<() => void>();
export function setTrainingBadge(n: number) { if (n === count) return; count = n; subs.forEach(f => f()); }
export function useTrainingBadge(): number {
  return useSyncExternalStore(cb => { subs.add(cb); return () => { subs.delete(cb); }; }, () => count, () => count);
}
```

- [ ] **Step 6:** `npx jest` → 39 + las nuevas, todo PASS. `npx tsc --noEmit` limpio.
- [ ] **Step 7: Commit** — `git add lib/training.ts lib/trainingApi.ts lib/trainingBadge.ts lib/__tests__/training.test.ts` · `feat(capacitaciones): reglas y llamadas de capacitación`

### Task 12: pestaña "Capacitación" con numerito

**Files:**
- Create: `app/(employee)/capacitacion.tsx`
- Modify: `app/(employee)/_layout.tsx`, `components/PanelTabBar.tsx`, `components/TabIcon.tsx`

- [ ] **Step 1: `components/TabIcon.tsx`.** `IconName` suma `'cap'`. Caso nuevo:

```tsx
    case 'cap':
      return (
        <Svg {...props}>
          <Path d="M22 10L12 5 2 10l10 5 10-5z" />
          <Path d="M6 12v5c3 2 9 2 12 0v-5" />
        </Svg>
      );
```

- [ ] **Step 2: `components/PanelTabBar.tsx`.** Dentro del `<View>` que envuelve el ícono, después del ícono:

```tsx
                {options.tabBarBadge != null && options.tabBarBadge !== '' && (
                  <View style={[styles.badge, focused && styles.badgeOnRed]} accessibilityLabel={`${options.tabBarBadge} pendientes`}>
                    <Text style={[styles.badgeTxt, focused && styles.badgeTxtOnRed]}>{String(options.tabBarBadge)}</Text>
                  </View>
                )}
```

Estilos:

```ts
  badge: { position: 'absolute', top: -6, right: -12, minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  badgeOnRed: { backgroundColor: '#FFFFFF' },
  badgeTxt: { fontFamily: font.bold, fontSize: 10.5, color: '#FFFFFF' },
  badgeTxtOnRed: { color: colors.accent },
```

A la etiqueta (`<Text style={[styles.label …]}>`) agregarle `numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}`, porque "Capacitación" es larga.

- [ ] **Step 3: `app/(employee)/_layout.tsx`.**
  - `const capBadge = useTrainingBadge();`
  - Entre `conoce` y `profile`:

```tsx
        <Tabs.Screen
          name="capacitacion"
          options={{
            title: 'Capacitación',
            tabBarIcon: ({ color }) => <TabIcon name="cap" color={color} />,
            tabBarBadge: capBadge > 0 ? capBadge : undefined,
          }}
        />
```

- [ ] **Step 4: `app/(employee)/capacitacion.tsx`.** Mismo look que Hoy: `PanelBackdrop`, `SafeAreaView`, `ScrollView`, encabezado con eyebrow `{COMPANY_LABEL} · CAPACITACIÓN` y título "Capacitaciones".
  - **Carga:**
    - `me = await getValidSession()`; si no hay, `router.replace('/employee-pick')`;
    - `items = await loadTrainings(me.id)`; `null` → error *"No se pudo cargar. Revisa tu conexión."* con botón "Reintentar";
    - `setTrainingBadge(trainingSummary(items).open)`;
    - se carga en `useFocusEffect` y con `AppState` → `'active'` (al regresar del navegador).
  - **Resumen:** *"{done} de {total} listas"* y una barra (verde = done).
  - **Lista** con `sortForList`, en secciones con subtítulo cuando cambia el grupo: "Por ver", "Con dudas", "Listas". Cada renglón es un `Pressable` de 64 px como mínimo:
    - círculo de 36 px con ícono por estado, de `components/Icon`:

      | Estado | Ícono | Colores |
      |---|---|---|
      | pending | `play` | `colors.ink05` / `ink50` |
      | overdue | `alert` | `missSoft` / `missInk` |
      | understood / trained | `check` | `okSoft` / `okInk` |
      | doubt | `user` | `lateSoft` / `lateInk` |

    - título (`font.semibold`, 15) y debajo `rowLabel(item, new Date())`, en rojo si está atrasada;
    - a la derecha, `chevron`. Con `opening === item.id`, un `ActivityIndicator`.
  - **Al tocar:** `setOpening(id)`; `const r = await openTraining(item.id, me.id)`; si sale bien, `await Linking.openURL(r.url)` (de `expo-linking`); si no, `Alert.alert('Capacitación', r.error)`. Al final `setOpening(null)`.
  - **Vacía:** *"Por ahora no hay capacitaciones."*
  - `accessibilityLabel` de cada renglón: `"{título}, {rowLabel}. Abrir"`.

- [ ] **Step 5:** `npx tsc --noEmit` + `npx jest`. **Commit** — los 4 archivos · `feat(capacitaciones): pestaña Capacitación con numerito`

### Task 13: tarjeta en Hoy

**Files:**
- Create: `components/TrainingCard.tsx`
- Modify: `app/(employee)/index.tsx`

- [ ] **Step 1: `components/TrainingCard.tsx`.** Copia el esqueleto de `InventoryCard.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, glass, font } from '../constants/theme';
import Icon from './Icon';

/** Tarjeta de Hoy cuando hay capacitaciones por ver: lleva a la pestaña Capacitación. */
export default function TrainingCard({ text, late, onOpen }: { text: string; late: boolean; onOpen: () => void }) {
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${text}. Ver capacitaciones`}
      style={({ pressed }) => [styles.card, glass, late && styles.cardLate, pressed && styles.pressed]}>
      <View style={[styles.icon, late && { backgroundColor: colors.missSoft }]}>
        <Icon name={late ? 'alert' : 'play'} size={20} color={late ? colors.missInk : colors.accent} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.eyebrow}>CAPACITACIÓN</Text>
        <Text style={[styles.title, late && { color: colors.missInk }]}>{text}</Text>
        <Text style={styles.sub}>Mira cada proceso y confirma que lo entendiste.</Text>
      </View>
      <View style={styles.go}><Text style={styles.goTxt}>Ver</Text><Icon name="chevron" size={14} color="#fff" stroke={2.6} /></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 14, borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardLate: { borderColor: 'rgba(225,29,46,0.35)' },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(225,29,46,0.1)', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 1.3, color: colors.ink50 },
  title: { marginTop: 2, fontFamily: font.bold, fontSize: 16, letterSpacing: -0.3, color: colors.ink },
  sub: { marginTop: 1, fontFamily: font.medium, fontSize: 12.5, color: colors.ink50 },
  go: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 38, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.ink },
  goTxt: { fontFamily: font.bold, fontSize: 13, color: '#fff' },
});
```

- [ ] **Step 2: `app/(employee)/index.tsx`.**
  - Estado: `const [train, setTrain] = useState<{ text: string; late: boolean } | null>(null);`.
  - En `loadData`, sumar `loadTrainings(me.id).catch(() => null)` al `Promise.all`, como sexto valor `trainItems`. Luego:

```ts
    if (trainItems) { const s = trainingSummary(trainItems); setTrain(homeCard(s)); setTrainingBadge(s.open); }
```

  - Pintar `{train && <Appear delay={130}><TrainingCard text={train.text} late={train.late} onOpen={() => router.push('/capacitacion' as any)} /></Appear>}` en las dos ramas: debajo de `InventoryCard` en la de "no tienes actividades" y en la normal.

- [ ] **Step 3: Revisar en pantalla (web con base simulada).**
  - Como `scratchpad/app-lista.cjs`: `npx expo export --platform web --output-dir dist-prueba` y servir `dist-prueba`.
  - Con Playwright, interceptar `**/rest/v1/rpc/cap_list` (3 ítems: overdue, pending, understood) y `**/rest/v1/rpc/cap_open` (`{ ok:true, session:'s1', slug:'fregadero' }`), además de lo que ya simulaba `app-lista.cjs`.
  - Revisar a 390×844:
    - tarjeta en Hoy;
    - numerito "2" en la pestaña, que cabe junto a "Capacitación";
    - la pestaña con secciones;
    - al tocar, `Linking.openURL` (en web abre una pestaña nueva con la URL esperada).
  - Capturas en el scratchpad.

- [ ] **Step 4:** `npx tsc --noEmit` + `npx jest`. **Commit** — `feat(capacitaciones): tarjeta en Hoy`

---

## Fase 6 — Revisión y entrega

### Task 14: revisión de código

- [ ] Revisión completa de las dos ramas (`/code-review` o un revisor con las dos diferencias contra `main` y `master`). Revisar en especial:
  - permisos de la 011 (anon no lee tablas ni llama funciones de servicio);
  - que la página pública no filtre datos de otros;
  - el `matcher` del middleware;
  - las acciones con `adminAccess`;
  - el doble llamado de `openMyTraining`.
- [ ] Arreglar lo confirmado, con un commit por arreglo, y volver a correr: PGlite (011 + prueba), `npx jest` y `npx tsc --noEmit` en los dos repos.

### Task 15: memoria y entrega al dueño

- [ ] Escribir `C:\Users\jose_\bfm-memoria\memoria\laferre-capacitaciones.md`: diseño, plan, ramas, qué falta, y el aviso de que la fuente de animaciones es la carpeta "actualizado". Agregar su renglón a `MEMORY.md`.
- [ ] Decirle al dueño, en español y sencillo:
  1. Que corra `supabase/011_capacitaciones.sql` y luego `011_capacitaciones_prueba.sql` en Supabase. Debe salir el error "RESULTADOS…" con todo en OK; que mande foto.
  2. Cuando diga "súbelo": merge a `main` y push del panel (como la lista con firma), y comprobar el despliegue (huellas).
  3. Cuando diga "sí, mándala": merge a `master` y `npm run actualizar` en la app.
  4. Ya en producción, que entre a Capacitación → Ajustes, revise cada una con "Ver", ajuste tiempos y plazos, y las prenda.
