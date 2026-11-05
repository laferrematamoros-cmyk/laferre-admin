import { buildToday, buildDay, statusLabel, todayStatus, assignLanes, dayRange, type TodayActivity, type TodayCompletion } from '../today';
import type { ReportEmployee } from '../reports';

const WED_3PM = new Date(2026, 9, 28, 15, 0); // miércoles 28 oct 2026, 3:00 pm

function act(o: Partial<TodayActivity> & { id: string }): TodayActivity {
  return {
    title: o.id, description: null, start_time: '08:00:00', limit_time: '09:00:00', days_of_week: [0, 1, 2, 3, 4, 5, 6],
    week_of_month: null, assigned_employee_ids: [], created_at: '2026-01-01T12:00:00Z', ...o,
  };
}
function comp(activity_id: string, employee_id = 'e1', was_late = false, scheduled_date = '2026-10-28'): TodayCompletion {
  return { activity_id, employee_id, was_late, scheduled_date, completed_at: '2026-10-28T15:00:00Z', photo_url: null, note: null };
}
const EMP: ReportEmployee[] = [
  { id: 'e1', name: 'ANA', initials: 'AN' },
  { id: 'e2', name: 'BETO', initials: 'BE' },
  { id: 'e3', name: 'CARLA', initials: 'CA' },
];

describe('todayStatus', () => {
  const start = new Date(2026, 9, 28, 14, 0), limit = new Date(2026, 9, 28, 15, 0);
  it('hecha a tiempo o tarde según el registro', () => {
    expect(todayStatus(comp('a'), start, limit, WED_3PM)).toBe('done');
    expect(todayStatus(comp('a', 'e1', true), start, limit, WED_3PM)).toBe('doneLate');
  });
  it('sin registro: por hacer, en curso o atrasada según la hora', () => {
    expect(todayStatus(undefined, start, limit, new Date(2026, 9, 28, 13, 59))).toBe('upcoming');
    expect(todayStatus(undefined, start, limit, new Date(2026, 9, 28, 14, 0))).toBe('running');
    expect(todayStatus(undefined, start, limit, new Date(2026, 9, 28, 15, 0, 0))).toBe('running');
    expect(todayStatus(undefined, start, limit, new Date(2026, 9, 28, 15, 0, 1))).toBe('overdue');
  });
});

