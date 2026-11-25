import { checkList, checkNewList, cleanItems, rolNow, rotateTo, overrideSpan } from '../checklist-config';

const ok = { area: ' Baño ', label: ' Limpiar retrete ', days: [6, 2, 4, 2], needs_photo: true };

describe('cleanItems', () => {
  it('limpia espacios, ordena y quita días repetidos', () => {
    const r = cleanItems([ok]);
    expect(r).toEqual({ ok: true, items: [{ area: 'Baño', label: 'Limpiar retrete', days: [2, 4, 6], needs_photo: true, photo_count: 1 }] });
  });
  it('cuántas fotos pide: de 1 a 6; sin foto queda en 1', () => {
    const r = cleanItems([{ ...ok, photo_count: 4 }, { ...ok, needs_photo: false, photo_count: 4 }]);
    expect(r.ok && r.items.map(i => i.photo_count)).toEqual([4, 1]);
    expect(cleanItems([{ ...ok, photo_count: 7 }])).toEqual({ ok: false, error: '"Limpiar retrete" pide un número de fotos no válido (de 1 a 6).' });
    expect(cleanItems([{ ...ok, photo_count: 0 }])).toEqual({ ok: false, error: '"Limpiar retrete" pide un número de fotos no válido (de 1 a 6).' });
    expect(cleanItems([{ ...ok, photo_count: 2.5 }]).ok).toBe(false);
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

describe('checkNewList', () => {
  const A = '11111111-1111-4111-8111-111111111111';
  const B = '22222222-2222-4222-8222-222222222222';
  const C = '33333333-3333-4333-8333-333333333333';
  const task = { area: 'Bodega 1', label: 'Barrer', days: [1, 2], needs_photo: true };

  it('regresa las tareas limpias y el rol con la de esta semana primero', () => {
    expect(checkNewList([task], [A, B, C], B)).toEqual({
      ok: true,
      items: [{ area: 'Bodega 1', label: 'Barrer', days: [1, 2], needs_photo: true, photo_count: 1 }],
      order: [B, C, A],
    });
  });

  it('pide al menos una tarea', () => {
    expect(checkNewList([], [A], A)).toEqual({ ok: false, error: 'Agrega al menos una tarea.' });
  });

  it('usa los mismos errores de las tareas que la pantalla de la lista', () => {
    expect(checkNewList([{ ...task, label: ' ' }], [A], A)).toEqual({ ok: false, error: 'La tarea 1 no tiene nombre.' });
  });

  it('pide al menos una persona en el rol', () => {
    expect(checkNewList([task], [], null)).toEqual({ ok: false, error: 'Agrega al menos una persona al rol.' });
  });

  it('rechaza un rol con repetidos o ids raros', () => {
    expect(checkNewList([task], [A, A], A)).toEqual({ ok: false, error: 'Rol no válido.' });
    expect(checkNewList([task], ['x'], 'x')).toEqual({ ok: false, error: 'Rol no válido.' });
  });

  it('pide a quién le toca esta semana, y que esté en el rol', () => {
    expect(checkNewList([task], [A, B], null)).toEqual({ ok: false, error: 'Elige a quién le toca esta semana.' });
    expect(checkNewList([task], [A, B], C)).toEqual({ ok: false, error: 'Elige a quién le toca esta semana.' });
  });
});

describe('checkList', () => {
  const A = '11111111-1111-4111-8111-111111111111';
  const T = '44444444-4444-4444-8444-444444444444';
  it('al editar conserva el id de las tareas que ya existen', () => {
    const r = checkList([{ id: T, area: 'Unidad 1', label: 'Llantas', days: [1], needs_photo: true, photo_count: 4 }], [A], A);
    expect(r).toEqual({ ok: true, order: [A], items: [{ id: T, area: 'Unidad 1', label: 'Llantas', days: [1], needs_photo: true, photo_count: 4 }] });
  });
  it('checkNewList quita los ids (es una lista nueva)', () => {
    const r = checkNewList([{ id: T, area: 'Unidad 1', label: 'Llantas', days: [1], needs_photo: true }], [A], A);
    expect(r.ok && r.items[0]).toEqual({ area: 'Unidad 1', label: 'Llantas', days: [1], needs_photo: true, photo_count: 1 });
  });
});

describe('rolNow', () => {
  const rot = (ids: string[], anchor: string, from: string, created = '2026-11-01T00:00:00Z') =>
    ({ employee_ids: ids, anchor_week: anchor, valid_from: from, created_at: created });
  it('sin rol: nadie', () => {
    expect(rolNow([], '2026-11-25')).toEqual({ order: [], current: null });
  });
  it('el de esta semana primero, sin cambiar el círculo', () => {
    // Anclado el lunes 16: E esa semana, L la del 23 (la de hoy), Y la del 30.
    expect(rolNow([rot(['E', 'L', 'Y'], '2026-11-16', '2026-11-16')], '2026-11-25')).toEqual({ order: ['L', 'Y', 'E'], current: 'L' });
  });
  it('usa la versión vigente hoy, no una que empieza después', () => {
    const r = rolNow([rot(['E', 'L'], '2026-11-23', '2026-11-20'), rot(['Y'], '2026-11-30', '2026-11-30')], '2026-11-25');
    expect(r).toEqual({ order: ['E', 'L'], current: 'E' });
  });
});
