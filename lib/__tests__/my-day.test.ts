import { shopClock, mine, groupMine, fitWithin, niceName, evidenceFile } from '../my-day';

describe('evidenceFile', () => {
  const ACT = 'b6c65d00-f88e-41cc-a47b-436c9b668ef7';
  it('acepta la ruta que arma la pantalla', () => {
    expect(evidenceFile(`${ACT}/1793473055123.jpg`, ACT)).toBe('1793473055123.jpg');
  });
  it('rechaza la foto de otra actividad', () => {
    expect(evidenceFile('abb797d2-79a6-4fe2-bf69-76d792f48334/1793473055123.jpg', ACT)).toBeNull();
  });
  it('rechaza enlaces completos, rutas con ".." y otros nombres', () => {
    expect(evidenceFile(`https://x.supabase.co/storage/v1/object/public/evidence/${ACT}/1793473055123.jpg`, ACT)).toBeNull();
    expect(evidenceFile(`${ACT}/../otra/1793473055123.jpg`, ACT)).toBeNull();
    expect(evidenceFile(`${ACT}/foto.jpg`, ACT)).toBeNull();
    expect(evidenceFile(`${ACT}/1793473055123.png`, ACT)).toBeNull();
    expect(evidenceFile(null, ACT)).toBeNull();
  });
});
import type { TodayRow } from '../today';

describe('shopClock', () => {
  it('usa la hora de Matamoros aunque el servidor esté en UTC (horario de verano: UTC-5)', () => {
    const c = shopClock(new Date('2026-10-31T15:07:00Z'));
    expect(c.dateStr).toBe('2026-10-31');
    expect(c.minutes).toBe(10 * 60 + 7);
    expect(c.day.getDay()).toBe(6); // sábado
  });

  it('de noche en UTC todavía es el día anterior en la tienda (invierno: UTC-6)', () => {
    const c = shopClock(new Date('2026-11-02T05:30:00Z'));
    expect(c.dateStr).toBe('2026-11-01');
    expect(c.minutes).toBe(23 * 60 + 30);
    expect(c.day.getDay()).toBe(0); // domingo
  });

  it('medianoche sale como 0 min, no 24 h', () => {
    expect(shopClock(new Date('2026-11-03T06:00:00Z')).minutes).toBe(0);
  });
});

function row(p: Partial<TodayRow> & { id: string }): TodayRow {
  return {
    title: p.id, description: null, start: '09:00', limit: '10:00', startMin: 540, limitMin: 600,
    status: 'upcoming', minutesLate: null, minutesLeft: null, assignedIds: [], assignee: 'General',
    general: true, completion: null, doneBy: null, ...p,
  } as TodayRow;
}

describe('mine', () => {
  const rows = [
    row({ id: 'gen' }),
    row({ id: 'laura', general: false, assignedIds: ['L'] }),
    row({ id: 'eddie', general: false, assignedIds: ['E'] }),
    row({ id: 'ambos', general: false, assignedIds: ['E', 'L'] }),
  ];
  it('deja las generales y las suyas', () => {
    expect(mine(rows, 'L').map(r => r.id)).toEqual(['gen', 'laura', 'ambos']);
  });
  it('quien no tiene nada a su nombre sólo ve las generales', () => {
    expect(mine(rows, 'X').map(r => r.id)).toEqual(['gen']);
  });
});

describe('groupMine', () => {
  it('ordena: atrasadas (la más vieja primero), en curso (la que vence antes), por hacer, hechas (la más reciente primero)', () => {
    const g = groupMine([
      row({ id: 'run-20', status: 'running', minutesLeft: 20 }),
      row({ id: 'late-5', status: 'overdue', minutesLate: 5 }),
      row({ id: 'up', status: 'upcoming' }),
      row({ id: 'run-5', status: 'running', minutesLeft: 5 }),
      row({ id: 'late-40', status: 'overdue', minutesLate: 40 }),
      row({ id: 'done-9', status: 'done', completion: { completed_at: '2026-10-31T15:00:00Z' } as TodayRow['completion'] }),
      row({ id: 'done-10', status: 'doneLate', completion: { completed_at: '2026-10-31T16:00:00Z' } as TodayRow['completion'] }),
    ]);
    expect(g.now.map(r => r.id)).toEqual(['late-40', 'late-5', 'run-5', 'run-20']);
    expect(g.later.map(r => r.id)).toEqual(['up']);
    expect(g.done.map(r => r.id)).toEqual(['done-10', 'done-9']);
  });
});

describe('fitWithin', () => {
  it('achica el lado mayor y conserva la proporción', () => {
    expect(fitWithin(4032, 3024, 1600)).toEqual({ w: 1600, h: 1200 });
    expect(fitWithin(3024, 4032, 1600)).toEqual({ w: 1200, h: 1600 });
  });
  it('no agranda una foto chica', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ w: 800, h: 600 });
  });
  it('tolera medidas vacías', () => {
    expect(fitWithin(0, 0, 1600)).toEqual({ w: 0, h: 0 });
  });
});

describe('niceName', () => {
  it('pasa a nombre propio', () => {
    expect(niceName('LAURA')).toBe('Laura');
    expect(niceName('juan pérez')).toBe('Juan Pérez');
    expect(niceName('  ÁNGEL  ')).toBe('Ángel');
  });
});
