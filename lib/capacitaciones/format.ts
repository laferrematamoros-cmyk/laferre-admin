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
