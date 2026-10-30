import {
  mondayOf, toDateStr, addWeeks, weekLabel, weekShortLabel, reportRange,
  dueAt, activityStatus, buildWeekReport, buildTrend, ratingOf, pctOf, liveAt,
  type ReportActivity, type ReportCompletion, type ReportEmployee,
} from '../reports';

const MON = new Date(2026, 9, 26);               // lunes 26 oct 2026
const FRI_430PM = new Date(2026, 9, 30, 16, 30); // viernes 30 oct, 4:30 pm

function act(o: Partial<ReportActivity> & { id: string }): ReportActivity {
  return {
    title: o.id, limit_time: '10:00:00', days_of_week: [0, 1, 2, 3, 4, 5, 6], week_of_month: null,
    assigned_employee_ids: [], created_at: '2026-01-01T12:00:00Z', ...o,
  };
}
function comp(activity_id: string, scheduled_date: string, employee_id = 'e1', was_late = false): ReportCompletion {
  return { activity_id, scheduled_date, employee_id, was_late };
}
const EMP: ReportEmployee[] = [
  { id: 'e1', name: 'ANA', initials: 'AN' },
  { id: 'e2', name: 'BETO', initials: 'BE' },
  { id: 'e3', name: 'CARLA', initials: 'CA' },
];

describe('fechas', () => {
  it('mondayOf: miércoles → lunes de esa semana', () => {
    expect(toDateStr(mondayOf(new Date(2026, 5, 24)))).toBe('2026-06-22');
  });
  it('mondayOf: domingo → lunes anterior', () => {
    expect(toDateStr(mondayOf(new Date(2026, 5, 28)))).toBe('2026-06-22');
  });
  it('addWeeks mueve de lunes a lunes', () => {
    expect(toDateStr(addWeeks(MON, -1))).toBe('2026-10-19');
    expect(toDateStr(addWeeks(MON, 1))).toBe('2026-11-02');
  });
  it('weekLabel nombra los dos meses cuando la semana cruza de mes', () => {
    expect(weekLabel(MON)).toBe('26 de octubre al 1 de noviembre');
    expect(weekLabel(new Date(2026, 10, 2))).toBe('2 al 8 de noviembre');
  });
  it('weekShortLabel para el selector', () => {
    expect(weekShortLabel(MON)).toBe('26 oct – 1 nov');
    expect(weekShortLabel(new Date(2026, 10, 2))).toBe('2 – 8 nov');
  });
  it('reportRange: 12 semanas que terminan en la elegida', () => {
    expect(reportRange(MON)).toEqual({ from: '2026-08-10', to: '2026-11-01' });
  });
});

describe('estado de una actividad', () => {
  const FRI = new Date(2026, 9, 30);
  it('dueAt pone la hora límite en la fecha', () => {
    expect(dueAt(FRI, '13:00:00').getTime()).toBe(new Date(2026, 9, 30, 13, 0, 0).getTime());
  });
  it('hecha a tiempo / tarde', () => {
    expect(activityStatus(comp('a', '2026-10-30'), FRI, '13:00:00', FRI_430PM)).toBe('ok');
    expect(activityStatus(comp('a', '2026-10-30', 'e1', true), FRI, '13:00:00', FRI_430PM)).toBe('late');
  });
  it('sin registro: por hacer antes de su hora, sin hacer después', () => {
    expect(activityStatus(undefined, FRI, '13:00:00', new Date(2026, 9, 30, 12, 59))).toBe('todo');
    expect(activityStatus(undefined, FRI, '13:00:00', new Date(2026, 9, 30, 13, 1))).toBe('miss');
  });
  it('un día que no ha llegado es por hacer; uno pasado es sin hacer', () => {
    expect(activityStatus(undefined, new Date(2026, 9, 31), '08:00:00', FRI_430PM)).toBe('todo');
    expect(activityStatus(undefined, new Date(2026, 9, 29), '23:00:00', FRI_430PM)).toBe('miss');
  });
});

