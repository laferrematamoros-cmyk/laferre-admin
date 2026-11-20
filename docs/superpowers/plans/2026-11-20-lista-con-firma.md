# Lista con firma — Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans, tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** cualquier actividad puede tener lista de tareas por día, rol semanal y firma (PIN en el teléfono o desde el panel con aviso por correo). La primera es LIMPIEZA de La Ferre.

**Arquitectura:**
- **Base de datos:**
  - toda la lógica que escribe vive en SQL (RPC `SECURITY DEFINER`, migración 010);
  - el teléfono sólo llama RPC;
  - el panel llama RPC exclusivas de `service_role` para firmar, regresar y poner el PIN;
  - "a quién le toca" sale de `duty_employee()` en SQL, con copia en TS (`lib/duty.ts`) para Reportes e Inicio, que calculan muchos días en el navegador;
  - la fila de `completions` se crea sólo al firmar, así que Reportes y el ranking la cuentan sin cambios.
- **Correo:** Gmail + nodemailer, como en bfm-rrhh.

**Diseño:** `docs/superpowers/specs/2026-11-20-lista-con-firma-design.md`.

**Tecnología:**
- Next.js 16 (panel, `laferre-admin`, rama main, se publica solo al hacer push).
- Expo SDK 54 (app, `laferre-actividades`, rama master, se manda por internet con `npm run actualizar`).
- Supabase `yagsegxzodiffsfvnjvp`.
- jest + ts-jest en los dos repos.

**Reglas de la casa (obligatorias):**
- Nunca `git add -A`: listar archivos.
- El panel se sube sólo cuando el dueño dice "súbelo".
- La app se manda sólo con su "sí, mándala".
- El SQL lo corre el dueño en el SQL Editor.
- La base de pruebas ES producción: nada de crear rondas, listas ni firmas reales para probar. El script SQL de prueba termina en `raise exception`.
- Archivos `'use server'`: sólo `export async function` + `export type Result = ActionResult` (lo cuida `lib/__tests__/use-server-exports.test.ts`).
- Pruebas:
  - panel: `npx jest` (en Windows, `NODE_OPTIONS=--max-old-space-size=3072`) y `npx tsc --noEmit` (2048);
  - app: `npx jest --runInBand` (3072) y `npx tsc --noEmit` (2048).

---

## Archivos

**Panel (`C:\Users\jose_\laferre-admin`)**

| Archivo | Qué hace |
|---|---|
| `supabase/010_lista_con_firma.sql` | Tablas, RPC, trigger, depósito `listas`, carga de LIMPIEZA |
| `supabase/010_lista_con_firma_prueba.sql` | Pruebas SQL (termina en `raise exception`) |
| `lib/duty.ts` (+ test) | Rol, cambios y "a quién le toca" en TS; semanas siguientes |
| `lib/duty-data.ts` | Agrega rol, cambios y listas por firmar a las actividades que se cargan |
| `lib/reports.ts`, `lib/today.ts` (+ tests) | Usan `assignedOn` / `isSigning`; estado "Falta firma" |
| `lib/push-targets.ts` | Sin cambio (se le pasa la actividad con `assigned_employee_ids` del turno) |
| `app/api/reminders/route.ts` | Recordatorios al de turno; no recordar lo entregado; avisos de correo pendientes |
| `app/api/cleanup/route.ts` | Borra fotos de `listas` de más de 21 días |
| `app/api/listas/aviso/route.ts` | La app avisa "terminé" → correo (una sola vez) |
| `lib/mailer.ts` | nodemailer + Gmail |
| `lib/checklist-mail.ts` (+ test) | Arma asunto, HTML y texto del correo (puro) |
| `lib/checklist-notices.ts` | Manda los correos pendientes (lista terminada, PIN bloqueado) |
| `lib/checklist-types.ts` | Tipos compartidos del panel |
| `lib/bitacora.ts` (+ test) | Arma la tabla semanal (puro) |
| `lib/bitacora-pdf.ts` | PDF con jsPDF |
| `app/actividades/checklist-actions.ts` | Lista, rol y cambios (admin) |
| `components/actividades/ChecklistEditor.tsx` (+ `checklist.module.css`) | Editor en la página de la actividad |
| `app/actividades/[id]/page.tsx` | Monta el editor y el enlace a la bitácora |
| `app/actividades/[id]/bitacora/page.tsx` | Bitácora semanal + PDF |
| `app/firmas/page.tsx`, `app/firmas/actions.ts` | Por firmar: firmar o regresar |
| `components/firmas/SignDialog.tsx` (+ `firmas.module.css`) | Ficha de una lista |
| `components/AdminShell.tsx` | Entrada "Por firmar" con numerito (sólo admin) |
| `app/ajustes/signer-actions.ts`, `components/ajustes/Firma.tsx` | Nombre, PIN, correos, prueba de correo |
| `app/dashboard`, `app/reportes`, `app/calendario`, `app/mis-actividades` (páginas) | Pasan las actividades por `withDuty` |
| `app/mis-actividades/actions.ts` | No deja marcar a mano una actividad con lista |
| `components/hoy/*` | Color y etiqueta del estado `signing` |

**App (`C:\Users\jose_\laferre-actividades`)**

| Archivo | Qué hace |
|---|---|
| `lib/checklist.ts` (+ test) | Tipos y reglas puras (avance, terminar, agrupar, etiqueta, PIN) |
| `lib/checklistApi.ts` | RPC, subir foto, avisar al panel |
| `app/lista/[id].tsx` | La lista del día, "Terminé", "Firmar aquí" con PIN |
| `components/PinPad.tsx` | Teclado de PIN |
| `app/(employee)/index.tsx` | Filtra por turno, enseña el estado y abre la lista en lugar de la cámara |

---

## Fase 1 — Base de datos

### Tarea 1: Migración 010

**Archivos:** crear `supabase/010_lista_con_firma.sql`.

- [ ] **Paso 1: escribir la migración completa**

**Hecho (commit `b3008cb` y siguientes).** El archivo `supabase/010_lista_con_firma.sql` es la versión buena; aquí ya no se copia para que no haya dos. Cambios después de la revisión de seguridad: el PIN se bloquea 15 min, luego 30, y al tercer bloqueo se apaga (`pin_lock_count`, `pin_disabled`) hasta crear uno nuevo; así nadie prueba más de 15 PIN.

- [ ] **Paso 2: revisar contra la hoja**
  - Los días de la carga deben coincidir con la hoja (lun 10, mar 10, mié 6, jue 10, vie 8, sáb 9 tareas).
  - Revisarlo contando en la lista de arriba.

- [ ] **Paso 3: commit**

