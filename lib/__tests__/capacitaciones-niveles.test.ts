import { levelFor, levelLine, celebrate, countText } from '../capacitaciones/levels';

describe('niveles por porcentaje', () => {
  it('con 20: Bronce 5, Plata 10, Oro 15, Diamante 20', () => {
    expect(levelFor(0, 20)).toEqual({ current: null, next: { key: 'bronce', label: 'Bronce', need: 5, missing: 5 } });
    expect(levelFor(4, 20).current).toBeNull();
    expect(levelFor(5, 20).current).toBe('bronce');
    expect(levelFor(12, 20)).toEqual({ current: 'plata', next: { key: 'oro', label: 'Oro', need: 15, missing: 3 } });
    expect(levelFor(15, 20).current).toBe('oro');
    expect(levelFor(19, 20).next).toEqual({ key: 'diamante', label: 'Diamante', need: 20, missing: 1 });
    expect(levelFor(20, 20)).toEqual({ current: 'diamante', next: null });
  });
  it('las metas crecen con el número de capacitaciones (redondeo hacia arriba)', () => {
    expect([7, 14, 21, 28].map(n => levelFor(n, 28).current)).toEqual(['bronce', 'plata', 'oro', 'diamante']);
    expect(levelFor(6, 28).current).toBeNull();
    expect(levelFor(1, 3)).toEqual({ current: 'bronce', next: { key: 'plata', label: 'Plata', need: 2, missing: 1 } });
  });
  it('pocas capacitaciones: varias metas caen en el mismo número', () => {
    expect(levelFor(1, 2)).toEqual({ current: 'plata', next: { key: 'oro', label: 'Oro', need: 2, missing: 1 } });
    expect(levelFor(1, 1)).toEqual({ current: 'diamante', next: null });
    expect(levelFor(0, 1).next?.key).toBe('bronce');
  });
  it('sin capacitaciones prendidas no hay nivel', () => {
    expect(levelFor(0, 0)).toEqual({ current: null, next: null });
  });
  it('textos', () => {
    expect(levelLine(12, 20)).toBe('Te faltan 3 para Oro');
    expect(levelLine(19, 20)).toBe('Te falta 1 para Diamante');
    expect(levelLine(20, 20)).toBe('¡Tienes todas!');
    expect(levelLine(0, 0)).toBe('');
    expect(countText(9, 20)).toBe('Ya llevas 9 de 20 medallas.');
    expect(countText(1, 20)).toBe('Ya llevas 1 de 20 medallas.');
    expect(countText(20, 20)).toBe('¡Ya tienes las 20 medallas!');
  });
});

describe('festejo: la cuenta después de contestar', () => {
  it('una medalla nueva suma 1 y avisa si sube de nivel', () => {
    expect(celebrate({ earned: 9, total: 20 }, false)).toEqual({ earned: 10, total: 20, levelUp: 'plata' });
    expect(celebrate({ earned: 10, total: 20 }, false)).toEqual({ earned: 11, total: 20, levelUp: null });
    expect(celebrate({ earned: 19, total: 20 }, false)).toEqual({ earned: 20, total: 20, levelUp: 'diamante' });
  });
  it('si ya la tenía (la volvió a ver) no suma ni sube', () => {
    expect(celebrate({ earned: 10, total: 20 }, true)).toEqual({ earned: 10, total: 20, levelUp: null });
  });
  it('nunca pasa del total; sin cuenta del servidor, nada', () => {
    expect(celebrate({ earned: 20, total: 20 }, false)).toEqual({ earned: 20, total: 20, levelUp: null });
    expect(celebrate(null, false)).toBeNull();
  });
});
