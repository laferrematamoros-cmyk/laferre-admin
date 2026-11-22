'use server';

import { getSession } from '@/lib/auth';
import { supabaseAdmin as admin } from '@/lib/supabase';
import { catalogBySlug } from '@/lib/capacitaciones/catalog';
import type { TrainingStatus } from '@/lib/capacitaciones/status';
import { firstNameOf, shortDay } from '@/lib/capacitaciones/format';

export interface MyTraining { id: string; slug: string; title: string; sort_order: number; version: number; status: TrainingStatus; deadline: string; answered_at: string | null }
export type MyList = { ok: true; items: MyTraining[] } | { ok: false; error: string };
export type MyOpen =
  | { ok: true; token: string; title: string; minSeconds: number; firstName: string; previous: { status: TrainingStatus; answeredAt: string; day: string } | null }
  | { ok: false; error: string };

const NO_EMP = 'Tu usuario no está vinculado a un empleado. Pídeselo a un administrador.';

export async function myTrainings(): Promise<MyList> {
  const s = await getSession();
  if (!s) return { ok: false, error: 'Tu sesión terminó. Vuelve a entrar.' };
  if (!s.employeeId) return { ok: false, error: NO_EMP };
  const { data, error } = await admin().rpc('cap_list', { p_employee: s.employeeId });
  if (error) return { ok: false, error: error.message };
  return { ok: true, items: (data ?? []) as MyTraining[] };
}

/** Abre una capacitación para el empleado de la sesión (crea su sesión, como el teléfono). */
export async function openMyTraining(slug: string): Promise<MyOpen> {
  const s = await getSession();
  if (!s) return { ok: false, error: 'Tu sesión terminó. Vuelve a entrar.' };
  if (!s.employeeId) return { ok: false, error: NO_EMP };
  if (!catalogBySlug(slug)) return { ok: false, error: 'No existe esa capacitación.' };
  const db = admin();
  const { data: t, error: te } = await db.from('trainings').select('id, title, min_seconds, version').eq('slug', slug).maybeSingle();
  if (te) return { ok: false, error: te.message };
  if (!t) return { ok: false, error: 'No existe esa capacitación.' };
  const { data, error } = await db.rpc('cap_open_panel', { p_training: t.id, p_employee: s.employeeId });
  if (error) return { ok: false, error: error.message };
  const r = data as { ok: boolean; error?: string; session?: string };
  if (!r.ok || !r.session) return { ok: false, error: r.error ?? 'No se pudo abrir.' };
  const [{ data: e }, { data: p }] = await Promise.all([
    db.from('employees').select('name').eq('id', s.employeeId).maybeSingle(),
    db.from('training_progress').select('status, answered_at').eq('training_id', t.id).eq('employee_id', s.employeeId).eq('version', t.version).maybeSingle(),
  ]);
  return {
    ok: true, token: r.session, title: t.title as string, minSeconds: t.min_seconds as number,
    firstName: firstNameOf((e?.name as string | undefined) ?? s.name),
    previous: p ? { status: p.status as TrainingStatus, answeredAt: p.answered_at as string, day: shortDay(p.answered_at as string) } : null,
  };
}

/** Numerito del menú de la practicante: por ver + atrasadas. */
export async function myPendingCount(): Promise<number> {
  const r = await myTrainings();
  return r.ok ? r.items.filter(i => i.status === 'pending' || i.status === 'overdue').length : 0;
}
