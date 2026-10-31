// Clave de los crons (/api/reminders y /api/cleanup), que llama cron-job.org.
// Mientras CRON_SECRET no esté puesta en Vercel, quedan abiertas como antes: así
// se puede subir el código primero, poner la clave en cron-job.org y al final
// activarla en Vercel sin que los recordatorios se apaguen ni un minuto.

/** Compara sin revelar por el tiempo cuántas letras coinciden. */
function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * ¿Puede pasar la llamada? Acepta la clave en el encabezado
 * "Authorization: Bearer <clave>" (lo recomendado) o en "?key=<clave>".
 */
export function cronKeyOk(secret: string | undefined, authHeader: string | null, queryKey: string | null): boolean {
  const s = (secret ?? '').trim();
  if (!s) return true;
  const bearer = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? '';
  return sameText(bearer, s) || sameText((queryKey ?? '').trim(), s);
}

/** Para las rutas: lee la petición y la variable de entorno. */
export function cronAllowed(req: Request): boolean {
  return cronKeyOk(process.env.CRON_SECRET, req.headers.get('authorization'), new URL(req.url).searchParams.get('key'));
}
