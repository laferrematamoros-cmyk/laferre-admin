# Lista con firma desde "Nueva actividad": plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Al crear una actividad se puede escoger "Lista con firma" y, en la misma pantalla, armar tareas y rol; un solo "Crear actividad" la deja creada y prendida.

**Architecture:** El editor de tareas y el del rol salen de `ChecklistEditor` como componentes controlados (`ChecklistTasks`, `RotationPicker`) que usan la pantalla de la lista y `ActivityForm`. Una regla pura (`checkNewList`) valida en el navegador y en el servidor. `insertListActivity(db, …)` hace los cuatro pasos (actividad apagada → tareas → rol → prender) y borra la actividad si falla uno. La acción `createChecklistActivity` pone el permiso y la empresa.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, Supabase JS 2, CSS Modules, Jest + ts-jest (sólo `lib/__tests__`).

**Reglas de la casa:** no `git add -A` (rutas explícitas); en local NO dar "Crear actividad" con datos válidos (escribe en producción); no subir hasta que el dueño diga "súbelo".

---

## Archivos

| Archivo | Cambio |
|---|---|
| `lib/checklist-config.ts` | + `checkNewList` |
| `lib/__tests__/checklist-config.test.ts` | + pruebas de `checkNewList` |
| `lib/checklist-create.ts` | nuevo: `insertListActivity` |
| `lib/__tests__/checklist-create.test.ts` | nuevo |
| `app/actividades/actions.ts` | + `createChecklistActivity` |
| `components/actividades/ChecklistTasks.tsx` | nuevo (sale de `ChecklistEditor`) |
| `components/actividades/RotationPicker.tsx` | nuevo (sale de `ChecklistEditor`) |
| `components/actividades/ChecklistEditor.tsx` | usa los dos componentes |
| `components/actividades/ActivityForm.tsx` | "¿Cómo se marca?", tareas, rol, validación, `onSubmit(v, list?)` |
| `components/actividades/form.module.css` | + `.kinds`, `.kind` |
| `app/actividades/nueva/page.tsx` | con lista llama a `createChecklistActivity` |

---

### Task 1: `checkNewList`

**Files:** Modify `lib/checklist-config.ts`; Test `lib/__tests__/checklist-config.test.ts`

- [ ] **Step 1: Pruebas que fallan** (al final del archivo de pruebas; agregar `checkNewList` al import existente de `../checklist-config`)

```ts
describe('checkNewList', () => {
  const A = '11111111-1111-4111-8111-111111111111';
  const B = '22222222-2222-4222-8222-222222222222';
  const C = '33333333-3333-4333-8333-333333333333';
  const task = { area: 'Bodega 1', label: 'Barrer', days: [1, 2], needs_photo: true };

  it('regresa las tareas limpias y el rol con la de esta semana primero', () => {
    expect(checkNewList([task], [A, B, C], B)).toEqual({
      ok: true,
      items: [{ area: 'Bodega 1', label: 'Barrer', days: [1, 2], needs_photo: true }],
      order: [B, C, A],
    });
  });

  it('pide al menos una tarea', () => {
    expect(checkNewList([], [A], A)).toEqual({ ok: false, error: 'Agrega al menos una tarea.' });
  });

  it('usa los mismos errores de las tareas que la pantalla de la lista', () => {
    expect(checkNewList([{ ...task, label: ' ' }], [A], A)).toEqual({ ok: false, error: 'La tarea 1 no tiene nombre.' });
  });

  it('pide al menos una persona en el rol', () => {
    expect(checkNewList([task], [], null)).toEqual({ ok: false, error: 'Agrega al menos una persona al rol.' });
  });

  it('rechaza un rol con repetidos o ids raros', () => {
    expect(checkNewList([task], [A, A], A)).toEqual({ ok: false, error: 'Rol no válido.' });
    expect(checkNewList([task], ['x'], 'x')).toEqual({ ok: false, error: 'Rol no válido.' });
  });

  it('pide a quién le toca esta semana, y que esté en el rol', () => {
    expect(checkNewList([task], [A, B], null)).toEqual({ ok: false, error: 'Elige a quién le toca esta semana.' });
    expect(checkNewList([task], [A, B], C)).toEqual({ ok: false, error: 'Elige a quién le toca esta semana.' });
  });
});
```

