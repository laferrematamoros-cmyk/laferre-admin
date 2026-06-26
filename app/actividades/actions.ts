'use server';

import { requireSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export type ActivityInput = Record<string, unknown>;

export async function createActivity(input: ActivityInput) {
  await requireSession();
  const { error } = await admin().from('activities').insert(input);
  if (error) throw new Error(error.message);
}

export async function updateActivity(id: string, input: ActivityInput) {
  await requireSession();
  const { error } = await admin().from('activities').update(input).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setActivityActive(id: string, isActive: boolean) {
  await requireSession();
  const { error } = await admin().from('activities').update({ is_active: isActive }).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Borra la actividad y sus completions (réplica del borrado en cascada actual). */
export async function deleteActivity(id: string) {
  await requireSession();
  const a = admin();
  const c = await a.from('completions').delete().eq('activity_id', id);
  if (c.error) throw new Error(c.error.message);
  const r = await a.from('activities').delete().eq('id', id);
  if (r.error) throw new Error(r.error.message);
}
