'use client';

import { TODAY_LABEL, type TodayRow } from '@/lib/today';
import { IconCamera, IconList } from '@/components/panel/icons';
import s from '@/components/panel/panel.module.css';
import h from './hoy.module.css';
import { PILL, fmtMin } from './look';
import RemindButton, { type Remind } from './RemindButton';

function pillText(r: TodayRow): string {
  if (r.status === 'overdue' && r.minutesLate !== null) return `${TODAY_LABEL.overdue} · ${fmtMin(r.minutesLate)}`;
  if (r.status === 'running' && r.minutesLeft !== null) return `${TODAY_LABEL.running} · faltan ${fmtMin(r.minutesLeft)}`;
  return TODAY_LABEL[r.status];
}

/** Todas las actividades de hoy por hora; al tocar una se abre su detalle. */
export default function TodayList({ rows, remind, onOpen }: { rows: TodayRow[]; remind: Remind; onOpen: (r: TodayRow) => void }) {
  return (
    <section className={s.card}>
      <div className={s.cardHead}>
        <h2 className={s.h3}><span className={s.hico}><IconList /></span>Actividades de hoy</h2>
        {rows.length > 0 && <span className={s.hint}>{rows.length} en total · toca una para ver el detalle</span>}
      </div>
      {rows.length === 0 ? (
        <p className={s.foot}>Hoy no hay actividades programadas.</p>
      ) : (
        <div className={h.list}>
          {rows.map(r => (
            <div
              key={r.id}
              className={h.item}
              role="button"
              tabIndex={0}
              onClick={() => onOpen(r)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(r); } }}
            >
              <span className={h.time}>{r.start}</span>
              <div className={h.itemMain}>
                <div className={h.itemTitle}>
                  <b>{r.title}</b>
                  <span className={`${h.statusPill} ${PILL[r.status]}`}>{pillText(r)}</span>
                </div>
                <div className={h.itemSub}>
                  <span>{r.assignee} · límite {r.limit}{r.doneBy ? ` · la hizo ${r.doneBy}` : ''}</span>
                  {r.completion?.photo_url && <span className={h.cam} title="Tiene foto de evidencia"><IconCamera size={14} /></span>}
                </div>
              </div>
              <div className={h.itemEnd}><RemindButton row={r} remind={remind} /></div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