- [ ] **Step 2:** `npx jest lib/__tests__/checklist-config.test.ts` → FALLA (`checkNewList` no existe).

- [ ] **Step 3: Implementación** (al final de `lib/checklist-config.ts`)

```ts
export const MAX_ROTATION = 20;

/** Para crear de un jalón una actividad con lista: al menos una tarea, el rol y quién empieza esta semana.
 *  Regresa el rol ya girado (la de esta semana primero), como lo guarda activity_rotations. */
export function checkNewList(items: unknown, order: unknown, current: unknown):
  { ok: true; items: ItemInput[]; order: string[] } | { ok: false; error: string } {
  const c = cleanItems(items);
  if (!c.ok) return c;
  if (c.items.length === 0) return { ok: false, error: 'Agrega al menos una tarea.' };
  if (!Array.isArray(order) || order.length === 0) return { ok: false, error: 'Agrega al menos una persona al rol.' };
  if (order.length > MAX_ROTATION || !order.every(isUuid) || new Set(order).size !== order.length) {
    return { ok: false, error: 'Rol no válido.' };
  }
  if (typeof current !== 'string' || !order.includes(current)) return { ok: false, error: 'Elige a quién le toca esta semana.' };
  return { ok: true, items: c.items.map(({ id: _id, ...x }) => x), order: rotateTo(order, current) };
}
```

- [ ] **Step 4:** `npx jest lib/__tests__/checklist-config.test.ts` → PASA.
- [ ] **Step 5:** `git add lib/checklist-config.ts lib/__tests__/checklist-config.test.ts && git commit -m "feat(lista): regla para crear una lista nueva con su rol"`

### Task 2: `insertListActivity`

**Files:** Create `lib/checklist-create.ts`, `lib/__tests__/checklist-create.test.ts`

- [ ] **Step 1: Pruebas que fallan**