```bash
git add supabase/010_lista_con_firma.sql
git commit -m "feat(listas): migración 010 — lista con firma, rol semanal y PIN"
```

### Tarea 2: Pruebas SQL

**Archivos:** crear `supabase/010_lista_con_firma_prueba.sql`.

- [ ] **Paso 1: escribir el script**
  - Todo en una transacción que termina en `raise exception 'RESULTADOS (no se guardó nada):%'`, con el resumen, para que nada se guarde. El editor no enseña NOTICE.
  - Arma sus datos en la misma transacción: una actividad de prueba con `checklist_enabled`, 2 tareas (una con foto), un rol de 2 empleados reales de La Ferre (Laura y Yajaira) con `anchor_week` = lunes de esta semana, y `chk_set_pin('2468')`.
  - Va acumulando en un texto `res` una línea por caso con `OK` o `FALLA`.

| # | Caso | Esperado |
|---|---|---|
| 1 | `duty_employee` esta semana / la siguiente / la anterior | Laura / Yajaira / Yajaira |
| 2 | override de un día a Yajaira hoy | Yajaira hoy; Laura mañana |
| 3 | `chk_open` con el que no está de turno | `ok=false` "le toca a" |
| 4 | `chk_open` con el de turno | `ok=true`, 2 marks |
| 5 | `chk_mark` done en la tarea con foto, sin foto | "Falta la foto" |
| 6 | `chk_mark` skipped sin motivo | "Escribe por qué" |
| 7 | `chk_finish` con pendientes | "Faltan tareas" |
| 8 | marcar la sin foto `done` y la con foto `skipped` con motivo → `chk_finish` | `ok`, status `awaiting_signature` |
| 9 | insert directo en `completions` de esa actividad | error "Actualiza la app" |
| 10 | `chk_sign_pin` con PIN malo 4 veces | "Te queda 1 intento." |
| 11 | 5º PIN malo | `code=locked` y `pin_locked_until` > now |
| 12 | PIN bueno estando bloqueado | `code=locked` |
| 13 | quitar el bloqueo (`update signer_settings…`), `chk_return` con una tarea | status `returned`, la tarea `pending` |
| 14 | volver a marcar + `chk_finish` + `chk_sign_panel` | `signed`, existe la fila en `completions`, `completion_id` puesto |
| 15 | `chk_sign_panel` otra vez | "ya está firmada" |
| 16 | `chk_today(company)` | trae la actividad de prueba con `status=signed` |

- [ ] **Paso 2: commit**

```bash
git add supabase/010_lista_con_firma_prueba.sql
git commit -m "test(listas): pruebas SQL de la 010 (no guardan nada)"
```

- [ ] **Paso 3: pedirle al dueño que corra la 010 y luego la prueba** (pegando el texto de la prueba de vuelta). Después, comprobar con la llave anon:
  - `chk_today` contesta;
  - `signer_settings` NO se puede leer;
  - `chk_set_pin` da permiso denegado;
  - `checklist_items` trae 18 filas de LIMPIEZA.

---

## Fase 2 — "A quién le toca" en el panel

### Tarea 3: `lib/duty.ts`

**Archivos:** crear `lib/duty.ts` y `lib/__tests__/duty.test.ts`.

- [ ] **Paso 1: prueba que falla**

```ts
import { dutyOn, assignedOn, isSigning, mondayOf, upcomingDuty, type Rotation, type DutyOverride } from '../duty';

const E = 'eddie', L = 'laura', Y = 'yaja';
const rot: Rotation = { employee_ids: [E, L, Y], anchor_week: '2026-11-16', valid_from: '2026-11-16', created_at: '2026-11-20T10:00:00Z' };

describe('dutyOn', () => {
  it('rota cada lunes y se repite', () => {
    expect(dutyOn([rot], [], '2026-11-16')).toBe(E);
    expect(dutyOn([rot], [], '2026-11-22')).toBe(E); // domingo: misma semana
    expect(dutyOn([rot], [], '2026-11-23')).toBe(L);
    expect(dutyOn([rot], [], '2026-11-30')).toBe(Y);
    expect(dutyOn([rot], [], '2026-12-07')).toBe(E);
  });
  it('antes de que existiera el rol no hay nadie', () => {
    expect(dutyOn([rot], [], '2026-11-15')).toBeNull();
  });
  it('una versión nueva no cambia las semanas anteriores', () => {
    const v2: Rotation = { employee_ids: [Y, E], anchor_week: '2026-12-07', valid_from: '2026-12-07', created_at: '2026-12-05T10:00:00Z' };
    expect(dutyOn([rot, v2], [], '2026-11-30')).toBe(Y);
    expect(dutyOn([rot, v2], [], '2026-12-07')).toBe(Y);
    expect(dutyOn([rot, v2], [], '2026-12-14')).toBe(E);
  });
  it('gana el cambio más reciente que cubre el día', () => {
    const ov: DutyOverride[] = [
      { from_date: '2026-11-23', to_date: '2026-11-29', employee_id: Y, created_at: '2026-11-20T10:00:00Z' },
      { from_date: '2026-11-25', to_date: '2026-11-25', employee_id: E, created_at: '2026-11-21T10:00:00Z' },
    ];
    expect(dutyOn([rot], ov, '2026-11-24')).toBe(Y);
    expect(dutyOn([rot], ov, '2026-11-25')).toBe(E);
    expect(dutyOn([rot], ov, '2026-11-30')).toBe(Y); // fuera del cambio: el rol
  });
  it('semanas con índice negativo (fecha anterior al ancla en una versión válida)', () => {
    const r: Rotation = { ...rot, anchor_week: '2026-11-30', valid_from: '2026-11-01' };
    expect(dutyOn([r], [], '2026-11-23')).toBe(Y); // una semana antes del ancla → último
  });
});

describe('assignedOn / isSigning', () => {
  it('sin rol usa los asignados de siempre', () => {
    expect(assignedOn({ assigned_employee_ids: [L] }, '2026-11-23')).toEqual([L]);
  });
  it('con rol usa al de turno; sin nadie de turno queda general', () => {
    expect(assignedOn({ assigned_employee_ids: [], rotations: [rot] }, '2026-11-23')).toEqual([L]);
    expect(assignedOn({ assigned_employee_ids: [], rotations: [rot] }, '2026-11-10')).toEqual([]);
  });
  it('isSigning', () => {
    expect(isSigning({ signingDates: ['2026-11-23'] }, '2026-11-23')).toBe(true);
    expect(isSigning({}, '2026-11-23')).toBe(false);
  });
});

describe('mondayOf / upcomingDuty', () => {
  it('mondayOf', () => {
    expect(mondayOf('2026-11-20')).toBe('2026-11-16');
    expect(mondayOf('2026-11-22')).toBe('2026-11-16');
    expect(mondayOf('2026-11-23')).toBe('2026-11-23');
  });
  it('esta semana y las 4 siguientes', () => {
    expect(upcomingDuty([rot], [], '2026-11-20', 5).map(w => [w.weekStart, w.employeeId])).toEqual([
      ['2026-11-16', E], ['2026-11-23', L], ['2026-11-30', Y], ['2026-12-07', E], ['2026-12-14', L],
    ]);
  });
});
```

