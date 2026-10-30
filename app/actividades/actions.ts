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

// Devuelven { ok, error } en lugar de lanzar: en producción Next oculta el mensaje
// de los errores lanzados y la pantalla no podría decir qué pasó.
export type Result = { ok: true } | { ok: false; error: string };
const fail = (m: string): Result => ({ ok: false, error: m });
const OK: Result = { ok: true };

// Todas piden administrador: el practicante no administra actividades
// (antes bastaba con tener sesión).

export async function createActivity(input: ActivityInput): Promise<Result> {
  await requireAdmin();
  const { error } = await admin().from('activities').insert(input);
  if (error) return fail(error.message);
  return OK;
}

export async function updateActivity(id: string, input: ActivityInput): Promise<Result> {
  await requireAdmin();
  const { error } = await admin().from('activities').update(input).eq('id', id);
  if (error) return fail(error.message);
  return OK;
}

/** Pausar / reanudar. Guarda cada pausa con su inicio y su fin para que Reportes
 *  sólo deje fuera esos días (supabase/005). */
export async function setActivityActive(id: string, isActive: boolean): Promise<Result> {
  await requireAdmin();
  const a = admin();
  const { error } = await a.from('activities').update({ is_active: isActive }).eq('id', id);
  if (error) return fail(error.message);
  const now = new Date().toISOString();
  const p = isActive
    ? await a.from('activity_pauses').update({ resumed_at: now }).eq('activity_id', id).is('resumed_at', null)
    : await a.from('activity_pauses').insert({ activity_id: id, paused_at: now });
  if (p.error) return fail(`Se ${isActive ? 'reanudó' : 'pausó'}, pero no se guardó en el historial: ${p.error.message}`);
  return OK;
}

/** Archivar en lugar de borrar: sale de la lista y de la app de empleados,
 *  pero sus registros y su lugar en los reportes pasados se conservan. */
export async function archiveActivity(id: string): Promise<Result> {
  await requireAdmin();
  const { error } = await admin().from('activities')
    .update({ archived_at: new Date().toISOString(), is_active: false }).eq('id', id);
  if (error) return fail(error.message);
  return OK;
}

/** Restaurar una archivada. El tiempo que estuvo archivada queda como pausa
 *  para que esos días no cuenten como "sin hacer". */
export async function restoreActivity(id: string): Promise<Result> {
  await requireAdmin();
  const a = admin();
  const { data, error } = await a.from('activities').select('archived_at').eq('id', id).single();
  if (error) return fail(error.message);
  const now = new Date().toISOString();
  if (data?.archived_at) {
    const p = await a.from('activity_pauses').insert({ activity_id: id, paused_at: data.archived_at, resumed_at: now });
    if (p.error) return fail(p.error.message);
  }
  const r = await a.from('activities').update({ archived_at: null, is_active: true }).eq('id', id);
  if (r.error) return fail(r.error.message);
  return OK;
}
