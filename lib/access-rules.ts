// Reglas puras de acceso por empresa (se prueban sin servidor). Las usa
// lib/admin-access.ts, que es la que lee la sesión.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);

/**
 * ¿Un usuario puede tocar algo de esa empresa?
 * own = empresa a la que está fijo; null = ve las dos.
 * Algo sin empresa (null) sólo lo toca quien ve las dos.
 */
export function allows(own: string | null, companyId: unknown): boolean {
  if (companyId === null) return own === null;
  return isUuid(companyId) && (own === null || companyId === own);
}

/** Deja sólo las columnas permitidas: la pantalla no puede colar otras (como company_id). */
export function pick(input: unknown, keys: readonly string[]): Record<string, unknown> {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  return Object.fromEntries(keys.filter(k => Object.prototype.hasOwnProperty.call(src, k)).map(k => [k, src[k]]));
}
