jest.mock('server-only', () => ({}));
const sendMail = jest.fn(async (..._a: unknown[]) => ({ ok: true }));
jest.mock('../mailer', () => ({ sendMail: (...a: unknown[]) => sendMail(...a) }));

import { notifyRun, readNotify } from '../checklist-notices';

const LF = 'a6798a18-9565-4f2b-929a-0c6771e7ef54';
const BFM = '22604654-8a66-4a30-9a20-ab48d7a9c794';

type Op = { m: string; a: unknown[] };
type Answer = { data: unknown; error: unknown };

/** Base de mentiras: cada consulta encadenada se contesta con `answer(tabla, operaciones)`. */
function fakeDb(answer: (table: string, ops: Op[]) => Answer) {
  const calls: { table: string; ops: Op[] }[] = [];
  const from = (table: string) => {
    const ops: Op[] = [];
    calls.push({ table, ops });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b: any = new Proxy({}, {
      get(_t, m: string) {
        if (m === 'then') return (res: (v: Answer) => void) => res(answer(table, ops));
        return (...a: unknown[]) => { ops.push({ m, a }); return b; };
      },
    });
    return b;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { db: { from } as any, calls };
}

const has = (ops: Op[], m: string) => ops.some(o => o.m === m);
const updateOf = (ops: Op[]) => ops.find(o => o.m === 'update')?.a[0] as Record<string, unknown> | undefined;

function world(opts: { company: string; emails: string[]; scope?: Record<string, string>; noScopeColumn?: boolean }) {
  return fakeDb((table, ops) => {
    if (table === 'checklist_runs') {
      const u = updateOf(ops);
      if (u && u.notified_at) {
        return { data: [{ id: 'r1', activity_id: 'a1', company_id: opts.company, employee_id: 'e1', scheduled_date: '2026-11-23', finished_at: null, was_late: false }], error: null };
      }
      return { data: null, error: null };
    }
    if (table === 'activities') return { data: { title: 'LIMPIEZA' }, error: null };
    if (table === 'employees') return { data: { name: 'Eddie' }, error: null };
    if (table === 'checklist_marks') return { data: [], error: null };
    if (table === 'signer_settings') {
      const cols = String(ops.find(o => o.m === 'select')?.a[0] ?? '');
      if (cols.includes('notify_scope') && opts.noScopeColumn) {
        return { data: null, error: { code: '42703', message: 'column signer_settings.notify_scope does not exist' } };
      }
      return { data: { notify_emails: opts.emails, notify_scope: opts.scope ?? {} }, error: null };
    }
    return { data: null, error: null };
  });
}

const resets = (calls: { table: string; ops: Op[] }[]) =>
  calls.filter(c => c.table === 'checklist_runs' && has(c.ops, 'update') && updateOf(c.ops)?.notified_at === null).length;

beforeEach(() => sendMail.mockClear());

describe('notifyRun: a quién le llega el aviso', () => {
  const emails = ['jose@x.com', 'juan@x.com'];
  const scope = { 'juan@x.com': BFM };

  it('una lista de La Ferre no le llega al de sólo BFM', async () => {
    const { db } = world({ company: LF, emails, scope });
    await notifyRun(db, 'r1');
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0]).toEqual(['jose@x.com']);
  });

  it('una lista de BFM le llega al de las dos y al de BFM', async () => {
    const { db } = world({ company: BFM, emails, scope });
    await notifyRun(db, 'r1');
    expect(sendMail.mock.calls[0][0]).toEqual(['jose@x.com', 'juan@x.com']);
  });

  it('si nadie es de esa empresa, no manda nada y no la suelta para reintentar', async () => {
    const { db, calls } = world({ company: LF, emails: ['juan@x.com'], scope });
    const line = await notifyRun(db, 'r1');
    expect(sendMail).not.toHaveBeenCalled();
    expect(resets(calls)).toBe(0);
    expect(line).toMatch(/nadie/);
  });

  it('antes del SQL 012 (sin notify_scope) le llega a todos, como antes', async () => {
    const { db } = world({ company: LF, emails, noScopeColumn: true });
    await notifyRun(db, 'r1');
    expect(sendMail.mock.calls[0][0]).toEqual(['jose@x.com', 'juan@x.com']);
  });
});

describe('readNotify', () => {
  it('dice si ya se puede escoger empresa', async () => {
    expect(await readNotify(world({ company: LF, emails: ['a@x.com'] }).db))
      .toEqual({ ok: true, scopeReady: true, entries: [{ email: 'a@x.com', companyId: null }] });
    expect(await readNotify(world({ company: LF, emails: ['a@x.com'], noScopeColumn: true }).db))
      .toEqual({ ok: true, scopeReady: false, entries: [{ email: 'a@x.com', companyId: null }] });
  });
});
