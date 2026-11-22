'use client';

import { useEffect, useRef, useState } from 'react';
import type { CapRow } from '@/lib/capacitaciones/status';
import { initials, sinceLabel } from '@/lib/capacitaciones/admin-view';
import { titleCase } from '@/lib/checklist-mail';
import s from '@/components/panel/panel.module.css';
import v from './capacitaciones.module.css';

type Result = { ok: true } | { ok: false; error: string };

const keyOf = (r: CapRow) => `${r.training_id}:${r.employee_id}`;
const doneId = (k: string) => `cap-done-${k}`;

/**
 * Por capacitar: las dudas abiertas (ya vienen de la más vieja a la más nueva). "Ya lo capacité" pide confirmar en la tarjeta.
 * `onDone` debe regresar cuando la lista ya se volvió a cargar (salga bien o mal).
 */
export default function DoubtList({ rows, onDone, now = new Date(), focusWhenEmpty }: {
  rows: CapRow[];
  onDone: (trainingId: string, employeeId: string) => Promise<Result>;
  now?: Date;
  /** A dónde va el foco si se cerró la última duda (la página manda a la pestaña). */
  focusWhenEmpty?: () => void;
}) {
  const [asking, setAsking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ key: string; text: string } | null>(null);
  // Tarjeta que se acaba de cerrar: cuando llegue la lista nueva, el foco pasa a la que quedó en su lugar.
  const [refocus, setRefocus] = useState<{ index: number; key: string; before: CapRow[] } | null>(null);
  const askRef = useRef<HTMLDivElement>(null);

  // Al pedir confirmación, el foco pasa a la pregunta (el botón que se tocó desaparece).
  useEffect(() => { if (asking) askRef.current?.focus(); }, [asking]);

  useEffect(() => {
    if (!refocus || rows === refocus.before) return; // todavía no llega la lista nueva
    setRefocus(null);
    // Si la tarjeta sigue (falló y la duda sigue abierta), el foco vuelve a ella: a su botón o a la pregunta con el error.
    if (rows.some(r => keyOf(r) === refocus.key)) {
      (document.getElementById(doneId(refocus.key)) ?? askRef.current)?.focus();
      return;
    }
    const target = rows[Math.min(refocus.index, rows.length - 1)];
    if (target) document.getElementById(doneId(keyOf(target)))?.focus();
    else focusWhenEmpty?.();
  }, [rows, refocus, focusWhenEmpty]);

  function cancel(k: string) {
    setAsking(null);
    setError(null);
    requestAnimationFrame(() => document.getElementById(doneId(k))?.focus());
  }

  async function confirm(r: CapRow, index: number) {
    const k = keyOf(r);
    const before = rows;
    setBusy(true);
    setError(null);
    let res: Result;
    try { res = await onDone(r.training_id, r.employee_id); }
    catch { res = { ok: false, error: 'No se pudo guardar. Revisa la conexión y vuelve a intentar.' }; }
    setBusy(false);
    if (res.ok) setAsking(null);
    else setError({ key: k, text: res.error });
    // "Sí, ya" se apagó mientras guardaba y perdió el foco: se acomoda cuando llegue la lista nueva.
    setRefocus({ index, key: k, before });
  }

  // Si falló pero la tarjeta ya no está (p. ej. alguien más cerró la duda y la lista se volvió a cargar), el aviso sale arriba.
  const orphan = error && !rows.some(r => keyOf(r) === error.key) ? error.text : null;

  return (
    <>
      {orphan && <p className={`${v.err} ${v.listAlert}`} role="alert">{orphan}</p>}
      {rows.length === 0 ? (
        <div className={v.empty}>No hay dudas pendientes.</div>
      ) : (
        <div className={v.doubts}>
          {rows.map((r, i) => {
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
                      <button type="button" className={`${v.btn} ${v.dark}`} disabled={busy} onClick={() => confirm(r, i)}>
                        {busy ? 'Guardando…' : 'Sí, ya'}
                      </button>
                      <button type="button" className={v.btn} disabled={busy} onClick={() => cancel(k)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" id={doneId(k)} className={v.btn} disabled={busy}
                    onClick={() => { setAsking(k); setError(null); }}>
                    Ya lo capacité
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
