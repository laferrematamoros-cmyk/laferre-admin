// Tipos compartidos de la lista con firma (supabase/010) en el panel.
import type { DutyOverride, Rotation } from './duty';

export interface ChecklistItem { id: string; area: string; label: string; days: number[]; needs_photo: boolean; sort: number; }

export interface ChecklistConfig {
  enabled: boolean;
  items: ChecklistItem[];
  /** Todas las versiones del rol (la vigente es la de valid_from más reciente que ya empezó). */
  rotations: Rotation[];
  /** Cambios que todavía no terminan (de hoy en adelante). */
  overrides: (DutyOverride & { id: string })[];
  /** Hoy en Matamoros, YYYY-MM-DD (para que el editor calcule las semanas igual que el servidor). */
  today: string;
}

export type ConfigResult = { ok: true; config: ChecklistConfig } | { ok: false; error: string };

export type MarkState = 'pending' | 'done' | 'skipped';
export interface SignMark {
  item_id: string; area: string; label: string; needs_photo: boolean; sort: number;
  state: MarkState; reason: string | null;
  /** Enlace firmado de 1 h; null si no hay foto o ya se borró (más de 21 días). */
  photoUrl: string | null;
  hadPhoto: boolean;
}
export interface SignRun {
  id: string;
  activityTitle: string;
  employeeName: string;
  scheduledDate: string;
  status: 'in_progress' | 'awaiting_signature' | 'returned' | 'signed';
  finishedAt: string | null;
  wasLate: boolean | null;
  returnNote: string | null;
  signedAt: string | null;
  signedBy: string | null;
  signedVia: 'pin' | 'panel' | null;
  marks: SignMark[];
}
export type RunsResult = { ok: true; runs: SignRun[] } | { ok: false; error: string };
export type RunResult = { ok: true; run: SignRun } | { ok: false; error: string };
