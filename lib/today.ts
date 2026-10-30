import type { Activity, Completion } from './supabase';
import { activityRunsOn, dueAt, pctOf, toDateStr, type ReportEmployee } from './reports';

// ── Estados de una actividad HOY ────────────────────────────────────────────────
// Mismas reglas que Reportes (lo hecho tarde cuenta, lo que no vence no baja el %),
// más "en curso": ya empezó y todavía no vence.
export type TodayStatus = 'done' | 'doneLate' | 'running' | 'upcoming' | 'overdue';
export const TODAY_STATUSES: TodayStatus[] = ['done', 'doneLate', 'running', 'upcoming', 'overdue'];
export const TODAY_LABEL: Record<TodayStatus, string> = {
  done: 'Hecha', doneLate: 'Hecha tarde', running: 'En curso', upcoming: 'Por hacer', overdue: 'Atrasada',
};
/** "Por vencer": en curso y le quedan estos minutos o menos. */
export const SOON_MIN = 30;

export type TodayActivity = Pick<Activity, 'id' | 'title' | 'description' | 'start_time' | 'limit_time' | 'days_of_week' | 'week_of_month' | 'assigned_employee_ids' | 'created_at'>;
export type TodayCompletion = Pick<Completion, 'activity_id' | 'employee_id' | 'scheduled_date' | 'was_late' | 'completed_at' | 'photo_url' | 'note'>;

export interface TodayRow {
  id: string;
  title: string;
  description: string | null;
  start: string;            // "HH:MM"
  limit: string;            // "HH:MM"
  startMin: number;         // minutos desde las 00:00
  limitMin: number;
  status: TodayStatus;
  minutesLate: number | null;
  minutesLeft: number | null;
  /** Asignados que siguen activos (a quién se le manda el recordatorio). */
  assignedIds: string[];
  /** "ANA, BETO" · "General" · "Sin responsable activo" */
  assignee: string;
  general: boolean;
  completion: TodayCompletion | null;
  doneBy: string | null;
}
export interface TodayPerson { id: string; name: string; initials: string; done: number; late: number; overdue: number; pending: number; }
export interface TodayReport {
  rows: TodayRow[];
  counts: Record<TodayStatus, number>;
  /** hechas (a tiempo + tarde) */
  done: number;
  /** hechas + atrasadas: lo que ya tocaba */
  due: number;
  pct: number | null;
  /** atrasadas (más atraso primero) y luego por vencer (menos tiempo primero) */
  attention: TodayRow[];
  /** atrasadas primero, luego más tarde, luego más hechas; sin nada hoy al final */
  people: TodayPerson[];
  /** atrasadas sin responsable activo (generales o asignadas a alguien dado de baja) */
  generalOverdue: number;
}

