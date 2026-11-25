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

  const tasks = await db.from('checklist_items').insert(items.map((it, i) => ({
    activity_id: id, area: it.area, label: it.label, days: it.days, needs_photo: it.needs_photo, sort: (i + 1) * 10,
  })));
  if (tasks.error) return undo(tasks.error.message);

  const rot = await db.from('activity_rotations').insert({
    activity_id: id, employee_ids: order, anchor_week: mondayOf(today), valid_from: today,
  });
  if (rot.error) return undo(rot.error.message);

  const on = await db.from('activities').update({ checklist_enabled: true }).eq('id', id);
  if (on.error) return undo(on.error.message);
  return { ok: true, id };
}
