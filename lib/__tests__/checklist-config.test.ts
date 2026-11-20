import { cleanItems, rotateTo, overrideSpan } from '../checklist-config';

const ok = { area: ' Baño ', label: ' Limpiar retrete ', days: [6, 2, 4, 2], needs_photo: true };

describe('cleanItems', () => {
  it('limpia espacios, ordena y quita días repetidos', () => {
    const r = cleanItems([ok]);
    expect(r).toEqual({ ok: true, items: [{ area: 'Baño', label: 'Limpiar retrete', days: [2, 4, 6], needs_photo: true }] });
  });
  it('conserva el id si es válido', () => {
    const id = '0ddf2629-36b8-4aa1-b769-39d45740bb43';
    const r = cleanItems([{ ...ok, id }]);
    expect(r.ok && r.items[0].id).toBe(id);
  });
  it('rechaza lo que no sirve, diciendo cuál', () => {
    expect(cleanItems([{ ...ok, label: '  ' }])).toEqual({ ok: false, error: 'La tarea 1 no tiene nombre.' });
    expect(cleanItems([ok, { ...ok, area: '' }])).toEqual({ ok: false, error: 'La tarea 2 no tiene área.' });
    expect(cleanItems([{ ...ok, days: [] }])).toEqual({ ok: false, error: '"Limpiar retrete" no tiene ningún día.' });
    expect(cleanItems([{ ...ok, days: [7] }])).toEqual({ ok: false, error: '"Limpiar retrete" no tiene ningún día.' });
    expect(cleanItems([{ ...ok, id: 'x' }])).toEqual({ ok: false, error: 'La tarea 1 no es válida.' });
    expect(cleanItems('nada')).toEqual({ ok: false, error: 'Lista no válida.' });
  });
  it('tope de largo y de cantidad', () => {
    expect(cleanItems([{ ...ok, label: 'x'.repeat(121) }])).toEqual({ ok: false, error: 'El nombre de la tarea 1 es muy largo.' });
    expect(cleanItems(Array.from({ length: 61 }, () => ok))).toEqual({ ok: false, error: 'Son demasiadas tareas (máximo 60).' });
  });
  it('una lista vacía es válida (se archivan todas)', () => {
    expect(cleanItems([])).toEqual({ ok: true, items: [] });
  });
});

describe('rotateTo', () => {
  it('deja primero al de esta semana sin cambiar el orden del círculo', () => {
    expect(rotateTo(['E', 'L', 'Y'], 'L')).toEqual(['L', 'Y', 'E']);
    expect(rotateTo(['E', 'L', 'Y'], 'E')).toEqual(['E', 'L', 'Y']);
    expect(rotateTo(['E', 'L', 'Y'], 'Y')).toEqual(['Y', 'E', 'L']);
  });
});

describe('overrideSpan', () => {
  it('semana: de lunes a domingo; día: ese día', () => {
    expect(overrideSpan('week', '2026-11-26')).toEqual({ from: '2026-11-23', to: '2026-11-29' });
    expect(overrideSpan('day', '2026-11-26')).toEqual({ from: '2026-11-26', to: '2026-11-26' });
  });
});