export function minutesOf(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function todayStatus(comp: TodayCompletion | undefined, start: Date, limit: Date, now: Date): TodayStatus {
  if (comp) return comp.was_late ? 'doneLate' : 'done';
  if (now.getTime() > limit.getTime()) return 'overdue';
  if (now.getTime() >= start.getTime()) return 'running';
  return 'upcoming';
}

export function buildToday(
  activities: TodayActivity[],
  completions: TodayCompletion[],
  employees: ReportEmployee[],
  now: Date = new Date(),
): TodayReport {
  const day = new Date(now); day.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
  const dateStr = toDateStr(day);
  const emp = new Map(employees.map(e => [e.id, e]));
  const compByAct = new Map<string, TodayCompletion>();
  for (const c of completions) {
    if (c.scheduled_date === dateStr && !compByAct.has(c.activity_id)) compByAct.set(c.activity_id, c);
  }

  const rows: TodayRow[] = activities
    .filter(a => activityRunsOn(a, day) && new Date(a.created_at) <= dayEnd)
    .map(a => {
      const start = dueAt(day, a.start_time);
      const limit = dueAt(day, a.limit_time);
      const comp = compByAct.get(a.id);
      const status = todayStatus(comp, start, limit, now);
      const assigned = (a.assigned_employee_ids ?? []) as string[];
      const owners = assigned.filter(id => emp.has(id));
      return {
        id: a.id,
        title: a.title,
        description: a.description,
        start: a.start_time.slice(0, 5),
        limit: a.limit_time.slice(0, 5),
        startMin: minutesOf(a.start_time),
        limitMin: minutesOf(a.limit_time),
        status,
        minutesLate: status === 'overdue' ? Math.floor((now.getTime() - limit.getTime()) / 60000) : null,
        minutesLeft: status === 'running' ? Math.ceil((limit.getTime() - now.getTime()) / 60000) : null,
        assignedIds: owners,
        assignee: assigned.length === 0 ? 'General'
          : owners.length === 0 ? 'Sin responsable activo'
          : owners.map(id => emp.get(id)!.name).join(', '),
        general: assigned.length === 0,
        completion: comp ?? null,
        doneBy: comp ? emp.get(comp.employee_id)?.name ?? null : null,
      };
    })
    .sort((x, y) => x.startMin - y.startMin || x.limitMin - y.limitMin || x.title.localeCompare(y.title, 'es'));

  const counts: Record<TodayStatus, number> = { done: 0, doneLate: 0, running: 0, upcoming: 0, overdue: 0 };
  const per = new Map<string, { done: number; late: number; overdue: number; pending: number }>();
  const bump = (id: string) => {
    let p = per.get(id);
    if (!p) { p = { done: 0, late: 0, overdue: 0, pending: 0 }; per.set(id, p); }
    return p;
  };
  let generalOverdue = 0;

  for (const r of rows) {
    counts[r.status]++;
    if (r.completion) {
      if (emp.has(r.completion.employee_id)) {
        const p = bump(r.completion.employee_id);
        p.done++;
        if (r.completion.was_late) p.late++;
      }
    } else if (r.status === 'overdue') {
      if (r.assignedIds.length === 0) generalOverdue++;
      for (const id of r.assignedIds) bump(id).overdue++;
    } else {
      for (const id of r.assignedIds) bump(id).pending++;
    }
  }

  const attention = [
    ...rows.filter(r => r.status === 'overdue').sort((x, y) => (y.minutesLate ?? 0) - (x.minutesLate ?? 0)),
    ...rows.filter(r => r.status === 'running' && (r.minutesLeft ?? Infinity) <= SOON_MIN).sort((x, y) => (x.minutesLeft ?? 0) - (y.minutesLeft ?? 0)),
  ];

  const people: TodayPerson[] = employees
    .map(e => ({ id: e.id, name: e.name, initials: e.initials || e.name.slice(0, 2).toUpperCase(), ...(per.get(e.id) ?? { done: 0, late: 0, overdue: 0, pending: 0 }) }))
    .sort((a, b) => {
      const idleA = a.done + a.overdue + a.pending === 0, idleB = b.done + b.overdue + b.pending === 0;
      if (idleA !== idleB) return idleA ? 1 : -1;
      return b.overdue - a.overdue || b.late - a.late || b.done - a.done || a.name.localeCompare(b.name, 'es');
    });

  const done = counts.done + counts.doneLate;
  const due = done + counts.overdue;
  return { rows, counts, done, due, pct: pctOf(done, due), attention, people, generalOverdue };
}

// ── Línea del día ───────────────────────────────────────────────────────────────
type Span = { id: string; startMin: number; limitMin: number };

/** Carril de cada actividad para que las que se enciman no se tapen (el primero libre). */
export function assignLanes(spans: Span[]): Record<string, number> {
  const ends: number[] = [];
  const out: Record<string, number> = {};
  for (const s of [...spans].sort((a, b) => a.startMin - b.startMin || a.limitMin - b.limitMin)) {
    let lane = ends.findIndex(end => end <= s.startMin);
    if (lane === -1) { lane = ends.length; ends.push(0); }
    ends[lane] = Math.max(s.limitMin, s.startMin + 1);
    out[s.id] = lane;
  }
  return out;
}

/** Horas que abarca la línea: de 7 am a 7 pm como mínimo, en horas cerradas. */
export function dayRange(spans: Span[]): { from: number; to: number } {
  const minStart = Math.min(...spans.map(s => s.startMin), 7 * 60);
  const maxLimit = Math.max(...spans.map(s => s.limitMin), 19 * 60);
  return { from: Math.floor(minStart / 60) * 60, to: Math.ceil(maxLimit / 60) * 60 };
}
