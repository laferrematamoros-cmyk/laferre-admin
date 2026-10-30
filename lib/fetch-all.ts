type Page<T> = { data: T[] | null; error: { message: string } | null };

/** Trae todas las filas de una consulta pidiendo páginas de `pageSize`.
 *  La base nunca entrega más de 1,000 filas por consulta y no avisa cuando corta.
 *  La consulta DEBE llevar `.order()`: sin orden, las páginas se enciman y se pierden filas. */
export async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<Page<T>>,
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < pageSize) return out;
  }
}
