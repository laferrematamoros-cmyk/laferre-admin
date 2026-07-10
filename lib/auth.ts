import 'server-only';
import { cookies } from 'next/headers';
import { signSession, verifySession } from './auth-session';

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
}

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET no está configurado');
  return s;
}

/** Crea la cookie de sesión (llamar desde un server action / route handler). */
export async function createSessionCookie(info: SessionInfo) {
  const token = await signSession(
    { role: info.role, name: info.name, company: info.company, eid: info.employeeId },
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

/** Datos de la sesión actual, o null si no hay sesión válida. */
export async function getSession(): Promise<SessionInfo | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySession(token, secret());
  if (!payload) return null;
  return {
    role: payload.role === 'admin' ? 'admin' : 'practicante',
    name: typeof payload.name === 'string' ? payload.name : null,
    company: typeof payload.company === 'string' ? payload.company : null,
    employeeId: typeof payload.eid === 'string' ? payload.eid : null,
  };
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