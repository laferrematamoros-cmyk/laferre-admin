import { fetchAllPages } from '../fetch-all';

describe('fetchAllPages', () => {
  const rows = Array.from({ length: 2037 }, (_, i) => i);

  it('pide páginas hasta que una regresa incompleta', async () => {
    const calls: [number, number][] = [];
    const out = await fetchAllPages<number>(async (from, to) => {
      calls.push([from, to]);
      return { data: rows.slice(from, to + 1), error: null };
    });
    expect(out).toEqual(rows);
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it('si la última página viene justa, pide una más y termina', async () => {
    const exact = rows.slice(0, 1000);
    let n = 0;
    const out = await fetchAllPages<number>(async (from, to) => { n++; return { data: exact.slice(from, to + 1), error: null }; });
    expect(out).toHaveLength(1000);
    expect(n).toBe(2);
  });

  it('si la base responde con error, lo lanza', async () => {
    await expect(fetchAllPages(async () => ({ data: null, error: { message: 'sin permiso' } }))).rejects.toThrow('sin permiso');
  });
});