- [ ] **Paso 2:** `npx jest lib/__tests__/duty.test.ts` → falla (no existe el módulo).

- [ ] **Paso 3: implementación**

```ts
// A quién le toca una actividad un día. Copia de duty_employee() de supabase/010:
// si se cambia una, se cambia la otra (las dos pruebas usan los mismos casos).
export interface Rotation { employee_ids: string[]; anchor_week: string; valid_from: string; created_at: string; }
export interface DutyOverride { from_date: string; to_date: string; employee_id: string; created_at: string; }
/** Lo que withDuty() le agrega a una actividad con lista. */
export interface DutyInfo { rotations?: Rotation[]; overrides?: DutyOverride[]; signingDates?: string[]; }

const dayNum = (s: string) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d) / 86_400_000; };
const fromNum = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10);

export function mondayOf(date: string): string {
  const n = dayNum(date);
  const dow = new Date(n * 86_400_000).getUTCDay(); // 0 = domingo
  return fromNum(n - ((dow + 6) % 7));
}

export function dutyOn(rotations: Rotation[] | undefined, overrides: DutyOverride[] | undefined, date: string): string | null {
  const o = (overrides ?? [])
    .filter(x => x.from_date <= date && date <= x.to_date)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (o) return o.employee_id;
  const r = (rotations ?? [])
    .filter(x => x.valid_from <= date && x.employee_ids.length > 0)
    .sort((a, b) => b.valid_from.localeCompare(a.valid_from) || b.created_at.localeCompare(a.created_at))[0];
  if (!r) return null;
  const n = r.employee_ids.length;
  const week = Math.floor((dayNum(date) - dayNum(r.anchor_week)) / 7);
  return r.employee_ids[((week % n) + n) % n];
}

/** Asignados de la actividad ese día: con rol, el de turno (o nadie); sin rol, los de siempre. */
export function assignedOn(a: { assigned_employee_ids: string[] | null } & DutyInfo, date: string): string[] {
  if (a.rotations && a.rotations.length > 0) {
    const d = dutyOn(a.rotations, a.overrides, date);
    return d ? [d] : [];
  }
  return (a.assigned_employee_ids ?? []) as string[];
}

/** La lista de ese día está terminada y espera firma. */
export const isSigning = (a: DutyInfo, date: string): boolean => (a.signingDates ?? []).includes(date);

/** Esta semana y las siguientes, para el editor del rol. */
export function upcomingDuty(rotations: Rotation[], overrides: DutyOverride[], today: string, n: number): { weekStart: string; employeeId: string | null }[] {
  const start = dayNum(mondayOf(today));
  return Array.from({ length: n }, (_, i) => {
    const weekStart = fromNum(start + i * 7);
    // Se pregunta por el martes: un cambio de un solo día en lunes no debe pintar toda la semana.
    return { weekStart, employeeId: dutyOn(rotations, overrides.filter(o => o.from_date <= weekStart && o.to_date >= fromNum(dayNum(weekStart) + 5)), fromNum(dayNum(weekStart) + 1)) };
  });
}
```

- [ ] **Paso 4:** `npx jest lib/__tests__/duty.test.ts` → pasa.

- [ ] **Paso 5: commit**

```bash
git add lib/duty.ts lib/__tests__/duty.test.ts
git commit -m "feat(listas): a quién le toca (rol semanal y cambios) en TS"
```

### Tarea 4: Reportes e Inicio con turno y "Falta firma"

**Archivos:** modificar `lib/reports.ts`, `lib/today.ts`, `lib/__tests__/reports.test.ts`, `lib/__tests__/today.test.ts`, `components/hoy/DayLine.tsx`, `components/hoy/DaySummary.tsx` (y donde TS marque un `Record<TodayStatus, …>` incompleto).

- [ ] **Paso 1: pruebas que fallan** (agregar a las existentes y reusar sus helpers de fechas)
  - `reports.test.ts`: una actividad con `rotations` (Eddie la semana A, Laura la B):
    - un día de la semana A sin completion y vencido → `miss` a Eddie (no a Laura), aunque `now` sea en la semana B;
    - con `signingDates` de ese día → no cuenta `miss`, cuenta `todo`, y `report.signing === 1`.
  - `today.test.ts`:
    - con `signingDates: [hoy]` y sin completion, pasada la hora límite → status `'signing'`, no entra a `due`, y la persona lleva `pending++`;
    - con rol, `assignedIds` es el de turno.

- [ ] **Paso 2:** correr esas dos pruebas → fallan.

- [ ] **Paso 3: implementación**
  - `reports.ts`:
    - `ReportActivity = … & Lifecycle & DutyInfo`;
    - en `buildWeekReport`, `const assigned = assignedOn(a, dateStr)` (en lugar de `a.assigned_employee_ids`);
    - antes de `activityStatus`: si `!comp && isSigning(a, dateStr)` → `st = 'todo'` y `signing++`;
    - `WeekReport` gana `signing: number` (lo regresa el `return`).
  - `today.ts`:
    - `TodayStatus` agrega `'signing'`, en `TODAY_STATUSES` (después de `'running'`) y en `TODAY_LABEL` (`signing: 'Falta firma'`);
    - `TodayActivity … & DutyInfo`;
    - en el `map`: `assigned = assignedOn(a, dateStr)`, y `status` → `'signing'` si `!comp && isSigning(a, dateStr)` y no es opcional;
    - en el conteo, `signing` va a `counts.signing` y a `bump(id).pending++` (como `running` / `upcoming`);
    - `due` sigue siendo hechas + atrasadas.
  - `components/hoy/*`: color de `signing` = el de "en curso" con borde punteado (clase nueva `st_signing` en el CSS del módulo, usando variables existentes `--st-run-soft` / `--st-run-ink`). La etiqueta sale de `TODAY_LABEL`. `DaySummary` agrega el chip `signing` después de `running`, con el texto `['Falta firma', 'Faltan firma']`.

- [ ] **Paso 4:** `npx jest` completo y `npx tsc --noEmit` → todo pasa.

- [ ] **Paso 5: commit** (listar los archivos tocados)

```bash
git commit -m "feat(listas): Reportes e Inicio usan el turno del día y el estado Falta firma"
```

