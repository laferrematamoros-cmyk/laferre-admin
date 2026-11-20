import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { finishedMail, lockedMail, type MailMark } from './checklist-mail';
import { sendMail } from './mailer';

// Avisos por correo de la lista con firma (supabase/010):
// - "LIMPIEZA por firmar": lo pide la app al tocar "Terminé" (/api/listas/aviso) y, de respaldo,
//   el cron de /api/reminders manda los que se hayan quedado sin aviso.
// - "PIN equivocado": cuando la firma con PIN se bloquea o se apaga.
// Cada aviso se "reclama" primero en la base (un UPDATE condicionado) para que nunca salga dos veces;
// si el envío falla se suelta para que el cron lo reintente.

export const PANEL_URL = (process.env.PANEL_URL ?? 'https://laferre-admin.vercel.app').replace(/\/+$/, '');

async function recipients(db: SupabaseClient): Promise<string[]> {
  const { data } = await db.from('signer_settings').select('notify_emails').eq('id', true).maybeSingle();
  return ((data?.notify_emails ?? []) as string[]);
}

/** Manda el aviso de una lista terminada (una sola vez). Regresa una línea para el registro. */
export async function notifyRun(db: SupabaseClient, runId: string): Promise<string> {
  const claim = await db.from('checklist_runs')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', runId).eq('status', 'awaiting_signature').is('notified_at', null)
    .select('id, activity_id, employee_id, scheduled_date, finished_at, was_late');
  if (claim.error) return `aviso ${runId}: ${claim.error.message}`;
  const run = claim.data?.[0];
  if (!run) return `aviso ${runId}: nada que avisar`;

  const [a, e, m, to] = await Promise.all([
    db.from('activities').select('title').eq('id', run.activity_id).maybeSingle(),
    db.from('employees').select('name').eq('id', run.employee_id).maybeSingle(),
    db.from('checklist_marks').select('area, label, state, reason, photo_path, sort').eq('run_id', runId).order('sort'),
    recipients(db),
  ]);
  const marks: MailMark[] = ((m.data ?? []) as { area: string; label: string; state: MailMark['state']; reason: string | null; photo_path: string | null }[])
    .map(x => ({ area: x.area, label: x.label, state: x.state, reason: x.reason, hasPhoto: !!x.photo_path }));
  const mail = finishedMail({
    activity: (a.data?.title as string | undefined) ?? 'Lista',
    employee: (e.data?.name as string | undefined) ?? 'Alguien',
    date: run.scheduled_date as string,
    finishedAt: run.finished_at as string | null,
    wasLate: run.was_late as boolean | null,
    marks,
    url: `${PANEL_URL}/firmas?run=${runId}`,
  });
  const r = await sendMail(to, mail);
  if (!r.ok) {
    await db.from('checklist_runs').update({ notified_at: null }).eq('id', runId).eq('status', 'awaiting_signature');
    return `aviso ${runId}: ${r.error}`;
  }
  return `aviso ${runId}: mandado a ${to.length}`;
}

/** Para el cron: avisos que se quedaron sin mandar y el de PIN bloqueado. */
export async function runChecklistNotices(db: SupabaseClient, now = new Date()): Promise<string[]> {
  const log: string[] = [];
  // 2 minutos de gracia: normalmente la app ya pidió el aviso al tocar "Terminé".
  const cutoff = new Date(now.getTime() - 2 * 60_000).toISOString();
  const pending = await db.from('checklist_runs').select('id')
    .eq('status', 'awaiting_signature').is('notified_at', null).lt('finished_at', cutoff).limit(20);
  if (pending.error) return log; // la base todavía no tiene la 010
  for (const r of (pending.data ?? []) as { id: string }[]) log.push(await notifyRun(db, r.id));

  const s = await db.from('signer_settings').select('pin_locked_until, pin_disabled, pin_lock_count, lock_notified').eq('id', true).maybeSingle();
  const st = s.data as { pin_locked_until: string | null; pin_disabled: boolean; pin_lock_count: number; lock_notified: boolean } | null;
  const locked = !!st && (st.pin_disabled || (!!st.pin_locked_until && new Date(st.pin_locked_until) > now));
  if (!s.error && st && !st.lock_notified && locked) {
    const claim = await db.from('signer_settings').update({ lock_notified: true }).eq('id', true).eq('lock_notified', false).select('id');
    if (claim.data?.length) {
      const mail = lockedMail(`${PANEL_URL}/ajustes`, st.pin_disabled ? { disabled: true } : { minutes: 15 * Math.max(1, st.pin_lock_count) });
      const r = await sendMail(await recipients(db), mail);
      if (!r.ok) await db.from('signer_settings').update({ lock_notified: false }).eq('id', true);
      log.push(`PIN bloqueado: ${r.ok ? 'avisado' : r.error}`);
    }
  }
  return log;
}
