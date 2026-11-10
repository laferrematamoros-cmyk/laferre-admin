import { NextResponse } from 'next/server';
import { cronAllowed } from '@/lib/cron-auth';
import { reminderTargets, type DeviceRow, type EmployeeTokenRow } from '@/lib/push-targets';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { matchesWeekOfMonth } from '@/lib/reports';
import { pushExpo } from '@/lib/expo-push';
import { runInventoryTick } from '@/lib/inventory-server';

// Cron runs every 5 minutes via cron-job.org
// Notification rules per activity (if not completed):
//   1. At start_time              → "Empieza ahora"
//   2. At start_time + 15 min    → "En curso · 15 min"
//   3. At limit_time              → "Hora límite alcanzada"
//   4. Every 15 min after limit   → "X min de retraso" until 20:00

const END_OF_DAY = 20 * 60; // 20:00 (fin de jornada)
const WINDOW     = 5;       // cron interval in minutes

function timeToMin(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function inWindow(now: number, trigger: number) {
  return now >= trigger && now < trigger + WINDOW;
}

/** Prende/apaga is_active de las actividades por-semana-del-mes según la fecha.
 *  Así la app del empleado las muestra solo en su semana (sin actualizar la app). */
async function syncMonthlyActive(supabase: SupabaseClient, today: Date) {
  // select('*') para que funcione antes y después de correr supabase/005 (archived_at).
  const { data } = await supabase
    .from('activities')
    .select('*')
    .not('week_of_month', 'is', null);
  for (const a of (data ?? []) as { id: string; week_of_month: number; is_active: boolean; archived_at?: string | null }[]) {
    if (a.archived_at) continue; // archivada: no se vuelve a prender
    const should = matchesWeekOfMonth(a.week_of_month, today);
    if (a.is_active !== should) {
      await supabase.from('activities').update({ is_active: should }).eq('id', a.id);
    }
  }
}

export async function GET(req: Request) {
  // Sólo cron-job.org (con la clave CRON_SECRET; ver lib/cron-auth.ts).
  if (!cronAllowed(req)) return NextResponse.json({ ok: false, error: 'no autorizado' }, { status: 401 });

  const mxNow    = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Matamoros' }));
  const nowMin   = mxNow.getHours() * 60 + mxNow.getMinutes();
  const todayDow = mxNow.getDay();
  const todayStr = `${mxNow.getFullYear()}-${String(mxNow.getMonth() + 1).padStart(2, '0')}-${String(mxNow.getDate()).padStart(2, '0')}`;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Corre siempre (aunque sea fuera de jornada) para captar el cambio de semana.
  await syncMonthlyActive(supabase, mxNow);

  // Inventario por letra: abrir la ronda que toca y mandar sus avisos (si falla, no tumba los recordatorios).
  let inventory: string[] = [];
  try { inventory = await runInventoryTick(supabase, new Date()); }
  catch (e) { inventory = [`inventario error: ${(e as Error).message}`]; }

  if (nowMin > END_OF_DAY) return NextResponse.json({ ok: true, sent: [], inventory, reason: 'fuera de jornada' });

  const [{ data: acts }, { data: comps }, { data: devices }, { data: emps }] = await Promise.all([
    supabase.from('activities').select('*').eq('is_active', true),
    supabase.from('completions').select('activity_id').eq('scheduled_date', todayStr),
    supabase.from('device_tokens').select('token, company_id'),
    supabase.from('employees').select('id, company_id, push_token').eq('is_active', true).not('push_token', 'is', null),
  ]);

  const doneIds   = new Set((comps ?? []).map((c: any) => c.activity_id));
  const allDevices = (devices ?? []) as DeviceRow[];
  const withToken  = (emps ?? []) as EmployeeTokenRow[];
  const sent: string[] = [];

  if (allDevices.length === 0 && withToken.length === 0) return NextResponse.json({ ok: true, sent: [], inventory, reason: 'no devices registered' });

  for (const act of (acts ?? []) as any[]) {
    if (!(act.days_of_week as number[]).includes(todayDow)) continue;
    if (doneIds.has(act.id)) continue;

    // Sólo a su empresa: a la persona asignada si tiene teléfono, si no a los de la empresa.
    const tokens = reminderTargets(act, allDevices, withToken);
    if (tokens.length === 0) continue;

    const startMin  = timeToMin(act.start_time);
    const limitMin  = timeToMin(act.limit_time);
    const limitLbl  = act.limit_time.slice(0, 5);

    // Las opcionales avisan EXACTAMENTE igual que una normal: el dueño no quiere
    // que los empleados sepan cuáles son (sólo el panel no las cuenta si no se hacen).

    // 1. Al inicio
    if (inWindow(nowMin, startMin)) {
      await pushExpo(tokens, act.title, `▶ Empieza ahora · límite ${limitLbl}`);
      sent.push(`${act.title} → inicio`);
      continue;
    }

    // 2. A los 15 min de iniciada
    if (inWindow(nowMin, startMin + 15)) {
      await pushExpo(tokens, act.title, `⏳ En curso · 15 min transcurridos`);
      sent.push(`${act.title} → 15min`);
      continue;
    }

    // 3. Al llegar la hora límite
    if (inWindow(nowMin, limitMin)) {
      await pushExpo(tokens, `⚠ ${act.title}`, `Hora límite (${limitLbl}) — aún sin completar`);
      sent.push(`${act.title} → límite`);
      continue;
    }

    // 4. Cada `reminder_minutes` después del límite hasta fin de jornada
    //    (configurable por actividad desde el panel; mínimo el intervalo del cron)
    if (nowMin > limitMin && nowMin <= END_OF_DAY) {
      const elapsed = nowMin - limitMin;
      const every = act.reminder_minutes && act.reminder_minutes >= WINDOW ? act.reminder_minutes : WINDOW;
      if (elapsed >= every && elapsed % every < WINDOW) {
        await pushExpo(tokens, `🔴 ${act.title}`, `${elapsed} min de retraso · pendiente desde ${limitLbl}`);
        sent.push(`${act.title} → ${elapsed}min tarde`);
      }
    }
  }

  return NextResponse.json({ ok: true, sent, inventory, nowMin, todayStr });
}
