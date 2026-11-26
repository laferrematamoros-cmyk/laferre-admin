import { LAYOUT, LAYOUT_CODES, shelvesOf, zoneOf, focusBox, hasLayout } from '../store-layout';

const EXPECTED = [
  ...'ABCDEFGHIJKLMNÑOPQRSTUVWXY'.split(''),
  '1A', '2B', '3C', '4D', '5E', '6F', '7G', '8H', '9I', '10J', '11K', '12L', '13M', '14N',
];

describe('plano de La Ferre', () => {
  it('trae todas las letras del inventario (sin la Z) y ninguna de más', () => {
    expect([...LAYOUT_CODES].sort()).toEqual([...EXPECTED].sort());
    expect(LAYOUT_CODES).not.toContain('Z');
  });
  it('la E y la Q tienen dos estantes; las demás uno', () => {
    expect(shelvesOf('E')).toHaveLength(2);
    expect(shelvesOf('Q')).toHaveLength(2);
    expect(shelvesOf('H')).toHaveLength(1);
    expect(shelvesOf(' h ')).toHaveLength(1); // como venga escrita
    expect(shelvesOf('Z')).toHaveLength(0);
  });
  it('cada estante cae dentro del dibujo', () => {
    const [vx, vy, vw, vh] = LAYOUT.viewBox;
    for (const s of LAYOUT.shelves) {
      expect([s.code, s.x >= vx && s.y >= vy && s.x + s.w <= vx + vw && s.y + s.h <= vy + vh]).toEqual([s.code, true]);
    }
  });
  it('dice en qué zona está cada letra', () => {
    expect(zoneOf('H')).toBe('Área 1 · Atención al cliente');
    expect(zoneOf('B')).toBe('Reciba');
    expect(zoneOf('11K')).toBe('Área 2');
    expect(zoneOf('9I')).toBe('Tubería · pared izquierda');
    expect(zoneOf('Z')).toBeNull();
    for (const c of LAYOUT_CODES) expect([c, zoneOf(c) !== null]).toEqual([c, true]);
  });
  it('el acercamiento contiene sus estantes y no se sale del dibujo', () => {
    const [vx, vy, vw, vh] = LAYOUT.viewBox;
    for (const c of LAYOUT_CODES) {
      const [x, y, w, h] = focusBox(c)!;
      expect(x >= vx && y >= vy && x + w <= vx + vw + 0.01 && y + h <= vy + vh + 0.01).toBe(true);
      for (const s of shelvesOf(c)) expect(s.x >= x && s.y >= y && s.x + s.w <= x + w && s.y + s.h <= y + h).toBe(true);
      expect(Math.abs(w / h - 4 / 3)).toBeLessThan(0.02);
    }
    expect(focusBox('Z')).toBeNull();
  });
  it('sólo La Ferre tiene plano', () => {
    expect(hasLayout('laferre')).toBe(true);
    expect(hasLayout('bfm')).toBe(false);
    expect(hasLayout(undefined)).toBe(false);
  });
});
