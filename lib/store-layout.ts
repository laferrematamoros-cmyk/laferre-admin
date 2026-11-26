// Plano de La Ferre para el inventario por letra (diseño: docs/superpowers/specs/2026-11-26-plano-inventario-design.md).
// Transcrito del PDF "LAYOUT LA FERRE" (las medidas son las del dibujo, no metros). Puro.
// La app de teléfonos tiene una copia en laferre-actividades/lib/storeLayout.ts: cambiar las dos.
// Si se mueve un estante: cambiar su x/y/w/h aquí y en la copia.

export type ZoneKey = 'reciba' | 'area1' | 'area2' | 'comedor' | 'tuberia';
export interface Shelf { code: string; x: number; y: number; w: number; h: number }
export interface Zone { key: ZoneKey; label: string; fill: string; rects: [number, number, number, number][] }

export const LAYOUT = {
  company: 'laferre',
  viewBox: [365, 26, 680, 776] as [number, number, number, number],
  zones: [
    { key: 'area1', label: 'Área 1 · Atención al cliente', fill: '#D3ECE2', rects: [[447, 47, 374, 265], [821, 47, 219, 279]] },
    { key: 'tuberia', label: 'Tubería · pared izquierda', fill: '#D3ECE2', rects: [[374, 44, 73, 517]] },
    { key: 'reciba', label: 'Reciba', fill: '#FCE3D6', rects: [[449, 49, 121, 64]] },
    { key: 'area2', label: 'Área 2', fill: '#FFF5C9', rects: [[447, 312, 378, 250], [447, 562, 265, 235]] },
    { key: 'comedor', label: 'Comedor', fill: '#DED5F6', rects: [[485, 565, 47, 115]] },
  ] as Zone[],
  /** Cuartos que no son de inventario. */
  rooms: [
    { label: 'Baño', x: 712, y: 565, w: 108, h: 132 },
    { label: 'Oficina', x: 712, y: 703, w: 108, h: 85 },
  ],
  /** Muros [x1, y1, x2, y2]. */
  walls: [
    [447, 46, 1040, 46], [1040, 46, 1040, 326], [825, 326, 1040, 326], [825, 326, 825, 797], [447, 797, 825, 797], [447, 46, 447, 797],
    [373, 43, 447, 43], [373, 43, 373, 561], [373, 561, 447, 561], [821, 46, 821, 245],
  ] as [number, number, number, number][],
  /** Muros interiores (más delgados). */
  inner: [
    [452, 443, 536, 443], [634, 447, 820, 447], [452, 557, 640, 557], [678, 557, 722, 557], [755, 557, 820, 557],
  ] as [number, number, number, number][],
  entrances: [{ x: 608, w: 92 }, { x: 883, w: 80 }],
  shelves: [
    { code: '9I', x: 389, y: 66, w: 44, h: 481 },
    { code: 'B', x: 455, y: 57, w: 32, h: 55 },
    { code: 'C', x: 525, y: 58, w: 255, h: 38 },
    { code: 'I', x: 568, y: 113, w: 49, h: 26 },
    { code: 'L', x: 693, y: 108, w: 68, h: 26 },
    { code: 'D', x: 783, y: 55, w: 29, h: 69 },
    { code: 'H', x: 567, y: 148, w: 52, h: 139 },
    { code: 'J', x: 693, y: 144, w: 33, h: 121 },
    { code: 'K', x: 729, y: 145, w: 33, h: 118 },
    { code: 'E', x: 783, y: 131, w: 29, h: 109 },
    { code: 'A', x: 455, y: 126, w: 33, h: 190 },
    { code: 'G', x: 634, y: 283, w: 128, h: 26 },
    { code: 'F', x: 764, y: 281, w: 54, h: 28 },
    { code: 'E', x: 783, y: 244, w: 75, h: 27 },
    { code: 'Ñ', x: 828, y: 53, w: 28, h: 26 },
    { code: 'N', x: 826, y: 85, w: 30, h: 44 },
    { code: 'M', x: 826, y: 133, w: 31, h: 108 },
    { code: 'O', x: 977, y: 52, w: 59, h: 28 },
    { code: '1A', x: 888, y: 92, w: 88, h: 23 },
    { code: '2B', x: 888, y: 119, w: 88, h: 22 },
    { code: 'P', x: 995, y: 90, w: 35, h: 37 },
    { code: 'T', x: 904, y: 161, w: 60, h: 104 },
    { code: 'Q', x: 996, y: 131, w: 34, h: 82 },
    { code: 'Q', x: 996, y: 220, w: 34, h: 64 },
    { code: 'S', x: 830, y: 298, w: 93, h: 24 },
    { code: 'R', x: 946, y: 298, w: 84, h: 24 },
    { code: 'Y', x: 634, y: 314, w: 186, h: 29 },
    { code: 'V', x: 638, y: 347, w: 156, h: 27 },
    { code: 'W', x: 798, y: 360, w: 22, h: 56 },
    { code: 'U', x: 455, y: 322, w: 35, h: 116 },
    { code: '3C', x: 496, y: 411, w: 35, h: 26 },
    { code: 'X', x: 634, y: 415, w: 186, h: 28 },
    { code: '5E', x: 635, y: 454, w: 185, h: 22 },
    { code: '4D', x: 455, y: 453, w: 36, h: 77 },
    { code: '6F', x: 798, y: 479, w: 22, h: 61 },
    { code: '8H', x: 456, y: 533, w: 182, h: 22 },
    { code: '7G', x: 680, y: 525, w: 40, h: 27 },
    { code: '14N', x: 567, y: 564, w: 69, h: 23 },
    { code: '13M', x: 456, y: 568, w: 26, h: 111 },
    { code: '10J', x: 681, y: 602, w: 28, h: 86 },
    { code: '12L', x: 455, y: 684, w: 40, h: 76 },
    { code: '11K', x: 455, y: 763, w: 251, h: 27 },
  ] as Shelf[],
  /** Zona de cada letra (para "Letra H · Área 1 · Atención al cliente"). */
  zoneOfCode: {
    B: 'reciba', C: 'reciba',
    A: 'area1', D: 'area1', E: 'area1', F: 'area1', G: 'area1', H: 'area1', I: 'area1', J: 'area1', K: 'area1', L: 'area1',
    M: 'area1', N: 'area1', Ñ: 'area1', O: 'area1', P: 'area1', Q: 'area1', R: 'area1', S: 'area1', T: 'area1', '1A': 'area1', '2B': 'area1',
    U: 'area2', V: 'area2', W: 'area2', X: 'area2', Y: 'area2', '3C': 'area2', '4D': 'area2', '5E': 'area2', '6F': 'area2', '7G': 'area2',
    '8H': 'area2', '10J': 'area2', '11K': 'area2', '12L': 'area2', '13M': 'area2', '14N': 'area2',
    '9I': 'tuberia',
  } as Record<string, ZoneKey>,
};

