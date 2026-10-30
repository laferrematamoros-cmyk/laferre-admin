# Rediseño de Reportes — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Arreglar el cálculo y la carga de datos de `/reportes` y rediseñar la pantalla en el estilo "Claro premium" aprobado, estrenando la base visual (letra Geist + menú lateral flotante) del panel.

**Architecture:** El cálculo queda en funciones puras y probadas (`lib/reports.ts`, `lib/report-insights.ts`, `lib/fetch-all.ts`). La pantalla se arma con componentes chicos en `components/reportes/`, estilizados con un CSS module (`reportes.module.css`) que porta los tokens de la maqueta. La página sólo carga datos (12 semanas, paginado) y compone.

**Tech Stack:** Next.js 16 (App Router, `next/font/google`), React 19, Tailwind v4 (sólo en `AdminShell`), CSS Modules, Supabase JS, jsPDF, Jest + ts-jest.

**Spec:** `docs/superpowers/specs/2026-10-30-reportes-rediseno-design.md` · **Maqueta:** https://claude.ai/artifact/44EbTPimzFGKKkkWMF9ndz

**Reglas del repo:** lee `AGENTS.md` (Next 16 cambia APIs: si dudas, consulta `node_modules/next/dist/docs/`). Todo el texto de la interfaz va en español. No usar `git add -A`: agrega sólo los archivos de cada tarea.

---

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `lib/reports.ts` (reescribir) | Fechas, estado de cada actividad, `buildWeekReport`, `buildTrend`, semáforo. Puro. |
| `lib/report-insights.ts` (nuevo) | Frases de "Lectura rápida" y resúmenes de una línea. Puro. |
| `lib/fetch-all.ts` (nuevo) | Paginar consultas de Supabase sin perder filas. Puro. |
| `lib/report-pdf.ts` (nuevo) | PDF de la semana con los números nuevos. |
| `lib/__tests__/reports.test.ts` (reescribir), `report-insights.test.ts`, `fetch-all.test.ts` (nuevos) | Pruebas. |
| `app/layout.tsx`, `app/globals.css`, `components/AdminShell.tsx` (modificar) | Base del estilo: Geist, tokens de estado, menú flotante. |
| `components/reportes/reportes.module.css` (nuevo) | Todo el estilo de la pantalla. |
| `components/reportes/icons.tsx`, `ui.tsx`, `WeekPicker.tsx` (nuevos) | Íconos, globo de ayuda, contador animado, tarjeta plegable, selector de semana. |
| `components/reportes/SummaryCard.tsx`, `InsightsCard.tsx`, `PeopleCard.tsx`, `MissedCard.tsx` (nuevos) | Tarjetas. |
| `components/reportes/DailyChart.tsx`, `TrendChart.tsx` (nuevos) | Gráficas SVG. |
| `app/reportes/page.tsx` (reescribir) | Carga de datos + composición. |
| `components/ReportCharts.tsx`, `components/EmployeeRanking.tsx` (borrar) | Ya no se usan. |

---

### Task 0: Rama de trabajo

- [ ] **Step 1: Crear la rama y guardar spec + plan**

```bash
cd C:/Users/jose_/laferre-admin
git checkout -b feat/reportes-rediseno
git add docs/superpowers/specs/2026-10-30-reportes-rediseno-design.md docs/superpowers/plans/2026-10-30-reportes-rediseno.md
git commit -m "docs: diseño y plan del rediseño de Reportes"
```

---

### Task 1: `lib/reports.ts` — conteo nuevo

**Files:**
- Rewrite: `lib/reports.ts`
- Rewrite: `lib/__tests__/reports.test.ts`

- [ ] **Step 1: Escribir las pruebas (reemplaza el archivo completo)**

`lib/__tests__/reports.test.ts`:

```ts
import {
  mondayOf, toDateStr, addWeeks, weekLabel, weekShortLabel, reportRange,
  dueAt, activityStatus, buildWeekReport, buildTrend, ratingOf, pctOf,
  type ReportActivity, type ReportCompletion, type ReportEmployee,
} from '../reports';

const MON = new Date(2026, 9, 26);               // lunes 26 oct 2026
const FRI_430PM = new Date(2026, 9, 30, 16, 30); // viernes 30 oct, 4:30 pm

function act(o: Partial<ReportActivity> & { id: string }): ReportActivity {
  return {
    title: o.id, limit_time: '10:00:00', days_of_week: [0, 1, 2, 3, 4, 5, 6], week_of_month: null,
    assigned_employee_ids: [], created_at: '2026-01-01T12:00:00Z', ...o,
  };
}
function comp(activity_id: string, scheduled_date: string, employee_id = 'e1', was_late = false): ReportCompletion {
  return { activity_id, scheduled_date, employee_id, was_late };
}
const EMP: ReportEmployee[] = [
  { id: 'e1', name: 'ANA', initials: 'AN' },
  { id: 'e2', name: 'BETO', initials: 'BE' },
  { id: 'e3', name: 'CARLA', initials: 'CA' },
];

describe('fechas', () => {
  it('mondayOf: miércoles → lunes de esa semana', () => {
    expect(toDateStr(mondayOf(new Date(2026, 5, 24)))).toBe('2026-06-22');
  });
  it('mondayOf: domingo → lunes anterior', () => {
    expect(toDateStr(mondayOf(new Date(2026, 5, 28)))).toBe('2026-06-22');
  });
  it('addWeeks mueve de lunes a lunes', () => {
    expect(toDateStr(addWeeks(MON, -1))).toBe('2026-10-19');
    expect(toDateStr(addWeeks(MON, 1))).toBe('2026-11-02');
  });
  it('weekLabel nombra los dos meses cuando la semana cruza de mes', () => {
    expect(weekLabel(MON)).toBe('26 de octubre al 1 de noviembre');
    expect(weekLabel(new Date(2026, 10, 2))).toBe('2 al 8 de noviembre');
  });
  it('weekShortLabel para el selector', () => {
    expect(weekShortLabel(MON)).toBe('26 oct – 1 nov');
    expect(weekShortLabel(new Date(2026, 10, 2))).toBe('2 – 8 nov');
  });
  it('reportRange: 12 semanas que terminan en la elegida', () => {
    expect(reportRange(MON)).toEqual({ from: '2026-08-10', to: '2026-11-01' });
  });
});

describe('estado de una actividad', () => {
  const FRI = new Date(2026, 9, 30);
  it('dueAt pone la hora límite en la fecha', () => {
    expect(dueAt(FRI, '13:00:00').getTime()).toBe(new Date(2026, 9, 30, 13, 0, 0).getTime());
  });
  it('hecha a tiempo / tarde', () => {
    expect(activityStatus(comp('a', '2026-10-30'), FRI, '13:00:00', FRI_430PM)).toBe('ok');
    expect(activityStatus(comp('a', '2026-10-30', 'e1', true), FRI, '13:00:00', FRI_430PM)).toBe('late');
  });
  it('sin registro: por hacer antes de su hora, sin hacer después', () => {
    expect(activityStatus(undefined, FRI, '13:00:00', new Date(2026, 9, 30, 12, 59))).toBe('todo');
    expect(activityStatus(undefined, FRI, '13:00:00', new Date(2026, 9, 30, 13, 1))).toBe('miss');
  });
  it('un día que no ha llegado es por hacer; uno pasado es sin hacer', () => {
    expect(activityStatus(undefined, new Date(2026, 9, 31), '08:00:00', FRI_430PM)).toBe('todo');
    expect(activityStatus(undefined, new Date(2026, 9, 29), '23:00:00', FRI_430PM)).toBe('miss');
  });
});

describe('buildWeekReport (semana en curso)', () => {
  // a1: diaria de ANA, vence 10:00. a2: general, vence 18:00.
  const acts = [act({ id: 'a1', assigned_employee_ids: ['e1'] }), act({ id: 'a2', limit_time: '18:00:00' })];
  const comps = [
    comp('a1', '2026-10-26', 'e1', true),
    comp('a1', '2026-10-27'), comp('a1', '2026-10-28'), comp('a1', '2026-10-29'),
    comp('a2', '2026-10-26', 'e2'), comp('a2', '2026-10-27', 'e3'),
  ];
  const r = buildWeekReport(MON, acts, comps, EMP, FRI_430PM);

  it('reparte las 14 actividades de la semana en los cuatro estados', () => {
    expect(r.counts).toEqual({ ok: 5, late: 1, miss: 3, todo: 5 });
  });
  it('el porcentaje no cuenta lo que está por hacer', () => {
    expect(r.done).toBe(6);
    expect(r.due).toBe(9);
    expect(r.pct).toBe(67);
  });
  it('hoy queda marcado y separa lo vencido de lo pendiente', () => {
    const fri = r.days[4];
    expect(fri.isToday).toBe(true);
    expect(fri.label).toBe('Vie');
    expect([fri.ok, fri.late, fri.miss, fri.todo]).toEqual([0, 0, 1, 1]);
  });
  it('por persona: hechas por quien la hizo, sin hacer por quien la tenía asignada', () => {
    expect(r.people.map(p => [p.name, p.done, p.late, p.miss])).toEqual([
      ['ANA', 4, 1, 1], ['BETO', 1, 0, 0], ['CARLA', 1, 0, 0],
    ]);
    expect(r.generalMiss).toBe(2);
  });
  it('lista lo que no se hizo en orden de fecha', () => {
    expect(r.missed.map(m => [toDateStr(m.date), m.title, m.assignee, m.limit])).toEqual([
      ['2026-10-28', 'a2', 'General', '18:00'],
      ['2026-10-29', 'a2', 'General', '18:00'],
      ['2026-10-30', 'a1', 'ANA', '10:00'],
    ]);
  });
});

describe('buildWeekReport (casos)', () => {
  const pastNow = new Date(2026, 10, 3, 9, 0); // martes 3 nov: la semana del 26 ya terminó

  it('semana terminada: nada queda por hacer y el % es hechas/programadas', () => {
    const acts = [act({ id: 'a1', assigned_employee_ids: ['e1'] })];
    const r = buildWeekReport(MON, acts, [comp('a1', '2026-10-26'), comp('a1', '2026-10-27')], EMP, pastNow);
    expect(r.counts.todo).toBe(0);
    expect(r.due).toBe(7);
    expect(r.pct).toBe(Math.round(2 / 7 * 100));
  });
  it('con varios asignados y nadie la hizo, cuenta para cada uno pero una sola vez en el total', () => {
    const acts = [act({ id: 'a1', days_of_week: [1], assigned_employee_ids: ['e1', 'e2'] })];
    const r = buildWeekReport(MON, acts, [], EMP, pastNow);
    expect(r.counts.miss).toBe(1);
    expect(r.people.filter(p => p.miss === 1).map(p => p.name)).toEqual(['ANA', 'BETO']);
    expect(r.missed[0].assignee).toBe('ANA, BETO');
  });
  it('si la hace alguien que no la tenía asignada, cuenta como hecha de quien la hizo', () => {
    const acts = [act({ id: 'a1', days_of_week: [1], assigned_employee_ids: ['e1'] })];
    const r = buildWeekReport(MON, acts, [comp('a1', '2026-10-26', 'e2')], EMP, pastNow);
    const byName = Object.fromEntries(r.people.map(p => [p.name, p]));
    expect(byName.BETO.done).toBe(1);
    expect(byName.ANA.done + byName.ANA.miss).toBe(0);
  });
  it('quien no tuvo nada en la semana va al final', () => {
    const acts = [act({ id: 'a1', days_of_week: [1], assigned_employee_ids: ['e3'] })];
    const r = buildWeekReport(MON, acts, [comp('a1', '2026-10-26', 'e3')], EMP, pastNow);
    expect(r.people.map(p => p.name)).toEqual(['CARLA', 'ANA', 'BETO']);
  });
  it('un registro repetido no se cuenta dos veces', () => {
    const acts = [act({ id: 'a1', days_of_week: [1] })];
    const r = buildWeekReport(MON, acts, [comp('a1', '2026-10-26'), comp('a1', '2026-10-26')], EMP, pastNow);
    expect(r.done).toBe(1);
    expect(r.people.find(p => p.id === 'e1')!.done).toBe(1);
  });
  it('respeta created_at: no cuenta días antes de que existiera la actividad', () => {
    const acts = [act({ id: 'a1', created_at: '2026-10-28T15:00:00Z' })]; // creada el miércoles
    const r = buildWeekReport(MON, acts, [], EMP, pastNow);
    expect(r.days.map(d => d.miss)).toEqual([0, 0, 1, 1, 1, 1, 1]);
  });
  it('sin nada vencido no hay porcentaje', () => {
    const r = buildWeekReport(addWeeks(MON, 1), [act({ id: 'a1' })], [], EMP, FRI_430PM);
    expect(r.due).toBe(0);
    expect(r.pct).toBeNull();
  });
});

describe('tendencia y semáforo', () => {
  it('buildTrend devuelve 12 semanas que terminan en la elegida', () => {
    const acts = [act({ id: 'a1', days_of_week: [1] })];
    const t = buildTrend(MON, acts, [comp('a1', '2026-10-19')], EMP, FRI_430PM);
    expect(t).toHaveLength(12);
    expect(toDateStr(t[11].start)).toBe('2026-10-26');
    expect(t[11].label).toBe('26 oct');
    expect(t[10].pct).toBe(100); // 19 oct: la hizo
    expect(t[11].pct).toBe(0);   // 26 oct: el lunes venció sin hacerse
  });
  it('ratingOf usa 90 y 70 como cortes', () => {
    expect([ratingOf(90), ratingOf(89), ratingOf(70), ratingOf(69)]).toEqual(['ok', 'late', 'late', 'miss']);
  });
  it('pctOf redondea y devuelve null sin divisor', () => {
    expect(pctOf(36, 38)).toBe(95);
    expect(pctOf(0, 0)).toBeNull();
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npx jest lib/__tests__/reports.test.ts`
Expected: FAIL (no existen `addWeeks`, `buildWeekReport`, etc.).

