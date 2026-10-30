import type { SupabaseClient } from '@supabase/supabase-js';
import type { Activity } from './supabase';
import type { PauseSpan } from './reports';

export type LiveActivity = Activity & { pauses: PauseSpan[] };

/** Todas las actividades de la empresa con sus pausas. Incluye las pausadas y las archivadas:
 *  los cálculos deciden con `liveAt` en qué días contaban, así el pasado no cambia.
 *  Si la tabla de pausas todavía no existe (falta correr supabase/005), sigue sin ellas. */
export async function loadActivities(sb: SupabaseClient, companyId: string): Promise<LiveActivity[]> {
  const acts = await sb.from('activities').select('*').eq('company_id', companyId).order('start_time');
  if (acts.error) throw new Error(acts.error.message);
  const list = (acts.data ?? []) as Activity[];

  const byAct = new Map<string, PauseSpan[]>();
  if (list.length) {
    const p = await sb.from('activity_pauses').select('activity_id, paused_at, resumed_at').in('activity_id', list.map(a => a.id));
    if (!p.error) {
      for (const row of (p.data ?? []) as (PauseSpan & { activity_id: string })[]) {
        const arr = byAct.get(row.activity_id) ?? [];
        arr.push({ paused_at: row.paused_at, resumed_at: row.resumed_at });
        byAct.set(row.activity_id, arr);
      }
    }
  }

  const now = new Date().toISOString();
  return list.map(a => {
    const pauses = byAct.get(a.id) ?? [];
    // Pausada desde antes de que existiera el historial de pausas: deja de contar desde ahora
    // (lo pasado se conserva). Las mensuales las prende y apaga el cron: no son pausas.
    if (!a.is_active && a.week_of_month == null && !a.archived_at && !pauses.some(p => !p.resumed_at)) {
      pauses.push({ paused_at: now, resumed_at: null });
    }
    return { ...a, pauses };
  });
}