```ts
import { insertListActivity } from '../checklist-create';

type Op = { m: string; a: unknown[] };
type Step = 'activity' | 'items' | 'rotation' | 'enable' | 'undo';

/** Base de mentiras: contesta según la tabla y lo que se le pidió; `fail` hace fallar un paso. */
function fakeDb(fail: Partial<Record<Step, string>> = {}) {
  const calls: { table: string; ops: Op[] }[] = [];
  const has = (ops: Op[], m: string) => ops.some(o => o.m === m);
  const answer = (table: string, ops: Op[]) => {
    const step: Step | null =
      table === 'checklist_items' ? 'items'
      : table === 'activity_rotations' ? 'rotation'
      : has(ops, 'insert') ? 'activity'
      : has(ops, 'update') ? 'enable'
      : has(ops, 'delete') ? 'undo' : null;
    if (step && fail[step]) return { data: null, error: { message: fail[step] } };
    return { data: step === 'activity' ? { id: 'act1' } : null, error: null };
  };
  const from = (table: string) => {
    const ops: Op[] = [];
    calls.push({ table, ops });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b: any = new Proxy({}, {
      get(_t, m: string) {
        if (m === 'then') return (res: (v: unknown) => void) => res(answer(table, ops));
        return (...a: unknown[]) => { ops.push({ m, a }); return b; };
      },
    });
    return b;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { db: { from } as any, calls };
}

const arg = (c: { ops: Op[] }, m: string) => c.ops.find(o => o.m === m)?.a[0];
const row = { title: 'REVISAR BODEGA 1', company_id: 'co1', assigned_employee_ids: [] };
const items = [
  { area: 'Bodega 1', label: 'Barrer', days: [1, 2, 3, 4, 5, 6], needs_photo: true },
  { area: 'Bodega 1', label: 'Trapear', days: [1, 2, 3, 4, 5, 6], needs_photo: true },
];
const order = ['e2', 'e1'];

describe('insertListActivity', () => {
  it('crea la actividad apagada, sus tareas y el rol, y al final la prende', async () => {
    const { db, calls } = fakeDb();
    // 2026-11-25 es miércoles: el rol se ancla al lunes 23.
    expect(await insertListActivity(db, row, items, order, '2026-11-25')).toEqual({ ok: true, id: 'act1' });
    expect(calls.map(c => `${c.table}.${c.ops[0].m}`)).toEqual([
      'activities.insert', 'checklist_items.insert', 'activity_rotations.insert', 'activities.update',
    ]);
    expect(arg(calls[0], 'insert')).toEqual({ ...row, checklist_enabled: false });
    expect(arg(calls[1], 'insert')).toEqual([
      { activity_id: 'act1', area: 'Bodega 1', label: 'Barrer', days: [1, 2, 3, 4, 5, 6], needs_photo: true, sort: 10 },
      { activity_id: 'act1', area: 'Bodega 1', label: 'Trapear', days: [1, 2, 3, 4, 5, 6], needs_photo: true, sort: 20 },
    ]);
    expect(arg(calls[2], 'insert')).toEqual({ activity_id: 'act1', employee_ids: ['e2', 'e1'], anchor_week: '2026-11-23', valid_from: '2026-11-25' });
    expect(arg(calls[3], 'update')).toEqual({ checklist_enabled: true });
  });

  it.each(['items', 'rotation', 'enable'] as const)('si falla %s, borra la actividad y regresa el error', async step => {
    const { db, calls } = fakeDb({ [step]: 'se cayó' });
    expect(await insertListActivity(db, row, items, order, '2026-11-25')).toEqual({ ok: false, error: 'se cayó' });
    const undo = calls.find(c => c.table === 'activities' && c.ops.some(o => o.m === 'delete'));
    expect(undo?.ops.find(o => o.m === 'eq')?.a).toEqual(['id', 'act1']);
  });

  it('si no se pudo crear la actividad, no hay nada que borrar', async () => {
    const { db, calls } = fakeDb({ activity: 'sin permiso' });
    expect(await insertListActivity(db, row, items, order, '2026-11-25')).toEqual({ ok: false, error: 'sin permiso' });
    expect(calls).toHaveLength(1);
  });

  it('si tampoco se pudo borrar, avisa que quedó una actividad sin lista', async () => {
    const { db } = fakeDb({ items: 'se cayó', undo: 'sin red' });
    const r = await insertListActivity(db, row, items, order, '2026-11-25');
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/se cayó.*archívala/);
  });
});
```

- [ ] **Step 2:** `npx jest lib/__tests__/checklist-create.test.ts` → FALLA (no existe el módulo).

- [ ] **Step 3: Implementación** `lib/checklist-create.ts`

```ts
// Crear de un jalón una actividad con lista con firma (supabase/010): la actividad con la lista
// apagada, sus tareas, el rol y al final prender la lista. Si falla un paso, se borra la actividad
// (las tareas y el rol se van con ella por on delete cascade): nada queda a medias en los teléfonos.
// Recibe la base para poder probarlo sin tocar producción (la usa app/actividades/actions.ts).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ItemInput } from './checklist-config';
import { mondayOf } from './duty';

export type CreateResult = { ok: true; id: string } | { ok: false; error: string };

export async function insertListActivity(
  db: SupabaseClient, row: Record<string, unknown>, items: ItemInput[], order: string[], today: string,
): Promise<CreateResult> {
  const made = await db.from('activities').insert({ ...row, checklist_enabled: false }).select('id').single();
  if (made.error || !made.data) return { ok: false, error: made.error?.message ?? 'No se pudo crear la actividad.' };
  const id = made.data.id as string;

  const undo = async (error: string): Promise<CreateResult> => {
    const del = await db.from('activities').delete().eq('id', id);
    return { ok: false, error: del.error ? `${error} (quedó creada sin lista: archívala en Actividades)` : error };
  };

  const tasks = await db.from('checklist_items').insert(items.map((it, i) => ({
    activity_id: id, area: it.area, label: it.label, days: it.days, needs_photo: it.needs_photo, sort: (i + 1) * 10,
  })));
  if (tasks.error) return undo(tasks.error.message);

  const rot = await db.from('activity_rotations').insert({
    activity_id: id, employee_ids: order, anchor_week: mondayOf(today), valid_from: today,
  });
  if (rot.error) return undo(rot.error.message);

  const on = await db.from('activities').update({ checklist_enabled: true }).eq('id', id);
  if (on.error) return undo(on.error.message);
  return { ok: true, id };
}
```

