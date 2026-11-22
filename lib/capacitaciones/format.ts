// Textos de la página de la animación. Puro (sirve en el servidor y en el navegador).

const TZ = 'America/Matamoros';

/** "EDDIE GARCÍA" → "Eddie". A la página pública sólo le llega esto, no el nombre completo. */
export function firstNameOf(full: string | null | undefined): string {
  const w = (full ?? '').trim().split(/\s+/)[0] ?? '';
  return w ? w.charAt(0).toLocaleUpperCase('es-MX') + w.slice(1).toLocaleLowerCase('es-MX') : '';
}

/** "21 nov", con el día de Matamoros. */
export function shortDay(iso: string): string {
  const parts = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: TZ }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  return `${get('day')} ${get('month').replace('.', '')}`;
}

/**
 * Vista previa del admin: el título y el tiempo guardados en Ajustes (fila de `trainings`), para que
 * "Ver" enseñe lo que verá el empleado. Sin fila (la tabla aún no existe, o no se ha sincronizado)
 * o con un valor fuera de lo que acepta la base (5–600 s), lo del catálogo.
 */
export function previewSettings(
  catalog: { title: string; minSeconds: number },
  saved: { title?: unknown; min_seconds?: unknown } | null | undefined,
): { title: string; minSeconds: number } {
  const t = saved?.title, ms = saved?.min_seconds;
  return {
    title: typeof t === 'string' && t.trim() ? t : catalog.title,
    minSeconds: typeof ms === 'number' && Number.isInteger(ms) && ms >= 5 && ms <= 600 ? ms : catalog.minSeconds,
  };
}
