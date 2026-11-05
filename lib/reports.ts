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

/** Una pausa de la actividad (resumed_at null = sigue pausada). */
export interface PauseSpan { paused_at: string; resumed_at: string | null; }
/** Ciclo de vida: archivada desde `archived_at` y pausada en cada `pauses`. */
export interface Lifecycle { archived_at?: string | null; pauses?: PauseSpan[]; }

/** ¿La actividad estaba vigente en el momento `t`? (ni archivada ni dentro de una pausa).
 *  Así archivar o pausar no borra el pasado de los reportes. */
export function liveAt(a: Lifecycle, t: Date): boolean {
  const ms = t.getTime();
  if (a.archived_at && ms >= new Date(a.archived_at).getTime()) return false;
  for (const p of a.pauses ?? []) {
    const from = new Date(p.paused_at).getTime();
    const to = p.resumed_at ? new Date(p.resumed_at).getTime() : Infinity;
    if (ms >= from && ms < to) return false;
  }
  return true;
}

export type ReportActivity = Pick<Activity, 'id' | 'title' | 'limit_time' | 'days_of_week' | 'week_of_month' | 'assigned_employee_ids' | 'created_at' | 'is_optional'> & Lifecycle;
export type ReportCompletion = Pick<Completion, 'activity_id' | 'employee_id' | 'scheduled_date' | 'was_late'>;
export type ReportEmployee = Pick<Employee, 'id' | 'name' | 'initials'>;

export interface DayReport extends Counts { date: Date; label: string; isToday: boolean; }
export interface PersonRow { id: string; name: string; initials: string; done: number; late: number; miss: number; }
export interface MissedItem { title: string; date: Date; limit: string; assignee: string; general: boolean; }
/** Una actividad opcional en la semana: `done` días hecha de los `days` que ya pasaron. */
export interface OptionalRow { id: string; title: string; done: number; days: number; }
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
  /** Opcionales: nunca entran a lo de arriba, se ven aparte. */
  optional: OptionalRow[];
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
  const optional = new Map<string, OptionalRow>();
  const todayStr = toDateStr(now);

  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    day.setHours(0, 0, 0, 0);
    const dateStr = toDateStr(day);
    const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
    const dc = emptyCounts();

    for (const a of activities) {
      if (!activityRunsOn(a, day) || new Date(a.created_at) > dayEnd || !liveAt(a, dueAt(day, a.limit_time))) continue;
      const comp = compByKey.get(`${a.id}|${dateStr}`);
      if (a.is_optional) {
        // Se haga o no, no toca el porcentaje ni a las personas: sólo se lleva su cuenta.
        if (comp || now.getTime() > dueAt(day, a.limit_time).getTime()) {
          const o = optional.get(a.id) ?? { id: a.id, title: a.title, done: 0, days: 0 };
          o.days++;
          if (comp) o.done++;
          optional.set(a.id, o);
        }
        continue;
      }
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
        // Asignada sólo a empleados dados de baja: nadie activo responde por ella,
        // así que cuenta con las generales para que los totales cuadren.
        const owners = assigned.filter(id => emp.has(id));
        if (owners.length === 0) generalMiss++;
        for (const id of owners) bump(id).miss++;
        missed.push({
          title: a.title,
          date: day,
          limit: a.limit_time.slice(0, 5),
          assignee: assigned.length === 0 ? 'General'
            : owners.length === 0 ? 'Sin responsable activo'
            : owners.map(id => emp.get(id)!.name).join(', '),
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
  return { weekStart, counts, done, due, pct: pctOf(done, due), days, people, generalMiss, missed, optional: [...optional.values()] };
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
