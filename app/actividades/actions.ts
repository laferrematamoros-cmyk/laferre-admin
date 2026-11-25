'use server';

import { supabaseAdmin as admin } from '@/lib/supabase';
import { adminAccess, ownsRow, fail, OK, type Result as ActionResult } from '@/lib/admin-access';
import { allows, pick } from '@/lib/access-rules';
import { checkList, checkNewList } from '@/lib/checklist-config';
import { insertListActivity, syncItems } from '@/lib/checklist-create';
import { mondayOf } from '@/lib/duty';
import { shopClock } from '@/lib/my-day';

// Con `export type Result = …`, no `export type { Result }`: en un archivo 'use server'
// la compilación de producción lo vuelve un export real y el archivo truena al cargar.
export type Result = ActionResult;
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

/** Nueva actividad con lista con firma, de un jalón: actividad + tareas + rol, ya prendida. */
export async function createChecklistActivity(input: ActivityInput, items: unknown, order: unknown, current: unknown): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const row = pick(input, ON_CREATE);
  if (!allows(a.own, row.company_id) || row.company_id === null) return fail('Empresa no permitida');
  const list = checkNewList(items, order, current);
  if (!list.ok) return fail(list.error);
  const db = admin();
  const { data, error } = await db.from('employees').select('id')
    .in('id', list.order).eq('company_id', row.company_id as string).eq('is_active', true);
  if (error) return fail(error.message);
  if ((data ?? []).length !== list.order.length) return fail('Alguien del rol no es de esta tienda o está dado de baja.');
  const r = await insertListActivity(db, { ...row, assigned_employee_ids: [] }, list.items, list.order, shopClock(new Date()).dateStr);
  return r.ok ? OK : fail(r.error);
}

/** Editar actividad en una sola pantalla (supabase/010 y 013). Con `list` la deja como lista con
 *  firma: guarda las tareas, el rol (sólo si cambió: nueva versión desde hoy) y al final la actividad.
 *  Sin `list` la deja Normal: apaga la lista y conserva sus tareas y su rol por si se vuelve a prender. */
export async function updateActivityWithList(
  id: string, input: ActivityInput,
  list: { items: unknown; order: unknown; current: unknown; rotChanged: boolean } | null,
): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const o = await ownsRow('activities', id, a.own);
  if (!o.ok) return o;
  const db = admin();
  if (list) {
    const chk = checkList(list.items, list.order, list.current);
    if (!chk.ok) return fail(chk.error);
    const act = await db.from('activities').select('company_id').eq('id', id).single();
    if (act.error) return fail(act.error.message);
    if (list.rotChanged === true) {
      const { data, error } = await db.from('employees').select('id')
        .in('id', chk.order).eq('company_id', act.data.company_id).eq('is_active', true);
      if (error) return fail(error.message);
      if ((data ?? []).length !== chk.order.length) return fail('Alguien del rol no es de esta tienda o está dado de baja.');
    } else {
      const rots = await db.from('activity_rotations').select('id', { count: 'exact', head: true }).eq('activity_id', id);
      if (rots.error) return fail(rots.error.message);
      if (!rots.count) return fail('Falta el rol: agrega a quién le toca.');
    }
    const s = await syncItems(db, id, chk.items);
    if (!s.ok) return fail(s.error);
    if (list.rotChanged === true) {
      const t = shopClock(new Date()).dateStr;
      const r = await db.from('activity_rotations').insert({ activity_id: id, employee_ids: chk.order, anchor_week: mondayOf(t), valid_from: t });
      if (r.error) return fail(`Se guardaron las tareas, pero no el rol: ${r.error.message}`);
    }
  }
  const { error } = await db.from('activities')
    .update({ ...pick(input, EDITABLE), ...(list ? { assigned_employee_ids: [] } : {}), checklist_enabled: !!list }).eq('id', id);
  if (error) return fail(list ? `Se guardaron las tareas y el rol, pero no la actividad: ${error.message}` : error.message);
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
