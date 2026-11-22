import 'server-only';
import { supabaseAdmin } from '@/lib/supabase';
import { isUuid } from '@/lib/access-rules';
import { catalogBySlug } from './catalog';
import { firstNameOf, shortDay } from './format';
import type { TrainingStatus } from './status';

/** Lo que necesita la página. Del empleado sólo va el primer nombre: la página es pública. */
export type ViewerInfo =
  | { ok: true; token: string; slug: string; title: string; firstName: string; minSeconds: number;
      previous: { status: TrainingStatus; answeredAt: string; day: string } | null }
  | { ok: false; error: string };

const BAD = 'Este enlace ya no sirve. Ábrela otra vez desde la app.';
const DOWN = 'No se pudo revisar el enlace. Intenta de nuevo en un momento.';
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

/** Revisa la sesión del enlace (?s=) igual que cap_answer, para no enseñar una página que no va a poder contestar. */
export async function loadViewer(slug: string, token: string | undefined): Promise<ViewerInfo> {
  if (!token || !isUuid(token) || !catalogBySlug(slug)) return { ok: false, error: BAD };
  const db = supabaseAdmin();
  const { data: s, error } = await db.from('training_sessions')
    .select('training_id, employee_id, version, opened_at').eq('id', token).maybeSingle();
  if (error) return { ok: false, error: DOWN };
  if (!s || Date.now() - new Date(s.opened_at as string).getTime() > MAX_AGE_MS) return { ok: false, error: BAD };
  const [t, e, p] = await Promise.all([
    db.from('trainings').select('slug, title, is_active, version, min_seconds').eq('id', s.training_id).maybeSingle(),
    db.from('employees').select('name, is_active').eq('id', s.employee_id).maybeSingle(),
    db.from('training_progress').select('status, answered_at')
      .eq('training_id', s.training_id).eq('employee_id', s.employee_id).eq('version', s.version).maybeSingle(),
  ]);
  if (t.error || e.error || p.error) return { ok: false, error: DOWN };
  if (!t.data || t.data.slug !== slug || !e.data?.is_active) return { ok: false, error: BAD };
  if (!t.data.is_active) return { ok: false, error: 'Esta capacitación está en pausa.' };
  if (t.data.version !== s.version) return { ok: false, error: 'Esta capacitación se actualizó. Ábrela otra vez desde la app.' };
  return {
    ok: true, token, slug, title: t.data.title as string, firstName: firstNameOf(e.data.name as string),
    minSeconds: t.data.min_seconds as number,
    // El día se arma aquí: así el servidor y el navegador no pueden escribirlo distinto.
    previous: p.data
      ? { status: p.data.status as TrainingStatus, answeredAt: p.data.answered_at as string, day: shortDay(p.data.answered_at as string) }
      : null,
  };
}
