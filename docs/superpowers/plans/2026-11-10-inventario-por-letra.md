# Inventario por letra — Plan de implementación

> **Para quien ejecute:** se ejecuta en esta misma sesión (inline), tarea por tarea, con las casillas `- [ ]`.
> Diseño: `docs/superpowers/specs/2026-11-09-inventario-por-letra-design.md`.

**Objetivo:** rondas de inventario por letra de estante, que se abren solas cada N semanas; el empleado
llena una ficha por letra desde el teléfono (fotos del estante y del reporte de Sicar, estado, textos,
diferencias) y el dueño la revisa, pide rehacer y resuelve pendientes desde el panel.

**Arquitectura:** cinco tablas nuevas (`supabase/007_inventario.sql`). El teléfono sólo lee con la llave
pública y escribe con dos funciones `SECURITY DEFINER` (`inv_claim_section`, `inv_finish_section`) y
subiendo fotos al depósito `inventario` (política: sólo a fichas en proceso de una ronda abierta). El panel
escribe con server actions (service_role) y las reglas de empresa de siempre. El cron de recordatorios
abre rondas y manda avisos usando funciones puras probadas (`lib/inventory-schedule.ts`).

**Tecnología:** Next.js 16 (App Router, CSS Modules, jest/ts-jest) · Supabase (Postgres, Storage) ·
Expo SDK 54 / React Native 0.81 (expo-router, AsyncStorage, expo-image-picker).

**Reglas de la casa que aplican:**
- Archivos `'use server'`: sólo funciones `async` exportadas y `export type Result = ActionResult`. Nunca
  `export type { … }` ni `export { … }` (la compilación de producción revienta el archivo). Los tipos
  compartidos van en `lib/inventory-types.ts` (archivo normal).
- Las acciones del panel se verifican con la compilación de producción (preview de Vercel con
  `AUTH_SECRET` de prueba), no sólo con `next dev`.
- jest de la app con `--runInBand`; export web con `--max-workers 1` y `NODE_OPTIONS=--max-old-space-size=2048`.
- Nunca `git add -A`: siempre la lista explícita de archivos.
- La base es la de producción: nada de crear rondas de prueba reales (el cron mandaría avisos a los
  teléfonos). Las pruebas de SQL van dentro de `begin … rollback`.

---

## Mapa de archivos

**laferre-admin**
| Archivo | Qué hace |
|---|---|
| `supabase/007_inventario.sql` (nuevo) | Tablas, índices, RLS, RPC, depósito y su política. |
| `supabase/007_inventario_prueba.sql` (nuevo) | Pruebas de las RPC como anon dentro de `begin … rollback`. |
| `lib/inventory-schedule.ts` (nuevo) | Funciones puras: fechas, vencimiento, estado, qué abrir y qué avisar. |
| `lib/__tests__/inventory-schedule.test.ts` (nuevo) | Pruebas de lo anterior. |
| `lib/inventory-types.ts` (nuevo) | Tipos de filas y de lo que regresa `loadInventory`. |
| `lib/expo-push.ts` (nuevo) | `pushExpo(tokens, title, body)` — sale de `app/api/reminders/route.ts`. |
| `lib/inventory-server.ts` (nuevo, server-only) | `openRound(...)` y `runInventoryTick(db, now)` para cron y acciones. |
| `app/api/reminders/route.ts` | Usa `pushExpo` y llama a `runInventoryTick`. |
| `app/inventario/actions.ts` (nuevo) | Server actions del inventario. |
| `app/inventario/page.tsx` (nuevo) | Página: Ronda actual · Pendientes · Historial · Configuración. |
| `components/inventario/*.tsx` + `inv.module.css` (nuevos) | Cuadrícula, ficha, pendientes, historial, configuración. |
| `components/AdminShell.tsx` | Entrada "Inventario" en el menú de administradores + numerito de pendientes. |
| `app/reportes/page.tsx`, `components/reportes/PeopleCard.tsx` | Letras de inventario por persona en la semana. |
| `lib/__tests__/use-server-exports.test.ts` | Ya cubre todos los `'use server'`; comprobar que incluye el nuevo archivo. |

**laferre-actividades**
| Archivo | Qué hace |
|---|---|
| `lib/inventory.ts` (nuevo) | Tipos + funciones puras: días que quedan, qué le falta a la ficha. |
| `lib/__tests__/inventory.test.ts` (nuevo) | Pruebas. |
| `lib/inventoryApi.ts` (nuevo) | Leer ronda/fichas, tomar letra, subir foto, terminar letra, borrador. |
| `components/InventoryCard.tsx` (nuevo) | Tarjeta del inicio. |
| `app/inventario/index.tsx` (nuevo) | Cuadrícula de letras. |
| `app/inventario/[id].tsx` (nuevo) | Ficha de la letra. |
| `app/(employee)/index.tsx` | Carga la ronda abierta y pinta la tarjeta. |

---

## Tarea 1: SQL — tablas, permisos, funciones y depósito

**Archivo:** crear `supabase/007_inventario.sql`.

- [ ] **Paso 1: escribir el SQL**

```sql
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
```

- [ ] **Paso 2: commit** — `git add supabase/007_inventario.sql && git commit -m "feat(inventario): SQL de tablas, permisos, funciones y depósito"`

## Tarea 2: SQL — pruebas como anon (sin dejar rastro)

**Archivo:** crear `supabase/007_inventario_prueba.sql`. Crea una ronda de prueba con una letra, prueba las
funciones como `anon` y termina con un ERROR a propósito que trae los resultados (el editor de Supabase no enseña los NOTICE) y deshace todo: nada queda en la base y el cron no la ve porque nunca se confirma.

- [ ] **Paso 1: escribir el script**

```sql
-- Pruebas del inventario. NO deja nada guardado: al final lanza un ERROR a propósito con
-- todos los resultados, y ese error deshace todo lo que hizo la prueba.
-- Correr DESPUÉS de 007_inventario.sql. Debe terminar en un error que empieza con
-- "RESULTADOS (no se guardó nada)": copiar ese texto completo.
do $$
declare
  co uuid; other_co uuid; emp uuid; emp2 uuid; other_emp uuid;
  rid uuid; sid uuid; res jsonb; p1 text; p2 text; n int; txt text;
  out text := '';
begin
  select id into co from companies where slug = 'laferre';
  select id into other_co from companies where slug = 'bfm';
  select id into emp from employees where company_id = co and is_active order by name limit 1;
  select id into emp2 from employees where company_id = co and is_active and id <> emp order by name limit 1;
  select id into other_emp from employees where company_id = other_co and is_active limit 1;

  insert into inventory_rounds (company_id, due_at, opened_by) values (co, now() + interval '7 days', 'prueba') returning id into rid;
  insert into inventory_sections (round_id, company_id, code, name) values (rid, co, 'ZZ', 'Prueba') returning id into sid;
  p1 := rid || '/' || sid || '/1700000000001.jpg';
  p2 := rid || '/' || sid || '/1700000000002.jpg';

  set local role anon;
  res := inv_claim_section(sid, other_emp, false);   out := out || E'\n1 (otra tienda → error): ' || res;
  res := inv_claim_section(sid, emp, false);         out := out || E'\n2 (tomar → ok): ' || res;
  res := inv_claim_section(sid, emp2, false);        out := out || E'\n3 (ocupada → busy): ' || res;
  res := inv_finish_section(sid, emp, p1, array[p2], 'bien', '', '', '', false, null, '');
  out := out || E'\n4 (fotos no subidas → error): ' || res;
  reset role;

  insert into storage.objects (bucket_id, name) values ('inventario', p1), ('inventario', p2);

  set local role anon;
  res := inv_finish_section(sid, emp, p1, array['otra/ruta/1700000000003.jpg'], 'bien', '', '', '', false, null, '');
  out := out || E'\n5 (foto ajena → error): ' || res;
  res := inv_finish_section(sid, emp, p1, array[p2], 'mal', '', '', '', false, null, '');
  out := out || E'\n6 (mal sin observaciones → error): ' || res;
  res := inv_finish_section(sid, emp, p1, array[p2], 'regular', 'Desordenado', '', '', true, false, '');
  out := out || E'\n7 (diferencias sin nota → error): ' || res;
  res := inv_finish_section(sid, emp2, p1, array[p2], 'bien', '', '', '', false, null, '');
  out := out || E'\n8 (no es quien la tomó → error): ' || res;
  res := inv_finish_section(sid, emp, p1, array[p2], 'regular', 'Desordenado', 'Separar tornillos', 'Se acomodó', true, false, 'Faltan 3 brocas 1/4');
  out := out || E'\n9 (terminar → ok, roundClosed true): ' || res;
  reset role;

  select count(*) into n from inventory_pendings where section_id = sid and resolved_at is null;
  out := out || E'\n10 (pendiente creado → 1): ' || n;
  select close_reason into txt from inventory_rounds where id = rid;
  out := out || E'\n11 (ronda cerrada → completed): ' || coalesce(txt, 'NULL');

  set local role anon;
  begin
    insert into inventory_rounds (company_id, due_at) values (co, now());
    out := out || E'\n12 (anon no inserta rondas): FALLÓ, sí pudo';
  exception when others then
    out := out || E'\n12 (anon no inserta rondas): ok, bloqueado';
  end;
  begin
    select count(*) into n from inventory_pendings;
    out := out || E'\n13 (anon no lee pendientes): FALLÓ, sí pudo leer (' || n || ')';
  exception when others then
    out := out || E'\n13 (anon no lee pendientes): ok, bloqueado';
  end;
  reset role;

  raise exception 'RESULTADOS (no se guardó nada):%', out;
end $$;
```

- [ ] **Paso 2: el dueño corre 007 y luego este script; se revisan las 13 líneas.** Si alguna no da lo esperado, se corrige el 007 antes de seguir.
- [ ] **Paso 3: commit** — `git add supabase/007_inventario_prueba.sql && git commit -m "test(inventario): pruebas de las funciones como anon con rollback"`

## Tarea 3: funciones puras del calendario (panel)

**Archivos:** crear `lib/inventory-schedule.ts` y `lib/__tests__/inventory-schedule.test.ts`.

- [ ] **Paso 1: escribir las pruebas**

