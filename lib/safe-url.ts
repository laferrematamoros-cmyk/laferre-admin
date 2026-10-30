/** Devuelve el enlace sólo si es https; si no, null.
 *  Las fotos de evidencia vienen de registros que la app de empleados inserta con
 *  la llave pública, así que no se confía en lo que traigan antes de abrirlas. */
export function safeHttps(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}