- [ ] **Step 3: Reescribir `lib/reports.ts` completo**

```ts
import type { Activity, Completion, Employee } from './supabase';

// ── Nombres de días y meses ─────────────────────────────────────────────────────
const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// ── Semana del mes ──────────────────────────────────────────────────────────────
/** Semana del mes (1..): la semana que contiene el día 1 es la 1ª (base lunes). */
export function weekOfMonth(d: Date): number {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // Lun=0 … Dom=6
  return Math.ceil((d.getDate() + offset) / 7);
}

/** Cantidad de semanas del mes de `d` (para resolver "última semana"). */
export function maxWeekOfMonth(d: Date): number {
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return weekOfMonth(last);
}

/** True si la semana del mes de `d` coincide con `wom` (wom = -1 → última). */
export function matchesWeekOfMonth(wom: number, d: Date): boolean {
  return wom === -1 ? weekOfMonth(d) === maxWeekOfMonth(d) : weekOfMonth(d) === wom;
}

/** ¿La actividad "corre" en la fecha `d`? (día de la semana + semana del mes). */
export function activityRunsOn(a: { days_of_week: number[]; week_of_month?: number | null }, d: Date): boolean {
  if (!(a.days_of_week as number[]).includes(d.getDay())) return false;
  const wom = a.week_of_month ?? null;
  return wom == null ? true : matchesWeekOfMonth(wom, d);
}

// ── Fechas ──────────────────────────────────────────────────────────────────────
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

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** El lunes `n` semanas antes (n < 0) o después (n > 0). */
export function addWeeks(monday: Date, n: number): Date {
  const x = addDays(monday, n * 7);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** "26 de octubre al 1 de noviembre" · "2 al 8 de noviembre". */
export function weekLabel(monday: Date): string {
  const sun = addDays(monday, 6);
  if (monday.getMonth() === sun.getMonth()) {
    return `${monday.getDate()} al ${sun.getDate()} de ${MONTHS_LONG[sun.getMonth()]}`;
  }
  return `${monday.getDate()} de ${MONTHS_LONG[monday.getMonth()]} al ${sun.getDate()} de ${MONTHS_LONG[sun.getMonth()]}`;
}

/** "26 oct – 1 nov" · "2 – 8 nov" (para el selector de semana). */
export function weekShortLabel(monday: Date): string {
  const sun = addDays(monday, 6);
  if (monday.getMonth() === sun.getMonth()) {
    return `${monday.getDate()} – ${sun.getDate()} ${MONTHS_SHORT[sun.getMonth()]}`;
  }
  return `${monday.getDate()} ${MONTHS_SHORT[monday.getMonth()]} – ${sun.getDate()} ${MONTHS_SHORT[sun.getMonth()]}`;
}

/** "19 oct". */
export function dayMonthShort(d: Date): string {
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** Fechas que necesita la pantalla: 12 semanas que terminan en la elegida. */
export function reportRange(monday: Date): { from: string; to: string } {
  return { from: toDateStr(addWeeks(monday, -11)), to: toDateStr(addDays(monday, 6)) };
}

// ── Estados ─────────────────────────────────────────────────────────────────────
export type Status = 'ok' | 'late' | 'miss' | 'todo';
export const STATUSES: Status[] = ['ok', 'late', 'miss', 'todo'];
export const STATUS_LABEL: Record<Status, string> = { ok: 'A tiempo', late: 'Tarde', miss: 'Sin hacer', todo: 'Por hacer' };
export type Counts = Record<Status, number>;

export type ReportActivity = Pick<Activity, 'id' | 'title' | 'limit_time' | 'days_of_week' | 'week_of_month' | 'assigned_employee_ids' | 'created_at'>;
export type ReportCompletion = Pick<Completion, 'activity_id' | 'employee_id' | 'scheduled_date' | 'was_late'>;
export type ReportEmployee = Pick<Employee, 'id' | 'name' | 'initials'>;

export interface DayReport extends Counts { date: Date; label: string; isToday: boolean; }
export interface PersonRow { id: string; name: string; initials: string; done: number; late: number; miss: number; }
export interface MissedItem { title: string; date: Date; limit: string; assignee: string; general: boolean; }
export interface WeekReport {
  weekStart: Date;
  counts: Counts;
  /** a tiempo + tarde */
  done: number;
  /** hechas + sin hacer (lo que ya tocaba) */
  due: number;
  /** hechas ÷ lo que ya tocaba; null si todavía no vence nada */
  pct: number | null;
  days: DayReport[];
  /** ordenadas: más sin hacer, más tarde, más hechas, nombre; sin actividad al final */
  people: PersonRow[];
  /** generales (sin asignados) que vencieron sin hacerse */
  generalMiss: number;
  missed: MissedItem[];
}
export interface TrendPoint { start: Date; label: string; pct: number | null; }

export function emptyCounts(): Counts { return { ok: 0, late: 0, miss: 0, todo: 0 }; }

export function pctOf(done: number, due: number): number | null {
  return due > 0 ? Math.round(done / due * 100) : null;
}

export type Rating = 'ok' | 'late' | 'miss';
export function ratingOf(pct: number): Rating { return pct >= 90 ? 'ok' : pct >= 70 ? 'late' : 'miss'; }
export const RATING_LABEL: Record<Rating, string> = { ok: 'Vamos bien', late: 'Vamos regular', miss: 'Vamos mal' };

/** Momento en que vence: la fecha a la hora límite, en hora local. */
export function dueAt(day: Date, limitTime: string): Date {
  const [h, m, s] = limitTime.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h || 0, m || 0, s || 0);
}

/** Estado de una actividad programada en `day`, visto en el momento `now`. */
export function activityStatus(comp: ReportCompletion | undefined, day: Date, limitTime: string, now: Date): Status {
  if (comp) return comp.was_late ? 'late' : 'ok';
  return now.getTime() > dueAt(day, limitTime).getTime() ? 'miss' : 'todo';
}

// ── Reporte de una semana ───────────────────────────────────────────────────────
/** Reporte de la semana que empieza en `weekStart` (lunes), visto en el momento `now`.
 *  Sólo cuenta actividades que ya existían cada día (created_at ≤ fin del día). */
export function buildWeekReport(
  weekStart: Date,
  activities: ReportActivity[],
  completions: ReportCompletion[],
  employees: ReportEmployee[],
  now: Date = new Date(),
): WeekReport {
  const emp = new Map(employees.map(e => [e.id, e]));
  const compByKey = new Map<string, ReportCompletion>();
  for (const c of completions) {
    const k = `${c.activity_id}|${c.scheduled_date}`;
    if (!compByKey.has(k)) compByKey.set(k, c); // un registro repetido cuenta una vez
  }

  const counts = emptyCounts();
  const per = new Map<string, { done: number; late: number; miss: number }>();
  const bump = (id: string) => {
    let p = per.get(id);
    if (!p) { p = { done: 0, late: 0, miss: 0 }; per.set(id, p); }
    return p;
  };
  const days: DayReport[] = [];
  const missed: MissedItem[] = [];
  let generalMiss = 0;
  const todayStr = toDateStr(now);

  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    day.setHours(0, 0, 0, 0);
    const dateStr = toDateStr(day);
    const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
    const dc = emptyCounts();

    for (const a of activities) {
      if (!activityRunsOn(a, day) || new Date(a.created_at) > dayEnd) continue;
      const comp = compByKey.get(`${a.id}|${dateStr}`);
      const st = activityStatus(comp, day, a.limit_time, now);
      dc[st]++;
      counts[st]++;
      const assigned = (a.assigned_employee_ids ?? []) as string[];

      if (comp) {
        if (emp.has(comp.employee_id)) {
          const p = bump(comp.employee_id);
          p.done++;
          if (comp.was_late) p.late++;
        }
      } else if (st === 'miss') {
        if (assigned.length === 0) generalMiss++;
        for (const id of assigned) if (emp.has(id)) bump(id).miss++;
        missed.push({
          title: a.title,
          date: day,
          limit: a.limit_time.slice(0, 5),
          assignee: assigned.length ? assigned.map(id => emp.get(id)?.name ?? '?').join(', ') : 'General',
          general: assigned.length === 0,
        });
      }
    }
    days.push({ ...dc, date: day, label: DAY_LABELS[day.getDay()], isToday: dateStr === todayStr });
  }

  const people: PersonRow[] = employees
    .map(e => {
      const p = per.get(e.id) ?? { done: 0, late: 0, miss: 0 };
      return { id: e.id, name: e.name, initials: e.initials || e.name.slice(0, 2).toUpperCase(), ...p };
    })
    .sort((a, b) => {
      const idleA = a.done + a.miss === 0, idleB = b.done + b.miss === 0;
      if (idleA !== idleB) return idleA ? 1 : -1;
      return b.miss - a.miss || b.late - a.late || b.done - a.done || a.name.localeCompare(b.name, 'es');
    });

  missed.sort((x, y) => x.date.getTime() - y.date.getTime() || x.limit.localeCompare(y.limit));

  const done = counts.ok + counts.late;
  const due = done + counts.miss;
  return { weekStart, counts, done, due, pct: pctOf(done, due), days, people, generalMiss, missed };
}

/** Porcentaje de las `n` semanas que terminan en `selected` (la última es la elegida). */
export function buildTrend(
  selected: Date,
  activities: ReportActivity[],
  completions: ReportCompletion[],
  employees: ReportEmployee[],
  now: Date = new Date(),
  n = 12,
): TrendPoint[] {
  return Array.from({ length: n }, (_, i) => {
    const start = addWeeks(selected, i - (n - 1));
    return { start, label: dayMonthShort(start), pct: buildWeekReport(start, activities, completions, employees, now).pct };
  });
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `npx jest lib/__tests__/reports.test.ts`
Expected: PASS (todas).

- [ ] **Step 5: Commit**

```bash
git add lib/reports.ts lib/__tests__/reports.test.ts
git commit -m "fix(reportes): no contar como 'no realizado' lo que todavía no vence"
```

Nota: `app/reportes/page.tsx` y `components/EmployeeRanking.tsx` dejan de compilar con este cambio hasta la Task 9 (se reescriben/borran ahí). `npx tsc --noEmit` se corre al final de la Task 9.

---

### Task 2: `lib/report-insights.ts` — Lectura rápida

**Files:**
- Create: `lib/report-insights.ts`
- Create: `lib/__tests__/report-insights.test.ts`

- [ ] **Step 1: Escribir las pruebas**

```ts
import { buildInsights, joinEs, dailyPeek, trendPeek } from '../report-insights';
import type { WeekReport, DayReport, PersonRow, TrendPoint } from '../reports';

const MON = new Date(2026, 9, 26);
function day(i: number, c: Partial<DayReport> = {}): DayReport {
  return { date: new Date(2026, 9, 26 + i), label: '', isToday: false, ok: 0, late: 0, miss: 0, todo: 0, ...c };
}
function report(o: Partial<WeekReport>): WeekReport {
  return {
    weekStart: MON, counts: { ok: 0, late: 0, miss: 0, todo: 0 }, done: 0, due: 0, pct: null,
    days: [0, 1, 2, 3, 4, 5, 6].map(i => day(i)), people: [], generalMiss: 0, missed: [], ...o,
  };
}
const person = (name: string, miss: number): PersonRow => ({ id: name, name, initials: name.slice(0, 2), done: 3, late: 0, miss });

describe('joinEs', () => {
  it('une con comas y "y"', () => {
    expect(joinEs(['a'])).toBe('a');
    expect(joinEs(['a', 'b'])).toBe('a y b');
    expect(joinEs(['a', 'b', 'c'])).toBe('a, b y c');
  });
});

