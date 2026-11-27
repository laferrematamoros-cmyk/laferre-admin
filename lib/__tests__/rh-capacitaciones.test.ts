import { buildTrainingReport } from '../rh-capacitaciones';

const T = (p: Partial<{ id: string; slug: string; title: string; sort_order: number; version: number; is_active: boolean; theme: string | null }>) =>
  ({ id: 't', slug: 'tuberia-cortada', title: 'Tubería cortada', sort_order: 1, version: 1, is_active: true, theme: 'bodega', ...p });
const P = (p: Partial<{ training_id: string; version: number; status: string; answered_at: string; trained_at: string | null; trained_by: string | null }>) =>
  ({ training_id: 't', version: 1, status: 'understood', answered_at: '2026-11-25T16:00:00Z', trained_at: null, trained_by: null, ...p });

describe('reporte de capacitaciones para RH', () => {
  it('estado actual, forma y fecha de cada una; activas primero por orden', () => {
    const r = buildTrainingReport(
      [
        T({ id: 'a', slug: 'tuberia-cortada', title: 'Tubería cortada', sort_order: 2 }),
        T({ id: 'b', slug: 'facturacion', title: 'Proceso de facturación', sort_order: 1, theme: 'atencion' }),
        T({ id: 'c', slug: 'focos-led', title: 'Focos LED', sort_order: 3, theme: 'electricidad' }),
        T({ id: 'd', slug: 'llamadas', title: 'Recepción de llamadas', sort_order: 4, theme: 'atencion' }),
      ],
      [
        { id: 'a', status: 'understood', deadline: '2026-12-01T06:00:00Z' },
        { id: 'b', status: 'trained', deadline: '2026-12-01T06:00:00Z' },
        { id: 'c', status: 'doubt', deadline: '2026-12-01T06:00:00Z' },
        { id: 'd', status: 'overdue', deadline: '2026-11-20T06:00:00Z' },
      ],
      [
        P({ training_id: 'a', answered_at: '2026-11-25T16:00:00Z' }),
        P({ training_id: 'b', status: 'trained', answered_at: '2026-11-24T16:00:00Z', trained_at: '2026-11-26T18:00:00Z', trained_by: 'Ing. José' }),
        P({ training_id: 'c', status: 'doubt', answered_at: '2026-11-26T15:00:00Z' }),
      ],
    );
    expect(r.items.map(i => [i.titulo, i.tema, i.estado, i.hecha && [i.hecha.forma, i.hecha.fecha, i.hecha.por]])).toEqual([
      ['Proceso de facturación', 'Atención y oficina', 'trained', ['En persona', '2026-11-26T18:00:00Z', 'Ing. José']],
      ['Tubería cortada', 'Bodega: medir y cortar', 'understood', ['Entendida', '2026-11-25T16:00:00Z', null]],
      ['Focos LED', 'Electricidad', 'doubt', null],
      ['Recepción de llamadas', 'Atención y oficina', 'overdue', null],
    ]);
    expect(r.resumen).toEqual({ hechas: 2, total: 4, nivel: 'Plata', terminadas: 2 });
  });

  it('versión nueva sin ver: conserva que la terminó antes y lo marca', () => {
    const r = buildTrainingReport(
      [T({ id: 'a', version: 2 })],
      [{ id: 'a', status: 'pending', deadline: '2026-12-01T06:00:00Z' }],
      [P({ training_id: 'a', version: 1, answered_at: '2026-11-10T16:00:00Z' })],
    );
    expect(r.items[0]).toMatchObject({ estado: 'pending', versionNueva: true, hecha: { version: 1, forma: 'Entendida', fecha: '2026-11-10T16:00:00Z' } });
    expect(r.resumen).toEqual({ hechas: 0, total: 1, nivel: null, terminadas: 1 });
  });

  it('pausada que sí terminó: aparece al final como pausada; pausada sin terminar no aparece', () => {
    const r = buildTrainingReport(
      [T({ id: 'a', is_active: false, sort_order: 1 }), T({ id: 'z', slug: 'brocas-metal', title: 'Brocas', is_active: false, theme: 'herramientas' }), T({ id: 'b', slug: 'focos-led', title: 'Focos LED', sort_order: 9 })],
      [{ id: 'b', status: 'pending', deadline: '2026-12-01T06:00:00Z' }],
      [P({ training_id: 'a' })],
    );
    expect(r.items.map(i => [i.titulo, i.estado, i.activa])).toEqual([['Focos LED', 'pending', true], ['Tubería cortada', 'pausada', false]]);
    expect(r.resumen).toEqual({ hechas: 0, total: 1, nivel: null, terminadas: 1 });
  });

  it('de varias vueltas, la terminación más nueva', () => {
    const r = buildTrainingReport(
      [T({ id: 'a', version: 3 })],
      [{ id: 'a', status: 'understood', deadline: '2026-12-01T06:00:00Z' }],
      [P({ training_id: 'a', version: 1, answered_at: '2026-10-01T16:00:00Z' }), P({ training_id: 'a', version: 3, answered_at: '2026-11-20T16:00:00Z' }), P({ training_id: 'a', version: 2, status: 'doubt' })],
    );
    expect(r.items[0].hecha).toEqual({ version: 3, forma: 'Entendida', fecha: '2026-11-20T16:00:00Z', por: null });
    expect(r.items[0].versionNueva).toBe(false);
  });
});
