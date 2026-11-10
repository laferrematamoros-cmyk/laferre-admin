import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { inventoryActions, type PlanRow, type OpenRoundInfo } from './inventory-schedule';
import { reminderTargets, type DeviceRow, type EmployeeTokenRow } from './push-targets';
import { pushExpo } from './expo-push';

/** Crea la ronda y sus fichas (copia de las letras activas). Devuelve el id o un error. */
export async function openRound(db: SupabaseClient, companyId: string, args: {
  scheduledFor: string | null; dueAt: string; openedBy: string; supersede?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data: letters, error: le } = await db.from('inventory_letters')
    .select('id, code, name, sort_order').eq('company_id', companyId).eq('is_active', true).order('sort_order').order('code');
  if (le) return { ok: false, error: le.message };
  if (!letters?.length) return { ok: false, error: 'No hay letras dadas de alta.' };
  if (args.supersede) {
    await db.from('inventory_rounds').update({ closed_at: new Date().toISOString(), close_reason: 'superseded' })
      .eq('id', args.supersede).is('closed_at', null);
  }
  const { data: round, error: re } = await db.from('inventory_rounds')
    .insert({ company_id: companyId, scheduled_for: args.scheduledFor, due_at: args.dueAt, opened_by: args.openedBy })
    .select('id').single();
  if (re || !round) return { ok: false, error: re?.message ?? 'No se pudo abrir la ronda.' };
  const rows = letters.map((l, i) => ({
    round_id: round.id, company_id: companyId, letter_id: l.id, code: l.code, name: l.name, sort_order: i,
  }));
  const { error: se } = await db.from('inventory_sections').insert(rows);
  if (se) {
    await db.from('inventory_rounds').delete().eq('id', round.id);
    return { ok: false, error: se.message };
  }
  return { ok: true, id: round.id as string };
}

/** Lo que el cron hace cada 5 minutos: abrir rondas que tocan y mandar avisos pendientes. */
export async function runInventoryTick(db: SupabaseClient, now: Date): Promise<string[]> {
  const log: string[] = [];
  const [{ data: plans }, { data: opens }, { data: sched }] = await Promise.all([
    db.from('inventory_plans').select('*'),
    db.from('inventory_rounds').select('id, company_id, opened_at, due_at, notices').is('closed_at', null),
    db.from('inventory_rounds').select('company_id, scheduled_for').not('scheduled_for', 'is', null).order('scheduled_for', { ascending: false }),
  ]);
  const companies = new Set<string>([...(plans ?? []).map(p => p.company_id as string), ...(opens ?? []).map(r => r.company_id as string)]);
  if (companies.size === 0) return log;

  const [{ data: devices }, { data: emps }] = await Promise.all([
    db.from('device_tokens').select('token, company_id'),
    db.from('employees').select('id, company_id, push_token').eq('is_active', true).not('push_token', 'is', null),
  ]);

  for (const companyId of companies) {
    const plan = ((plans ?? []).find(p => p.company_id === companyId) ?? null) as PlanRow | null;
    const openRow = (opens ?? []).find(r => r.company_id === companyId) ?? null;
    const lastScheduled = ((sched ?? []).find(r => r.company_id === companyId)?.scheduled_for as string | undefined) ?? null;
    let open: OpenRoundInfo | null = null;
    if (openRow) {
      const { data: secs } = await db.from('inventory_sections').select('status').eq('round_id', openRow.id);
      const total = secs?.length ?? 0;
      open = {
        id: openRow.id, opened_at: openRow.opened_at, due_at: openRow.due_at, notices: (openRow.notices ?? {}) as Record<string, string>,
        total, pending: (secs ?? []).filter(s => s.status !== 'done').length,
      };
    }
    const tokens = reminderTargets({ company_id: companyId, assigned_employee_ids: [] }, (devices ?? []) as DeviceRow[], (emps ?? []) as EmployeeTokenRow[]);

    for (const act of inventoryActions({ plan, open, lastScheduled, now })) {
      if (act.kind === 'open') {
        const r = await openRound(db, companyId, { scheduledFor: act.scheduledFor, dueAt: act.dueAt, openedBy: 'cron', supersede: act.supersede });
        log.push(r.ok ? `inventario abierto ${companyId} ${act.scheduledFor}` : `inventario NO abierto ${companyId}: ${r.error}`);
        continue;
      }
      if (!open) continue;
      // Primero se anota (así un error al mandar no repite el aviso cada 5 minutos).
      const notices = { ...open.notices, [act.key]: now.toISOString() };
      await db.from('inventory_rounds').update({ notices }).eq('id', open.id);
      open.notices = notices;
      await pushExpo(tokens, act.title, act.body);
      log.push(`inventario aviso ${act.key} → ${tokens.length} teléfonos`);
    }
  }
  return log;
}
