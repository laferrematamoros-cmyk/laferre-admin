'use server';

import { supabaseAdmin as admin } from '@/lib/supabase';
import { adminAccess, ownsRow, fail, OK, type Result } from '@/lib/admin-access';
import { allows, pick } from '@/lib/access-rules';

export type { Result };
export type ConoceInput = Record<string, unknown>;

// Antes bastaba con tener sesión (el practicante podía escribir). Ahora sólo
// administradores, sólo su empresa, y sólo estas columnas.
const FIELDS = ['type', 'title', 'body', 'image_url'] as const;

export async function createConoceItem(input: ConoceInput): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const companyId = input?.company_id ?? null;
  if (!allows(a.own, companyId) || companyId === null) return fail('Escoge una empresa en el menú');
  const { error } = await admin().from('conoce_items').insert({ ...pick(input, FIELDS), company_id: companyId });
  return error ? fail(error.message) : OK;
}

export async function updateConoceItem(id: string, input: ConoceInput): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const o = await ownsRow('conoce_items', id, a.own);
  if (!o.ok) return o;
  const { error } = await admin().from('conoce_items').update(pick(input, FIELDS)).eq('id', id);
  return error ? fail(error.message) : OK;
}

export async function setConoceActive(id: string, isActive: boolean): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const o = await ownsRow('conoce_items', id, a.own);
  if (!o.ok) return o;
  const { error } = await admin().from('conoce_items').update({ is_active: isActive === true }).eq('id', id);
  return error ? fail(error.message) : OK;
}

export async function deleteConoceItem(id: string): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const o = await ownsRow('conoce_items', id, a.own);
  if (!o.ok) return o;
  const { error } = await admin().from('conoce_items').delete().eq('id', id);
  return error ? fail(error.message) : OK;
}
