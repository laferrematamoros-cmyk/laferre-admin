import { bridgeAuthorized, buildPersonas, planNombres } from '../rh-bridge';
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

describe('puente con RH: nombres completos que manda RH', () => {
  const emps = [
    { id: '11111111-1111-4111-8111-111111111111', company_id: 'lf' },
    { id: '22222222-2222-4222-8222-222222222222', company_id: 'bfm' },
    { id: '33333333-3333-4333-8333-333333333333', company_id: 'lf' },
  ];
  const cos = [{ id: 'lf', name: 'La Ferre' }, { id: 'bfm', name: 'BFM' }];
  it('guarda el de RH (manda sobre el del teléfono), deja igual lo igual y rechaza lo raro', () => {
    const p = planNombres(
      [
        { persona: '11111111-1111-4111-8111-111111111111', nombre: 'Laura Guadalupe Garza Pérez' },
        { persona: '22222222-2222-4222-8222-222222222222', nombre: 'EDUARDO RAMOS' },
        { persona: '33333333-3333-4333-8333-333333333333', nombre: 'Juan' },
        { persona: '44444444-4444-4444-8444-444444444444', nombre: 'Nadie Que Exista' },
        { persona: 'no-es-id', nombre: 'Algo Algo' },
      ],
      emps, cos,
      [{ employee_id: '11111111-1111-4111-8111-111111111111', full_name: 'LAURA GARZA' }, { employee_id: '22222222-2222-4222-8222-222222222222', full_name: 'EDUARDO RAMOS' }],
    );
    expect(p.upserts).toEqual([{ employee_id: '11111111-1111-4111-8111-111111111111', full_name: 'LAURA GUADALUPE GARZA PÉREZ' }]);
    expect(p.resultados).toEqual([
      { persona: '11111111-1111-4111-8111-111111111111', estado: 'actualizado', nombreCompleto: 'LAURA GUADALUPE GARZA PÉREZ', empresa: 'La Ferre' },
      { persona: '22222222-2222-4222-8222-222222222222', estado: 'igual', nombreCompleto: 'EDUARDO RAMOS', empresa: 'BFM' },
      { persona: '33333333-3333-4333-8333-333333333333', estado: 'rechazado', motivo: 'Escribe nombre y apellidos.', empresa: 'La Ferre' },
      { persona: '44444444-4444-4444-8444-444444444444', estado: 'rechazado', motivo: 'No existe en Actividades.' },
      { persona: 'no-es-id', estado: 'rechazado', motivo: 'No existe en Actividades.' },
    ]);
  });
  it('si llega dos veces la misma persona, sólo cuenta la primera', () => {
    const p = planNombres(
      [{ persona: emps[0].id, nombre: 'Uno Dos' }, { persona: emps[0].id, nombre: 'Tres Cuatro' }], emps, cos, []);
    expect(p.upserts).toEqual([{ employee_id: emps[0].id, full_name: 'UNO DOS' }]);
    expect(p.resultados).toHaveLength(1);
  });
});
