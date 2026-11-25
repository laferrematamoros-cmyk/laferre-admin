// Reglas puras para configurar una lista con firma (supabase/010): validar las tareas,
// acomodar el rol y calcular los cambios. Las usan app/actividades/checklist-actions.ts y el editor.
import { isUuid } from './access-rules';
import { mondayOf } from './duty';

export interface ItemInput { id?: string; area: string; label: string; days: number[]; needs_photo: boolean; }

export const MAX_ITEMS = 60;

export function cleanItems(input: unknown): { ok: true; items: ItemInput[] } | { ok: false; error: string } {
  if (!Array.isArray(input)) return { ok: false, error: 'Lista no válida.' };
  if (input.length > MAX_ITEMS) return { ok: false, error: `Son demasiadas tareas (máximo ${MAX_ITEMS}).` };
  const items: ItemInput[] = [];
  for (let i = 0; i < input.length; i++) {
    const n = i + 1;
    const x = (input[i] ?? {}) as Record<string, unknown>;
    if (x.id !== undefined && x.id !== null && !isUuid(x.id)) return { ok: false, error: `La tarea ${n} no es válida.` };
    const area = typeof x.area === 'string' ? x.area.trim() : '';
    const label = typeof x.label === 'string' ? x.label.trim() : '';
    if (!label) return { ok: false, error: `La tarea ${n} no tiene nombre.` };
    if (label.length > 120) return { ok: false, error: `El nombre de la tarea ${n} es muy largo.` };
    if (!area) return { ok: false, error: `La tarea ${n} no tiene área.` };
    if (area.length > 60) return { ok: false, error: `El área de la tarea ${n} es muy larga.` };
    const days = [...new Set((Array.isArray(x.days) ? x.days : []).filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))]
      .sort((a, b) => a - b);
    if (days.length === 0) return { ok: false, error: `"${label}" no tiene ningún día.` };
    items.push({ ...(isUuid(x.id) ? { id: x.id } : {}), area, label, days, needs_photo: x.needs_photo === true });
  }
  return { ok: true, items };
}

/** El orden del rol con `current` primero (el círculo no cambia): ['E','L','Y'] + 'L' → ['L','Y','E']. */
export function rotateTo(ids: string[], current: string): string[] {
  const i = ids.indexOf(current);
  return i <= 0 ? [...ids] : [...ids.slice(i), ...ids.slice(0, i)];
}

const addDays = (date: string, n: number) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

/** "Cambiar esta semana" = lunes a domingo de esa fecha; "Cambiar un día" = esa fecha. */
export function overrideSpan(kind: 'week' | 'day', date: string): { from: string; to: string } {
  if (kind === 'day') return { from: date, to: date };
  const from = mondayOf(date);
  return { from, to: addDays(from, 6) };
}

export const MAX_ROTATION = 20;

/** Para crear de un jalón una actividad con lista: al menos una tarea, el rol y quién empieza esta semana.
 *  Regresa el rol ya girado (la de esta semana primero), como lo guarda activity_rotations. */
export function checkNewList(items: unknown, order: unknown, current: unknown):
  { ok: true; items: ItemInput[]; order: string[] } | { ok: false; error: string } {
  const c = cleanItems(items);
  if (!c.ok) return c;
  if (c.items.length === 0) return { ok: false, error: 'Agrega al menos una tarea.' };
  if (!Array.isArray(order) || order.length === 0) return { ok: false, error: 'Agrega al menos una persona al rol.' };
  if (order.length > MAX_ROTATION || !order.every(isUuid) || new Set(order).size !== order.length) {
    return { ok: false, error: 'Rol no válido.' };
  }
  if (typeof current !== 'string' || !order.includes(current)) return { ok: false, error: 'Elige a quién le toca esta semana.' };
  return { ok: true, items: c.items.map(({ id: _id, ...x }) => x), order: rotateTo(order, current) };
}
