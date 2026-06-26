'use server';

import { requireSession } from '@/lib/auth';
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

export async function createEmployee(input: EmployeeInput, companyId: string) {
  await requireSession();
  const { error } = await admin().from('employees').insert({
    ...input, is_active: true, company_id: companyId,
  });
  if (error) throw new Error(error.message);
}

export async function updateEmployee(id: string, input: EmployeeInput) {
  await requireSession();
  const { error } = await admin().from('employees').update(input).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setEmployeeActive(id: string, isActive: boolean) {
  await requireSession();
  const { error } = await admin().from('employees').update({ is_active: isActive }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteEmployee(id: string) {
  await requireSession();
  const { error } = await admin().from('employees').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
