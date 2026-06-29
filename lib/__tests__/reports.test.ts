import { mondayOf, weekStartFromInput, weekInputValue, computeWeek, pctOf, toDateStr } from '../reports';

describe('mondayOf', () => {
  it('un miércoles devuelve el lunes de esa semana', () => {
    expect(toDateStr(mondayOf(new Date(2026, 5, 24)))).toBe('2026-06-22'); // mié 24 → lun 22
  });
  it('un domingo devuelve el lunes anterior', () => {
    expect(toDateStr(mondayOf(new Date(2026, 5, 28)))).toBe('2026-06-22'); // dom 28 → lun 22
  });
});

describe('week input (ISO) roundtrip', () => {
  it('weekInputValue → weekStartFromInput devuelve el mismo lunes', () => {
    const mon = mondayOf(new Date(2026, 5, 22));
    expect(toDateStr(weekStartFromInput(weekInputValue(mon)))).toBe('2026-06-22');
  });
  it('parsea un valor ISO conocido (2026-W01 → lun 2025-12-29)', () => {
    expect(toDateStr(weekStartFromInput('2026-W01'))).toBe('2025-12-29');
  });
});

describe('computeWeek', () => {
  const employees = [{ id: 'e1', name: 'Ana' }] as any;
  const weekStart = new Date(2026, 5, 22);          // lunes 22 jun 2026
  const now = new Date(2026, 5, 30, 12, 0);         // semana ya pasada

  const acts = [
    { id: 'a1', title: 'Diaria', days_of_week: [0,1,2,3,4,5,6], assigned_employee_ids: ['e1'], created_at: '2026-06-01T00:00:00Z' },
    { id: 'a2', title: 'Nueva', days_of_week: [0,1,2,3,4,5,6], assigned_employee_ids: [], created_at: '2026-06-25T10:00:00Z' },
  ] as any;
  const comps = [
    { activity_id: 'a1', employee_id: 'e1', scheduled_date: '2026-06-22', was_late: false },
  ] as any;

  it('cuenta solo actividades ya existentes (created_at) y calcula done/total', () => {
    const r = computeWeek(weekStart, acts, comps, employees, now);
    expect(r.total).toBe(11);   // a1: 7 días; a2: jue,vie,sáb,dom = 4 días
    expect(r.done).toBe(1);
    expect(pctOf(r)).toBe(Math.round(1 / 11 * 100));
  });
});