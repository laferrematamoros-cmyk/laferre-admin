'use server';

import { requireSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function createUrgentAlert(title: string, companyId: string | null) {
  await requireSession();
  const { error } = await admin().from('urgent_alerts').insert({
    title, company_id: companyId, is_active: true,
  });
  if (error) throw new Error(error.message);
}

export async function deactivateUrgentAlert(id: string) {
  await requireSession();
  const { error } = await admin().from('urgent_alerts').update({ is_active: false }).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Borra la alerta y sus acks (réplica del borrado actual). */
export async function deleteUrgentAlert(id: string) {
  await requireSession();
  const a = admin();
  const acks = await a.from('urgent_alert_acks').delete().eq('alert_id', id);
  if (acks.error) throw new Error(acks.error.message);
  const r = await a.from('urgent_alerts').delete().eq('id', id);
  if (r.error) throw new Error(r.error.message);
}
