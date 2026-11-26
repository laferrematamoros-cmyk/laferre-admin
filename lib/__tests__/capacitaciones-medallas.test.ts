import { hasMedal, medalShelf, medalCount, wonText, medalLine } from '../capacitaciones/medals';

const items = [
  { slug: 'a', title: 'A', sort_order: 1, status: 'pending' as const },
  { slug: 'b', title: 'B', sort_order: 2, status: 'trained' as const },
  { slug: 'c', title: 'C', sort_order: 3, status: 'understood' as const },
  { slug: 'd', title: 'D', sort_order: 4, status: 'doubt' as const },
  { slug: 'e', title: 'E', sort_order: 0, status: 'overdue' as const },
];

describe('medallas', () => {
  it('se gana con entendida o en persona; versión nueva (pending) no la tiene', () => {
    expect((['pending', 'overdue', 'doubt', 'understood', 'trained'] as const).map(hasMedal))
      .toEqual([false, false, false, true, true]);
  });
  it('vitrina: primero las ganadas y luego las que faltan, cada grupo por orden', () => {
    expect(medalShelf(items).map(i => [i.slug, i.earned]))
      .toEqual([['b', true], ['c', true], ['e', false], ['a', false], ['d', false]]);
    expect(items.map(i => i.slug)).toEqual(['a', 'b', 'c', 'd', 'e']); // no cambia la lista original
  });
  it('cuenta', () => {
    expect(medalCount(items)).toEqual({ earned: 2, total: 5 });
    expect(medalCount([])).toEqual({ earned: 0, total: 0 });
  });
  it('textos del festejo', () => {
    expect(wonText('Tubería cortada')).toBe('Ganaste la medalla de Tubería cortada.');
    expect(medalLine('understood', 'Tubería cortada')).toBe('Ganaste la medalla de Tubería cortada.');
    expect(medalLine('trained', 'Tubería cortada')).toBe('Ya te capacitó el Ing. en persona y tienes la medalla de Tubería cortada.');
    expect(medalLine('doubt', 'Tubería cortada')).toBeNull();
  });
});