describe('buildInsights', () => {
  const base = report({
    counts: { ok: 23, late: 13, miss: 2, todo: 13 }, done: 36, due: 38, pct: 95,
    days: [day(0, { late: 4 }), day(1, { late: 4 }), day(2, { late: 4 }), day(3, { late: 1 }), day(4), day(5), day(6)],
    people: [person('YAJAIRA', 1), person('EDDIE', 0)], generalMiss: 1,
  });

  it('arma las tres frases en orden: sin hacer, tarde, comparación', () => {
    expect(buildInsights(base, 90, true)).toEqual([
      { tone: 'miss', icon: 'x', title: '2 quedaron sin hacer', detail: 'YAJAIRA (1) · Generales (1)' },
      { tone: 'late', icon: 'clock', title: '1 de cada 3 se hizo tarde', detail: '13 de 36' },
      { tone: 'ok', icon: 'up', title: 'Mejor que la semana pasada', detail: '95% contra 90%' },
    ]);
  });
  it('el practicante no ve cuántas tiene cada quien', () => {
    expect(buildInsights(base, 90, false)[0].detail).toBe('YAJAIRA · Generales');
  });
  it('dice "sobre todo el ..." cuando un día junta 40% o más de lo tarde', () => {
    const r = report({
      counts: { ok: 10, late: 5, miss: 0, todo: 0 }, done: 15, due: 15, pct: 100,
      days: [day(0, { late: 3 }), day(1, { late: 2 }), day(2), day(3), day(4), day(5), day(6)],
    });
    expect(buildInsights(r, null, true)[1]).toEqual({
      tone: 'late', icon: 'clock', title: '1 de cada 3 se hizo tarde', detail: '5 de 15, sobre todo el lunes',
    });
  });
  it('la mitad o más tarde', () => {
    const r = report({ counts: { ok: 2, late: 3, miss: 0, todo: 0 }, done: 5, due: 5, pct: 100 });
    expect(buildInsights(r, null, true)[1].title).toBe('La mitad o más se hizo tarde');
  });
  it('sin pendientes ni tarde: frases en verde', () => {
    const r = report({ counts: { ok: 8, late: 0, miss: 0, todo: 2 }, done: 8, due: 8, pct: 100 });
    expect(buildInsights(r, 100, true)).toEqual([
      { tone: 'ok', icon: 'check', title: 'No quedó nada sin hacer', detail: 'Todo lo que ya tocaba se hizo' },
      { tone: 'ok', icon: 'clock', title: 'Todo lo hecho fue a tiempo', detail: 'Nada se hizo después de su hora' },
      { tone: 'ok', icon: 'equal', title: 'Igual que la semana pasada', detail: '100% contra 100%' },
    ]);
  });
  it('peor que la semana pasada', () => {
    const r = report({ counts: { ok: 8, late: 0, miss: 2, todo: 0 }, done: 8, due: 10, pct: 80, generalMiss: 2 });
    expect(buildInsights(r, 90, true)[2]).toEqual({
      tone: 'late', icon: 'down', title: 'Peor que la semana pasada', detail: '80% contra 90%',
    });
  });
  it('semana sin nada vencido: no dice nada', () => {
    expect(buildInsights(report({ counts: { ok: 0, late: 0, miss: 0, todo: 5 } }), 90, true)).toEqual([]);
  });
});

