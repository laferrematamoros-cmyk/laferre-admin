'use client';

import { useEffect, useRef, useState } from 'react';
import type { CapRow } from '@/lib/capacitaciones/status';
import { initials, sinceLabel } from '@/lib/capacitaciones/admin-view';
import { titleCase } from '@/lib/checklist-mail';
import s from '@/components/panel/panel.module.css';
import v from './capacitaciones.module.css';

type Result = { ok: true } | { ok: false; error: string };

const keyOf = (r: CapRow) => `${r.training_id}:${r.employee_id}`;

/** Por capacitar: las dudas abiertas (ya vienen de la más vieja a la más nueva). "Ya lo capacité" pide confirmar en la tarjeta. */
export default function DoubtList({ rows, onDone, now = new Date() }: {
  rows: CapRow[];
  onDone: (trainingId: string, employeeId: string) => Promise<Result>;
  now?: Date;
}) {
  const [asking, setAsking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ key: string; text: string } | null>(null);
  const askRef = useRef<HTMLDivElement>(null);

  // Al pedir confirmación, el foco pasa a la pregunta (el botón que se tocó desaparece).
  useEffect(() => { if (asking) askRef.current?.focus(); }, [asking]);

  if (rows.length === 0) return <div className={v.empty}>No hay dudas pendientes.</div>;

  function cancel(k: string) {
    setAsking(null);
    setError(null);
    requestAnimationFrame(() => document.getElementById(`cap-done-${k}`)?.focus());
  }

  async function confirm(r: CapRow) {
    const k = keyOf(r);
    setBusy(true);
    setError(null);
    let res: Result;
    try { res = await onDone(r.training_id, r.employee_id); }
    catch { res = { ok: false, error: 'No se pudo guardar. Revisa la conexión y vuelve a intentar.' }; }
    setBusy(false);
    if (res.ok) setAsking(null); else setError({ key: k, text: res.error });
  }

  return (
    <div className={v.doubts}>
      {rows.map(r => {
        const k = keyOf(r);
        const name = titleCase(r.employee_name);
        return (
          <article key={k} className={`${s.card} ${v.doubt}`} aria-label={`${name}: ${r.title}`}>
            <div className={v.person}>
              <span className={v.av} aria-hidden>{initials(r.employee_name)}</span>
              <div><b>{name}</b><span>{r.title}</span></div>
            </div>
            {r.doubt_note
              ? <blockquote className={v.quote}>“{r.doubt_note}”</blockquote>
              : <p className={v.noNote}>Sin nota</p>}
            {r.answered_at && <span className={v.since}>{sinceLabel(r.answered_at, now)}</span>}
            {asking === k ? (
              <div ref={askRef} tabIndex={-1} className={v.confirm} role="group" aria-labelledby={`cap-ask-${k}`}>
                <p id={`cap-ask-${k}`}>¿Ya le explicaste {r.title} a {name}?</p>
                {error?.key === k && <p className={v.err} role="alert">{error.text}</p>}
                <div className={v.pair}>
                  <button type="button" className={`${v.btn} ${v.dark}`} disabled={busy} onClick={() => confirm(r)}>
                    {busy ? 'Guardando…' : 'Sí, ya'}
                  </button>
                  <button type="button" className={v.btn} disabled={busy} onClick={() => cancel(k)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button type="button" id={`cap-done-${k}`} className={v.btn} disabled={busy}
                onClick={() => { setAsking(k); setError(null); }}>
                Ya lo capacité
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}
