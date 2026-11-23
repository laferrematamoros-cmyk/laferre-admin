'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { statusLabel, type TodayRow } from '@/lib/today';
import { safeHttps } from '@/lib/safe-url';
import { getRunFor } from '@/app/firmas/actions';
import { listShots } from '@/lib/checklist-shots';
import type { SignRun } from '@/lib/checklist-types';
import h from './hoy.module.css';
import { PILL, fmtMin } from './look';
import RemindButton, { type Remind } from './RemindButton';

function Fact({ k, v }: { k: string; v: string }) {
  return <div className={h.fact}><span>{k}</span><b>{v}</b></div>;
}

/** Fotos de una lista con firma: una por tarea, con el nombre de la tarea, y el enlace a la lista completa. */
function ListEvidence({ run }: { run: SignRun }) {
  const { shots, gone, done, total } = listShots(run);
  return (
    <div>
      {shots.length > 0 ? (
        <div className={h.shotGrid}>
          {shots.map(s => (
            <a key={s.itemId} href={s.url} target="_blank" rel="noopener noreferrer" className={h.shot}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.url} alt={s.label} loading="lazy" />
              <span>{s.label}</span>
            </a>
          ))}
        </div>
      ) : (
        <div className={h.noPhoto}>{gone > 0 ? 'Las fotos de la lista ya se borraron (más de 21 días)' : 'La lista no pedía fotos'}</div>
      )}
      <div className={h.shotFoot}>
        <span>
          Lista con firma · {done} de {total} tareas
          {shots.length > 0 && gone > 0 && ` · ${gone} foto${gone === 1 ? '' : 's'} ya se borr${gone === 1 ? 'ó' : 'aron'}`}
        </span>
        <Link href={`/firmas?run=${run.id}`} className={h.shotLink}>Ver la lista completa</Link>
      </div>
    </div>
  );
}

/** Detalle de una actividad: a la derecha en computadora, desde abajo en celular.
 *  Desde el Calendario se abre para otros días: `dateLabel` dice cuál, y "Recordar" sólo sale si es hoy. */
export default function ActivitySheet({ row, remind, onClose, dateLabel, isToday = true, past = false }: {
  row: TodayRow; remind: Remind; onClose: () => void; dateLabel?: string; isToday?: boolean; past?: boolean;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const c = row.completion;
  const photo = safeHttps(c?.photo_url);

  // Una actividad con lista se registra al firmar, sin foto: sus fotos están en cada tarea de la lista.
  // Si el registro no trae foto, se busca la lista de ese día; si no hay, se queda "Se marcó sin foto".
  const listKey = c && !c.photo_url ? `${c.activity_id}|${c.scheduled_date}` : null;
  const [found, setFound] = useState<{ key: string; run: SignRun | null } | null>(null);
  useEffect(() => {
    if (!listKey) return;
    const [activityId, date] = listKey.split('|');
    let alive = true;
    getRunFor(activityId, date)
      .then(r => { if (alive) setFound({ key: listKey, run: r.ok ? r.run : null }); })
      .catch(() => { if (alive) setFound({ key: listKey, run: null }); });
    return () => { alive = false; };
  }, [listKey]);
  const listRun = listKey && found?.key === listKey ? found.run : null;
  const lookingForList = !!listKey && found?.key !== listKey;

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
            <span className={`${h.statusPill} ${PILL[row.status]}`}>{statusLabel(row.status, past)}</span>
            {isToday && <RemindButton row={row} remind={remind} />}
          </div>
          <div className={h.facts}>
            {dateLabel && <Fact k="Fecha" v={dateLabel} />}
            <Fact k="Horario" v={`${row.start} – ${row.limit}`} />
            <Fact k="Asignada a" v={row.assignee} />
            {row.optional && <Fact k="Tipo" v="Opcional: no cuenta en el porcentaje" />}
            {row.doneBy && <Fact k="La hizo" v={row.doneBy} />}
            {registered && <Fact k="Hora de registro" v={registered} />}
            {isToday && row.status === 'overdue' && row.minutesLate !== null && <Fact k="Atraso" v={fmtMin(row.minutesLate)} />}
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
            ) : listRun ? (
              <ListEvidence run={listRun} />
            ) : lookingForList ? (
              <div className={h.noPhoto}>Buscando las fotos de la lista…</div>
            ) : (
              <div className={h.noPhoto}>
                {c?.photo_url ? 'La foto tiene un enlace no válido' : c ? 'Se marcó sin foto' : past ? 'No se hizo' : 'Todavía no se hace'}
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