describe('buildToday', () => {
  const acts = [
    act({ id: 'a4', start_time: '16:00:00', limit_time: '17:00:00', assigned_employee_ids: ['e1'] }),
    act({ id: 'a1', start_time: '08:00:00', limit_time: '08:15:00', assigned_employee_ids: ['e1'] }),
    act({ id: 'a2', start_time: '09:00:00', limit_time: '09:15:00' }),
    act({ id: 'a5', start_time: '10:00:00', limit_time: '11:00:00', assigned_employee_ids: ['e2'] }),
    act({ id: 'a3', start_time: '14:30:00', limit_time: '15:30:00', assigned_employee_ids: ['e2'] }),
    act({ id: 'a6', days_of_week: [1] }), // sólo lunes: hoy no toca
  ];
  const comps = [comp('a1', 'e1'), comp('a2', 'e3', true), comp('a2', 'e1'), comp('a5', 'e2', false, '2026-10-27')];
  const r = buildToday(acts, comps, EMP, WED_3PM);

  it('ordena por hora y da el estado de cada una', () => {
    expect(r.rows.map(x => [x.id, x.status])).toEqual([
      ['a1', 'done'], ['a2', 'doneLate'], ['a5', 'overdue'], ['a3', 'running'], ['a4', 'upcoming'],
    ]);
  });
  it('minutos de atraso y minutos que faltan', () => {
    const by = Object.fromEntries(r.rows.map(x => [x.id, x]));
    expect(by.a5.minutesLate).toBe(240);
    expect(by.a3.minutesLeft).toBe(30);
    expect(by.a1.minutesLate).toBeNull();
  });
  it('el porcentaje sólo cuenta lo que ya venció (igual que Reportes)', () => {
    expect(r.counts).toEqual({ done: 1, doneLate: 1, running: 1, upcoming: 1, overdue: 1, optional: 0 });
    expect([r.done, r.due, r.pct]).toEqual([2, 3, 67]);
  });
  it('necesita atención: atrasadas primero, luego lo que vence en 30 min o menos', () => {
    expect(r.attention.map(x => x.id)).toEqual(['a5', 'a3']);
  });
  it('quién la hizo y a quién le toca', () => {
    const a2 = r.rows.find(x => x.id === 'a2')!;
    expect([a2.assignee, a2.general, a2.doneBy]).toEqual(['General', true, 'CARLA']);
  });
  it('equipo hoy: atrasadas primero, luego tarde, luego hechas', () => {
    expect(r.people.map(p => [p.name, p.done, p.late, p.overdue, p.pending])).toEqual([
      ['BETO', 0, 0, 1, 1], ['CARLA', 1, 1, 0, 0], ['ANA', 1, 0, 0, 1],
    ]);
  });
  it('un registro de otro día no cuenta y uno repetido cuenta una vez', () => {
    expect(r.rows.find(x => x.id === 'a5')!.completion).toBeNull();
    expect(r.rows.find(x => x.id === 'a2')!.completion!.employee_id).toBe('e3');
  });
  it('asignada a alguien dado de baja: sin responsable activo y cuenta con las generales', () => {
    const t = buildToday([act({ id: 'x', assigned_employee_ids: ['baja'] })], [], EMP, WED_3PM);
    expect([t.rows[0].assignee, t.rows[0].general, t.generalOverdue]).toEqual(['Sin responsable activo', false, 1]);
  });
  it('temprano en el día no hay porcentaje', () => {
    const t = buildToday([act({ id: 'x', start_time: '16:00:00', limit_time: '17:00:00' })], [], EMP, WED_3PM);
    expect(t.pct).toBeNull();
  });
});

describe('buildDay (otros días, para el Calendario)', () => {
  const acts = [act({ id: 'a', start_time: '10:00:00', limit_time: '11:00:00', assigned_employee_ids: ['e1'] })];
  it('un día pasado sin registro queda sin hacer', () => {
    const d = buildDay(new Date(2026, 9, 26), acts, [], EMP, WED_3PM);
    expect([d.rows[0].status, statusLabel(d.rows[0].status, true), d.pct]).toEqual(['overdue', 'Sin hacer', 0]);
  });
  it('un día pasado con registro de ese día queda hecho', () => {
    const d = buildDay(new Date(2026, 9, 26), acts, [comp('a', 'e1', false, '2026-10-26')], EMP, WED_3PM);
    expect([d.rows[0].status, d.rows[0].doneBy]).toEqual(['done', 'ANA']);
  });
  it('un día futuro queda por hacer y sin porcentaje', () => {
    const d = buildDay(new Date(2026, 9, 30), acts, [], EMP, WED_3PM);
    expect([d.rows[0].status, d.pct]).toEqual(['upcoming', null]);
  });
  it('archivada o en pausa no aparece en el día', () => {
    const arch = [act({ id: 'x', start_time: '10:00:00', limit_time: '11:00:00', archived_at: new Date(2026, 9, 27, 18).toISOString() })];
    expect(buildDay(new Date(2026, 9, 27), arch, [], EMP, WED_3PM).rows).toHaveLength(1);
    expect(buildDay(new Date(2026, 9, 28), arch, [], EMP, WED_3PM).rows).toHaveLength(0);
    const paused = [act({ id: 'p', pauses: [{ paused_at: new Date(2026, 9, 28, 6).toISOString(), resumed_at: null }] })];
    expect(buildToday(paused, [], EMP, WED_3PM).rows).toHaveLength(0);
  });
  it('no aparece en días antes de que se creara la actividad', () => {
    const late = [act({ id: 'n', created_at: '2026-10-28T15:00:00Z' })];
    expect(buildDay(new Date(2026, 9, 27), late, [], EMP, WED_3PM).rows).toHaveLength(0);
    expect(buildDay(new Date(2026, 9, 28), late, [], EMP, WED_3PM).rows).toHaveLength(1);
  });
});

