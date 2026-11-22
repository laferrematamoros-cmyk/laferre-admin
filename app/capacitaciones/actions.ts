'use server';

import { adminAccess, fail, OK, type Result } from '@/lib/admin-access';
import { allows, isUuid } from '@/lib/access-rules';
import { supabaseAdmin as admin } from '@/lib/supabase';
import { syncCatalog } from '@/lib/capacitaciones/server';
import { limitError } from '@/lib/capacitaciones/admin-view';
import type { CapRow } from '@/lib/capacitaciones/status';

export interface TrainingConfig {
  id: string; slug: string; title: string; sort_order: number; is_active: boolean;
  deadline_days: number; min_seconds: number; version: number; published_at: string | null;
}
export type LoadResult = { ok: true; trainings: TrainingConfig[]; rows: CapRow[] } | { ok: false; error: string };

/** Todo lo de la página: ajustes de las 13 y la tabla (de las empresas que puede ver). */
export async function loadTrainingAdmin(): Promise<LoadResult> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const db = admin();
  await syncCatalog(db);
  const [t, m] = await Promise.all([
    db.from('trainings').select('id, slug, title, sort_order, is_active, deadline_days, min_seconds, version, published_at').order('sort_order'),
    db.rpc('cap_matrix'),
  ]);
  if (t.error) return { ok: false, error: t.error.message };
  if (m.error) return { ok: false, error: m.error.message };
  const rows = ((m.data ?? []) as CapRow[]).filter(r => allows(a.own, r.company_id));
  return { ok: true, trainings: (t.data ?? []) as TrainingConfig[], rows };
}

export async function saveTraining(id: string, patch: { is_active?: boolean; deadline_days?: number; min_seconds?: number }): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  if (!isUuid(id) || !patch || typeof patch !== 'object') return fail('No encontrada');
  const clean: Record<string, unknown> = {};
  if (typeof patch.is_active === 'boolean') clean.is_active = patch.is_active;
  // Las mismas reglas que la pantalla (lib/capacitaciones/admin-view.ts) y que el check de la base.
  for (const field of ['deadline_days', 'min_seconds'] as const) {
    if (patch[field] === undefined) continue;
    const e = limitError(field, patch[field]);
    if (e) return fail(e);
    clean[field] = patch[field];
  }
  if (!Object.keys(clean).length) return OK;
  const { error } = await admin().from('trainings').update(clean).eq('id', id);
  return error ? fail(error.message) : OK;
}

/** Sube (-1) o baja (+1) una capacitación en el orden: intercambia con la vecina. */
export async function moveTraining(id: string, dir: -1 | 1): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  if (dir !== -1 && dir !== 1) return fail('Dirección no válida');
  const db = admin();
  const { data, error } = await db.from('trainings').select('id, sort_order').order('sort_order').order('title');
  if (error) return fail(error.message);
  const list = (data ?? []) as { id: string; sort_order: number }[];
  const i = list.findIndex(x => x.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return OK;
  // Renumera 1..n con el cambio: así no quedan órdenes repetidos.
  [list[i], list[j]] = [list[j], list[i]];
  for (let k = 0; k < list.length; k++) {
    if (list[k].sort_order === k + 1) continue;
    const r = await db.from('trainings').update({ sort_order: k + 1 }).eq('id', list[k].id);
    if (r.error) return fail(r.error.message);
  }
  return OK;
}

/** "Ya lo capacité": cierra la duda. Sólo empleados de una empresa que este admin puede ver. */
export async function markTrained(trainingId: string, employeeId: string): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  if (!isUuid(trainingId) || !isUuid(employeeId)) return fail('No encontrado');
  const db = admin();
  const { data: e } = await db.from('employees').select('company_id').eq('id', employeeId).maybeSingle();
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
