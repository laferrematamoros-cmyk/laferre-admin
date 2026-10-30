import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasValidSession } from '@/lib/auth';

export async function POST(req: Request) {
  if (!(await hasValidSession())) {
    return NextResponse.json({ error: 'no autorizado' }, { status: 401 });
  }

  const { title, body, companyId, employeeIds } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Si vienen empleados, el aviso va sólo a sus teléfonos (la app guarda el token
  // de cada quien al escoger su nombre). Si ninguno tiene teléfono registrado,
  // o no vienen empleados (actividad general, Urgente), va a toda la empresa.
  let tokens: string[] = [];
  let target: 'personas' | 'todos' = 'todos';
  if (Array.isArray(employeeIds) && employeeIds.length > 0) {
    const { data: emps, error } = await supabase
      .from('employees').select('push_token').in('id', employeeIds).not('push_token', 'is', null);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    tokens = (emps ?? []).map((e: { push_token: string | null }) => e.push_token).filter((t): t is string => !!t);
    if (tokens.length > 0) target = 'personas';
  }

  if (tokens.length === 0) {
    let q = supabase.from('device_tokens').select('token');
    if (companyId) q = q.eq('company_id', companyId);
    const { data: devices, error: dbError } = await q;
    if (dbError) return NextResponse.json({ ok: false, error: dbError.message }, { status: 500 });
    tokens = (devices ?? []).map((d: { token: string | null }) => d.token).filter((t): t is string => !!t);
  }

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
  return NextResponse.json({ ok: true, tokens: tokens.length, target, result });
}