describe('línea del día', () => {
  const row = (id: string, startMin: number, limitMin: number) => ({ id, startMin, limitMin });
  it('acomoda en carriles las que se enciman', () => {
    const lanes = assignLanes([row('a', 480, 540), row('b', 500, 560), row('c', 545, 600), row('d', 510, 520)]);
    expect(lanes).toEqual({ a: 0, b: 1, d: 2, c: 0 });
  });
  it('el rango va de 7 am a 7 pm como mínimo y se estira si hace falta', () => {
    expect(dayRange([row('a', 480, 540)])).toEqual({ from: 420, to: 1140 });
    expect(dayRange([row('a', 390, 540), row('b', 1100, 1215)])).toEqual({ from: 360, to: 1260 });
  });
});

describe('actividades opcionales', () => {
  const normal = act({ id: 'n', start_time: '08:00:00', limit_time: '09:00:00', assigned_employee_ids: ['e1'] });
  const dev = act({ id: 'o', start_time: '08:00:00', limit_time: '09:00:00', assigned_employee_ids: ['e2'], is_optional: true });

  it('pasada su hora y sin marcar queda "opcional", nunca atrasada', () => {
    const r = buildToday([dev], [], EMP, WED_3PM);
    expect(r.rows[0]).toMatchObject({ id: 'o', status: 'optional', optional: true, minutesLate: null });
    expect(r.counts.overdue).toBe(0);
    expect(r.attention).toEqual([]);
    expect(r.pct).toBeNull();
    expect(r.people.find(p => p.id === 'e2')).toMatchObject({ overdue: 0, pending: 0, done: 0 });
    expect(r.generalOverdue).toBe(0);
  });

  it('antes de su hora tampoco cuenta como por hacer', () => {
    const r = buildToday([dev], [], EMP, new Date(2026, 9, 28, 7, 0));
    expect(r.rows[0].status).toBe('optional');
    expect(r.counts.upcoming).toBe(0);
  });

  it('marcada se ve hecha aunque fuera tarde, y no entra al porcentaje', () => {
    const r = buildToday([normal, dev], [comp('n', 'e1'), comp('o', 'e2', true)], EMP, WED_3PM);
    expect(r.rows.find(x => x.id === 'o')).toMatchObject({ status: 'done', doneBy: 'BETO' });
    expect(r.done).toBe(1);
    expect(r.due).toBe(1);
    expect(r.pct).toBe(100);
    expect(r.counts.done).toBe(1);
    expect(r.people.find(p => p.id === 'e2')).toMatchObject({ done: 0, late: 0 });
  });

  it('una normal sin hacer sigue bajando el porcentaje', () => {
    const r = buildToday([normal, dev], [comp('o', 'e2')], EMP, WED_3PM);
    expect(r.pct).toBe(0);
    expect(r.counts.overdue).toBe(1);
  });

  it('lleva su cuenta aparte', () => {
    const otra = act({ id: 'o2', is_optional: true });
    expect(buildToday([dev, otra], [comp('o', 'e2')], EMP, WED_3PM).optional).toEqual({ done: 1, total: 2 });
    expect(buildToday([normal], [], EMP, WED_3PM).optional).toEqual({ done: 0, total: 0 });
  });

  it('statusLabel: en días pasados dice que no se marcó', () => {
    expect(statusLabel('optional', false)).toBe('Opcional');
    expect(statusLabel('optional', true)).toBe('Opcional, sin marcar');
  });
});
