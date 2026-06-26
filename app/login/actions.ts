'use server';

import { redirect } from 'next/navigation';
import { timingSafeEqual } from 'node:crypto';
import { createSessionCookie, clearSessionCookie } from '@/lib/auth';

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function login(_prev: string | undefined, formData: FormData): Promise<string | undefined> {
  const password = String(formData.get('password') ?? '');
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return 'Configuración faltante (ADMIN_PASSWORD).';
  if (!safeEqual(password, expected)) return 'Contraseña incorrecta.';
  await createSessionCookie();
  redirect('/dashboard');
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect('/login');
}
