import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { bridgeAuthorized, planNombres, type NombreDeRH } from '@/lib/rh-bridge';
import { isUuid } from '@/lib/access-rules';

// Puente con la app de RH: RH manda el nombre completo de las personas VINCULADAS (lo lee de su ficha en su servidor)
// y aquí se guarda en employee_identity como confirmado (updated_by 'rh'). Devuelve, por persona, en qué tienda está.
// Sólo con PUENTE_RH_SECRETO. Única escritura del puente, junto con la confirmación del nuevo ingreso (parte 3).
export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(req: Request) {
  if (!bridgeAuthorized(req.headers.get('authorization'), process.env.PUENTE_RH_SECRETO)) {
    return json({ error: 'No autorizado.' }, 401);
  }
  const body = await req.json().catch(() => null) as { nombres?: unknown } | null;
  const lista = Array.isArray(body?.nombres) ? body!.nombres as unknown[] : null;
  if (!lista || lista.length > 500) return json({ error: 'Lista no válida.' }, 400);
  const input: NombreDeRH[] = lista
    .filter((x): x is { persona: unknown; nombre: unknown } => !!x && typeof x === 'object')
    .map(x => ({ persona: String(x.persona ?? ''), nombre: String(x.nombre ?? '').slice(0, 200) }));
  const ids = [...new Set(input.map(x => x.persona).filter(isUuid))];

  const db = supabaseAdmin();
  const [emps, cos, idents] = await Promise.all([
    ids.length ? db.from('employees').select('id, company_id').in('id', ids) : Promise.resolve({ data: [], error: null }),
    db.from('companies').select('id, name'),
    ids.length ? db.from('employee_identity').select('employee_id, full_name').in('employee_id', ids) : Promise.resolve({ data: [], error: null }),
  ]);
  if (emps.error || cos.error || idents.error) return json({ error: 'No se pudo leer.' }, 500);

  const plan = planNombres(input, emps.data ?? [], cos.data ?? [], idents.data ?? []);
  if (plan.upserts.length) {
    const now = new Date().toISOString();
    const { error } = await db.from('employee_identity')
      .upsert(plan.upserts.map(u => ({ ...u, updated_at: now, updated_by: 'rh' })), { onConflict: 'employee_id' });
    if (error) return json({ error: 'No se pudieron guardar los nombres.' }, 500);
  }
  const cuenta = (e: string) => plan.resultados.filter(r => r.estado === e).length;
  return json({ resultados: plan.resultados, actualizados: cuenta('actualizado'), iguales: cuenta('igual'), rechazados: cuenta('rechazado') });
}