```ts
import {
  addDays, dueDays, latestScheduled, lastDayOf, zonedToUtc, openingInstant, dueInstant,
  roundStatus, inventoryActions, monthLabel, dayLabel, type PlanRow, type OpenRoundInfo,
} from '../inventory-schedule';

const plan = (o: Partial<PlanRow> = {}): PlanRow => ({
  company_id: 'c1', every_weeks: 6, first_open_date: '2026-12-01', due_amount: 1, due_unit: 'weeks', is_active: true, ...o,
});

describe('fechas', () => {
  test('addDays cruza meses y años', () => {
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  test('dueDays en días o semanas', () => {
    expect(dueDays(plan({ due_amount: 5, due_unit: 'days' }))).toBe(5);
    expect(dueDays(plan({ due_amount: 2, due_unit: 'weeks' }))).toBe(14);
  });
  test('latestScheduled: la última fecha programada que ya llegó', () => {
    expect(latestScheduled(plan(), '2026-11-30')).toBeNull();
    expect(latestScheduled(plan(), '2026-12-01')).toBe('2026-12-01');
    expect(latestScheduled(plan(), '2027-01-11')).toBe('2026-12-01');
    expect(latestScheduled(plan(), '2027-01-12')).toBe('2027-01-12');
  });
  test('lastDayOf: con 1 semana, abre el 1 y el último día es el 7', () => {
    expect(lastDayOf('2026-12-01', plan())).toBe('2026-12-07');
    expect(lastDayOf('2026-12-01', plan({ due_amount: 1, due_unit: 'days' }))).toBe('2026-12-01');
  });
  test('zonedToUtc respeta el horario de verano de Matamoros', () => {
    expect(zonedToUtc('2026-12-01', 8 * 60).toISOString()).toBe('2026-12-01T14:00:00.000Z'); // CST −6
    expect(zonedToUtc('2026-07-01', 8 * 60).toISOString()).toBe('2026-07-01T13:00:00.000Z'); // CDT −5
  });
  test('apertura 08:00 y vencimiento 23:59:59 del último día', () => {
    expect(openingInstant('2026-12-01').toISOString()).toBe('2026-12-01T14:00:00.000Z');
    expect(dueInstant('2026-12-01', plan()).toISOString()).toBe('2026-12-08T05:59:59.000Z');
  });
  test('etiquetas en español', () => {
    expect(monthLabel('2026-12-01')).toBe('diciembre');
    expect(dayLabel('2026-12-07')).toBe('lunes 7'); // el 1 de diciembre de 2026 es martes
  });
});

describe('roundStatus', () => {
  const base = { due_at: '2026-12-08T05:59:59.000Z', closed_at: null, close_reason: null } as const;
  test('abierta y a tiempo / atrasada', () => {
    expect(roundStatus(base, new Date('2026-12-05T18:00:00Z'))).toBe('open');
    expect(roundStatus(base, new Date('2026-12-08T07:00:00Z'))).toBe('late');
  });
  test('terminada a tiempo, tarde, o cerrada incompleta', () => {
    expect(roundStatus({ ...base, closed_at: '2026-12-06T20:00:00Z', close_reason: 'completed' }, new Date())).toBe('done');
    expect(roundStatus({ ...base, closed_at: '2026-12-09T20:00:00Z', close_reason: 'completed' }, new Date())).toBe('doneLate');
    expect(roundStatus({ ...base, closed_at: '2027-01-12T14:00:00Z', close_reason: 'superseded' }, new Date())).toBe('incomplete');
  });
});

describe('inventoryActions', () => {
  const at = (iso: string) => new Date(iso);
  const open = (o: Partial<OpenRoundInfo> = {}): OpenRoundInfo => ({
    id: 'r1', opened_at: '2026-12-01T14:00:00Z', due_at: '2026-12-08T05:59:59.000Z', notices: {}, pending: 5, total: 18, ...o,
  });

  test('abre a las 08:00 del día programado, no antes', () => {
    expect(inventoryActions({ plan: plan(), open: null, lastScheduled: null, now: at('2026-12-01T13:55:00Z') })).toEqual([]);
    const acts = inventoryActions({ plan: plan(), open: null, lastScheduled: null, now: at('2026-12-01T14:00:00Z') });
    expect(acts).toEqual([{ kind: 'open', scheduledFor: '2026-12-01', dueAt: '2026-12-08T05:59:59.000Z', supersede: null }]);
  });
  test('no abre si ya existe la ronda de esa fecha, ni si el plan está pausado', () => {
    expect(inventoryActions({ plan: plan(), open: null, lastScheduled: '2026-12-01', now: at('2026-12-02T16:00:00Z') })).toEqual([]);
    expect(inventoryActions({ plan: plan({ is_active: false }), open: null, lastScheduled: null, now: at('2026-12-01T16:00:00Z') })).toEqual([]);
  });
  test('no abre una ronda vieja cuyo plazo ya pasó', () => {
    expect(inventoryActions({ plan: plan({ first_open_date: '2026-10-01' }), open: null, lastScheduled: null, now: at('2026-11-05T16:00:00Z') })).toEqual([]);
  });
  test('si llega la siguiente con la anterior abierta, cierra la anterior como incompleta', () => {
    const acts = inventoryActions({
      plan: plan(), open: open({ notices: { open: 'x' } }), lastScheduled: '2026-12-01', now: at('2027-01-12T14:05:00Z'),
    });
    expect(acts[0]).toEqual({ kind: 'open', scheduledFor: '2027-01-12', dueAt: '2027-01-19T05:59:59.000Z', supersede: 'r1' });
    expect(acts).toHaveLength(1);
  });
  test('aviso de apertura una sola vez', () => {
    const acts = inventoryActions({ plan: plan(), open: open(), lastScheduled: '2026-12-01', now: at('2026-12-01T14:05:00Z') });
    expect(acts).toEqual([{ kind: 'notice', key: 'open', title: 'Inventario de diciembre', body: 'Empezó el inventario: 18 letras, tienen hasta el lunes 7.' }]);
    expect(inventoryActions({ plan: plan(), open: open({ notices: { open: 'x' } }), lastScheduled: '2026-12-01', now: at('2026-12-01T14:10:00Z') })).toEqual([]);
  });
  test('aviso diario a las 10:00 desde el segundo día, mientras falten letras', () => {
    const o = open({ notices: { open: 'x' } });
    expect(inventoryActions({ plan: plan(), open: o, lastScheduled: '2026-12-01', now: at('2026-12-01T16:30:00Z') })).toEqual([]);
    expect(inventoryActions({ plan: plan(), open: o, lastScheduled: '2026-12-01', now: at('2026-12-03T16:00:00Z') })).toEqual([
      { kind: 'notice', key: 'daily:2026-12-03', title: 'Inventario', body: 'Faltan 5 letras del inventario, quedan 5 días.' },
    ]);
    expect(inventoryActions({ plan: plan(), open: { ...o, notices: { open: 'x', 'daily:2026-12-03': 'x' } }, lastScheduled: '2026-12-01', now: at('2026-12-03T16:05:00Z') })).toEqual([]);
    expect(inventoryActions({ plan: plan(), open: { ...o, pending: 0 }, lastScheduled: '2026-12-01', now: at('2026-12-03T16:00:00Z') })).toEqual([]);
  });
  test('el último día: aviso de las 10 y de la 1', () => {
    const o = open({ notices: { open: 'x', 'daily:2026-12-07': 'x' }, pending: 1 });
    expect(inventoryActions({ plan: plan(), open: o, lastScheduled: '2026-12-01', now: at('2026-12-07T19:00:00Z') })).toEqual([
      { kind: 'notice', key: 'last:2026-12-07', title: 'Inventario: hoy es el último día', body: 'Falta 1 letra del inventario.' },
    ]);
  });
  test('atrasado: el aviso diario lo dice', () => {
    const o = open({ notices: { open: 'x' }, pending: 2 });
    expect(inventoryActions({ plan: plan(), open: o, lastScheduled: '2026-12-01', now: at('2026-12-09T16:00:00Z') })).toEqual([
      { kind: 'notice', key: 'daily:2026-12-09', title: 'Inventario atrasado', body: 'El inventario ya venció: faltan 2 letras.' },
    ]);
  });
  test('sin avisos de noche', () => {
    const o = open({ notices: {} });
    expect(inventoryActions({ plan: plan(), open: o, lastScheduled: '2026-12-01', now: at('2026-12-02T03:00:00Z') })).toEqual([]);
  });
  test('ronda abierta a mano (sin plan) también avisa', () => {
    const acts = inventoryActions({ plan: null, open: open(), lastScheduled: null, now: at('2026-12-01T15:00:00Z') });
    expect(acts[0].kind).toBe('notice');
  });
});
```

- [ ] **Paso 2: correr y ver que fallan** — `npx jest lib/__tests__/inventory-schedule.test.ts` → falla (no existe el módulo).

- [ ] **Paso 3: escribir `lib/inventory-schedule.ts`**

```ts
// Calendario del inventario por letra: reglas puras (se prueban sin servidor ni base).
// Las usan el cron (/api/reminders → lib/inventory-server.ts) y el panel.
import { shopClock, SHOP_TZ } from './my-day';

export interface PlanRow {
  company_id: string;
  every_weeks: number;
  first_open_date: string;      // AAAA-MM-DD
  due_amount: number;
  due_unit: 'days' | 'weeks';
  is_active: boolean;
}

export interface OpenRoundInfo {
  id: string;
  opened_at: string;
  due_at: string;
  notices: Record<string, string>;
  pending: number;              // letras que no están hechas
  total: number;
}

export type InventoryAction =
  | { kind: 'open'; scheduledFor: string; dueAt: string; supersede: string | null }
  | { kind: 'notice'; key: string; title: string; body: string };

export type RoundStatus = 'open' | 'late' | 'done' | 'doneLate' | 'incomplete';

export const OPEN_AT = 8 * 60;       // 08:00
export const DAILY_AT = 10 * 60;     // 10:00
export const LAST_DAY_AT = 13 * 60;  // 13:00
export const QUIET_AFTER = 20 * 60;  // sin avisos después de las 20:00

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const parts = (d: string) => d.split('-').map(Number) as [number, number, number];
const utcMs = (d: string) => { const [y, m, dd] = parts(d); return Date.UTC(y, m - 1, dd); };
const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function addDays(d: string, n: number): string { return fmt(utcMs(d) + n * 86_400_000); }
export function daysBetween(a: string, b: string): number { return Math.round((utcMs(b) - utcMs(a)) / 86_400_000); }
export function dueDays(p: Pick<PlanRow, 'due_amount' | 'due_unit'>): number {
  return p.due_unit === 'weeks' ? p.due_amount * 7 : p.due_amount;
}

/** La última fecha programada (inicio + k·N semanas) que ya llegó; null si todavía no empieza. */
export function latestScheduled(p: Pick<PlanRow, 'first_open_date' | 'every_weeks'>, today: string): string | null {
  const diff = daysBetween(p.first_open_date, today);
  if (diff < 0) return null;
  const step = p.every_weeks * 7;
  return addDays(p.first_open_date, Math.floor(diff / step) * step);
}

/** Último día para terminar: apertura + plazo − 1 (con 1 semana, abre el día 1 → el 7). */
export function lastDayOf(openDate: string, p: Pick<PlanRow, 'due_amount' | 'due_unit'>): string {
  return addDays(openDate, dueDays(p) - 1);
}

/** Fecha y hora de Matamoros → instante real (respeta su horario de verano). */
export function zonedToUtc(date: string, minutes: number, tz = SHOP_TZ): Date {
  const [y, m, d] = parts(date);
  const target = Date.UTC(y, m - 1, d) + minutes * 60_000;
  let t = target;
  for (let i = 0; i < 3; i++) {
    const c = shopClock(new Date(t), tz);
    const seen = utcMs(c.dateStr) + c.minutes * 60_000;
    if (seen === target) break;
    t -= seen - target;
  }
  return new Date(t);
}

export function openingInstant(date: string): Date { return zonedToUtc(date, OPEN_AT); }
export function dueInstant(openDate: string, p: Pick<PlanRow, 'due_amount' | 'due_unit'>): Date {
  return new Date(zonedToUtc(addDays(lastDayOf(openDate, p), 1), 0).getTime() - 1000);
}

export function monthLabel(date: string): string { return MONTHS[parts(date)[1] - 1]; }
export function dayLabel(date: string): string {
  const [y, m, d] = parts(date);
  return `${DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d}`;
}

export function roundStatus(
  r: { due_at: string; closed_at: string | null; close_reason: 'completed' | 'superseded' | null },
  now: Date,
): RoundStatus {
  if (!r.closed_at) return now.getTime() > new Date(r.due_at).getTime() ? 'late' : 'open';
  if (r.close_reason === 'superseded') return 'incomplete';
  return new Date(r.closed_at).getTime() > new Date(r.due_at).getTime() ? 'doneLate' : 'done';
}

const letters = (n: number) => `${n} ${n === 1 ? 'letra' : 'letras'}`;

/**
 * Qué toca hacer en este momento para una empresa: abrir una ronda (y cerrar la anterior
 * como incompleta) o mandar un aviso. Cada aviso tiene una llave para mandarse UNA vez.
 */
export function inventoryActions(args: {
  plan: PlanRow | null; open: OpenRoundInfo | null; lastScheduled: string | null; now: Date;
}): InventoryAction[] {
  const { plan, open, lastScheduled, now } = args;
  const clock = shopClock(now);
  const today = clock.dateStr;

  if (plan?.is_active) {
    const s = latestScheduled(plan, today);
    const isNew = s && (!lastScheduled || lastScheduled < s);
    const stillInTime = s && today <= lastDayOf(s, plan);
    const itsTime = s && (today > s || clock.minutes >= OPEN_AT);
    if (isNew && stillInTime && itsTime) {
      return [{ kind: 'open', scheduledFor: s, dueAt: dueInstant(s, plan).toISOString(), supersede: open?.id ?? null }];
    }
  }

  if (!open || clock.minutes >= QUIET_AFTER || clock.minutes < OPEN_AT) return [];
  const openedDay = shopClock(new Date(open.opened_at)).dateStr;
  const lastDay = shopClock(new Date(open.due_at)).dateStr;

  if (!open.notices.open) {
    return [{
      kind: 'notice', key: 'open', title: `Inventario de ${monthLabel(openedDay)}`,
      body: `Empezó el inventario: ${letters(open.total)}, tienen hasta el ${dayLabel(lastDay)}.`,
    }];
  }
  if (open.pending <= 0 || today === openedDay) return [];

  const late = now.getTime() > new Date(open.due_at).getTime();
  const out: InventoryAction[] = [];
  const dailyKey = `daily:${today}`;
  if (clock.minutes >= DAILY_AT && !open.notices[dailyKey]) {
    if (late) {
      out.push({ kind: 'notice', key: dailyKey, title: 'Inventario atrasado', body: `El inventario ya venció: faltan ${letters(open.pending)}.` });
    } else {
      const left = daysBetween(today, lastDay) + 1;
      out.push({
        kind: 'notice', key: dailyKey, title: 'Inventario',
        body: left <= 1
          ? `Hoy es el último día: faltan ${letters(open.pending)}.`
          : `Faltan ${letters(open.pending)} del inventario, quedan ${left} días.`,
      });
    }
    return out;
  }
  const lastKey = `last:${today}`;
  if (!late && today === lastDay && clock.minutes >= LAST_DAY_AT && !open.notices[lastKey]) {
    out.push({
      kind: 'notice', key: lastKey, title: 'Inventario: hoy es el último día',
      body: `${open.pending === 1 ? 'Falta' : 'Faltan'} ${letters(open.pending)} del inventario.`,
    });
  }
  return out;
}
```

- [ ] **Paso 4: correr las pruebas** — `npx jest lib/__tests__/inventory-schedule.test.ts` → todas pasan. Si el texto esperado y el
  de la función no coinciden, se corrige la función (las pruebas dicen lo que se acordó con el dueño).
- [ ] **Paso 5: commit** — `git add lib/inventory-schedule.ts lib/__tests__/inventory-schedule.test.ts && git commit -m "feat(inventario): calendario y avisos como funciones puras"`

## Tarea 4: tipos, envío de push y servidor del inventario (panel)

**Archivos:** crear `lib/inventory-types.ts`, `lib/expo-push.ts`, `lib/inventory-server.ts`; modificar `app/api/reminders/route.ts`.

- [ ] **Paso 1: `lib/inventory-types.ts`**

