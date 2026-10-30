'use client';

import { useEffect, useRef } from 'react';
import { TODAY_LABEL, type TodayRow } from '@/lib/today';
import { safeHttps } from '@/lib/safe-url';
import h from './hoy.module.css';
import { PILL, fmtMin } from './look';
import RemindButton, { type Remind } from './RemindButton';

function Fact({ k, v }: { k: string; v: string }) {
  return <div className={h.fact}><span>{k}</span><b>{v}</b></div>;
}

/** Detalle de una actividad: a la derecha en computadora, desde abajo en celular. */
export default function ActivitySheet({ row, remind, onClose }: { row: TodayRow; remind: Remind; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const c = row.completion;
  const photo = safeHttps(c?.photo_url);
  const registered = c?.completed_at
    ? new Date(c.completed_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
    : null;

  return (
    <>
      <div className={h.overlay} onClick={onClose} />
      <aside className={h.sheet} role="dialog" aria-modal="true" aria-label={`Detalle: ${row.title}`}>
        <div className={h.sheetHead}>
          <div>
            <small>Detalle de actividad</small>
            <h2>{row.title}</h2>
          </div>
          <button ref={closeRef} type="button" className={h.close} onClick={onClose}>Cerrar</button>
        </div>
        <div className={h.sheetBody}>
          <div className={h.sheetTop}>
            <span className={`${h.statusPill} ${PILL[row.status]}`}>{TODAY_LABEL[row.status]}</span>
            <RemindButton row={row} remind={remind} />
          </div>
          <div className={h.facts}>
            <Fact k="Horario" v={`${row.start} – ${row.limit}`} />
            <Fact k="Asignada a" v={row.assignee} />
            {row.doneBy && <Fact k="La hizo" v={row.doneBy} />}
            {registered && <Fact k="Hora de registro" v={registered} />}
            {row.status === 'overdue' && row.minutesLate !== null && <Fact k="Atraso" v={fmtMin(row.minutesLate)} />}
            {row.status === 'running' && row.minutesLeft !== null && <Fact k="Le quedan" v={fmtMin(row.minutesLeft)} />}
          </div>
          {row.description && (
            <div>
              <p className={h.secLbl}>Instrucciones</p>
              <p className={h.note}>{row.description}</p>
            </div>
          )}
          <div>
            <p className={h.secLbl}>Evidencia</p>
            {photo ? (
              <a href={photo} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt={`Evidencia de ${row.title}`} className={h.photo} />
              </a>
            ) : (
              <div className={h.noPhoto}>
                {c?.photo_url ? 'La foto tiene un enlace no válido' : c ? 'Se marcó sin foto' : 'Todavía no se hace'}
              </div>
            )}
          </div>
          {c?.note && (
            <div>
              <p className={h.secLbl}>Nota</p>
              <p className={h.note}>{c.note}</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
