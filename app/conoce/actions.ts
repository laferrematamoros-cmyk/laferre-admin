'use server';

import { requireSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export type ConoceInput = Record<string, unknown>;

export async function createConoceItem(input: ConoceInput) {
  await requireSession();
  const { error } = await admin().from('conoce_items').insert(input);
  if (error) throw new Error(error.message);
}

export async function updateConoceItem(id: string, input: ConoceInput) {
  await requireSession();
  const { error } = await admin().from('conoce_items').update(input).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setConoceActive(id: string, isActive: boolean) {
  await requireSession();
  const { error } = await admin().from('conoce_items').update({ is_active: isActive }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteConoceItem(id: string) {
  await requireSession();
  const { error } = await admin().from('conoce_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
