'use server';

import { supabaseAdmin as admin } from '@/lib/supabase';
import { adminAccess, fail, OK, type Result as ActionResult } from '@/lib/admin-access';
import { allows, isUuid } from '@/lib/access-rules';
import { pushExpo } from '@/lib/expo-push';
import type { RunResult, RunsResult, SignMark, SignRun } from '@/lib/checklist-types';
import type { SupabaseClient } from '@supabase/supabase-js';

// Con `export type Result = …`, no `export type { Result }` (ver checklist-actions.ts).
export type Result = ActionResult;

// Por firmar (supabase/010): listas terminadas que esperan la firma del administrador.
// Firmar y regresar los hace la base (chk_sign_panel / chk_return, sólo service_role);
// aquí se revisa que sea administrador y que la lista sea de una empresa que puede ver.

const BUCKET = 'listas';

interface RunRow {
  id: string; activity_id: string; company_id: string; employee_id: string; scheduled_date: string; status: SignRun['status'];
  finished_at: string | null; was_late: boolean | null; return_note: string | null;
  signed_at: string | null; signed_by_name: string | null; signed_via: 'pin' | 'panel' | null;
}
const RUN_COLS = 'id, activity_id, company_id, employee_id, scheduled_date, status, finished_at, was_late, return_note, signed_at, signed_by_name, signed_via';

/** Junta actividad, empleado, palomitas y enlaces firmados (1 h) de las fotos. */
async function hydrate(db: SupabaseClient, rows: RunRow[]): Promise<SignRun[]> {
  if (rows.length === 0) return [];
  const [acts, emps, marks] = await Promise.all([
    db.from('activities').select('id, title').in('id', [...new Set(rows.map(r => r.activity_id))]),
    db.from('employees').select('id, name').in('id', [...new Set(rows.map(r => r.employee_id))]),
    db.from('checklist_marks').select('run_id, item_id, area, label, needs_photo, sort, state, reason, photo_path')
      .in('run_id', rows.map(r => r.id)).order('sort'),
  ]);
  const title = new Map((acts.data ?? []).map(a => [a.id as string, a.title as string]));
  const name = new Map((emps.data ?? []).map(e => [e.id as string, e.name as string]));
  const markRows = (marks.data ?? []) as (Omit<SignMark, 'photoUrl' | 'hadPhoto'> & { run_id: string; photo_path: string | null })[];
  const paths = [...new Set(markRows.map(m => m.photo_path).filter((p): p is string => !!p))];
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await db.storage.from(BUCKET).createSignedUrls(paths, 3600);
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
  }
  return rows.map(r => ({
    id: r.id,
    activityTitle: title.get(r.activity_id) ?? 'Lista',
    employeeName: name.get(r.employee_id) ?? 'Sin nombre',
    scheduledDate: r.scheduled_date,
    status: r.status,
    finishedAt: r.finished_at,
    wasLate: r.was_late,
    returnNote: r.return_note,
    signedAt: r.signed_at,
    signedBy: r.signed_by_name,
    signedVia: r.signed_via,
    marks: markRows.filter(m => m.run_id === r.id).map(m => ({
      item_id: m.item_id, area: m.area, label: m.label, needs_photo: m.needs_photo, sort: m.sort, state: m.state, reason: m.reason,
      photoUrl: m.photo_path ? signed.get(m.photo_path) ?? null : null,
      hadPhoto: m.needs_photo && m.state === 'done',
    })),
  }));
}

/** Las que esperan firma en esta empresa, la más vieja primero. */
export async function listToSign(companyId: string): Promise<RunsResult> {
  const a = await adminAccess();
  if (!a.ok) return a;
  if (!allows(a.own, companyId)) return { ok: false, error: 'Empresa no permitida' };
  const db = admin();
  const { data, error } = await db.from('checklist_runs').select(RUN_COLS)
    .eq('company_id', companyId).eq('status', 'awaiting_signature')
    .order('scheduled_date').order('finished_at');
  if (error) return { ok: false, error: error.message };
  return { ok: true, runs: await hydrate(db, (data ?? []) as RunRow[]) };
}

