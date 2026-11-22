// Reglas puras de la página "Capacitación" del admin (se prueban sin navegador ni servidor).
// Imports relativos: jest no tiene el mapeo de `@/`.
import type { MatrixPerson } from './status';

const TZ = 'America/Matamoros';

// ── Pestañas (?tab=) ──

export type CapTab = 'avance' | 'capacitar' | 'ajustes';
export const CAP_TABS: readonly CapTab[] = ['avance', 'capacitar', 'ajustes'];

/** La pestaña que pide la dirección (`?tab=ajustes`); cualquier otra cosa es "avance". */
export function tabFromSearch(search: string): CapTab {
  const t = new URLSearchParams(search).get('tab');
  return CAP_TABS.find(x => x === t) ?? 'avance';
}

/** La dirección de una pestaña: "avance" va sin `?tab=`. */
export const tabHref = (path: string, tab: CapTab) => (tab === 'avance' ? path : `${path}?tab=${tab}`);

// ── Quién cambia los ajustes ──

/**
 * Las capacitaciones son UNA configuración para las dos empresas (como la firma de listas, app/ajustes/signer-actions.ts):
 * verlas, cualquier administrador; cambiarlas, sólo uno que ve las dos empresas (own = null).
 */
export const SHARED_EDIT_ONLY = 'Sólo un administrador de las dos empresas puede cambiar las capacitaciones.';
export const canEditShared = (own: string | null) => own === null;

// ── Tope de filas ──

/** La base nunca regresa más de 1,000 filas y no avisa: con 1,000 o más la tabla podría venir cortada sin que se note. */
export const MATRIX_MAX_ROWS = 1000;
export const matrixSizeError = (rows: number): string | null =>
  rows >= MATRIX_MAX_ROWS ? 'La tabla tiene demasiadas filas para mostrarse; avísale a Claude.' : null;

// ── Ajustes: plazo y tiempo mínimo ──

/** Los mismos límites que el check de la base (supabase/011) y que revisa saveTraining. */
export const LIMITS = {
  deadline_days: { min: 1, max: 60, error: 'El plazo va de 1 a 60 días.' },
  min_seconds: { min: 5, max: 600, error: 'El tiempo va de 5 a 600 segundos.' },
} as const;
export type LimitField = keyof typeof LIMITS;

/** null si el valor sirve; si no, el mensaje para la pantalla. */
export function limitError(field: LimitField, value: unknown): string | null {
  const { min, max, error } = LIMITS[field];
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? null : error;
}

/** Lo que escribió en el campo → número válido, o el mensaje de por qué no. */
export function parseLimit(field: LimitField, raw: string): { ok: true; value: number } | { ok: false; error: string } {
  const t = raw.trim();
  const n = /^\d{1,4}$/.test(t) ? Number(t) : NaN;
  const error = limitError(field, n);
  return error ? { ok: false, error } : { ok: true, value: n };
}

// ── Guardados en curso por renglón ──

/** Lo que se está guardando en cada renglón. Es una lista, no un solo valor: dos guardados del mismo renglón no se pisan. */
export type BusyMap<W extends string> = Record<string, W[]>;

export function addBusy<W extends string>(m: BusyMap<W>, id: string, what: W): BusyMap<W> {
  return { ...m, [id]: [...(m[id] ?? []), what] };
}

/** Quita UNA vez `what` del renglón; si ya no queda nada, el renglón sale del mapa. */
export function removeBusy<W extends string>(m: BusyMap<W>, id: string, what: W): BusyMap<W> {
  const list = [...(m[id] ?? [])];
  const i = list.indexOf(what);
  if (i < 0) return m;
  list.splice(i, 1);
  if (list.length) return { ...m, [id]: list };
  const { [id]: _gone, ...rest } = m;
  return rest;
}

// ── Tabla de avance ──

export interface PeopleGroup { key: string; name: string | null; people: MatrixPerson[] }

/**
 * Separa a las personas por empresa sólo si hay más de una (admin que ve las dos);
 * con una sola empresa regresa un solo grupo sin nombre (no hace falta el renglón separador).
 */
export function groupPeople(people: MatrixPerson[], names: Record<string, string>): PeopleGroup[] {
  const ids = [...new Set(people.map(p => p.companyId ?? ''))];
  if (ids.length <= 1) return [{ key: ids[0] ?? '', name: null, people }];
  return ids
    .map(id => ({ key: id, name: (id && names[id]) || 'Sin empresa', people: people.filter(p => (p.companyId ?? '') === id) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

/** "EDDIE GARCÍA LÓPEZ" → "EG" (para el circulito de la tarjeta). */
export function initials(name: string): string {
  const w = name.trim().split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? '') + (w[1]?.[0] ?? '')).toLocaleUpperCase('es-MX') || '?';
}

// ── Errores ──

/** Si la base todavía no tiene la 011, el mensaje de Supabase no le dice nada al admin: se traduce. */
export function friendlyLoadError(message: string): { text: string; detail: string | null } {
  if (/schema cache|does not exist|could not find the (table|function)/i.test(message)) {
    return { text: 'Falta preparar la base de datos de Capacitación (supabase/011_capacitaciones.sql).', detail: message };
  }
  return { text: message, detail: null };
}

// ── Fechas (hora de Matamoros) ──

const ymd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const dayNumber = (s: string) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) / 86_400_000; };
const clean = (s: string) => s.replace('.', '').toLowerCase();

function parts(d: Date, o: Intl.DateTimeFormatOptions): Record<string, string> {
  return Object.fromEntries(new Intl.DateTimeFormat('es-MX', { timeZone: TZ, ...o }).formatToParts(d).map(x => [x.type, x.value]));
}

/** "sáb 21 nov, 12:30" */
export function stamp(iso: string): string {
  const d = new Date(iso);
  const p = parts(d, { weekday: 'short', day: 'numeric', month: 'short' });
  const t = parts(d, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${clean(p.weekday)} ${p.day} ${clean(p.month)}, ${t.hour}:${t.minute}`;
}

/** Desde cuándo espera una duda: "desde hoy" · "desde ayer" · "desde el sáb 21" · "desde el 3 oct" (más de 6 días). */
export function sinceLabel(iso: string, now: Date): string {
  const d = new Date(iso);
  const days = dayNumber(ymd(now)) - dayNumber(ymd(d));
  if (days <= 0) return 'desde hoy';
  if (days === 1) return 'desde ayer';
  if (days <= 6) { const p = parts(d, { weekday: 'short', day: 'numeric' }); return `desde el ${clean(p.weekday)} ${p.day}`; }
  const p = parts(d, { day: 'numeric', month: 'short' });
  return `desde el ${p.day} ${clean(p.month)}`;
}
