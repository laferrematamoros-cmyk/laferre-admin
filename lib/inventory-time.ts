// Tiempo del inventario por letra (reglas puras, con pruebas).
// minutes_taken lo anota el empleado; claimed_at y done_at los pone la base y sólo los ve el admin.
import { shopClock } from './my-day';

const WEEKDAY = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTH = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** 25 → "25 min" · 95 → "1 h 35 min" · 1500 → "1 día 1 h". */
export function minutesText(total: number): string {
  const m = Math.max(0, Math.round(total));
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), r = m % 60;
  if (d) return h ? `${d} ${d === 1 ? 'día' : 'días'} ${h} h` : `${d} ${d === 1 ? 'día' : 'días'}`;
  if (!h) return `${r} min`;
  return r ? `${h} h ${r} min` : `${h} h`;
}

function clock(iso: string) {
  const c = shopClock(new Date(iso));
  const [y, mo, d] = c.dateStr.split('-').map(Number);
  const hhmm = `${String(Math.floor(c.minutes / 60)).padStart(2, '0')}:${String(c.minutes % 60).padStart(2, '0')}`;
  const day = `${WEEKDAY[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()]} ${d} ${MONTH[mo - 1]}`;
  return { date: c.dateStr, hhmm, day };
}

/**
 * De qué hora a qué hora tuvo la letra. Si pasó de un día lleva la fecha, para que se note
 * que se quedó a medias y por eso el total sale alto.
 */
export function spanText(claimedAt: string | null, doneAt: string): string {
  const b = clock(doneAt);
  if (!claimedAt) return `La terminó a las ${b.hhmm}.`;
  const a = clock(claimedAt);
  const total = minutesText((new Date(doneAt).getTime() - new Date(claimedAt).getTime()) / 60000);
  return a.date === b.date
    ? `La tomó a las ${a.hhmm} y la terminó a las ${b.hhmm} (${total} en total).`
    : `La tomó el ${a.day} a las ${a.hhmm} y la terminó el ${b.day} a las ${b.hhmm} (${total} en total).`;
}

/** Para el historial: promedio del tiempo anotado por letra y la que más tardó. */
export function roundTimeStats(sections: { code: string; status: string; minutes_taken: number | null }[]) {
  const timed = sections.filter(s => s.status === 'done' && s.minutes_taken != null && s.minutes_taken > 0);
  if (!timed.length) return { avg: null, slowest: null, counted: 0 };
  const sum = timed.reduce((t, s) => t + (s.minutes_taken as number), 0);
  const top = timed.reduce((m, s) => ((s.minutes_taken as number) > (m.minutes_taken as number) ? s : m));
  return { avg: Math.round(sum / timed.length), slowest: { code: top.code, minutes: top.minutes_taken as number }, counted: timed.length };
}
