import { groupMine, mineLine, friendlyMineError } from '../capacitaciones/my-view';
import type { TrainingStatus } from '../capacitaciones/status';

const it_ = (slug: string, sort_order: number, status: TrainingStatus, deadline = '2026-11-27T06:00:00.000Z') => ({ slug, sort_order, status, deadline });

describe('Mis capacitaciones: grupos', () => {
  const items = [
    it_('a', 1, 'pending'), it_('b', 2, 'overdue'), it_('c', 3, 'understood'), it_('d', 4, 'doubt'),
    it_('e', 5, 'overdue'), it_('f', 6, 'trained'), it_('g', 0, 'pending'),
  ];
  const g = groupMine(items);
  it('por ver: atrasadas primero y luego por orden', () => {
    expect(g.open.map(i => i.slug)).toEqual(['b', 'e', 'g', 'a']);
  });
  it('dudas y listas por orden', () => {
    expect(g.doubt.map(i => i.slug)).toEqual(['d']);
    expect(g.done.map(i => i.slug)).toEqual(['c', 'f']);
  });
  it('no pierde ninguna', () => {
    expect(g.open.length + g.doubt.length + g.done.length).toBe(items.length);
  });
});

describe('Mis capacitaciones: renglón', () => {
  const now = new Date('2026-11-21T18:00:00Z');
  it('atrasada y por ver llevan el plazo', () => {
    expect(mineLine(it_('x', 1, 'overdue', '2026-11-20T06:00:00.000Z'), now)).toMatch(/^Atrasada · venció el /);
    expect(mineLine(it_('x', 1, 'pending'), now)).toMatch(/^Por ver · vence el /);
  });
  it('dudas y listas', () => {
    expect(mineLine(it_('x', 1, 'doubt'), now)).toBe('El Ing. te la va a explicar');
    expect(mineLine(it_('x', 1, 'understood'), now)).toBe('Entendida');
    expect(mineLine(it_('x', 1, 'trained'), now)).toBe('Capacitado en persona');
  });
});

describe('Mis capacitaciones: error', () => {
  it('traduce el de la base sin la 011 y deja los demás', () => {
    expect(friendlyMineError('Could not find the function public.cap_list in the schema cache')).toMatch(/todavía no están listas/);
    expect(friendlyMineError('Tu usuario no está vinculado a un empleado. Pídeselo a un administrador.')).toMatch(/no está vinculado/);
  });
});
