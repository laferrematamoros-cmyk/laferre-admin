// Crear de un jalón una actividad con lista con firma (supabase/010): la actividad con la lista
// apagada, sus tareas, el rol y al final prender la lista. Si falla un paso, se borra la actividad
// (las tareas y el rol se van con ella por on delete cascade): nada queda a medias en los teléfonos.
// Recibe la base para poder probarlo sin tocar producción (la usa app/actividades/actions.ts).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ItemInput } from './checklist-config';
import { mondayOf } from './duty';

export type CreateResult = { ok: true; id: string } | { ok: false; error: string };

export async function insertListActivity(
  db: SupabaseClient, row: Record<string, unknown>, items: ItemInput[], order: string[], today: string,
): Promise<CreateResult> {
  const made = await db.from('activities').insert({ ...row, checklist_enabled: false }).select('id').single();
  if (made.error || !made.data) return { ok: false, error: made.error?.message ?? 'No se pudo crear la actividad.' };
  const id = made.data.id as string;

  const undo = async (error: string): Promise<CreateResult> => {
    const del = await db.from('activities').delete().eq('id', id);
    return { ok: false, error: del.error ? `${error} (quedó creada sin lista: archívala en Actividades)` : error };
  };

  const tasks = await db.from('checklist_items').insert(items.map((it, i) => ({ activity_id: id, ...itemRow(it, i) })));
  if (tasks.error) return undo(tasks.error.message);

  const rot = await db.from('activity_rotations').insert({
    activity_id: id, employee_ids: order, anchor_week: mondayOf(today), valid_from: today,
  });
  if (rot.error) return undo(rot.error.message);

  const on = await db.from('activities').update({ checklist_enabled: true }).eq('id', id);
  if (on.error) return undo(on.error.message);
  return { ok: true, id };
}

/** Las columnas de una tarea en checklist_items, con su lugar en la lista. */
function itemRow(it: ItemInput, i: number) {
  return { area: it.area, label: it.label, days: it.days, needs_photo: it.needs_photo, photo_count: it.photo_count, sort: (i + 1) * 10 };
}

export type SyncResult = { ok: true } | { ok: false; error: string };

/** Guarda la lista completa de una actividad: actualiza las que traen id, agrega las nuevas y
 *  archiva las que ya no vienen (archivar, no borrar: la bitácora vieja las sigue enseñando). */
export async function syncItems(db: SupabaseClient, activityId: string, items: ItemInput[]): Promise<SyncResult> {
  const { data: existing, error } = await db.from('checklist_items').select('id').eq('activity_id', activityId).is('archived_at', null);
  if (error) return { ok: false, error: error.message };
  const have = new Set((existing ?? []).map(r => r.id as string));
  if (items.some(i => i.id && !have.has(i.id))) return { ok: false, error: 'Una tarea ya no existe. Recarga la página.' };

  for (const [i, it] of items.entries()) {
    if (!it.id) continue;
    const r = await db.from('checklist_items').update(itemRow(it, i)).eq('id', it.id);
    if (r.error) return { ok: false, error: r.error.message };
  }
  const fresh = items.map((it, i) => ({ it, i })).filter(x => !x.it.id).map(x => ({ activity_id: activityId, ...itemRow(x.it, x.i) }));
  if (fresh.length) {
    const r = await db.from('checklist_items').insert(fresh);
    if (r.error) return { ok: false, error: r.error.message };
  }
  const keep = new Set(items.filter(i => i.id).map(i => i.id!));
  const gone = [...have].filter(id => !keep.has(id));
  if (gone.length) {
    const r = await db.from('checklist_items').update({ archived_at: new Date().toISOString() }).in('id', gone);
    if (r.error) return { ok: false, error: r.error.message };
  }
  return { ok: true };
}
