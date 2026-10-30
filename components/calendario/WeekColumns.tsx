'use client';

import type { ReactNode } from 'react';
import { statusLabel, type TodayRow } from '@/lib/today';
import { TipBody, useTip } from '@/components/panel/ui';
import { BG } from '@/components/hoy/look';
import c from './cal.module.css';
import { DAY_SHORT, EV, MINI_ORDER, daySummary, type CalDay } from './days';

/** Hueco libre que vale la pena marcar para planear. */
const GAP_MIN = 60;
const hm = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;

/** Computadora: los 7 días lado a lado, cada uno con sus actividades en orden de hora
 *  (nombre completo), los huecos libres de 1 h o más y, hoy, la marca de "Ahora". */
export default function WeekColumns({ days, now, onOpen }: { days: CalDay[]; now: Date; onOpen: (d: CalDay, r: TodayRow) => void }) {
  const tip = useTip();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  return (
    <div className={c.colsWrap}>
      <div className={c.cols}>
        {days.map((d, di) => {
          const items: ReactNode[] = [];
          let maxEnd = -1;
          let nowPlaced = !d.isToday;
          d.report.rows.forEach((r: TodayRow, i) => {
            if (maxEnd >= 0 && r.startMin - maxEnd >= GAP_MIN) {
              items.push(<div key={`g${i}`} className={c.gap}>libre {hm(maxEnd)}–{hm(r.startMin)}</div>);
            }
            if (!nowPlaced && r.startMin > nowMin) {
              items.push(<div key="now" className={c.nowMark}>Ahora {hm(nowMin)}</div>);
              nowPlaced = true;
            }
            const who = r.doneBy ?? (r.general ? '' : r.assignee);
            items.push(
              <button
                key={r.id}
                type="button"
                className={`${c.tile} ${EV[r.status]}`}
                onClick={() => onOpen(d, r)}
                aria-label={`${r.title}, ${r.start} a ${r.limit}, ${statusLabel(r.status, d.past)}`}
                {...tip(<TipBody title={r.title} line={`${r.start} – ${r.limit} · ${statusLabel(r.status, d.past)}`} foot={r.doneBy ? `La hizo ${r.doneBy}` : r.assignee} />)}
              >
                <span className={c.tTime}>{r.start}<span> – {r.limit}</span></span>
                <b>{r.title}</b>
                <small>{statusLabel(r.status, d.past)}{who ? ` · ${who}` : ''}</small>
              </button>,
            );
            maxEnd = Math.max(maxEnd, r.limitMin);
          });
          if (!nowPlaced && d.report.rows.length > 0) items.push(<div key="now" className={c.nowMark}>Ahora {hm(nowMin)}</div>);

          return (
            <section key={di} className={`${c.colCard} ${d.isToday ? c.todayCard : ''}`} aria-label={`${DAY_SHORT[d.date.getDay()]} ${d.date.getDate()}: ${daySummary(d)}`}>
              <div className={`${c.dayHead} ${d.isToday ? c.today : ''}`}>
                <span className={c.dname}>{DAY_SHORT[d.date.getDay()]}</span>
                <span className={c.dnum}>{d.date.getDate()}</span>
                <span className={c.dsum}>{daySummary(d)}</span>
                {d.report.rows.length > 0 && (
                  <span className={c.mini}>
                    {MINI_ORDER.filter(k => d.report.counts[k] > 0).map(k => <i key={k} className={BG[k]} style={{ flexGrow: d.report.counts[k] }} />)}
                  </span>
                )}
              </div>
              <div className={c.colList}>
                {items.length ? items : <p className={c.empty}>Día libre</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