- [ ] **Step 4:** `npx jest lib/__tests__/checklist-create.test.ts` → PASA.
- [ ] **Step 5:** `git add lib/checklist-create.ts lib/__tests__/checklist-create.test.ts && git commit -m "feat(lista): crear actividad, tareas y rol de un jalón (y deshacer si falla)"`

### Task 3: acción `createChecklistActivity`

**Files:** Modify `app/actividades/actions.ts`

- [ ] **Step 1:** Agregar imports y la acción (después de `createActivity`):

```ts
import { checkNewList } from '@/lib/checklist-config';
import { insertListActivity } from '@/lib/checklist-create';
import { shopClock } from '@/lib/my-day';
```

```ts
/** Nueva actividad con lista con firma, de un jalón: actividad + tareas + rol, ya prendida. */
export async function createChecklistActivity(input: ActivityInput, items: unknown, order: unknown, current: unknown): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const row = pick(input, ON_CREATE);
  if (!allows(a.own, row.company_id) || row.company_id === null) return fail('Empresa no permitida');
  const list = checkNewList(items, order, current);
  if (!list.ok) return fail(list.error);
  const db = admin();
  const { data, error } = await db.from('employees').select('id')
    .in('id', list.order).eq('company_id', row.company_id as string).eq('is_active', true);
  if (error) return fail(error.message);
  if ((data ?? []).length !== list.order.length) return fail('Alguien del rol no es de esta tienda o está dado de baja.');
  const r = await insertListActivity(db, { ...row, assigned_employee_ids: [] }, list.items, list.order, shopClock(new Date()).dateStr);
  return r.ok ? OK : fail(r.error);
}
```

- [ ] **Step 2:** `npx tsc --noEmit` → sin errores; `npx jest lib/__tests__/use-server-exports.test.ts` → PASA.
- [ ] **Step 3:** `git add app/actividades/actions.ts && git commit -m "feat(lista): acción para crear una actividad con lista desde Nueva actividad"`

### Task 4: sacar `ChecklistTasks` y `RotationPicker` de `ChecklistEditor` (sin cambiar nada de lo que se ve)

**Files:** Create `components/actividades/ChecklistTasks.tsx`, `components/actividades/RotationPicker.tsx`; Modify `components/actividades/ChecklistEditor.tsx`

- [ ] **Step 1:** `ChecklistTasks.tsx`: mover `WEEK`, `LETTER`, `DAY_NAME`, `newKey`, `AreaName` y el JSX de áreas/tareas/"Nueva área" de `ChecklistEditor`. Controlado: `{ draft: TaskDraft[]; onChange(d); defaultDays: number[] }`; exporta `TaskDraft` y `newKey`. Las tareas nuevas toman `defaultDays` (si viene vacío, lunes a sábado). Envuelve todo en `<div className={f.fields}>` como hoy.
- [ ] **Step 2:** `RotationPicker.tsx`: mover la lista `c.order` (número, nombre, subir/bajar/quitar, "Le toca esta semana") y el `<select>` "Agregar persona al rol…". Controlado: `{ employees; order; current; onChange(order, current) }`. Quitar a la de esta semana pasa el ✓ a la primera que queda; agregar a la primera persona la marca como de esta semana (igual que hoy).
- [ ] **Step 3:** En `ChecklistEditor`: `Draft` → `TaskDraft`; quitar `newArea`, `patch`, `move`, `addTask`, `addArea`, `shift`, `outside` y los íconos que ya no usa; en Tareas poner `<ChecklistTasks draft={draft} onChange={setDraft} defaultDays={[1, 2, 3, 4, 5, 6]} />`; en Rol poner `<RotationPicker employees={employees} order={order} current={current} onChange={(o, cur) => { setOrder(o); setCurrent(cur); }} />`.
- [ ] **Step 4:** `npx tsc --noEmit` → sin errores.
- [ ] **Step 5:** `git add components/actividades/ChecklistTasks.tsx components/actividades/RotationPicker.tsx components/actividades/ChecklistEditor.tsx && git commit -m "refactor(lista): tareas y rol como componentes para reusarlos"`