describe('resúmenes de una línea', () => {
  it('dailyPeek nombra los días con algo sin hacer', () => {
    const r = report({ due: 10, days: [day(0, { miss: 1 }), day(1), day(2), day(3), day(4, { miss: 1, isToday: true }), day(5), day(6)] });
    expect(dailyPeek(r)).toBe('Quedó algo sin hacer el lunes y hoy');
    expect(dailyPeek(report({ due: 10 }))).toBe('Ningún día quedó algo sin hacer');
    expect(dailyPeek(report({ due: 0 }))).toBe('Todavía no vence nada esta semana');
  });
  it('trendPeek promedia sólo semanas con datos', () => {
    const pts: TrendPoint[] = [80, null, 100, 90].map((pct, i) => ({ start: new Date(2026, 9, 5 + i * 7), label: '', pct }));
    expect(trendPeek(pts)).toBe('Promedio de 3 semanas: 90% · 2 llegaron a la meta');
    expect(trendPeek([])).toBe('Todavía no hay semanas con datos');
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npx jest lib/__tests__/report-insights.test.ts`
Expected: FAIL (`Cannot find module '../report-insights'`).

- [ ] **Step 3: Implementar `lib/report-insights.ts`**

```ts
import { DAY_NAMES, type WeekReport, type TrendPoint } from './reports';

export type InsightTone = 'ok' | 'late' | 'miss';
export type InsightIcon = 'check' | 'x' | 'clock' | 'up' | 'down' | 'equal';
export interface Insight { tone: InsightTone; icon: InsightIcon; title: string; detail: string; }

/** "a" · "a y b" · "a, b y c" */
export function joinEs(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

/** Las frases de "Lectura rápida", en orden: sin hacer, tarde, comparación.
 *  `showCounts = false` (practicante) quita las cantidades por persona. */
export function buildInsights(r: WeekReport, prevPct: number | null, showCounts: boolean): Insight[] {
  const out: Insight[] = [];

  // 1. Sin hacer
  const miss = r.counts.miss;
  if (miss > 0) {
    const owners = r.people.filter(p => p.miss > 0).map(p => (showCounts ? `${p.name} (${p.miss})` : p.name));
    if (r.generalMiss > 0) owners.push(showCounts ? `Generales (${r.generalMiss})` : 'Generales');
    out.push({ tone: 'miss', icon: 'x', title: miss === 1 ? '1 quedó sin hacer' : `${miss} quedaron sin hacer`, detail: owners.join(' · ') });
  } else if (r.due > 0) {
    out.push({ tone: 'ok', icon: 'check', title: 'No quedó nada sin hacer', detail: 'Todo lo que ya tocaba se hizo' });
  }

  // 2. Tarde
  const late = r.counts.late;
  const done = r.done;
  if (done > 0) {
    if (late === 0) {
      out.push({ tone: 'ok', icon: 'clock', title: 'Todo lo hecho fue a tiempo', detail: 'Nada se hizo después de su hora' });
    } else {
      const title = late / done >= 0.5 ? 'La mitad o más se hizo tarde' : `1 de cada ${Math.round(done / late)} se hizo tarde`;
      let detail = `${late} de ${done}`;
      let top = r.days[0];
      for (const d of r.days) if (d.late > top.late) top = d;
      if (late >= 3 && top.late / late >= 0.4) detail += `, sobre todo el ${DAY_NAMES[top.date.getDay()]}`;
      out.push({ tone: 'late', icon: 'clock', title, detail });
    }
  }

  // 3. Comparación con la semana anterior
  if (prevPct !== null && r.pct !== null) {
    const diff = r.pct - prevPct;
    const detail = `${r.pct}% contra ${prevPct}%`;
    if (diff > 0) out.push({ tone: 'ok', icon: 'up', title: 'Mejor que la semana pasada', detail });
    else if (diff < 0) out.push({ tone: 'late', icon: 'down', title: 'Peor que la semana pasada', detail });
    else out.push({ tone: 'ok', icon: 'equal', title: 'Igual que la semana pasada', detail });
  }

  return out;
}

/** Resumen de una línea para "Día por día" (se ve aunque la sección esté cerrada). */
export function dailyPeek(r: WeekReport): string {
  if (r.due === 0) return 'Todavía no vence nada esta semana';
  const days = r.days.filter(d => d.miss > 0).map(d => (d.isToday ? 'hoy' : `el ${DAY_NAMES[d.date.getDay()]}`));
  return days.length ? `Quedó algo sin hacer ${joinEs(days)}` : 'Ningún día quedó algo sin hacer';
}

/** Resumen de una línea para "Semanas pasadas". */
export function trendPeek(points: TrendPoint[]): string {
  const vals = points.map(p => p.pct).filter((p): p is number => p !== null);
  if (vals.length === 0) return 'Todavía no hay semanas con datos';
  const avg = Math.round(vals.reduce((n, p) => n + p, 0) / vals.length);
  const meta = vals.filter(p => p >= 90).length;
  return `Promedio de ${vals.length} ${vals.length === 1 ? 'semana' : 'semanas'}: ${avg}% · ${meta} ${meta === 1 ? 'llegó' : 'llegaron'} a la meta`;
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `npx jest lib/__tests__/report-insights.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/report-insights.ts lib/__tests__/report-insights.test.ts
git commit -m "feat(reportes): frases automáticas de Lectura rápida"
```

---

### Task 3: `lib/fetch-all.ts` — paginar sin perder filas

**Files:**
- Create: `lib/fetch-all.ts`
- Create: `lib/__tests__/fetch-all.test.ts`

- [ ] **Step 1: Escribir las pruebas**

```ts
import { fetchAllPages } from '../fetch-all';

describe('fetchAllPages', () => {
  const rows = Array.from({ length: 2037 }, (_, i) => i);

  it('pide páginas hasta que una regresa incompleta', async () => {
    const calls: [number, number][] = [];
    const out = await fetchAllPages<number>(async (from, to) => {
      calls.push([from, to]);
      return { data: rows.slice(from, to + 1), error: null };
    });
    expect(out).toEqual(rows);
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it('si la última página viene justa, pide una más y termina', async () => {
    const exact = rows.slice(0, 1000);
    let n = 0;
    const out = await fetchAllPages<number>(async (from, to) => { n++; return { data: exact.slice(from, to + 1), error: null }; });
    expect(out).toHaveLength(1000);
    expect(n).toBe(2);
  });

  it('si la base responde con error, lo lanza', async () => {
    await expect(fetchAllPages(async () => ({ data: null, error: { message: 'sin permiso' } }))).rejects.toThrow('sin permiso');
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npx jest lib/__tests__/fetch-all.test.ts`
Expected: FAIL (`Cannot find module '../fetch-all'`).

- [ ] **Step 3: Implementar `lib/fetch-all.ts`**

```ts
type Page<T> = { data: T[] | null; error: { message: string } | null };

/** Trae todas las filas de una consulta pidiendo páginas de `pageSize`.
 *  La base nunca entrega más de 1,000 filas por consulta y no avisa cuando corta.
 *  La consulta DEBE llevar `.order()`: sin orden, las páginas se enciman y se pierden filas. */
export async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<Page<T>>,
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < pageSize) return out;
  }
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `npx jest lib/__tests__/fetch-all.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/fetch-all.ts lib/__tests__/fetch-all.test.ts
git commit -m "feat: fetchAllPages para no topar con el límite de 1,000 filas"
```

---

### Task 4: Base del estilo (Geist, tokens, menú flotante)

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Modify: `components/AdminShell.tsx`

- [ ] **Step 1: Geist en `app/layout.tsx`**

Reemplazar:
```tsx
import { Inter } from 'next/font/google';
```
por:
```tsx
import { Geist } from 'next/font/google';
```
Reemplazar:
```tsx
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
```
por:
```tsx
const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });
```
Reemplazar:
```tsx
    <html lang="es" className={`${inter.variable} h-full`}>
```
por:
```tsx
    <html lang="es" className={`${geist.variable} h-full`}>
```

- [ ] **Step 2: `app/globals.css` completo**

```css
@import "tailwindcss";

:root {
  --accent: #E11D2E;

  /* Estados de una actividad. Revisados con el validador de daltonismo (2026-10-30). */
  --st-ok:   #0A7D55;  --st-ok-soft:   #E4F3EB;  --st-ok-ink:   #06603F;
  --st-late: #E8930C;  --st-late-soft: #FDF0DB;  --st-late-ink: #8A5100;
  --st-miss: #E11D2E;  --st-miss-soft: #FDE8EA;  --st-miss-ink: #A50F1C;
  --st-todo: #DEDEE4;
}

@theme inline {
  --color-accent:    #E11D2E;
  --color-accent-dk: #B8121F;
  --color-ink:       #0F0F10;
  --color-ink70:     #3A3A3D;
  --color-ink50:     #6E6E73;
  --color-ink30:     #A8A8AD;
  --color-ink10:     #E4E4E7;
  --color-ink05:     #F2F2F4;
  --color-paper:     #FAFAFA;
  --color-ok:        #0F9D58;
  --color-warn:      #F2A20C;
  --font-sans: var(--font-geist), system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
}

* { box-sizing: border-box; }

body {
  background: #FAFAFA;
  color: #0F0F10;
  font-family: var(--font-geist), system-ui, -apple-system, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Menú lateral: flotante en escritorio; en el celular sigue siendo cajón de pantalla completa. */
.lf-side { background: linear-gradient(180deg, #18181B 0%, #0B0B0C 100%); }
@media (min-width: 768px) {
  .lf-side {
    margin: 12px 0 12px 12px;
    border-radius: 22px;
    box-shadow: 0 24px 48px -26px rgba(0, 0, 0, .6), inset 0 1px 0 rgba(255, 255, 255, .07);
  }
}
.lf-nav { color: rgba(255, 255, 255, .66); transition: background .15s, color .15s; }
.lf-nav:hover { background: rgba(255, 255, 255, .06); color: #fff; }
.lf-nav[aria-current="page"] {
  color: #fff;
  background: linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 78%, #FF8A3D) 100%);
  box-shadow: 0 8px 22px -8px color-mix(in srgb, var(--accent) 80%, transparent), inset 0 1px 0 rgba(255, 255, 255, .2);
}
@media (prefers-reduced-motion: reduce) { .lf-nav { transition: none; } }
```

- [ ] **Step 3: `components/AdminShell.tsx`**

3a. Fondo del contenedor. Reemplazar:
```tsx
    <div className="flex h-screen w-full overflow-hidden" style={{ background: '#FAFAFA' }}>
```
por:
```tsx
    <div className="flex h-screen w-full overflow-hidden" style={{ background: '#F4F4F6' }}>
```

3b. Menú lateral. Reemplazar:
```tsx
        className={`fixed inset-y-0 left-0 z-50 flex flex-col gap-1 shrink-0 overflow-y-auto p-[14px] transition-transform duration-300 md:static md:z-auto md:translate-x-0 ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: 224, background: '#0F0F10' }}
```
por:
```tsx
        className={`lf-side fixed inset-y-0 left-0 z-50 flex flex-col gap-1 shrink-0 overflow-y-auto p-[14px] transition-transform duration-300 md:static md:z-auto md:translate-x-0 ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: 220 }}
```

3c. Opciones del menú. Reemplazar:
```tsx
            <Link
              key={href}
              href={href}
              onClick={() => setNavOpen(false)}
              className="flex items-center gap-[10px] rounded-lg px-[10px] py-[9px] text-[13px] font-medium transition-colors"
              style={{
                background: active ? accent : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,.7)',
                fontWeight: active ? 600 : 500,
                textDecoration: 'none',
              }}
            >
```
por:
```tsx
            <Link
              key={href}
              href={href}
              onClick={() => setNavOpen(false)}
              aria-current={active ? 'page' : undefined}
              className="lf-nav flex items-center gap-[10px] rounded-xl px-3 py-[10px] text-[13px]"
              style={{ fontWeight: active ? 600 : 500, textDecoration: 'none' }}
            >
```

- [ ] **Step 4: Comprobar que compila lo tocado**

Run: `npx tsc --noEmit 2>&1 | grep -E "layout|AdminShell" ; echo fin`
Expected: sólo `fin` (los errores de `app/reportes/page.tsx` y `EmployeeRanking` se arreglan en la Task 9).

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/globals.css components/AdminShell.tsx
git commit -m "feat(estilo): letra Geist, colores de estado y menú lateral flotante"
```

---

### Task 5: Piezas de la pantalla (estilos, íconos, ayudas, selector)

**Files:**
- Create: `components/reportes/reportes.module.css`
- Create: `components/reportes/icons.tsx`
- Create: `components/reportes/ui.tsx`
- Create: `components/reportes/WeekPicker.tsx`

- [ ] **Step 1: `components/reportes/reportes.module.css`**

```css
/* Pantalla de Reportes · estilo "Claro premium" (maqueta aprobada el 2026-10-30). */

.page {
  --ink: #0B0B0C; --ink2: #36363B; --muted: #68686F; --faint: #A0A0A7;
  --line: rgba(12, 12, 16, .07); --hair: rgba(12, 12, 16, .065);
  --ok: var(--st-ok); --late: var(--st-late); --miss: var(--st-miss); --todo: var(--st-todo);
  --ok-soft: var(--st-ok-soft); --late-soft: var(--st-late-soft); --miss-soft: var(--st-miss-soft);
  --ok-ink: var(--st-ok-ink); --late-ink: var(--st-late-ink); --miss-ink: var(--st-miss-ink);
  --track: #EDEDF1; --today: rgba(12, 12, 16, .035); --ring: #FFFFFF;
  --card-bg: rgba(255, 255, 255, .84); --card-border: rgba(12, 12, 16, .06);
  --card-shadow: 0 1px 1px rgba(12, 12, 16, .03), 0 4px 10px -6px rgba(12, 12, 16, .06), 0 30px 60px -30px rgba(12, 12, 16, .22);
  --chip: #F0F0F3; --chip-ink: #36363B; --btn: rgba(255, 255, 255, .88); --btn-line: rgba(12, 12, 16, .09);
  position: relative; flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden;
  background: #F4F4F6; color: var(--ink);
}
.page::before {
  content: ""; position: absolute; inset: 0 0 auto 0; height: 540px; pointer-events: none;
  background:
    radial-gradient(42% 62% at 20% 0%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 70%),
    radial-gradient(36% 56% at 86% 0%, rgba(242, 110, 43, .10), transparent 70%);
}
.page::after {
  content: ""; position: absolute; inset: 0 0 auto 0; height: 380px; pointer-events: none;
  background-image: radial-gradient(rgba(12, 12, 16, .13) 1px, transparent 1.3px);
  background-size: 20px 20px;
  -webkit-mask-image: linear-gradient(180deg, rgba(0, 0, 0, .7), transparent);
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, .7), transparent);
}

/* ── Encabezado ── */
.top { position: relative; z-index: 1; display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px 16px; padding: 26px 30px 6px; }
.eyebrow { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 11px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
.eyebrow i { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent); }
.title { margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -.035em; line-height: 1.1; }
.sub { margin-top: 4px; font-size: 12.5px; color: var(--muted); }
.tools { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.weekNav {
  display: inline-flex; align-items: center; gap: 2px; padding: 3px; border-radius: 999px;
  background: var(--btn); border: 1px solid var(--btn-line);
  box-shadow: 0 1px 2px rgba(12, 12, 16, .04), 0 8px 20px -12px rgba(12, 12, 16, .18);
  -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
}
.wbtn { height: 34px; min-width: 34px; padding: 0 10px; border: 0; border-radius: 999px; background: transparent; color: var(--ink); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
.wbtn:hover:not(:disabled) { background: var(--chip); }
.wbtn:disabled { opacity: .3; cursor: default; }
.wlabel { padding: 0 8px; font-size: 14px; font-weight: 700; white-space: nowrap; font-variant-numeric: tabular-nums; }
.btn { height: 40px; padding: 0 16px; border-radius: 999px; border: 1px solid var(--btn-line); background: var(--btn); color: var(--ink); font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 7px; cursor: pointer; }
.btn:disabled { opacity: .45; cursor: default; }
.btnSoft { background: var(--chip); border-color: transparent; }
.btnPrimary { background: #0B0B0C; border-color: #0B0B0C; color: #fff; box-shadow: 0 8px 18px -10px rgba(12, 12, 16, .7), inset 0 1px 0 rgba(255, 255, 255, .15); }
.wbtn:focus-visible, .btn:focus-visible, .foldHead:focus-visible, .seg:focus-visible, .pbar:focus-visible, .hit:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* ── Contenido y tarjetas ── */
.content { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 16px; padding: 16px 30px 34px; transition: opacity .2s; }
.card {
  min-width: 0; padding: 22px 24px; border-radius: 24px;
  background: var(--card-bg); border: 1px solid var(--card-border); box-shadow: var(--card-shadow);
  -webkit-backdrop-filter: blur(18px) saturate(150%); backdrop-filter: blur(18px) saturate(150%);
}
.cardHead { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 4px 12px; margin-bottom: 14px; }
.h3 { margin: 0; display: flex; align-items: center; gap: 9px; font-size: 15.5px; font-weight: 700; letter-spacing: -.01em; }
.hico { width: 28px; height: 28px; flex: none; display: grid; place-items: center; border-radius: 9px; background: var(--chip); color: var(--ink2); }
.spark { background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 70%, #FF8A3D)); color: #fff; }
.hint { font-size: 12px; color: var(--muted); }
.foot { margin: 12px 0 0; font-size: 11.5px; line-height: 1.5; color: var(--faint); }
.loading { padding: 40px 0; text-align: center; font-size: 13px; color: var(--faint); }
.error { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 10px; padding: 16px; border-radius: 16px; font-size: 13px; background: var(--miss-soft); color: var(--miss-ink); }

/* ── Píldoras y muestras de color ── */
.pill { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 999px; font-size: 11.5px; font-weight: 600; white-space: nowrap; box-shadow: inset 0 0 0 1px rgba(12, 12, 16, .04); }
.okPill { background: var(--ok-soft); color: var(--ok-ink); }
.latePill { background: var(--late-soft); color: var(--late-ink); }
.missPill { background: var(--miss-soft); color: var(--miss-ink); }
.sw { display: inline-block; width: 10px; height: 10px; flex: none; border-radius: 3px; }
.dotSw { border-radius: 50%; }
.ok { background: var(--ok); }
.late { background: var(--late); }
.miss { background: var(--miss); }
.todo { background: var(--todo); }

/* ── Resumen ── */
.bento { display: grid; grid-template-columns: minmax(0, 1.8fr) minmax(0, 1fr); gap: 16px; }
.hero { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 32px; padding: 28px 30px; background: linear-gradient(160deg, rgba(255, 255, 255, .96), rgba(255, 255, 255, .80)); }
.ringWrap { position: relative; width: 156px; height: 156px; }
.ringWrap svg { display: block; }
.ringTrack { fill: none; stroke: var(--track); stroke-width: 13; }
.ringArc { fill: none; stroke-width: 13; stroke-linecap: round; animation: ringIn 1.2s cubic-bezier(.2, .7, .2, 1) both; }
.arcOk { stroke: url(#rp-arc-ok); filter: drop-shadow(0 6px 10px rgba(10, 125, 85, .28)); }
.arcLate { stroke: var(--late); }
.arcMiss { stroke: var(--miss); }
.ringVal { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.ringVal b { font-size: 44px; font-weight: 700; letter-spacing: -.05em; line-height: 1; }
.ringVal > span { margin-top: 4px; font-size: 12px; font-weight: 600; color: var(--muted); }
.heroText { min-width: 0; display: flex; flex-direction: column; gap: 10px; }
.headline { margin: 0; font-size: 23px; font-weight: 500; line-height: 1.3; letter-spacing: -.025em; text-wrap: balance; }
.headline b { font-weight: 700; }
.delta { margin: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); }
.up, .down { display: inline-flex; align-items: center; gap: 3px; font-weight: 700; }
.up { color: var(--ok-ink); }
.down { color: var(--late-ink); }
.weekBar { display: flex; gap: 3px; height: 16px; margin-top: 6px; }
.seg { flex-basis: 0; min-width: 4px; border-radius: 999px; box-shadow: inset 0 1px 0 rgba(255, 255, 255, .28); transition: transform .15s; }
.seg:hover, .seg:focus-visible { transform: scaleY(1.25); }
.legendRow { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 12.5px; color: var(--ink2); }
.legendRow span { display: inline-flex; align-items: center; gap: 6px; }
.legendRow b { font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; }
.muted { color: var(--faint); }

/* ── Lectura rápida ── */
.ins { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.ins li { display: flex; align-items: flex-start; gap: 12px; padding: 10px; border-radius: 16px; transition: background .15s; }
.ins li:hover { background: var(--today); }
.ico { width: 34px; height: 34px; flex: none; display: grid; place-items: center; border-radius: 11px; }
.ins b { display: block; font-size: 14px; font-weight: 600; letter-spacing: -.01em; }
.ins span { font-size: 12.5px; line-height: 1.4; color: var(--muted); }

/* ── Por persona ── */
.people { display: flex; flex-direction: column; }
.prow { display: grid; grid-template-columns: minmax(170px, 220px) minmax(0, 1fr) minmax(0, auto); align-items: center; gap: 10px 18px; margin-inline: -10px; padding: 12px 10px; border-radius: 16px; transition: background .15s; }
.prow:hover { background: var(--today); }
.idle { opacity: .55; }
.who { display: flex; align-items: center; gap: 11px; min-width: 0; }
.av { width: 38px; height: 38px; flex: none; display: grid; place-items: center; border-radius: 50%; font-size: 12px; font-weight: 700; letter-spacing: .02em; color: var(--chip-ink); background: linear-gradient(145deg, #FFFFFF, #ECECF0); box-shadow: inset 0 0 0 1px rgba(12, 12, 16, .07), 0 4px 10px -6px rgba(12, 12, 16, .25); }
.pn { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; min-width: 0; }
.pn b { font-size: 14px; font-weight: 600; }
.pn small { font-size: 11.5px; color: var(--muted); }
.pbar { position: relative; height: 10px; }
.pbar::before { content: ""; position: absolute; inset: 0; border-radius: 999px; background: var(--track); }
.pfill { position: relative; display: flex; gap: 3px; height: 100%; transform-origin: 0 50%; animation: growX .8s cubic-bezier(.2, .7, .2, 1) both; }
.pfill i { flex-basis: 0; min-width: 3px; border-radius: 999px; box-shadow: inset 0 1px 0 rgba(255, 255, 255, .28); }
.nums { display: flex; justify-content: flex-end; gap: 14px; font-size: 12.5px; white-space: nowrap; color: var(--muted); }
.nums b { font-size: 14px; font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; }
.nums em { font-style: normal; color: var(--faint); }
.bad b { color: var(--miss-ink); }

/* ── Lo que no se hizo ── */
.count { display: inline-grid; place-items: center; min-width: 22px; height: 22px; padding: 0 7px; border-radius: 999px; font-size: 12px; font-weight: 700; background: var(--miss-soft); color: var(--miss-ink); }
.missed { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.missed li { display: flex; align-items: flex-start; gap: 12px; padding: 11px 0; border-top: 1px solid var(--hair); }
.missed li:first-child { border-top: 0; padding-top: 0; }
.mdot { width: 9px; height: 9px; margin-top: 6px; flex: none; border-radius: 50%; background: var(--miss); box-shadow: 0 0 0 4px var(--miss-soft); }
.missed b { display: block; font-size: 14px; font-weight: 600; }
.missed span { font-size: 12px; color: var(--muted); }
.allGood { margin: 0; display: flex; align-items: center; gap: 10px; font-size: 13.5px; font-weight: 600; color: var(--ok-ink); }

/* ── Secciones plegables ── */
.divider { display: flex; align-items: center; gap: 10px; margin-top: 6px; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--faint); }
.divider::after { content: ""; flex: 1; height: 1px; background: var(--line); }
.fold { padding: 0; }
.foldHead { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 20px 24px; border: 0; border-radius: 24px; background: transparent; color: inherit; text-align: left; cursor: pointer; }
.peek { display: block; margin: 3px 0 0 37px; font-size: 12.5px; font-weight: 500; color: var(--muted); }
.chev { flex: none; color: var(--muted); transition: transform .2s; }
.foldHead[aria-expanded="false"] .chev { transform: rotate(-90deg); }
.foldBody { padding: 0 24px 22px; }
.legend { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-bottom: 6px; font-size: 12px; color: var(--ink2); }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.chart { position: relative; width: 100%; }
.chart svg { display: block; overflow: visible; }
.scroll { overflow-x: auto; }

/* ── Marcas de las gráficas ── */
.fOk { fill: var(--ok); }
.fLate { fill: var(--late); }
.fMiss { fill: var(--miss); }
.fTodo { fill: var(--todo); }
.grid { stroke: var(--hair); stroke-width: 1; }
.todayBand { fill: var(--today); }
.todayPill { fill: var(--ink); }
.tToday { fill: #fff; font-size: 9px; font-weight: 800; letter-spacing: .12em; }
.tTick { fill: var(--faint); font-size: 10.5px; font-variant-numeric: tabular-nums; }
.tVal { fill: var(--ink); font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; }
.tMuted { fill: var(--faint); font-size: 11.5px; font-weight: 600; }
.tDay { fill: var(--ink2); font-size: 12px; font-weight: 600; }
.tDayToday { fill: var(--ink); font-weight: 700; }
.tDate { fill: var(--faint); font-size: 10.5px; }
.tMeta { fill: var(--ok-ink); font-size: 10.5px; font-weight: 700; }
.metaBand { fill: var(--ok); opacity: .09; }
.trendLine { fill: none; stroke: var(--ink2); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.dash { stroke-dasharray: 2 5; }
.areaTop { stop-color: var(--ink); stop-opacity: .10; }
.areaBot { stop-color: var(--ink); stop-opacity: 0; }
.dot { stroke: var(--ring); stroke-width: 2; }
.xhair { stroke: var(--faint); stroke-width: 1; opacity: .6; }
.hit { fill: transparent; cursor: pointer; }
.anim .bars { transform-box: fill-box; transform-origin: 50% 100%; animation: grow .8s cubic-bezier(.2, .7, .2, 1) both; }

/* ── Globo de ayuda ── */
.tip {
  position: fixed; z-index: 60; max-width: 240px; padding: 9px 11px; border-radius: 14px; pointer-events: none;
  font-size: 12px; color: var(--ink); background: rgba(255, 255, 255, .92); border: 1px solid rgba(12, 12, 16, .08);
  box-shadow: 0 16px 36px -12px rgba(0, 0, 0, .35);
  -webkit-backdrop-filter: blur(16px) saturate(160%); backdrop-filter: blur(16px) saturate(160%);
  opacity: 0; transform: translateY(4px); transition: opacity .12s, transform .12s;
}
.tipOn { opacity: 1; transform: none; }
.tipTitle { margin-bottom: 5px; font-weight: 700; }
.tipRow { display: flex; align-items: center; gap: 7px; line-height: 1.7; }
.tipRow b { margin-left: auto; padding-left: 14px; font-variant-numeric: tabular-nums; }
.tipFoot { margin-top: 5px; color: var(--muted); }

@keyframes grow { from { transform: scaleY(.04); } }
@keyframes growX { from { transform: scaleX(.03); } }
@keyframes ringIn { from { stroke-dashoffset: var(--C); } }

@media (max-width: 1080px) {
  .bento { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 767px) {
  .top { padding: 16px 14px 0; }
  .title { font-size: 26px; }
  .content { padding: 14px 14px 22px; }
  .hero { grid-template-columns: 1fr; justify-items: start; padding: 20px; }
  .card:not(.fold) { padding: 18px; }
  .prow { grid-template-columns: minmax(0, 1fr); }
  .nums { justify-content: flex-start; flex-wrap: wrap; }
  .foldHead { padding: 16px 18px; }
  .foldBody { padding: 0 18px 18px; }
  .headline { font-size: 19px; }
}
@media (prefers-reduced-motion: reduce) {
  .ringArc, .pfill, .anim .bars { animation: none; }
  .tip, .chev, .prow, .ins li, .seg, .content { transition: none; }
}
```

- [ ] **Step 2: `components/reportes/icons.tsx`**

```tsx
type P = { size?: number; className?: string };

function base(size: number, className?: string) {
  return {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    'aria-hidden': true, className,
  };
}

export const IconCheck = ({ size = 12, className }: P) => (
  <svg {...base(size, className)} strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
);
export const IconX = ({ size = 12, className }: P) => (
  <svg {...base(size, className)} strokeWidth={3}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
export const IconClock = ({ size = 17, className }: P) => (
  <svg {...base(size, className)}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);
export const IconUp = ({ size = 17, className }: P) => (
  <svg {...base(size, className)}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
);
export const IconDown = ({ size = 17, className }: P) => (
  <svg {...base(size, className)}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></svg>
);
export const IconEqual = ({ size = 17, className }: P) => (
  <svg {...base(size, className)}><line x1="5" y1="9" x2="19" y2="9" /><line x1="5" y1="15" x2="19" y2="15" /></svg>
);
export const IconCaretUp = ({ size = 12, className }: P) => (
  <svg {...base(size, className)} strokeWidth={3}><polyline points="18 15 12 9 6 15" /></svg>
);
export const IconCaretDown = ({ size = 12, className }: P) => (
  <svg {...base(size, className)} strokeWidth={3}><polyline points="6 9 12 15 18 9" /></svg>
);
export const IconUsers = ({ size = 15, className }: P) => (
  <svg {...base(size, className)}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
export const IconXCircle = ({ size = 15, className }: P) => (
  <svg {...base(size, className)}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
);
export const IconBars = ({ size = 15, className }: P) => (
  <svg {...base(size, className)}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
);
export const IconTrend = ({ size = 15, className }: P) => (
  <svg {...base(size, className)}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /></svg>
);
export const IconChevronDown = ({ size = 18, className }: P) => (
  <svg {...base(size, className)}><polyline points="6 9 12 15 18 9" /></svg>
);
export const IconLeft = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}><polyline points="15 18 9 12 15 6" /></svg>
);
export const IconRight = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}><polyline points="9 18 15 12 9 6" /></svg>
);
export const IconDownload = ({ size = 15, className }: P) => (
  <svg {...base(size, className)}><path d="M12 3v12" /><polyline points="7 10 12 15 17 10" /><path d="M5 21h14" /></svg>
);
export const IconSpark = ({ size = 15, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z" />
    <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" opacity=".7" />
  </svg>
);
```

- [ ] **Step 3: `components/reportes/ui.tsx`**

```tsx
'use client';

import {
  createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState,
  type FocusEvent, type PointerEvent, type ReactNode,
} from 'react';
import { STATUSES, STATUS_LABEL, type Status } from '@/lib/reports';
import { IconChevronDown } from './icons';
import s from './reportes.module.css';

// ── Globo de ayuda ──────────────────────────────────────────────────────────────
type TipState = { content: ReactNode; x: number; y: number } | null;
const TipCtx = createContext<(t: TipState) => void>(() => {});

/** Un solo globo para toda la pantalla. Va DENTRO de `.page` para heredar sus colores. */
export function TipProvider({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<TipState>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!tip || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    let left = tip.x + 14, top = tip.y + 14;
    if (left + r.width > window.innerWidth - 8) left = tip.x - r.width - 14;
    if (top + r.height > window.innerHeight - 8) top = tip.y - r.height - 14;
    setPos({ left: Math.max(8, left), top: Math.max(8, top) });
  }, [tip]);

  return (
    <TipCtx.Provider value={setTip}>
      {children}
      <div ref={ref} role="tooltip" className={`${s.tip} ${tip ? s.tipOn : ''}`} style={pos}>{tip?.content}</div>
    </TipCtx.Provider>
  );
}

/** Devuelve una función que arma las props para que un elemento muestre un globo
 *  al pasar el mouse o al enfocarlo con el teclado. */
export function useTip() {
  const set = useContext(TipCtx);
  return useCallback((content: ReactNode, onShow?: () => void, onHide?: () => void) => ({
    tabIndex: 0,
    onPointerMove: (e: PointerEvent<Element>) => { set({ content, x: e.clientX, y: e.clientY }); onShow?.(); },
    onPointerLeave: () => { set(null); onHide?.(); },
    onFocus: (e: FocusEvent<Element>) => {
      const r = e.currentTarget.getBoundingClientRect();
      set({ content, x: r.left + r.width / 2, y: r.top });
      onShow?.();
    },
    onBlur: () => { set(null); onHide?.(); },
  }), [set]);
}

export function TipBody({ title, counts, line, foot }: {
  title: string; counts?: Partial<Record<Status, number>>; line?: string; foot?: string;
}) {
  return (
    <>
      <div className={s.tipTitle}>{title}</div>
      {line && <div>{line}</div>}
      {counts && STATUSES.filter(k => (counts[k] ?? 0) > 0).map(k => (
        <div key={k} className={s.tipRow}><i className={`${s.sw} ${s[k]}`} />{STATUS_LABEL[k]}<b>{counts[k]}</b></div>
      ))}
      {foot && <div className={s.tipFoot}>{foot}</div>}
    </>
  );
}

// ── Número que cuenta hacia arriba al aparecer ──────────────────────────────────
export function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 1000);
      setShown(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    setShown(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{shown}</>;
}

// ── Ancho real de un contenedor (para dibujar SVG sin deformar) ─────────────────
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

// ── Tarjeta plegable (arranca cerrada; recuerda lo que eligió el usuario) ───────
export function FoldCard({ storageKey, icon, title, peek, children }: {
  storageKey: string; icon: ReactNode; title: string; peek: string; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  useEffect(() => {
    try { setOpen(localStorage.getItem(storageKey) === '1'); } catch { /* sin almacenamiento: cerrada */ }
  }, [storageKey]);
  function toggle() {
    setOpen(o => {
      const next = !o;
      try { localStorage.setItem(storageKey, next ? '1' : '0'); } catch { /* ignorar */ }
      return next;
    });
  }
  return (
    <section className={`${s.card} ${s.fold}`}>
      <button type="button" className={s.foldHead} aria-expanded={open} aria-controls={id} onClick={toggle}>
        <span>
          <span className={s.h3}><span className={s.hico}>{icon}</span>{title}</span>
          <span className={s.peek}>{peek}</span>
        </span>
        <IconChevronDown className={s.chev} />
      </button>
      {open && <div id={id} className={s.foldBody}>{children}</div>}
    </section>
  );
}
```

- [ ] **Step 4: `components/reportes/WeekPicker.tsx`**

```tsx
'use client';

import { addWeeks, currentMonday, weekShortLabel } from '@/lib/reports';
import { IconLeft, IconRight } from './icons';
import s from './reportes.module.css';

export default function WeekPicker({ weekStart, onChange }: { weekStart: Date; onChange: (monday: Date) => void }) {
  const thisMonday = currentMonday();
  const atCurrent = weekStart.getTime() >= thisMonday.getTime();
  return (
    <>
      <div className={s.weekNav}>
        <button type="button" className={s.wbtn} aria-label="Semana anterior" onClick={() => onChange(addWeeks(weekStart, -1))}>
          <IconLeft />
        </button>
        <span className={s.wlabel}>{weekShortLabel(weekStart)}</span>
        <button type="button" className={s.wbtn} aria-label="Semana siguiente" disabled={atCurrent} onClick={() => onChange(addWeeks(weekStart, 1))}>
          <IconRight />
        </button>
      </div>
      <button type="button" className={`${s.btn} ${s.btnSoft}`} disabled={atCurrent} onClick={() => onChange(thisMonday)}>
        Esta semana
      </button>
    </>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add components/reportes/reportes.module.css components/reportes/icons.tsx components/reportes/ui.tsx components/reportes/WeekPicker.tsx
git commit -m "feat(reportes): estilos, íconos, globo de ayuda y selector de semana"
```

---

### Task 6: Tarjetas (resumen, lectura rápida, por persona, lo que no se hizo)

**Files:**
- Create: `components/reportes/SummaryCard.tsx`
- Create: `components/reportes/InsightsCard.tsx`
- Create: `components/reportes/PeopleCard.tsx`
- Create: `components/reportes/MissedCard.tsx`

- [ ] **Step 1: `components/reportes/SummaryCard.tsx`**

```tsx
'use client';

import type { CSSProperties } from 'react';
import { STATUSES, STATUS_LABEL, RATING_LABEL, ratingOf, type Status, type WeekReport } from '@/lib/reports';
import { CountUp, TipBody, useTip } from './ui';
import { IconCaretDown, IconCaretUp, IconCheck, IconClock, IconX } from './icons';
import s from './reportes.module.css';

const SEG: Record<Status, string> = { ok: s.ok, late: s.late, miss: s.miss, todo: s.todo };
const PILL = { ok: s.okPill, late: s.latePill, miss: s.missPill };
const ARC = { ok: s.arcOk, late: s.arcLate, miss: s.arcMiss };

function Ring({ pct }: { pct: number | null }) {
  const r = 64;
  const C = 2 * Math.PI * r;
  const rating = pct === null ? null : ratingOf(pct);
  const arcStyle = { strokeDasharray: C, strokeDashoffset: C * (1 - (pct ?? 0) / 100), '--C': C } as CSSProperties;
  return (
    <div className={s.ringWrap}>
      <svg viewBox="0 0 156 156" width={156} height={156} aria-hidden>
        <defs>
          <linearGradient id="rp-arc-ok" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#19B97C" /><stop offset="1" stopColor="#0A7D55" />
          </linearGradient>
        </defs>
        <circle cx={78} cy={78} r={r} className={s.ringTrack} />
        {rating && pct! > 0 && (
          <circle cx={78} cy={78} r={r} transform="rotate(-90 78 78)" className={`${s.ringArc} ${ARC[rating]}`} style={arcStyle} />
        )}
      </svg>
      <div className={s.ringVal}>
        <b>{pct === null ? '—' : <><CountUp value={pct} />%</>}</b>
        <span>{pct === null ? 'sin datos' : 'hecho'}</span>
      </div>
    </div>
  );
}

export default function SummaryCard({ report, prevPct, isCurrent }: { report: WeekReport; prevPct: number | null; isCurrent: boolean }) {
  const tip = useTip();
  const { pct, done, due, counts } = report;
  const rating = pct === null ? null : ratingOf(pct);
  const total = STATUSES.reduce((n, k) => n + counts[k], 0);
  const legend = STATUSES.filter(k => k !== 'todo' || counts.todo > 0);
  const delta = pct !== null && prevPct !== null ? pct - prevPct : null;

  return (
    <section className={`${s.card} ${s.hero}`} aria-label="Cómo vamos esta semana">
      <Ring pct={pct} />
      <div className={s.heroText}>
        {rating && (
          <div>
            <span className={`${s.pill} ${PILL[rating]}`}>
              {rating === 'ok' ? <IconCheck /> : rating === 'late' ? <IconClock size={12} /> : <IconX />}
              {RATING_LABEL[rating]}
            </span>
          </div>
        )}
        <p className={s.headline}>
          {pct === null
            ? <>Todavía no toca nada esta semana.</>
            : <>Se hizo el <b><CountUp value={pct} />%</b> de lo que {isCurrent ? 'ya ' : ''}tocaba: <b><CountUp value={done} /> de {due}</b>.</>}
        </p>
        {delta !== null && (
          <p className={s.delta}>
            {delta > 0 && <><span className={s.up}><IconCaretUp />{delta} {delta === 1 ? 'punto' : 'puntos'}</span>más que la semana pasada ({prevPct}%)</>}
            {delta < 0 && <><span className={s.down}><IconCaretDown />{-delta} {delta === -1 ? 'punto' : 'puntos'}</span>menos que la semana pasada ({prevPct}%)</>}
            {delta === 0 && <>Igual que la semana pasada ({prevPct}%)</>}
          </p>
        )}
        {total > 0 && (
          <>
            <div className={s.weekBar} aria-label={`Las ${total} actividades de la semana`}>
              {STATUSES.filter(k => counts[k] > 0).map(k => (
                <i key={k} className={`${s.seg} ${SEG[k]}`} style={{ flexGrow: counts[k] }}
                  {...tip(<TipBody title={STATUS_LABEL[k]} line={`${counts[k]} de ${total} actividades de la semana`} />)} />
              ))}
            </div>
            <div className={s.legendRow}>
              {legend.map(k => (
                <span key={k}><i className={`${s.sw} ${SEG[k]}`} /><b>{counts[k]}</b>{STATUS_LABEL[k].toLowerCase()}</span>
              ))}
              <span className={s.muted}>de {total} en la semana</span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: `components/reportes/InsightsCard.tsx`**

```tsx
import type { Insight } from '@/lib/report-insights';
import { IconCheck, IconClock, IconDown, IconEqual, IconSpark, IconUp, IconX } from './icons';
import s from './reportes.module.css';

const ICON = { check: IconCheck, x: IconX, clock: IconClock, up: IconUp, down: IconDown, equal: IconEqual };
const TONE = { ok: s.okPill, late: s.latePill, miss: s.missPill };

export default function InsightsCard({ insights }: { insights: Insight[] }) {
  return (
    <section className={s.card} aria-label="Lectura rápida">
      <div className={s.cardHead}>
        <h2 className={s.h3}><span className={`${s.hico} ${s.spark}`}><IconSpark /></span>Lectura rápida</h2>
      </div>
      {insights.length === 0 ? (
        <p className={s.foot}>Todavía no hay nada que contar esta semana.</p>
      ) : (
        <ul className={s.ins}>
          {insights.map((it, i) => {
            const Icon = ICON[it.icon];
            return (
              <li key={i}>
                <span className={`${s.ico} ${TONE[it.tone]}`}><Icon size={it.icon === 'x' || it.icon === 'check' ? 15 : 17} /></span>
                <div><b>{it.title}</b><span>{it.detail}</span></div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 3: `components/reportes/PeopleCard.tsx`**

```tsx
'use client';

import type { PersonRow } from '@/lib/reports';
import { TipBody, useTip } from './ui';
import { IconCheck, IconUsers, IconX } from './icons';
import s from './reportes.module.css';

export default function PeopleCard({ people, generalMiss, showCounts }: {
  people: PersonRow[]; generalMiss: number; showCounts: boolean;
}) {
  const tip = useTip();
  const active = people.filter(p => p.done + p.miss > 0);
  const idle = people.filter(p => p.done + p.miss === 0);
  const max = Math.max(1, generalMiss, ...active.map(p => p.done + p.miss));

  return (
    <section className={s.card}>
      <div className={s.cardHead}>
        <h2 className={s.h3}><span className={s.hico}><IconUsers /></span>Por persona</h2>
        <span className={s.hint}>Arriba, quien necesita atención</span>
      </div>

      {people.length === 0 && generalMiss === 0 ? (
        <p className={s.foot}>No hay empleados activos en esta empresa.</p>
      ) : (
        <div className={s.people}>
          {active.map((p, idx) => {
            const total = p.done + p.miss;
            const onTime = p.done - p.late;
            const pill = p.miss > 0
              ? <span className={`${s.pill} ${s.missPill}`}><IconX size={11} />{showCounts ? `${p.miss} sin hacer` : 'Con pendientes'}</span>
              : <span className={`${s.pill} ${s.okPill}`}><IconCheck />Al día</span>;
            const barTip = showCounts
              ? tip(<TipBody title={p.name} counts={{ ok: onTime, late: p.late, miss: p.miss }} foot={`${p.done} hechas de ${total} que le tocaban`} />)
              : {};
            return (
              <div key={p.id} className={s.prow}>
                <div className={s.who}>
                  <span className={s.av}>{p.initials}</span>
                  <div className={s.pn}><b>{p.name}</b>{pill}</div>
                </div>
                <div className={s.pbar} {...barTip}>
                  <div className={s.pfill} style={{ width: `${(total / max) * 100}%`, animationDelay: `${idx * 90}ms` }}>
                    {onTime > 0 && <i className={s.ok} style={{ flexGrow: onTime }} />}
                    {p.late > 0 && <i className={s.late} style={{ flexGrow: p.late }} />}
                    {p.miss > 0 && <i className={s.miss} style={{ flexGrow: p.miss }} />}
                  </div>
                </div>
                {showCounts && (
                  <div className={s.nums}>
                    <span><b>{p.done}</b> hechas</span>
                    <span><b>{p.late}</b> tarde{p.done > 0 && <em> ({Math.round((p.late / p.done) * 100)}%)</em>}</span>
                    <span className={p.miss ? s.bad : undefined}><b>{p.miss}</b> sin hacer</span>
                  </div>
                )}
              </div>
            );
          })}

          {generalMiss > 0 && (
            <div className={s.prow}>
              <div className={s.who}>
                <span className={s.av}><IconUsers size={17} /></span>
                <div className={s.pn}><b>Generales</b><small>Sin dueño: las toma quien sea</small></div>
              </div>
              <div className={s.pbar} {...(showCounts ? tip(<TipBody title="Generales" line={`${generalMiss} sin hacer: ya pasó su hora y nadie la tomó`} />) : {})}>
                <div className={s.pfill} style={{ width: `${(generalMiss / max) * 100}%` }}>
                  <i className={s.miss} style={{ flexGrow: 1 }} />
                </div>
              </div>
              {showCounts && <div className={s.nums}><span className={s.bad}><b>{generalMiss}</b> sin hacer</span></div>}
            </div>
          )}

          {idle.map(p => (
            <div key={p.id} className={`${s.prow} ${s.idle}`}>
              <div className={s.who}>
                <span className={s.av}>{p.initials}</span>
                <div className={s.pn}><b>{p.name}</b><small>Sin actividades esta semana</small></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCounts && (
        <p className={s.foot}>
          &quot;Hechas&quot; incluye las generales que tomó cada quien. &quot;Sin hacer&quot; sólo cuenta las que tiene a su nombre. La barra más larga es quien más actividades tuvo.
        </p>
      )}
    </section>
  );
}
```

- [ ] **Step 4: `components/reportes/MissedCard.tsx`**

```tsx
import { toDateStr, type MissedItem } from '@/lib/reports';
import { IconCheck, IconXCircle } from './icons';
import s from './reportes.module.css';

const DAY = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function when(d: Date, today: string): string {
  return toDateStr(d) === today ? 'Hoy' : `${DAY[d.getDay()]} ${d.getDate()}`;
}

export default function MissedCard({ missed, hasDue, today }: { missed: MissedItem[]; hasDue: boolean; today: string }) {
  if (!hasDue) return null;
  return (
    <section className={s.card}>
      <div className={s.cardHead}>
        <h2 className={s.h3}>
          <span className={s.hico}><IconXCircle /></span>Lo que no se hizo
          {missed.length > 0 && <span className={s.count}>{missed.length}</span>}
        </h2>
        {missed.length > 0 && <span className={s.hint}>Ya pasó su hora y nadie la marcó</span>}
      </div>
      {missed.length === 0 ? (
        <p className={s.allGood}><IconCheck size={14} />No quedó nada sin hacer.</p>
      ) : (
        <ul className={s.missed}>
          {missed.map((m, i) => (
            <li key={i}>
              <span className={s.mdot} />
              <div>
                <b>{m.title}</b>
                <span>{when(m.date, today)} · límite {m.limit} · {m.general ? 'General (nadie la tomó)' : m.assignee}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add components/reportes/SummaryCard.tsx components/reportes/InsightsCard.tsx components/reportes/PeopleCard.tsx components/reportes/MissedCard.tsx
git commit -m "feat(reportes): tarjetas de resumen, lectura rápida, por persona y pendientes"
```

---

### Task 7: Gráficas

**Files:**
- Create: `components/reportes/DailyChart.tsx`
- Create: `components/reportes/TrendChart.tsx`

- [ ] **Step 1: `components/reportes/DailyChart.tsx`**

```tsx
'use client';

import { DAY_NAMES, STATUSES, STATUS_LABEL, type DayReport, type Status } from '@/lib/reports';
import { TipBody, useTip, useWidth } from './ui';
import s from './reportes.module.css';

const FILL: Record<Status, string> = { ok: s.fOk, late: s.fLate, miss: s.fMiss, todo: s.fTodo };
const SW: Record<Status, string> = { ok: s.ok, late: s.late, miss: s.miss, todo: s.todo };

function niceMax(v: number): number {
  for (const n of [4, 5, 8, 10, 12, 15, 20, 25, 30, 40, 50]) if (v <= n) return n;
  return Math.ceil(v / 50) * 50;
}

/** Rectángulo con sólo las esquinas de arriba redondeadas (el extremo del dato). */
function topRounded(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export default function DailyChart({ days }: { days: DayReport[] }) {
  const { ref, w } = useWidth<HTMLDivElement>();
  const tip = useTip();
  const H = 256, pt = 46, pb = 44, pl = 30, pr = 6;
  const tot = (d: DayReport) => d.ok + d.late + d.miss + d.todo;
  const maxV = niceMax(Math.max(1, ...days.map(tot)));
  const plotW = Math.max(1, w - pl - pr), plotH = H - pt - pb;
  const band = plotW / 7, bw = Math.min(26, band * 0.46);
  const y = (v: number) => pt + plotH - (v / maxV) * plotH;

  return (
    <div>
      <div className={s.legend}>
        {STATUSES.map(k => <span key={k}><i className={`${s.sw} ${SW[k]}`} />{STATUS_LABEL[k]}</span>)}
      </div>
      <div ref={ref} className={s.chart}>
        {w > 0 && (
          <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} className={s.anim} role="img" aria-label="Actividades de cada día de la semana">
            {days.map((d, i) => d.isToday && (
              <g key={`hoy${i}`}>
                <rect x={pl + band * i + 3} y={2} width={band - 6} height={H - 4} rx={16} className={s.todayBand} />
                <rect x={pl + band * i + band / 2 - 17} y={8} width={34} height={16} rx={8} className={s.todayPill} />
                <text x={pl + band * i + band / 2} y={19.5} textAnchor="middle" className={s.tToday}>HOY</text>
              </g>
            ))}
            {[0, maxV / 2, maxV].map(g => (
              <g key={`g${g}`}>
                <line x1={pl} x2={w - pr} y1={y(g)} y2={y(g)} className={s.grid} />
                <text x={pl - 8} y={y(g) + 3.5} textAnchor="end" className={s.tTick}>{g}</text>
              </g>
            ))}
            {days.map((d, i) => {
              const cx = pl + band * i + band / 2;
              const x = cx - bw / 2;
              const total = tot(d);
              const done = d.ok + d.late;
              const segs = STATUSES.filter(k => d[k] > 0);
              const future = !d.isToday && total > 0 && d.todo === total;
              let acc = 0;
              return (
                <g key={i}>
                  <g className={s.bars} style={{ animationDelay: `${i * 70}ms` }}>
                    {segs.map((k, si) => {
                      const h = (d[k] / maxV) * plotH;
                      const yTop = pt + plotH - acc - h;
                      acc += h;
                      const hh = Math.max(0, h - (si > 0 ? 2 : 0)); // 2 px de separación entre segmentos
                      return si === segs.length - 1
                        ? <path key={k} d={topRounded(x, yTop, bw, hh, 5)} className={FILL[k]} />
                        : <rect key={k} x={x} y={yTop} width={bw} height={hh} className={FILL[k]} />;
                    })}
                  </g>
                  <text x={cx} y={(total > 0 ? y(total) : y(0)) - 8} textAnchor="middle" className={total > 0 && !future ? s.tVal : s.tMuted}>
                    {total > 0 ? `${done}/${total}` : '—'}
                  </text>
                  <text x={cx} y={H - 24} textAnchor="middle" className={`${s.tDay} ${d.isToday ? s.tDayToday : ''}`}>{d.label}</text>
                  <text x={cx} y={H - 10} textAnchor="middle" className={s.tDate}>{d.date.getDate()}</text>
                  <rect x={pl + band * i} y={pt - 14} width={band} height={plotH + 14} className={s.hit}
                    {...tip(
                      <TipBody
                        title={`${cap(DAY_NAMES[d.date.getDay()])} ${d.date.getDate()}${d.isToday ? ' · hoy' : ''}`}
                        counts={d}
                        foot={total ? `${done} hechas de ${total} programadas` : 'Sin actividades programadas'}
                      />,
                    )} />
                </g>
              );
            })}
          </svg>
        )}
      </div>
      <p className={s.foot}>Arriba de cada día: hechas / programadas. Pasa el mouse o toca un día para ver el detalle.</p>
    </div>
  );
}
```

- [ ] **Step 2: `components/reportes/TrendChart.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { ratingOf, type Rating, type TrendPoint } from '@/lib/reports';
import { TipBody, useTip, useWidth } from './ui';
import s from './reportes.module.css';

const FILL: Record<Rating, string> = { ok: s.fOk, late: s.fLate, miss: s.fMiss };
const WORD: Record<Rating, string> = { ok: 'Bien', late: 'Regular', miss: 'Bajo' };

type Valid = TrendPoint & { i: number; pct: number };

export default function TrendChart({ points, current, onSelect }: {
  points: TrendPoint[]; current: boolean; onSelect: (start: Date) => void;
}) {
  const { ref, w: vw } = useWidth<HTMLDivElement>();
  const tip = useTip();
  const [hover, setHover] = useState<number | null>(null);

  const n = points.length;
  const lastI = n - 1;
  const H = 236, pt = 24, pb = 34, pl = 40, pr = 62;
  const w = Math.max(vw, n * 46 + pl + pr);
  const plotW = w - pl - pr, plotH = H - pt - pb;
  const step = n > 1 ? plotW / (n - 1) : plotW;
  const x = (i: number) => pl + step * i;
  const y = (p: number) => pt + plotH - (p / 100) * plotH;

  const valid: Valid[] = points
    .map((p, i) => ({ ...p, i }))
    .filter((p): p is Valid => p.pct !== null);
  const lastPct = points[lastI]?.pct ?? null;
  const dashed = current && lastPct !== null && valid.length >= 2;
  const solid = dashed ? valid.slice(0, -1) : valid;
  const pathOf = (pts: Valid[]) =>
    pts.map((p, k) => `${k === 0 || p.i !== pts[k - 1].i + 1 ? 'M' : 'L'}${x(p.i).toFixed(1)} ${y(p.pct).toFixed(1)}`).join(' ');
  const area = valid.length >= 2
    ? `${pathOf(valid)} L${x(valid[valid.length - 1].i).toFixed(1)} ${y(0)} L${x(valid[0].i).toFixed(1)} ${y(0)} Z`
    : '';
  const minP = valid.reduce<Valid | null>((m, p) => (m === null || p.pct < m.pct ? p : m), null);
  const every = step < 52 ? 2 : 1;

  return (
    <div>
      <div className={s.legend}>
        <span><i className={`${s.sw} ${s.dotSw} ${s.ok}`} />90% o más</span>
        <span><i className={`${s.sw} ${s.dotSw} ${s.late}`} />70 a 89%</span>
        <span><i className={`${s.sw} ${s.dotSw} ${s.miss}`} />Menos de 70%</span>
      </div>
      <div ref={ref} className={`${s.chart} ${s.scroll}`}>
        {valid.length === 0 && <p className={s.foot}>Todavía no hay semanas con datos.</p>}
        {vw > 0 && valid.length > 0 && (
          <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="img" aria-label="Porcentaje hecho en las últimas 12 semanas">
            <defs>
              <linearGradient id="rp-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" className={s.areaTop} /><stop offset="1" className={s.areaBot} />
              </linearGradient>
            </defs>
            <rect x={pl} y={y(100)} width={plotW} height={y(90) - y(100)} className={s.metaBand} />
            {[0, 50, 90, 100].map(g => (
              <g key={g}>
                <line x1={pl} x2={pl + plotW} y1={y(g)} y2={y(g)} className={s.grid} />
                <text x={pl - 8} y={y(g) + 3.5} textAnchor="end" className={s.tTick}>{g}%</text>
              </g>
            ))}
            <text x={pl + 8} y={y(95) + 3.5} className={s.tMeta}>Meta</text>
            {area && <path d={area} fill="url(#rp-area)" />}
            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pt} y2={pt + plotH} className={s.xhair} />}
            {solid.length > 0 && <path d={pathOf(solid)} className={s.trendLine} />}
            {dashed && (
              <path
                d={`M${x(valid[valid.length - 2].i).toFixed(1)} ${y(valid[valid.length - 2].pct).toFixed(1)} L${x(lastI).toFixed(1)} ${y(lastPct!).toFixed(1)}`}
                className={`${s.trendLine} ${s.dash}`}
              />
            )}
            {valid.map(p => (
              <circle key={p.i} cx={x(p.i)} cy={y(p.pct)} r={p.i === lastI ? 6 : 4.5} className={`${s.dot} ${FILL[ratingOf(p.pct)]}`} />
            ))}
            {lastPct !== null && (
              <>
                <text x={x(lastI) + 12} y={y(lastPct) + 1} className={s.tVal} style={{ fontSize: 14 }}>{lastPct}%</text>
                {current && <text x={x(lastI) + 12} y={y(lastPct) + 15} className={s.tMuted} style={{ fontSize: 10.5 }}>en curso</text>}
              </>
            )}
            {minP && minP.i !== lastI && (
              <text x={x(minP.i)} y={minP.pct < 15 ? y(minP.pct) - 12 : y(minP.pct) + 20} textAnchor="middle" className={s.tVal}>{minP.pct}%</text>
            )}
            {points.map((p, i) => (i === lastI || (lastI - i) % every === 0) && (
              <text key={`l${i}`} x={x(i)} y={H - 10} textAnchor="middle" className={s.tDate}
                style={i === lastI ? { fontWeight: 700, fill: 'var(--ink2)' } : undefined}>
                {i === lastI && current ? 'esta' : p.label}
              </text>
            ))}
            {points.map((p, i) => (
              <rect key={`h${i}`} x={x(i) - step / 2} y={pt} width={step} height={plotH} className={s.hit}
                onClick={() => onSelect(p.start)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(p.start); } }}
                {...tip(
                  <TipBody
                    title={`Semana del ${p.label}${i === lastI && current ? ' (en curso)' : ''}`}
                    line={p.pct === null ? 'Sin actividades vencidas' : `${p.pct}% hecho · ${WORD[ratingOf(p.pct)]}`}
                    foot="Toca para abrir esa semana"
                  />,
                  () => setHover(i),
                  () => setHover(null),
                )} />
            ))}
          </svg>
        )}
      </div>
      <p className={s.foot}>
        La franja verde es la meta (90% o más).{current ? ' La semana en curso va punteada porque todavía no termina.' : ''} Toca un punto para abrir esa semana.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/reportes/DailyChart.tsx components/reportes/TrendChart.tsx
git commit -m "feat(reportes): gráficas día por día y semanas pasadas"
```

---

### Task 8: PDF

**Files:**
- Create: `lib/report-pdf.ts`

- [ ] **Step 1: `lib/report-pdf.ts`**

```ts
import { STATUSES, STATUS_LABEL, RATING_LABEL, ratingOf, toDateStr, weekLabel, type Status, type WeekReport } from './reports';
import type { Insight } from './report-insights';

type RGB = [number, number, number];
const COLOR: Record<Status, RGB> = { ok: [10, 125, 85], late: [232, 147, 12], miss: [225, 29, 46], todo: [222, 222, 228] };
const INK: RGB = [15, 15, 16];
const MUTED: RGB = [110, 110, 115];
const DAY = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function slug(t: string): string {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** PDF de la semana con los mismos números que la pantalla.
 *  `showCounts = false` (practicante) quita las cifras por persona. */
export async function downloadReportPdf(o: { report: WeekReport; insights: Insight[]; companyName: string; showCounts: boolean }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 14;
  const r = o.report;
  let y = 0;
  const ensure = (h: number) => { if (y + h > 282) { doc.addPage(); y = 16; } };
  const ink = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const section = (title: string) => {
    ensure(14);
    y += 4;
    ink(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text(title, M, y);
    y += 5;
  };

  // Encabezado
  fill(INK); doc.rect(0, 0, W, 30, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text(`${o.companyName.toUpperCase()} · REPORTE SEMANAL`, M, 13);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(180, 180, 180);
  doc.text(`Semana del ${weekLabel(r.weekStart)}`, M, 20);
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, M, 26);

  // Resumen
  y = 37;
  const rating = r.pct === null ? null : ratingOf(r.pct);
  fill(rating ? COLOR[rating] : MUTED);
  doc.roundedRect(M, y, W - 2 * M, 24, 3, 3, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(24);
  doc.text(r.pct === null ? 'Sin datos' : `${r.pct}%`, M + 6, y + 15);
  doc.setFontSize(11);
  doc.text(rating ? RATING_LABEL[rating] : 'Todavía no toca nada', M + 48, y + 9);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(r.pct === null ? 'No hay actividades vencidas en la semana.' : `Se hizo ${r.done} de ${r.due} que ya tocaban.`, M + 48, y + 15);
  doc.text(STATUSES.map(k => `${r.counts[k]} ${STATUS_LABEL[k].toLowerCase()}`).join(' · '), M + 48, y + 20);
  y += 30;

  // Barra con todas las actividades de la semana
  const total = STATUSES.reduce((n, k) => n + r.counts[k], 0);
  if (total > 0) {
    let x = M;
    const bw = W - 2 * M;
    for (const k of STATUSES) {
      const w = (bw * r.counts[k]) / total;
      if (w > 0) { fill(COLOR[k]); doc.rect(x, y, w, 4, 'F'); x += w; }
    }
    y += 10;
  }

  // Lectura rápida
  if (o.insights.length) {
    section('Lectura rápida');
    for (const it of o.insights) {
      ensure(11);
      fill(COLOR[it.tone]); doc.circle(M + 1.5, y + 1.5, 1.5, 'F');
      ink(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text(it.title, M + 6, y + 2.5);
      ink(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text(it.detail, M + 6, y + 7);
      y += 11;
    }
  }

  // Por persona
  const active = r.people.filter(p => p.done + p.miss > 0);
  if (active.length || r.generalMiss) {
    section('Por persona');
    const max = Math.max(1, r.generalMiss, ...active.map(p => p.done + p.miss));
    const barX = 62;
    const barW = o.showCounts ? 72 : W - M - barX;
    const rows = [
      ...active.map(p => ({ name: p.name, ok: p.done - p.late, late: p.late, miss: p.miss, nums: `${p.done} hechas · ${p.late} tarde · ${p.miss} sin hacer` })),
      ...(r.generalMiss ? [{ name: 'Generales', ok: 0, late: 0, miss: r.generalMiss, nums: `${r.generalMiss} sin hacer` }] : []),
    ];
    for (const row of rows) {
      ensure(9);
      ink(INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(row.name, M, y + 4);
      fill([240, 240, 244]); doc.roundedRect(barX, y + 0.5, barW, 4, 1, 1, 'F');
      let x = barX;
      for (const k of ['ok', 'late', 'miss'] as const) {
        const w = (barW * row[k]) / max;
        if (w > 0) { fill(COLOR[k]); doc.rect(x, y + 0.5, w, 4, 'F'); x += w; }
      }
      if (o.showCounts) { ink(MUTED); doc.setFontSize(8.5); doc.text(row.nums, barX + barW + 4, y + 4); }
      y += 8;
    }
  }

  // Lo que no se hizo
  section(`Lo que no se hizo (${r.missed.length})`);
  if (r.missed.length === 0) {
    ink(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text('No quedó nada sin hacer.', M, y + 3);
    y += 8;
  } else {
    for (const m of r.missed) {
      ensure(13);
      fill([252, 231, 233]); doc.roundedRect(M, y, W - 2 * M, 10, 2, 2, 'F');
      ink(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.text(m.title, M + 4, y + 4);
      ink(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
      doc.text(`${DAY[m.date.getDay()]} ${m.date.getDate()} · límite ${m.limit} · ${m.general ? 'General (nadie la tomó)' : m.assignee}`, M + 4, y + 8.3);
      y += 13;
    }
  }

  doc.save(`reporte-${slug(o.companyName) || 'actividades'}-${toDateStr(r.weekStart)}.pdf`);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/report-pdf.ts
git commit -m "feat(reportes): PDF con los números nuevos y el nombre de la empresa"
```

---

### Task 9: La página

**Files:**
- Rewrite: `app/reportes/page.tsx`
- Delete: `components/ReportCharts.tsx`, `components/EmployeeRanking.tsx`

- [ ] **Step 1: Reescribir `app/reportes/page.tsx` completo**

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/lib/company-context';
import { useSession } from '@/lib/session-context';
import {
  buildTrend, buildWeekReport, currentMonday, mondayOf, reportRange, toDateStr, weekLabel,
  type ReportActivity, type ReportCompletion, type ReportEmployee,
} from '@/lib/reports';
import { buildInsights, dailyPeek, trendPeek } from '@/lib/report-insights';
import { fetchAllPages } from '@/lib/fetch-all';
import { downloadReportPdf } from '@/lib/report-pdf';
import { FoldCard, TipProvider } from '@/components/reportes/ui';
import WeekPicker from '@/components/reportes/WeekPicker';
import SummaryCard from '@/components/reportes/SummaryCard';
import InsightsCard from '@/components/reportes/InsightsCard';
import PeopleCard from '@/components/reportes/PeopleCard';
import MissedCard from '@/components/reportes/MissedCard';
import DailyChart from '@/components/reportes/DailyChart';
import TrendChart from '@/components/reportes/TrendChart';
import { IconBars, IconDownload, IconTrend } from '@/components/reportes/icons';
import s from '@/components/reportes/reportes.module.css';

interface Loaded {
  key: string;
  weekStart: Date;
  loadedAt: Date;
  activities: ReportActivity[];
  completions: ReportCompletion[];
  employees: ReportEmployee[];
}

export default function ReportesPage() {
  const { current: company } = useCompany();
  const { role } = useSession();
  const isAdmin = role === 'admin';
  const [weekStart, setWeekStart] = useState<Date>(currentMonday);
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [generating, setGenerating] = useState(false);

  const { from, to } = reportRange(weekStart);
  const key = `${company?.id ?? ''}|${from}`;

  useEffect(() => {
    if (!company) return;
    let alive = true;
    setError(null);
    (async () => {
      try {
        const [acts, emps] = await Promise.all([
          supabase.from('activities')
            .select('id, title, limit_time, days_of_week, week_of_month, assigned_employee_ids, created_at')
            .eq('company_id', company.id)
            .or('is_active.eq.true,week_of_month.not.is.null'),
          supabase.from('employees')
            .select('id, name, initials')
            .eq('is_active', true).eq('company_id', company.id).order('name'),
        ]);
        if (acts.error) throw new Error(acts.error.message);
        if (emps.error) throw new Error(emps.error.message);
        const activities = (acts.data ?? []) as ReportActivity[];
        const ids = activities.map(a => a.id);
        // Sólo las 12 semanas que se pintan, en orden y por páginas:
        // la base nunca entrega más de 1,000 filas por consulta y no avisa.
        const completions = ids.length === 0 ? [] : await fetchAllPages<ReportCompletion>((f, t) =>
          supabase.from('completions')
            .select('activity_id, employee_id, scheduled_date, was_late')
            .in('activity_id', ids)
            .gte('scheduled_date', from)
            .lte('scheduled_date', to)
            .order('scheduled_date')
            .order('id')
            .range(f, t));
        if (alive) {
          setData({ key, weekStart, loadedAt: new Date(), activities, completions, employees: (emps.data ?? []) as ReportEmployee[] });
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'error desconocido');
      }
    })();
    return () => { alive = false; };
  }, [company, key, from, to, weekStart, attempt]);

  const loading = !data || data.key !== key;
  const report = useMemo(
    () => (data ? buildWeekReport(data.weekStart, data.activities, data.completions, data.employees, data.loadedAt) : null),
    [data],
  );
  const trend = useMemo(
    () => (data ? buildTrend(data.weekStart, data.activities, data.completions, data.employees, data.loadedAt) : []),
    [data],
  );
  const prevPct = trend.length >= 2 ? trend[trend.length - 2].pct : null;
  const insights = useMemo(() => (report ? buildInsights(report, prevPct, isAdmin) : []), [report, prevPct, isAdmin]);
  const isCurrent = !!data && data.weekStart.getTime() === mondayOf(data.loadedAt).getTime();
  const weekKey = data ? toDateStr(data.weekStart) : '';

  async function handleDownload() {
    if (!report) return;
    setGenerating(true);
    try {
      await downloadReportPdf({ report, insights, companyName: company?.name ?? 'Actividades', showCounts: isAdmin });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <AdminShell>
      <div className={s.page}>
        <TipProvider>
          <header className={s.top}>
            <div>
              <div className={s.eyebrow}><i />{company?.name ?? 'Actividades'} · Actividades</div>
              <h1 className={s.title}>Reportes</h1>
              <div className={s.sub}>Semana del {weekLabel(weekStart)}</div>
            </div>
            <div className={s.tools}>
              <WeekPicker weekStart={weekStart} onChange={setWeekStart} />
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={handleDownload} disabled={!report || loading || generating}>
                <IconDownload />{generating ? 'Generando…' : 'PDF'}
              </button>
            </div>
          </header>

          <div className={s.content} style={{ opacity: loading && report ? 0.55 : 1 }} aria-busy={loading}>
            {error && (
              <div className={s.error}>
                No se pudo cargar el reporte ({error}).
                <button type="button" className={`${s.btn} ${s.btnSoft}`} onClick={() => setAttempt(n => n + 1)}>Reintentar</button>
              </div>
            )}
            {!report ? (
              !error && <p className={s.loading}>Cargando reporte…</p>
            ) : (
              <>
                <div className={s.bento}>
                  <SummaryCard key={weekKey} report={report} prevPct={prevPct} isCurrent={isCurrent} />
                  <InsightsCard insights={insights} />
                </div>
                <PeopleCard key={`p${weekKey}`} people={report.people} generalMiss={report.generalMiss} showCounts={isAdmin} />
                <MissedCard missed={report.missed} hasDue={report.due > 0} today={toDateStr(data!.loadedAt)} />
                <div className={s.divider}>Más detalle</div>
                <FoldCard storageKey="lf_rep_open_daily" icon={<IconBars />} title="Día por día" peek={dailyPeek(report)}>
                  <DailyChart key={weekKey} days={report.days} />
                </FoldCard>
                <FoldCard storageKey="lf_rep_open_trend" icon={<IconTrend />} title="Semanas pasadas" peek={trendPeek(trend)}>
                  <TrendChart points={trend} current={isCurrent} onSelect={setWeekStart} />
                </FoldCard>
              </>
            )}
          </div>
        </TipProvider>
      </div>
    </AdminShell>
  );
}
```

- [ ] **Step 2: Borrar los componentes viejos**

```bash
git rm components/ReportCharts.tsx components/EmployeeRanking.tsx
```

- [ ] **Step 3: Tipos, pruebas y build**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos. (Si aparece algún error preexistente ajeno a estos archivos, anotarlo y no tocarlo.)

Run: `npx jest`
Expected: PASS (todas las suites).

Run: `npx next build`
Expected: build exitoso, `/reportes` en la lista de rutas.

- [ ] **Step 4: Commit**

```bash
git add app/reportes/page.tsx
git commit -m "feat(reportes): pantalla nueva con conteo corregido y carga por páginas"
```

---

### Task 10: Verificación en local

- [ ] **Step 1: Levantar el panel**

Run (en segundo plano): `npx next dev --port 3010`
Entrar a `http://localhost:3010/login` con la contraseña de administrador (`ADMIN_PASSWORD` de `.env.local`) y abrir `/reportes`.

- [ ] **Step 2: Revisar contra la maqueta (Playwright, escritorio 1366 px y celular 390 px)**

Comprobar:
- Letra Geist y menú flotante.
- Aro con porcentaje, frase y barra de la semana con sus cuatro números.
- Lectura rápida con hasta tres frases.
- Por persona ordenado por atención.
- Lo que no se hizo.
- "Día por día" y "Semanas pasadas" cerradas, que abren y recuerdan su estado.
- Globos de ayuda al pasar el mouse.
- Flechas de semana y "Esta semana".
- Sin desbordes horizontales en el celular.

- [ ] **Step 3: Comparar una semana terminada contra producción**

Con el selector, ir a la semana del 19 de octubre. El porcentaje debe ser igual al que muestra https://laferre-admin.vercel.app/reportes con esa semana elegida, porque en una semana completa la regla nueva no cambia nada. Anotar ambos números.

- [ ] **Step 4: Semana actual**

El porcentaje de la semana en curso no debe contar lo que está por hacer. "Por hacer" debe sumar lo de hoy que no ha vencido más lo de los días que faltan.

- [ ] **Step 5: PDF**

Descargar el PDF y abrirlo: encabezado con el nombre de la empresa, mismos números que la pantalla.

---

### Task 11: Subir a producción

- [ ] **Step 1: Unir a `main` y subir**

```bash
git checkout main
git merge --ff-only feat/reportes-rediseno
git push origin main
```

Vercel despliega solo desde `main`. Si el push falla por credenciales, desplegar con `vercel --prod --yes` desde la carpeta del repo.

- [ ] **Step 2: Verificar en producción**

Abrir https://laferre-admin.vercel.app/reportes: comprobar la letra Geist, el menú flotante y el porcentaje de la semana del 19 de octubre (igual al anotado en la Task 10).
