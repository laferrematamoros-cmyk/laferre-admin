'use server';

import { supabaseAdmin as admin } from '@/lib/supabase';
import { adminAccess, ownsRow, fail, OK, type Result as ActionResult } from '@/lib/admin-access';
import { allows, pick } from '@/lib/access-rules';

// Con `export type Result = …`, no `export type { Result }`: en un archivo 'use server'
// la compilación de producción lo vuelve un export real y el archivo truena al cargar.
export type Result = ActionResult;

export interface EmployeeInput {
  name: string;
  role: string;
  color: string;
  emp_type: 'empleado' | 'practicante';
  initials: string;
}

// Lo único que la pantalla puede escribir; la empresa sale de la sesión.
const FIELDS = ['name', 'role', 'color', 'emp_type', 'initials'] as const;

export async function createEmployee(input: EmployeeInput, companyId: string): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  if (!allows(a.own, companyId) || companyId === null) return fail('Empresa no permitida');
  const { error } = await admin().from('employees').insert({ ...pick(input, FIELDS), is_active: true, company_id: companyId });
  return error ? fail(error.message) : OK;
}

export async function updateEmployee(id: string, input: EmployeeInput): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const o = await ownsRow('employees', id, a.own);
  if (!o.ok) return o;
  const { error } = await admin().from('employees').update(pick(input, FIELDS)).eq('id', id);
  return error ? fail(error.message) : OK;
}

export async function setEmployeeActive(id: string, isActive: boolean): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const o = await ownsRow('employees', id, a.own);
  if (!o.ok) return o;
  const { error } = await admin().from('employees').update({ is_active: isActive === true }).eq('id', id);
  return error ? fail(error.message) : OK;
}

/** Sólo se elimina a quien no tiene registros; con historial se da de baja
 *  (la base tampoco deja borrarlo: completions.employee_id apunta a él). */
export async function deleteEmployee(id: string): Promise<Result> {
  const acc = await adminAccess();
  if (!acc.ok) return acc;
  const o = await ownsRow('employees', id, acc.own);
  if (!o.ok) return o;
  const a = admin();
  const { count, error: ce } = await a.from('completions').select('id', { count: 'exact', head: true }).eq('employee_id', id);
  if (ce) return fail(ce.message);
  if ((count ?? 0) > 0) {
    return fail(`Tiene ${count} actividad${count === 1 ? '' : 'es'} registrada${count === 1 ? '' : 's'}. Para no perder su historial, dale de baja en lugar de eliminarlo.`);
  }
  const { error } = await a.from('employees').delete().eq('id', id);
  return error ? fail(error.message) : OK;
}
