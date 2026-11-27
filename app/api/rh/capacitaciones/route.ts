import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { bridgeAuthorized } from '@/lib/rh-bridge';
import { isUuid } from '@/lib/access-rules';
import { buildTrainingReport, type CurrentRow, type ProgressRow, type TrainingRow } from '@/lib/rh-capacitaciones';

// Puente con la app de RH (parte 2): las capacitaciones de UNA persona, con su historial de versiones.
// Sólo la llama el SERVIDOR de RH con PUENTE_RH_SECRETO. Sólo lee. ?persona=<id del empleado en Actividades>
export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(req: Request) {
  if (!bridgeAuthorized(req.headers.get('authorization'), process.env.PUENTE_RH_SECRETO)) {
    return json({ error: 'No autorizado.' }, 401);
  }
  const persona = new URL(req.url).searchParams.get('persona');
  if (!isUuid(persona)) return json({ error: 'Falta la persona.' }, 400);

  const db = supabaseAdmin();
  const { data: emp, error: ee } = await db.from('employees').select('id').eq('id', persona).maybeSingle();
  if (ee) return json({ error: 'No se pudo leer.' }, 500);
  if (!emp) return json({ error: 'Esa persona ya no existe en la app de Actividades.' }, 404);

  const [trainings, list, progress] = await Promise.all([
    db.from('trainings').select('id, slug, title, sort_order, version, is_active, theme'),
    db.rpc('cap_list', { p_employee: persona }),
    db.from('training_progress').select('training_id, version, status, answered_at, trained_at, trained_by').eq('employee_id', persona),
  ]);
  if (trainings.error || list.error || progress.error) return json({ error: 'No se pudieron leer sus capacitaciones.' }, 500);

  const current = ((list.data ?? []) as { id: string; status: string; deadline: string }[]) as CurrentRow[];
  return json(buildTrainingReport((trainings.data ?? []) as TrainingRow[], current, (progress.data ?? []) as ProgressRow[]));
}
