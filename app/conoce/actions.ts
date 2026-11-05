'use server';

import { randomUUID } from 'node:crypto';
import { supabaseAdmin as admin } from '@/lib/supabase';
import { adminAccess, ownsRow, fail, OK, type Result as ActionResult } from '@/lib/admin-access';
import { allows, isUuid, pick } from '@/lib/access-rules';
import { CONOCE_BUCKET, conoceExt, conocePathOf } from '@/lib/conoce-image';

// Con `export type Result = …`, no `export type { Result }`: en un archivo 'use server'
// la compilación de producción lo vuelve un export real y el archivo truena al cargar.
export type Result = ActionResult;
export type ConoceInput = Record<string, unknown>;

// Antes bastaba con tener sesión (el practicante podía escribir). Ahora sólo
// administradores, sólo su empresa, y sólo estas columnas.
const FIELDS = ['type', 'title', 'body', 'image_url'] as const;
const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/**
 * Tipo válido, título obligatorio e imagen: o ninguna, o una de nuestro almacén
 * "conoce" de esa empresa, o (al editar) la misma que ya tenía (las viejas de ImgBB).
 */
function check(row: Record<string, unknown>, companyId: string, currentImage: string | null = null): Result {
  if ('type' in row && row.type !== 'instruccion' && row.type !== 'ayuda_visual') return fail('Tipo no válido');
  if ('title' in row && !(typeof row.title === 'string' && row.title.trim())) return fail('Escribe el título');
  if ('image_url' in row && row.image_url !== null && row.image_url !== currentImage) {
    if (typeof row.image_url !== 'string' || !conocePathOf(row.image_url, BASE, companyId)) {
      return fail('La imagen no se subió bien. Vuelve a subirla.');
    }
  }
  return OK;
}

/** Borra del almacén una imagen que ya no usa nadie (sólo si es nuestra; las de ImgBB no se tocan). */
async function dropImage(url: string | null) {
  const path = conocePathOf(url, BASE);
  if (path) await admin().storage.from(CONOCE_BUCKET).remove([path]);
}

/**
 * Permiso de un solo uso para subir una imagen al almacén "conoce" de la
 * empresa. La pantalla sube directo a Supabase con él; nadie más puede escribir
 * ahí (el almacén no tiene permisos para la llave pública).
 */
export async function conoceUploadTicket(companyId: string, mime: string):
  Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }> {
  const a = await adminAccess();
  if (!a.ok) return a;
  if (!isUuid(companyId) || !allows(a.own, companyId)) return { ok: false, error: 'Empresa no permitida' };
  const ext = conoceExt(typeof mime === 'string' ? mime : '');
  if (!ext) return { ok: false, error: 'Usa una imagen JPG, PNG o WEBP.' };
  const path = `${companyId.toLowerCase()}/${randomUUID()}.${ext}`;
  const { data, error } = await admin().storage.from(CONOCE_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: error?.message ?? 'No se pudo preparar la subida.' };
  return { ok: true, path: data.path, token: data.token };
}

export async function createConoceItem(input: ConoceInput): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const companyId = input?.company_id ?? null;
  if (!allows(a.own, companyId) || companyId === null) return fail('Escoge una empresa en el menú');
  const row = pick(input, FIELDS);
  const v = check(row, companyId as string);
  if (!v.ok) return v;
  const { error } = await admin().from('conoce_items').insert({ ...row, company_id: companyId });
  return error ? fail(error.message) : OK;
}

export async function updateConoceItem(id: string, input: ConoceInput): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const o = await ownsRow('conoce_items', id, a.own);
  if (!o.ok) return o;
  const { data: cur, error: ce } = await admin().from('conoce_items').select('company_id, image_url').eq('id', id).single();
  if (ce || !cur) return fail(ce?.message ?? 'No encontrado');
  const row = pick(input, FIELDS);
  const v = check(row, cur.company_id, cur.image_url);
  if (!v.ok) return v;
  const { error } = await admin().from('conoce_items').update(row).eq('id', id);
  if (error) return fail(error.message);
  if ('image_url' in row && row.image_url !== cur.image_url) await dropImage(cur.image_url);
  return OK;
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
  const { data: cur } = await admin().from('conoce_items').select('image_url').eq('id', id).single();
  const { error } = await admin().from('conoce_items').delete().eq('id', id);
  if (error) return fail(error.message);
  await dropImage(cur?.image_url ?? null);
  return OK;
}
