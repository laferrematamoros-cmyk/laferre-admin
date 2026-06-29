# Reportes: historial de semanas + tendencia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la página de Reportes permita ver/descargar el reporte de cualquier semana (selector de semana) y muestre una gráfica de tendencia del % de cumplimiento desde la primera semana con actividad realizada hasta hoy.

**Architecture:** Se extrae la lógica de cálculo (hoy embebida en `app/reportes/page.tsx`) a funciones puras en `lib/reports.ts`, testeables con ts-jest. El cálculo es al vuelo desde `completions` + `activities` (sin tablas nuevas). Las semanas pasadas solo cuentan actividades que ya existían (filtro por `created_at`). La página usa estas funciones para la semana seleccionada y para cada semana de la tendencia.

**Tech Stack:** Next.js 16, React 19, TypeScript, jsPDF (ya instalado), ts-jest (ya configurado en `jest.config.js`, testMatch `**/lib/__tests__/**/*.test.ts`).

> **Trabajo en `main`** (este repo). Al `git add`, agrega solo los archivos exactos de cada tarea. Nunca `git add -A`/`git add .`.

---

## Estructura de archivos

- **Crear** `lib/reports.ts` — funciones puras: `mondayOf`, `currentMonday`, `weekStartFromInput`, `weekInputValue`, `weekLabel`, `toDateStr`, `computeWeek`, `pctOf`, y los tipos (`ReportData`, etc.). Sin imports de React/Next; importa SOLO tipos de `./supabase` (`import type`).
- **Crear** `lib/__tests__/reports.test.ts` — tests de las funciones puras.
- **Modificar** `lib/supabase.ts` — agregar `created_at: string;` a la interfaz `Activity` (la columna existe; hace falta para `computeWeek`).
- **Modificar** `app/reportes/page.tsx` — usar `lib/reports`, agregar selector de semana, gráfica de tendencia, y PDF por semana seleccionada.

---

## Task 1: Funciones puras de reportes (`lib/reports.ts`) con tests

**Files:**
- Modify: `lib/supabase.ts`
- Create: `lib/reports.ts`
- Create: `lib/__tests__/reports.test.ts`

- [ ] **Step 1: Agregar `created_at` a la interfaz `Activity` en `lib/supabase.ts`**

En la interfaz `Activity`, agregar al final (antes del `}`):
```ts
  created_at: string;
```

- [ ] **Step 2: Escribir el test que falla (`lib/__tests__/reports.test.ts`)**

```ts
import { mondayOf, weekStartFromInput, weekInputValue, computeWeek, pctOf, toDateStr } from '../reports';

describe('mondayOf', () => {
  it('un miércoles devuelve el lunes de esa semana', () => {
    expect(toDateStr(mondayOf(new Date(2026, 5, 24)))).toBe('2026-06-22'); // mié 24 → lun 22
  });
  it('un domingo devuelve el lunes anterior', () => {
    expect(toDateStr(mondayOf(new Date(2026, 5, 28)))).toBe('2026-06-22'); // dom 28 → lun 22
  });
});

describe('week input (ISO) roundtrip', () => {
  it('weekInputValue → weekStartFromInput devuelve el mismo lunes', () => {
    const mon = mondayOf(new Date(2026, 5, 22));
    expect(toDateStr(weekStartFromInput(weekInputValue(mon)))).toBe('2026-06-22');
  });
  it('parsea un valor ISO conocido (2026-W01 → lun 2025-12-29)', () => {
    expect(toDateStr(weekStartFromInput('2026-W01'))).toBe('2025-12-29');
  });
});

describe('computeWeek', () => {
  const employees = [{ id: 'e1', name: 'Ana' }] as any;
  const weekStart = new Date(2026, 5, 22);          // lunes 22 jun 2026
  const now = new Date(2026, 5, 30, 12, 0);         // semana ya pasada

  const acts = [
    { id: 'a1', title: 'Diaria', days_of_week: [0,1,2,3,4,5,6], assigned_employee_ids: ['e1'], created_at: '2026-06-01T00:00:00Z' },
    // creada el jueves 25 → no debe contar lun/mar/mié
    { id: 'a2', title: 'Nueva', days_of_week: [0,1,2,3,4,5,6], assigned_employee_ids: [], created_at: '2026-06-25T10:00:00Z' },
  ] as any;
  const comps = [
    { activity_id: 'a1', employee_id: 'e1', scheduled_date: '2026-06-22', was_late: false },
  ] as any;

  it('cuenta solo actividades ya existentes (created_at) y calcula done/total', () => {
    const r = computeWeek(weekStart, acts, comps, employees, now);
    // a1: 7 días; a2: jue,vie,sáb,dom = 4 días → total 11
    expect(r.total).toBe(11);
    expect(r.done).toBe(1);
    expect(pctOf(r)).toBe(Math.round(1 / 11 * 100));
  });
});
```

