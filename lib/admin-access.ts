import 'server-only';
import { getSession, type SessionInfo } from './auth';
import { supabaseAdmin } from './supabase';
import { allows, isUuid } from './access-rules';

// Devuelven { ok, error } en lugar de lanzar: en producción Next oculta el mensaje
// de los errores lanzados y la pantalla no podría decir qué pasó.
export type Result = { ok: true } | { ok: false; error: string };
export const OK: Result = { ok: true };
export const fail = (error: string): Result => ({ ok: false, error });

export type Access =
  | { ok: true; own: string | null; session: SessionInfo }
  | { ok: false; error: string };

/**
 * Sólo administradores. Si el usuario está fijo a una empresa, `own` es su id y
 * todo lo que toque debe ser de ella; si no, own = null (las dos empresas).
 * La empresa sale de la sesión, nunca de lo que mande la pantalla.
 */
export async function adminAccess(): Promise<Access> {
  const session = await getSession();
  if (!session || session.role !== 'admin') return { ok: false, error: 'No autorizado' };
  if (!session.company) return { ok: true, own: null, session };
  const { data } = await supabaseAdmin().from('companies').select('id').eq('slug', session.company).maybeSingle();
  return data ? { ok: true, own: data.id as string, session } : { ok: false, error: 'Empresa no permitida' };
}

/** La fila existe y es de una empresa que este usuario puede tocar. */
export async function ownsRow(table: string, id: unknown, own: string | null): Promise<Result> {
  if (!isUuid(id)) return fail('No encontrado');
  const { data, error } = await supabaseAdmin().from(table).select('company_id').eq('id', id).maybeSingle();
  if (error) return fail(error.message);
  if (!data || !allows(own, data.company_id)) return fail('No encontrado');
  return OK;
}
