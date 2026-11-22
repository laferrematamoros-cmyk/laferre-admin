// Lista de "Mis capacitaciones" (practicante): grupos y textos. Puro.
import { isDone, isOpen, dueLabel, STATUS_LABEL, type TrainingStatus } from './status';

interface Item { slug: string; sort_order: number; status: TrainingStatus; deadline: string }

export interface MyGroups<T extends Item> { open: T[]; doubt: T[]; done: T[] }

/** "Por ver": atrasadas primero y luego por orden; "Con dudas" y "Listas" por orden. */
export function groupMine<T extends Item>(items: T[]): MyGroups<T> {
  const byOrder = (a: T, b: T) => a.sort_order - b.sort_order;
  const open = items.filter(i => isOpen(i.status))
    .sort((a, b) => Number(b.status === 'overdue') - Number(a.status === 'overdue') || byOrder(a, b));
  return {
    open,
    doubt: items.filter(i => i.status === 'doubt').sort(byOrder),
    done: items.filter(i => isDone(i.status)).sort(byOrder),
  };
}

/** Renglón de abajo del título: "Atrasada · venció el jue 19", "Por ver · vence mañana", etc. */
export function mineLine(i: { status: TrainingStatus; deadline: string }, now: Date): string {
  if (isOpen(i.status)) return `${STATUS_LABEL[i.status]} · ${dueLabel(i.deadline, now)}`;
  if (i.status === 'doubt') return 'El Ing. te la va a explicar';
  return STATUS_LABEL[i.status];
}

/** El mensaje crudo de la base no le sirve a la practicante. */
export function friendlyMineError(message: string): string {
  if (/schema cache|does not exist|could not find the (table|function)/i.test(message)) {
    return 'Las capacitaciones todavía no están listas. Avísale a un administrador.';
  }
  return message;
}
