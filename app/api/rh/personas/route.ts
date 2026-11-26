import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { bridgeAuthorized, buildPersonas } from '@/lib/rh-bridge';

// Puente con la app de RH (bfm-rrhh): la lista de personas para vincularlas con su ficha.
// Sólo la llama el SERVIDOR de RH con la contraseña PUENTE_RH_SECRETO (nunca un navegador).
// El middleware no protege /api: lo protege la contraseña. Sólo lee.
export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(req: Request) {
  if (!bridgeAuthorized(req.headers.get('authorization'), process.env.PUENTE_RH_SECRETO)) {
    return json({ error: 'No autorizado.' }, 401);
  }
  const db = supabaseAdmin();
  const [emps, cos, ids] = await Promise.all([
    db.from('employees').select('id, name, company_id, is_active'),
    db.from('companies').select('id, name'),
    db.from('employee_identity').select('employee_id, full_name, updated_by'),
  ]);
  // Sin la 015 todavía, la tabla de nombres completos no existe: se manda la lista sin ellos.
  const err = emps.error ?? cos.error;
  if (err) return json({ error: 'No se pudo leer la lista de personas.' }, 500);
  return json({ personas: buildPersonas(emps.data ?? [], cos.data ?? [], ids.error ? [] : ids.data ?? []) });
}
