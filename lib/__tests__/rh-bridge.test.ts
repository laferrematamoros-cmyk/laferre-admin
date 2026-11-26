import { bridgeAuthorized, buildPersonas } from '../rh-bridge';
import { cleanFullName } from '../full-name';

const SECRET = 'x'.repeat(40);

describe('puente con RH: la contraseña', () => {
  it('sólo pasa con "Bearer <contraseña>" exacta', () => {
    expect(bridgeAuthorized(`Bearer ${SECRET}`, SECRET)).toBe(true);
    expect(bridgeAuthorized(`bearer ${SECRET}`, SECRET)).toBe(true);
    expect(bridgeAuthorized(`Bearer ${SECRET}x`, SECRET)).toBe(false);
    expect(bridgeAuthorized(SECRET, SECRET)).toBe(false);
    expect(bridgeAuthorized(null, SECRET)).toBe(false);
    expect(bridgeAuthorized('Bearer ', SECRET)).toBe(false);
  });
  it('sin contraseña configurada (o muy corta) nadie pasa', () => {
    expect(bridgeAuthorized('Bearer ', '')).toBe(false);
    expect(bridgeAuthorized('Bearer undefined', undefined)).toBe(false);
    expect(bridgeAuthorized('Bearer corta', 'corta')).toBe(false);
  });
});

describe('puente con RH: la lista de personas', () => {
  it('junta empleado, empresa y nombre completo; activos primero y por nombre', () => {
    const p = buildPersonas(
      [
        { id: 'e2', name: 'laura', company_id: 'lf', is_active: true },
        { id: 'e1', name: 'EDDIE', company_id: 'bfm', is_active: true },
        { id: 'e3', name: 'BAJA', company_id: 'lf', is_active: false },
      ],
      [{ id: 'lf', name: 'La Ferre' }, { id: 'bfm', name: 'BFM' }],
      [{ employee_id: 'e2', full_name: 'LAURA GARZA PÉREZ', updated_by: 'app' }, { employee_id: 'e3', full_name: 'BAJA RUIZ', updated_by: 'panel' }],
    );
    expect(p).toEqual([
      { id: 'e1', nombre: 'EDDIE', nombreCompleto: null, origen: null, empresa: 'BFM', activo: true },
      { id: 'e2', nombre: 'LAURA', nombreCompleto: 'LAURA GARZA PÉREZ', origen: 'app', empresa: 'La Ferre', activo: true },
      { id: 'e3', nombre: 'BAJA', nombreCompleto: 'BAJA RUIZ', origen: 'panel', empresa: 'La Ferre', activo: false },
    ]);
  });
});

describe('nombre completo', () => {
  it('limpia espacios y lo pasa a mayúsculas', () => {
    expect(cleanFullName('  juan   pérez  lópez ')).toEqual({ ok: true, name: 'JUAN PÉREZ LÓPEZ' });
  });
  it('pide nombre y apellidos', () => {
    expect(cleanFullName('Juan')).toEqual({ ok: false, error: 'Escribe nombre y apellidos.' });
    expect(cleanFullName('   ')).toEqual({ ok: false, error: 'Escribe nombre y apellidos.' });
    expect(cleanFullName('A B')).toEqual({ ok: false, error: 'Escribe nombre y apellidos.' });
    expect(cleanFullName('x'.repeat(60) + ' ' + 'y'.repeat(61))).toEqual({ ok: false, error: 'El nombre es demasiado largo.' });
  });
});
