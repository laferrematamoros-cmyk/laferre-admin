import { buildBitacora, type BitItem, type BitRun, type BitMark } from '../bitacora';

const WEEK = '2026-11-23'; // lunes
const items: BitItem[] = [
  { id: 'i1', area: 'Baño', label: 'Limpiar retrete', days: [2, 4, 6], sort: 10, archived_at: null },
  { id: 'i2', area: 'Mostrador y tienda', label: 'Barrer en general', days: [1, 2, 3, 4, 5, 6], sort: 110, archived_at: null },
  { id: 'i3', area: 'Mostrador y tienda', label: 'Tarea vieja', days: [2], sort: 120, archived_at: '2026-11-20T10:00:00Z' },
  { id: 'i4', area: 'Mostrador y tienda', label: 'Otra vieja', days: [3], sort: 130, archived_at: '2026-11-10T10:00:00Z' },
];
const runs: BitRun[] = [
  { id: 'r2', scheduled_date: '2026-11-24', employee_id: 'L', status: 'signed', finished_at: '2026-11-24T16:40:00Z',
    signed_at: '2026-11-24T16:52:00Z', signed_by_name: 'Ing. José Soto', signed_via: 'pin' },
];
const marks: BitMark[] = [
  { run_id: 'r2', item_id: 'i1', area: 'Baño', label: 'Limpiar retrete', sort: 10, state: 'done', reason: null, marked_by: 'L', photo_path: 'x.jpg' },
  { run_id: 'r2', item_id: 'i2', area: 'Mostrador y tienda', label: 'Barrer en general', sort: 110, state: 'skipped', reason: 'Llovió', marked_by: 'L', photo_path: null },
  { run_id: 'r2', item_id: 'i3', area: 'Mostrador y tienda', label: 'Tarea vieja (antes)', sort: 120, state: 'done', reason: null, marked_by: 'L', photo_path: null },
];
const names = { L: 'LAURA' };

describe('buildBitacora', () => {
  const b = buildBitacora(WEEK, items, runs, marks, names);
  it('seis días, de lunes a sábado', () => {
    expect(b.days.map(d => d.date)).toEqual(['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28']);
  });
  it('áreas en orden; una tarea archivada que se hizo esa semana sigue saliendo (con su nombre de entonces)', () => {
    expect(b.areas.map(a => [a.area, a.rows.map(r => r.label)])).toEqual([
      ['Baño', ['Limpiar retrete']],
      ['Mostrador y tienda', ['Barrer en general', 'Tarea vieja (antes)']],
    ]);
  });
  it('celdas: lo que se hizo, lo que no se pudo, lo que no tocaba y los días sin lista', () => {
    const retrete = b.areas[0].rows[0].cells;
    expect(retrete[0]).toBeNull();                                             // lunes no toca
    expect(retrete[1]).toEqual({ state: 'done', reason: null, by: 'LAURA', photo: true });
    expect(retrete[2]).toBeNull();                                             // miércoles no toca
    expect(retrete[3]).toEqual({ state: 'none' });                             // jueves tocaba, sin lista
    const barrer = b.areas[1].rows[0].cells;
    expect(barrer[1]).toEqual({ state: 'skipped', reason: 'Llovió', by: 'LAURA', photo: false });
    expect(barrer[0]).toEqual({ state: 'none' });
  });
  it('pie de cada día: quién, y la firma', () => {
    expect(b.days[1]).toMatchObject({ employee: 'LAURA', status: 'signed', signedBy: 'Ing. José Soto', signedVia: 'pin' });
    expect(b.days[0]).toMatchObject({ employee: null, status: 'none' });
  });
});
