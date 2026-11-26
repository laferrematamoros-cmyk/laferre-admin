jest.mock('server-only', () => ({}));
jest.mock('../expo-push', () => ({ pushExpo: jest.fn(async () => undefined) }));

import { syncCatalog, runTrainingTick } from '../capacitaciones/server';
import { CATALOG } from '../capacitaciones/catalog';
import { pushExpo } from '../expo-push';

type Call = { table: string; op: string; args: unknown[] };

/** Cliente falso: `from(tabla)` regresa una cadena que se puede esperar (await) y anota cada llamada. */
function fakeDb(opts: {
  tables?: Record<string, { data?: unknown; error?: { message: string } | null }>;
  rpc?: { data?: unknown; error?: { message: string } | null };
}) {
  const calls: Call[] = [];
  const rpc = jest.fn(async () => ({ data: opts.rpc?.data ?? [], error: opts.rpc?.error ?? null }));
  const db = {
    from(table: string) {
      const res = () => ({ data: opts.tables?.[table]?.data ?? [], error: opts.tables?.[table]?.error ?? null });
      const chain: any = new Proxy({}, {
        get(_t, op: string) {
          if (op === 'then') return (ok: (v: unknown) => unknown) => Promise.resolve(res()).then(ok);
          return (...args: unknown[]) => { calls.push({ table, op, args }); return chain; };
        },
      });
      return chain;
    },
    rpc,
  };
  return { db: db as any, calls, rpc };
}

const T = '2026-11-23T18:00:00Z'; // lunes 12:00 hora de la tienda
const NIGHT = '2026-11-24T04:00:00Z'; // 22:00 en la tienda

describe('syncCatalog', () => {
  it('con la tabla vacía da de alta todo el catálogo pausado, sin pisar duplicados', async () => {
    const { db, calls } = fakeDb({ tables: { trainings: { data: [] } } });
    const log = await syncCatalog(db);
    const up = calls.find(c => c.op === 'upsert')!;
    expect((up.args[0] as unknown[]).length).toBe(CATALOG.length);
    expect((up.args[0] as { is_active: boolean }[]).every(r => r.is_active === false)).toBe(true);
    expect(up.args[1]).toEqual({ onConflict: 'slug', ignoreDuplicates: true });
    expect(log).toEqual([`catálogo: ${CATALOG.length} nuevas (pausadas)`]);
  });

  it('una versión mayor se actualiza con .lt("version", v)', async () => {
    const c = CATALOG[0];
    const rows = CATALOG.map((e, i) => ({ id: `id${i}`, slug: e.slug, title: e.title, version: e === c ? 0 : e.version, sort_order: i + 1, theme: e.theme }));
    const { db, calls } = fakeDb({ tables: { trainings: { data: rows } } });
    const log = await syncCatalog(db);
    const lt = calls.find(x => x.op === 'lt')!;
    expect(lt.args).toEqual(['version', c.version]);
    expect(calls.find(x => x.op === 'update')).toBeDefined();
    expect(calls.find(x => x.op === 'upsert')).toBeUndefined();
    expect(log).toEqual(['catálogo: id0 al día']);
  });

  it('si el select falla regresa la línea y no lanza', async () => {
    const { db } = fakeDb({ tables: { trainings: { error: { message: 'relation "trainings" does not exist' } } } });
    await expect(syncCatalog(db)).resolves.toEqual(['catálogo: relation "trainings" does not exist']);
  });
});

describe('runTrainingTick', () => {
  beforeEach(() => (pushExpo as jest.Mock).mockClear());
  const synced = CATALOG.map((e, i) => ({ id: `id${i}`, slug: e.slug, title: e.title, version: e.version, sort_order: i + 1, theme: e.theme }));

  it('fuera de 9 a 19 h no pide avisos', async () => {
    const { db, rpc } = fakeDb({ tables: { trainings: { data: synced } } });
    await runTrainingTick(db, new Date(NIGHT));
    expect(rpc).not.toHaveBeenCalled();
    expect(pushExpo).not.toHaveBeenCalled();
  });

  it('en horario manda un solo aviso por persona, a sus teléfonos', async () => {
    // cap_claim_notices regresa un renglón por persona con sus avisos en `notices`.
    const claims = [
      { employee_id: 'e1', employee_name: 'ANA LOPEZ', company_id: 'c1', notices: [
        { training_id: 't1', title: 'Uno', kind: 'new', deadline: '2026-12-01T06:00:00+00:00' },
        { training_id: 't2', title: 'Dos', kind: 'new', deadline: '2026-12-01T06:00:00+00:00' },
      ] },
    ];
    const { db, rpc } = fakeDb({
      tables: {
        trainings: { data: synced },
        device_tokens: { data: [{ token: 'tokA', company_id: 'c1', employee_id: 'e1' }, { token: 'tokB', company_id: 'c1', employee_id: 'e2' }] },
        employees: { data: [] },
      },
      rpc: { data: claims },
    });
    const log = await runTrainingTick(db, new Date(T));
    expect(rpc).toHaveBeenCalledWith('cap_claim_notices', { p_now: new Date(T).toISOString() });
    expect(pushExpo).toHaveBeenCalledTimes(1);
    expect(pushExpo).toHaveBeenCalledWith(['tokA'], 'Capacitación', 'Ana, tienes 2 capacitaciones nuevas por ver.');
    expect(log).toEqual(['capacitación → ANA LOPEZ: 2 nuevas, 0 por vencer (1 tel.)']);
  });

  it('si Expo falla con la primera persona, a la segunda se le manda igual y queda el error en el log', async () => {
    const claims = [
      { employee_id: 'e1', employee_name: 'ANA LOPEZ', company_id: 'c1', notices: [
        { training_id: 't1', title: 'Uno', kind: 'new', deadline: '2026-12-01T06:00:00+00:00' },
      ] },
      { employee_id: 'e2', employee_name: 'BETO RUIZ', company_id: 'c1', notices: [
        { training_id: 't1', title: 'Uno', kind: 'new', deadline: '2026-12-01T06:00:00+00:00' },
      ] },
    ];
    (pushExpo as jest.Mock).mockImplementationOnce(async () => { throw new Error('Expo no contesta'); });
    const { db } = fakeDb({
      tables: {
        trainings: { data: synced },
        device_tokens: { data: [{ token: 'tokA', company_id: 'c1', employee_id: 'e1' }, { token: 'tokB', company_id: 'c1', employee_id: 'e2' }] },
        employees: { data: [] },
      },
      rpc: { data: claims },
    });
    const log = await runTrainingTick(db, new Date(T));
    expect(pushExpo).toHaveBeenCalledTimes(2);
    expect(pushExpo).toHaveBeenNthCalledWith(1, ['tokA'], 'Capacitación', 'Ana, tienes una capacitación nueva: Uno.');
    expect(pushExpo).toHaveBeenNthCalledWith(2, ['tokB'], 'Capacitación', 'Beto, tienes una capacitación nueva: Uno.');
    expect(log).toEqual([
      'capacitación → ANA LOPEZ: error Expo no contesta',
      'capacitación → BETO RUIZ: 1 nuevas, 0 por vencer (1 tel.)',
    ]);
  });
});