- [ ] **Step 3: Correr el test para verificar que falla**

Run: `npm test`
Expected: FAIL — "Cannot find module '../reports'".

- [ ] **Step 4: Implementar `lib/reports.ts`**

```ts
import type { Activity, Completion, Employee } from './supabase';

export interface EmployeeStat { name: string; done: number; missed: number; rate: number; }
export interface MissedItem   { title: string; date: string; assignee: string; }
export interface DayBar       { d: string; done: number; missed: number; }
export interface ReportData {
  done: number; missed: number; late: number; total: number;
  byEmployee: EmployeeStat[]; missed_list: MissedItem[]; daily: DayBar[];
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Lunes (00:00) de la semana que contiene a `d`. */
export function mondayOf(d: Date): Date {
  const x = new Date(d);
  const diff = x.getDay() === 0 ? -6 : 1 - x.getDay();
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Lunes de la semana actual. */
export function currentMonday(): Date { return mondayOf(new Date()); }

/** "YYYY-Www" (valor de <input type="week">) → lunes de esa semana ISO. */
export function weekStartFromInput(value: string): Date {
  const [y, w] = value.split('-W').map(Number);
  const jan4 = new Date(y, 0, 4);
  const jan4Dow = (jan4.getDay() + 6) % 7;            // 0=Lun..6=Dom
  const week1Mon = new Date(jan4);
  week1Mon.setDate(jan4.getDate() - jan4Dow);          // lunes de la semana 1 ISO
  const mon = new Date(week1Mon);
  mon.setDate(week1Mon.getDate() + (w - 1) * 7);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

/** Lunes → "YYYY-Www" (para el value del <input type="week">). */
export function weekInputValue(monday: Date): string {
  const d = new Date(monday);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow + 3);                    // jueves de esta semana
  const year = d.getFullYear();
  const firstThu = new Date(year, 0, 4);
  const ftDow = (firstThu.getDay() + 6) % 7;
  firstThu.setDate(firstThu.getDate() - ftDow + 3);    // jueves de la semana 1
  const week = 1 + Math.round((d.getTime() - firstThu.getTime()) / (7 * 24 * 3600 * 1000));
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Etiqueta "X al Y de mes". */
export function weekLabel(monday: Date): string {
  const sun = new Date(monday); sun.setDate(monday.getDate() + 6);
  return `${monday.getDate()} al ${sun.getDate()} de ${monday.toLocaleString('es-MX', { month: 'long' })}`;
}

/** Reporte de una semana (lunes→domingo). Solo cuenta actividades que ya
 *  existían cada día (created_at <= fin de ese día). `now` = para decidir qué
 *  días "pasados" entran en la lista de no realizadas. */
export function computeWeek(
  weekStart: Date,
  activities: Activity[],
  completions: Completion[],
  employees: Employee[],
  now: Date = new Date(),
): ReportData {
  const empMap = Object.fromEntries(employees.map(e => [e.id, e]));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d;
  });

  let totalScheduled = 0, totalDone = 0, totalLate = 0;
  const byEmpMap: Record<string, { done: number; missed: number }> = {};
  const missedList: MissedItem[] = [];
  const daily: DayBar[] = [];

  for (const dayDate of days) {
    const dateStr = toDateStr(dayDate);
    const dow = dayDate.getDay();
    const dayEnd = new Date(dayDate); dayEnd.setHours(23, 59, 59, 999);

    const dayActs = activities.filter(a =>
      (a.days_of_week as number[]).includes(dow) &&
      new Date(a.created_at) <= dayEnd,
    );
    const dayComps = completions.filter(c => c.scheduled_date === dateStr);
    const doneIds = new Set(dayComps.map(c => c.activity_id));
    let dayDone = 0, dayMissed = 0;

    for (const act of dayActs) {
      totalScheduled++;
      const isDone = doneIds.has(act.id);
      const comp = dayComps.find(c => c.activity_id === act.id);
      const ids = (act.assigned_employee_ids as string[]).length > 0
        ? (act.assigned_employee_ids as string[])
        : ['general'];
      const assigneeNames = (act.assigned_employee_ids as string[])
        .map(id => empMap[id]?.name ?? '?').join(', ') || 'General';

      for (const eid of ids) {
        if (!byEmpMap[eid]) byEmpMap[eid] = { done: 0, missed: 0 };
        if (isDone) byEmpMap[eid].done++; else byEmpMap[eid].missed++;
      }

      if (isDone) {
        totalDone++; dayDone++;
        if (comp?.was_late) totalLate++;
      } else {
        dayMissed++;
        if (dayEnd < now) {
          missedList.push({
            title: act.title,
            date: dayDate.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
            assignee: assigneeNames,
          });
        }
      }
    }
    daily.push({ d: DAY_LABELS[dow], done: dayDone, missed: dayMissed });
  }

  const byEmployee = employees.map(e => {
    const s = byEmpMap[e.id] ?? { done: 0, missed: 0 };
    const tot = s.done + s.missed;
    return { name: e.name, done: s.done, missed: s.missed, rate: tot > 0 ? Math.round(s.done / tot * 100) : 100 };
  }).sort((a, b) => b.rate - a.rate);

  return {
    done: totalDone, missed: totalScheduled - totalDone, late: totalLate, total: totalScheduled,
    byEmployee, missed_list: missedList, daily,
  };
}

export function pctOf(r: ReportData): number {
  return r.total > 0 ? Math.round(r.done / r.total * 100) : 0;
}
```

