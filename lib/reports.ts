import type { Activity, Completion, Employee } from './supabase';

export interface EmployeeStat { name: string; done: number; missed: number; rate: number; }
export interface MissedItem   { title: string; date: string; assignee: string; }
export interface DayBar       { d: string; done: number; missed: number; late: number; }
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
 *  existían cada día (created_at <= fin de ese día). `now` decide qué días
 *  "pasados" entran en la lista de no realizadas. */
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
    let dayDone = 0, dayMissed = 0, dayLate = 0;

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
        if (comp?.was_late) { totalLate++; dayLate++; }
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
    daily.push({ d: DAY_LABELS[dow], done: dayDone, missed: dayMissed, late: dayLate });
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

/** Cumplimiento (realizadas / programadas) en un rango de días [start, end]. */
export function rangeStats(
  start: Date, end: Date,
  activities: Activity[], completions: Completion[],
): { done: number; total: number } {
  let total = 0, done = 0;
  const d = new Date(start); d.setHours(12, 0, 0, 0);
  const stop = new Date(end); stop.setHours(12, 0, 0, 0);
  while (d <= stop) {
    const dateStr = toDateStr(d);
    const dow = d.getDay();
    const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999);
    const doneIds = new Set(completions.filter(c => c.scheduled_date === dateStr).map(c => c.activity_id));
    for (const a of activities) {
      if ((a.days_of_week as number[]).includes(dow) && new Date(a.created_at) <= dayEnd) {
        total++;
        if (doneIds.has(a.id)) done++;
      }
    }
    d.setDate(d.getDate() + 1);
  }
  return { done, total };
}