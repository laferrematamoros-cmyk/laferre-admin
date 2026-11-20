import { dutyOn, assignedOn, isSigning, mondayOf, upcomingDuty, type Rotation, type DutyOverride } from '../duty';

const E = 'eddie', L = 'laura', Y = 'yaja';
const rot: Rotation = { employee_ids: [E, L, Y], anchor_week: '2026-11-16', valid_from: '2026-11-16', created_at: '2026-11-20T10:00:00Z' };

describe('dutyOn', () => {
  it('rota cada lunes y se repite', () => {
    expect(dutyOn([rot], [], '2026-11-16')).toBe(E);
    expect(dutyOn([rot], [], '2026-11-22')).toBe(E); // domingo: misma semana
    expect(dutyOn([rot], [], '2026-11-23')).toBe(L);
    expect(dutyOn([rot], [], '2026-11-30')).toBe(Y);
    expect(dutyOn([rot], [], '2026-12-07')).toBe(E);
  });
  it('antes de que existiera el rol no hay nadie', () => {
    expect(dutyOn([rot], [], '2026-11-15')).toBeNull();
  });
  it('una versión nueva no cambia las semanas anteriores', () => {
    const v2: Rotation = { employee_ids: [Y, E], anchor_week: '2026-12-07', valid_from: '2026-12-07', created_at: '2026-12-05T10:00:00Z' };
    expect(dutyOn([rot, v2], [], '2026-11-30')).toBe(Y);
    expect(dutyOn([rot, v2], [], '2026-12-07')).toBe(Y);
    expect(dutyOn([rot, v2], [], '2026-12-14')).toBe(E);
  });
  it('gana el cambio más reciente que cubre el día', () => {
    const ov: DutyOverride[] = [
      { from_date: '2026-11-23', to_date: '2026-11-29', employee_id: Y, created_at: '2026-11-20T10:00:00Z' },
      { from_date: '2026-11-25', to_date: '2026-11-25', employee_id: E, created_at: '2026-11-21T10:00:00Z' },
    ];
    expect(dutyOn([rot], ov, '2026-11-24')).toBe(Y);
    expect(dutyOn([rot], ov, '2026-11-25')).toBe(E);
    expect(dutyOn([rot], ov, '2026-11-30')).toBe(Y); // fuera del cambio: el rol
  });
  it('semanas con índice negativo (fecha anterior al ancla en una versión válida)', () => {
    const r: Rotation = { ...rot, anchor_week: '2026-11-30', valid_from: '2026-11-01' };
    expect(dutyOn([r], [], '2026-11-23')).toBe(Y); // una semana antes del ancla → último
  });
});

describe('assignedOn / isSigning', () => {
  it('sin rol usa los asignados de siempre', () => {
    expect(assignedOn({ assigned_employee_ids: [L] }, '2026-11-23')).toEqual([L]);
  });
  it('con rol usa al de turno; sin nadie de turno queda general', () => {
    expect(assignedOn({ assigned_employee_ids: [], rotations: [rot] }, '2026-11-23')).toEqual([L]);
    expect(assignedOn({ assigned_employee_ids: [], rotations: [rot] }, '2026-11-10')).toEqual([]);
  });
  it('isSigning', () => {
    expect(isSigning({ signingDates: ['2026-11-23'] }, '2026-11-23')).toBe(true);
    expect(isSigning({}, '2026-11-23')).toBe(false);
  });
});

describe('mondayOf / upcomingDuty', () => {
  it('mondayOf', () => {
    expect(mondayOf('2026-11-20')).toBe('2026-11-16');
    expect(mondayOf('2026-11-22')).toBe('2026-11-16');
    expect(mondayOf('2026-11-23')).toBe('2026-11-23');
  });
  it('esta semana y las 4 siguientes', () => {
    expect(upcomingDuty([rot], [], '2026-11-20', 5).map(w => [w.weekStart, w.employeeId])).toEqual([
      ['2026-11-16', E], ['2026-11-23', L], ['2026-11-30', Y], ['2026-12-07', E], ['2026-12-14', L],
    ]);
  });
});
