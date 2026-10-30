'use server';

import { requireAdmin } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export interface EmployeeInput {
  name: string;
  role: string;
  color: string;
  emp_type: 'empleado' | 'practicante';
  initials: string;
}

// Devuelven { ok, error } en lugar de lanzar: en producción Next oculta el mensaje
// de los errores lanzados y la pantalla no podría decir qué pasó.
export type Result = { ok: true } | { ok: false; error: string };

export async function createEmployee(input: EmployeeInput, companyId: string): Promise<Result> {
  await requireAdmin();
  const { error } = await admin().from('employees').insert({ ...input, is_active: true, company_id: companyId });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function updateEmployee(id: string, input: EmployeeInput): Promise<Result> {
  await requireAdmin();
  const { error } = await admin().from('employees').update(input).eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function setEmployeeActive(id: string, isActive: boolean): Promise<Result> {
  await requireAdmin();
  const { error } = await admin().from('employees').update({ is_active: isActive }).eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Sólo se elimina a quien no tiene registros; con historial se da de baja
 *  (la base tampoco deja borrarlo: completions.employee_id apunta a él). */
export async function deleteEmployee(id: string): Promise<Result> {
  await requireAdmin();
  const a = admin();
  const { count, error: ce } = await a.from('completions').select('id', { count: 'exact', head: true }).eq('employee_id', id);
  if (ce) return { ok: false, error: ce.message };
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `Tiene ${count} actividad${count === 1 ? '' : 'es'} registrada${count === 1 ? '' : 's'}. Para no perder su historial, dale de baja en lugar de eliminarlo.`,
    };
  }
  const { error } = await a.from('employees').delete().eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}
