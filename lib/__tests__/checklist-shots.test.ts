import { listShots } from '../checklist-shots';
import type { SignMark } from '../checklist-types';

const mark = (o: Partial<SignMark>): SignMark => ({
  item_id: 'i', area: 'Baño', label: 'Tarea', needs_photo: false, sort: 0,
  state: 'done', reason: null, photoUrl: null, hadPhoto: false, ...o,
});

describe('listShots', () => {
  it('enseña las fotos de las tareas en su orden, con su nombre', () => {
    const r = listShots({ marks: [
      mark({ item_id: 'a', label: 'Barrer', needs_photo: true, hadPhoto: true, photoUrl: 'https://x.supabase.co/a.jpg' }),
      mark({ item_id: 'b', label: 'Vaciar cestos' }),
      mark({ item_id: 'c', label: 'Lavar trastes', needs_photo: true, hadPhoto: true, photoUrl: 'https://x.supabase.co/c.jpg' }),
    ] });
    expect(r.shots).toEqual([
      { itemId: 'a', label: 'Barrer', url: 'https://x.supabase.co/a.jpg' },
      { itemId: 'c', label: 'Lavar trastes', url: 'https://x.supabase.co/c.jpg' },
    ]);
    expect(r).toMatchObject({ gone: 0, done: 3, total: 3 });
  });

  it('cuenta como borradas las que llevaban foto y ya no la tienen', () => {
    const r = listShots({ marks: [
      mark({ needs_photo: true, hadPhoto: true, photoUrl: null }),
      mark({ needs_photo: true, hadPhoto: true, photoUrl: 'https://x.supabase.co/b.jpg' }),
    ] });
    expect(r.shots).toHaveLength(1);
    expect(r.gone).toBe(1);
  });

  it('una tarea saltada no cuenta como hecha ni como foto borrada', () => {
    const r = listShots({ marks: [
      mark({ state: 'skipped', reason: 'Llovió', needs_photo: true, hadPhoto: false }),
      mark({ state: 'done' }),
    ] });
    expect(r).toMatchObject({ shots: [], gone: 0, done: 1, total: 2 });
  });

  it('no enseña un enlace que no sea https', () => {
    const r = listShots({ marks: [
      mark({ needs_photo: true, hadPhoto: true, photoUrl: 'javascript:alert(1)' }),
      mark({ needs_photo: true, hadPhoto: true, photoUrl: 'http://x.supabase.co/a.jpg' }),
    ] });
    expect(r.shots).toEqual([]);
    expect(r.gone).toBe(2);
  });
});