const norm = (code: string) => code.trim().toUpperCase();

export const LAYOUT_CODES: string[] = [...new Set(LAYOUT.shelves.map(s => s.code))];

/** ¿Esta empresa tiene plano? (sólo La Ferre). */
export const hasLayout = (companySlug: string | null | undefined) => companySlug === LAYOUT.company;

export function shelvesOf(code: string): Shelf[] {
  const c = norm(code);
  return LAYOUT.shelves.filter(s => s.code === c);
}

export function zoneOf(code: string): string | null {
  const k = LAYOUT.zoneOfCode[norm(code)];
  return k ? LAYOUT.zones.find(z => z.key === k)?.label ?? null : null;
}

/** El pedazo del plano para acercarse a una letra: sus estantes con aire alrededor, en 4:3, sin salirse del dibujo. */
export function focusBox(code: string, margin = 70): [number, number, number, number] | null {
  const list = shelvesOf(code);
  if (!list.length) return null;
  const [vx, vy, vw, vh] = LAYOUT.viewBox;
  const x1 = Math.min(...list.map(s => s.x)) - margin, y1 = Math.min(...list.map(s => s.y)) - margin;
  const x2 = Math.max(...list.map(s => s.x + s.w)) + margin, y2 = Math.max(...list.map(s => s.y + s.h)) + margin;
  // 4:3 y al menos 320 de ancho (que se vea qué hay alrededor); nunca más grande que el dibujo.
  let w = Math.max(x2 - x1, (y2 - y1) * 4 / 3, 320);
  let h = w * 3 / 4;
  if (h > vh) { h = vh; w = h * 4 / 3; }
  if (w > vw) { w = vw; h = w * 3 / 4; }
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
  const x = Math.min(Math.max(cx - w / 2, vx), vx + vw - w);
  const y = Math.min(Math.max(cy - h / 2, vy), vy + vh - h);
  return [x, y, w, h];
}
