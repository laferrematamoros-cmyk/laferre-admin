// Correos de la lista con firma (supabase/010). Puro: no manda nada (eso es lib/mailer.ts).
// Los correos no respetan hojas de estilo: todo va en línea y con tablas (como el resumen de bfm-rrhh),
// que es lo que Gmail pinta igual en el celular y en la computadora.

export interface MailMark {
  area: string;
  label: string;
  state: 'pending' | 'done' | 'skipped';
  reason: string | null;
  hasPhoto: boolean;
}
export interface FinishedMailInput {
  activity: string;
  employee: string;
  /** YYYY-MM-DD */
  date: string;
  finishedAt: string | null;
  wasLate?: boolean | null;
  marks: MailMark[];
  url: string;
}
export interface Mail { subject: string; html: string; text: string; }

export function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** "EDDIE" → "Eddie" · "MARÍA JOSÉ" → "María José" */
export function titleCase(name: string): string {
  return name.toLocaleLowerCase('es-MX').replace(/(^|\s)(\p{L})/gu, (_, sp: string, ch: string) => sp + ch.toLocaleUpperCase('es-MX'));
}

/** "2026-11-24" → "martes 24 nov" (sin "de", sin coma, sin punto). */
export function shortDate(date: string): string {
  const parts = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' })
    .formatToParts(new Date(`${date}T12:00:00Z`));
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  return `${get('weekday')} ${get('day')} ${get('month').replace('.', '')}`;
}

function shopTime(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Matamoros' }).format(new Date(iso));
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function shell(title: string, body: string): string {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#F4F4F6">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F6">
    <tr><td align="center" style="padding:24px 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
        <tr><td style="padding:0 0 16px">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="background:#0B0B0C;color:#ffffff;font:700 13px Arial,Helvetica,sans-serif;padding:8px 10px;border-radius:8px">LF</td>
            <td style="padding-left:10px;font:700 16px Arial,Helvetica,sans-serif;color:#0B0B0C">Actividades <span style="font-weight:400;color:#77777D">· lista por firmar</span></td>
          </tr></table>
        </td></tr>
        ${body}
        <tr><td style="padding:8px 0 0;font:12px/1.5 Arial,Helvetica,sans-serif;color:#9A9AA0">Este correo lo manda el panel de Actividades.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function button(url: string, label: string): string {
  return `<tr><td align="center" style="padding:10px 0 18px">
          <a href="${escapeHtml(url)}" style="display:inline-block;background:#0B0B0C;color:#ffffff;text-decoration:none;font:600 15px Arial,Helvetica,sans-serif;padding:13px 24px;border-radius:10px">${escapeHtml(label)}</a>
        </td></tr>`;
}

/** "LIMPIEZA por firmar — Eddie, martes 24 nov" + resumen, lo que no se pudo y el botón al panel. */
export function finishedMail(i: FinishedMailInput): Mail {
  const who = titleCase(i.employee);
  const when = shortDate(i.date);
  const total = i.marks.length;
  const resolved = i.marks.filter(m => m.state !== 'pending').length;
  const skipped = i.marks.filter(m => m.state === 'skipped');
  const photos = i.marks.filter(m => m.hasPhoto).length;
  const subject = `${i.activity} por firmar — ${who}, ${when}`;
  const at = i.finishedAt ? ` a las ${shopTime(i.finishedAt)}` : '';
  const late = i.wasLate ? ' (después de la hora límite)' : '';
  const summary = [
    `${resolved} de ${total} tareas`,
    skipped.length ? plural(skipped.length, 'no se pudo', 'no se pudieron') : null,
    photos ? plural(photos, 'foto', 'fotos') : 'sin fotos',
  ].filter(Boolean).join(' · ');

  const text = [
    `${who} terminó ${i.activity} del ${when}${at}${late}.`,
    summary,
    ...(skipped.length ? ['', 'No se pudo:', ...skipped.map(m => `- ${m.label} (${m.area}): ${m.reason ?? ''}`)] : []),
    '',
    `Revisa y firma: ${i.url}`,
  ].join('\n');

  const skippedRows = skipped.map(m => `
            <tr><td style="padding:8px 16px;font:14px/1.45 Arial,Helvetica,sans-serif;color:#2B2622;border-top:1px solid #F1E7D6">
              <b>${escapeHtml(m.label)}</b> <span style="color:#8A7A60">· ${escapeHtml(m.area)}</span><br>${escapeHtml(m.reason ?? '')}
            </td></tr>`).join('');

  const body = `
        <tr><td style="padding:0 0 6px;font:700 20px/1.3 Arial,Helvetica,sans-serif;color:#0B0B0C">${escapeHtml(who)} terminó ${escapeHtml(i.activity)}</td></tr>
        <tr><td style="padding:0 0 16px;font:14px/1.5 Arial,Helvetica,sans-serif;color:#55555B">${escapeHtml(`${when[0].toUpperCase()}${when.slice(1)}${at}${late}`)}</td></tr>
        <tr><td style="padding:0 0 14px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#ffffff;border:1px solid #E6E6EA;border-radius:10px">
            <tr><td style="padding:14px 16px;font:600 15px/1.4 Arial,Helvetica,sans-serif;color:#0B0B0C">${escapeHtml(summary)}</td></tr>
          </table>
        </td></tr>
        ${skipped.length ? `<tr><td style="padding:0 0 14px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#FFFBF2;border:1px solid #F1E7D6;border-left:4px solid #D97706;border-radius:10px">
            <tr><td style="padding:12px 16px 6px;font:600 14px Arial,Helvetica,sans-serif;color:#B45309">No se pudo</td></tr>${skippedRows}
            <tr><td style="padding:0 0 6px"></td></tr>
          </table>
        </td></tr>` : ''}
        ${button(i.url, 'Abrir en el panel')}`;

  return { subject, html: shell(subject, body), text };
}

/** Aviso de PIN bloqueado (N minutos) o apagado (hasta crear uno nuevo). */
export function lockedMail(url: string, info: { minutes: number } | { disabled: true }): Mail {
  const subject = 'Intentaron firmar con un PIN equivocado';
  const what = 'disabled' in info
    ? 'La firma con PIN quedó APAGADA hasta que crees un PIN nuevo en Ajustes.'
    : `La firma con PIN quedó bloqueada ${info.minutes} minutos.`;
  const text = [
    'Alguien escribió 5 veces un PIN equivocado al firmar una lista.',
    what,
    'Puedes seguir firmando desde el panel. Si no fuiste tú, cambia tu PIN.',
    '',
    `Ajustes: ${url}`,
  ].join('\n');
  const body = `
        <tr><td style="padding:0 0 10px;font:700 20px/1.3 Arial,Helvetica,sans-serif;color:#B91C1C">${escapeHtml(subject)}</td></tr>
        <tr><td style="padding:0 0 16px;font:14px/1.6 Arial,Helvetica,sans-serif;color:#2B2622">
          Alguien escribió 5 veces un PIN equivocado al firmar una lista.<br><b>${escapeHtml(what)}</b><br>
          Puedes seguir firmando desde el panel. Si no fuiste tú, cambia tu PIN.
        </td></tr>
        ${button(url, 'Abrir Ajustes')}`;
  return { subject, html: shell(subject, body), text };
}
