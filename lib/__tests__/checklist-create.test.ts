import { insertListActivity } from '../checklist-create';

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
  { area: 'Bodega 1', label: 'Barrer', days: [1, 2, 3, 4, 5, 6], needs_photo: true },
  { area: 'Bodega 1', label: 'Trapear', days: [1, 2, 3, 4, 5, 6], needs_photo: true },
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
      { activity_id: 'act1', area: 'Bodega 1', label: 'Barrer', days: [1, 2, 3, 4, 5, 6], needs_photo: true, sort: 10 },
      { activity_id: 'act1', area: 'Bodega 1', label: 'Trapear', days: [1, 2, 3, 4, 5, 6], needs_photo: true, sort: 20 },
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
