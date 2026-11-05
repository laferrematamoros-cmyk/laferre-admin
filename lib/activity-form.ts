import type { Activity } from './supabase';
import { joinEs } from './report-insights';

/** Lo que se edita en el formulario de una actividad. */
export interface ActivityValues {
  title: string;
  description: string;
  start: string;            // "HH:MM"
  limit: string;            // "HH:MM"
  days: number[];           // 0 = domingo … 6 = sábado
  weekOfMonth: number | null;
  assigned: string[];
  reminder: number;         // minutos
  photo: boolean;
  /** Avisa y se puede marcar, pero si no se hace no cuenta. */
  optional: boolean;
}
export type FormErrors = Partial<Record<'title' | 'days' | 'limit', string>>;

export const REMINDERS = [5, 10, 15, 30];
export const EMPTY_VALUES: ActivityValues = {
  title: '', description: '', start: '09:00', limit: '10:00', days: [1, 2, 3, 4, 5],
  weekOfMonth: null, assigned: [], reminder: 10, photo: true, optional: false,
};

const DAY_NAME = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const same = (a: number[], b: number[]) => a.length === b.length && b.every(d => a.includes(d));
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function validate(v: ActivityValues): FormErrors {
  const e: FormErrors = {};
  if (!v.title.trim()) e.title = 'Escribe qué hay que hacer.';
  if (v.days.length === 0) e.days = 'Escoge al menos un día.';
  if (v.limit <= v.start) e.limit = 'La hora límite debe ser después de la hora de inicio.';
  return e;
}

/** "Todos los días" · "Lunes a viernes" · "Lunes, miércoles y viernes". */
export function daysText(days: number[]): string {
  if (days.length === 0) return 'Ningún día';
  if (days.length === 7) return 'Todos los días';
  if (same(days, [1, 2, 3, 4, 5])) return 'Lunes a viernes';
  if (same(days, [1, 2, 3, 4, 5, 6])) return 'Lunes a sábado';
  return cap(joinEs(WEEK_ORDER.filter(d => days.includes(d)).map(d => DAY_NAME[d])));
}

/** Mismo texto que guardaba el formulario anterior en `recurrence`. */
export function recurrenceLabel(days: number[]): string {
  if (days.length === 7) return 'diaria';
  if (same(days, [1, 2, 3, 4, 5])) return 'lun-vie';
  if (same(days, [1, 2, 3, 4, 5, 6])) return 'lun-sáb';
  return 'personalizado';
}

export function summaryText(v: ActivityValues): string {
  const month = v.weekOfMonth == null ? '' : `, sólo la ${v.weekOfMonth === -1 ? 'última' : `${v.weekOfMonth}ª`} semana del mes`;
  return `${daysText(v.days)}, de ${v.start} a ${v.limit}${month}${v.optional ? ' (opcional)' : ''}`;
}

/** Columnas que el formulario controla. No toca is_urgent ni evidence_name/note/signature
 *  (la app no los usa y el formulario viejo los apagaba al guardar). */
export function toRow(v: ActivityValues) {
  return {
    title: v.title.trim(),
    description: v.description.trim() || null,
    start_time: v.start,
    limit_time: v.limit,
    recurrence: recurrenceLabel(v.days),
    days_of_week: WEEK_ORDER.filter(d => v.days.includes(d)).sort((a, b) => a - b),
    week_of_month: v.weekOfMonth,
    assigned_employee_ids: v.assigned,
    reminder_minutes: v.reminder,
    evidence_photo: v.photo,
    is_optional: v.optional,
  };
}

type Editable = Pick<Activity, 'title' | 'description' | 'start_time' | 'limit_time' | 'days_of_week' | 'week_of_month' | 'assigned_employee_ids' | 'reminder_minutes' | 'evidence_photo' | 'is_optional'>;

export function fromActivity(a: Editable): ActivityValues {
  return {
    title: a.title,
    description: a.description ?? '',
    start: a.start_time.slice(0, 5),
    limit: a.limit_time.slice(0, 5),
    days: [...(a.days_of_week ?? [])],
    weekOfMonth: a.week_of_month ?? null,
    assigned: [...(a.assigned_employee_ids ?? [])],
    reminder: a.reminder_minutes || 10,
    photo: !!a.evidence_photo,
    optional: !!a.is_optional,
  };
}
