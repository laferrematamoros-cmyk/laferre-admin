'use server';

import { requireAdmin } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export type ActivityInput = Record<string, unknown>;

// Todas piden administrador: el practicante no administra actividades
// (antes bastaba con tener sesión).

export async function createActivity(input: ActivityInput) {
  await requireAdmin();
  const { error } = await admin().from('activities').insert(input);
  if (error) throw new Error(error.message);
}

export async function updateActivity(id: string, input: ActivityInput) {
  await requireAdmin();
  const { error } = await admin().from('activities').update(input).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Pausar / reanudar. Guarda cada pausa con su inicio y su fin para que Reportes
 *  sólo deje fuera esos días (supabase/005). */
export async function setActivityActive(id: string, isActive: boolean) {
  await requireAdmin();
  const a = admin();
  const { error } = await a.from('activities').update({ is_active: isActive }).eq('id', id);
  if (error) throw new Error(error.message);
  const now = new Date().toISOString();
  const p = isActive
    ? await a.from('activity_pauses').update({ resumed_at: now }).eq('activity_id', id).is('resumed_at', null)
    : await a.from('activity_pauses').insert({ activity_id: id, paused_at: now });
  if (p.error) throw new Error(`Se ${isActive ? 'reanudó' : 'pausó'}, pero no se guardó en el historial: ${p.error.message}`);
}

/** Archivar en lugar de borrar: sale de la lista y de la app de empleados,
 *  pero sus registros y su lugar en los reportes pasados se conservan. */
export async function archiveActivity(id: string) {
  await requireAdmin();
  const { error } = await admin().from('activities')
    .update({ archived_at: new Date().toISOString(), is_active: false }).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Restaurar una archivada. El tiempo que estuvo archivada queda como pausa
 *  para que esos días no cuenten como "sin hacer". */
export async function restoreActivity(id: string) {
  await requireAdmin();
  const a = admin();
  const { data, error } = await a.from('activities').select('archived_at').eq('id', id).single();
  if (error) throw new Error(error.message);
  const now = new Date().toISOString();
  if (data?.archived_at) {
    const p = await a.from('activity_pauses').insert({ activity_id: id, paused_at: data.archived_at, resumed_at: now });
    if (p.error) throw new Error(p.error.message);
  }
  const r = await a.from('activities').update({ archived_at: null, is_active: true }).eq('id', id);
  if (r.error) throw new Error(r.error.message);
}
