import { finishedMail, lockedMail, escapeHtml } from '../checklist-mail';

const base = {
  activity: 'LIMPIEZA', employee: 'EDDIE', date: '2026-11-24', finishedAt: '2026-11-24T16:40:00Z',
  marks: [
    { area: 'Baño', label: 'Limpiar retrete', state: 'done' as const, reason: null, hasPhoto: true },
    { area: 'Cocina / Comedor', label: 'Rellenar jabón', state: 'skipped' as const, reason: 'no había <jabón>', hasPhoto: false },
  ],
  url: 'https://laferre-admin.vercel.app/firmas?run=abc',
};

it('asunto con actividad, persona y fecha corta', () => {
  expect(finishedMail(base).subject).toBe('LIMPIEZA por firmar — Eddie, martes 24 nov');
});
it('resumen y motivo escapado', () => {
  const m = finishedMail(base);
  expect(m.text).toContain('2 de 2 tareas');
  expect(m.text).toContain('1 no se pudo');
  expect(m.text).toContain('1 foto');
  expect(m.html).toContain('no había &lt;jabón&gt;');
  expect(m.html).toContain('href="https://laferre-admin.vercel.app/firmas?run=abc"');
  expect(m.html).not.toMatch(/undefined|NaN/);
});
it('aviso de PIN bloqueado', () => {
  expect(lockedMail('https://x/ajustes', { minutes: 15 }).subject).toBe('Intentaron firmar con un PIN equivocado');
});
it('escapeHtml', () => { expect(escapeHtml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;'); });