### Tarea 5: `withDuty` y las pantallas que cargan actividades

**Archivos:**
- crear `lib/duty-data.ts`;
- modificar `app/dashboard/page.tsx`, `app/reportes/page.tsx`, `app/calendario/page.tsx`, `app/mis-actividades/page.tsx`, `app/mis-actividades/actions.ts`.

- [ ] **Paso 1: implementación**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DutyInfo, DutyOverride, Rotation } from './duty';

/**
 * Le agrega a cada actividad con lista su rol, sus cambios y los días que esperan firma
 * (entre `from` y `to`, YYYY-MM-DD). Si la base todavía no tiene el SQL 010, regresa
 * las actividades como venían (todo sigue funcionando como antes).
 */
export async function withDuty<T extends { id: string; checklist_enabled?: boolean | null }>(
  db: SupabaseClient, acts: T[], from: string, to: string,
): Promise<(T & DutyInfo)[]> {
  const ids = acts.filter(a => a.checklist_enabled).map(a => a.id);
  if (ids.length === 0) return acts;
  const [rot, ov, runs] = await Promise.all([
    db.from('activity_rotations').select('activity_id, employee_ids, anchor_week, valid_from, created_at').in('activity_id', ids),
    db.from('activity_duty_overrides').select('activity_id, from_date, to_date, employee_id, created_at')
      .in('activity_id', ids).lte('from_date', to).gte('to_date', from),
    db.from('checklist_runs').select('activity_id, scheduled_date')
      .in('activity_id', ids).eq('status', 'awaiting_signature').gte('scheduled_date', from).lte('scheduled_date', to),
  ]);
  if (rot.error || ov.error || runs.error) return acts;
  const by = <R extends { activity_id: string }>(rows: R[]) => {
    const m = new Map<string, R[]>();
    for (const r of rows) m.set(r.activity_id, [...(m.get(r.activity_id) ?? []), r]);
    return m;
  };
  const R = by((rot.data ?? []) as (Rotation & { activity_id: string })[]);
  const O = by((ov.data ?? []) as (DutyOverride & { activity_id: string })[]);
  const S = by((runs.data ?? []) as { activity_id: string; scheduled_date: string }[]);
  return acts.map(a => a.checklist_enabled
    ? { ...a, rotations: R.get(a.id) ?? [], overrides: O.get(a.id) ?? [], signingDates: (S.get(a.id) ?? []).map(r => r.scheduled_date) }
    : a);
}
```

- [ ] **Paso 2:** en cada página, justo después de cargar `activities` (el `select` ya trae `*`, o se agrega `checklist_enabled` al select si es explícito), pasar `await withDuty(supabase, activities, from, to)`:
  - Reportes: `from` / `to` de las 12 semanas que ya calcula.
  - Dashboard y calendario: el día que se pinta.
  - mis-actividades: el rango que carga.

- [ ] **Paso 3:** en `app/mis-actividades/actions.ts`, al registrar una actividad hecha, agregar `checklist_enabled` al select de la línea 34. Si viene `true`, `return fail('Esta actividad se hace con su lista desde el teléfono.')`.

- [ ] **Paso 4:** `npx jest` + `npx tsc --noEmit`.

- [ ] **Paso 5:** revisar en local que Inicio y Reportes cargan igual que antes. Con `AUTH_SECRET=solo-local-prueba-reportes npx next dev --webpack --port 3010` y token firmado; antes de correr el SQL, `withDuty` cae al camino de siempre.

- [ ] **Paso 6: commit**

```bash
git commit -m "feat(listas): las pantallas del panel cargan el turno y las listas por firmar"
```

### Tarea 6: Recordatorios al de turno

**Archivos:** modificar `app/api/reminders/route.ts`.

- [ ] **Paso 1:** después de cargar `acts`, si hay alguna con `checklist_enabled`, cargar:

```ts
supabase.from('checklist_runs').select('activity_id, status').eq('scheduled_date', todayStr)
```

  y, por cada una, `supabase.rpc('duty_employee', { p_activity: id, p_date: todayStr })`.

- [ ] **Paso 2:** en el ciclo, para actividades con lista:
  - si su run está en `awaiting_signature` o `signed`, `continue` (ya la entregó);
  - si no hay nadie de turno, `continue`;
  - si hay, `reminderTargets({ ...act, assigned_employee_ids: [duty] }, …)`.
  - Si la consulta de runs falla (sin SQL 010), se comporta como hoy.

- [ ] **Paso 3:** `npx tsc --noEmit`; revisar con `vercel curl` en una versión de prueba que `/api/reminders` sigue contestando 401 sin clave. No llamarlo con la clave.

- [ ] **Paso 4: commit**

```bash
git add app/api/reminders/route.ts
git commit -m "feat(listas): los recordatorios de una lista van sólo al de turno"
```

---

## Fase 3 — Correo

### Tarea 7: armar el correo (puro)

**Archivos:** crear `lib/checklist-mail.ts` y `lib/__tests__/checklist-mail.test.ts`.

- [ ] **Paso 1: prueba que falla**

```ts
import { finishedMail, lockedMail, escapeHtml } from '../checklist-mail';

const base = {
  activity: 'LIMPIEZA', employee: 'EDDIE', date: '2026-11-24', finishedAt: '2026-11-24T16:40:00Z',
  marks: [
    { area: 'Baño', label: 'Limpiar retrete', state: 'done' as const, reason: null, hasPhoto: true },
    { area: 'Cocina / Comedor', label: 'Rellenar jabón', state: 'skipped' as const, reason: 'no había <jabón>', hasPhoto: false },
  ],
  url: 'https://laferre-admin.vercel.app/firmas?run=abc',
};