/** Una lista (la que abre el botón del correo), aunque ya esté firmada. */
export async function getRun(runId: string): Promise<RunResult> {
  const a = await adminAccess();
  if (!a.ok) return a;
  if (!isUuid(runId)) return { ok: false, error: 'No encontrada' };
  const db = admin();
  const { data, error } = await db.from('checklist_runs').select(RUN_COLS).eq('id', runId).maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data || !allows(a.own, data.company_id)) return { ok: false, error: 'No encontrada' };
  const [run] = await hydrate(db, [data as RunRow]);
  return { ok: true, run };
}

type Owned =
  | { ok: true; session: { name: string | null }; run: { id: string; company_id: string; employee_id: string; activity_id: string } }
  | { ok: false; error: string };

async function ownedRun(runId: unknown): Promise<Owned> {
  const a = await adminAccess();
  if (!a.ok) return a;
  if (!isUuid(runId)) return { ok: false, error: 'No encontrada' };
  const { data, error } = await admin().from('checklist_runs')
    .select('id, company_id, employee_id, activity_id').eq('id', runId).maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data || !allows(a.own, data.company_id)) return { ok: false, error: 'No encontrada' };
  return { ok: true, session: a.session, run: data as { id: string; company_id: string; employee_id: string; activity_id: string } };
}

export async function signRun(runId: string): Promise<Result> {
  const o = await ownedRun(runId);
  if (!o.ok) return o;
  const { data, error } = await admin().rpc('chk_sign_panel', { p_run: runId, p_name: o.session.name ?? '' });
  if (error) return fail(error.message);
  const r = data as { ok: boolean; error?: string } | null;
  return r?.ok ? OK : fail(r?.error ?? 'No se pudo firmar.');
}

/** Regresa la lista: reabre sólo las tareas elegidas y le avisa al empleado en su teléfono. */
export async function returnRun(runId: string, itemIds: string[], note: string): Promise<Result> {
  const o = await ownedRun(runId);
  if (!o.ok) return o;
  if (!Array.isArray(itemIds) || !itemIds.every(isUuid)) return fail('Tareas no válidas.');
  const db = admin();
  const { data, error } = await db.rpc('chk_return', { p_run: runId, p_items: itemIds, p_note: note });
  if (error) return fail(error.message);
  const r = data as { ok: boolean; error?: string } | null;
  if (!r?.ok) return fail(r?.error ?? 'No se pudo regresar.');

  // Sólo a SU teléfono (si no tiene, no se le avisa a toda la tienda).
  const [devs, emp, act] = await Promise.all([
    db.from('device_tokens').select('*').eq('employee_id', o.run.employee_id),
    db.from('employees').select('push_token').eq('id', o.run.employee_id).maybeSingle(),
    db.from('activities').select('title').eq('id', o.run.activity_id).maybeSingle(),
  ]);
  const tokens = [...new Set([
    ...((devs.data ?? []) as { token: string | null; company_id: string | null }[])
      .filter(d => d.token && d.company_id === o.run.company_id).map(d => d.token as string),
    ...(emp.data?.push_token ? [emp.data.push_token as string] : []),
  ])];
  try {
    await pushExpo(tokens, `Te regresaron ${act.data?.title ?? 'la lista'}`, String(note).trim().slice(0, 180));
  } catch { /* el aviso es extra: la lista ya quedó regresada */ }
  return OK;
}

/** Para el numerito del menú. */
export async function pendingSignCount(companyId: string): Promise<number> {
  const a = await adminAccess();
  if (!a.ok || !allows(a.own, companyId)) return 0;
  const { count } = await admin().from('checklist_runs').select('id', { count: 'exact', head: true })
    .eq('company_id', companyId).eq('status', 'awaiting_signature');
  return count ?? 0;
}
