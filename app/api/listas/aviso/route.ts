import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isUuid } from '@/lib/access-rules';
import { notifyRun } from '@/lib/checklist-notices';

// La app de teléfonos llama aquí al tocar "Terminé" en una lista con firma (supabase/010).
// Va abierto (sin clave) a propósito: sólo manda el correo si esa lista de verdad está
// terminada y sin aviso, y una sola vez (notifyRun lo reclama en la base). No regresa nada
// de la lista. Si esta llamada se pierde, el cron de /api/reminders lo manda después.
export async function POST(req: Request) {
  let run: unknown = null;
  try { run = ((await req.json()) as { run?: unknown } | null)?.run; } catch { /* cuerpo inválido */ }
  if (!isUuid(run)) return NextResponse.json({ ok: false, error: 'lista inválida' }, { status: 400 });
  await notifyRun(supabaseAdmin(), run);
  return NextResponse.json({ ok: true });
}
