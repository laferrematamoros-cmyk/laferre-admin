import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG, catalogBySlug } from '../capacitaciones/catalog';
import { dueLabel, summarize, buildMatrix, openDoubts, type CapRow } from '../capacitaciones/status';
import { groupClaims, noticeText, inNoticeHours, type NoticeClaim } from '../capacitaciones/notices';
import { catalogSyncPlan } from '../capacitaciones/sync';

describe('catálogo', () => {
  it('13 capacitaciones con slug único', () => {
    expect(CATALOG).toHaveLength(13);
    expect(new Set(CATALOG.map(c => c.slug)).size).toBe(13);
    CATALOG.forEach(c => expect(c.slug).toMatch(/^[a-z0-9-]{1,40}$/));
  });
  it('cada parte existe en components/capacitaciones/anim', () => {
    for (const c of CATALOG) for (const p of c.parts)
      expect(existsSync(join(process.cwd(), 'components/capacitaciones/anim', `${p}.jsx`))).toBe(true);
  });
  it('tiempos dentro de lo que acepta la base', () => {
    CATALOG.forEach(c => { expect(c.minSeconds).toBeGreaterThanOrEqual(5); expect(c.minSeconds).toBeLessThanOrEqual(600); });
    expect(catalogBySlug('fregadero')?.parts).toEqual(['InstalarFregadero']);
    expect(catalogBySlug('nada')).toBeNull();
  });
  // Con `threshold: 0.25` una animación más alta que 4 pantallas nunca llega al 25 % visible y no arranca
  // (gas-estufa en un celular). Si se vuelven a copiar los archivos de la diseñadora, hay que volver a parcharlos.
  it('cada animación arranca al llegar a la parte de arriba de la pantalla, sin threshold', () => {
    const dir = join(process.cwd(), 'components/capacitaciones/anim');
    const withIO = readdirSync(dir).filter(f => f.endsWith('.jsx'))
      .map(f => ({ f, src: readFileSync(join(dir, f), 'utf8') }))
      .filter(x => x.src.includes('new IntersectionObserver'));
    expect(withIO.length).toBeGreaterThanOrEqual(14);
    for (const { f, src } of withIO) {
      expect([f, src.includes("rootMargin: '0px 0px -35% 0px'")]).toEqual([f, true]);
      expect([f, /threshold: 0\./.test(src)]).toEqual([f, false]);
    }
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
    expect(dueLabel(dl, new Date(dl))).toBe('venció el jue 26'); // justo en el plazo ya venció
  });
  it('"mañana" no se equivoca el día que se adelanta el reloj (día de 23 h)', () => {
    // 14 mar 2027: cambio de horario. Plazo = lun 15 00:00 CDT; son las 23:30 CST del sáb 13.
    expect(dueLabel('2027-03-15T05:00:00.000Z', new Date('2027-03-14T05:30:00Z'))).toBe('vence mañana');
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

const cl = (p: Partial<NoticeClaim>): NoticeClaim => ({
  employee_id: 'e1', employee_name: 'EDDIE GARCIA', company_id: 'c1', training_id: 't1', title: 'Instalar un fregadero',
  kind: 'new', deadline: '2026-11-27T06:00:00.000Z', ...p,
});
const now = new Date('2026-11-25T18:00:00Z');

describe('avisos', () => {
  it('agrupa por persona; la que está en las dos listas se queda en "por vencer"', () => {
    const g = groupClaims([cl({}), cl({ kind: 'due_soon' }), cl({ training_id: 't2', title: 'Lavabo' }), cl({ employee_id: 'e2', employee_name: 'LAURA' })]);
    expect(g.map(x => [x.name, x.news.map(n => n.training_id), x.dues.map(n => n.training_id)]))
      .toEqual([['EDDIE GARCIA', ['t2'], ['t1']], ['LAURA', ['t1'], []]]);
  });
  it('textos', () => {
    const one = groupClaims([cl({})])[0];
    expect(noticeText(one, now)).toEqual({ title: 'Capacitación', body: 'Eddie, tienes una capacitación nueva: Instalar un fregadero.' });
    const many = groupClaims([cl({}), cl({ training_id: 't2' }), cl({ training_id: 't3' })])[0];
    expect(noticeText(many, now).body).toBe('Eddie, tienes 3 capacitaciones nuevas por ver.');
    const due = groupClaims([cl({ kind: 'due_soon' })])[0];
    expect(noticeText(due, now).body).toBe('Eddie, vence mañana: Instalar un fregadero.');
    const dues = groupClaims([cl({ kind: 'due_soon' }), cl({ kind: 'due_soon', training_id: 't2' })])[0];
    expect(noticeText(dues, now).body).toBe('Eddie, tienes 2 capacitaciones por vencer.');
    const both = groupClaims([cl({ kind: 'due_soon' }), cl({ training_id: 't2' })])[0];
    expect(noticeText(both, now).body).toBe('Eddie, vence mañana: Instalar un fregadero. También tienes una nueva.');
    const many2 = groupClaims([cl({ kind: 'due_soon' }), cl({ kind: 'due_soon', training_id: 't2' }), cl({ training_id: 't3' }), cl({ training_id: 't4' })])[0];
    expect(noticeText(many2, now).body).toBe('Eddie, tienes 2 capacitaciones por vencer. También tienes 2 nuevas.');
  });
  it('horario: de 9:00 a 19:00 en Matamoros', () => {
    expect(inNoticeHours(new Date('2026-11-25T14:59:00Z'))).toBe(false); // 8:59
    expect(inNoticeHours(new Date('2026-11-25T15:00:00Z'))).toBe(true);  // 9:00
    expect(inNoticeHours(new Date('2026-11-26T00:59:00Z'))).toBe(true);  // 18:59
    expect(inNoticeHours(new Date('2026-11-26T01:00:00Z'))).toBe(false); // 19:00
  });
});
