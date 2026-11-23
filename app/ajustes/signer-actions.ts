'use server';

import { supabaseAdmin as admin } from '@/lib/supabase';
import { adminAccess, fail, OK, type Result as ActionResult } from '@/lib/admin-access';
import { mailReady, sendMail, validEmail } from '@/lib/mailer';
import { escapeHtml } from '@/lib/checklist-mail';
import { readNotify } from '@/lib/checklist-notices';
import { toStorage, type NotifyEntry } from '@/lib/notify-scope';
import type { SignerResult } from '@/lib/checklist-types';

// Con `export type Result = …`, no `export type { Result }` (ver checklist-actions.ts).
export type Result = ActionResult;

// Ajustes → Firma de listas (supabase/010): nombre con que se firma, PIN y correos del aviso.
// Es UNA configuración para las dos empresas: verla, cualquier administrador; cambiarla, sólo
// uno que ve las dos empresas. El PIN nunca sale de la base (sólo se sabe si existe).
// Cada correo puede ser de las dos empresas o sólo de una (supabase/012, notify_scope).

async function editor() {
  const a = await adminAccess();
  if (!a.ok) return a;
  if (a.own !== null) return { ok: false as const, error: 'Sólo un administrador de las dos empresas puede cambiar la firma.' };
  return a;
}

export async function getSigner(): Promise<SignerResult> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const db = admin();
  const [{ data, error }, n] = await Promise.all([
    db.from('signer_settings').select('signer_name, pin_hash, pin_locked_until, pin_disabled').eq('id', true).maybeSingle(),
    readNotify(db),
  ]);
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'Falta correr el SQL 010 en Supabase.' };
  if (!n.ok) return { ok: false, error: n.error };
  const locked = data.pin_locked_until && new Date(data.pin_locked_until) > new Date() ? data.pin_locked_until as string : null;
  return {
    ok: true,
    signer: {
      name: data.signer_name as string,
      hasPin: !!data.pin_hash,
      emails: n.entries,
      scopeReady: n.scopeReady,
      mailReady: mailReady(),
      lockedUntil: locked,
      pinDisabled: !!data.pin_disabled,
      canEdit: a.own === null,
    },
  };
}

export async function saveSigner(name: string, emails: NotifyEntry[]): Promise<Result> {
  const a = await editor();
  if (!a.ok) return a;
  const n = typeof name === 'string' ? name.trim() : '';
  if (!n || n.length > 60) return fail('Escribe el nombre con que firmas (máximo 60 letras).');
  if (!Array.isArray(emails)) return fail('Correos no válidos.');
  const list: NotifyEntry[] = [];
  for (const e of emails) {
    const email = e && typeof e.email === 'string' ? e.email.trim().toLowerCase() : '';
    if (!email || list.some(x => x.email === email)) continue;
    const companyId = e && typeof e.companyId === 'string' && e.companyId ? e.companyId : null;
    list.push({ email, companyId });
  }
  const bad = list.find(e => !validEmail(e.email));
  if (bad) return fail(`"${bad.email}" no parece un correo.`);
  if (list.length > 5) return fail('Máximo 5 correos.');

  const db = admin();
  const ids = [...new Set(list.map(e => e.companyId).filter((c): c is string => !!c))];
  if (ids.length) {
    const { data: found } = await db.from('companies').select('id').in('id', ids);
    if ((found ?? []).length !== ids.length) return fail('Escoge una empresa válida para cada correo.');
  }
  const cur = await readNotify(db);
  if (!cur.ok) return fail(cur.error);
  if (!cur.scopeReady && ids.length) return fail('Para escoger la empresa de cada correo falta correr el SQL 012 en Supabase.');

  const { emails: notify_emails, scope } = toStorage(list);
  const patch: Record<string, unknown> = { signer_name: n, notify_emails, updated_at: new Date().toISOString() };
  if (cur.scopeReady) patch.notify_scope = scope;
  const { error } = await db.from('signer_settings').update(patch).eq('id', true);
  if (error) return fail(error.message);
  return OK;
}

export async function setSignerPin(pin: string, confirm: string): Promise<Result> {
  const a = await editor();
  if (!a.ok) return a;
  if (typeof pin !== 'string' || !/^[0-9]{4,6}$/.test(pin)) return fail('El PIN debe ser de 4 a 6 números.');
  if (pin !== confirm) return fail('Los dos PIN no son iguales.');
  const { data, error } = await admin().rpc('chk_set_pin', { p_pin: pin });
  if (error) return fail(error.message);
  const r = data as { ok: boolean; error?: string } | null;
  if (!r?.ok) return fail(r?.error ?? 'No se pudo guardar el PIN.');
  return OK;
}

export async function sendTestMail(): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  // La prueba va a todos, sean de la empresa que sean.
  const n = await readNotify(admin());
  if (!n.ok) return fail(n.error);
  const to = n.entries.map(e => e.email);
  const text = 'Así te van a llegar los avisos cuando alguien termine una lista y falte tu firma. Si te llegó, ya quedó.';
  const r = await sendMail(to, {
    subject: 'Prueba: avisos de listas por firmar',
    text,
    html: `<p style="font:15px/1.5 Arial,Helvetica,sans-serif;color:#0B0B0C">${escapeHtml(text)}</p>`,
  });
  return r.ok ? OK : fail(r.error);
}
