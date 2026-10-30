'use server';

import { hashPassword, verifyPassword } from '@/lib/password';
import { supabaseAdmin } from '@/lib/supabase';
import { adminAccess, fail, OK, type Result } from '@/lib/admin-access';
import { allows, isUuid } from '@/lib/access-rules';

export type Role = 'admin' | 'practicante';
export type { Result };

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

// Todo pide administrador. Un administrador fijo a una empresa sólo ve y toca
// usuarios y empleados de ella, y no puede dar acceso a las dos empresas.

/** Verifica que la contraseña no choque con otra existente ni con el admin maestro.
 *  (Se entra sólo con la contraseña, por eso no pueden repetirse.) */
async function passwordInUse(plain: string, exceptId?: string): Promise<boolean> {
  const master = process.env.ADMIN_PASSWORD;
  if (master && plain === master) return true;

  const { data } = await supabaseAdmin().from('admin_users').select('id, password_hash');
  const rows = (data ?? []) as { id: string; password_hash: string }[];
  return rows.some(r => r.id !== exceptId && verifyPassword(plain, r.password_hash));
}

/** Rol, empresa y empleado válidos para quien está guardando. */
async function checkInput(input: UserInput, own: string | null): Promise<Result> {
  if (input.role !== 'admin' && input.role !== 'practicante') return fail('Escoge qué puede ver.');
  const companyId = input.companyId ?? null;
  if (!allows(own, companyId)) return fail('Empresa no permitida.');
  if (input.employeeId) {
    if (!isUuid(input.employeeId)) return fail('Empleado no válido.');
    const { data } = await supabaseAdmin().from('employees').select('company_id').eq('id', input.employeeId).maybeSingle();
    if (!data || !allows(own, data.company_id) || (companyId && data.company_id !== companyId)) {
      return fail('Ese empleado no es de la empresa escogida.');
    }
  }
  return OK;
}

/** Lista de usuarios (sin hashes). */
export async function listUsers(): Promise<AdminUser[]> {
  const a = await adminAccess();
  if (!a.ok) return [];
  let q = supabaseAdmin()
    .from('admin_users')
    .select('id, name, role, company_id, employee_id, companies(name), employees(name)')
    .order('created_at', { ascending: true });
  if (a.own) q = q.eq('company_id', a.own);
  const { data } = await q;

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

/** Empleados activos (para el selector de "empleado vinculado"). */
export async function listEmployees(): Promise<EmployeeOpt[]> {
  const a = await adminAccess();
  if (!a.ok) return [];
  let q = supabaseAdmin().from('employees').select('id, name, company_id').eq('is_active', true).order('name');
  if (a.own) q = q.eq('company_id', a.own);
  const { data } = await q;
  return (data ?? []) as EmployeeOpt[];
}

/** Crea un empleado nuevo (practicante) y lo devuelve. */
export async function createEmployee(name: string, companyId: string | null): Promise<{ ok: true; employee: EmployeeOpt } | { ok: false; error: string }> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const n = typeof name === 'string' ? name.trim().slice(0, 60) : '';
  if (!n) return { ok: false, error: 'El nombre del empleado es obligatorio.' };
  if (!companyId) return { ok: false, error: 'Escoge primero la empresa del usuario para crear el empleado.' };
  if (!allows(a.own, companyId)) return { ok: false, error: 'Empresa no permitida.' };
  const initials = n.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ ]/g, '').split(/\s+/).map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase() || 'PR';
  const { data, error } = await supabaseAdmin()
    .from('employees')
    .insert({ name: n, role: 'Practicante', emp_type: 'practicante', initials, color: '#6E6E73', is_active: true, company_id: companyId })
    .select('id, name, company_id')
    .single();
  if (error || !data) return { ok: false, error: 'No se pudo crear el empleado.' };
  return { ok: true, employee: data as EmployeeOpt };
}

/** Crea un usuario. */
export async function createUser(input: UserInput): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const name = (input.name ?? '').trim();
  const password = (input.password ?? '').trim();
  if (!name) return fail('El nombre es obligatorio.');
  if (password.length < 4) return fail('La contraseña debe tener al menos 4 caracteres.');
  const c = await checkInput(input, a.own);
  if (!c.ok) return c;
  if (await passwordInUse(password)) return fail('Esa contraseña ya la usa alguien más. Escoge otra.');

  const { error } = await supabaseAdmin().from('admin_users').insert({
    name,
    password_hash: hashPassword(password),
    role: input.role,
    company_id: input.companyId ?? null,
    employee_id: input.employeeId ?? null,
  });
  if (error) return fail('No se pudo crear el usuario.');
  return OK;
}

/** Edita un usuario (nombre, rol, empresa, empleado y opcionalmente contraseña). */
export async function updateUser(id: string, input: UserInput): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  if (!isUuid(id)) return fail('Usuario no encontrado.');
  const { data: current } = await supabaseAdmin().from('admin_users').select('company_id, role').eq('id', id).maybeSingle();
  if (!current || !allows(a.own, current.company_id)) return fail('Usuario no encontrado.');

  const name = (input.name ?? '').trim();
  if (!name) return fail('El nombre es obligatorio.');
  if (id === a.session.userId && input.role !== 'admin') return fail('No puedes quitarte a ti mismo el rol de administrador.');
  const c = await checkInput(input, a.own);
  if (!c.ok) return c;

  const patch: Record<string, unknown> = {
    name,
    role: input.role,
    company_id: input.companyId ?? null,
    employee_id: input.employeeId ?? null,
  };

  const password = (input.password ?? '').trim();
  if (password) {
    if (password.length < 4) return fail('La contraseña debe tener al menos 4 caracteres.');
    if (await passwordInUse(password, id)) return fail('Esa contraseña ya la usa alguien más. Escoge otra.');
    patch.password_hash = hashPassword(password);
  }

  const { error } = await supabaseAdmin().from('admin_users').update(patch).eq('id', id);
  if (error) return fail('No se pudo guardar el usuario.');
  return OK;
}

/** Elimina un usuario. Su sesión deja de valer en ese momento (lib/auth.ts). */
export async function deleteUser(id: string): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  if (!isUuid(id)) return fail('Usuario no encontrado.');
  if (id === a.session.userId) return fail('No puedes eliminar tu propio usuario.');
  const { data: current } = await supabaseAdmin().from('admin_users').select('company_id').eq('id', id).maybeSingle();
  if (!current || !allows(a.own, current.company_id)) return fail('Usuario no encontrado.');
  const { error } = await supabaseAdmin().from('admin_users').delete().eq('id', id);
  if (error) return fail('No se pudo eliminar el usuario.');
  return OK;
}
