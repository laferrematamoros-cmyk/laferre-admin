'use server';

import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// Devuelven { ok, error } en lugar de lanzar: en producción Next oculta el mensaje
// de los errores lanzados y la pantalla no podría decir qué pasó.
export type Result = { ok: true } | { ok: false; error: string };

type Access = { ok: true; own: string | null } | { ok: false; error: string };

/**
 * Sólo administradores. Si el usuario está fijo a una empresa, regresa su id
 * (own) y todo se limita a ella, igual que /api/push; si no, own = null (todas).
 */
async function access(): Promise<Access> {
  const session = await getSession();
  if (!session || session.role !== 'admin') return { ok: false, error: 'No autorizado' };
  if (!session.company) return { ok: true, own: null };
  const { data } = await admin().from('companies').select('id').eq('slug', session.company).maybeSingle();
  return data ? { ok: true, own: data.id as string } : { ok: false, error: 'Empresa no permitida' };
}

/** Revisa que la alarma exista y sea de una empresa que este usuario puede tocar. */
async function ownsAlert(id: string, own: string | null): Promise<Result> {
  if (!UUID.test(id)) return { ok: false, error: 'Alarma no válida' };
  const { data, error } = await admin().from('urgent_alerts').select('company_id').eq('id', id).maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data || (own && data.company_id !== own)) return { ok: false, error: 'Alarma no encontrada' };
  return { ok: true };
}

export async function createUrgentAlert(title: string, companyId: string): Promise<Result> {
  const a = await access();
  if (!a.ok) return a;
  const t = typeof title === 'string' ? title.trim().slice(0, 120) : '';
  if (!t) return { ok: false, error: 'Escribe qué hay que hacer' };
  if (!UUID.test(companyId) || (a.own && companyId !== a.own)) return { ok: false, error: 'Empresa no permitida' };
  const { error } = await admin().from('urgent_alerts').insert({ title: t, company_id: companyId, is_active: true });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deactivateUrgentAlert(id: string): Promise<Result> {
  const a = await access();
  if (!a.ok) return a;
  const o = await ownsAlert(id, a.own);
  if (!o.ok) return o;
  const { error } = await admin().from('urgent_alerts').update({ is_active: false }).eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Borra la alarma y sus confirmaciones. */
export async function deleteUrgentAlert(id: string): Promise<Result> {
  const a = await access();
  if (!a.ok) return a;
  const o = await ownsAlert(id, a.own);
  if (!o.ok) return o;
  const db = admin();
  const acks = await db.from('urgent_alert_acks').delete().eq('alert_id', id);
  if (acks.error) return { ok: false, error: acks.error.message };
  const r = await db.from('urgent_alerts').delete().eq('id', id);
  return r.error ? { ok: false, error: r.error.message } : { ok: true };
}
