'use server';

import { supabaseAdmin as admin } from '@/lib/supabase';
import { adminAccess, ownsRow, fail, OK, type Result as ActionResult } from '@/lib/admin-access';
import { isUuid } from '@/lib/access-rules';
import { cleanItems, overrideSpan, rotateTo } from '@/lib/checklist-config';
import { mondayOf, type DutyOverride, type Rotation } from '@/lib/duty';
import { shopClock } from '@/lib/my-day';
import type { ChecklistItem, ConfigResult } from '@/lib/checklist-types';

// Con `export type Result = …`, no `export type { Result }`: en un archivo 'use server'
// la compilación de producción lo vuelve un export real y el archivo truena al cargar.
export type Result = ActionResult;

// Lista con firma (supabase/010): tareas, rol semanal y cambios de una actividad.
// Todas piden administrador y sólo tocan actividades de la empresa de la sesión.

async function guard(activityId: unknown) {
  const a = await adminAccess();
  if (!a.ok) return a;
  const o = await ownsRow('activities', activityId, a.own);
  if (!o.ok) return o;
  return a;
}

const today = () => shopClock(new Date()).dateStr;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const dayBefore = (d: string) => {
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, dd - 1)).toISOString().slice(0, 10);
};

/** ¿Todos son empleados activos de la empresa de esta actividad? */
async function sameCompany(activityId: string, employeeIds: string[]): Promise<boolean> {
  const db = admin();
  const { data: act } = await db.from('activities').select('company_id').eq('id', activityId).maybeSingle();
  if (!act) return false;
  const { data } = await db.from('employees').select('id').in('id', employeeIds).eq('company_id', act.company_id).eq('is_active', true);
  return (data ?? []).length === new Set(employeeIds).size;
}

export async function getChecklistConfig(activityId: string): Promise<ConfigResult> {
  const g = await guard(activityId);
  if (!g.ok) return g;
  const db = admin();
  const t = today();
  const [act, items, rots, ovs] = await Promise.all([
    db.from('activities').select('checklist_enabled').eq('id', activityId).single(),
    db.from('checklist_items').select('id, area, label, days, needs_photo, sort')
      .eq('activity_id', activityId).is('archived_at', null).order('sort').order('created_at'),
    db.from('activity_rotations').select('employee_ids, anchor_week, valid_from, created_at')
      .eq('activity_id', activityId).order('valid_from').order('created_at'),
    db.from('activity_duty_overrides').select('id, from_date, to_date, employee_id, created_at')
      .eq('activity_id', activityId).gte('to_date', t).order('from_date'),
  ]);
  const err = act.error ?? items.error ?? rots.error ?? ovs.error;
  if (err) return { ok: false, error: err.message };
  return {
    ok: true,
    config: {
      enabled: !!act.data?.checklist_enabled,
      items: (items.data ?? []) as ChecklistItem[],
      rotations: (rots.data ?? []) as Rotation[],
      overrides: (ovs.data ?? []) as (DutyOverride & { id: string })[],
      today: t,
    },
  };
}

export async function setChecklistEnabled(activityId: string, on: boolean): Promise<Result> {
  const g = await guard(activityId);
  if (!g.ok) return g;
  const db = admin();
  if (on === true) {
    const [items, rots] = await Promise.all([
      db.from('checklist_items').select('id', { count: 'exact', head: true }).eq('activity_id', activityId).is('archived_at', null),
      db.from('activity_rotations').select('id', { count: 'exact', head: true }).eq('activity_id', activityId),
    ]);
    if (items.error || rots.error) return fail((items.error ?? rots.error)!.message);
    if (!items.count || !rots.count) return fail('Antes de prenderla agrega tareas y el rol.');
  }
  const { error } = await db.from('activities').update({ checklist_enabled: on === true }).eq('id', activityId);
  if (error) return fail(error.message);
  return OK;
}