describe('buildWeekReport (semana en curso)', () => {
  // a1: diaria de ANA, vence 10:00. a2: general, vence 18:00.
  const acts = [act({ id: 'a1', assigned_employee_ids: ['e1'] }), act({ id: 'a2', limit_time: '18:00:00' })];
  const comps = [
    comp('a1', '2026-10-26', 'e1', true),
    comp('a1', '2026-10-27'), comp('a1', '2026-10-28'), comp('a1', '2026-10-29'),
    comp('a2', '2026-10-26', 'e2'), comp('a2', '2026-10-27', 'e3'),
  ];
  const r = buildWeekReport(MON, acts, comps, EMP, FRI_430PM);

  it('reparte las 14 actividades de la semana en los cuatro estados', () => {
    expect(r.counts).toEqual({ ok: 5, late: 1, miss: 3, todo: 5 });
  });
  it('el porcentaje no cuenta lo que está por hacer', () => {
    expect(r.done).toBe(6);
    expect(r.due).toBe(9);
    expect(r.pct).toBe(67);
  });
  it('hoy queda marcado y separa lo vencido de lo pendiente', () => {
    const fri = r.days[4];
    expect(fri.isToday).toBe(true);
    expect(fri.label).toBe('Vie');
    expect([fri.ok, fri.late, fri.miss, fri.todo]).toEqual([0, 0, 1, 1]);
  });
  it('por persona: hechas por quien la hizo, sin hacer por quien la tenía asignada', () => {
    expect(r.people.map(p => [p.name, p.done, p.late, p.miss])).toEqual([
      ['ANA', 4, 1, 1], ['BETO', 1, 0, 0], ['CARLA', 1, 0, 0],
    ]);
    expect(r.generalMiss).toBe(2);
  });
  it('lista lo que no se hizo en orden de fecha', () => {
    expect(r.missed.map(m => [toDateStr(m.date), m.title, m.assignee, m.limit])).toEqual([
      ['2026-10-28', 'a2', 'General', '18:00'],
      ['2026-10-29', 'a2', 'General', '18:00'],
      ['2026-10-30', 'a1', 'ANA', '10:00'],
    ]);
  });
});

describe('buildWeekReport (casos)', () => {
  const pastNow = new Date(2026, 10, 3, 9, 0); // martes 3 nov: la semana del 26 ya terminó

  it('semana terminada: nada queda por hacer y el % es hechas/programadas', () => {
    const acts = [act({ id: 'a1', assigned_employee_ids: ['e1'] })];
    const r = buildWeekReport(MON, acts, [comp('a1', '2026-10-26'), comp('a1', '2026-10-27')], EMP, pastNow);
    expect(r.counts.todo).toBe(0);
    expect(r.due).toBe(7);
    expect(r.pct).toBe(Math.round(2 / 7 * 100));
  });
  it('con varios asignados y nadie la hizo, cuenta para cada uno pero una sola vez en el total', () => {
    const acts = [act({ id: 'a1', days_of_week: [1], assigned_employee_ids: ['e1', 'e2'] })];
    const r = buildWeekReport(MON, acts, [], EMP, pastNow);
    expect(r.counts.miss).toBe(1);
    expect(r.people.filter(p => p.miss === 1).map(p => p.name)).toEqual(['ANA', 'BETO']);
    expect(r.missed[0].assignee).toBe('ANA, BETO');
  });
  it('si la hace alguien que no la tenía asignada, cuenta como hecha de quien la hizo', () => {
    const acts = [act({ id: 'a1', days_of_week: [1], assigned_employee_ids: ['e1'] })];
    const r = buildWeekReport(MON, acts, [comp('a1', '2026-10-26', 'e2')], EMP, pastNow);
    const byName = Object.fromEntries(r.people.map(p => [p.name, p]));
    expect(byName.BETO.done).toBe(1);
    expect(byName.ANA.done + byName.ANA.miss).toBe(0);
  });
  it('asignada a alguien dado de baja: cuenta con las generales y lo dice', () => {
    const acts = [act({ id: 'a1', days_of_week: [1], assigned_employee_ids: ['baja'] })];
    const r = buildWeekReport(MON, acts, [], EMP, pastNow);
    expect(r.counts.miss).toBe(1);
    expect(r.generalMiss).toBe(1);
    expect(r.missed[0]).toMatchObject({ assignee: 'Sin responsable activo', general: false });
  });
  it('quien no tuvo nada en la semana va al final', () => {
    const acts = [act({ id: 'a1', days_of_week: [1], assigned_employee_ids: ['e3'] })];
    const r = buildWeekReport(MON, acts, [comp('a1', '2026-10-26', 'e3')], EMP, pastNow);
    expect(r.people.map(p => p.name)).toEqual(['CARLA', 'ANA', 'BETO']);
  });
  it('un registro repetido no se cuenta dos veces', () => {
    const acts = [act({ id: 'a1', days_of_week: [1] })];
    const r = buildWeekReport(MON, acts, [comp('a1', '2026-10-26'), comp('a1', '2026-10-26')], EMP, pastNow);
    expect(r.done).toBe(1);
    expect(r.people.find(p => p.id === 'e1')!.done).toBe(1);
  });
  it('respeta created_at: no cuenta días antes de que existiera la actividad', () => {
    const acts = [act({ id: 'a1', created_at: '2026-10-28T15:00:00Z' })]; // creada el miércoles
    const r = buildWeekReport(MON, acts, [], EMP, pastNow);
    expect(r.days.map(d => d.miss)).toEqual([0, 0, 1, 1, 1, 1, 1]);
  });
  it('sin nada vencido no hay porcentaje', () => {
    const r = buildWeekReport(addWeeks(MON, 1), [act({ id: 'a1' })], [], EMP, FRI_430PM);
    expect(r.due).toBe(0);
    expect(r.pct).toBeNull();
  });
});

