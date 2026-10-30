import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { signSession, verifySession } from './auth-session';
import { supabaseAdmin } from './supabase';

export const SESSION_COOKIE = 'lf_admin_session';
const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 días

export type Role = 'admin' | 'practicante';

export interface SessionInfo {
  role: Role;
  name: string | null;
  /** slug de la empresa a la que queda fijo el usuario; null = ve todas. */
  company: string | null;
  /** empleado vinculado (para registrar actividades realizadas); null = ninguno. */
  employeeId: string | null;
  /** id en admin_users; null = contraseña maestra (no vive en la tabla). */
  userId: string | null;
}

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET no está configurado');
  return s;
}

/** Crea la cookie de sesión (llamar desde un server action / route handler). */
export async function createSessionCookie(info: SessionInfo) {
  const token = await signSession(
    { role: info.role, name: info.name, company: info.company, eid: info.employeeId, uid: info.userId },
    secret(),
    TTL_SECONDS,
  );
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_SECONDS,
  });
}

/** Borra la cookie de sesión. */
export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

interface Resolved { session: SessionInfo | null; hadToken: boolean; stale: boolean }

interface UserRow {
  id: string; name: string; role: string; employee_id: string | null;
  companies: { slug: string } | null;
}

/**
 * Lee la cookie y, si es de un usuario de la tabla, lo vuelve a buscar: así
 * eliminarlo o cambiarle rol/empresa surte efecto de inmediato (antes la cookie
 * seguía valiendo hasta 7 días). Las cookies viejas (sin uid) se reconocen por
 * nombre + rol + empresa.
 */
async function resolveSession(): Promise<Resolved> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return { session: null, hadToken: false, stale: false };
  const payload = await verifySession(token, secret());
  if (!payload) return { session: null, hadToken: true, stale: false };

  const fromToken: SessionInfo = {
    role: payload.role === 'admin' ? 'admin' : 'practicante',
    name: typeof payload.name === 'string' ? payload.name : null,
    company: typeof payload.company === 'string' ? payload.company : null,
    employeeId: typeof payload.eid === 'string' ? payload.eid : null,
    userId: typeof payload.uid === 'string' ? payload.uid : null,
  };
  // Contraseña maestra: no está en la tabla.
  if (!fromToken.userId && !fromToken.name) return { session: fromToken, hadToken: true, stale: false };

  let q = supabaseAdmin().from('admin_users').select('id, name, role, employee_id, companies(slug)');
  q = fromToken.userId ? q.eq('id', fromToken.userId) : q.eq('name', fromToken.name!).eq('role', fromToken.role);
  const { data, error } = await q;
  // Si la base no contesta, no se saca a nadie por eso: vale lo firmado.
  if (error) return { session: fromToken, hadToken: true, stale: false };

  const rows = ((data ?? []) as unknown as UserRow[])
    .filter(u => fromToken.userId || (u.companies?.slug ?? null) === fromToken.company);
  if (rows.length !== 1) return { session: null, hadToken: true, stale: false };

  const u = rows[0];
  const fresh: SessionInfo = {
    role: u.role === 'admin' ? 'admin' : 'practicante',
    name: u.name,
    company: u.companies?.slug ?? null,
    employeeId: u.employee_id ?? null,
    userId: u.id,
  };
  const stale = (Object.keys(fresh) as (keyof SessionInfo)[]).some(k => fresh[k] !== fromToken[k]);
  return { session: fresh, hadToken: true, stale };
}

/** Datos de la sesión actual, o null si no hay sesión válida. Una consulta por petición. */
export const getSession = cache(async (): Promise<SessionInfo | null> => (await resolveSession()).session);

/**
 * Para /api/me (cada cambio de pantalla): borra la cookie si el usuario ya no
 * existe y la reescribe si le cambiaron algo, para que el middleware (que sólo
 * lee la cookie) aplique el rol nuevo.
 */
export async function syncSessionCookie(): Promise<SessionInfo | null> {
  const r = await resolveSession();
  if (!r.session && r.hadToken) await clearSessionCookie();
  else if (r.session && r.stale) await createSessionCookie(r.session);
  return r.session;
}

/** True si hay sesión válida. Para usar dentro de server actions. */
export async function hasValidSession(): Promise<boolean> {
  return (await getSession()) !== null;
}

/** Lanza si no hay sesión. Llamar al inicio de cada server action de escritura. */
export async function requireSession(): Promise<void> {
  if (!(await hasValidSession())) throw new Error('No autorizado');
}

/** Lanza si la sesión no es de un administrador. Para gestión de usuarios. */
export async function requireAdmin(): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== 'admin') throw new Error('No autorizado');
}
