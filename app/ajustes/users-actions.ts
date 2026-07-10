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
  employee_id: string | null;
  employeeName: string | null;
}

export interface UserInput {
  name: string;
  password?: string;   // en edición: vacío = no cambiar
  role: Role;
  companyId: string | null;
  employeeId: string | null;
}

export interface EmployeeOpt { id: string; name: string; company_id: string | null; }

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
    .select('id, name, role, company_id, employee_id, companies(name), employees(name)')
    .order('created_at', { ascending: true });

  return ((data ?? []) as unknown as Array<{
    id: string; name: string; role: Role; company_id: string | null; employee_id: string | null;
    companies: { name: string } | null; employees: { name: string } | null;
  }>).map(u => ({
    id: u.id,
    name: u.name,
    role: u.role,
    company_id: u.company_id,
    companyName: u.companies?.name ?? null,
    employee_id: u.employee_id,
    employeeName: u.employees?.name ?? null,
  }));
}

/** Empleados activos (para el selector de "empleado vinculado"). Solo admin. */
export async function listEmployees(): Promise<EmployeeOpt[]> {
  await requireAdmin();
  const { data } = await supabaseAdmin()
    .from('employees')
    .select('id, name, company_id')
    .eq('is_active', true)
    .order('name');
  return (data ?? []) as EmployeeOpt[];
}

/** Crea un empleado nuevo y lo devuelve. Solo admin. */
export async function createEmployee(name: string, companyId: string | null): Promise<{ ok: true; employee: EmployeeOpt } | { ok: false; error: string }> {
  await requireAdmin();
  const n = name.trim();
  if (!n) return { ok: false, error: 'El nombre del empleado es obligatorio.' };
  if (!companyId) return { ok: false, error: 'Fija primero la empresa del usuario para crear el empleado.' };
  const initials = n.replace(/[^A-Za-zÁÉÍÓÚÑ ]/g, '').split(/\s+/).map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase() || 'PR';
  const { data, error } = await supabaseAdmin()
    .from('employees')
    .insert({ name: n, role: 'Practicante', initials, color: '#6E6E73', is_active: true, company_id: companyId })
    .select('id, name, company_id')
    .single();
  if (error || !data) return { ok: false, error: 'No se pudo crear el empleado.' };
  return { ok: true, employee: data as EmployeeOpt };
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
    employee_id: input.employeeId,
  });
  if (error) return { ok: false, error: 'No se pudo crear el usuario.' };
  return { ok: true };
}

/** Edita un usuario (nombre, rol, empresa, empleado y opcionalmente contraseña). Solo admin. */
export async function updateUser(id: string, input: UserInput): Promise<Result> {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) return { ok: false, error: 'El nombre es obligatorio.' };

  const patch: Record<string, unknown> = {
    name,
    role: input.role,
    company_id: input.companyId,
    employee_id: input.employeeId,
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