```ts
// Tipos del inventario (archivo normal: los 'use server' no pueden exportar tipos con `export type { }`).
export type AreaState = 'bien' | 'regular' | 'mal';
export type SectionStatus = 'pending' | 'in_progress' | 'done';

export interface InvPlan { company_id: string; every_weeks: number; first_open_date: string; due_amount: number; due_unit: 'days' | 'weeks'; is_active: boolean; }
export interface InvLetter { id: string; company_id: string; code: string; name: string | null; sort_order: number; is_active: boolean; }
export interface InvRound { id: string; company_id: string; scheduled_for: string | null; opened_at: string; due_at: string; closed_at: string | null; close_reason: 'completed' | 'superseded' | null; opened_by: string; }
export interface InvSection {
  id: string; round_id: string; company_id: string; letter_id: string | null; code: string; name: string | null; sort_order: number;
  status: SectionStatus; claimed_by: string | null; claimed_at: string | null; done_by: string | null; done_at: string | null;
  shelf_photo: string | null; report_photos: string[]; area_state: AreaState | null;
  observations: string | null; improvement: string | null; action_taken: string | null;
  had_differences: boolean | null; differences_resolved: boolean | null; pending_note: string | null;
  redo_note: string | null; redo_requested_at: string | null;
}
export interface InvPending { id: string; round_id: string; section_id: string; note: string; reported_by: string | null; reported_at: string; resolved_at: string | null; resolved_by: string | null; resolution_note: string | null; code: string; }
export interface InvRoundSummary extends InvRound { total: number; done: number; }

export interface InventoryData {
  plan: InvPlan | null;
  letters: InvLetter[];
  current: InvRound | null;              // la abierta, o la última si no hay abierta
  sections: InvSection[];                // de `current`
  previous: Record<string, InvSection>;  // por letter_id: la ficha de la ronda anterior
  rounds: InvRoundSummary[];             // historial (12 más recientes)
  pendings: InvPending[];                // sin resolver
  people: Record<string, string>;        // employee_id → nombre
  perPerson: { id: string; name: string; current: number; total: number }[];
}
```

- [ ] **Paso 2: `lib/expo-push.ts`** (sale tal cual del route)

```ts
/** Manda una notificación a teléfonos con la app (Expo). Sin tokens, no hace nada. */
export async function pushExpo(tokens: string[], title: string, body: string): Promise<void> {
  if (tokens.length === 0) return;
  const messages = tokens.map(to => ({ to, title, body, sound: 'default', channelId: 'actividades', priority: 'high' }));
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Accept-Encoding': 'gzip, deflate' },
    body: JSON.stringify(messages),
  });
}
```

En `app/api/reminders/route.ts`: borrar la función `push` local, importar `import { pushExpo } from '@/lib/expo-push';`
y cambiar cada `await push(` por `await pushExpo(`.

- [ ] **Paso 3: `lib/inventory-server.ts`**

```ts
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { inventoryActions, type PlanRow, type OpenRoundInfo } from './inventory-schedule';
import { reminderTargets, type DeviceRow, type EmployeeTokenRow } from './push-targets';
import { pushExpo } from './expo-push';

/** Crea la ronda y sus fichas (copia de las letras activas). Devuelve el id o un error. */
export async function openRound(db: SupabaseClient, companyId: string, args: {
  scheduledFor: string | null; dueAt: string; openedBy: string; supersede?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data: letters, error: le } = await db.from('inventory_letters')
    .select('id, code, name, sort_order').eq('company_id', companyId).eq('is_active', true).order('sort_order').order('code');
  if (le) return { ok: false, error: le.message };
  if (!letters?.length) return { ok: false, error: 'No hay letras dadas de alta.' };
  if (args.supersede) {
    await db.from('inventory_rounds').update({ closed_at: new Date().toISOString(), close_reason: 'superseded' })
      .eq('id', args.supersede).is('closed_at', null);
  }
  const { data: round, error: re } = await db.from('inventory_rounds')
    .insert({ company_id: companyId, scheduled_for: args.scheduledFor, due_at: args.dueAt, opened_by: args.openedBy })
    .select('id').single();
  if (re || !round) return { ok: false, error: re?.message ?? 'No se pudo abrir la ronda.' };
  const rows = letters.map((l, i) => ({
    round_id: round.id, company_id: companyId, letter_id: l.id, code: l.code, name: l.name, sort_order: i,
  }));
  const { error: se } = await db.from('inventory_sections').insert(rows);
  if (se) {
    await db.from('inventory_rounds').delete().eq('id', round.id);
    return { ok: false, error: se.message };
  }
  return { ok: true, id: round.id as string };
}

/** Lo que el cron hace cada 5 minutos: abrir rondas que tocan y mandar avisos pendientes. */
export async function runInventoryTick(db: SupabaseClient, now: Date): Promise<string[]> {
  const log: string[] = [];
  const [{ data: plans }, { data: opens }, { data: sched }] = await Promise.all([
    db.from('inventory_plans').select('*'),
    db.from('inventory_rounds').select('id, company_id, opened_at, due_at, notices').is('closed_at', null),
    db.from('inventory_rounds').select('company_id, scheduled_for').not('scheduled_for', 'is', null).order('scheduled_for', { ascending: false }),
  ]);
  const companies = new Set<string>([...(plans ?? []).map(p => p.company_id as string), ...(opens ?? []).map(r => r.company_id as string)]);
  if (companies.size === 0) return log;

  const [{ data: devices }, { data: emps }] = await Promise.all([
    db.from('device_tokens').select('token, company_id'),
    db.from('employees').select('id, company_id, push_token').eq('is_active', true).not('push_token', 'is', null),
  ]);

  for (const companyId of companies) {
    const plan = ((plans ?? []).find(p => p.company_id === companyId) ?? null) as PlanRow | null;
    const openRow = (opens ?? []).find(r => r.company_id === companyId) ?? null;
    const lastScheduled = ((sched ?? []).find(r => r.company_id === companyId)?.scheduled_for as string | undefined) ?? null;
    let open: OpenRoundInfo | null = null;
    if (openRow) {
      const { data: secs } = await db.from('inventory_sections').select('status').eq('round_id', openRow.id);
      const total = secs?.length ?? 0;
      open = {
        id: openRow.id, opened_at: openRow.opened_at, due_at: openRow.due_at, notices: (openRow.notices ?? {}) as Record<string, string>,
        total, pending: (secs ?? []).filter(s => s.status !== 'done').length,
      };
    }
    const tokens = reminderTargets({ company_id: companyId, assigned_employee_ids: [] }, (devices ?? []) as DeviceRow[], (emps ?? []) as EmployeeTokenRow[]);

    for (const act of inventoryActions({ plan, open, lastScheduled, now })) {
      if (act.kind === 'open') {
        const r = await openRound(db, companyId, { scheduledFor: act.scheduledFor, dueAt: act.dueAt, openedBy: 'cron', supersede: act.supersede });
        log.push(r.ok ? `inventario abierto ${companyId} ${act.scheduledFor}` : `inventario NO abierto ${companyId}: ${r.error}`);
        continue;
      }
      if (!open) continue;
      // Primero se anota (así un error al mandar no repite el aviso cada 5 minutos).
      const notices = { ...open.notices, [act.key]: now.toISOString() };
      await db.from('inventory_rounds').update({ notices }).eq('id', open.id);
      open.notices = notices;
      await pushExpo(tokens, act.title, act.body);
      log.push(`inventario aviso ${act.key} → ${tokens.length} teléfonos`);
    }
  }
  return log;
}
```

- [ ] **Paso 4: llamar al tick desde `/api/reminders`** — en `app/api/reminders/route.ts`, justo después de
  `await syncMonthlyActive(supabase, mxNow);`:

```ts
  // Inventario por letra: abrir la ronda que toca y mandar sus avisos (no tumba los recordatorios si falla).
  let inventory: string[] = [];
  try { inventory = await runInventoryTick(supabase, new Date()); }
  catch (e) { inventory = [`inventario error: ${(e as Error).message}`]; }
```

  con `import { runInventoryTick } from '@/lib/inventory-server';`, y agregar `inventory` a los tres
  `NextResponse.json({ ok: true, … })` de la ruta.

- [ ] **Paso 5: revisar que `/api/cleanup` sólo toca el depósito `evidence`** — `grep -n "from('" app/api/cleanup/route.ts`. Si apareciera otro depósito, se limita a `evidence`.
- [ ] **Paso 6: `npx tsc --noEmit` y `npx jest`** — sin errores nuevos.
- [ ] **Paso 7: commit** — `git add lib/inventory-types.ts lib/expo-push.ts lib/inventory-server.ts app/api/reminders/route.ts && git commit -m "feat(inventario): el cron abre rondas y manda sus avisos"`

## Tarea 5: server actions del inventario (panel)

**Archivo:** crear `app/inventario/actions.ts`.

Funciones (todas empiezan con `const a = await adminAccess(); if (!a.ok) return a;` y validan empresa con
`allows(a.own, companyId)` o `ownsRow(tabla, id, a.own)`):

| Función | Qué hace | Validaciones |
|---|---|---|
| `loadInventory(companyId)` → `{ ok: true; data: InventoryData } \| { ok: false; error }` | Lee todo con service_role. `current` = ronda abierta o la más reciente. `previous` = fichas de la ronda anterior a `current` (por `letter_id`). `rounds` = 12 últimas con `total`/`done`. `perPerson` = fichas `done` por `done_by` (ronda actual y total histórico) con nombre. | empresa permitida |
| `saveInventoryPlan(companyId, input)` | `upsert` en `inventory_plans` con `updated_at`. | `every_weeks` entero 1–52; `first_open_date` AAAA-MM-DD válida; `due_amount` entero 1–60; `due_unit` days/weeks; `dueDays ≤ every_weeks·7` → "El plazo no puede ser más largo que el tiempo entre inventarios." |
| `addInventoryLetter(companyId, code, name)` | Inserta con `sort_order` = máximo + 1. | código: `trim().toUpperCase()`, 1–6 caracteres; nombre ≤ 60; duplicado (error 23505) → "Esa letra ya existe." |
| `updateInventoryLetter(id, code, name)` | Cambia código y nombre (no toca rondas ya abiertas). | mismas |
| `moveInventoryLetter(id, dir)` | Intercambia `sort_order` con la vecina (`dir` = −1 o 1). | `ownsRow` |
| `setInventoryLetterActive(id, active)` | Prende/apaga. | `ownsRow` |
| `deleteInventoryLetter(id)` | Borra (las fichas guardan copia de código y nombre). | `ownsRow` |
| `openInventoryRoundNow(companyId)` | `openRound(db, companyId, { scheduledFor: null, dueAt: dueInstant(hoy, plan), openedBy: a.session.userId })`. | Debe existir plan; no debe haber ronda abierta → "Ya hay un inventario abierto." |
| `requestSectionRedo(sectionId, note)` | Ficha → `pending`, borra `claimed_by/claimed_at`, pone `redo_note` y `redo_requested_at`, borra su pendiente sin resolver. Si la ronda estaba `completed` y es la más reciente de la empresa y no hay otra abierta, la reabre (`closed_at = null, close_reason = null`). | `ownsRow('inventory_sections')`; ficha `done`; nota 1–300; si la ronda está cerrada y no se puede reabrir → "Ese inventario ya se cerró y hay uno más nuevo." |
| `resolveInventoryPending(id, note)` | `resolved_at = now`, `resolved_by = a.session.name`, `resolution_note`. | `ownsRow('inventory_pendings')`; nota ≤ 300 |
| `inventoryPendingCount(companyId)` → `number` | Para el numerito del menú. 0 si no autorizado. | empresa permitida |

- [ ] **Paso 1: escribir el archivo** con `'use server'`, `export type Result = ActionResult;` y las funciones de la tabla.
  Las fotos guardan ruta (`<ronda>/<ficha>/<n>.jpg`); `loadInventory` las regresa como URL pública con
  `db.storage.from('inventario').getPublicUrl(path).data.publicUrl` (en `shelf_photo` y `report_photos`).
- [ ] **Paso 2: correr `npx jest lib/__tests__/use-server-exports.test.ts`** — debe pasar (revisa el nuevo archivo).
- [ ] **Paso 3: `npx tsc --noEmit`** — sin errores nuevos.
- [ ] **Paso 4: commit** — `git add app/inventario/actions.ts && git commit -m "feat(inventario): acciones del panel"`

## Tarea 6: página "Inventario" del panel

**Archivos:** crear `app/inventario/page.tsx`, `components/inventario/LetterGrid.tsx`, `SectionDialog.tsx`,
`PendingList.tsx`, `HistoryList.tsx`, `SettingsPanel.tsx`, `inv.module.css`; modificar `components/AdminShell.tsx`.

Mismo estilo que Conoce (`AdminShell`, `panel.module.css`: `s.page`, `s.top`, `s.eyebrow`, `s.title`, `s.sub`,
`s.tools`, `s.btn`, `s.btnPrimary`, `s.content`, `s.error`, `s.loading`, `s.card`).

- **Encabezado:** eyebrow "{empresa} · Inventario", título "Inventario", subtítulo según la ronda:
  "Diciembre · abierta el martes 1 · vence el lunes 7 · 7 de 18 letras" + píldora de estado
  (En curso azul, Atrasada rojo, Terminada verde, Terminada tarde ámbar, Cerrada incompleta gris).
  Sin ronda: "Todavía no hay inventarios. Configúralo en la pestaña Configuración."
- **Pestañas:** Ronda actual · Pendientes (n) · Historial · Configuración (guardada en `localStorage` con try/catch).
- **Ronda actual (`LetterGrid`):** barra de avance; cuadrícula de letras (código grande, nombre chico, estado
  por color, quién y hora); clic → `SectionDialog`. Debajo, "Quién hizo qué" (`perPerson`).