describe('archivar y pausar sin borrar el pasado', () => {
  const pastNow = new Date(2026, 10, 3, 9, 0);
  const at = (d: number, h: number) => new Date(2026, 9, d, h, 0).toISOString();

  it('liveAt: no cuenta lo archivado ni lo que cae dentro de una pausa', () => {
    const a = { archived_at: at(30, 8), pauses: [{ paused_at: at(20, 0), resumed_at: at(22, 0) }] };
    expect(liveAt(a, new Date(2026, 9, 19, 10))).toBe(true);
    expect(liveAt(a, new Date(2026, 9, 21, 10))).toBe(false);
    expect(liveAt(a, new Date(2026, 9, 23, 10))).toBe(true);
    expect(liveAt(a, new Date(2026, 9, 30, 10))).toBe(false);
    expect(liveAt({}, new Date(2026, 9, 30, 10))).toBe(true);
  });
  it('archivada el miércoles a las 8: cuentan lunes y martes, ya no del miércoles en adelante', () => {
    const r = buildWeekReport(MON, [act({ id: 'a1', archived_at: at(28, 8) })], [], EMP, pastNow);
    expect(r.days.map(d => d.miss)).toEqual([1, 1, 0, 0, 0, 0, 0]);
    expect(r.due).toBe(2);
  });
  it('pausada de martes a jueves al mediodía: esos días no cuentan, el resto sí', () => {
    const r = buildWeekReport(MON, [act({ id: 'a1', pauses: [{ paused_at: at(27, 0), resumed_at: at(29, 12) }] })], [], EMP, pastNow);
    expect(r.days.map(d => d.miss)).toEqual([1, 0, 0, 0, 1, 1, 1]);
  });
  it('una pausa que sigue abierta deja fuera todo lo que viene', () => {
    const r = buildWeekReport(MON, [act({ id: 'a1', pauses: [{ paused_at: at(29, 0), resumed_at: null }] })], [], EMP, pastNow);
    expect(r.days.map(d => d.miss)).toEqual([1, 1, 1, 0, 0, 0, 0]);
  });
});

describe('tendencia y semáforo', () => {
  it('buildTrend devuelve 12 semanas que terminan en la elegida', () => {
    const acts = [act({ id: 'a1', days_of_week: [1] })];
    const t = buildTrend(MON, acts, [comp('a1', '2026-10-19')], EMP, FRI_430PM);
    expect(t).toHaveLength(12);
    expect(toDateStr(t[11].start)).toBe('2026-10-26');
    expect(t[11].label).toBe('26 oct');
    expect(t[10].pct).toBe(100); // 19 oct: la hizo
    expect(t[11].pct).toBe(0);   // 26 oct: el lunes venció sin hacerse
  });
  it('ratingOf usa 90 y 70 como cortes', () => {
    expect([ratingOf(90), ratingOf(89), ratingOf(70), ratingOf(69)]).toEqual(['ok', 'late', 'late', 'miss']);
  });
  it('pctOf redondea y devuelve null sin divisor', () => {
    expect(pctOf(36, 38)).toBe(95);
    expect(pctOf(0, 0)).toBeNull();
  });
});
