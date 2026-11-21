// Estados de capacitación (los calcula la base en cap_rows; aquí sólo etiquetas y conteos).

export type TrainingStatus = 'pending' | 'overdue' | 'understood' | 'doubt' | 'trained';

export const STATUS_LABEL: Record<TrainingStatus, string> = {
  pending: 'Por ver', overdue: 'Atrasada', understood: 'Entendida', doubt: 'Con dudas', trained: 'Capacitado en persona',
};

export const isDone = (s: TrainingStatus) => s === 'understood' || s === 'trained';
export const isOpen = (s: TrainingStatus) => s === 'pending' || s === 'overdue';

/** Una fila de cap_matrix(): persona × capacitación. */
export interface CapRow {
  employee_id: string; employee_name: string; company_id: string | null;
  training_id: string; slug: string; title: string; sort_order: number; version: number;
  status: TrainingStatus; deadline: string; answered_at: string | null; doubt_note: string | null;
  trained_at: string | null; trained_by: string | null; views: number;
}

const TZ = 'America/Matamoros';
const ymd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

function dayName(d: Date): string {
  const p = Object.fromEntries(new Intl.DateTimeFormat('es-MX', { timeZone: TZ, weekday: 'short', day: 'numeric' })
    .formatToParts(d).map(x => [x.type, x.value]));
  return `${String(p.weekday).replace('.', '').toLowerCase()} ${p.day}`;
}

/** "vence hoy" · "vence mañana" · "vence el jue 26" · "venció el jue 26". El plazo es el inicio del día siguiente. */
export function dueLabel(deadlineIso: string, now: Date): string {
  const end = new Date(deadlineIso).getTime();
  const last = new Date(end - 1);
  if (now.getTime() >= end) return `venció el ${dayName(last)}`;
  if (ymd(last) === ymd(now)) return 'vence hoy';
  if (ymd(last) === ymd(new Date(now.getTime() + 86_400_000))) return 'vence mañana';
  return `vence el ${dayName(last)}`;
}

export function summarize(statuses: TrainingStatus[]) {
  return {
    total: statuses.length,
    done: statuses.filter(isDone).length,
    open: statuses.filter(isOpen).length,
    overdue: statuses.filter(s => s === 'overdue').length,
    doubts: statuses.filter(s => s === 'doubt').length,
  };
}

export interface MatrixTraining { id: string; slug: string; title: string; done: number; total: number }
export interface MatrixPerson { id: string; name: string; companyId: string | null; cells: Record<string, CapRow>; done: number; total: number }

export function buildMatrix(rows: CapRow[]): { trainings: MatrixTraining[]; people: MatrixPerson[] } {
  const ts = new Map<string, MatrixTraining & { sort: number }>();
  const ps = new Map<string, MatrixPerson>();
  for (const r of rows) {
    const t = ts.get(r.training_id) ?? { id: r.training_id, slug: r.slug, title: r.title, done: 0, total: 0, sort: r.sort_order };
    t.total++; if (isDone(r.status)) t.done++;
    ts.set(r.training_id, t);
    const p = ps.get(r.employee_id) ?? { id: r.employee_id, name: r.employee_name, companyId: r.company_id, cells: {}, done: 0, total: 0 };
    p.cells[r.training_id] = r; p.total++; if (isDone(r.status)) p.done++;
    ps.set(r.employee_id, p);
  }
  return {
    trainings: [...ts.values()].sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title, 'es'))
      .map(({ sort: _s, ...t }) => t),
    people: [...ps.values()].sort((a, b) => a.name.localeCompare(b.name, 'es')),
  };
}

export function openDoubts(rows: CapRow[]): CapRow[] {
  return rows.filter(r => r.status === 'doubt')
    .sort((a, b) => (a.answered_at ?? '').localeCompare(b.answered_at ?? ''));
}
