'use server';

import { requireAdmin } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// Devuelven { ok, error } en lugar de lanzar: en producción Next oculta el mensaje
// de los errores lanzados y la pantalla no podría decir qué pasó.
export type Result = { ok: true } | { ok: false; error: string };

export async function createUrgentAlert(title: string, companyId: string): Promise<Result> {
  await requireAdmin();
  const { error } = await admin().from('urgent_alerts').insert({ title, company_id: companyId, is_active: true });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deactivateUrgentAlert(id: string): Promise<Result> {
  await requireAdmin();
  const { error } = await admin().from('urgent_alerts').update({ is_active: false }).eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Borra la alarma y sus confirmaciones. */
export async function deleteUrgentAlert(id: string): Promise<Result> {
  await requireAdmin();
  const a = admin();
  const acks = await a.from('urgent_alert_acks').delete().eq('alert_id', id);
  if (acks.error) return { ok: false, error: acks.error.message };
  const r = await a.from('urgent_alerts').delete().eq('id', id);
  return r.error ? { ok: false, error: r.error.message } : { ok: true };
}