- [ ] **Step 5: Correr el test para verificar que pasa**

Run: `npm test`
Expected: PASS — todos los tests de `reports.test.ts` verdes (más los preexistentes de auth-session).

- [ ] **Step 6: Commit**

```bash
git add lib/reports.ts lib/__tests__/reports.test.ts lib/supabase.ts
git commit -m "feat(reportes): lib pura de cálculo semanal con tests"
```

---

## Task 2: Selector de semana + usar `computeWeek` en la página

**Files:**
- Modify: `app/reportes/page.tsx`

- [ ] **Step 1: Leer `app/reportes/page.tsx`** completo para ubicar: los helpers locales (`startOfWeek`, `toDateStr`, `weekLabel`, `rateColor`, `DAY_LABELS`), los tipos locales (`ReportData`, etc.), el `downloadPDF`, el estado (`data`, `weekStart`), `load()`, y el topbar.

- [ ] **Step 2: Reemplazar imports y helpers locales por los de `lib/reports`**

Al inicio del archivo, agregar:
```ts
import {
  computeWeek, weekStartFromInput, weekInputValue, weekLabel, currentMonday,
  mondayOf, pctOf, toDateStr, type ReportData,
} from '@/lib/reports';
```
Eliminar de la página los helpers/tipos que ahora viven en `lib/reports.ts`: `startOfWeek`, `toDateStr`, `weekLabel`, `DAY_LABELS`, y los `interface EmployeeStat/MissedItem/DayBar/ReportData`. **Mantener** en la página `rateColor` (es UI). Mantener `downloadPDF` (se ajusta en Task 4).

- [ ] **Step 3: Estado de semana editable**

Reemplazar:
```tsx
const [weekStart] = useState(startOfWeek);
```
por:
```tsx
const [weekStart, setWeekStart] = useState<Date>(currentMonday);
const [allCompletions, setAllCompletions] = useState<Completion[]>([]);
const [activities, setActivities] = useState<Activity[]>([]);
const [employees, setEmployees] = useState<Employee[]>([]);
```
(Importar `Activity, Completion, Employee` de `@/lib/supabase` si no están ya.)

- [ ] **Step 4: Reescribir `load()` para traer datos una vez y calcular la semana seleccionada**

