// Calendario del inventario por letra: reglas puras (se prueban sin servidor ni base).
// Las usan el cron (/api/reminders → lib/inventory-server.ts) y el panel.
import { shopClock, SHOP_TZ } from './my-day';

export interface PlanRow {
  company_id: string;
  every_weeks: number;
  first_open_date: string;      // AAAA-MM-DD
  due_amount: number;
  due_unit: 'days' | 'weeks';
  is_active: boolean;
}

export interface OpenRoundInfo {
  id: string;
  opened_at: string;
  due_at: string;
  notices: Record<string, string>;
  pending: number;              // letras que no están hechas
  total: number;
}

export type InventoryAction =
  | { kind: 'open'; scheduledFor: string; dueAt: string; supersede: string | null }
  | { kind: 'notice'; key: string; title: string; body: string };

export type RoundStatus = 'open' | 'late' | 'done' | 'doneLate' | 'incomplete';

export const OPEN_AT = 8 * 60;       // 08:00
export const DAILY_AT = 10 * 60;     // 10:00
export const LAST_DAY_AT = 13 * 60;  // 13:00
export const QUIET_AFTER = 20 * 60;  // sin avisos después de las 20:00

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const parts = (d: string) => d.split('-').map(Number) as [number, number, number];
const utcMs = (d: string) => { const [y, m, dd] = parts(d); return Date.UTC(y, m - 1, dd); };
const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function addDays(d: string, n: number): string { return fmt(utcMs(d) + n * 86_400_000); }
export function daysBetween(a: string, b: string): number { return Math.round((utcMs(b) - utcMs(a)) / 86_400_000); }
export function dueDays(p: Pick<PlanRow, 'due_amount' | 'due_unit'>): number {
  return p.due_unit === 'weeks' ? p.due_amount * 7 : p.due_amount;
}

/** La última fecha programada (inicio + k·N semanas) que ya llegó; null si todavía no empieza. */
export function latestScheduled(p: Pick<PlanRow, 'first_open_date' | 'every_weeks'>, today: string): string | null {
  const diff = daysBetween(p.first_open_date, today);
  if (diff < 0) return null;
  const step = p.every_weeks * 7;
  return addDays(p.first_open_date, Math.floor(diff / step) * step);
}

/** Último día para terminar: apertura + plazo − 1 (con 1 semana, abre el día 1 → el 7). */
export function lastDayOf(openDate: string, p: Pick<PlanRow, 'due_amount' | 'due_unit'>): string {
  return addDays(openDate, dueDays(p) - 1);
}

/** Fecha y hora de Matamoros → instante real (respeta su horario de verano). */
export function zonedToUtc(date: string, minutes: number, tz = SHOP_TZ): Date {
  const [y, m, d] = parts(date);
  const target = Date.UTC(y, m - 1, d) + minutes * 60_000;
  let t = target;
  for (let i = 0; i < 3; i++) {
    const c = shopClock(new Date(t), tz);
    const seen = utcMs(c.dateStr) + c.minutes * 60_000;
    if (seen === target) break;
    t -= seen - target;
  }
  return new Date(t);
}

export function openingInstant(date: string): Date { return zonedToUtc(date, OPEN_AT); }
export function dueInstant(openDate: string, p: Pick<PlanRow, 'due_amount' | 'due_unit'>): Date {
  return new Date(zonedToUtc(addDays(lastDayOf(openDate, p), 1), 0).getTime() - 1000);
}

export function monthLabel(date: string): string { return MONTHS[parts(date)[1] - 1]; }
export function dayLabel(date: string): string {
  const [y, m, d] = parts(date);
  return `${DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d}`;
}

export function roundStatus(
  r: { due_at: string; closed_at: string | null; close_reason: 'completed' | 'superseded' | null },
  now: Date,
): RoundStatus {
  if (!r.closed_at) return now.getTime() > new Date(r.due_at).getTime() ? 'late' : 'open';
  if (r.close_reason === 'superseded') return 'incomplete';
  return new Date(r.closed_at).getTime() > new Date(r.due_at).getTime() ? 'doneLate' : 'done';
}

const letters = (n: number) => `${n} ${n === 1 ? 'letra' : 'letras'}`;

/**
 * Qué toca hacer en este momento para una empresa: abrir una ronda (y cerrar la anterior
 * como incompleta) o mandar un aviso. Cada aviso tiene una llave para mandarse UNA vez.
 */
export function inventoryActions(args: {
  plan: PlanRow | null; open: OpenRoundInfo | null; lastScheduled: string | null; now: Date;
}): InventoryAction[] {
  const { plan, open, lastScheduled, now } = args;
  const clock = shopClock(now);
  const today = clock.dateStr;

  if (plan?.is_active) {
    const s = latestScheduled(plan, today);
    const isNew = s && (!lastScheduled || lastScheduled < s);
    const stillInTime = s && today <= lastDayOf(s, plan);
    const itsTime = s && (today > s || clock.minutes >= OPEN_AT);
    if (isNew && stillInTime && itsTime) {
      return [{ kind: 'open', scheduledFor: s, dueAt: dueInstant(s, plan).toISOString(), supersede: open?.id ?? null }];
    }
  }

  if (!open || clock.minutes >= QUIET_AFTER || clock.minutes < OPEN_AT) return [];
  const openedDay = shopClock(new Date(open.opened_at)).dateStr;
  const lastDay = shopClock(new Date(open.due_at)).dateStr;

  if (!open.notices.open) {
    return [{
      kind: 'notice', key: 'open', title: `Inventario de ${monthLabel(openedDay)}`,
      body: `Empezó el inventario: ${letters(open.total)}, tienen hasta el ${dayLabel(lastDay)}.`,
    }];
  }
  if (open.pending <= 0 || today === openedDay) return [];

  const late = now.getTime() > new Date(open.due_at).getTime();
  const out: InventoryAction[] = [];
  const dailyKey = `daily:${today}`;
  if (clock.minutes >= DAILY_AT && !open.notices[dailyKey]) {
    if (late) {
      out.push({ kind: 'notice', key: dailyKey, title: 'Inventario atrasado', body: `El inventario ya venció: faltan ${letters(open.pending)}.` });
    } else {
      const left = daysBetween(today, lastDay) + 1;
      out.push({
        kind: 'notice', key: dailyKey, title: 'Inventario',
        body: left <= 1
          ? `Hoy es el último día: faltan ${letters(open.pending)}.`
          : `Faltan ${letters(open.pending)} del inventario, quedan ${left} días.`,
      });
    }
    return out;
  }
  const lastKey = `last:${today}`;
  if (!late && today === lastDay && clock.minutes >= LAST_DAY_AT && !open.notices[lastKey]) {
    out.push({
      kind: 'notice', key: lastKey, title: 'Inventario: hoy es el último día',
      body: `${open.pending === 1 ? 'Falta' : 'Faltan'} ${letters(open.pending)} del inventario.`,
    });
  }
  return out;
}

/** Fecha del próximo inventario programado (para mostrarla en la configuración). */
export function nextOpening(p: PlanRow, today: string, openedDates: string[]): string {
  const latest = latestScheduled(p, today);
  if (!latest) return p.first_open_date;
  if (!openedDates.includes(latest) && today <= lastDayOf(latest, p)) return latest;
  return addDays(latest, p.every_weeks * 7);
}
