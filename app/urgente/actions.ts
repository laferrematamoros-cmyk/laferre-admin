'use server';

import { supabaseAdmin as admin } from '@/lib/supabase';
import { adminAccess, ownsRow, fail, OK, type Result } from '@/lib/admin-access';
import { allows } from '@/lib/access-rules';

export type { Result };

// Sólo administradores, y sólo alarmas de la empresa de la sesión (igual que /api/push).

export async function createUrgentAlert(title: string, companyId: string): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const t = typeof title === 'string' ? title.trim().slice(0, 120) : '';
  if (!t) return fail('Escribe qué hay que hacer');
  if (!allows(a.own, companyId) || companyId === null) return fail('Empresa no permitida');
  const { error } = await admin().from('urgent_alerts').insert({ title: t, company_id: companyId, is_active: true });
  return error ? fail(error.message) : OK;
}

export async function deactivateUrgentAlert(id: string): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const o = await ownsRow('urgent_alerts', id, a.own);
  if (!o.ok) return o;
  const { error } = await admin().from('urgent_alerts').update({ is_active: false }).eq('id', id);
  return error ? fail(error.message) : OK;
}

/** Borra la alarma y sus confirmaciones. */
export async function deleteUrgentAlert(id: string): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const o = await ownsRow('urgent_alerts', id, a.own);
  if (!o.ok) return o;
  const db = admin();
  const acks = await db.from('urgent_alert_acks').delete().eq('alert_id', id);
  if (acks.error) return fail(acks.error.message);
  const r = await db.from('urgent_alerts').delete().eq('id', id);
  return r.error ? fail(r.error.message) : OK;
}