- **`SectionDialog`:** fotos (estante + reporte) en miniatura, clic → visor a pantalla completa (Escape cierra);
  estado del área, observaciones, mejora, qué se hizo, diferencias (sí/no, solucionadas, qué falta),
  quién la tomó y la terminó con hora. Recuadro "Ronda anterior" con estado y observaciones de `previous[letter_id]`.
  Botón "Pedir que se rehaga" → campo de nota (obligatorio) → `requestSectionRedo`.
- **`PendingList`:** tarjetas con letra, nota, quién y cuándo, ronda; botón "Resuelto" → nota opcional → `resolveInventoryPending`.
  Vacío: "No hay pendientes del inventario."
- **`HistoryList`:** filas con mes, fechas, `done/total`, píldora de `roundStatus`, días que tomó.
- **`SettingsPanel`:** plan (cada [N] semanas, desde [fecha], plazo [N] [días|semanas], interruptor activo,
  texto "Próximo inventario: lunes 12 de enero") + botón "Guardar"; letras (lista con código, nombre,
  ↑ ↓, activa, borrar con confirmación, y fila para agregar); botón "Abrir inventario ahora" con confirmación.
- **Menú (`AdminShell`):** `{ href: '/inventario', label: 'Inventario', icon: IconBox }` después de Conoce
  (sólo administradores) + numerito con `inventoryPendingCount(company.id)` cuando es mayor que 0.

- [ ] **Paso 1:** escribir componentes y página.
- [ ] **Paso 2:** `npx tsc --noEmit` sin errores nuevos.
- [ ] **Paso 3:** revisar en local (`next dev --webpack`, sesión firmada como en `laferre-admin-local-sin-password`)
  la pantalla vacía y con datos de ejemplo — sin guardar nada.
- [ ] **Paso 4: commit** con la lista explícita de archivos.

## Tarea 7: letras de inventario en el ranking de Reportes

**Archivos:** `app/reportes/page.tsx`, `components/reportes/PeopleCard.tsx`.

- [ ] **Paso 1:** en la carga de la semana, leer `inventory_sections` (`select('done_by')`, `company_id` = empresa,
  `status = 'done'`, `done_at` dentro de la semana mostrada) y armar `Record<employeeId, number>`.
- [ ] **Paso 2:** pasar `inventoryLetters` a `PeopleCard`; junto al nombre, si es > 0, una píldora
  "N letras de inventario" (`s.pill`, color neutro). Las personas sin actividades pero con letras también salen.
- [ ] **Paso 3:** `npx tsc --noEmit`; commit.

## Tarea 8: verificación del panel con la compilación de producción

- [ ] **Paso 1:** `vercel deploy --yes -e AUTH_SECRET=solo-local-prueba-reportes` (preview).
- [ ] **Paso 2:** firmar sesión de prueba con `jose`, sacar los id de las acciones de los chunks y llamar
  `loadInventory` (debe regresar `ok`) y `saveInventoryPlan` con un id de empresa falso (debe dar "Empresa no permitida"),
  con `vercel curl`.
- [ ] **Paso 3:** `vercel rm <url> --yes`.

## Tarea 9: funciones puras de la app

**Archivos (laferre-actividades):** crear `lib/inventory.ts` y `lib/__tests__/inventory.test.ts`.

- [ ] **Paso 1: pruebas**

```ts
import { missingForFinish, daysLeftLabel, emptyDraft, type Draft } from '../inventory';

const ok: Draft = {
  ...emptyDraft(), shelf: { path: 'r/s/1700000000001.jpg' }, reports: [{ path: 'r/s/1700000000002.jpg' }],
  area: 'bien', hadDiff: false,
};

describe('missingForFinish', () => {
  test('completa → null', () => { expect(missingForFinish(ok)).toBeNull(); });
  test('falta foto del estante', () => { expect(missingForFinish({ ...ok, shelf: undefined })).toBe('Falta la foto del estante.'); });
  test('falta reporte de Sicar', () => { expect(missingForFinish({ ...ok, reports: [] })).toBe('Falta la foto del reporte de Sicar.'); });
  test('foto sin subir cuenta como tomada (se reintenta al terminar)', () => {
    expect(missingForFinish({ ...ok, shelf: { local: 'file://x.jpg' } })).toBeNull();
  });
  test('estado del área', () => { expect(missingForFinish({ ...ok, area: undefined })).toBe('Elige cómo está el área.'); });
  test('regular o mal piden observaciones', () => {
    expect(missingForFinish({ ...ok, area: 'mal', observations: '  ' })).toBe('Escribe en observaciones por qué está mal.');
    expect(missingForFinish({ ...ok, area: 'regular', observations: 'Polvo' })).toBeNull();
  });
  test('diferencias', () => {
    expect(missingForFinish({ ...ok, hadDiff: undefined })).toBe('Contesta si hubo diferencias.');
    expect(missingForFinish({ ...ok, hadDiff: true })).toBe('Contesta si las diferencias quedaron solucionadas.');
    expect(missingForFinish({ ...ok, hadDiff: true, resolved: false })).toBe('Escribe qué falta por resolver.');
    expect(missingForFinish({ ...ok, hadDiff: true, resolved: false, pendingNote: 'Faltan 3 brocas' })).toBeNull();
  });
});

describe('daysLeftLabel', () => {
  const due = '2026-12-08T05:59:59.000Z'; // 7 de diciembre, 23:59:59 en Matamoros
  test('varios días', () => { expect(daysLeftLabel(due, new Date('2026-12-03T16:00:00Z'))).toBe('quedan 5 días'); });
  test('último día', () => { expect(daysLeftLabel(due, new Date('2026-12-07T16:00:00Z'))).toBe('hoy es el último día'); });
  test('vencido', () => { expect(daysLeftLabel(due, new Date('2026-12-08T16:00:00Z'))).toBe('ya venció'); });
});
```

- [ ] **Paso 2: `lib/inventory.ts`**

```ts
// Inventario por letra en el teléfono: tipos y reglas puras (mismas reglas que inv_finish_section).
export type AreaState = 'bien' | 'regular' | 'mal';
export type SectionStatus = 'pending' | 'in_progress' | 'done';

export interface InvRound { id: string; company_id: string; opened_at: string; due_at: string; closed_at: string | null; }
export interface InvSection {
  id: string; round_id: string; code: string; name: string | null; sort_order: number; status: SectionStatus;
  claimed_by: string | null; claimed_at: string | null; done_by: string | null; done_at: string | null; redo_note: string | null;
}

/** Una foto del borrador: `local` mientras no se sube; `path` (ruta en el depósito) cuando ya subió. */
export interface PhotoRef { local?: string; path?: string; }
export interface Draft {
  shelf?: PhotoRef; reports: PhotoRef[]; area?: AreaState;
  observations: string; improvement: string; action: string;
  hadDiff?: boolean; resolved?: boolean; pendingNote: string;
}

export const emptyDraft = (): Draft => ({ reports: [], observations: '', improvement: '', action: '', pendingNote: '' });

export function missingForFinish(d: Draft): string | null {
  if (!d.shelf) return 'Falta la foto del estante.';
  if (d.reports.length === 0) return 'Falta la foto del reporte de Sicar.';
  if (!d.area) return 'Elige cómo está el área.';
  if ((d.area === 'regular' || d.area === 'mal') && !d.observations.trim()) return `Escribe en observaciones por qué está ${d.area}.`;
  if (d.hadDiff === undefined) return 'Contesta si hubo diferencias.';
  if (d.hadDiff && d.resolved === undefined) return 'Contesta si las diferencias quedaron solucionadas.';
  if (d.hadDiff && d.resolved === false && !d.pendingNote.trim()) return 'Escribe qué falta por resolver.';
  return null;
}

const shopDate = (at: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Matamoros', year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
const dayMs = (d: string) => { const [y, m, dd] = d.split('-').map(Number); return Date.UTC(y, m - 1, dd); };

/** "quedan 5 días" · "hoy es el último día" · "ya venció" (por día de calendario en Matamoros). */
export function daysLeftLabel(dueAt: string, now: Date = new Date()): string {
  if (now.getTime() > new Date(dueAt).getTime()) return 'ya venció';
  const left = Math.round((dayMs(shopDate(new Date(dueAt))) - dayMs(shopDate(now))) / 86_400_000) + 1;
  return left <= 1 ? 'hoy es el último día' : `quedan ${left} días`;
}
```

- [ ] **Paso 3:** `npx jest --runInBand` → pasan todas (las 11 de antes + las nuevas).
- [ ] **Paso 4: commit** — `git add lib/inventory.ts lib/__tests__/inventory.test.ts && git commit -m "feat(inventario): reglas de la ficha en la app"`

## Tarea 10: acceso a datos de la app

**Archivo:** crear `lib/inventoryApi.ts`.

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { emptyDraft, type Draft, type InvRound, type InvSection } from './inventory';

export const INV_BUCKET = 'inventario';

export async function loadOpenRound(companyId: string): Promise<{ round: InvRound; sections: InvSection[] } | null> {
  const { data: round } = await supabase.from('inventory_rounds')
    .select('id, company_id, opened_at, due_at, closed_at').eq('company_id', companyId).is('closed_at', null).maybeSingle();
  if (!round) return null;
  const { data: sections } = await supabase.from('inventory_sections')
    .select('id, round_id, code, name, sort_order, status, claimed_by, claimed_at, done_by, done_at, redo_note')
    .eq('round_id', round.id).order('sort_order');
  return { round: round as InvRound, sections: (sections ?? []) as InvSection[] };
}

type RpcResult = { ok: true; roundClosed?: boolean } | { ok: false; error: string; code?: string; by?: string };

export async function claimSection(sectionId: string, employeeId: string, force = false): Promise<RpcResult> {
  const { data, error } = await supabase.rpc('inv_claim_section', { p_section: sectionId, p_employee: employeeId, p_force: force });
  if (error) return { ok: false, error: 'No hay conexión. Intenta de nuevo.' };
  return data as RpcResult;
}

/** Sube una foto y regresa su ruta (`<ronda>/<ficha>/<13 dígitos>.jpg`). */
export async function uploadInventoryPhoto(roundId: string, sectionId: string, uri: string): Promise<string> {
  const buf = await (await fetch(uri)).arrayBuffer();
  const path = `${roundId}/${sectionId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from(INV_BUCKET).upload(path, buf, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}

export function photoUrl(path: string): string {
  return supabase.storage.from(INV_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function finishSection(sectionId: string, employeeId: string, d: Draft & { shelfPath: string; reportPaths: string[] }): Promise<RpcResult> {
  const { data, error } = await supabase.rpc('inv_finish_section', {
    p_section: sectionId, p_employee: employeeId, p_shelf_photo: d.shelfPath, p_report_photos: d.reportPaths,
    p_area_state: d.area, p_observations: d.observations, p_improvement: d.improvement, p_action_taken: d.action,
    p_had_differences: d.hadDiff, p_differences_resolved: d.hadDiff ? d.resolved : null, p_pending_note: d.pendingNote,
  });
  if (error) return { ok: false, error: 'No hay conexión. Lo capturado sigue guardado en el teléfono; intenta de nuevo.' };
  return data as RpcResult;
}

const key = (sectionId: string) => `@inv_draft_${sectionId}`;
export async function loadDraft(sectionId: string): Promise<Draft> {
  try { const raw = await AsyncStorage.getItem(key(sectionId)); return raw ? { ...emptyDraft(), ...JSON.parse(raw) } : emptyDraft(); }
  catch { return emptyDraft(); }
}
export async function saveDraft(sectionId: string, d: Draft): Promise<void> {
  try { await AsyncStorage.setItem(key(sectionId), JSON.stringify(d)); } catch { /* sin espacio: se sigue en memoria */ }
}
export async function clearDraft(sectionId: string): Promise<void> {
  try { await AsyncStorage.removeItem(key(sectionId)); } catch { /* nada */ }
}
```

- [ ] **Paso 1:** escribir el archivo. **Paso 2:** `npx tsc --noEmit`. **Paso 3:** commit.

## Tarea 11: pantallas de la app

**Archivos:** crear `components/InventoryCard.tsx`, `app/inventario/index.tsx`, `app/inventario/[id].tsx`;
modificar `app/(employee)/index.tsx`.

Estilo: el mismo del inicio (PanelBackdrop, `glass`, Geist `font.*`, `Icon`, `Appear`, colores de `constants/theme`).

- **`InventoryCard`** (props `round`, `sections`, `onOpen`): tarjeta de vidrio con borde de acento, ícono de caja,
  "INVENTARIO DE DICIEMBRE", "7 de 18 letras · quedan 3 días" (rojo si `ya venció`), barra de avance y botón
  "Entrar". En el inicio va entre la tarjeta negra y el resumen; `loadData` llama `loadOpenRound(companyId)`.
- **`app/inventario/index.tsx`:** encabezado (atrás, "Inventario de diciembre", avance y `daysLeftLabel`);
  cuadrícula de 3 columnas (4 si la pantalla es ancha) con fichas: código grande, nombre, estado
  (Pendiente gris · "En proceso · Laura" azul · "Hecha · Juan 10:42" verde · "Rehacer" naranja con la nota ·
  pendiente con plazo vencido en rojo). Tocar:
  - hecha → aviso "Ya está hecha por Juan";
  - mía en proceso → abre la ficha;
  - pendiente → `claimSection` → abre la ficha;
  - de otro en proceso → confirmación "Laura la empezó. ¿La tomas tú?" → `claimSection(…, true)` → abre la ficha.
  Se recarga al enfocar la pantalla y cada 15 s.
- **`app/inventario/[id].tsx`:** carga la ficha (`inventory_sections` por id) y el borrador; si la ficha ya no es
  `in_progress` a mi nombre, avisa y regresa. Pasos en una sola pantalla con tarjetas numeradas:
  1. Foto del estante (botón grande con cámara; miniatura con "Cambiar").
  2. Fotos del reporte de Sicar (miniaturas + "+ otra página"; quitar con ✕).
  3. Estado del área: tres botones grandes (Bien verde, Regular ámbar, Mal rojo).
  4. Observaciones, mejora propuesta, qué se hizo (campos de texto de varias líneas).
  5. ¿Hubo diferencias? Sí/No → ¿quedaron solucionadas? Sí/No → ¿qué falta por resolver?
  Botón fijo abajo "Terminar letra A" (gris con el texto de `missingForFinish` si falta algo).
  Cada cambio → `saveDraft`. Cada foto: se intenta subir al tomarla (`uploadInventoryPhoto`); si falla, queda `local`.
  Al terminar: sube las que falten, llama `finishSection`, limpia el borrador y regresa a la cuadrícula
  con "Letra A terminada"; si `roundClosed`, "¡Terminaron el inventario!".
  Cámara: en el teléfono `ImagePicker.launchCameraAsync({ quality: 0.5 })`; en web, `<input type=file capture>`
  (como `app/camera.tsx`).

- [ ] **Paso 1:** escribir componentes y pantallas. **Paso 2:** `npx tsc --noEmit` y `npx jest --runInBand`.
- [ ] **Paso 3:** export web y capturas con Playwright usando datos de ejemplo (`page.route`) y bloqueando toda
  escritura a Supabase: inicio con tarjeta, cuadrícula con los cinco estados, ficha vacía, ficha con "falta" y
  ficha lista. También con "reducir movimiento".
- [ ] **Paso 4:** commit con lista explícita de archivos.

## Tarea 12: arranque (con el dueño)

- [ ] El dueño corre `007_inventario.sql` y `007_inventario_prueba.sql` (Tareas 1–2) — se puede hacer en cuanto estén escritos.
- [ ] Subir el panel cuando diga "súbelo"; comprobar cron-job.org en 200 y `inventory: []` en la respuesta.
- [ ] El dueño da de alta letras, frecuencia, plazo y primera fecha.
- [ ] Apagar las dos actividades "Inventario mensual" cuando abra la primera ronda.
- [ ] `npx eas login` (dueño) → APK La Ferre (`--profile preview`) y BFM (`--profile bfm`) → links para los 6 teléfonos.
)
  )
);

