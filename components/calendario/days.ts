import type { TodayReport, TodayStatus } from '@/lib/today';
import { BG } from '@/components/hoy/look';
import c from './cal.module.css';

export interface CalDay { date: Date; report: TodayReport; isToday: boolean; past: boolean; }

export const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const EV: Record<TodayStatus, string> = { done: c.eDone, doneLate: c.eDoneLate, running: c.eRunning, upcoming: c.eUpcoming, overdue: c.eOverdue };
export const EDGE: Record<TodayStatus, string> = { done: c.bDone, doneLate: c.bDoneLate, running: c.bRunning, upcoming: c.bUpcoming, overdue: c.bOverdue };
/** Orden de los colores en la barrita de cada día. */
export const MINI_ORDER: TodayStatus[] = ['done', 'doneLate', 'overdue', 'running', 'upcoming'];

/** "8/9 hechas" · "9 programadas" (futuro) · "Sin actividades". */
export function daySummary(d: CalDay): string {
  const r = d.report;
  if (r.rows.length === 0) return 'Sin actividades';
  if (r.due === 0) return `${r.rows.length} programada${r.rows.length === 1 ? '' : 's'}`;
  return `${r.done}/${r.due} hechas`;
}

/** Color del puntito del día: lo más urgente que tenga. */
export function dayDot(d: CalDay): string {
  const n = d.report.counts;
  if (d.report.rows.length === 0) return c.dotNone;
  for (const k of ['overdue', 'running', 'upcoming', 'doneLate'] as TodayStatus[]) if (n[k] > 0) return BG[k];
  return BG.done;
}

/** "lunes 26 de octubre" */
export function longDate(d: Date): string {
  return `${d.toLocaleDateString('es-MX', { weekday: 'long' })} ${d.getDate()} de ${d.toLocaleDateString('es-MX', { month: 'long' })}`;
}
