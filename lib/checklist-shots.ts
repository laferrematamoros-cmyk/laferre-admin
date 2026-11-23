import { safeHttps } from './safe-url';
import type { SignRun } from './checklist-types';

export interface ListShot { itemId: string; label: string; url: string }
export interface ListShots {
  /** Fotos que se pueden enseñar, en el orden de la lista. */
  shots: ListShot[];
  /** Tareas hechas que llevaban foto y ya no la tienen (se borran a los 21 días). */
  gone: number;
  done: number;
  total: number;
}

/** Lo que el detalle del Calendario enseña de una lista con firma: sus fotos y cuántas tareas se hicieron.
 *  La foto de una lista vive en cada tarea, no en el registro de la actividad. */
export function listShots(run: Pick<SignRun, 'marks'>): ListShots {
  const shots: ListShot[] = [];
  let gone = 0;
  for (const m of run.marks) {
    const url = safeHttps(m.photoUrl);
    if (url) shots.push({ itemId: m.item_id, label: m.label, url });
    else if (m.hadPhoto) gone++;
  }
  return {
    shots,
    gone,
    done: run.marks.filter(m => m.state === 'done').length,
    total: run.marks.length,
  };
}