commit;
```

- [ ] **Paso 2: commit** — `git add supabase/007_inventario.sql && git commit -m "feat(inventario): SQL de tablas, permisos, funciones y depósito"`

## Tarea 2: SQL — pruebas como anon (sin dejar rastro)

**Archivo:** crear `supabase/007_inventario_prueba.sql`. Crea una ronda de prueba con una letra, prueba las
funciones como `anon` y termina con `rollback` (nada queda en la base, y el cron no la ve porque nunca se confirma).

- [ ] **Paso 1: escribir el script**

```sql
-- Pruebas del inventario. NO deja nada: todo termina en ROLLBACK.
-- Correr DESPUÉS de 007_inventario.sql. Cada línea "PRUEBA" debe decir lo esperado.
begin;
do $$
declare
  co uuid; other_co uuid; emp uuid; emp2 uuid; other_emp uuid;
  rid uuid; sid uuid; res jsonb; p1 text; p2 text;
begin
  select id into co from companies where slug = 'laferre';
  select id into other_co from companies where slug = 'bfm';
  select id into emp from employees where company_id = co and is_active order by name limit 1;
  select id into emp2 from employees where company_id = co and is_active and id <> emp order by name limit 1;
  select id into other_emp from employees where company_id = other_co and is_active limit 1;

  insert into inventory_rounds (company_id, due_at, opened_by) values (co, now() + interval '7 days', 'prueba') returning id into rid;
  insert into inventory_sections (round_id, company_id, code, name) values (rid, co, 'ZZ', 'Prueba') returning id into sid;
  p1 := rid || '/' || sid || '/1700000000001.jpg';
  p2 := rid || '/' || sid || '/1700000000002.jpg';

  set local role anon;
  res := inv_claim_section(sid, other_emp, false);   raise notice 'PRUEBA 1 (otra tienda → error): %', res;
  res := inv_claim_section(sid, emp, false);         raise notice 'PRUEBA 2 (tomar → ok): %', res;
  res := inv_claim_section(sid, emp2, false);        raise notice 'PRUEBA 3 (ocupada → busy): %', res;
  res := inv_finish_section(sid, emp, p1, array[p2], 'bien', '', '', '', false, null, '');
  raise notice 'PRUEBA 4 (fotos no subidas → error): %', res;
  reset role;

  insert into storage.objects (bucket_id, name) values ('inventario', p1), ('inventario', p2);

  set local role anon;
  res := inv_finish_section(sid, emp, p1, array['otra/ruta/1700000000003.jpg'], 'bien', '', '', '', false, null, '');
  raise notice 'PRUEBA 5 (foto ajena → error): %', res;
  res := inv_finish_section(sid, emp, p1, array[p2], 'mal', '', '', '', false, null, '');
  raise notice 'PRUEBA 6 (mal sin observaciones → error): %', res;
  res := inv_finish_section(sid, emp, p1, array[p2], 'regular', 'Desordenado', '', '', true, false, '');
  raise notice 'PRUEBA 7 (diferencias sin nota → error): %', res;
  res := inv_finish_section(sid, emp2, p1, array[p2], 'bien', '', '', '', false, null, '');
  raise notice 'PRUEBA 8 (no es quien la tomó → error): %', res;
  res := inv_finish_section(sid, emp, p1, array[p2], 'regular', 'Desordenado', 'Separar tornillos', 'Se acomodó', true, false, 'Faltan 3 brocas 1/4');
  raise notice 'PRUEBA 9 (terminar → ok y roundClosed true): %', res;
  reset role;

  raise notice 'PRUEBA 10 (pendiente creado → 1): %', (select count(*) from inventory_pendings where section_id = sid and resolved_at is null);
  raise notice 'PRUEBA 11 (ronda cerrada → completed): %', (select close_reason from inventory_rounds where id = rid);

  set local role anon;
  begin
    insert into inventory_rounds (company_id, due_at) values (co, now());
    raise notice 'PRUEBA 12 (anon no inserta rondas): FALLÓ, sí pudo';
  exception when others then
    raise notice 'PRUEBA 12 (anon no inserta rondas): ok, bloqueado';
  end;
  raise notice 'PRUEBA 13 (anon no lee pendientes → 0): %', (select count(*) from inventory_pendings);
  reset role;
end $$;
rollback;
```

- [ ] **Paso 2: el dueño corre 007 y luego este script; se revisan las 13 líneas.** Si alguna no da lo esperado, se corrige el 007 antes de seguir.
- [ ] **Paso 3: commit** — `git add supabase/007_inventario_prueba.sql && git commit -m "test(inventario): pruebas de las funciones como anon con rollback"`

## Tarea 3: funciones puras del calendario (panel)

**Archivos:** crear `lib/inventory-schedule.ts` y `lib/__tests__/inventory-schedule.test.ts`.

- [ ] **Paso 1: escribir las pruebas**

```ts
import {
  addDays, dueDays, latestScheduled, lastDayOf, zonedToUtc, openingInstant, dueInstant,
  roundStatus, inventoryActions, monthLabel, dayLabel, type PlanRow, type OpenRoundInfo,
} from '../inventory-schedule';

const plan = (o: Partial<PlanRow> = {}): PlanRow => ({
  company_id: 'c1', every_weeks: 6, first_open_date: '2026-12-01', due_amount: 1, due_unit: 'weeks', is_active: true, ...o,
});