Reemplazar el cuerpo de `load` por:
```tsx
const load = useCallback(async () => {
  if (!company) return;
  setLoading(true);

  // 1) primera fecha con actividad realizada (define el inicio de la tendencia)
  const { data: firstRow } = await supabase
    .from('completions').select('scheduled_date')
    .order('scheduled_date', { ascending: true }).limit(1);
  const firstDate = firstRow?.[0]?.scheduled_date ?? toDateStr(currentMonday());
  const firstMon = mondayOf(new Date(firstDate + 'T12:00:00'));

  const [{ data: acts }, { data: comps }, { data: emps }] = await Promise.all([
    supabase.from('activities').select('*').eq('is_active', true).eq('company_id', company.id),
    supabase.from('completions').select('*').gte('scheduled_date', toDateStr(firstMon)),
    supabase.from('employees').select('*').eq('is_active', true).eq('company_id', company.id),
  ]);

  setActivities((acts ?? []) as Activity[]);
  setAllCompletions((comps ?? []) as Completion[]);
  setEmployees((emps ?? []) as Employee[]);
  setLoading(false);
}, [company]);
```

- [ ] **Step 5: Derivar el reporte de la semana seleccionada (sin estado `data`)**

Eliminar el `const [data, setData] = useState<ReportData | null>(null);` y `setData(...)`. En su lugar, derivar con `useMemo` después de `load`:
```tsx
const data: ReportData | null = (!loading)
  ? computeWeek(weekStart, activities, allCompletions, employees)
  : null;
```
(Si `useMemo` es preferible: `const data = useMemo(() => loading ? null : computeWeek(weekStart, activities, allCompletions, employees), [loading, weekStart, activities, allCompletions, employees]);`. Importar `useMemo`.)

Ajustar `pct`, `maxBar`, `label`:
```tsx
const pct    = data ? pctOf(data) : 0;
const maxBar = data ? Math.max(...data.daily.map(b => b.done + b.missed), 1) : 1;
const label  = weekLabel(weekStart);
```

- [ ] **Step 6: Agregar el `<input type="week">` en el topbar**

En el topbar, junto al botón de PDF, agregar:
```tsx
<input
  type="week"
  value={weekInputValue(weekStart)}
  onChange={e => { if (e.target.value) setWeekStart(weekStartFromInput(e.target.value)); }}
  className="rounded-[9px] border px-3 py-2 text-[12px] md:text-[13px] font-semibold"
  style={{ borderColor: '#E4E4E7', background: '#fff', color: '#0F0F10' }}
/>
```
(Colocarlo antes del botón "Descargar PDF", dentro del mismo contenedor de acciones.)

- [ ] **Step 7: Verificar tipos y manualmente**

Run: `npx tsc --noEmit` → sin errores nuevos en `app/reportes/page.tsx`.
Run: `npm run dev`, logueado, ir a `/reportes`. Cambiar la semana en el selector → el reporte (cumplimiento, por empleado, no realizadas, barras por día) **se recalcula** para esa semana. Volver a la actual.

- [ ] **Step 8: Commit**

```bash
git add app/reportes/page.tsx
git commit -m "feat(reportes): selector de semana con recálculo por semana"
```

---

## Task 3: Gráfica de tendencia (desde la primera semana con actividad)

**Files:**
- Modify: `app/reportes/page.tsx`

- [ ] **Step 1: Calcular la serie de tendencia**

Después de derivar `data`, agregar:
```tsx
const trend = useMemo(() => {
  if (loading || allCompletions.length === 0) return [] as { mon: Date; pct: number }[];
  const dates = allCompletions.map(c => c.scheduled_date).sort();
  const firstMon = mondayOf(new Date(dates[0] + 'T12:00:00'));
  const lastMon  = currentMonday();
  const out: { mon: Date; pct: number }[] = [];
  for (let m = new Date(firstMon); m <= lastMon; m.setDate(m.getDate() + 7)) {
    const mon = new Date(m);
    out.push({ mon, pct: pctOf(computeWeek(mon, activities, allCompletions, employees)) });
  }
  return out;
}, [loading, activities, allCompletions, employees]);
```
(Importar `useMemo` si no está.)

- [ ] **Step 2: Renderizar la sección de tendencia**

