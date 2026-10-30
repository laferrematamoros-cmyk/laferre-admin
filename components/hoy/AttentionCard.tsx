'use client';

import { SOON_MIN, type TodayRow } from '@/lib/today';
import { IconAlert, IconCheck } from '@/components/panel/icons';
import s from '@/components/panel/panel.module.css';
import h from './hoy.module.css';
import { BG, fmtMin } from './look';
import RemindButton, { type Remind } from './RemindButton';

/** Lo atrasado y lo que vence pronto, cada uno con su botón Recordar. */
export default function AttentionCard({ rows, total, remind, onOpen }: {
  rows: TodayRow[]; total: number; remind: Remind; onOpen: (r: TodayRow) => void;
}) {
  return (
    <section className={s.card} aria-label="Necesita atención">
      <div className={s.cardHead}>
        <h2 className={s.h3}>
          <span className={`${s.hico} ${rows.length ? h.hicoAlert : ''}`}><IconAlert /></span>Necesita atención
          {rows.length > 0 && <span className={s.count}>{rows.length}</span>}
        </h2>
      </div>
      {rows.length === 0 ? (
        <div className={h.allGood}>
          <span className={`${s.ico} ${s.okPill}`}><IconCheck size={15} /></span>
          <div>
            <b>{total === 0 ? 'Sin actividades hoy' : 'Todo al día'}</b>
            <small>{total === 0 ? 'No hay nada programado para hoy.' : `Nada atrasado ni por vencer en los próximos ${SOON_MIN} minutos.`}</small>
          </div>
        </div>
      ) : (
        <ul className={h.att}>
          {rows.map(r => (
            <li key={r.id}>
              <span className={`${h.attDot} ${BG[r.status]}`} />
              <button type="button" className={h.attMain} onClick={() => onOpen(r)}>
                <b>{r.title}</b>
                <small>
                  {r.assignee} · {r.status === 'overdue' ? `${fmtMin(r.minutesLate ?? 0)} tarde` : `faltan ${fmtMin(r.minutesLeft ?? 0)}`} · límite {r.limit}
                </small>
              </button>
              <RemindButton row={r} remind={remind} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
