import type { SupabaseClient } from '@supabase/supabase-js';
import type { DutyInfo, DutyOverride, Rotation } from './duty';

/**
 * Le agrega a cada actividad con lista su rol, sus cambios y los días que esperan firma
 * (entre `from` y `to`, YYYY-MM-DD). Si la base todavía no tiene el SQL 010, regresa
 * las actividades como venían (todo sigue funcionando como antes).
 */
export async function withDuty<T extends { id: string; checklist_enabled?: boolean | null }>(
  db: SupabaseClient, acts: T[], from: string, to: string,
): Promise<(T & DutyInfo)[]> {
  const ids = acts.filter(a => a.checklist_enabled).map(a => a.id);
  if (ids.length === 0) return acts;
  const [rot, ov, runs] = await Promise.all([
    db.from('activity_rotations').select('activity_id, employee_ids, anchor_week, valid_from, created_at').in('activity_id', ids),
    db.from('activity_duty_overrides').select('activity_id, from_date, to_date, employee_id, created_at')
      .in('activity_id', ids).lte('from_date', to).gte('to_date', from),
    db.from('checklist_runs').select('activity_id, scheduled_date')
      .in('activity_id', ids).eq('status', 'awaiting_signature').gte('scheduled_date', from).lte('scheduled_date', to),
  ]);
  if (rot.error || ov.error || runs.error) return acts;
  const by = <R extends { activity_id: string }>(rows: R[]) => {
    const m = new Map<string, R[]>();
    for (const r of rows) m.set(r.activity_id, [...(m.get(r.activity_id) ?? []), r]);
    return m;
  };
  const R = by((rot.data ?? []) as (Rotation & { activity_id: string })[]);
  const O = by((ov.data ?? []) as (DutyOverride & { activity_id: string })[]);
  const S = by((runs.data ?? []) as { activity_id: string; scheduled_date: string }[]);
  return acts.map(a => a.checklist_enabled
    ? { ...a, rotations: R.get(a.id) ?? [], overrides: O.get(a.id) ?? [], signingDates: (S.get(a.id) ?? []).map(r => r.scheduled_date) }
    : a);
}
