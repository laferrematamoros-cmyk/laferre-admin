import { compareVersions, phoneStates, isStale, summarizePhones, type DeviceRow } from '../devices';

const row = (p: Partial<DeviceRow>): DeviceRow => ({
  key: p.key ?? 'k', companyId: 'lf', companyName: 'La Ferre', employeeName: null,
  appVersion: null, updateId: null, updateAt: null, lastSeen: '2026-11-10T16:00:00Z', ...p,
});

describe('compareVersions', () => {
  test('por número, no por texto', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(compareVersions('1.1.0', '1.1.0')).toBe(0);
    expect(compareVersions('1.1', '1.1.0')).toBe(0);
    expect(compareVersions('1.0.9', '1.1.0')).toBeLessThan(0);
  });
});

describe('phoneStates', () => {
  test('sin columnas de versión (SQL sin correr) → no se sabe', () => {
    expect(phoneStates([row({ key: 'a', appVersion: '1.1.0' })], false).get('a')).toBe('unknown');
  });
  test('sin versión → app vieja (antes de 1.1.0)', () => {
    expect(phoneStates([row({ key: 'a' })], true).get('a')).toBe('old');
  });
  test('versión menor que la de otro teléfono de la empresa → app vieja', () => {
    const s = phoneStates([row({ key: 'a', appVersion: '1.1.0' }), row({ key: 'b', appVersion: '1.2.0' })], true);
    expect(s.get('a')).toBe('old');
    expect(s.get('b')).toBe('current');
  });
  test('misma versión pero actualización más vieja → le falta abrir la app', () => {
    const s = phoneStates([
      row({ key: 'a', appVersion: '1.1.0', updateAt: '2026-11-12T16:00:00Z' }),
      row({ key: 'b', appVersion: '1.1.0', updateAt: null }),
      row({ key: 'c', appVersion: '1.1.0', updateAt: '2026-11-11T16:00:00Z' }),
    ], true);
    expect(s.get('a')).toBe('current');
    expect(s.get('b')).toBe('behind');
    expect(s.get('c')).toBe('behind');
  });
  test('cada empresa se compara sólo con la suya', () => {
    const s = phoneStates([
      row({ key: 'a', companyId: 'lf', appVersion: '1.1.0', updateAt: '2026-11-12T16:00:00Z' }),
      row({ key: 'b', companyId: 'bfm', appVersion: '1.1.0', updateAt: '2026-11-01T16:00:00Z' }),
    ], true);
    expect(s.get('a')).toBe('current');
    expect(s.get('b')).toBe('current');
  });
  test('todos de fábrica (sin actualizaciones) → al día', () => {
    const s = phoneStates([row({ key: 'a', appVersion: '1.1.0' }), row({ key: 'b', appVersion: '1.1.0' })], true);
    expect(s.get('a')).toBe('current');
    expect(s.get('b')).toBe('current');
  });
});

describe('isStale', () => {
  const now = new Date('2026-11-10T16:00:00Z');
  test('abierto hace poco → no', () => { expect(isStale('2026-11-01T16:00:00Z', now)).toBe(false); });
  test('más de 21 días sin abrir → sí', () => { expect(isStale('2026-10-15T16:00:00Z', now)).toBe(true); });
  test('sin fecha → sí', () => { expect(isStale(null, now)).toBe(true); });
});

describe('summarizePhones', () => {
  test('cuenta los al día sin contar los abandonados', () => {
    const now = new Date('2026-11-10T16:00:00Z');
    const rows = [
      row({ key: 'a', appVersion: '1.1.0' }),
      row({ key: 'b' }),
      row({ key: 'c', lastSeen: '2026-09-01T16:00:00Z' }),
    ];
    expect(summarizePhones(rows, phoneStates(rows, true), now)).toEqual({ active: 2, current: 1, stale: 1 });
  });
});
