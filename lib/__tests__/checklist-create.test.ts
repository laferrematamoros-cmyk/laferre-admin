import { insertListActivity, syncItems } from '../checklist-create';

type Op = { m: string; a: unknown[] };
type Step = 'activity' | 'items' | 'rotation' | 'enable' | 'undo';

/** Base de mentiras: contesta según la tabla y lo que se le pidió; `fail` hace fallar un paso. */
function fakeDb(fail: Partial<Record<Step, string>> = {}) {
  const calls: { table: string; ops: Op[] }[] = [];
  const has = (ops: Op[], m: string) => ops.some(o => o.m === m);
  const answer = (table: string, ops: Op[]) => {
    const step: Step | null =
      table === 'checklist_items' ? 'items'
      : table === 'activity_rotations' ? 'rotation'
      : has(ops, 'insert') ? 'activity'
      : has(ops, 'update') ? 'enable'
      : has(ops, 'delete') ? 'undo' : null;
    if (step && fail[step]) return { data: null, error: { message: fail[step] } };
    return { data: step === 'activity' ? { id: 'act1' } : null, error: null };
  };
  const from = (table: string) => {
    const ops: Op[] = [];
    calls.push({ table, ops });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b: any = new Proxy({}, {
      get(_t, m: string) {
        if (m === 'then') return (res: (v: unknown) => void) => res(answer(table, ops));
        return (...a: unknown[]) => { ops.push({ m, a }); return b; };
      },
    });
    return b;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { db: { from } as any, calls };
}

const arg = (c: { ops: Op[] }, m: string) => c.ops.find(o => o.m === m)?.a[0];
const row = { title: 'REVISAR BODEGA 1', company_id: 'co1', assigned_employee_ids: [] };
const items = [
  { area: 'Bodega 1', label: 'Barrer', days: [1, 2, 3, 4, 5, 6], needs_photo: true, photo_count: 1 },
  { area: 'Bodega 1', label: 'Trapear', days: [1, 2, 3, 4, 5, 6], needs_photo: true, photo_count: 3 },
];
const order = ['e2', 'e1'];

describe('insertListActivity', () => {
  it('crea la actividad apagada, sus tareas y el rol, y al final la prende', async () => {
    const { db, calls } = fakeDb();
    // 2026-11-25 es miércoles: el rol se ancla al lunes 23.
    expect(await insertListActivity(db, row, items, order, '2026-11-25')).toEqual({ ok: true, id: 'act1' });
    expect(calls.map(c => `${c.table}.${c.ops[0].m}`)).toEqual([
      'activities.insert', 'checklist_items.insert', 'activity_rotations.insert', 'activities.update',
    ]);
    expect(arg(calls[0], 'insert')).toEqual({ ...row, checklist_enabled: false });
    expect(arg(calls[1], 'insert')).toEqual([
      { activity_id: 'act1', area: 'Bodega 1', label: 'Barrer', days: [1, 2, 3, 4, 5, 6], needs_photo: true, photo_count: 1, sort: 10 },
      { activity_id: 'act1', area: 'Bodega 1', label: 'Trapear', days: [1, 2, 3, 4, 5, 6], needs_photo: true, photo_count: 3, sort: 20 },
    ]);
    expect(arg(calls[2], 'insert')).toEqual({ activity_id: 'act1', employee_ids: ['e2', 'e1'], anchor_week: '2026-11-23', valid_from: '2026-11-25' });
    expect(arg(calls[3], 'update')).toEqual({ checklist_enabled: true });
  });

  it.each(['items', 'rotation', 'enable'] as const)('si falla %s, borra la actividad y regresa el error', async step => {
    const { db, calls } = fakeDb({ [step]: 'se cayó' });
    expect(await insertListActivity(db, row, items, order, '2026-11-25')).toEqual({ ok: false, error: 'se cayó' });
    const undo = calls.find(c => c.table === 'activities' && c.ops.some(o => o.m === 'delete'));
    expect(undo?.ops.find(o => o.m === 'eq')?.a).toEqual(['id', 'act1']);
  });

  it('si no se pudo crear la actividad, no hay nada que borrar', async () => {
    const { db, calls } = fakeDb({ activity: 'sin permiso' });
    expect(await insertListActivity(db, row, items, order, '2026-11-25')).toEqual({ ok: false, error: 'sin permiso' });
    expect(calls).toHaveLength(1);
  });

  it('si tampoco se pudo borrar, avisa que quedó una actividad sin lista', async () => {
    const { db } = fakeDb({ items: 'se cayó', undo: 'sin red' });
    const r = await insertListActivity(db, row, items, order, '2026-11-25');
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/se cayó.*archívala/);
  });
});

