// Medallas de capacitación (diseño: docs/superpowers/specs/2026-11-25-medallas-capacitacion-design.md). Puro.
// La medalla no se guarda: es el estado de la versión actual. Versión nueva → vuelve a "Por ver" → medalla gris.
// La app de teléfonos tiene una copia en laferre-actividades/lib/training.ts: cambiar las dos.
import { isDone, type TrainingStatus } from './status';

interface MedalItem { slug: string; title: string; sort_order: number; status: TrainingStatus }

/** Entendida o capacitado en persona: la misma medalla. */
export const hasMedal = (s: TrainingStatus) => isDone(s);

/** La vitrina: primero las ganadas y luego las que faltan; cada grupo por el orden de las capacitaciones. */
export function medalShelf<T extends MedalItem>(items: T[]): (T & { earned: boolean })[] {
  return items.map(i => ({ ...i, earned: hasMedal(i.status) }))
    .sort((a, b) => Number(b.earned) - Number(a.earned) || a.sort_order - b.sort_order);
}

export function medalCount(items: { status: TrainingStatus }[]) {
  return { earned: items.filter(i => hasMedal(i.status)).length, total: items.length };
}

export const wonText = (title: string) => `Ganaste la medalla de ${title}.`;

/** El texto de la pantalla final cuando la respuesta deja medalla; con dudas, null (se queda el texto de siempre). */
export function medalLine(status: TrainingStatus, title: string): string | null {
  if (status === 'understood') return wonText(title);
  if (status === 'trained') return `Ya te capacitó el Ing. en persona y tienes la medalla de ${title}.`;
  return null;
}