### Task 5: `ActivityForm` con "¿Cómo se marca?"

**Files:** Modify `components/actividades/ActivityForm.tsx`, `components/actividades/form.module.css`

- [ ] **Step 1:** Exportar `export interface NewList { items: ItemInput[]; order: string[]; current: string }`; `onSubmit: (v: ActivityValues, list?: NewList) => Promise<void>`.
- [ ] **Step 2:** Estado: `kind` ('normal' | 'lista'), `tasks: TaskDraft[]`, `order: string[]`, `current: string | null`, `listError`. `isList = mode === 'create' && kind === 'lista'`.
- [ ] **Step 3:** Sólo en `mode === 'create'`, primera tarjeta "¿Cómo se marca?" con dos botones `f.kind` (`aria-pressed`): **Normal** ("Se marca una vez, con o sin foto.") y **Lista con firma** ("Varias tareas con foto y tú la firmas.").
- [ ] **Step 4:** Con `isList`: en lugar de "Quién", tarjetas **Tareas** (`ChecklistTasks` con `defaultDays={v.days}`) y **Rol semanal** (`RotationPicker`); esconder el interruptor "Pedir foto de evidencia"; en la vista previa, etiquetas "Esta semana: NOMBRE" (o "Sin rol") y "Lista · N tareas". Cambiar tareas o rol borra `listError`.
- [ ] **Step 5:** En `submit()`, después de `validate(v)`: si `isList`, `checkNewList(tasks sin key/id, order, current)`; si falla, `setListError(error)` y no se manda nada. Si pasa: `onSubmit({ ...v, assigned: [] }, { items, order, current })`. La barra enseña `listError`.
- [ ] **Step 6:** CSS en `form.module.css`:

```css
/* Crear: ¿cómo se marca? */
.kinds { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.kind { display: flex; flex-direction: column; gap: 3px; min-height: 64px; padding: 12px 14px; border: 1px solid var(--btn-line); border-radius: 16px; background: #fff; color: var(--ink); text-align: left; cursor: pointer; }
.kind b { font-size: 14px; font-weight: 700; }
.kind small { font-size: 12.5px; line-height: 1.35; color: var(--muted); }
.kind[aria-pressed="true"] { background: var(--ink); border-color: var(--ink); color: #fff; }
.kind[aria-pressed="true"] small { color: rgba(255, 255, 255, .78); }
.kind:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
```

- [ ] **Step 7:** `npx tsc --noEmit` → sin errores. Commit `components/actividades/ActivityForm.tsx components/actividades/form.module.css`.

### Task 6: `nueva/page.tsx`

**Files:** Modify `app/actividades/nueva/page.tsx`

- [ ] **Step 1:** `save(v, list?)`: armar `row` como hoy; `const r = list ? await createChecklistActivity(row, list.items, list.order, list.current) : await createActivity(row);`. El push y `router.push('/actividades')` quedan después de un `r.ok`.
- [ ] **Step 2:** `npx tsc --noEmit`; commit.

### Task 7: verificación

- [ ] `npx jest` → todas pasan.
- [ ] `npx tsc --noEmit` → limpio.
- [ ] `AUTH_SECRET=solo-local-prueba-reportes npx next build` → compila.
- [ ] `next start -p 3010` + Playwright con cookie de prueba, en Bodega Ferretera y en La Ferre, a 1280 y 390 px:
  - "Normal" se ve igual que antes.
  - "Lista con firma": aparecen Tareas y Rol, se esconden Quién y Pedir foto; agregar área, tareas (toman los días de la actividad), 📷, rol y ✓.
  - Errores que se quedan en el navegador: sin nombre, sin tareas, sin rol. **No dar "Crear actividad" con todo válido.**
  - Sin barra horizontal a 390 px.
  - La pantalla "Lista con firma" de LIMPIEZA se ve y se porta igual (sin guardar).
