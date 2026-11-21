import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG, catalogBySlug } from '../capacitaciones/catalog';
import { catalogSyncPlan } from '../capacitaciones/sync';

describe('catálogo', () => {
  it('13 capacitaciones con slug único', () => {
    expect(CATALOG).toHaveLength(13);
    expect(new Set(CATALOG.map(c => c.slug)).size).toBe(13);
    CATALOG.forEach(c => expect(c.slug).toMatch(/^[a-z0-9-]{1,40}$/));
  });
  // TODO Task 5: quitar el skip cuando se copien las animaciones
  it.skip('cada parte existe en components/capacitaciones/anim', () => {
    for (const c of CATALOG) for (const p of c.parts)
      expect(existsSync(join(process.cwd(), 'components/capacitaciones/anim', `${p}.jsx`))).toBe(true);
  });
  it('tiempos dentro de lo que acepta la base', () => {
    CATALOG.forEach(c => { expect(c.minSeconds).toBeGreaterThanOrEqual(5); expect(c.minSeconds).toBeLessThanOrEqual(600); });
    expect(catalogBySlug('fregadero')?.parts).toEqual(['InstalarFregadero']);
    expect(catalogBySlug('nada')).toBeNull();
  });
});

describe('catalogSyncPlan', () => {
  const cat = [
    { slug: 'a', title: 'A', version: 1, minSeconds: 30, parts: ['X'] },
    { slug: 'b', title: 'B nueva', version: 2, minSeconds: 40, parts: ['Y'] },
    { slug: 'c', title: 'C', version: 1, minSeconds: 20, parts: ['Z'] },
  ];
  it('base vacía: todas pausadas en el orden del catálogo', () => {
    const p = catalogSyncPlan(cat, []);
    expect(p.inserts.map(i => [i.slug, i.sort_order, i.is_active, i.min_seconds])).toEqual([['a', 1, false, 30], ['b', 2, false, 40], ['c', 3, false, 20]]);
    expect(p.updates).toEqual([]);
  });
  it('sube versión y título; nunca baja; las nuevas van al final', () => {
    const rows = [
      { id: '1', slug: 'a', title: 'A', version: 3, sort_order: 5 },
      { id: '2', slug: 'b', title: 'B', version: 1, sort_order: 2 },
    ];
    const p = catalogSyncPlan(cat, rows);
    expect(p.updates).toEqual([{ id: '2', title: 'B nueva', version: 2 }]);
    expect(p.inserts.map(i => [i.slug, i.sort_order])).toEqual([['c', 6]]);
  });
});
