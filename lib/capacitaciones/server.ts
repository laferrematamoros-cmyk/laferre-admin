import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CATALOG } from './catalog';
import { catalogSyncPlan, type DbTraining } from './sync';
import { groupClaims, flattenClaimRows, noticeText, inNoticeHours, type NoticeClaimRow } from './notices';
// Imports relativos (como inventory-server.ts): jest no tiene el mapeo de `@/`.
import { personTargets, type DeviceRow, type EmployeeTokenRow } from '../push-targets';
import { pushExpo } from '../expo-push';

/** Deja `trainings` igual que el catálogo: altas pausadas, títulos, temas y versiones (sólo hacia arriba). Pide la 014 (columna theme). */
export async function syncCatalog(db: SupabaseClient): Promise<string[]> {
  const { data, error } = await db.from('trainings').select('id, slug, title, version, sort_order, theme');
  if (error) return [`catálogo: ${error.message}`];
  const plan = catalogSyncPlan(CATALOG, (data ?? []) as DbTraining[]);
  const log: string[] = [];
  if (plan.inserts.length) {
    const r = await db.from('trainings').upsert(plan.inserts, { onConflict: 'slug', ignoreDuplicates: true });
    log.push(r.error ? `catálogo alta: ${r.error.message}` : `catálogo: ${plan.inserts.length} nuevas (pausadas)`);
  }
  for (const { id, ...patch } of plan.updates) {
    let q = db.from('trainings').update(patch).eq('id', id);
    if (patch.version !== undefined) q = q.lt('version', patch.version);
    const r = await q;
    log.push(r.error ? `catálogo ${id}: ${r.error.message}` : `catálogo: ${id} al día`);
  }
  return log;
}

/** Para el cron (cada 5 min): sincroniza y, de 9 a 19 h, manda los avisos que tocan (uno por persona). */
export async function runTrainingTick(db: SupabaseClient, now = new Date()): Promise<string[]> {
  const log = await syncCatalog(db);
  if (!inNoticeHours(now)) return log;
  const { data, error } = await db.rpc('cap_claim_notices', { p_now: now.toISOString() });
  if (error) { log.push(`capacitación avisos: ${error.message}`); return log; }
  const groups = groupClaims(flattenClaimRows((data ?? []) as NoticeClaimRow[]));
  if (!groups.length) return log;
  const [{ data: devices }, { data: emps }] = await Promise.all([
    db.from('device_tokens').select('*'),
    db.from('employees').select('id, company_id, push_token').eq('is_active', true).not('push_token', 'is', null),
  ]);
  // Uno por persona: si Expo falla con alguien, a los demás se les manda igual.
  const sent = await Promise.allSettled(groups.map(async g => {
    const tokens = personTargets(g.companyId, g.employeeId, (devices ?? []) as DeviceRow[], (emps ?? []) as EmployeeTokenRow[]);
    const { title, body } = noticeText(g, now);
    await pushExpo(tokens, title, body);
    return `capacitación → ${g.name}: ${g.news.length} nuevas, ${g.dues.length} por vencer (${tokens.length} tel.)`;
  }));
  sent.forEach((s, i) => log.push(s.status === 'fulfilled' ? s.value
    : `capacitación → ${groups[i].name}: error ${s.reason instanceof Error ? s.reason.message : String(s.reason)}`));
  return log;
}
