import {
  tabFromSearch, tabHref, limitError, parseLimit, groupPeople, initials, friendlyLoadError, stamp, sinceLabel,
  canEditShared, SHARED_EDIT_ONLY, matrixSizeError, MATRIX_MAX_ROWS, addBusy, removeBusy, type BusyMap,
} from '../capacitaciones/admin-view';

describe('quién cambia los ajustes', () => {
  it('sólo un admin que ve las dos empresas (own = null)', () => {
    expect(canEditShared(null)).toBe(true);
    expect(canEditShared('c0000000-0000-4000-8000-000000000001')).toBe(false);
    expect(canEditShared('')).toBe(false);
    expect(SHARED_EDIT_ONLY).toBe('Sólo un administrador de las dos empresas puede cambiar las capacitaciones.');
  });
});

describe('guardados en curso por renglón', () => {
  it('dos guardados del mismo renglón no se pisan', () => {
    let m: BusyMap<'switch' | 'deadline_days'> = {};
    m = addBusy(m, 'r1', 'switch');
    m = addBusy(m, 'r1', 'deadline_days');
    m = addBusy(m, 'r2', 'switch');
    expect(m).toEqual({ r1: ['switch', 'deadline_days'], r2: ['switch'] });
    m = removeBusy(m, 'r1', 'switch'); // termina el primero: el segundo sigue
    expect(m.r1).toEqual(['deadline_days']);
    m = removeBusy(m, 'r1', 'switch'); // quitar lo que no está no cambia nada
    expect(m.r1).toEqual(['deadline_days']);
    m = removeBusy(m, 'r1', 'deadline_days');
    expect(m).toEqual({ r2: ['switch'] });
  });
  it('el mismo guardado dos veces cuenta dos veces', () => {
    const m = removeBusy(addBusy(addBusy({}, 'r', 'move'), 'r', 'move'), 'r', 'move');
    expect(m).toEqual({ r: ['move'] });
  });
});

describe('tope de filas de la tabla', () => {
  it('con 1,000 filas puede venir cortada: error claro en vez de tabla incompleta', () => {
    expect(MATRIX_MAX_ROWS).toBe(1000);
    expect(matrixSizeError(0)).toBeNull();
    expect(matrixSizeError(999)).toBeNull();
    expect(matrixSizeError(1000)).toBe('La tabla tiene demasiadas filas para mostrarse; avísale a Claude.');
    expect(matrixSizeError(1500)).not.toBeNull();
  });
});
import type { MatrixPerson } from '../capacitaciones/status';

describe('pestañas de Capacitación', () => {
  it('lee ?tab= y cae en "avance" con cualquier otra cosa', () => {
    expect(tabFromSearch('?tab=ajustes')).toBe('ajustes');
    expect(tabFromSearch('?tab=capacitar&x=1')).toBe('capacitar');
    expect(tabFromSearch('')).toBe('avance');
    expect(tabFromSearch('?tab=nada')).toBe('avance');
    expect(tabFromSearch('?tab=AJUSTES')).toBe('avance');
  });
  it('"avance" va sin ?tab=', () => {
    expect(tabHref('/capacitaciones', 'avance')).toBe('/capacitaciones');
    expect(tabHref('/capacitaciones', 'ajustes')).toBe('/capacitaciones?tab=ajustes');
  });
});

describe('límites de los ajustes', () => {
  it('plazo de 1 a 60 días, enteros', () => {
    expect(limitError('deadline_days', 1)).toBeNull();
    expect(limitError('deadline_days', 60)).toBeNull();
    expect(limitError('deadline_days', 0)).toBe('El plazo va de 1 a 60 días.');
    expect(limitError('deadline_days', 61)).toBe('El plazo va de 1 a 60 días.');
    expect(limitError('deadline_days', 7.5)).toBe('El plazo va de 1 a 60 días.');
    expect(limitError('deadline_days', '7')).toBe('El plazo va de 1 a 60 días.');
    expect(limitError('deadline_days', NaN)).toBe('El plazo va de 1 a 60 días.');
  });
  it('tiempo de 5 a 600 segundos', () => {
    expect(limitError('min_seconds', 5)).toBeNull();
    expect(limitError('min_seconds', 600)).toBeNull();
    expect(limitError('min_seconds', 4)).toBe('El tiempo va de 5 a 600 segundos.');
    expect(limitError('min_seconds', 601)).toBe('El tiempo va de 5 a 600 segundos.');
  });
  it('lo que se escribe en el campo', () => {
    expect(parseLimit('deadline_days', ' 14 ')).toEqual({ ok: true, value: 14 });
    expect(parseLimit('min_seconds', '045')).toEqual({ ok: true, value: 45 });
    for (const raw of ['', ' ', '-3', '2.5', '1e1', 'abc', '0', '99999'])
      expect(parseLimit('deadline_days', raw)).toEqual({ ok: false, error: 'El plazo va de 1 a 60 días.' });
    expect(parseLimit('min_seconds', '3')).toEqual({ ok: false, error: 'El tiempo va de 5 a 600 segundos.' });
  });
});

