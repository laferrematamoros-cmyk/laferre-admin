// A quién le toca una actividad un día. Copia de duty_employee() de supabase/010:
// si se cambia una, se cambia la otra (las dos pruebas usan los mismos casos).
export interface Rotation { employee_ids: string[]; anchor_week: string; valid_from: string; created_at: string; }
export interface DutyOverride { from_date: string; to_date: string; employee_id: string; created_at: string; }
/** Lo que withDuty() le agrega a una actividad con lista. */
export interface DutyInfo { rotations?: Rotation[]; overrides?: DutyOverride[]; signingDates?: string[]; }

const dayNum = (s: string) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d) / 86_400_000; };
const fromNum = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10);

export function mondayOf(date: string): string {
  const n = dayNum(date);
  const dow = new Date(n * 86_400_000).getUTCDay(); // 0 = domingo
  return fromNum(n - ((dow + 6) % 7));
}

export function dutyOn(rotations: Rotation[] | undefined, overrides: DutyOverride[] | undefined, date: string): string | null {
  const o = (overrides ?? [])
    .filter(x => x.from_date <= date && date <= x.to_date)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (o) return o.employee_id;
  const r = (rotations ?? [])
    .filter(x => x.valid_from <= date && x.employee_ids.length > 0)
    .sort((a, b) => b.valid_from.localeCompare(a.valid_from) || b.created_at.localeCompare(a.created_at))[0];
  if (!r) return null;
  const n = r.employee_ids.length;
  const week = Math.floor((dayNum(date) - dayNum(r.anchor_week)) / 7);
  return r.employee_ids[((week % n) + n) % n];
}

/** Asignados de la actividad ese día: con rol, el de turno (o nadie); sin rol, los de siempre. */
export function assignedOn(a: { assigned_employee_ids: string[] | null } & DutyInfo, date: string): string[] {
  if (a.rotations && a.rotations.length > 0) {
    const d = dutyOn(a.rotations, a.overrides, date);
    return d ? [d] : [];
  }
  return (a.assigned_employee_ids ?? []) as string[];
}

/** La lista de ese día está terminada y espera firma. */
export const isSigning = (a: DutyInfo, date: string): boolean => (a.signingDates ?? []).includes(date);

/** Esta semana y las siguientes, para el editor del rol. */
export function upcomingDuty(rotations: Rotation[], overrides: DutyOverride[], today: string, n: number): { weekStart: string; employeeId: string | null }[] {
  const start = dayNum(mondayOf(today));
  return Array.from({ length: n }, (_, i) => {
    const weekStart = fromNum(start + i * 7);
    // Se pregunta por el martes: un cambio de un solo día en lunes no debe pintar toda la semana.
    return { weekStart, employeeId: dutyOn(rotations, overrides.filter(o => o.from_date <= weekStart && o.to_date >= fromNum(dayNum(weekStart) + 5)), fromNum(dayNum(weekStart) + 1)) };
  });
}
