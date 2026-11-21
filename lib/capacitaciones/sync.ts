import type { CatalogEntry } from './catalog';

export interface DbTraining { id: string; slug: string; title: string; version: number; sort_order: number }
export interface SyncInsert { slug: string; title: string; version: number; min_seconds: number; sort_order: number; is_active: false }
export interface SyncUpdate { id: string; title?: string; version?: number }
export interface SyncPlan { inserts: SyncInsert[]; updates: SyncUpdate[] }

/** Qué cambiar en `trainings` para que coincida con el código: altas pausadas al final, títulos, versiones (sólo hacia arriba). */
export function catalogSyncPlan(catalog: CatalogEntry[], rows: DbTraining[]): SyncPlan {
  const bySlug = new Map(rows.map(r => [r.slug, r]));
  let last = rows.reduce((m, r) => Math.max(m, r.sort_order), 0);
  const inserts: SyncInsert[] = [];
  const updates: SyncUpdate[] = [];
  for (const c of catalog) {
    const r = bySlug.get(c.slug);
    if (!r) {
      inserts.push({ slug: c.slug, title: c.title, version: c.version, min_seconds: c.minSeconds, sort_order: ++last, is_active: false });
      continue;
    }
    const u: SyncUpdate = { id: r.id };
    if (r.title !== c.title) u.title = c.title;
    if (c.version > r.version) u.version = c.version;
    if (u.title !== undefined || u.version !== undefined) updates.push(u);
  }
  return { inserts, updates };
}
