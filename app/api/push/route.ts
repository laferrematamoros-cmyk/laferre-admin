import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasValidSession } from '@/lib/auth';

export async function POST(req: Request) {
  if (!(await hasValidSession())) {
    return NextResponse.json({ error: 'no autorizado' }, { status: 401 });
  }

  const { title, body, companyId } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let q = supabase.from('device_tokens').select('token');
  if (companyId) q = q.eq('company_id', companyId);
  const { data: devices, error: dbError } = await q;

  if (dbError) return NextResponse.json({ ok: false, error: dbError.message }, { status: 500 });

  const tokens = (devices ?? []).map((d: any) => d.token).filter(Boolean);
  if (tokens.length === 0) return NextResponse.json({ ok: false, error: 'no tokens', tokens: [] });

  const messages = tokens.map((to: string) => ({
    to,
    title,
    body,
    sound: 'default',
    channelId: 'actividades',
    priority: 'high',
  }));

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(messages),
  });

  const result = await res.json();
  return NextResponse.json({ ok: true, tokens: tokens.length, result });
}
