// Textos y formatos del inventario para la pantalla del panel.
import { shopClock } from '@/lib/my-day';
import { dayLabel, monthLabel, type RoundStatus } from '@/lib/inventory-schedule';
import type { InvRound, InvSection } from '@/lib/inventory-types';

export const shopDate = (iso: string) => shopClock(new Date(iso)).dateStr;
export const shopTime = (iso: string) => {
  const m = shopClock(new Date(iso)).minutes;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const ROUND_LABEL: Record<RoundStatus, string> = {
  open: 'En curso', late: 'Atrasado', done: 'Terminado', doneLate: 'Terminado tarde', incomplete: 'Cerrado incompleto',
};

/** "Diciembre" (o "Diciembre · extra" si se abrió a mano). */
export function roundName(r: InvRound): string {
  return `${cap(monthLabel(shopDate(r.opened_at)))}${r.scheduled_for ? '' : ' · extra'}`;
}

/** "abierto el martes 1 · vence el lunes 7" */
export function roundDates(r: InvRound): string {
  return `abierto el ${dayLabel(shopDate(r.opened_at))} · vence el ${dayLabel(shopDate(r.due_at))}`;
}

export type TileState = 'done' | 'run' | 'redo' | 'late' | 'todo';

export function tileState(s: InvSection, roundLate: boolean): TileState {
  if (s.status === 'done') return 'done';
  if (s.status === 'in_progress') return 'run';
  if (s.redo_note) return 'redo';
  return roundLate ? 'late' : 'todo';
}

export function tileText(s: InvSection, people: Record<string, string>, roundLate: boolean): string {
  const who = (id: string | null) => (id ? people[id]?.split(' ')[0] ?? 'alguien' : 'alguien');
  switch (tileState(s, roundLate)) {
    case 'done': return `Hecha · ${who(s.done_by)} ${s.done_at ? shopTime(s.done_at) : ''}`.trim();
    case 'run': return `En proceso · ${who(s.claimed_by)}`;
    case 'redo': return 'Rehacer';
    case 'late': return 'Pendiente · vencida';
    default: return 'Pendiente';
  }
}

export const AREA_LABEL = { bien: 'Bien', regular: 'Regular', mal: 'Mal' } as const;
