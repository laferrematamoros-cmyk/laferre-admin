import {
  addDays, dueDays, latestScheduled, lastDayOf, zonedToUtc, openingInstant, dueInstant,
  roundStatus, inventoryActions, monthLabel, dayLabel, type PlanRow, type OpenRoundInfo,
} from '../inventory-schedule';

const plan = (o: Partial<PlanRow> = {}): PlanRow => ({
  company_id: 'c1', every_weeks: 6, first_open_date: '2026-12-01', due_amount: 1, due_unit: 'weeks', is_active: true, ...o,
});

describe('fechas', () => {
  test('addDays cruza meses y años', () => {
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  test('dueDays en días o semanas', () => {
    expect(dueDays(plan({ due_amount: 5, due_unit: 'days' }))).toBe(5);
    expect(dueDays(plan({ due_amount: 2, due_unit: 'weeks' }))).toBe(14);
  });
  test('latestScheduled: la última fecha programada que ya llegó', () => {
    expect(latestScheduled(plan(), '2026-11-30')).toBeNull();
    expect(latestScheduled(plan(), '2026-12-01')).toBe('2026-12-01');
    expect(latestScheduled(plan(), '2027-01-11')).toBe('2026-12-01');
    expect(latestScheduled(plan(), '2027-01-12')).toBe('2027-01-12');
  });
  test('lastDayOf: con 1 semana, abre el 1 y el último día es el 7', () => {
    expect(lastDayOf('2026-12-01', plan())).toBe('2026-12-07');
    expect(lastDayOf('2026-12-01', plan({ due_amount: 1, due_unit: 'days' }))).toBe('2026-12-01');
  });
  test('zonedToUtc respeta el horario de verano de Matamoros', () => {
    expect(zonedToUtc('2026-12-01', 8 * 60).toISOString()).toBe('2026-12-01T14:00:00.000Z'); // CST −6
    expect(zonedToUtc('2026-07-01', 8 * 60).toISOString()).toBe('2026-07-01T13:00:00.000Z'); // CDT −5
  });
  test('apertura 08:00 y vencimiento 23:59:59 del último día', () => {
    expect(openingInstant('2026-12-01').toISOString()).toBe('2026-12-01T14:00:00.000Z');
    expect(dueInstant('2026-12-01', plan()).toISOString()).toBe('2026-12-08T05:59:59.000Z');
  });
  test('etiquetas en español', () => {
    expect(monthLabel('2026-12-01')).toBe('diciembre');
    expect(dayLabel('2026-12-07')).toBe('lunes 7'); // el 1 de diciembre de 2026 es martes
  });
});

describe('roundStatus', () => {
  const base = { due_at: '2026-12-08T05:59:59.000Z', closed_at: null, close_reason: null } as const;
  test('abierta y a tiempo / atrasada', () => {
    expect(roundStatus(base, new Date('2026-12-05T18:00:00Z'))).toBe('open');
    expect(roundStatus(base, new Date('2026-12-08T07:00:00Z'))).toBe('late');
  });
  test('terminada a tiempo, tarde, o cerrada incompleta', () => {
    expect(roundStatus({ ...base, closed_at: '2026-12-06T20:00:00Z', close_reason: 'completed' }, new Date())).toBe('done');
    expect(roundStatus({ ...base, closed_at: '2026-12-09T20:00:00Z', close_reason: 'completed' }, new Date())).toBe('doneLate');
    expect(roundStatus({ ...base, closed_at: '2027-01-12T14:00:00Z', close_reason: 'superseded' }, new Date())).toBe('incomplete');
  });
});

describe('inventoryActions', () => {
  const at = (iso: string) => new Date(iso);
  const open = (o: Partial<OpenRoundInfo> = {}): OpenRoundInfo => ({
    id: 'r1', opened_at: '2026-12-01T14:00:00Z', due_at: '2026-12-08T05:59:59.000Z', notices: {}, pending: 5, total: 18, ...o,
  });

  test('abre a las 08:00 del día programado, no antes', () => {
    expect(inventoryActions({ plan: plan(), open: null, lastScheduled: null, now: at('2026-12-01T13:55:00Z') })).toEqual([]);
    const acts = inventoryActions({ plan: plan(), open: null, lastScheduled: null, now: at('2026-12-01T14:00:00Z') });
    expect(acts).toEqual([{ kind: 'open', scheduledFor: '2026-12-01', dueAt: '2026-12-08T05:59:59.000Z', supersede: null }]);
  });
  test('no abre si ya existe la ronda de esa fecha, ni si el plan está pausado', () => {
    expect(inventoryActions({ plan: plan(), open: null, lastScheduled: '2026-12-01', now: at('2026-12-02T16:00:00Z') })).toEqual([]);
    expect(inventoryActions({ plan: plan({ is_active: false }), open: null, lastScheduled: null, now: at('2026-12-01T16:00:00Z') })).toEqual([]);
  });
  test('no abre una ronda vieja cuyo plazo ya pasó', () => {
    expect(inventoryActions({ plan: plan({ first_open_date: '2026-10-01' }), open: null, lastScheduled: null, now: at('2026-11-05T16:00:00Z') })).toEqual([]);
  });
  test('si llega la siguiente con la anterior abierta, cierra la anterior como incompleta', () => {
    const acts = inventoryActions({
      plan: plan(), open: open({ notices: { open: 'x' } }), lastScheduled: '2026-12-01', now: at('2027-01-12T14:05:00Z'),
    });
    expect(acts[0]).toEqual({ kind: 'open', scheduledFor: '2027-01-12', dueAt: '2027-01-19T05:59:59.000Z', supersede: 'r1' });
    expect(acts).toHaveLength(1);
  });
  test('aviso de apertura una sola vez', () => {
    const acts = inventoryActions({ plan: plan(), open: open(), lastScheduled: '2026-12-01', now: at('2026-12-01T14:05:00Z') });
    expect(acts).toEqual([{ kind: 'notice', key: 'open', title: 'Inventario de diciembre', body: 'Empezó el inventario: 18 letras, tienen hasta el lunes 7.' }]);
    expect(inventoryActions({ plan: plan(), open: open({ notices: { open: 'x' } }), lastScheduled: '2026-12-01', now: at('2026-12-01T14:10:00Z') })).toEqual([]);
  });
  test('aviso diario a las 10:00 desde el segundo día, mientras falten letras', () => {
    const o = open({ notices: { open: 'x' } });
    expect(inventoryActions({ plan: plan(), open: o, lastScheduled: '2026-12-01', now: at('2026-12-01T16:30:00Z') })).toEqual([]);
    expect(inventoryActions({ plan: plan(), open: o, lastScheduled: '2026-12-01', now: at('2026-12-03T16:00:00Z') })).toEqual([
      { kind: 'notice', key: 'daily:2026-12-03', title: 'Inventario', body: 'Faltan 5 letras del inventario, quedan 5 días.' },
    ]);
    expect(inventoryActions({ plan: plan(), open: { ...o, notices: { open: 'x', 'daily:2026-12-03': 'x' } }, lastScheduled: '2026-12-01', now: at('2026-12-03T16:05:00Z') })).toEqual([]);
    expect(inventoryActions({ plan: plan(), open: { ...o, pending: 0 }, lastScheduled: '2026-12-01', now: at('2026-12-03T16:00:00Z') })).toEqual([]);
  });
  test('el último día: aviso de las 10 y de la 1', () => {
    const o = open({ notices: { open: 'x', 'daily:2026-12-07': 'x' }, pending: 1 });
    expect(inventoryActions({ plan: plan(), open: o, lastScheduled: '2026-12-01', now: at('2026-12-07T19:00:00Z') })).toEqual([
      { kind: 'notice', key: 'last:2026-12-07', title: 'Inventario: hoy es el último día', body: 'Falta 1 letra del inventario.' },
    ]);
  });
  test('atrasado: el aviso diario lo dice', () => {
    const o = open({ notices: { open: 'x' }, pending: 2 });
    expect(inventoryActions({ plan: plan(), open: o, lastScheduled: '2026-12-01', now: at('2026-12-09T16:00:00Z') })).toEqual([
      { kind: 'notice', key: 'daily:2026-12-09', title: 'Inventario atrasado', body: 'El inventario ya venció: faltan 2 letras.' },
    ]);
  });
  test('sin avisos de noche', () => {
    const o = open({ notices: {} });
    expect(inventoryActions({ plan: plan(), open: o, lastScheduled: '2026-12-01', now: at('2026-12-02T03:00:00Z') })).toEqual([]);
  });
  test('ronda abierta a mano (sin plan) también avisa', () => {
    const acts = inventoryActions({ plan: null, open: open(), lastScheduled: null, now: at('2026-12-01T15:00:00Z') });
    expect(acts[0].kind).toBe('notice');
  });
});
