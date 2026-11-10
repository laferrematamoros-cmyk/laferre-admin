'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { adminAccess } from '@/lib/admin-access';
import type { DeviceRow } from '@/lib/devices';

interface TokenRow {
  token: string; company_id: string | null; updated_at: string | null;
  app_version?: string | null; update_id?: string | null; update_at?: string | null; employee_id?: string | null;
}

/**
 * Teléfonos registrados para avisos, con su versión de la app. Sólo administradores; uno fijo
 * a una empresa ve sólo los de ella. El token completo nunca sale del servidor.
 * versionsKnown = false mientras no se corra supabase/008_telefonos.sql.
 */
export async function listDevices(): Promise<
  { ok: true; versionsKnown: boolean; rows: DeviceRow[] } | { ok: false; error: string }
> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const db = supabaseAdmin();

  const query = (cols: string) => {
    let q = db.from('device_tokens').select(cols);
    if (a.own) q = q.eq('company_id', a.own);
    return q.order('updated_at', { ascending: false });
  };

  let versionsKnown = true;
  let res = await query('token, company_id, updated_at, app_version, update_id, update_at, employee_id');
  if (res.error?.code === '42703') {
    versionsKnown = false;
    res = await query('token, company_id, updated_at');
  }
  if (res.error) return { ok: false, error: res.error.message };
  const tokens = (res.data ?? []) as unknown as TokenRow[];

  const empIds = [...new Set(tokens.map(t => t.employee_id).filter((x): x is string => !!x))];
  const [{ data: companies }, { data: emps }] = await Promise.all([
    db.from('companies').select('id, name'),
    empIds.length ? db.from('employees').select('id, name').in('id', empIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const companyName = new Map((companies ?? []).map(c => [c.id as string, c.name as string]));
  const empName = new Map((emps ?? []).map(e => [e.id as string, e.name as string]));

  const seen = new Set<string>();
  const shortKey = (token: string) => {
    const base = token.replace(/\]$/, '').slice(-6);
    let k = base;
    for (let i = 2; seen.has(k); i++) k = `${base}-${i}`;
    seen.add(k);
    return k;
  };
  const rows: DeviceRow[] = tokens.map(t => ({
    key: shortKey(t.token),
    companyId: t.company_id,
    companyName: t.company_id ? companyName.get(t.company_id) ?? null : null,
    employeeName: t.employee_id ? empName.get(t.employee_id) ?? null : null,
    appVersion: t.app_version ?? null,
    updateId: t.update_id ?? null,
    updateAt: t.update_at ?? null,
    lastSeen: t.updated_at,
  }));
  return { ok: true, versionsKnown, rows };
}
