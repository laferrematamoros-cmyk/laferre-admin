// "Mis actividades": reglas puras (se prueban sin navegador ni servidor).

import type { TodayRow } from './today';

export const SHOP_TZ = 'America/Matamoros';

/**
 * Fecha y hora de la tienda para un instante. El servidor corre en UTC, así que
 * "hoy" y "tarde" se calculan con la zona de Matamoros, no con la del servidor.
 * `day` es la medianoche de ese día armada con la hora local de quien llama
 * (sirve para activityRunsOn / dueAt, que usan getDay/getDate).
 */
export function shopClock(at: Date, tz = SHOP_TZ): { dateStr: string; minutes: number; day: Date } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(at).map(p => [p.type, p.value]),
  );
  const y = Number(parts.year), m = Number(parts.month), d = Number(parts.day);
  return {
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    day: new Date(y, m - 1, d),
  };
}

/** Las que le tocan a esta persona: las generales y las que tiene a su nombre. */
export function mine(rows: TodayRow[], employeeId: string): TodayRow[] {
  return rows.filter(r => r.general || r.assignedIds.includes(employeeId));
}

/** Para la pantalla: primero lo urgente, luego lo que viene y al final lo hecho. */
export function groupMine(rows: TodayRow[]) {
  const now = [
    ...rows.filter(r => r.status === 'overdue').sort((a, b) => (b.minutesLate ?? 0) - (a.minutesLate ?? 0)),
    ...rows.filter(r => r.status === 'running').sort((a, b) => (a.minutesLeft ?? 0) - (b.minutesLeft ?? 0)),
  ];
  const later = rows.filter(r => r.status === 'upcoming');
  const done = rows
    .filter(r => r.status === 'done' || r.status === 'doneLate')
    .sort((a, b) => (b.completion?.completed_at ?? '').localeCompare(a.completion?.completed_at ?? ''));
  return { now, later, done };
}

/** Medidas para achicar una foto sin deformarla: el lado mayor queda en `max` como mucho. */
export function fitWithin(w: number, h: number, max: number): { w: number; h: number } {
  if (w <= 0 || h <= 0) return { w: 0, h: 0 };
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

/** "LAURA" → "Laura", "juan pérez" → "Juan Pérez". */
export function niceName(name: string): string {
  return name.trim().toLocaleLowerCase('es-MX').replace(/(^|\s)(\p{L})/gu, (_, sp: string, ch: string) => sp + ch.toLocaleUpperCase('es-MX'));
}
