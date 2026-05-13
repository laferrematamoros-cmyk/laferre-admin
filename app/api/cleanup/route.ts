import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Called once per day by cron-job.org
// Deletes evidence photos older than 21 days from Storage
// and sets photo_url = null on the completion record

const DAYS = 21;

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DAYS);

  const { data: comps, error } = await supabase
    .from('completions')
    .select('id, photo_url')
    .not('photo_url', 'is', null)
    .lt('completed_at', cutoff.toISOString());

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!comps?.length) return NextResponse.json({ ok: true, deleted: 0 });

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

  return NextResponse.json({ ok: true, deleted: storageDeleted, records: ids.length });
}
