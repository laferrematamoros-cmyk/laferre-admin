// Tipos del inventario (archivo normal: los 'use server' no pueden exportar tipos con `export type { }`).
export type AreaState = 'bien' | 'regular' | 'mal';
export type SectionStatus = 'pending' | 'in_progress' | 'done';

export interface InvPlan { company_id: string; every_weeks: number; first_open_date: string; due_amount: number; due_unit: 'days' | 'weeks'; is_active: boolean; }
export interface InvLetter { id: string; company_id: string; code: string; name: string | null; sort_order: number; is_active: boolean; }
export interface InvRound { id: string; company_id: string; scheduled_for: string | null; opened_at: string; due_at: string; closed_at: string | null; close_reason: 'completed' | 'superseded' | null; opened_by: string; }
export interface InvSection {
  id: string; round_id: string; company_id: string; letter_id: string | null; code: string; name: string | null; sort_order: number;
  status: SectionStatus; claimed_by: string | null; claimed_at: string | null; done_by: string | null; done_at: string | null;
  shelf_photo: string | null; report_photos: string[]; area_state: AreaState | null;
  observations: string | null; improvement: string | null; action_taken: string | null;
  had_differences: boolean | null; differences_resolved: boolean | null; pending_note: string | null;
  redo_note: string | null; redo_requested_at: string | null;
  /** Lo anota el empleado al terminar (SQL 009). null = no lo anotó (app vieja). */
  minutes_taken: number | null;
}
export interface InvPending { id: string; round_id: string; section_id: string; note: string; reported_by: string | null; reported_at: string; resolved_at: string | null; resolved_by: string | null; resolution_note: string | null; code: string; }
export interface InvRoundSummary extends InvRound {
  total: number; done: number;
  /** Promedio del tiempo anotado por letra (min) y la letra que más tardó. */
  avgMinutes: number | null; slowest: { code: string; minutes: number } | null;
}

export interface InventoryData {
  plan: InvPlan | null;
  letters: InvLetter[];
  current: InvRound | null;              // la abierta, o la última si no hay abierta
  sections: InvSection[];                // de `current`
  previous: Record<string, InvSection>;  // por letter_id: la ficha de la ronda anterior
  rounds: InvRoundSummary[];             // historial (12 más recientes)
  pendings: InvPending[];                // sin resolver
  people: Record<string, string>;        // employee_id → nombre
  perPerson: { id: string; name: string; current: number; total: number }[];
}
