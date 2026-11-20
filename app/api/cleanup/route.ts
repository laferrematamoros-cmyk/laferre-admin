import { NextResponse } from 'next/server';
import { cronAllowed } from '@/lib/cron-auth';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Called once per day by cron-job.org
// Deletes evidence photos older than 21 days from Storage
// and sets photo_url = null on the completion record

const DAYS = 21;

/** Fotos de las listas con firma (supabase/010, depósito privado "listas") con más de 21 días:
 *  se borran del depósito y la palomita se queda (sin foto). Sin la 010, no hace nada. */
async function cleanChecklistPhotos(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.rpc('chk_old_photos', { p_days: DAYS });
  if (error || !Array.isArray(data) || data.length === 0) return 0;
  const names = data as string[];
  const { data: removed } = await supabase.storage.from('listas').remove(names);
  await supabase.from('checklist_marks').update({ photo_path: null }).in('photo_path', names);
  return removed?.length ?? 0;
}

export async function GET(req: Request) {
  // Sólo cron-job.org (con la clave CRON_SECRET; ver lib/cron-auth.ts).
  if (!cronAllowed(req)) return NextResponse.json({ ok: false, error: 'no autorizado' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let listas = 0;
  try { listas = await cleanChecklistPhotos(supabase); } catch { /* no tumba la limpieza de evidencia */ }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DAYS);

  const { data: comps, error } = await supabase
    .from('completions')
    .select('id, photo_url')
    .not('photo_url', 'is', null)
    .lt('completed_at', cutoff.toISOString());

  if (error) return NextResponse.json({ ok: false, error: error.message, listas }, { status: 500 });
  if (!comps?.length) return NextResponse.json({ ok: true, deleted: 0, listas });

  // Extract storage paths from public URLs
  const MARKER = '/public/evidence/';
  const paths = comps
    .map(c => {
      const idx = (c.photo_url as string).indexOf(MARKER);
      return idx >= 0 ? (c.photo_url as string).slice(idx + MARKER.length) : null;
    })
    .filter((p): p is string => p !== null);

  let storageDeleted = 0;
  if (paths.length) {
    const { data } = await supabase.storage.from('evidence').remove(paths);
    storageDeleted = data?.length ?? 0;
  }

  // Null out photo_url on completion records
  const ids = comps.map(c => c.id);
  await supabase.from('completions').update({ photo_url: null }).in('id', ids);

  return NextResponse.json({ ok: true, deleted: storageDeleted, records: ids.length, listas });
}
