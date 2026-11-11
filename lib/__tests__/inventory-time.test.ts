import { minutesText, spanText, roundTimeStats } from '../inventory-time';

describe('minutesText', () => {
  test('minutos, horas y días', () => {
    expect(minutesText(25)).toBe('25 min');
    expect(minutesText(60)).toBe('1 h');
    expect(minutesText(95)).toBe('1 h 35 min');
    expect(minutesText(1500)).toBe('1 día 1 h');
    expect(minutesText(2 * 1440)).toBe('2 días');
  });
});

describe('spanText (hora de Matamoros, CST −6 en noviembre)', () => {
  test('mismo día', () => {
    // 16:05 UTC = 10:05 · 17:40 UTC = 11:40
    expect(spanText('2026-11-10T16:05:00Z', '2026-11-10T17:40:00Z'))
      .toBe('La tomó a las 10:05 y la terminó a las 11:40 (1 h 35 min en total).');
  });
  test('pasó de un día → con fecha', () => {
    // mar 10 nov 17:50 → mié 11 nov 09:10 (el 10 de noviembre de 2026 es martes)
    expect(spanText('2026-11-10T23:50:00Z', '2026-11-11T15:10:00Z'))
      .toBe('La tomó el mar 10 nov a las 17:50 y la terminó el mié 11 nov a las 09:10 (15 h 20 min en total).');
  });
  test('sin hora de inicio', () => {
    expect(spanText(null, '2026-11-10T17:40:00Z')).toBe('La terminó a las 11:40.');
  });
});

describe('roundTimeStats', () => {
  const s = (code: string, minutes: number | null, status = 'done') => ({ code, status, minutes_taken: minutes });
  test('promedio y la más tardada, sólo de las hechas con tiempo', () => {
    expect(roundTimeStats([s('A', 30), s('B', 90), s('C', null), s('D', 45, 'pending')]))
      .toEqual({ avg: 60, slowest: { code: 'B', minutes: 90 }, counted: 2 });
  });
  test('sin tiempos → null', () => {
    expect(roundTimeStats([s('A', null)])).toEqual({ avg: null, slowest: null, counted: 0 });
  });
});