describe('syncItems', () => {
  const T1 = '11111111-1111-4111-8111-111111111111';
  const T2 = '22222222-2222-4222-8222-222222222222';
  const T9 = '99999999-9999-4999-8999-999999999999';

  /** Base de mentiras de checklist_items: `have` son las tareas vivas; `failOn` hace fallar una operación. */
  function itemsDb(have: string[], failOn?: 'select' | 'update' | 'insert' | 'archive') {
    const calls: Op[][] = [];
    const from = (_table: string) => {
      const ops: Op[] = [];
      calls.push(ops);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b: any = new Proxy({}, {
        get(_t, m: string) {
          if (m === 'then') return (res: (v: unknown) => void) => {
            const kind = ops.some(o => o.m === 'insert') ? 'insert'
              : ops.some(o => o.m === 'update') ? (ops.some(o => o.m === 'in') ? 'archive' : 'update')
              : 'select';
            if (kind === failOn) return res({ data: null, error: { message: `falló ${kind}` } });
            res({ data: kind === 'select' ? have.map(id => ({ id })) : null, error: null });
          };
          return (...a: unknown[]) => { ops.push({ m, a }); return b; };
        },
      });
      return b;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { db: { from } as any, calls };
  }
  const t = (o: Partial<{ id: string; label: string; photo_count: number }>) =>
    ({ area: 'Unidad 1', label: 'Llantas', days: [1], needs_photo: true, photo_count: 4, ...o });

  it('actualiza las que traen id, agrega las nuevas y archiva las que ya no vienen', async () => {
    const { db, calls } = itemsDb([T1, T2]);
    expect(await syncItems(db, 'act1', [t({ id: T1 }), t({ label: 'Aceite', photo_count: 1 })])).toEqual({ ok: true });
    const update = calls.find(ops => ops.some(o => o.m === 'update') && ops.some(o => o.m === 'eq'));
    expect(update?.find(o => o.m === 'update')?.a[0]).toEqual({ area: 'Unidad 1', label: 'Llantas', days: [1], needs_photo: true, photo_count: 4, sort: 10 });
    expect(update?.find(o => o.m === 'eq')?.a).toEqual(['id', T1]);
    const insert = calls.find(ops => ops.some(o => o.m === 'insert'));
    expect(insert?.find(o => o.m === 'insert')?.a[0]).toEqual([
      { activity_id: 'act1', area: 'Unidad 1', label: 'Aceite', days: [1], needs_photo: true, photo_count: 1, sort: 20 },
    ]);
    const archive = calls.find(ops => ops.some(o => o.m === 'in'));
    expect(archive?.find(o => o.m === 'in')?.a).toEqual(['id', [T2]]);
  });

  it('rechaza una tarea que ya no existe (otra pestaña la quitó)', async () => {
    const { db } = itemsDb([T1]);
    expect(await syncItems(db, 'act1', [t({ id: T9 })])).toEqual({ ok: false, error: 'Una tarea ya no existe. Recarga la página.' });
  });

  it.each(['select', 'update', 'insert', 'archive'] as const)('si falla %s, regresa el error', async step => {
    const { db } = itemsDb([T1, T2], step);
    const r = await syncItems(db, 'act1', [t({ id: T1 }), t({ label: 'Aceite' })]);
    expect(r).toEqual({ ok: false, error: `falló ${step}` });
  });
});
