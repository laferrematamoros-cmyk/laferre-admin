import type { TodayStatus } from '@/lib/today';
import h from './hoy.module.css';

export const BG: Record<TodayStatus, string> = { done: h.bgDone, doneLate: h.bgDoneLate, running: h.bgRunning, upcoming: h.bgUpcoming, overdue: h.bgOverdue };
export const FILL: Record<TodayStatus, string> = { done: h.fDone, doneLate: h.fDoneLate, running: h.fRunning, upcoming: h.fUpcoming, overdue: h.fOverdue };
export const PILL: Record<TodayStatus, string> = { done: h.pDone, doneLate: h.pDoneLate, running: h.pRunning, upcoming: h.pUpcoming, overdue: h.pOverdue };

/** 45 → "45 min" · 125 → "2 h 5 min" · 120 → "2 h" */
export function fmtMin(m: number): string {
  if (m < 60) return `${m} min`;
  const hh = Math.floor(m / 60), mm = m % 60;
  return mm ? `${hh} h ${mm} min` : `${hh} h`;
}
