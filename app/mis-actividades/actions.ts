'use server';

import { getSession } from '@/lib/auth';
import { supabaseAdmin as admin } from '@/lib/supabase';
import { isUuid } from '@/lib/access-rules';
import { activityRunsOn } from '@/lib/reports';
import { minutesOf } from '@/lib/today';
import { shopClock, SHOP_TZ, evidenceFile } from '@/lib/my-day';

export type DoneResult =
  | { ok: true; at: string; wasLate: boolean }
  | { ok: false; error: string; already?: boolean };

const fail = (error: string, already = false): DoneResult => ({ ok: false, error, already });

/** Una foto recién subida: más vieja que esto no cuenta como evidencia de hoy. */
const PHOTO_MAX_AGE_MS = 6 * 60 * 60 * 1000;

/**
 * Marca una actividad como hecha por el empleado vinculado a la sesión.
 * Antes la pantalla insertaba directo con la llave pública: el empleado, la
 * fecha y si fue tarde salían del navegador (y de su reloj), y nada impedía
 * marcarla dos veces. Aquí todo sale de la sesión y de la hora de la tienda.
 */
export async function completeActivity(activityId: string, photoPath: string | null): Promise<DoneResult> {
  const session = await getSession();
  if (!session) return fail('Tu sesión terminó. Vuelve a entrar.');
  if (!session.employeeId) return fail('Tu usuario no está vinculado a un empleado. Pídeselo a un administrador.');
  if (!isUuid(activityId)) return fail('Actividad no encontrada.');

  const db = admin();
  const [a, e] = await Promise.all([
    db.from('activities')
      .select('id, company_id, limit_time, days_of_week, week_of_month, assigned_employee_ids, is_active, archived_at, evidence_photo')
      .eq('id', activityId).maybeSingle(),
    db.from('employees').select('id, company_id, is_active').eq('id', session.employeeId).maybeSingle(),
  ]);
  if (a.error || e.error) return fail((a.error ?? e.error)!.message);
  const act = a.data, emp = e.data;
  if (!act) return fail('Actividad no encontrada.');
  if (!emp || !emp.is_active) return fail('Tu empleado está dado de baja. Pídele a un administrador que lo revise.');
  if (act.company_id !== emp.company_id) return fail('Esa actividad no es de tu empresa.');
  const assigned = (act.assigned_employee_ids ?? []) as string[];
  if (assigned.length > 0 && !assigned.includes(emp.id)) return fail('Esa actividad le toca a otra persona.');
  if (!act.is_active || act.archived_at) return fail('Esa actividad está pausada o archivada.');

  const clock = shopClock(new Date());
  if (!activityRunsOn(act, clock.day)) return fail('Esa actividad no toca hoy.');

  // La pantalla manda sólo la ruta de la foto; aquí se revisa que sea de ESTA
  // actividad, que exista y que se haya subido hace poco (no una foto vieja ni
  // de otra actividad), y el enlace lo arma el servidor.
  let photo: string | null = null;
  if (photoPath) {
    const name = evidenceFile(photoPath, act.id);
    if (!name) return fail('La foto no se subió bien. Vuelve a tomarla.');
    const found = await db.storage.from('evidence').list(act.id, { search: name, limit: 5 });
    const obj = found.data?.find(o => o.name === name);
    if (found.error || !obj?.created_at) return fail('La foto no se subió bien. Vuelve a tomarla.');
    const age = Date.now() - new Date(obj.created_at).getTime();
    if (!(age >= -5 * 60 * 1000 && age <= PHOTO_MAX_AGE_MS)) return fail('Esa foto no es de ahorita. Vuelve a tomarla.');
    photo = db.storage.from('evidence').getPublicUrl(`${act.id}/${name}`).data.publicUrl;
  }
  if (act.evidence_photo && !photo) return fail('Esta actividad pide foto de evidencia.');

  // ¿Ya la marcó alguien hoy (en otro teléfono o en la app)?
  const prev = await db.from('completions')
    .select('completed_at, employees(name)')
    .eq('activity_id', act.id).eq('scheduled_date', clock.dateStr)
    .order('completed_at').limit(1);
  if (prev.error) return fail(prev.error.message);
  const first = prev.data?.[0] as unknown as { completed_at: string; employees: { name: string } | null } | undefined;
  if (first) {
    const at = new Date(first.completed_at).toLocaleTimeString('es-MX', { timeZone: SHOP_TZ, hour: '2-digit', minute: '2-digit', hour12: false });
    return fail(`Ya la marcó ${first.employees?.name ?? 'alguien'} a las ${at}.`, true);
  }

  // Igual para opcionales: el mensaje de "hecha tarde" no debe delatar cuáles son.
  const wasLate = clock.minutes > minutesOf(act.limit_time);
  const ins = await db.from('completions')
    .insert({ activity_id: act.id, employee_id: emp.id, scheduled_date: clock.dateStr, photo_url: photo, was_late: wasLate })
    .select('completed_at').single();
  if (ins.error) return fail(ins.error.message);
  return { ok: true, at: ins.data.completed_at as string, wasLate };
}
