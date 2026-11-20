// Bitácora semanal de una lista con firma (supabase/010): la misma tabla de la hoja de papel,
// ya llena. Pura (fechas como texto YYYY-MM-DD, sin horas locales). La usan la página y el PDF.

export interface BitItem { id: string; area: string; label: string; days: number[]; sort: number; archived_at: string | null; }
export interface BitRun {
  id: string; scheduled_date: string; employee_id: string;
  status: 'in_progress' | 'awaiting_signature' | 'returned' | 'signed';
  finished_at: string | null; signed_at: string | null; signed_by_name: string | null; signed_via: 'pin' | 'panel' | null;
}
export interface BitMark {
  run_id: string; item_id: string; area: string; label: string; sort: number;
  state: 'pending' | 'done' | 'skipped'; reason: string | null; marked_by: string | null; photo_path: string | null;
}

/** null = ese día no tocaba · none = tocaba pero ese día no hubo lista · lo demás, lo que quedó en la lista. */
export type BitCell = null | { state: 'none' } | { state: 'pending' | 'done' | 'skipped'; reason: string | null; by: string | null; photo: boolean };
export interface BitRow { itemId: string; area: string; label: string; cells: BitCell[]; }
export interface BitDay {
  date: string; dow: number;
  employee: string | null;
  status: BitRun['status'] | 'none';
  finishedAt: string | null; signedAt: string | null; signedBy: string | null; signedVia: 'pin' | 'panel' | null;
}
export interface Bitacora { days: BitDay[]; areas: { area: string; rows: BitRow[] }[]; }

const addDays = (date: string, n: number) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const dowOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

export function buildBitacora(weekStart: string, items: BitItem[], runs: BitRun[], marks: BitMark[], names: Record<string, string>): Bitacora {
  const dates = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)); // lunes a sábado
  const runOf = new Map(runs.filter(r => dates.includes(r.scheduled_date)).map(r => [r.scheduled_date, r]));
  const weekRuns = new Set([...runOf.values()].map(r => r.id));
  const weekMarks = marks.filter(m => weekRuns.has(m.run_id));
  const markOf = new Map(weekMarks.map(m => [`${m.run_id}|${m.item_id}`, m]));
  const name = (id: string | null) => (id ? names[id] ?? 'Sin nombre' : null);

  // Filas: las tareas vigentes, más las archivadas que sí se palomearon esa semana (con el nombre de entonces).
  const used = new Set(weekMarks.map(m => m.item_id));
  const rowsItems = items
    .filter(i => !i.archived_at || used.has(i.id))
    .map(i => {
      const last = i.archived_at ? weekMarks.filter(m => m.item_id === i.id).at(-1) : undefined;
      return { ...i, label: last?.label ?? i.label };
    })
    .sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label, 'es'));

  const areas: { area: string; rows: BitRow[] }[] = [];
  for (const it of rowsItems) {
    const cells: BitCell[] = dates.map(date => {
      const run = runOf.get(date);
      if (run) {
        const m = markOf.get(`${run.id}|${it.id}`);
        return m ? { state: m.state, reason: m.reason, by: name(m.marked_by), photo: !!m.photo_path } : null;
      }
      return !it.archived_at && it.days.includes(dowOf(date)) ? { state: 'none' } : null;
    });
    let group = areas.find(a => a.area === it.area);
    if (!group) { group = { area: it.area, rows: [] }; areas.push(group); }
    group.rows.push({ itemId: it.id, area: it.area, label: it.label, cells });
  }

  const days: BitDay[] = dates.map(date => {
    const r = runOf.get(date);
    return {
      date, dow: dowOf(date),
      employee: r ? name(r.employee_id) : null,
      status: r ? r.status : 'none',
      finishedAt: r?.finished_at ?? null, signedAt: r?.signed_at ?? null, signedBy: r?.signed_by_name ?? null, signedVia: r?.signed_via ?? null,
    };
  });
  return { days, areas };
}
