'use client';

import { useCallback, useRef, useState } from 'react';
import type { TodayRow } from '@/lib/today';
import { IconBell, IconCheck } from '@/components/panel/icons';
import h from './hoy.module.css';

type Phase = 'sending' | 'sent' | 'error';
export interface Remind {
  send: (r: TodayRow) => void;
  state: { id: string; phase: Phase; text: string } | null;
}

/** Manda el recordatorio a las personas asignadas (o a toda la empresa si es general
 *  o nadie tiene su teléfono registrado) y dice a quién le llegó. */
export function useRemind(companyId: string | undefined): Remind {
  const [state, setState] = useState<Remind['state']>(null);
  const busy = useRef(false);

  const send = useCallback(async (r: TodayRow) => {
    if (!companyId || busy.current) return;
    busy.current = true;
    setState({ id: r.id, phase: 'sending', text: 'Enviando…' });
    let next: Remind['state'];
    try {
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `🔔 ${r.title}`,
          body: r.optional
            ? 'Si hoy hubo, no olvides marcarla.'
            : r.status === 'overdue'
              ? `Ya pasó la hora límite (${r.limit}). Márcala en cuanto la hagas.`
              : `Vence a las ${r.limit}. Que no se te pase.`,
          companyId,
          employeeIds: r.assignedIds,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
      next = { id: r.id, phase: 'sent', text: j.target === 'personas' ? `Avisado a ${r.assignee}` : 'Avisado a todos' };
    } catch {
      next = { id: r.id, phase: 'error', text: 'No se pudo avisar' };
    }
    busy.current = false;
    setState(next);
    setTimeout(() => setState(s => (s && s.id === r.id && s.phase !== 'sending' ? null : s)), 3500);
  }, [companyId]);

  return { send, state };
}

export default function RemindButton({ row, remind }: { row: TodayRow; remind: Remind }) {
  if (row.status === 'done' || row.status === 'doneLate') return null;
  const mine = remind.state?.id === row.id ? remind.state : null;
  const cls = mine?.phase === 'sent' ? h.remindSent : mine?.phase === 'error' ? h.remindErr : '';
  return (
    <button
      type="button"
      className={`${h.remind} ${cls}`}
      disabled={mine?.phase === 'sending'}
      onClick={e => { e.stopPropagation(); remind.send(row); }}
      onKeyDown={e => e.stopPropagation()}
      aria-label={`Recordar: ${row.title}`}
      title={row.assignedIds.length ? `Le llega a ${row.assignee}` : 'Le llega a todos los teléfonos de la empresa'}
    >
      {mine?.phase === 'sent' ? <IconCheck size={13} /> : <IconBell size={14} />}
      <span>{mine ? mine.text : 'Recordar'}</span>
    </button>
  );
}
