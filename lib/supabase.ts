import { createClient } from '@supabase/supabase-js';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Usado en Client Components (lectura pública)
export const supabase = createClient(url, anon);

// Usado en Server Actions / Route Handlers (escritura admin)
export function supabaseAdmin() {
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// ── Tipos ────────────────────────────────────────────────────────────────────
export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  color_primary: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  is_active: boolean;
}

export interface Activity {
  id: string;
  title: string;
  description: string | null;
  start_time: string;   // "HH:MM:SS"
  limit_time: string;
  recurrence: string;
  days_of_week: number[];
  assigned_employee_ids: string[];
  is_urgent: boolean;
  reminder_minutes: number;
  evidence_photo: boolean;
  evidence_name: boolean;
  evidence_note: boolean;
  evidence_signature: boolean;
  is_active: boolean;
}

export interface Completion {
  id: string;
  activity_id: string;
  employee_id: string;
  completed_at: string;
  scheduled_date: string;
  photo_url: string | null;
  note: string | null;
  was_late: boolean;
}
