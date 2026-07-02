'use server';

import { requireAdmin } from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/password';
import { supabaseAdmin } from '@/lib/supabase';

export type Role = 'admin' | 'practicante';

export interface AdminUser {
  id: string;
  name: string;
  role: Role;
  company_id: string | null;
  companyName: string | null;
}

export interface UserInput {
  name: string;
  password?: string;   // en edición: vacío = no cambiar
  role: Role;
  companyId: string | null;
}

type Result = { ok: true } | { ok: false; error: string };

/** Verifica que la contraseña no choque con otra existente ni con el admin maestro. */
async function passwordInUse(plain: string, exceptId?: string): Promise<boolean> {
  const master = process.env.ADMIN_PASSWORD;
  if (master && plain === master) return true;

  const { data } = await supabaseAdmin().from('admin_users').select('id, password_hash');
  const rows = (data ?? []) as { id: string; password_hash: string }[];
  return rows.some(r => r.id !== exceptId && verifyPassword(plain, r.password_hash));
}

/** Lista de usuarios (sin hashes). Solo admin. */
export async function listUsers(): Promise<AdminUser[]> {
  await requireAdmin();
  const { data } = await supabaseAdmin()
    .from('admin_users')
    .select('id, name, role, company_id, companies(name)')
    .order('created_at', { ascending: true });

  return ((data ?? []) as unknown as Array<{
    id: string; name: string; role: Role; company_id: string | null; companies: { name: string } | null;
  }>).map(u => ({
    id: u.id,
    name: u.name,
    role: u.role,
    company_id: u.company_id,
    companyName: u.companies?.name ?? null,
  }));
}

/** Crea un usuario. Solo admin. */
export async function createUser(input: UserInput): Promise<Result> {
  await requireAdmin();
  const name = input.name.trim();
  const password = (input.password ?? '').trim();
  if (!name) return { ok: false, error: 'El nombre es obligatorio.' };
  if (password.length < 4) return { ok: false, error: 'La contraseña debe tener al menos 4 caracteres.' };
  if (await passwordInUse(password)) return { ok: false, error: 'Esa contraseña ya está en uso. Elige otra.' };

  const { error } = await supabaseAdmin().from('admin_users').insert({
    name,
    password_hash: hashPassword(password),
    role: input.role,
    company_id: input.companyId,
  });
  if (error) return { ok: false, error: 'No se pudo crear el usuario.' };
  return { ok: true };
}

/** Edita un usuario (nombre, rol, empresa y opcionalmente contraseña). Solo admin. */
export async function updateUser(id: string, input: UserInput): Promise<Result> {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) return { ok: false, error: 'El nombre es obligatorio.' };

  const patch: Record<string, unknown> = {
    name,
    role: input.role,
    company_id: input.companyId,
  };

  const password = (input.password ?? '').trim();
  if (password) {
    if (password.length < 4) return { ok: false, error: 'La contraseña debe tener al menos 4 caracteres.' };
    if (await passwordInUse(password, id)) return { ok: false, error: 'Esa contraseña ya está en uso. Elige otra.' };
    patch.password_hash = hashPassword(password);
  }

  const { error } = await supabaseAdmin().from('admin_users').update(patch).eq('id', id);
  if (error) return { ok: false, error: 'No se pudo guardar el usuario.' };
  return { ok: true };
}

/** Elimina un usuario. Solo admin. */
export async function deleteUser(id: string): Promise<Result> {
  await requireAdmin();
  const { error } = await supabaseAdmin().from('admin_users').delete().eq('id', id);
  if (error) return { ok: false, error: 'No se pudo eliminar el usuario.' };
  return { ok: true };
}
