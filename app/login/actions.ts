'use server';

import { redirect } from 'next/navigation';
import { timingSafeEqual } from 'node:crypto';
import { createSessionCookie, clearSessionCookie } from '@/lib/auth';
import { verifyPassword } from '@/lib/password';
import { supabaseAdmin } from '@/lib/supabase';

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

interface UserRow {
  id: string;
  name: string;
  password_hash: string;
  role: 'admin' | 'practicante';
  companies: { slug: string } | null;
}

export async function login(_prev: string | undefined, formData: FormData): Promise<string | undefined> {
  const password = String(formData.get('password') ?? '');
  if (!password) return 'Escribe tu contraseña.';

  // 1) Admin maestro por variable de entorno (red de seguridad).
  const masterPw = process.env.ADMIN_PASSWORD;
  if (masterPw && safeEqual(password, masterPw)) {
    await createSessionCookie({ role: 'admin', name: null, company: null });
    redirect('/dashboard');
  }

  // 2) Usuarios de la tabla admin_users (identificados por su contraseña).
  const { data } = await supabaseAdmin()
    .from('admin_users')
    .select('id, name, password_hash, role, companies(slug)');

  const users = (data ?? []) as unknown as UserRow[];
  const match = users.find(u => verifyPassword(password, u.password_hash));
  if (match) {
    await createSessionCookie({
      role: match.role,
      name: match.name,
      company: match.companies?.slug ?? null,
    });
    redirect('/dashboard');
  }

  return 'Contraseña incorrecta.';
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect('/login');
}
