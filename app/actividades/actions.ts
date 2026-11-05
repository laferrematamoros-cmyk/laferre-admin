'use server';

import { supabaseAdmin as admin } from '@/lib/supabase';
import { adminAccess, ownsRow, fail, OK, type Result } from '@/lib/admin-access';
import { allows, pick } from '@/lib/access-rules';

export type { Result };
export type ActivityInput = Record<string, unknown>;

// Columnas que el formulario maneja (lib/activity-form toRow) + el encendido.
// company_id sólo al crear y siempre de una empresa permitida; al editar no se mueve.
const EDITABLE = [
  'title', 'description', 'start_time', 'limit_time', 'recurrence', 'days_of_week',
  'week_of_month', 'assigned_employee_ids', 'reminder_minutes', 'evidence_photo', 'is_active', 'is_optional',
] as const;
const ON_CREATE = [...EDITABLE, 'is_urgent', 'evidence_name', 'evidence_note', 'evidence_signature', 'company_id'] as const;

// Todas piden administrador (el practicante no administra actividades) y sólo
// tocan actividades de la empresa de la sesión.

export async function createActivity(input: ActivityInput): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const row = pick(input, ON_CREATE);
  if (!allows(a.own, row.company_id) || row.company_id === null) return fail('Empresa no permitida');
  const { error } = await admin().from('activities').insert(row);
  if (error) return fail(error.message);
  return OK;
}

export async function updateActivity(id: string, input: ActivityInput): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const o = await ownsRow('activities', id, a.own);
  if (!o.ok) return o;
  const { error } = await admin().from('activities').update(pick(input, EDITABLE)).eq('id', id);
  if (error) return fail(error.message);
  return OK;
}

/** Pausar / reanudar. Guarda cada pausa con su inicio y su fin para que Reportes
 *  sólo deje fuera esos días (supabase/005). */
export async function setActivityActive(id: string, isActive: boolean): Promise<Result> {
  const acc = await adminAccess();
  if (!acc.ok) return acc;
  const o = await ownsRow('activities', id, acc.own);
  if (!o.ok) return o;
  const a = admin();
  const { error } = await a.from('activities').update({ is_active: isActive === true }).eq('id', id);
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
  const acc = await adminAccess();
  if (!acc.ok) return acc;
  const o = await ownsRow('activities', id, acc.own);
  if (!o.ok) return o;
  const { error } = await admin().from('activities')
    .update({ archived_at: new Date().toISOString(), is_active: false }).eq('id', id);
  if (error) return fail(error.message);
  return OK;
}

/** Restaurar una archivada. El tiempo que estuvo archivada queda como pausa
 *  para que esos días no cuenten como "sin hacer". */
export async function restoreActivity(id: string): Promise<Result> {
  const acc = await adminAccess();
  if (!acc.ok) return acc;
  const o = await ownsRow('activities', id, acc.own);
  if (!o.ok) return o;
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
