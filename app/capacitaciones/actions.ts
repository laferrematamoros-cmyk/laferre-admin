'use server';

import { adminAccess, fail, OK, type Access, type Result } from '@/lib/admin-access';
import { allows, isUuid } from '@/lib/access-rules';
import { supabaseAdmin as admin } from '@/lib/supabase';
import { syncCatalog } from '@/lib/capacitaciones/server';
import { canEditShared, limitError, matrixSizeError, SHARED_EDIT_ONLY } from '@/lib/capacitaciones/admin-view';
import type { CapRow } from '@/lib/capacitaciones/status';

export interface TrainingConfig {
  id: string; slug: string; title: string; sort_order: number; is_active: boolean;
  deadline_days: number; min_seconds: number; version: number; published_at: string | null;
}
export type LoadResult =
  | { ok: true; trainings: TrainingConfig[]; rows: CapRow[]; canEdit: boolean }
  | { ok: false; error: string };

/** Cambiar las capacitaciones (son una configuración para las dos empresas): sólo un admin que ve las dos. */
async function editor(): Promise<Access> {
  const a = await adminAccess();
  if (!a.ok) return a;
  return canEditShared(a.own) ? a : { ok: false, error: SHARED_EDIT_ONLY };
}

/** Todo lo de la página: ajustes de todas y la tabla de UNA empresa (la del selector, si este admin puede verla). */
export async function loadTrainingAdmin(companyId: string): Promise<LoadResult> {
  const a = await adminAccess();
  if (!a.ok) return a;
  if (!isUuid(companyId) || !allows(a.own, companyId)) return { ok: false, error: 'Empresa no permitida' };
  const db = admin();
  await syncCatalog(db);
  const [t, m] = await Promise.all([
    db.from('trainings').select('id, slug, title, sort_order, is_active, deadline_days, min_seconds, version, published_at').order('sort_order').order('title'),
    db.rpc('cap_matrix', { p_company: companyId }),
  ]);
  if (t.error) return { ok: false, error: t.error.message };
  if (m.error) return { ok: false, error: m.error.message };
  const all = (m.data ?? []) as CapRow[];
  // Con 1,000 filas la respuesta pudo venir cortada (tope de la base): mejor decirlo que enseñar una tabla incompleta.
  const tooBig = matrixSizeError(all.length);
  if (tooBig) return { ok: false, error: tooBig };
  return {
    ok: true,
    trainings: (t.data ?? []) as TrainingConfig[],
    rows: all.filter(r => r.company_id === companyId),
    canEdit: canEditShared(a.own),
  };
}

export async function saveTraining(id: string, patch: { is_active?: boolean; deadline_days?: number; min_seconds?: number }): Promise<Result> {
  const a = await editor();
  if (!a.ok) return a;
  if (!isUuid(id) || !patch || typeof patch !== 'object') return fail('No encontrada');
  const clean: Record<string, unknown> = {};
  if (patch.is_active !== undefined) {
    if (typeof patch.is_active !== 'boolean') return fail('Valor no válido para activa / en pausa.');
    clean.is_active = patch.is_active;
  }
  // Las mismas reglas que la pantalla (lib/capacitaciones/admin-view.ts) y que el check de la base.
  for (const field of ['deadline_days', 'min_seconds'] as const) {
    if (patch[field] === undefined) continue;
    const e = limitError(field, patch[field]);
    if (e) return fail(e);
    clean[field] = patch[field];
  }
  if (!Object.keys(clean).length) return OK;
  const { data, error } = await admin().from('trainings').update(clean).eq('id', id).select('id');
  if (error) return fail(error.message);
  return data?.length ? OK : fail('No encontrada');
}

/** Sube (-1) o baja (+1) una capacitación en el orden: intercambia con la vecina. */
export async function moveTraining(id: string, dir: -1 | 1): Promise<Result> {
  const a = await editor();
  if (!a.ok) return a;
  if (dir !== -1 && dir !== 1) return fail('Dirección no válida');
  if (!isUuid(id)) return fail('No encontrada');
  const db = admin();
  const { data, error } = await db.from('trainings').select('id, sort_order').order('sort_order').order('title');
  if (error) return fail(error.message);
  const list = (data ?? []) as { id: string; sort_order: number }[];
  const i = list.findIndex(x => x.id === id), j = i + dir;
  if (i < 0) return fail('No encontrada');
  if (j < 0 || j >= list.length) return OK;
  // Renumera 1..n con el cambio: así no quedan órdenes repetidos.
  [list[i], list[j]] = [list[j], list[i]];
  for (let k = 0; k < list.length; k++) {
    if (list[k].sort_order === k + 1) continue;
    const r = await db.from('trainings').update({ sort_order: k + 1 }).eq('id', list[k].id).select('id');
    if (r.error) return fail(r.error.message);
    if (!r.data?.length) return fail('No encontrada');
  }
  return OK;
}

/** "Ya lo capacité": cierra la duda. Sólo empleados de una empresa que este admin puede ver. */
export async function markTrained(trainingId: string, employeeId: string): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  if (!isUuid(trainingId) || !isUuid(employeeId)) return fail('No encontrado');
  const db = admin();
  const { data: e, error: eErr } = await db.from('employees').select('company_id').eq('id', employeeId).maybeSingle();
  if (eErr) return fail(eErr.message);
  if (!e || !allows(a.own, e.company_id)) return fail('No encontrado');
  const { data, error } = await db.rpc('cap_mark_trained', { p_training: trainingId, p_employee: employeeId, p_by: a.session.name ?? 'Admin' });
  if (error) return fail(error.message);
  const r = data as { ok: boolean; error?: string };
  return r.ok ? OK : fail(r.error ?? 'No se pudo.');
}

/** Numerito del menú: dudas abiertas de gente de esa empresa. */
export async function pendingDoubtCount(companyId: string): Promise<number> {
  const a = await adminAccess();
  if (!a.ok || !allows(a.own, companyId)) return 0;
  const { data } = await admin().rpc('cap_doubt_count', { p_company: companyId });
  return typeof data === 'number' ? data : 0;
}