const person = (id: string, name: string, companyId: string | null): MatrixPerson =>
  ({ id, name, companyId, cells: {}, done: 0, total: 0 });

describe('groupPeople', () => {
  const names = { c1: 'La Ferre', c2: 'BFM' };
  it('una sola empresa: un grupo sin nombre (sin renglón separador)', () => {
    const ps = [person('a', 'ANA', 'c1'), person('b', 'BETO', 'c1')];
    expect(groupPeople(ps, names)).toEqual([{ key: 'c1', name: null, people: ps }]);
    expect(groupPeople([], names)).toEqual([{ key: '', name: null, people: [] }]);
  });
  it('dos empresas: un grupo por empresa, ordenados por nombre, sin perder el orden de las personas', () => {
    const ps = [person('a', 'ANA', 'c1'), person('b', 'BETO', 'c2'), person('c', 'CARLOS', 'c1')];
    const g = groupPeople(ps, names);
    expect(g.map(x => [x.name, x.people.map(p => p.id)])).toEqual([['BFM', ['b']], ['La Ferre', ['a', 'c']]]);
  });
  it('empresa sin nombre conocido', () => {
    const g = groupPeople([person('a', 'ANA', 'c1'), person('b', 'BETO', null)], { c1: 'La Ferre' });
    expect(g.map(x => x.name)).toEqual(['La Ferre', 'Sin empresa']);
  });
});

describe('detalles de pantalla', () => {
  it('iniciales', () => {
    expect(initials('EDDIE GARCÍA LÓPEZ')).toBe('EG');
    expect(initials('  ána ')).toBe('Á');
    expect(initials('')).toBe('?');
  });
  it('el error de "falta la tabla" se traduce; los demás pasan igual', () => {
    const miss = "Could not find the table 'public.trainings' in the schema cache";
    expect(friendlyLoadError(miss)).toEqual({ text: expect.stringContaining('011_capacitaciones.sql'), detail: miss });
    expect(friendlyLoadError('relation "public.trainings" does not exist').detail).not.toBeNull();
    expect(friendlyLoadError('Could not find the function public.cap_matrix without parameters in the schema cache').detail).not.toBeNull();
    expect(friendlyLoadError('No autorizado')).toEqual({ text: 'No autorizado', detail: null });
  });
  it('stamp: día y hora de Matamoros', () => {
    expect(stamp('2026-11-21T18:30:00Z')).toBe('sáb 21 nov, 12:30');
    expect(stamp('2026-11-21T13:05:00Z')).toBe('sáb 21 nov, 07:05');
    expect(stamp('2026-11-22T05:30:00Z')).toBe('sáb 21 nov, 23:30'); // ya es domingo en UTC
  });
  it('sinceLabel: hoy, ayer, día de la semana o fecha', () => {
    const now = new Date('2026-11-21T18:00:00Z'); // sáb 21, 12:00
    expect(sinceLabel('2026-11-21T15:00:00Z', now)).toBe('desde hoy');
    expect(sinceLabel('2026-11-21T05:30:00Z', now)).toBe('desde ayer'); // vie 20 a las 23:30 en Matamoros
    expect(sinceLabel('2026-11-18T18:00:00Z', now)).toBe('desde el mié 18');
    expect(sinceLabel('2026-11-15T18:00:00Z', now)).toBe('desde el dom 15');
    expect(sinceLabel('2026-10-03T18:00:00Z', now)).toBe('desde el 3 oct');
    expect(sinceLabel('2026-11-22T18:00:00Z', now)).toBe('desde hoy'); // reloj del teléfono adelantado
  });
});
