// A qué teléfonos le llega el recordatorio automático de una actividad.
// Antes /api/reminders mandaba cada aviso a TODOS los teléfonos registrados, de las
// dos empresas: un aviso de La Ferre sonaba también en los de BFM.

/** employee_id: a quién está registrado el teléfono (supabase/008, modo "un teléfono por persona"). */
export interface DeviceRow { token: string | null; company_id: string | null; employee_id?: string | null; }
export interface EmployeeTokenRow { id: string; company_id: string | null; push_token: string | null; }
export interface PushActivity { company_id: string | null; assigned_employee_ids: string[] | null; }

/**
 * Misma regla que el botón "Recordar" del Dashboard (/api/push):
 * - a nombre de alguien con teléfono registrado → sólo a esa(s) persona(s);
 * - general, o nadie de los asignados tiene teléfono → a los teléfonos de SU empresa.
 * Nunca a otra empresa. Sin repetidos.
 */
export function reminderTargets(act: PushActivity, devices: DeviceRow[], employees: EmployeeTokenRow[]): string[] {
  if (!act.company_id) return [];
  const assigned = act.assigned_employee_ids ?? [];
  const personal = employees
    .filter(e => e.company_id === act.company_id && assigned.includes(e.id) && e.push_token)
    .map(e => e.push_token as string);
  if (personal.length) return [...new Set(personal)];
  const company = devices
    .filter(d => d.company_id === act.company_id && d.token)
    .map(d => d.token as string);
  return [...new Set(company)];
}

/**
 * Los teléfonos de UNA persona (la de turno de una lista con firma, supabase/010): el registrado
 * a su nombre en device_tokens y su push_token de employees. Si no tiene ninguno, a los de su
 * empresa, igual que un recordatorio general. Nunca a otra empresa.
 */
export function personTargets(companyId: string | null, employeeId: string, devices: DeviceRow[], employees: EmployeeTokenRow[]): string[] {
  if (!companyId) return [];
  const own = [
    ...devices.filter(d => d.company_id === companyId && d.employee_id === employeeId && d.token).map(d => d.token as string),
    ...employees.filter(e => e.company_id === companyId && e.id === employeeId && e.push_token).map(e => e.push_token as string),
  ];
  if (own.length) return [...new Set(own)];
  return reminderTargets({ company_id: companyId, assigned_employee_ids: [] }, devices, employees);
}
