import 'server-only';
import { cookies } from 'next/headers';
import { signSession, verifySession } from './auth-session';

export const SESSION_COOKIE = 'lf_admin_session';
const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 días

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET no está configurado');
  return s;
}

/** Crea la cookie de sesión (llamar desde un server action / route handler). */
export async function createSessionCookie() {
  const token = await signSession({ role: 'admin' }, secret(), TTL_SECONDS);
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

/** True si hay sesión válida. Para usar dentro de server actions. */
export async function hasValidSession(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return (await verifySession(token, secret())) !== null;
}

/** Lanza si no hay sesión. Llamar al inicio de cada server action de escritura. */
export async function requireSession(): Promise<void> {
  if (!(await hasValidSession())) throw new Error('No autorizado');
}
