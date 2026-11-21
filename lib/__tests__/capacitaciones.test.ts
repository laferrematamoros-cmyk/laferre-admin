import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG, catalogBySlug } from '../capacitaciones/catalog';
import { dueLabel, summarize, buildMatrix, openDoubts, type CapRow } from '../capacitaciones/status';
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

describe('dueLabel (plazo = inicio del día siguiente, hora de Matamoros)', () => {
  const dl = '2026-11-27T06:00:00.000Z'; // vie 27 00:00 CST → el último día que cuenta es el jue 26
  it('días', () => {
    expect(dueLabel(dl, new Date('2026-11-21T18:00:00Z'))).toBe('vence el jue 26');
    expect(dueLabel(dl, new Date('2026-11-25T18:00:00Z'))).toBe('vence mañana');
    expect(dueLabel(dl, new Date('2026-11-26T18:00:00Z'))).toBe('vence hoy');
    expect(dueLabel(dl, new Date('2026-11-27T07:00:00Z'))).toBe('venció el jue 26');
  });
});

const row = (p: Partial<CapRow>): CapRow => ({
  employee_id: 'e1', employee_name: 'EDDIE', company_id: 'c1', training_id: 't1', slug: 'a', title: 'A',
  sort_order: 1, version: 1, status: 'pending', deadline: '2026-11-27T06:00:00.000Z', answered_at: null,
  doubt_note: null, trained_at: null, trained_by: null, views: 0, ...p,
});

describe('tabla de avance', () => {
  const rows = [
    row({ status: 'understood' }),
    row({ training_id: 't2', slug: 'b', title: 'B', sort_order: 2, status: 'overdue' }),
    row({ employee_id: 'e2', employee_name: 'LAURA', status: 'doubt', answered_at: '2026-11-22T15:00:00Z' }),
    row({ employee_id: 'e2', employee_name: 'LAURA', training_id: 't2', slug: 'b', title: 'B', sort_order: 2, status: 'trained' }),
    row({ employee_id: 'e3', employee_name: 'YAJAIRA', status: 'doubt', answered_at: '2026-11-21T15:00:00Z' }),
  ];
  it('summarize', () => {
    expect(summarize(rows.map(r => r.status))).toEqual({ total: 5, done: 2, open: 1, overdue: 1, doubts: 2 });
  });
  it('buildMatrix: columnas en orden, personas por nombre, avance por fila y columna', () => {
    const m = buildMatrix(rows);
    expect(m.trainings.map(t => [t.slug, t.done, t.total])).toEqual([['a', 1, 3], ['b', 1, 2]]);
    expect(m.people.map(p => [p.name, p.done, p.total])).toEqual([['EDDIE', 1, 2], ['LAURA', 1, 2], ['YAJAIRA', 0, 1]]);
    expect(m.people[1].cells.t2.status).toBe('trained');
  });
  it('openDoubts: la más vieja primero', () => {
    expect(openDoubts(rows).map(r => r.employee_name)).toEqual(['YAJAIRA', 'LAURA']);
  });
});
