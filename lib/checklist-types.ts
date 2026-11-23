// Tipos compartidos de la lista con firma (supabase/010) en el panel.
import type { DutyOverride, Rotation } from './duty';
import type { NotifyEntry } from './notify-scope';

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

export interface SignerInfo {
  name: string;
  hasPin: boolean;
  /** A qué correos llega el aviso y de qué empresa es cada uno (null = las dos). */
  emails: NotifyEntry[];
  /** Ya se corrió el SQL 012 (se puede escoger la empresa de cada correo). */
  scopeReady: boolean;
  /** Hay cuenta de Gmail para mandar (CORREO_USUARIO y CORREO_CLAVE en Vercel). */
  mailReady: boolean;
  /** Firma con PIN bloqueada hasta esta hora (ISO), o null. */
  lockedUntil: string | null;
  /** Firma con PIN apagada por intentos equivocados (hasta crear un PIN nuevo). */
  pinDisabled: boolean;
  /** Sólo un administrador que ve las dos empresas puede cambiar esto (es una sola configuración). */
  canEdit: boolean;
}
export type SignerResult = { ok: true; signer: SignerInfo } | { ok: false; error: string };
