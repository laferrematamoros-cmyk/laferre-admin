// Resumen semanal de las bitácoras (listas con firma) para la tarjeta de Reportes. Puro.
// Diseño: docs/superpowers/specs/2026-11-26-bitacoras-en-reportes-design.md
// Misma semana que la hoja (lib/bitacora.ts): lunes a sábado.
import { mondayOf } from './duty';

/** `start`: el primer día de su rol (min valid_from de activity_rotations). Antes de eso no se le debe nada. */
export interface SumActivity { id: string; title: string; days_of_week: number[] | null; start?: string | null }
export interface SumRun { id: string; activity_id: string; scheduled_date: string; status: string }
/** Sólo las marcas "No se pudo" (state = 'skipped'). */
export interface SumMark { run_id: string }
export interface BitSummary {
  id: string; title: string;
  /** días que tocaban, de lunes a sábado, hasta hoy */
  due: number;
  /** listas entregadas (por firmar o firmadas) */
  done: number; signed: number; toSign: number;
  /** días ya pasados que tocaban y no tienen lista entregada (hoy no cuenta) */
  missed: number;
  /** tareas marcadas "No se pudo" */
  skipped: number;
}
export type ChipTone = 'ok' | 'warn' | 'muted';

const FINISHED = new Set(['awaiting_signature', 'signed']);

const addDays = (d: string, n: number) => {
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, dd + n)).toISOString().slice(0, 10);
};
const dow = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay();

export function bitacoraSummary(acts: SumActivity[], runs: SumRun[], skipped: SumMark[], weekStart: string, today: string): BitSummary[] {
  const dates = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));
  const inWeek = runs.filter(r => dates.includes(r.scheduled_date));
  const actOfRun = new Map(inWeek.map(r => [r.id, r.activity_id]));
  const skippedBy = new Map<string, number>();
  for (const m of skipped) {
    const a = actOfRun.get(m.run_id);
    if (a) skippedBy.set(a, (skippedBy.get(a) ?? 0) + 1);
  }
  return acts.map(a => {
    const days = new Set(a.days_of_week ?? []);
    const mine = inWeek.filter(r => r.activity_id === a.id);
    const finishedOn = new Set(mine.filter(r => FINISHED.has(r.status)).map(r => r.scheduled_date));
    const dueDates = dates.filter(d => d <= today && (!a.start || d >= a.start) && days.has(dow(d)));
    return {
      id: a.id, title: a.title,
      due: dueDates.length,
      done: mine.filter(r => FINISHED.has(r.status)).length,
      signed: mine.filter(r => r.status === 'signed').length,
      toSign: mine.filter(r => r.status === 'awaiting_signature').length,
      missed: dueDates.filter(d => d < today && !finishedOn.has(d)).length,
      skipped: skippedBy.get(a.id) ?? 0,
    };
  }).sort((x, y) => x.title.localeCompare(y.title, 'es'));
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Los textitos del renglón: "5 de 6 días hechos", "4 firmadas", "1 por firmar", "2 tareas no se pudieron". */
export function summaryChips(s: BitSummary): { text: string; tone: ChipTone }[] {
  if (s.due === 0 && s.done === 0) return [{ text: 'Esta semana no tocaba', tone: 'muted' }];
  const out: { text: string; tone: ChipTone }[] = [
    { text: `${s.done} de ${s.due} ${plural(s.due, 'día hecho', 'días hechos')}`, tone: s.missed > 0 ? 'warn' : 'ok' },
  ];
  if (s.signed > 0) out.push({ text: `${s.signed} ${plural(s.signed, 'firmada', 'firmadas')}`, tone: 'ok' });
  if (s.toSign > 0) out.push({ text: `${s.toSign} por firmar`, tone: 'warn' });
  if (s.skipped > 0) out.push({ text: `${s.skipped} ${plural(s.skipped, 'tarea no se pudo', 'tareas no se pudieron')}`, tone: 'muted' });
  return out;
}

/** La línea de la tarjeta plegada: "2 listas · 1 por firmar · 1 día sin hacer" o "1 lista · todo al día". */
export function bitacorasPeek(list: BitSummary[]): string {
  const n = list.length;
  const toSign = list.reduce((t, s) => t + s.toSign, 0);
  const missed = list.reduce((t, s) => t + s.missed, 0);
  const parts = [`${n} ${plural(n, 'lista', 'listas')}`];
  if (toSign > 0) parts.push(`${toSign} por firmar`);
  if (missed > 0) parts.push(`${missed} ${plural(missed, 'día sin hacer', 'días sin hacer')}`);
  if (parts.length === 1) parts.push('todo al día');
  return parts.join(' · ');
}

/** La semana que viene en la dirección (?semana=): su lunes, si no es futura. Si no sirve, null. */
export function validWeek(raw: string | null | undefined, thisWeek: string): string | null {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(`${raw}T12:00:00Z`))) return null;
  const monday = mondayOf(raw);
  return monday <= thisWeek ? monday : null;
}
