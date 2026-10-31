'use server';

import { supabaseAdmin as admin } from '@/lib/supabase';
import { adminAccess, ownsRow, fail, OK, type Result } from '@/lib/admin-access';
import { allows, pick } from '@/lib/access-rules';
import { safeHttps } from '@/lib/safe-url';

export type { Result };
export type ConoceInput = Record<string, unknown>;

// Antes bastaba con tener sesión (el practicante podía escribir). Ahora sólo
// administradores, sólo su empresa, y sólo estas columnas.
const FIELDS = ['type', 'title', 'body', 'image_url'] as const;

/** Tipo válido, título obligatorio e imagen sólo https (la app de empleados la abre). */
function check(row: Record<string, unknown>): Result {
  if ('type' in row && row.type !== 'instruccion' && row.type !== 'ayuda_visual') return fail('Tipo no válido');
  if ('title' in row && !(typeof row.title === 'string' && row.title.trim())) return fail('Escribe el título');
  if ('image_url' in row && row.image_url !== null && !safeHttps(typeof row.image_url === 'string' ? row.image_url : null)) {
    return fail('La imagen no se subió bien. Vuelve a subirla.');
  }
  return OK;
}

export async function createConoceItem(input: ConoceInput): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const companyId = input?.company_id ?? null;
  if (!allows(a.own, companyId) || companyId === null) return fail('Escoge una empresa en el menú');
  const row = pick(input, FIELDS);
  const v = check(row);
  if (!v.ok) return v;
  const { error } = await admin().from('conoce_items').insert({ ...row, company_id: companyId });
  return error ? fail(error.message) : OK;
}

export async function updateConoceItem(id: string, input: ConoceInput): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const o = await ownsRow('conoce_items', id, a.own);
  if (!o.ok) return o;
  const row = pick(input, FIELDS);
  const v = check(row);
  if (!v.ok) return v;
  const { error } = await admin().from('conoce_items').update(row).eq('id', id);
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
