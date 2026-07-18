import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { matchesWeekOfMonth } from '@/lib/reports';

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
  const { data } = await supabase
    .from('activities')
    .select('id, week_of_month, is_active')
    .not('week_of_month', 'is', null);
  for (const a of (data ?? []) as { id: string; week_of_month: number; is_active: boolean }[]) {
    const should = matchesWeekOfMonth(a.week_of_month, today);
    if (a.is_active !== should) {
      await supabase.from('activities').update({ is_active: should }).eq('id', a.id);
    }
  }
}

async function push(tokens: string[], title: string, body: string) {
  if (tokens.length === 0) return;
  const messages = tokens.map(to => ({ to, title, body, sound: 'default', channelId: 'actividades', priority: 'high' }));
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(messages),
  });
}

export async function GET() {
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

  if (nowMin > END_OF_DAY) return NextResponse.json({ ok: true, sent: [], reason: 'fuera de jornada' });

  const [{ data: acts }, { data: comps }, { data: devices }] = await Promise.all([
    supabase.from('activities').select('*').eq('is_active', true),
    supabase.from('completions').select('activity_id').eq('scheduled_date', todayStr),
    supabase.from('device_tokens').select('token'),
  ]);

  const doneIds   = new Set((comps ?? []).map((c: any) => c.activity_id));
  const allTokens = (devices ?? []).map((d: any) => d.token as string);
  const sent: string[] = [];

  if (allTokens.length === 0) return NextResponse.json({ ok: true, sent: [], reason: 'no devices registered' });

  for (const act of (acts ?? []) as any[]) {
    if (!(act.days_of_week as number[]).includes(todayDow)) continue;
    if (doneIds.has(act.id)) continue;

    const tokens = allTokens;

    const startMin  = timeToMin(act.start_time);
    const limitMin  = timeToMin(act.limit_time);
    const limitLbl  = act.limit_time.slice(0, 5);

    // 1. Al inicio
    if (inWindow(nowMin, startMin)) {
      await push(tokens, act.title, `▶ Empieza ahora · límite ${limitLbl}`);
      sent.push(`${act.title} → inicio`);
      continue;
    }

    // 2. A los 15 min de iniciada
    if (inWindow(nowMin, startMin + 15)) {
      await push(tokens, act.title, `⏳ En curso · 15 min transcurridos`);
      sent.push(`${act.title} → 15min`);
      continue;
    }

    // 3. Al llegar la hora límite
    if (inWindow(nowMin, limitMin)) {
      await push(tokens, `⚠ ${act.title}`, `Hora límite (${limitLbl}) — aún sin completar`);
      sent.push(`${act.title} → límite`);
      continue;
    }

    // 4. Cada `reminder_minutes` después del límite hasta fin de jornada
    //    (configurable por actividad desde el panel; mínimo el intervalo del cron)
    if (nowMin > limitMin && nowMin <= END_OF_DAY) {
      const elapsed = nowMin - limitMin;
      const every = act.reminder_minutes && act.reminder_minutes >= WINDOW ? act.reminder_minutes : WINDOW;
      if (elapsed >= every && elapsed % every < WINDOW) {
        await push(tokens, `🔴 ${act.title}`, `${elapsed} min de retraso · pendiente desde ${limitLbl}`);
        sent.push(`${act.title} → ${elapsed}min tarde`);
      }
    }
  }

  return NextResponse.json({ ok: true, sent, nowMin, todayStr });
}
