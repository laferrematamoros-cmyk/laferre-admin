// Capacitaciones de UNA persona para la app de RH (parte 2 del puente; diseño: docs/superpowers/specs/2026-11-27-rh-capacitaciones-design.md). Puro.
// Junta el estado de la versión actual (cap_list) con el historial de todas las versiones (training_progress):
// si sale una versión nueva y no la ha visto, sigue constando que la terminó antes.
import { THEMES, isThemeKey } from './capacitaciones/themes';
import { levelFor, LEVEL_LABEL } from './capacitaciones/levels';

export type EstadoRH = 'understood' | 'trained' | 'doubt' | 'pending' | 'overdue' | 'pausada';

export interface TrainingRow { id: string; slug: string; title: string; sort_order: number; version: number; is_active: boolean; theme: string | null }
/** Una fila de cap_list (sólo las prendidas). */
export interface CurrentRow { id: string; status: string; deadline: string }
export interface ProgressRow { training_id: string; version: number; status: string; answered_at: string; trained_at: string | null; trained_by: string | null }

export interface Hecha { version: number; forma: 'Entendida' | 'En persona'; fecha: string; por: string | null }
export interface ItemRH {
  slug: string; titulo: string; tema: string; activa: boolean; estado: EstadoRH;
  /** Plazo de la versión actual (si está prendida). */
  vence: string | null;
  /** La terminación más nueva, de cualquier versión. */
  hecha: Hecha | null;
  /** La terminó en una versión anterior y la actual le falta. */
  versionNueva: boolean;
}
export interface ReporteRH {
  items: ItemRH[];
  /** hechas/total: de las prendidas, versión actual (como la vitrina). terminadas: las que tienen alguna terminación. */
  resumen: { hechas: number; total: number; nivel: string | null; terminadas: number };
}

const DONE = new Set(['understood', 'trained']);

export function buildTrainingReport(trainings: TrainingRow[], current: CurrentRow[], progress: ProgressRow[]): ReporteRH {
  const cur = new Map(current.map(c => [c.id, c]));
  const items: (ItemRH & { orden: number })[] = [];
  for (const t of trainings) {
    const done = progress
      .filter(p => p.training_id === t.id && DONE.has(p.status))
      .map(p => ({
        version: p.version,
        forma: (p.status === 'trained' ? 'En persona' : 'Entendida') as Hecha['forma'],
        fecha: (p.status === 'trained' && p.trained_at) || p.answered_at,
        por: p.status === 'trained' ? p.trained_by ?? null : null,
      }))
      .sort((a, b) => b.version - a.version || b.fecha.localeCompare(a.fecha))[0] ?? null;
    const c = t.is_active ? cur.get(t.id) : undefined;
    if (!c && !done) continue; // pausada que nunca terminó: no es de su historial
    const estado: EstadoRH = c ? (c.status as EstadoRH) : 'pausada';
    items.push({
      slug: t.slug, titulo: t.title,
      tema: (isThemeKey(t.theme) ? THEMES[t.theme] : THEMES.general).label,
      activa: !!c, estado, vence: c?.deadline ?? null, hecha: done,
      versionNueva: !!done && !!c && !DONE.has(c.status) && done.version < t.version,
      orden: (c ? 0 : 1_000_000) + t.sort_order,
    });
  }
  items.sort((a, b) => a.orden - b.orden);
  const activas = items.filter(i => i.activa);
  const hechas = activas.filter(i => DONE.has(i.estado)).length;
  const lv = levelFor(hechas, activas.length).current;
  return {
    items: items.map(({ orden: _o, ...i }) => i),
    resumen: { hechas, total: activas.length, nivel: lv ? LEVEL_LABEL[lv] : null, terminadas: items.filter(i => i.hecha).length },
  };
}
