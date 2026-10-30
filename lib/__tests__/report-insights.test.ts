import { buildInsights, joinEs, dailyPeek, trendPeek } from '../report-insights';
import type { WeekReport, DayReport, PersonRow, TrendPoint } from '../reports';

const MON = new Date(2026, 9, 26);
function day(i: number, c: Partial<DayReport> = {}): DayReport {
  return { date: new Date(2026, 9, 26 + i), label: '', isToday: false, ok: 0, late: 0, miss: 0, todo: 0, ...c };
}
function report(o: Partial<WeekReport>): WeekReport {
  return {
    weekStart: MON, counts: { ok: 0, late: 0, miss: 0, todo: 0 }, done: 0, due: 0, pct: null,
    days: [0, 1, 2, 3, 4, 5, 6].map(i => day(i)), people: [], generalMiss: 0, missed: [], ...o,
  };
}
const person = (name: string, miss: number): PersonRow => ({ id: name, name, initials: name.slice(0, 2), done: 3, late: 0, miss });

describe('joinEs', () => {
  it('une con comas y "y"', () => {
    expect(joinEs(['a'])).toBe('a');
    expect(joinEs(['a', 'b'])).toBe('a y b');
    expect(joinEs(['a', 'b', 'c'])).toBe('a, b y c');
  });
});

describe('buildInsights', () => {
  const base = report({
    counts: { ok: 23, late: 13, miss: 2, todo: 13 }, done: 36, due: 38, pct: 95,
    days: [day(0, { late: 4 }), day(1, { late: 4 }), day(2, { late: 4 }), day(3, { late: 1 }), day(4), day(5), day(6)],
    people: [person('YAJAIRA', 1), person('EDDIE', 0)], generalMiss: 1,
  });

  it('arma las tres frases en orden: sin hacer, tarde, comparación', () => {
    expect(buildInsights(base, 90, true)).toEqual([
      { tone: 'miss', icon: 'x', title: '2 quedaron sin hacer', detail: 'YAJAIRA (1) · Generales (1)' },
      { tone: 'late', icon: 'clock', title: '1 de cada 3 se hizo tarde', detail: '13 de 36' },
      { tone: 'ok', icon: 'up', title: 'Mejor que la semana pasada', detail: '95% contra 90%' },
    ]);
  });
  it('el practicante no ve cuántas tiene cada quien', () => {
    expect(buildInsights(base, 90, false)[0].detail).toBe('YAJAIRA · Generales');
  });
  it('dice "sobre todo el ..." cuando un día junta 40% o más de lo tarde', () => {
    const r = report({
      counts: { ok: 10, late: 5, miss: 0, todo: 0 }, done: 15, due: 15, pct: 100,
      days: [day(0, { late: 3 }), day(1, { late: 2 }), day(2), day(3), day(4), day(5), day(6)],
    });
    expect(buildInsights(r, null, true)[1]).toEqual({
      tone: 'late', icon: 'clock', title: '1 de cada 3 se hizo tarde', detail: '5 de 15, sobre todo el lunes',
    });
  });
  it('la mitad o más tarde', () => {
    const r = report({ counts: { ok: 2, late: 3, miss: 0, todo: 0 }, done: 5, due: 5, pct: 100 });
    expect(buildInsights(r, null, true)[1].title).toBe('La mitad o más se hizo tarde');
  });
  it('sin pendientes ni tarde: frases en verde', () => {
    const r = report({ counts: { ok: 8, late: 0, miss: 0, todo: 2 }, done: 8, due: 8, pct: 100 });
    expect(buildInsights(r, 100, true)).toEqual([
      { tone: 'ok', icon: 'check', title: 'No quedó nada sin hacer', detail: 'Todo lo que ya tocaba se hizo' },
      { tone: 'ok', icon: 'clock', title: 'Todo lo hecho fue a tiempo', detail: 'Nada se hizo después de su hora' },
      { tone: 'ok', icon: 'equal', title: 'Igual que la semana pasada', detail: '100% contra 100%' },
    ]);
  });
  it('peor que la semana pasada', () => {
    const r = report({ counts: { ok: 8, late: 0, miss: 2, todo: 0 }, done: 8, due: 10, pct: 80, generalMiss: 2 });
    expect(buildInsights(r, 90, true)[2]).toEqual({
      tone: 'late', icon: 'down', title: 'Peor que la semana pasada', detail: '80% contra 90%',
    });
  });
  it('semana sin nada vencido: no dice nada', () => {
    expect(buildInsights(report({ counts: { ok: 0, late: 0, miss: 0, todo: 5 } }), 90, true)).toEqual([]);
  });
});

describe('resúmenes de una línea', () => {
  it('dailyPeek nombra los días con algo sin hacer', () => {
    const r = report({ due: 10, days: [day(0, { miss: 1 }), day(1), day(2), day(3), day(4, { miss: 1, isToday: true }), day(5), day(6)] });
    expect(dailyPeek(r)).toBe('Quedó algo sin hacer el lunes y hoy');
    expect(dailyPeek(report({ due: 10 }))).toBe('Ningún día quedó algo sin hacer');
    expect(dailyPeek(report({ due: 0 }))).toBe('Todavía no vence nada esta semana');
  });
  it('trendPeek promedia sólo semanas con datos', () => {
    const pts: TrendPoint[] = [80, null, 100, 90].map((pct, i) => ({ start: new Date(2026, 9, 5 + i * 7), label: '', pct }));
    expect(trendPeek(pts)).toBe('Promedio de 3 semanas: 90% · 2 llegaron a la meta');
    expect(trendPeek([])).toBe('Todavía no hay semanas con datos');
  });
});
