// A quién le llega cada aviso de "lista por firmar" (supabase/012).
// En la base: signer_settings.notify_emails (todos los correos) y notify_scope
// ({ correo: id de empresa }). Un correo que no está en notify_scope es de las dos empresas.

export interface NotifyEntry { email: string; companyId: string | null }

/** Junta las dos columnas. Aguanta que notify_scope no exista todavía (antes del SQL 012). */
export function parseNotify(emails: unknown, scope: unknown): NotifyEntry[] {
  const map = scope && typeof scope === 'object' && !Array.isArray(scope) ? scope as Record<string, unknown> : {};
  const list = Array.isArray(emails) ? emails : [];
  return list
    .filter((e): e is string => typeof e === 'string' && e.trim() !== '')
    .map(email => {
      const c = map[email];
      return { email, companyId: typeof c === 'string' && c ? c : null };
    });
}

/** Correos para una lista de esa empresa: los de las dos y los de ella. */
export function recipientsFor(entries: NotifyEntry[], companyId: string): string[] {
  return entries.filter(e => e.companyId === null || e.companyId === companyId).map(e => e.email);
}

/** El PIN es uno para las dos empresas: se avisa a los de las dos (y si no hay, a todos). */
export function lockRecipients(entries: NotifyEntry[]): string[] {
  const both = entries.filter(e => e.companyId === null).map(e => e.email);
  return both.length ? both : entries.map(e => e.email);
}

/** Para guardar: la lista de correos y sólo los que son de una empresa. */
export function toStorage(entries: NotifyEntry[]): { emails: string[]; scope: Record<string, string> } {
  const scope: Record<string, string> = {};
  for (const e of entries) if (e.companyId) scope[e.email] = e.companyId;
  return { emails: entries.map(e => e.email), scope };
}