/** Guarda la lista completa: actualiza las que vienen con id, agrega las nuevas y archiva las que ya no vienen. */
export async function saveChecklistItems(activityId: string, items: unknown): Promise<Result> {
  const g = await guard(activityId);
  if (!g.ok) return g;
  const c = cleanItems(items);
  if (!c.ok) return fail(c.error);
  const db = admin();
  const { data: existing, error } = await db.from('checklist_items').select('id').eq('activity_id', activityId).is('archived_at', null);
  if (error) return fail(error.message);
  const have = new Set((existing ?? []).map(r => r.id as string));
  if (c.items.some(i => i.id && !have.has(i.id))) return fail('Una tarea ya no existe. Recarga la página.');

  const keep = new Set(c.items.filter(i => i.id).map(i => i.id!));
  for (const [i, it] of c.items.entries()) {
    if (!it.id) continue;
    const r = await db.from('checklist_items')
      .update({ area: it.area, label: it.label, days: it.days, needs_photo: it.needs_photo, sort: (i + 1) * 10 }).eq('id', it.id);
    if (r.error) return fail(r.error.message);
  }
  const fresh = c.items.map((it, i) => ({ it, sort: (i + 1) * 10 })).filter(x => !x.it.id)
    .map(x => ({ activity_id: activityId, area: x.it.area, label: x.it.label, days: x.it.days, needs_photo: x.it.needs_photo, sort: x.sort }));
  if (fresh.length) {
    const r = await db.from('checklist_items').insert(fresh);
    if (r.error) return fail(r.error.message);
  }
  const gone = [...have].filter(id => !keep.has(id));
  if (gone.length) {
    const r = await db.from('checklist_items').update({ archived_at: new Date().toISOString() }).in('id', gone);
    if (r.error) return fail(r.error.message);
  }
  return OK;
}

/** Nueva versión del rol desde hoy: el orden de `employeeIds` y a quién le toca esta semana. */
export async function saveRotation(activityId: string, employeeIds: string[], currentId: string): Promise<Result> {
  const g = await guard(activityId);
  if (!g.ok) return g;
  if (!Array.isArray(employeeIds) || employeeIds.length === 0) return fail('Agrega al menos una persona al rol.');
  if (employeeIds.length > 20 || !employeeIds.every(isUuid) || new Set(employeeIds).size !== employeeIds.length) return fail('Rol no válido.');
  if (!employeeIds.includes(currentId)) return fail('Elige a quién le toca esta semana.');
  if (!(await sameCompany(activityId, employeeIds))) return fail('Alguien del rol no es de esta tienda o está dado de baja.');
  const t = today();
  const { error } = await admin().from('activity_rotations').insert({
    activity_id: activityId, employee_ids: rotateTo(employeeIds, currentId), anchor_week: mondayOf(t), valid_from: t,
  });
  if (error) return fail(error.message);
  return OK;
}

/** "Cambiar esta semana" (lun–dom) o "Cambiar un día". Nunca hacia atrás: el pasado no se reescribe. */
export async function addDutyOverride(activityId: string, kind: 'week' | 'day', date: string, employeeId: string): Promise<Result> {
  const g = await guard(activityId);
  if (!g.ok) return g;
  if (kind !== 'week' && kind !== 'day') return fail('Cambio no válido.');
  if (typeof date !== 'string' || !DATE.test(date)) return fail('Fecha no válida.');
  if (!isUuid(employeeId) || !(await sameCompany(activityId, [employeeId]))) return fail('Esa persona no es de esta tienda o está dada de baja.');
  const t = today();
  const span = overrideSpan(kind, date);
  if (span.to < t) return fail('Esa fecha ya pasó.');
  const from = span.from < t ? t : span.from;
  const { error } = await admin().from('activity_duty_overrides')
    .insert({ activity_id: activityId, from_date: from, to_date: span.to, employee_id: employeeId });
  if (error) return fail(error.message);
  return OK;
}

/** Quitar un cambio. Si ya empezó, sólo se corta en ayer (los días pasados se quedan como fueron). */
export async function removeDutyOverride(id: string): Promise<Result> {
  if (!isUuid(id)) return fail('No encontrado');
  const db = admin();
  const { data: ov, error } = await db.from('activity_duty_overrides').select('activity_id, from_date, to_date').eq('id', id).maybeSingle();
  if (error) return fail(error.message);
  if (!ov) return fail('No encontrado');
  const g = await guard(ov.activity_id);
  if (!g.ok) return g;
  const t = today();
  if (ov.to_date < t) return fail('Ese cambio ya terminó.');
  const r = ov.from_date < t
    ? await db.from('activity_duty_overrides').update({ to_date: dayBefore(t) }).eq('id', id)
    : await db.from('activity_duty_overrides').delete().eq('id', id);
  if (r.error) return fail(r.error.message);
  return OK;
}
