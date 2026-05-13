import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Cron runs every 5 minutes via cron-job.org
// Notification rules per activity (if not completed):
//   1. At start_time              → "Empieza ahora"
//   2. At start_time + 15 min    → "En curso · 15 min"
//   3. At limit_time              → "Hora límite alcanzada"
//   4. Every 15 min after limit   → "X min de retraso" until 22:00

const ONESIGNAL_APP_ID  = 'b5918ca9-0abf-45f5-9e6d-1d798fc16ffc';
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_REST_API_KEY ?? '';
const END_OF_DAY        = 22 * 60; // 22:00
const WINDOW            = 5;       // cron interval in minutes

function timeToMin(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function inWindow(now: number, trigger: number) {
  return now >= trigger && now < trigger + WINDOW;
}

async function push(ids: string[], title: string, body: string) {
  if (!ONESIGNAL_API_KEY || ids.length === 0) return;
  await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${ONESIGNAL_API_KEY}` },
    body: JSON.stringify({
      app_id:                    ONESIGNAL_APP_ID,
      include_external_user_ids: ids,
      headings: { es: title, en: title },
      contents: { es: body,  en: body  },
      url: 'https://laferre-actividades.vercel.app',
    }),
  });
}

export async function GET() {
  const mxNow    = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Matamoros' }));
  const nowMin   = mxNow.getHours() * 60 + mxNow.getMinutes();
  const todayDow = mxNow.getDay();
  const todayStr = `${mxNow.getFullYear()}-${String(mxNow.getMonth() + 1).padStart(2, '0')}-${String(mxNow.getDate()).padStart(2, '0')}`;

  if (nowMin > END_OF_DAY) return NextResponse.json({ ok: true, sent: [], reason: 'fuera de jornada' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [{ data: acts }, { data: comps }] = await Promise.all([
    supabase.from('activities').select('*').eq('is_active', true),
    supabase.from('completions').select('activity_id').eq('scheduled_date', todayStr),
  ]);

  const doneIds  = new Set((comps ?? []).map((c: any) => c.activity_id));
  const sent: string[] = [];

  for (const act of (acts ?? []) as any[]) {
    if (!(act.days_of_week as number[]).includes(todayDow)) continue;
    if (doneIds.has(act.id)) continue;

    const ids: string[]  = act.assigned_employee_ids ?? [];
    if (ids.length === 0) continue;

    const startMin  = timeToMin(act.start_time);
    const limitMin  = timeToMin(act.limit_time);
    const limitLbl  = act.limit_time.slice(0, 5);

    // 1. Al inicio
    if (inWindow(nowMin, startMin)) {
      await push(ids, act.title, `▶ Empieza ahora · límite ${limitLbl}`);
      sent.push(`${act.title} → inicio`);
      continue;
    }

    // 2. A los 15 min de iniciada
    if (inWindow(nowMin, startMin + 15)) {
      await push(ids, act.title, `⏳ En curso · 15 min transcurridos`);
      sent.push(`${act.title} → 15min`);
      continue;
    }

    // 3. Al llegar la hora límite
    if (inWindow(nowMin, limitMin)) {
      await push(ids, `⚠ ${act.title}`, `Hora límite (${limitLbl}) — aún sin completar`);
      sent.push(`${act.title} → límite`);
      continue;
    }

    // 4. Cada 15 min después del límite hasta fin de jornada
    if (nowMin > limitMin && nowMin <= END_OF_DAY) {
      const elapsed = nowMin - limitMin;
      if (elapsed >= 15 && elapsed % 15 < WINDOW) {
        await push(ids, `🔴 ${act.title}`, `${elapsed} min de retraso · pendiente desde ${limitLbl}`);
        sent.push(`${act.title} → ${elapsed}min tarde`);
      }
    }
  }

  return NextResponse.json({ ok: true, sent, nowMin, todayStr });
}
