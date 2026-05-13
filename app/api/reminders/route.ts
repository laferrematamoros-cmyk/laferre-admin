import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Called by Vercel Cron every 5 minutes.
// Sends OneSignal push to employees whose activity reminder window falls now.

const ONESIGNAL_APP_ID  = 'b5918ca9-0abf-45f5-9e6d-1d798fc16ffc';
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_REST_API_KEY ?? '';
const CRON_SECRET       = process.env.CRON_SECRET ?? '';

function timeToMin(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export async function GET(req: Request) {
  // Protect with a shared secret so only Vercel Cron can call this
  const secret = new URL(req.url).searchParams.get('secret');
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get current time in Mexico (Matamoros = America/Matamoros)
  const mxNow  = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Matamoros' }));
  const nowMin = mxNow.getHours() * 60 + mxNow.getMinutes();
  const todayDow = mxNow.getDay();
  const todayStr = `${mxNow.getFullYear()}-${String(mxNow.getMonth() + 1).padStart(2, '0')}-${String(mxNow.getDate()).padStart(2, '0')}`;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [{ data: acts }, { data: comps }] = await Promise.all([
    supabase.from('activities').select('*').eq('is_active', true),
    supabase.from('completions').select('activity_id').eq('scheduled_date', todayStr),
  ]);

  const doneIds = new Set((comps ?? []).map((c: any) => c.activity_id));
  const sent: string[] = [];

  for (const act of (acts ?? []) as any[]) {
    // Skip if not scheduled today or already done
    if (!(act.days_of_week as number[]).includes(todayDow)) continue;
    if (doneIds.has(act.id)) continue;
    if (!act.reminder_minutes || act.reminder_minutes <= 0) continue;

    const startMin    = timeToMin(act.start_time);
    const reminderMin = startMin - act.reminder_minutes;

    // Send if we're within a 5-minute window of the reminder time
    if (nowMin < reminderMin || nowMin >= reminderMin + 5) continue;

    const employeeIds: string[] = act.assigned_employee_ids ?? [];
    if (employeeIds.length === 0) continue;

    const minLabel = act.reminder_minutes === 1 ? '1 minuto' : `${act.reminder_minutes} minutos`;
    const startLabel = act.start_time.slice(0, 5);

    await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify({
        app_id:                    ONESIGNAL_APP_ID,
        include_external_user_ids: employeeIds,
        headings: { en: act.title, es: act.title },
        contents: { en: `Empieza en ${minLabel} (${startLabel})`, es: `Empieza en ${minLabel} (${startLabel})` },
        url:      'https://laferre-actividades.vercel.app',
      }),
    });

    sent.push(act.title);
  }

  return NextResponse.json({ ok: true, sent, todayStr, nowMin });
}
