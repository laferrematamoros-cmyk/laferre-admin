// Clave de los crons (/api/reminders y /api/cleanup), que llama cron-job.org con
// el encabezado "Authorization: Bearer <CRON_SECRET>" (puesto el 2026-10-31).
// Si la variable falta en Vercel, quedan CERRADAS: mejor sin avisos (y se nota
// en cron-job.org, que manda correo) que abiertas para cualquiera.

/** Compara sin revelar por el tiempo cuántas letras coinciden. */
function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * ¿Puede pasar la llamada? Sólo con el encabezado "Authorization: Bearer <clave>".
 * No se acepta en la dirección (?key=): ahí quedaría escrita en los registros
 * de Vercel y de cron-job.org.
 */
export function cronKeyOk(secret: string | undefined, authHeader: string | null): boolean {
  const s = (secret ?? '').trim();
  if (!s) return false;
  const bearer = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? '';
  return sameText(bearer, s);
}

/** Para las rutas: lee la petición y la variable de entorno. */
export function cronAllowed(req: Request): boolean {
  return cronKeyOk(process.env.CRON_SECRET, req.headers.get('authorization'));
}