describe('fechas', () => {
  test('addDays cruza meses y años', () => {
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  test('dueDays en días o semanas', () => {
    expect(dueDays(plan({ due_amount: 5, due_unit: 'days' }))).toBe(5);
    expect(dueDays(plan({ due_amount: 2, due_unit: 'weeks' }))).toBe(14);
  });
  test('latestScheduled: la última fecha programada que ya llegó', () => {
    expect(latestScheduled(plan(), '2026-11-30')).toBeNull();
    expect(latestScheduled(plan(), '2026-12-01')).toBe('2026-12-01');
    expect(latestScheduled(plan(), '2027-01-11')).toBe('2026-12-01');
    expect(latestScheduled(plan(), '2027-01-12')).toBe('2027-01-12');
  });
  test('lastDayOf: con 1 semana, abre el 1 y el último día es el 7', () => {
    expect(lastDayOf('2026-12-01', plan())).toBe('2026-12-07');
    expect(lastDayOf('2026-12-01', plan({ due_amount: 1, due_unit: 'days' }))).toBe('2026-12-01');
  });
  test('zonedToUtc respeta el horario de verano de Matamoros', () => {
    expect(zonedToUtc('2026-12-01', 8 * 60).toISOString()).toBe('2026-12-01T14:00:00.000Z'); // CST −6
    expect(zonedToUtc('2026-07-01', 8 * 60).toISOString()).toBe('2026-07-01T13:00:00.000Z'); // CDT −5
  });
  test('apertura 08:00 y vencimiento 23:59:59 del último día', () => {
    expect(openingInstant('2026-12-01').toISOString()).toBe('2026-12-01T14:00:00.000Z');
    expect(dueInstant('2026-12-01', plan()).toISOString()).toBe('2026-12-08T05:59:59.000Z');
  });
  test('etiquetas en español', () => {
    expect(monthLabel('2026-12-01')).toBe('diciembre');
    expect(dayLabel('2026-12-07')).toBe('lunes 7'); // el 1 de diciembre de 2026 es martes
  });
});

describe('roundStatus', () => {
  const base = { due_at: '2026-12-08T05:59:59.000Z', closed_at: null, close_reason: null } as const;
  test('abierta y a tiempo / atrasada', () => {
    expect(roundStatus(base, new Date('2026-12-05T18:00:00Z'))).toBe('open');
    expect(roundStatus(base, new Date('2026-12-08T07:00:00Z'))).toBe('late');
  });
  test('terminada a tiempo, tarde, o cerrada incompleta', () => {
    expect(roundStatus({ ...base, closed_at: '2026-12-06T20:00:00Z', close_reason: 'completed' }, new Date())).toBe('done');
    expect(roundStatus({ ...base, closed_at: '2026-12-09T20:00:00Z', close_reason: 'completed' }, new Date())).toBe('doneLate');
    expect(roundStatus({ ...base, closed_at: '2027-01-12T14:00:00Z', close_reason: 'superseded' }, new Date())).toBe('incomplete');
  });
});

describe('inventoryActions', () => {
  const at = (iso: string) => new Date(iso);
  const open = (o: Partial<OpenRoundInfo> = {}): OpenRoundInfo => ({
    id: 'r1', opened_at: '2026-12-01T14:00:00Z', due_at: '2026-12-08T05:59:59.000Z', notices: {}, pending: 5, total: 18, ...o,
  });

  test('abre a las 08:00 del día programado, no antes', () => {
    expect(inventoryActions({ plan: plan(), open: null, lastScheduled: null, now: at('2026-12-01T13:55:00Z') })).toEqual([]);
    const acts = inventoryActions({ plan: plan(), open: null, lastScheduled: null, now: at('2026-12-01T14:00:00Z') });
    expect(acts).toEqual([{ kind: 'open', scheduledFor: '2026-12-01', dueAt: '2026-12-08T05:59:59.000Z', supersede: null }]);
  });
  test('no abre si ya existe la ronda de esa fecha, ni si el plan está pausado', () => {
    expect(inventoryActions({ plan: plan(), open: null, lastScheduled: '2026-12-01', now: at('2026-12-02T16:00:00Z') })).toEqual([]);
    expect(inventoryActions({ plan: plan({ is_active: false }), open: null, lastScheduled: null, now: at('2026-12-01T16:00:00Z') })).toEqual([]);
  });
  test('no abre una ronda vieja cuyo plazo ya pasó', () => {
    expect(inventoryActions({ plan: plan({ first_open_date: '2026-10-01' }), open: null, lastScheduled: null, now: at('2026-11-05T16:00:00Z') })).toEqual([]);
  });
  test('si llega la siguiente con la anterior abierta, cierra la anterior como incompleta', () => {
    const acts = inventoryActions({
      plan: plan(), open: open({ notices: { open: 'x' } }), lastScheduled: '2026-12-01', now: at('2027-01-12T14:05:00Z'),
    });
    expect(acts[0]).toEqual({ kind: 'open', scheduledFor: '2027-01-12', dueAt: '2027-01-19T05:59:59.000Z', supersede: 'r1' });
    expect(acts).toHaveLength(1);
  });
  test('aviso de apertura una sola vez', () => {
    const acts = inventoryActions({ plan: plan(), open: open(), lastScheduled: '2026-12-01', now: at('2026-12-01T14:05:00Z') });
    expect(acts).toEqual([{ kind: 'notice', key: 'open', title: 'Inventario de diciembre', body: 'Empezó el inventario: 18 letras, tienen hasta el lunes 7.' }]);
    expect(inventoryActions({ plan: plan(), open: open({ notices: { open: 'x' } }), lastScheduled: '2026-12-01', now: at('2026-12-01T14:10:00Z') })).toEqual([]);
  });
  test('aviso diario a las 10:00 desde el segundo día, mientras falten letras', () => {
    const o = open({ notices: { open: 'x' } });
    expect(inventoryActions({ plan: plan(), open: o, lastScheduled: '2026-12-01', now: at('2026-12-01T16:30:00Z') })).toEqual([]);
    expect(inventoryActions({ plan: plan(), open: o, lastScheduled: '2026-12-01', now: at('2026-12-03T16:00:00Z') })).toEqual([
      { kind: 'notice', key: 'daily:2026-12-03', title: 'Inventario', body: 'Faltan 5 letras del inventario, quedan 5 días.' },
    ]);
    expect(inventoryActions({ plan: plan(), open: { ...o, notices: { open: 'x', 'daily:2026-12-03': 'x' } }, lastScheduled: '2026-12-01', now: at('2026-12-03T16:05:00Z') })).toEqual([]);
    expect(inventoryActions({ plan: plan(), open: { ...o, pending: 0 }, lastScheduled: '2026-12-01', now: at('2026-12-03T16:00:00Z') })).toEqual([]);
  });
  test('el último día: aviso de las 10 y de la 1', () => {
    const o = open({ notices: { open: 'x', 'daily:2026-12-07': 'x' }, pending: 1 });
    expect(inventoryActions({ plan: plan(), open: o, lastScheduled: '2026-12-01', now: at('2026-12-07T19:00:00Z') })).toEqual([
      { kind: 'notice', key: 'last:2026-12-07', title: 'Inventario: hoy es el último día', body: 'Falta 1 letra del inventario.' },
    ]);
  });
  test('atrasado: el aviso diario lo dice', () => {
    const o = open({ notices: { open: 'x' }, pending: 2 });
    expect(inventoryActions({ plan: plan(), open: o, lastScheduled: '2026-12-01', now: at('2026-12-09T16:00:00Z') })).toEqual([
      { kind: 'notice', key: 'daily:2026-12-09', title: 'Inventario atrasado', body: 'El inventario ya venció: faltan 2 letras.' },
    ]);
  });
  test('sin avisos de noche', () => {
    const o = open({ notices: {} });
    expect(inventoryActions({ plan: plan(), open: o, lastScheduled: '2026-12-01', now: at('2026-12-02T03:00:00Z') })).toEqual([]);
  });
  test('ronda abierta a mano (sin plan) también avisa', () => {
    const acts = inventoryActions({ plan: null, open: open(), lastScheduled: null, now: at('2026-12-01T15:00:00Z') });
    expect(acts[0].kind).toBe('notice');
  });
});
```

- [ ] **Paso 2: correr y ver que fallan** — `npx jest lib/__tests__/inventory-schedule.test.ts` → falla (no existe el módulo).

- [ ] **Paso 3: escribir `lib/inventory-schedule.ts`**

```ts
// Calendario del inventario por letra: reglas puras (se prueban sin servidor ni base).
// Las usan el cron (/api/reminders → lib/inventory-server.ts) y el panel.
import { shopClock, SHOP_TZ } from './my-day';

export interface PlanRow {
  company_id: string;
  every_weeks: number;
  first_open_date: string;      // AAAA-MM-DD
  due_amount: number;
  due_unit: 'days' | 'weeks';
  is_active: boolean;
}

export interface OpenRoundInfo {
  id: string;
  opened_at: string;
  due_at: string;
  notices: Record<string, string>;
  pending: number;              // letras que no están hechas
  total: number;
}

export type InventoryAction =
  | { kind: 'open'; scheduledFor: string; dueAt: string; supersede: string | null }
  | { kind: 'notice'; key: string; title: string; body: string };

export type RoundStatus = 'open' | 'late' | 'done' | 'doneLate' | 'incomplete';

export const OPEN_AT = 8 * 60;       // 08:00
export const DAILY_AT = 10 * 60;     // 10:00
export const LAST_DAY_AT = 13 * 60;  // 13:00
export const QUIET_AFTER = 20 * 60;  // sin avisos después de las 20:00

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const parts = (d: string) => d.split('-').map(Number) as [number, number, number];
const utcMs = (d: string) => { const [y, m, dd] = parts(d); return Date.UTC(y, m - 1, dd); };
const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function addDays(d: string, n: number): string { return fmt(utcMs(d) + n * 86_400_000); }
export function daysBetween(a: string, b: string): number { return Math.round((utcMs(b) - utcMs(a)) / 86_400_000); }
export function dueDays(p: Pick<PlanRow, 'due_amount' | 'due_unit'>): number {
  return p.due_unit === 'weeks' ? p.due_amount * 7 : p.due_amount;
}

/** La última fecha programada (inicio + k·N semanas) que ya llegó; null si todavía no empieza. */
export function latestScheduled(p: Pick<PlanRow, 'first_open_date' | 'every_weeks'>, today: string): string | null {
  const diff = daysBetween(p.first_open_date, today);
  if (diff < 0) return null;
  const step = p.every_weeks * 7;
  return addDays(p.first_open_date, Math.floor(diff / step) * step);
}

/** Último día para terminar: apertura + plazo − 1 (con 1 semana, abre el día 1 → el 7). */
export function lastDayOf(openDate: string, p: Pick<PlanRow, 'due_amount' | 'due_unit'>): string {
  return addDays(openDate, dueDays(p) - 1);
}

/** Fecha y hora de Matamoros → instante real (respeta su horario de verano). */
export function zonedToUtc(date: string, minutes: number, tz = SHOP_TZ): Date {
  const [y, m, d] = parts(date);
  const target = Date.UTC(y, m - 1, d) + minutes * 60_000;
  let t = target;
  for (let i = 0; i < 3; i++) {
    const c = shopClock(new Date(t), tz);
    const seen = utcMs(c.dateStr) + c.minutes * 60_000;
    if (seen === target) break;
    t -= seen - target;
  }
  return new Date(t);
}

export function openingInstant(date: string): Date { return zonedToUtc(date, OPEN_AT); }
export function dueInstant(openDate: string, p: Pick<PlanRow, 'due_amount' | 'due_unit'>): Date {
  return new Date(zonedToUtc(addDays(lastDayOf(openDate, p), 1), 0).getTime() - 1000);
}

export function monthLabel(date: string): string { return MONTHS[parts(date)[1] - 1]; }
export function dayLabel(date: string): string {
  const [y, m, d] = parts(date);
  return `${DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d}`;
}

export function roundStatus(
  r: { due_at: string; closed_at: string | null; close_reason: 'completed' | 'superseded' | null },
  now: Date,
): RoundStatus {
  if (!r.closed_at) return now.getTime() > new Date(r.due_at).getTime() ? 'late' : 'open';
  if (r.close_reason === 'superseded') return 'incomplete';
  return new Date(r.closed_at).getTime() > new Date(r.due_at).getTime() ? 'doneLate' : 'done';
}

const letters = (n: number) => `${n} ${n === 1 ? 'letra' : 'letras'}`;

/**
 * Qué toca hacer en este momento para una empresa: abrir una ronda (y cerrar la anterior
 * como incompleta) o mandar un aviso. Cada aviso tiene una llave para mandarse UNA vez.
 */
export function inventoryActions(args: {
  plan: PlanRow | null; open: OpenRoundInfo | null; lastScheduled: string | null; now: Date;
}): InventoryAction[] {
  const { plan, open, lastScheduled, now } = args;
  const clock = shopClock(now);
  const today = clock.dateStr;

  if (plan?.is_active) {
    const s = latestScheduled(plan, today);
    const isNew = s && (!lastScheduled || lastScheduled < s);
    const stillInTime = s && today <= lastDayOf(s, plan);
    const itsTime = s && (today > s || clock.minutes >= OPEN_AT);
    if (isNew && stillInTime && itsTime) {
      return [{ kind: 'open', scheduledFor: s, dueAt: dueInstant(s, plan).toISOString(), supersede: open?.id ?? null }];
    }
  }

  if (!open || clock.minutes >= QUIET_AFTER || clock.minutes < OPEN_AT) return [];
  const openedDay = shopClock(new Date(open.opened_at)).dateStr;
  const lastDay = shopClock(new Date(open.due_at)).dateStr;

  if (!open.notices.open) {
    return [{
      kind: 'notice', key: 'open', title: `Inventario de ${monthLabel(openedDay)}`,
      body: `Empezó el inventario: ${letters(open.total)}, tienen hasta el ${dayLabel(lastDay)}.`,
    }];
  }
  if (open.pending <= 0 || today === openedDay) return [];

  const late = now.getTime() > new Date(open.due_at).getTime();
  const out: InventoryAction[] = [];
  const dailyKey = `daily:${today}`;
  if (clock.minutes >= DAILY_AT && !open.notices[dailyKey]) {
    if (late) {
      out.push({ kind: 'notice', key: dailyKey, title: 'Inventario atrasado', body: `El inventario ya venció: faltan ${letters(open.pending)}.` });
    } else {
      const left = daysBetween(today, lastDay) + 1;
      out.push({
        kind: 'notice', key: dailyKey, title: 'Inventario',
        body: left <= 1
          ? `Hoy es el último día: faltan ${letters(open.pending)}.`
          : `Faltan ${letters(open.pending)} del inventario, quedan ${left} días.`,
      });
    }
    return out;
  }
  const lastKey = `last:${today}`;
  if (!late && today === lastDay && clock.minutes >= LAST_DAY_AT && !open.notices[lastKey]) {
    out.push({
      kind: 'notice', key: lastKey, title: 'Inventario: hoy es el último día',
      body: `${open.pending === 1 ? 'Falta' : 'Faltan'} ${letters(open.pending)} del inventario.`,
    });
  }
  return out;
}
```

- [ ] **Paso 4: correr las pruebas** — `npx jest lib/__tests__/inventory-schedule.test.ts` → todas pasan. Si el texto esperado y el
  de la función no coinciden, se corrige la función (las pruebas dicen lo que se acordó con el dueño).
- [ ] **Paso 5: commit** — `git add lib/inventory-schedule.ts lib/__tests__/inventory-schedule.test.ts && git commit -m "feat(inventario): calendario y avisos como funciones puras"`

## Tarea 4: tipos, envío de push y servidor del inventario (panel)

**Archivos:** crear `lib/inventory-types.ts`, `lib/expo-push.ts`, `lib/inventory-server.ts`; modificar `app/api/reminders/route.ts`.

- [ ] **Paso 1: `lib/inventory-types.ts`**

```ts
// Tipos del inventario (archivo normal: los 'use server' no pueden exportar tipos con `export type { }`).
export type AreaState = 'bien' | 'regular' | 'mal';
export type SectionStatus = 'pending' | 'in_progress' | 'done';

export interface InvPlan { company_id: string; every_weeks: number; first_open_date: string; due_amount: number; due_unit: 'days' | 'weeks'; is_active: boolean; }
export interface InvLetter { id: string; company_id: string; code: string; name: string | null; sort_order: number; is_active: boolean; }
export interface InvRound { id: string; company_id: string; scheduled_for: string | null; opened_at: string; due_at: string; closed_at: string | null; close_reason: 'completed' | 'superseded' | null; opened_by: string; }
export interface InvSection {
  id: string; round_id: string; company_id: string; letter_id: string | null; code: string; name: string | null; sort_order: number;
  status: SectionStatus; claimed_by: string | null; claimed_at: string | null; done_by: string | null; done_at: string | null;
  shelf_photo: string | null; report_photos: string[]; area_state: AreaState | null;
  observations: string | null; improvement: string | null; action_taken: string | null;
  had_differences: boolean | null; differences_resolved: boolean | null; pending_note: string | null;
  redo_note: string | null; redo_requested_at: string | null;
}
export interface InvPending { id: string; round_id: string; section_id: string; note: string; reported_by: string | null; reported_at: string; resolved_at: string | null; resolved_by: string | null; resolution_note: string | null; code: string; }
export interface InvRoundSummary extends InvRound { total: number; done: number; }

export interface InventoryData {
  plan: InvPlan | null;
  letters: InvLetter[];
  current: InvRound | null;              // la abierta, o la última si no hay abierta
  sections: InvSection[];                // de `current`
  previous: Record<string, InvSection>;  // por letter_id: la ficha de la ronda anterior
  rounds: InvRoundSummary[];             // historial (12 más recientes)
  pendings: InvPending[];                // sin resolver
  people: Record<string, string>;        // employee_id → nombre
  perPerson: { id: string; name: string; current: number; total: number }[];
}
```

- [ ] **Paso 2: `lib/expo-push.ts`** (sale tal cual del route)

```ts
/** Manda una notificación a teléfonos con la app (Expo). Sin tokens, no hace nada. */
export async function pushExpo(tokens: string[], title: string, body: string): Promise<void> {
  if (tokens.length === 0) return;
  const messages = tokens.map(to => ({ to, title, body, sound: 'default', channelId: 'actividades', priority: 'high' }));
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Accept-Encoding': 'gzip, deflate' },
    body: JSON.stringify(messages),
  });
}
```

En `app/api/reminders/route.ts`: borrar la función `push` local, importar `import { pushExpo } from '@/lib/expo-push';`
y cambiar cada `await push(` por `await pushExpo(`.

- [ ] **Paso 3: `lib/inventory-server.ts`**

```ts
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { inventoryActions, type PlanRow, type OpenRoundInfo } from './inventory-schedule';
import { reminderTargets, type DeviceRow, type EmployeeTokenRow } from './push-targets';
import { pushExpo } from './expo-push';

/** Crea la ronda y sus fichas (copia de las letras activas). Devuelve el id o un error. */
export async function openRound(db: SupabaseClient, companyId: string, args: {
  scheduledFor: string | null; dueAt: string; openedBy: string; supersede?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data: letters, error: le } = await db.from('inventory_letters')
    .select('id, code, name, sort_order').eq('company_id', companyId).eq('is_active', true).order('sort_order').order('code');
  if (le) return { ok: false, error: le.message };
  if (!letters?.length) return { ok: false, error: 'No hay letras dadas de alta.' };
  if (args.supersede) {
    await db.from('inventory_rounds').update({ closed_at: new Date().toISOString(), close_reason: 'superseded' })
      .eq('id', args.supersede).is('closed_at', null);
  }
  const { data: round, error: re } = await db.from('inventory_rounds')
    .insert({ company_id: companyId, scheduled_for: args.scheduledFor, due_at: args.dueAt, opened_by: args.openedBy })
    .select('id').single();
  if (re || !round) return { ok: false, error: re?.message ?? 'No se pudo abrir la ronda.' };
  const rows = letters.map((l, i) => ({
    round_id: round.id, company_id: companyId, letter_id: l.id, code: l.code, name: l.name, sort_order: i,
  }));
  const { error: se } = await db.from('inventory_sections').insert(rows);
  if (se) {
    await db.from('inventory_rounds').delete().eq('id', round.id);
    return { ok: false, error: se.message };
  }
  return { ok: true, id: round.id as string };
}

/** Lo que el cron hace cada 5 minutos: abrir rondas que tocan y mandar avisos pendientes. */
export async function runInventoryTick(db: SupabaseClient, now: Date): Promise<string[]> {
  const log: string[] = [];
  const [{ data: plans }, { data: opens }, { data: sched }] = await Promise.all([
    db.from('inventory_plans').select('*'),
    db.from('inventory_rounds').select('id, company_id, opened_at, due_at, notices').is('closed_at', null),
    db.from('inventory_rounds').select('company_id, scheduled_for').not('scheduled_for', 'is', null).order('scheduled_for', { ascending: false }),
  ]);
  const companies = new Set<string>([...(plans ?? []).map(p => p.company_id as string), ...(opens ?? []).map(r => r.company_id as string)]);
  if (companies.size === 0) return log;

  const [{ data: devices }, { data: emps }] = await Promise.all([
    db.from('device_tokens').select('token, company_id'),
    db.from('employees').select('id, company_id, push_token').eq('is_active', true).not('push_token', 'is', null),
  ]);

  for (const companyId of companies) {
    const plan = ((plans ?? []).find(p => p.company_id === companyId) ?? null) as PlanRow | null;
    const openRow = (opens ?? []).find(r => r.company_id === companyId) ?? null;
    const lastScheduled = ((sched ?? []).find(r => r.company_id === companyId)?.scheduled_for as string | undefined) ?? null;
    let open: OpenRoundInfo | null = null;
    if (openRow) {
      const { data: secs } = await db.from('inventory_sections').select('status').eq('round_id', openRow.id);
      const total = secs?.length ?? 0;
      open = {
        id: openRow.id, opened_at: openRow.opened_at, due_at: openRow.due_at, notices: (openRow.notices ?? {}) as Record<string, string>,
        total, pending: (secs ?? []).filter(s => s.status !== 'done').length,
      };
    }
    const tokens = reminderTargets({ company_id: companyId, assigned_employee_ids: [] }, (devices ?? []) as DeviceRow[], (emps ?? []) as EmployeeTokenRow[]);

    for (const act of inventoryActions({ plan, open, lastScheduled, now })) {
      if (act.kind === 'open') {
        const r = await openRound(db, companyId, { scheduledFor: act.scheduledFor, dueAt: act.dueAt, openedBy: 'cron', supersede: act.supersede });
        log.push(r.ok ? `inventario abierto ${companyId} ${act.scheduledFor}` : `inventario NO abierto ${companyId}: ${r.error}`);
        continue;
      }
      if (!open) continue;
      // Primero se anota (así un error al mandar no repite el aviso cada 5 minutos).
      const notices = { ...open.notices, [act.key]: now.toISOString() };
      await db.from('inventory_rounds').update({ notices }).eq('id', open.id);
      open.notices = notices;
      await pushExpo(tokens, act.title, act.body);
      log.push(`inventario aviso ${act.key} → ${tokens.length} teléfonos`);
    }
  }
  return log;
}
```

- [ ] **Paso 4: llamar al tick desde `/api/reminders`** — en `app/api/reminders/route.ts`, justo después de
  `await syncMonthlyActive(supabase, mxNow);`:

```ts
  // Inventario por letra: abrir la ronda que toca y mandar sus avisos (no tumba los recordatorios si falla).
  let inventory: string[] = [];
  try { inventory = await runInventoryTick(supabase, new Date()); }
  catch (e) { inventory = [`inventario error: ${(e as Error).message}`]; }
```

  con `import { runInventoryTick } from '@/lib/inventory-server';`, y agregar `inventory` a los tres
  `NextResponse.json({ ok: true, … })` de la ruta.

- [ ] **Paso 5: revisar que `/api/cleanup` sólo toca el depósito `evidence`** — `grep -n "from('" app/api/cleanup/route.ts`. Si apareciera otro depósito, se limita a `evidence`.
- [ ] **Paso 6: `npx tsc --noEmit` y `npx jest`** — sin errores nuevos.
- [ ] **Paso 7: commit** — `git add lib/inventory-types.ts lib/expo-push.ts lib/inventory-server.ts app/api/reminders/route.ts && git commit -m "feat(inventario): el cron abre rondas y manda sus avisos"`

## Tarea 5: server actions del inventario (panel)

**Archivo:** crear `app/inventario/actions.ts`.

Funciones (todas empiezan con `const a = await adminAccess(); if (!a.ok) return a;` y validan empresa con
`allows(a.own, companyId)` o `ownsRow(tabla, id, a.own)`):

| Función | Qué hace | Validaciones |
|---|---|---|
| `loadInventory(companyId)` → `{ ok: true; data: InventoryData } \| { ok: false; error }` | Lee todo con service_role. `current` = ronda abierta o la más reciente. `previous` = fichas de la ronda anterior a `current` (por `letter_id`). `rounds` = 12 últimas con `total`/`done`. `perPerson` = fichas `done` por `done_by` (ronda actual y total histórico) con nombre. | empresa permitida |
| `saveInventoryPlan(companyId, input)` | `upsert` en `inventory_plans` con `updated_at`. | `every_weeks` entero 1–52; `first_open_date` AAAA-MM-DD válida; `due_amount` entero 1–60; `due_unit` days/weeks; `dueDays ≤ every_weeks·7` → "El plazo no puede ser más largo que el tiempo entre inventarios." |
| `addInventoryLetter(companyId, code, name)` | Inserta con `sort_order` = máximo + 1. | código: `trim().toUpperCase()`, 1–6 caracteres; nombre ≤ 60; duplicado (error 23505) → "Esa letra ya existe." |
| `updateInventoryLetter(id, code, name)` | Cambia código y nombre (no toca rondas ya abiertas). | mismas |
| `moveInventoryLetter(id, dir)` | Intercambia `sort_order` con la vecina (`dir` = −1 o 1). | `ownsRow` |
| `setInventoryLetterActive(id, active)` | Prende/apaga. | `ownsRow` |
| `deleteInventoryLetter(id)` | Borra (las fichas guardan copia de código y nombre). | `ownsRow` |
| `openInventoryRoundNow(companyId)` | `openRound(db, companyId, { scheduledFor: null, dueAt: dueInstant(hoy, plan), openedBy: a.session.userId })`. | Debe existir plan; no debe haber ronda abierta → "Ya hay un inventario abierto." |
| `requestSectionRedo(sectionId, note)` | Ficha → `pending`, borra `claimed_by/claimed_at`, pone `redo_note` y `redo_requested_at`, borra su pendiente sin resolver. Si la ronda estaba `completed` y es la más reciente de la empresa y no hay otra abierta, la reabre (`closed_at = null, close_reason = null`). | `ownsRow('inventory_sections')`; ficha `done`; nota 1–300; si la ronda está cerrada y no se puede reabrir → "Ese inventario ya se cerró y hay uno más nuevo." |
| `resolveInventoryPending(id, note)` | `resolved_at = now`, `resolved_by = a.session.name`, `resolution_note`. | `ownsRow('inventory_pendings')`; nota ≤ 300 |
| `inventoryPendingCount(companyId)` → `number` | Para el numerito del menú. 0 si no autorizado. | empresa permitida |

- [ ] **Paso 1: escribir el archivo** con `'use server'`, `export type Result = ActionResult;` y las funciones de la tabla.
  Las fotos guardan ruta (`<ronda>/<ficha>/<n>.jpg`); `loadInventory` las regresa como URL pública con
  `db.storage.from('inventario').getPublicUrl(path).data.publicUrl` (en `shelf_photo` y `report_photos`).
- [ ] **Paso 2: correr `npx jest lib/__tests__/use-server-exports.test.ts`** — debe pasar (revisa el nuevo archivo).
- [ ] **Paso 3: `npx tsc --noEmit`** — sin errores nuevos.
- [ ] **Paso 4: commit** — `git add app/inventario/actions.ts && git commit -m "feat(inventario): acciones del panel"`

## Tarea 6: página "Inventario" del panel

**Archivos:** crear `app/inventario/page.tsx`, `components/inventario/LetterGrid.tsx`, `SectionDialog.tsx`,
`PendingList.tsx`, `HistoryList.tsx`, `SettingsPanel.tsx`, `inv.module.css`; modificar `components/AdminShell.tsx`.

Mismo estilo que Conoce (`AdminShell`, `panel.module.css`: `s.page`, `s.top`, `s.eyebrow`, `s.title`, `s.sub`,
`s.tools`, `s.btn`, `s.btnPrimary`, `s.content`, `s.error`, `s.loading`, `s.card`).

- **Encabezado:** eyebrow "{empresa} · Inventario", título "Inventario", subtítulo según la ronda:
  "Diciembre · abierta el martes 1 · vence el lunes 7 · 7 de 18 letras" + píldora de estado
  (En curso azul, Atrasada rojo, Terminada verde, Terminada tarde ámbar, Cerrada incompleta gris).
  Sin ronda: "Todavía no hay inventarios. Configúralo en la pestaña Configuración."
- **Pestañas:** Ronda actual · Pendientes (n) · Historial · Configuración (guardada en `localStorage` con try/catch).
- **Ronda actual (`LetterGrid`):** barra de avance; cuadrícula de letras (código grande, nombre chico, estado
  por color, quién y hora); clic → `SectionDialog`. Debajo, "Quién hizo qué" (`perPerson`).
- **`SectionDialog`:** fotos (estante + reporte) en miniatura, clic → visor a pantalla completa (Escape cierra);
  estado del área, observaciones, mejora, qué se hizo, diferencias (sí/no, solucionadas, qué falta),
  quién la tomó y la terminó con hora. Recuadro "Ronda anterior" con estado y observaciones de `previous[letter_id]`.
  Botón "Pedir que se rehaga" → campo de nota (obligatorio) → `requestSectionRedo`.
- **`PendingList`:** tarjetas con letra, nota, quién y cuándo, ronda; botón "Resuelto" → nota opcional → `resolveInventoryPending`.
  Vacío: "No hay pendientes del inventario."
- **`HistoryList`:** filas con mes, fechas, `done/total`, píldora de `roundStatus`, días que tomó.
- **`SettingsPanel`:** plan (cada [N] semanas, desde [fecha], plazo [N] [días|semanas], interruptor activo,
  texto "Próximo inventario: lunes 12 de enero") + botón "Guardar"; letras (lista con código, nombre,
  ↑ ↓, activa, borrar con confirmación, y fila para agregar); botón "Abrir inventario ahora" con confirmación.
- **Menú (`AdminShell`):** `{ href: '/inventario', label: 'Inventario', icon: IconBox }` después de Conoce
  (sólo administradores) + numerito con `inventoryPendingCount(company.id)` cuando es mayor que 0.

- [ ] **Paso 1:** escribir componentes y página.
- [ ] **Paso 2:** `npx tsc --noEmit` sin errores nuevos.
- [ ] **Paso 3:** revisar en local (`next dev --webpack`, sesión firmada como en `laferre-admin-local-sin-password`)
  la pantalla vacía y con datos de ejemplo — sin guardar nada.
- [ ] **Paso 4: commit** con la lista explícita de archivos.

## Tarea 7: letras de inventario en el ranking de Reportes

**Archivos:** `app/reportes/page.tsx`, `components/reportes/PeopleCard.tsx`.

- [ ] **Paso 1:** en la carga de la semana, leer `inventory_sections` (`select('done_by')`, `company_id` = empresa,
  `status = 'done'`, `done_at` dentro de la semana mostrada) y armar `Record<employeeId, number>`.
- [ ] **Paso 2:** pasar `inventoryLetters` a `PeopleCard`; junto al nombre, si es > 0, una píldora
  "N letras de inventario" (`s.pill`, color neutro). Las personas sin actividades pero con letras también salen.
- [ ] **Paso 3:** `npx tsc --noEmit`; commit.

## Tarea 8: verificación del panel con la compilación de producción

- [ ] **Paso 1:** `vercel deploy --yes -e AUTH_SECRET=solo-local-prueba-reportes` (preview).
- [ ] **Paso 2:** firmar sesión de prueba con `jose`, sacar los id de las acciones de los chunks y llamar
  `loadInventory` (debe regresar `ok`) y `saveInventoryPlan` con un id de empresa falso (debe dar "Empresa no permitida"),
  con `vercel curl`.
- [ ] **Paso 3:** `vercel rm <url> --yes`.

## Tarea 9: funciones puras de la app

**Archivos (laferre-actividades):** crear `lib/inventory.ts` y `lib/__tests__/inventory.test.ts`.

- [ ] **Paso 1: pruebas**

```ts
import { missingForFinish, daysLeftLabel, emptyDraft, type Draft } from '../inventory';

const ok: Draft = {
  ...emptyDraft(), shelf: { path: 'r/s/1700000000001.jpg' }, reports: [{ path: 'r/s/1700000000002.jpg' }],
  area: 'bien', hadDiff: false,
};

describe('missingForFinish', () => {
  test('completa → null', () => { expect(missingForFinish(ok)).toBeNull(); });
  test('falta foto del estante', () => { expect(missingForFinish({ ...ok, shelf: undefined })).toBe('Falta la foto del estante.'); });
  test('falta reporte de Sicar', () => { expect(missingForFinish({ ...ok, reports: [] })).toBe('Falta la foto del reporte de Sicar.'); });
  test('foto sin subir cuenta como tomada (se reintenta al terminar)', () => {
    expect(missingForFinish({ ...ok, shelf: { local: 'file://x.jpg' } })).toBeNull();
  });
  test('estado del área', () => { expect(missingForFinish({ ...ok, area: undefined })).toBe('Elige cómo está el área.'); });
  test('regular o mal piden observaciones', () => {
    expect(missingForFinish({ ...ok, area: 'mal', observations: '  ' })).toBe('Escribe en observaciones por qué está mal.');
    expect(missingForFinish({ ...ok, area: 'regular', observations: 'Polvo' })).toBeNull();
  });
  test('diferencias', () => {
    expect(missingForFinish({ ...ok, hadDiff: undefined })).toBe('Contesta si hubo diferencias.');
    expect(missingForFinish({ ...ok, hadDiff: true })).toBe('Contesta si las diferencias quedaron solucionadas.');
    expect(missingForFinish({ ...ok, hadDiff: true, resolved: false })).toBe('Escribe qué falta por resolver.');
    expect(missingForFinish({ ...ok, hadDiff: true, resolved: false, pendingNote: 'Faltan 3 brocas' })).toBeNull();
  });
});

describe('daysLeftLabel', () => {
  const due = '2026-12-08T05:59:59.000Z'; // 7 de diciembre, 23:59:59 en Matamoros
  test('varios días', () => { expect(daysLeftLabel(due, new Date('2026-12-03T16:00:00Z'))).toBe('quedan 5 días'); });
  test('último día', () => { expect(daysLeftLabel(due, new Date('2026-12-07T16:00:00Z'))).toBe('hoy es el último día'); });
  test('vencido', () => { expect(daysLeftLabel(due, new Date('2026-12-08T16:00:00Z'))).toBe('ya venció'); });
});
```

- [ ] **Paso 2: `lib/inventory.ts`**

```ts
// Inventario por letra en el teléfono: tipos y reglas puras (mismas reglas que inv_finish_section).
export type AreaState = 'bien' | 'regular' | 'mal';
export type SectionStatus = 'pending' | 'in_progress' | 'done';

export interface InvRound { id: string; company_id: string; opened_at: string; due_at: string; closed_at: string | null; }
export interface InvSection {
  id: string; round_id: string; code: string; name: string | null; sort_order: number; status: SectionStatus;
  claimed_by: string | null; claimed_at: string | null; done_by: string | null; done_at: string | null; redo_note: string | null;
}

/** Una foto del borrador: `local` mientras no se sube; `path` (ruta en el depósito) cuando ya subió. */
export interface PhotoRef { local?: string; path?: string; }
export interface Draft {
  shelf?: PhotoRef; reports: PhotoRef[]; area?: AreaState;
  observations: string; improvement: string; action: string;
  hadDiff?: boolean; resolved?: boolean; pendingNote: string;
}

export const emptyDraft = (): Draft => ({ reports: [], observations: '', improvement: '', action: '', pendingNote: '' });

export function missingForFinish(d: Draft): string | null {
  if (!d.shelf) return 'Falta la foto del estante.';
  if (d.reports.length === 0) return 'Falta la foto del reporte de Sicar.';
  if (!d.area) return 'Elige cómo está el área.';
  if ((d.area === 'regular' || d.area === 'mal') && !d.observations.trim()) return `Escribe en observaciones por qué está ${d.area}.`;
  if (d.hadDiff === undefined) return 'Contesta si hubo diferencias.';
  if (d.hadDiff && d.resolved === undefined) return 'Contesta si las diferencias quedaron solucionadas.';
  if (d.hadDiff && d.resolved === false && !d.pendingNote.trim()) return 'Escribe qué falta por resolver.';
  return null;
}

const shopDate = (at: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Matamoros', year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
const dayMs = (d: string) => { const [y, m, dd] = d.split('-').map(Number); return Date.UTC(y, m - 1, dd); };

/** "quedan 5 días" · "hoy es el último día" · "ya venció" (por día de calendario en Matamoros). */
export function daysLeftLabel(dueAt: string, now: Date = new Date()): string {
  if (now.getTime() > new Date(dueAt).getTime()) return 'ya venció';
  const left = Math.round((dayMs(shopDate(new Date(dueAt))) - dayMs(shopDate(now))) / 86_400_000) + 1;
  return left <= 1 ? 'hoy es el último día' : `quedan ${left} días`;
}
```

- [ ] **Paso 3:** `npx jest --runInBand` → pasan todas (las 11 de antes + las nuevas).
- [ ] **Paso 4: commit** — `git add lib/inventory.ts lib/__tests__/inventory.test.ts && git commit -m "feat(inventario): reglas de la ficha en la app"`

## Tarea 10: acceso a datos de la app

**Archivo:** crear `lib/inventoryApi.ts`.

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { emptyDraft, type Draft, type InvRound, type InvSection } from './inventory';

export const INV_BUCKET = 'inventario';

export async function loadOpenRound(companyId: string): Promise<{ round: InvRound; sections: InvSection[] } | null> {
  const { data: round } = await supabase.from('inventory_rounds')
    .select('id, company_id, opened_at, due_at, closed_at').eq('company_id', companyId).is('closed_at', null).maybeSingle();
  if (!round) return null;
  const { data: sections } = await supabase.from('inventory_sections')
    .select('id, round_id, code, name, sort_order, status, claimed_by, claimed_at, done_by, done_at, redo_note')
    .eq('round_id', round.id).order('sort_order');
  return { round: round as InvRound, sections: (sections ?? []) as InvSection[] };
}

type RpcResult = { ok: true; roundClosed?: boolean } | { ok: false; error: string; code?: string; by?: string };

export async function claimSection(sectionId: string, employeeId: string, force = false): Promise<RpcResult> {
  const { data, error } = await supabase.rpc('inv_claim_section', { p_section: sectionId, p_employee: employeeId, p_force: force });
  if (error) return { ok: false, error: 'No hay conexión. Intenta de nuevo.' };
  return data as RpcResult;
}

/** Sube una foto y regresa su ruta (`<ronda>/<ficha>/<13 dígitos>.jpg`). */
export async function uploadInventoryPhoto(roundId: string, sectionId: string, uri: string): Promise<string> {
  const buf = await (await fetch(uri)).arrayBuffer();
  const path = `${roundId}/${sectionId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from(INV_BUCKET).upload(path, buf, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}

export function photoUrl(path: string): string {
  return supabase.storage.from(INV_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function finishSection(sectionId: string, employeeId: string, d: Draft & { shelfPath: string; reportPaths: string[] }): Promise<RpcResult> {
  const { data, error } = await supabase.rpc('inv_finish_section', {
    p_section: sectionId, p_employee: employeeId, p_shelf_photo: d.shelfPath, p_report_photos: d.reportPaths,
    p_area_state: d.area, p_observations: d.observations, p_improvement: d.improvement, p_action_taken: d.action,
    p_had_differences: d.hadDiff, p_differences_resolved: d.hadDiff ? d.resolved : null, p_pending_note: d.pendingNote,
  });
  if (error) return { ok: false, error: 'No hay conexión. Lo capturado sigue guardado en el teléfono; intenta de nuevo.' };
  return data as RpcResult;
}

const key = (sectionId: string) => `@inv_draft_${sectionId}`;
export async function loadDraft(sectionId: string): Promise<Draft> {
  try { const raw = await AsyncStorage.getItem(key(sectionId)); return raw ? { ...emptyDraft(), ...JSON.parse(raw) } : emptyDraft(); }
  catch { return emptyDraft(); }
}
export async function saveDraft(sectionId: string, d: Draft): Promise<void> {
  try { await AsyncStorage.setItem(key(sectionId), JSON.stringify(d)); } catch { /* sin espacio: se sigue en memoria */ }
}
export async function clearDraft(sectionId: string): Promise<void> {
  try { await AsyncStorage.removeItem(key(sectionId)); } catch { /* nada */ }
}
```

- [ ] **Paso 1:** escribir el archivo. **Paso 2:** `npx tsc --noEmit`. **Paso 3:** commit.

## Tarea 11: pantallas de la app

**Archivos:** crear `components/InventoryCard.tsx`, `app/inventario/index.tsx`, `app/inventario/[id].tsx`;
modificar `app/(employee)/index.tsx`.

Estilo: el mismo del inicio (PanelBackdrop, `glass`, Geist `font.*`, `Icon`, `Appear`, colores de `constants/theme`).

- **`InventoryCard`** (props `round`, `sections`, `onOpen`): tarjeta de vidrio con borde de acento, ícono de caja,
  "INVENTARIO DE DICIEMBRE", "7 de 18 letras · quedan 3 días" (rojo si `ya venció`), barra de avance y botón
  "Entrar". En el inicio va entre la tarjeta negra y el resumen; `loadData` llama `loadOpenRound(companyId)`.
- **`app/inventario/index.tsx`:** encabezado (atrás, "Inventario de diciembre", avance y `daysLeftLabel`);
  cuadrícula de 3 columnas (4 si la pantalla es ancha) con fichas: código grande, nombre, estado
  (Pendiente gris · "En proceso · Laura" azul · "Hecha · Juan 10:42" verde · "Rehacer" naranja con la nota ·
  pendiente con plazo vencido en rojo). Tocar:
  - hecha → aviso "Ya está hecha por Juan";
  - mía en proceso → abre la ficha;
  - pendiente → `claimSection` → abre la ficha;
  - de otro en proceso → confirmación "Laura la empezó. ¿La tomas tú?" → `claimSection(…, true)` → abre la ficha.
  Se recarga al enfocar la pantalla y cada 15 s.
- **`app/inventario/[id].tsx`:** carga la ficha (`inventory_sections` por id) y el borrador; si la ficha ya no es
  `in_progress` a mi nombre, avisa y regresa. Pasos en una sola pantalla con tarjetas numeradas:
  1. Foto del estante (botón grande con cámara; miniatura con "Cambiar").
  2. Fotos del reporte de Sicar (miniaturas + "+ otra página"; quitar con ✕).
  3. Estado del área: tres botones grandes (Bien verde, Regular ámbar, Mal rojo).
  4. Observaciones, mejora propuesta, qué se hizo (campos de texto de varias líneas).
  5. ¿Hubo diferencias? Sí/No → ¿quedaron solucionadas? Sí/No → ¿qué falta por resolver?
  Botón fijo abajo "Terminar letra A" (gris con el texto de `missingForFinish` si falta algo).
  Cada cambio → `saveDraft`. Cada foto: se intenta subir al tomarla (`uploadInventoryPhoto`); si falla, queda `local`.
  Al terminar: sube las que falten, llama `finishSection`, limpia el borrador y regresa a la cuadrícula
  con "Letra A terminada"; si `roundClosed`, "¡Terminaron el inventario!".
  Cámara: en el teléfono `ImagePicker.launchCameraAsync({ quality: 0.5 })`; en web, `<input type=file capture>`
  (como `app/camera.tsx`).

- [ ] **Paso 1:** escribir componentes y pantallas. **Paso 2:** `npx tsc --noEmit` y `npx jest --runInBand`.
- [ ] **Paso 3:** export web y capturas con Playwright usando datos de ejemplo (`page.route`) y bloqueando toda
  escritura a Supabase: inicio con tarjeta, cuadrícula con los cinco estados, ficha vacía, ficha con "falta" y
  ficha lista. También con "reducir movimiento".
- [ ] **Paso 4:** commit con lista explícita de archivos.

## Tarea 12: arranque (con el dueño)

- [ ] El dueño corre `007_inventario.sql` y `007_inventario_prueba.sql` (Tareas 1–2) — se puede hacer en cuanto estén escritos.
- [ ] Subir el panel cuando diga "súbelo"; comprobar cron-job.org en 200 y `inventory: []` en la respuesta.
- [ ] El dueño da de alta letras, frecuencia, plazo y primera fecha.
- [ ] Apagar las dos actividades "Inventario mensual" cuando abra la primera ronda.
- [ ] `npx eas login` (dueño) → APK La Ferre (`--profile preview`) y BFM (`--profile bfm`) → links para los 6 teléfonos.
