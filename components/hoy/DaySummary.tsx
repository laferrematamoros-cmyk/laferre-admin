'use client';

import { RATING_LABEL, ratingOf } from '@/lib/reports';
import type { TodayReport, TodayRow, TodayStatus } from '@/lib/today';
import Ring from '@/components/panel/Ring';
import { CountUp } from '@/components/panel/ui';
import { IconCheck, IconClock, IconX } from '@/components/panel/icons';
import s from '@/components/panel/panel.module.css';
import h from './hoy.module.css';
import { BG } from './look';
import DayLine from './DayLine';

const PILL = { ok: s.okPill, late: s.latePill, miss: s.missPill };
const CHIPS: TodayStatus[] = ['overdue', 'running', 'upcoming', 'doneLate', 'done'];
const CHIP_TXT: Record<TodayStatus, [string, string]> = {
  overdue: ['atrasada', 'atrasadas'],
  running: ['en curso', 'en curso'],
  upcoming: ['por hacer', 'por hacer'],
  doneLate: ['hecha tarde', 'hechas tarde'],
  done: ['hecha a tiempo', 'hechas a tiempo'],
};

export default function DaySummary({ report, now, onOpen }: { report: TodayReport; now: Date; onOpen: (r: TodayRow) => void }) {
  const { pct, done, due, counts, rows } = report;
  const rating = pct === null ? null : ratingOf(pct);
  return (
    <section className={`${s.card} ${h.summary}`} aria-label="Cómo va el día">
      <Ring pct={pct} />
      <div className={h.summaryText}>
        {rating && (
          <div>
            <span className={`${s.pill} ${PILL[rating]}`}>
              {rating === 'ok' ? <IconCheck /> : rating === 'late' ? <IconClock size={12} /> : <IconX />}
              {RATING_LABEL[rating]}
            </span>
          </div>
        )}
        <p className={s.headline}>
          {rows.length === 0 ? <>Hoy no hay actividades programadas.</>
            : pct === null ? <>Todavía no vence nada hoy.</>
            : <>Van <b><CountUp value={done} duration={2200} /> de {due}</b> que ya tocaban.</>}
        </p>
        {rows.length > 0 && (
          <div className={h.chips}>
            {CHIPS.filter(k => counts[k] > 0).map(k => (
              <span key={k}><i className={`${h.sw} ${BG[k]}`} /><b>{counts[k]}</b>{CHIP_TXT[k][counts[k] === 1 ? 0 : 1]}</span>
            ))}
          </div>
        )}
      </div>
      {rows.length > 0 && <div className={h.lineWrap}><DayLine rows={rows} now={now} onOpen={onOpen} /></div>}
    </section>
  );
}