Antes del cierre (`</>`), después de la sección "Bar chart" (Actividades por día), agregar:
```tsx
{trend.length > 1 && (
  <div className="mt-4 rounded-xl border p-5" style={{ background: '#fff', borderColor: '#E4E4E7' }}>
    <h3 className="mb-3.5 text-[14px] font-bold">Tendencia de cumplimiento (% por semana)</h3>
    <div className="overflow-x-auto">
      <div className="flex h-[150px] items-end gap-2" style={{ minWidth: trend.length * 36 }}>
        {trend.map(t => {
          const selected = toDateStr(t.mon) === toDateStr(weekStart);
          const h = Math.max(4, (t.pct / 100) * 120);
          return (
            <button
              key={toDateStr(t.mon)}
              onClick={() => setWeekStart(new Date(t.mon))}
              className="flex flex-1 flex-col items-center gap-1.5"
              style={{ minWidth: 28 }}
              title={`Semana del ${weekLabel(t.mon)} · ${t.pct}%`}
            >
              <span className="text-[10px] font-bold" style={{ color: rateColor(t.pct), fontFamily: 'monospace' }}>{t.pct}%</span>
              <div className="flex w-full items-end justify-center" style={{ height: 120 }}>
                <div className="w-full rounded-t-[4px]" style={{ height: h, background: rateColor(t.pct), outline: selected ? '2px solid #0F0F10' : 'none', outlineOffset: 1 }} />
              </div>
              <span className="text-[9px]" style={{ color: '#A8A8AD', fontFamily: 'monospace' }}>{t.mon.getDate()}/{t.mon.getMonth() + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
    <p className="mt-2 text-[11px]" style={{ color: '#A8A8AD' }}>Toca una semana para ver su reporte.</p>
  </div>
)}
```

- [ ] **Step 3: Verificar manualmente**

Run: `npm run dev`, `/reportes`. Debe aparecer la gráfica de tendencia con una barra por semana desde la primera con actividad. Tocar una barra → el reporte de arriba salta a esa semana y la barra queda resaltada.

- [ ] **Step 4: Commit**

```bash
git add app/reportes/page.tsx
git commit -m "feat(reportes): gráfica de tendencia % por semana, clic para ir a la semana"
```

---

## Task 4: PDF de la semana seleccionada

**Files:**
- Modify: `app/reportes/page.tsx`

- [ ] **Step 1: Nombre de archivo y etiqueta por semana**

En `downloadPDF`, cambiar la firma a aceptar el lunes y usarlo en el nombre:
```tsx
async function downloadPDF(data: ReportData, label: string, weekStart: Date) {
```
y al final reemplazar:
```tsx
doc.save(`reporte-laferre-${toDateStr(new Date())}.pdf`);
```
por:
```tsx
doc.save(`reporte-laferre-${toDateStr(weekStart)}.pdf`);
```
En `handleDownload`, pasar `weekStart`:
```tsx
await downloadPDF(data, label, weekStart);
```
(El `label` ya es `weekLabel(weekStart)`, así que el PDF lleva la semana correcta en el encabezado.)

- [ ] **Step 2: Verificar manualmente**

Run: `npm run dev`, `/reportes`. Elegir una semana pasada → "Descargar PDF" → el PDF se llama `reporte-laferre-<lunes>.pdf` y su encabezado dice esa semana.

- [ ] **Step 3: Commit**

```bash
git add app/reportes/page.tsx
git commit -m "feat(reportes): PDF nombrado y etiquetado por la semana seleccionada"
```

---

## Task 5: Build + verificación funcional

- [ ] **Step 1: Build de producción**

Run: `npm run build`
Expected: build exitoso (sin errores de tipos/rutas).

- [ ] **Step 2: `npm test`** → todos los tests verdes (auth-session + reports).

- [ ] **Step 3: Verificación end-to-end (Playwright o navegador, logueado en `/reportes`):**
  1. Cambiar de semana en el selector → el reporte recalcula (cumplimiento/por empleado/no realizadas/por día).
  2. La gráfica de tendencia muestra una barra por semana desde la primera con actividad; los % por barra y colores son coherentes.
  3. Tocar una barra → el reporte salta a esa semana, la barra queda resaltada.
  4. Descargar PDF de una semana pasada → nombre y encabezado con esa semana.
  5. Semana sin datos → 0% / "sin actividades perdidas" sin romper.

---

## Despliegue

- Tras verificar, `git push origin main` (Vercel auto-despliega). No requiere variables nuevas ni cambios de DB.

## Notas de cobertura vs. spec

- Selector de semana → Task 2.
- Recálculo por semana → Task 2 (`computeWeek`).
- Exactitud por `created_at` por día → Task 1 (`computeWeek`) con test.
- Tendencia desde la primera semana con actividad → Task 3.
- Clic en barra salta a la semana → Task 3.
- PDF por semana → Task 4.
- Scroll horizontal si hay muchas semanas → Task 3 (`overflow-x-auto` + `minWidth`).
- Sin tablas nuevas / solo semanal → respetado (todo al vuelo).