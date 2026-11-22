import { firstNameOf, shortDay } from '../capacitaciones/format';

describe('página de la animación: textos', () => {
  it('primer nombre en tipo título', () => {
    expect(firstNameOf('EDDIE GARCÍA LÓPEZ')).toBe('Eddie');
    expect(firstNameOf('  ángel  ruiz ')).toBe('Ángel');
    expect(firstNameOf('')).toBe('');
    expect(firstNameOf(null)).toBe('');
  });

  it('día corto con la hora de Matamoros', () => {
    expect(shortDay('2026-11-21T18:30:00Z')).toBe('21 nov');
    // 2:00 UTC del 22 todavía es el 21 en Matamoros.
    expect(shortDay('2026-11-22T02:00:00Z')).toBe('21 nov');
  });
});
