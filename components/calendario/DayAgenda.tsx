'use client';

import { statusLabel, type TodayRow } from '@/lib/today';
import { PILL } from '@/components/hoy/look';
import s from '@/components/panel/panel.module.css';
import h from '@/components/hoy/hoy.module.css';
import c from './cal.module.css';
import { DAY_SHORT, EDGE, dayDot, daySummary, longDate, type CalDay } from './days';

/** Celular: tira con los 7 días y, debajo, las actividades del día elegido en tarjetas por hora. */
export default function DayAgenda({ days, selected, onSelect, onOpen }: {
  days: CalDay[]; selected: number; onSelect: (i: number) => void; onOpen: (d: CalDay, r: TodayRow) => void;
}) {
  const d = days[selected];
  return (
    <div className={c.agenda}>
      <div className={c.strip} role="tablist" aria-label="Días de la semana">
        {days.map((x, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === selected}
            aria-label={`${longDate(x.date)}: ${daySummary(x)}`}
            className={`${c.dayBtn} ${x.isToday ? c.isToday : ''}`}
            onClick={() => onSelect(i)}
          >
            <span className={c.dl}>{DAY_SHORT[x.date.getDay()]}</span>
            <span className={c.dn}>{x.date.getDate()}</span>
            <span className={`${c.dot} ${dayDot(x)}`} />
          </button>
        ))}
      </div>

      {d && (
        <>
          <div className={c.agendaHead}>
            <h2>{d.isToday ? `Hoy, ${longDate(d.date)}` : longDate(d.date)}</h2>
            <span className={s.hint}>{daySummary(d)}</span>
          </div>
          {d.report.rows.length === 0 ? (
            <p className={s.foot}>No hay actividades este día.</p>
          ) : (
            <div className={c.cards}>
              {d.report.rows.map(r => (
                <button key={r.id} type="button" className={`${c.cardItem} ${EDGE[r.status]}`} onClick={() => onOpen(d, r)}>
                  <span className={c.ctime}><b>{r.start}</b><small>a {r.limit}</small></span>
                  <span className={c.cmain}>
                    <b>{r.title}</b>
                    <span className={c.cmeta}>
                      <span className={`${h.statusPill} ${PILL[r.status]}`}>{statusLabel(r.status, d.past)}</span>
                      <span>{r.doneBy ? `La hizo ${r.doneBy}` : r.assignee}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