it('asunto con actividad, persona y fecha corta', () => {
  expect(finishedMail(base).subject).toBe('LIMPIEZA por firmar — Eddie, martes 24 nov');
});
it('resumen y motivo escapado', () => {
  const m = finishedMail(base);
  expect(m.text).toContain('2 de 2 tareas');
  expect(m.text).toContain('1 no se pudo');
  expect(m.text).toContain('1 foto');
  expect(m.html).toContain('no había &lt;jabón&gt;');
  expect(m.html).toContain('href="https://laferre-admin.vercel.app/firmas?run=abc"');
  expect(m.html).not.toMatch(/undefined|NaN/);
});
it('aviso de PIN bloqueado', () => {
  expect(lockedMail('https://x/ajustes', { minutes: 15 }).subject).toBe('Intentaron firmar con un PIN equivocado');
});
it('escapeHtml', () => { expect(escapeHtml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;'); });
```

- [ ] **Paso 2:** correr → falla.

- [ ] **Paso 3: implementación**
  - `finishedMail({...}) → { subject, html, text }`. El nombre va en tipo título (`EDDIE` → `Eddie`).
  - La fecha se arma con `formatToParts` de `Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' })` sobre `date + 'T12:00:00Z'`, juntando `${weekday} ${day} ${month}`, sin "de" ni coma, y sin punto en el mes. El formato normal daría "martes, 24 de nov.".
  - La hora de "Terminó a las …" en `America/Matamoros`.
  - HTML con tablas y estilos en línea (como `bfm-rrhh/src/lib/correoAvisos.js`): encabezado negro, un renglón por "no se pudo" con su motivo, y el botón negro "Abrir en el panel".
  - `lockedMail(url, { minutes } | { disabled: true })` → "Alguien escribió 5 veces un PIN equivocado al firmar una lista. La firma con PIN quedó bloqueada N minutos" / "…quedó APAGADA hasta que crees un PIN nuevo en Ajustes". Siempre: "Puedes seguir firmando desde el panel."

- [ ] **Paso 4:** correr → pasa. **Paso 5:** commit `feat(listas): correo de lista por firmar`.

### Tarea 8: mandar el correo

**Archivos:**
- crear `lib/mailer.ts`, `lib/checklist-notices.ts`, `app/api/listas/aviso/route.ts`;
- modificar `app/api/reminders/route.ts` y `package.json`.

- [ ] **Paso 1:** `npm install nodemailer@^6.10.1 && npm install -D @types/nodemailer`.

- [ ] **Paso 2: `lib/mailer.ts`**

```ts
import 'server-only';
import nodemailer from 'nodemailer';

/** ¿Hay cuenta para mandar? (CORREO_USUARIO y CORREO_CLAVE en Vercel; la clave sin espacios). */
export function mailReady(): boolean {
  return !!process.env.CORREO_USUARIO?.trim() && !!process.env.CORREO_CLAVE?.replace(/\s+/g, '');
}

export async function sendMail(to: string[], m: { subject: string; html: string; text: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!mailReady()) return { ok: false, error: 'Falta la cuenta de correo (CORREO_USUARIO / CORREO_CLAVE).' };
  const list = to.filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  if (list.length === 0) return { ok: false, error: 'No hay correos a quién avisar (Ajustes → Firma).' };
  const t = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.CORREO_USUARIO!.trim(), pass: process.env.CORREO_CLAVE!.replace(/\s+/g, '') },
  });
  try {
    await t.sendMail({ from: `Actividades La Ferre <${process.env.CORREO_USUARIO!.trim()}>`, to: list.join(', '), ...m });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
```

- [ ] **Paso 3: `lib/checklist-notices.ts`**
  - `notifyRun(db, runId): Promise<string>`:
    - primero reclama el aviso con `update checklist_runs set notified_at = now() where id = runId and status = 'awaiting_signature' and notified_at is null`, con `.select('id, activity_id, employee_id, scheduled_date, finished_at')`; si no regresa fila, sale (ya avisado o no aplica);
    - luego carga la actividad, el empleado, las marks y `signer_settings.notify_emails`, arma `finishedMail` con `url = ${PANEL_URL}/firmas?run=<id>` (`PANEL_URL = process.env.PANEL_URL ?? 'https://laferre-admin.vercel.app'`) y manda;
    - si el envío falla, regresa `notified_at` a null para que el cron lo reintente.
  - `runChecklistNotices(db): Promise<string[]>`:
    - listas `awaiting_signature` con `notified_at is null` y `finished_at < now() - 2 min` → `notifyRun`;
    - si `lock_notified = false` y (`pin_locked_until > now()` o `pin_disabled`) → `lockedMail` (minutos = `15 × pin_lock_count`, o apagado), `lock_notified = true`.

- [ ] **Paso 4: `app/api/listas/aviso/route.ts`**
  - `POST` con body `{ run: string }`.
  - Valida uuid con `isUuid` de `lib/access-rules` (400 si no es), llama `notifyRun` con `supabaseAdmin()` y contesta `{ ok: true }` siempre que el uuid sea válido.
  - Es seguro abierto: sólo manda si la lista está terminada y sin aviso, y una sola vez.

- [ ] **Paso 5:** en `/api/reminders`, después de `runInventoryTick`, agregar `try { checklist = await runChecklistNotices(supabase) } catch …` e incluir `checklist` en el JSON de respuesta.

- [ ] **Paso 6:** `npx tsc --noEmit` + `npx jest`.

- [ ] **Paso 7: commit**

```bash
git add lib/mailer.ts lib/checklist-notices.ts app/api/listas/aviso/route.ts app/api/reminders/route.ts package.json package-lock.json
git commit -m "feat(listas): aviso por correo al terminar (una sola vez, con respaldo en el cron)"
```

---

## Fase 4 — Panel: configurar, firmar, bitácora

### Tarea 9: acciones de la lista y del rol

**Archivos:** crear `lib/checklist-types.ts` y `app/actividades/checklist-actions.ts`.

- [ ] **Paso 1: tipos** (`lib/checklist-types.ts`):

```ts
export interface ChecklistItem { id: string; area: string; label: string; days: number[]; needs_photo: boolean; sort: number; }
export interface ChecklistConfig {
  enabled: boolean;
  items: ChecklistItem[];
  rotations: import('./duty').Rotation[];
  overrides: (import('./duty').DutyOverride & { id: string })[];
}
```

- [ ] **Paso 2: acciones**
  - Todas con `adminAccess()` + `ownsRow('activities', activityId, a.own)` y el patrón `fail` / `OK`.
  - Las únicas exportaciones son async más `export type Result = ActionResult`.

| Acción | Qué hace |
|---|---|
| `getChecklistConfig(activityId)` → `{ ok, config }` | Carga lo de arriba; items sin archivar ordenados por `sort` |
| `setChecklistEnabled(activityId, on)` | Si `on` y no hay items o no hay rol → `fail('Antes de prenderla agrega tareas y el rol.')` |
| `saveChecklistItems(activityId, items: {id?, area, label, days, needs_photo}[])` | Valida (área 1–60, nombre 1–120, al menos un día, máx. 60 tareas). Las existentes se actualizan, las nuevas se insertan, las que ya no vienen se archivan. `sort` = posición × 10 |
| `saveRotation(activityId, employeeIds: string[], currentId: string)` | Todos de la empresa y activos, sin repetidos, `currentId` en la lista. Inserta versión nueva con `employee_ids` rotado para que `currentId` quede primero, `anchor_week = mondayOf(hoy Matamoros)`, `valid_from = hoy` |
| `addDutyOverride(activityId, kind: 'week' \| 'day', date, employeeId)` | `week` → lunes..domingo de esa fecha; `day` → esa fecha. Fecha de hoy en adelante |
| `removeDutyOverride(id)` | Revisa que el override sea de una actividad de su empresa |

  "Hoy en Matamoros" sale de `shopClock` / `SHOP_TZ` de `lib/my-day.ts`.

- [ ] **Paso 3:** `npx jest lib/__tests__/use-server-exports.test.ts` + `npx tsc --noEmit`.

- [ ] **Paso 4: commit**

```bash
git add lib/checklist-types.ts app/actividades/checklist-actions.ts
git commit -m "feat(listas): acciones para la lista, el rol y los cambios"
```

### Tarea 10: editor en la página de la actividad

**Archivos:** crear `components/actividades/ChecklistEditor.tsx` y `components/actividades/checklist.module.css`; modificar `app/actividades/[id]/page.tsx`.

- [ ] **Paso 1:** el componente `ChecklistEditor({ activityId, employees })` (cliente) carga `getChecklistConfig` y enseña tres tarjetas con el estilo de `panel.module.css` (`s.card`):
  - **"Lista con firma":**
    - interruptor (`setChecklistEnabled`);
    - texto: "Al prenderla, el teléfono enseña la lista del día y la actividad sólo cuenta cuando la firmas.";
    - error en línea si falla.
  - **"Tareas":**
    - grupos por área: título del área editable, botón "Agregar tarea" por área y "Agregar área";
    - cada renglón: nombre (input), días L M M J V S como chips (mismo estilo que `form.module.css` del formulario), casilla "pide foto" con ícono de cámara (`IconCamera`), subir/bajar y quitar;
    - botón "Guardar tareas" (`saveChecklistItems`) que se prende sólo si hubo cambios;
    - aviso "Quitar una tarea no la borra de las bitácoras pasadas".
  - **"Rol semanal":**
    - lista ordenable de empleados de la empresa (agregar/quitar, subir/bajar) y "Esta semana le toca a" (select);
    - "Guardar rol" (`saveRotation`);
    - debajo, `upcomingDuty(rotations, overrides, hoy, 5)` como renglones "Semana del 23 nov — Laura";
    - botones "Cambiar esta semana" y "Cambiar un día" abren una ventana chica (fecha + persona) → `addDutyOverride`;
    - lista de cambios futuros con "Quitar".
- [ ] **Paso 2:** en `app/actividades/[id]/page.tsx`, debajo de `<ActivityForm …>`, montar `<ChecklistEditor activityId={id} employees={employees} />` y un enlace "Ver bitácora" a `/actividades/[id]/bitacora` (visible si la lista está prendida).
- [ ] **Paso 3:** revisar en local (escritorio y 390 px) con el token firmado. No guardar nada real: sólo abrir y mover controles, y probar las acciones en la versión de prueba de Vercel con ids inventados (deben contestar "No encontrado").
- [ ] **Paso 4: commit**

```bash
git add components/actividades/ChecklistEditor.tsx components/actividades/checklist.module.css "app/actividades/[id]/page.tsx"
git commit -m "feat(listas): editor de la lista y del rol en la actividad"
```

### Tarea 11: Ajustes → Firma

**Archivos:** crear `app/ajustes/signer-actions.ts` y `components/ajustes/Firma.tsx`; modificar `app/ajustes/page.tsx` (montar con `{role === 'admin' && <Firma />}`, junto a `<Telefonos />`).

- [ ] **Paso 1: acciones** (con `requireAdmin` vía `adminAccess`):

| Acción | Qué hace |
|---|---|
| `getSigner()` → `{ ok, name, hasPin, emails, mailReady, lockedUntil, pinDisabled }` | Nunca regresa el hash. Si `pinDisabled`, la tarjeta dice "La firma con PIN se apagó por intentos equivocados: crea un PIN nuevo" |
| `saveSigner(name, emails)` | Nombre 1–60; máx. 5 correos válidos |
| `setSignerPin(pin, confirm)` | Iguales y `^[0-9]{4,6}$` → `rpc('chk_set_pin', { p_pin })` con `supabaseAdmin()` |
| `sendTestMail()` | Correo de prueba a los destinatarios; regresa el error tal cual si falla |

- [ ] **Paso 2: componente**
  - Tarjeta "Firma de listas": nombre, correos (agregar/quitar), "PIN: creado / sin crear" con botón "Crear PIN" / "Cambiar PIN" (dos campos `inputMode="numeric"` tipo password), "Mandar correo de prueba".
  - Si `mailReady` es falso, aviso: "Falta poner la contraseña de aplicación de Gmail en Vercel (CORREO_CLAVE)".
- [ ] **Paso 3:** `npx tsc --noEmit` + prueba de exports.
- [ ] **Paso 4: commit** `feat(listas): Ajustes → firma (nombre, PIN y correos)`.

### Tarea 12: Por firmar

**Archivos:**
- crear `app/firmas/actions.ts`, `app/firmas/page.tsx`, `components/firmas/SignDialog.tsx`, `components/firmas/firmas.module.css`;
- modificar `components/AdminShell.tsx`.

- [ ] **Paso 1: acciones**

| Acción | Qué hace |
|---|---|
| `listToSign()` | Listas `awaiting_signature` de las empresas permitidas (más viejas primero), con actividad, empleado, fecha, hora de "Terminé", si fue tarde, la nota de una regresada antes y sus marks con enlaces firmados de 1 h (`db.storage.from('listas').createSignedUrls(paths, 3600)`, igual que `app/inventario/actions.ts:70`) |
| `getRun(runId)` | La misma forma, para abrir desde el correo (`?run=`) aunque ya esté firmada (enseña "Ya firmada por X a las…") |
| `signRun(runId)` | Revisa empresa → `rpc('chk_sign_panel', { p_run, p_name: session.name ?? null })` |
| `returnRun(runId, itemIds, note)` | Revisa empresa → `rpc('chk_return', …)` → push al empleado con `pushExpo([push_token], 'Te regresaron la lista', note)` (token de `employees.push_token` y `device_tokens` con su `employee_id`) |
| `pendingSignCount()` | Para el menú; 0 si falla |

- [ ] **Paso 2: página `/firmas`**
  - Lista de tarjetas: actividad, persona, fecha, "Terminó 10:40", "tarde" si aplica, "3 fotos · 1 no se pudo".
  - Al abrir → `SignDialog`. Con `?run=` abre esa directo.
- [ ] **Paso 3: `SignDialog`** con el patrón de `components/inventario/SectionDialog.tsx` (ventana, Escape, visor de fotos):
  - tareas por área con ✓ / "No se pudo: motivo" / foto en miniatura;
  - botón **Firmar**;
  - **Regresar** → modo selección (casillas en las tareas + nota obligatoria) → "Regresarla".
- [ ] **Paso 4: menú.** En `AdminShell.tsx`, entrada `{ href: '/firmas', label: 'Por firmar', icon: IconCheck }` (o el ícono existente más parecido), con numerito igual que Inventario (`pendingSignCount`). Sólo si el rol es admin. Comprobar en `middleware.ts` que `/firmas` NO esté en `INTERN_ALLOWED`.
- [ ] **Paso 5:** revisar en local y en la versión de prueba de Vercel con ids inventados (sin firmar nada real).
- [ ] **Paso 6: commit** `feat(listas): Por firmar — firmar o regresar desde el panel`.

### Tarea 13: Bitácora semanal y PDF

**Archivos:**
- crear `lib/bitacora.ts`, `lib/__tests__/bitacora.test.ts`, `lib/bitacora-pdf.ts`, `app/actividades/[id]/bitacora/page.tsx`;
- modificar `app/api/cleanup/route.ts`.

- [ ] **Paso 1: prueba que falla de `buildBitacora(weekStart, items, runs, marks, employees)`**
  - Filas = tareas activas más las archivadas que aparecen en marks de la semana, en orden de área / `sort`. Columnas = lun..sáb.
  - Cada celda: `null` si ese día no tocaba; `'pending'`; `{ state, by, reason, photo }`.
  - Por día: `{ employee, status, signedBy, signedAt }`.
  - Casos: día sin run pero que tocaba → `'pending'` si la fecha ya pasó; tarea archivada que sí se hizo esa semana sigue saliendo.
- [ ] **Paso 2:** correr → falla. **Paso 3:** implementar (puro, sin fechas locales: comparar `YYYY-MM-DD`). **Paso 4:** correr → pasa.
- [ ] **Paso 5: página**
  - Selector de semana (← →).
  - La tabla como la hoja de papel: encabezado negro con LUN..SÁB y áreas en banda.
  - ✓ verde, "✗ motivo" ámbar, vacío gris donde no tocaba.
  - Pie por día: quién la hizo y "Firmó Ing. José Soto · 24 nov 10:52 (PIN)".
  - **Descargar PDF**: `lib/bitacora-pdf.ts` con jsPDF, carta horizontal, la misma tabla, título "Bitácora semanal — LIMPIEZA", semana y firmas. Ver el PDF generado como imagen antes de dar por buena la tarea (memoria "Ver el PDF que genero").
- [ ] **Paso 6: limpieza**
  - En `/api/cleanup`, después de lo de `evidence`: `rpc('chk_old_photos', { p_days: 21 })` → `storage.from('listas').remove(names)` → `update checklist_marks set photo_path = null where photo_path in names`.
  - Si la RPC no existe (sin SQL 010), se ignora.
  - En la bitácora y en la ficha, una tarea con `needs_photo`, `done` y sin `photo_path` enseña "foto borrada (más de 21 días)".
- [ ] **Paso 7:** `npx jest` + `npx tsc --noEmit`.
- [ ] **Paso 8: commit** `feat(listas): bitácora semanal con PDF y limpieza de fotos a 21 días`.

---

## Fase 5 — App de teléfonos

### Tarea 14: reglas puras y API

**Archivos:** crear `lib/checklist.ts`, `lib/__tests__/checklist.test.ts`, `lib/checklistApi.ts`.

- [ ] **Paso 1: prueba que falla**

```ts
import { progress, canFinish, groupByArea, cardLabel, isMineToday, PIN_RE, type Mark, type TodayChecklist } from '../checklist';

const mk = (p: Partial<Mark>): Mark => ({ item_id: 'i', area: 'Baño', label: 'x', needs_photo: false, sort: 0, state: 'pending', reason: null, photo_path: null, ...p });

it('avance y terminar', () => {
  const ms = [mk({ item_id: 'a', state: 'done' }), mk({ item_id: 'b', state: 'skipped', reason: 'no había' }), mk({ item_id: 'c' })];
  expect(progress(ms)).toEqual({ resolved: 2, total: 3 });
  expect(canFinish(ms)).toBe(false);
  expect(canFinish(ms.slice(0, 2))).toBe(true);
  expect(canFinish([])).toBe(false);
});
it('agrupa por área respetando el orden', () => {
  const g = groupByArea([mk({ item_id: 'c', area: 'Cocina', sort: 30 }), mk({ item_id: 'a', area: 'Baño', sort: 10 }), mk({ item_id: 'b', area: 'Baño', sort: 20 })]);
  expect(g.map(x => [x.area, x.marks.map(m => m.item_id)])).toEqual([['Baño', ['a', 'b']], ['Cocina', ['c']]]);
});
it('de quién es hoy: el dueño de la lista, si no el de turno', () => {
  const t: TodayChecklist = { activity_id: 'x', duty_id: 'L', duty_name: 'LAURA', run_id: null, status: null, run_employee: null, return_note: null, done: 0, total: 10 };
  expect(isMineToday(t, 'L')).toBe(true);
  expect(isMineToday({ ...t, run_id: 'r', run_employee: 'E' }, 'L')).toBe(false);
});
it('etiqueta de la tarjeta', () => {
  const t: TodayChecklist = { activity_id: 'x', duty_id: 'L', duty_name: 'LAURA', run_id: 'r', status: 'in_progress', run_employee: 'L', return_note: null, done: 3, total: 10 };
  expect(cardLabel(t)).toBe('3 de 10 tareas');
  expect(cardLabel({ ...t, status: 'awaiting_signature' })).toBe('Falta la firma del Ing.');
  expect(cardLabel({ ...t, status: 'returned' })).toBe('Te la regresaron');
  expect(cardLabel({ ...t, status: 'signed' })).toBe('Firmada');
  expect(cardLabel({ ...t, run_id: null, status: null, done: 0 })).toBe('10 tareas');
});
it('PIN', () => { expect(PIN_RE.test('2468')).toBe(true); expect(PIN_RE.test('24a8')).toBe(false); expect(PIN_RE.test('123')).toBe(false); });
```

- [ ] **Paso 2:** `npx jest --runInBand lib/__tests__/checklist.test.ts` → falla.
- [ ] **Paso 3:** implementar `lib/checklist.ts`: los tipos `Mark`, `RunStatus`, `Run` y `TodayChecklist` con los campos que regresan `chk_open` / `chk_today`, más las funciones de la prueba.
- [ ] **Paso 4: `lib/checklistApi.ts`** (patrón de `lib/inventoryApi.ts`). Los errores de red regresan `{ ok: false, error: 'No hay conexión. Intenta de nuevo.' }`.

| Función | Qué hace |
|---|---|
| `loadChecklistToday(companyId)` | `rpc('chk_today', { p_company })`; si falla, `[]` (sin SQL 010 la app sigue igual) |
| `openChecklist(activityId, employeeId)` | `rpc('chk_open', …)` |
| `markItem(runId, itemId, employeeId, state, reason?, photo?)` | `rpc('chk_mark', …)` |
| `uploadChecklistPhoto(runId, itemId, uri)` | Bucket `'listas'`, ruta `${runId}/${itemId}/${Date.now()}.jpg` |
| `finishChecklist(runId, employeeId)` | `rpc('chk_finish')`; si sale bien, `fetch(PANEL_URL + '/api/listas/aviso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ run: runId }) }).catch(() => {})` (si falla, el cron lo manda) |
| `signWithPin(runId, pin)` | `rpc('chk_sign_pin', …)` |

  `PANEL_URL = 'https://laferre-admin.vercel.app'`.
- [ ] **Paso 5:** pruebas → pasan; `npx tsc --noEmit`.
- [ ] **Paso 6: commit** (repo de la app)

```bash
git add lib/checklist.ts lib/__tests__/checklist.test.ts lib/checklistApi.ts
git commit -m "feat(listas): reglas y llamadas de la lista con firma"
```

### Tarea 15: pantalla de la lista y teclado de PIN

**Archivos:** crear `app/lista/[id].tsx` y `components/PinPad.tsx`.

- [ ] **Paso 1: `PinPad`**
  - Modal con 4–6 puntos, teclado 1–9 / borrar / 0 / OK con botones de 64 px y el tema (`colors`, `glass`, `font` de `constants/theme`).
  - Props `{ visible, busy, error, onSubmit(pin), onClose }`.
  - No enseña los números.
- [ ] **Paso 2: pantalla `app/lista/[id].tsx`** (estilo de `app/inventario/[id].tsx`: `PanelBackdrop`, encabezado con regresar, tarjetas `glass`):
  - al entrar, `getValidSession()` → `openChecklist(id, me.id)`; si `ok=false`, enseña el error con "Regresar";
  - encabezado "LIMPIEZA · martes" y avance "3 de 10";
  - si `status = 'returned'`, banda ámbar con "El Ing. la regresó: <nota>";
  - por área, renglones con casilla:
    - **toque:** si `needs_photo` → `ImagePicker.launchCameraAsync({ quality: 0.6 })` → `uploadChecklistPhoto` → `markItem(…'done', null, path)`; si no, `markItem(…'done')`;
    - **toque sobre una hecha:** `markItem(…'pending')` (deshacer);
    - **toque largo:** ventana "¿Por qué no se pudo?" (TextInput, máx. 300) → `markItem(…'skipped', motivo)`;
  - cada cambio se pinta al momento y se revierte con aviso si la RPC falla;
  - botón **Terminé**: prendido con `canFinish(marks)`; confirma "¿Ya terminaste la lista de hoy?" → `finishChecklist`;
  - con `status = 'awaiting_signature'`:
    - tarjeta "Falta la firma del Ing." y botón **Firmar aquí** → `PinPad` → `signWithPin`;
    - si sale bien, tarjeta verde "Firmada por <nombre>" y volver al inicio en 2 s;
    - los errores (`bad_pin`, `locked`) se enseñan en el PinPad;
  - con `status = 'signed'`: tarjeta verde, sin acciones;
  - respeta "reducir movimiento" (`useReducedMotion`) en animaciones.
- [ ] **Paso 3:** revisar en web (`npx expo export -p web --output-dir dist-prueba --max-workers 1` + `scratchpad/servir-solo-ver.cjs`, que bloquea escrituras a supabase.co) con respuestas de ejemplo; capturas a 390 px. No escribir en la base real.
- [ ] **Paso 4: commit** `feat(listas): pantalla de la lista y firma con PIN en el teléfono`.

### Tarea 16: Inicio del teléfono

**Archivos:** modificar `app/(employee)/index.tsx`.

- [ ] **Paso 1:** en `loadData`, agregar `companyId ? loadChecklistToday(companyId) : []` al `Promise.all`, y armar un `Map` por `activity_id`.
- [ ] **Paso 2:** en el filtro `todayActs`, para `a.checklist_enabled`:
  - `isMine = !!chk.get(a.id) && isMineToday(chk.get(a.id)!, me.id)`;
  - si no está en el mapa (sin SQL o sin turno), no se enseña.
- [ ] **Paso 3:** en `ActivityRow`:
  - las de lista enseñan `cardLabel(...)` debajo del título;
  - `onDo` va a `router.push({ pathname: '/lista/[id]', params: { id: a.id } } as any)` en lugar de la cámara.
  - Estado: `awaiting_signature` sin completion se pinta como "hecha" con la etiqueta "Falta la firma del Ing." y no cuenta como atrasada en el encabezado del teléfono (el empleado ya hizo su parte).
- [ ] **Paso 4:** `npx jest --runInBand` + `npx tsc --noEmit`; revisar en web.
- [ ] **Paso 5: commit**

```bash
git add "app/(employee)/index.tsx"
git commit -m "feat(listas): Inicio enseña la lista sólo al de turno y abre la lista"
```

---

## Fase 6 — Entrega (con el dueño)

### Tarea 17: revisión y publicación

- [ ] **Paso 1:** revisión de código de todo lo hecho (`superpowers:requesting-code-review`) y arreglar lo que salga.
- [ ] **Paso 2:** el dueño corre la 010 y la prueba; comprobación con la llave anon (Tarea 2, paso 3).
- [ ] **Paso 3:** el dueño crea una contraseña de aplicación del Gmail que envía y la pone en Vercel (laferre-admin) como `CORREO_CLAVE` (Sensitive). `CORREO_USUARIO` = `laferre3matamoros@gmail.com` se puede poner con `vercel api … env?upsert=true` (el MCP da 403).
- [ ] **Paso 4:** "súbelo" → push del panel → comprobar por `githubCommitSha` y que el cron siga dando 200.
- [ ] **Paso 5:** el dueño, en el panel:
  - Ajustes → Firma: nombre, PIN, correos, "Mandar correo de prueba";
  - LIMPIEZA: revisa tareas y rol, marca las que piden foto.
- [ ] **Paso 6:** "sí, mándala" → `npm run actualizar -- "Limpieza con lista y firma"`; esperar a que los 3 teléfonos tengan la versión (Ajustes → Teléfonos).
- [ ] **Paso 7:**
  - el dueño prende "Lista con firma" en LIMPIEZA;
  - se cambia la descripción de LIMPIEZA ("Palomea las tareas de hoy y al terminar el Ing. firma");
  - primera limpieza real acompañada.
- [ ] **Paso 8:** actualizar la memoria `laferre-lista-con-firma.md` y `pendientes.md`.
