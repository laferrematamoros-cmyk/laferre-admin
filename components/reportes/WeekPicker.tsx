'use client';

import { addWeeks, currentMonday, weekShortLabel } from '@/lib/reports';
import { IconLeft, IconRight } from './icons';
import s from './reportes.module.css';

export default function WeekPicker({ weekStart, onChange }: { weekStart: Date; onChange: (monday: Date) => void }) {
  const thisMonday = currentMonday();
  const atCurrent = weekStart.getTime() >= thisMonday.getTime();
  return (
    <>
      <div className={s.weekNav}>
        <button type="button" className={s.wbtn} aria-label="Semana anterior" onClick={() => onChange(addWeeks(weekStart, -1))}>
          <IconLeft />
        </button>
        <span className={s.wlabel}>{weekShortLabel(weekStart)}</span>
        <button type="button" className={s.wbtn} aria-label="Semana siguiente" disabled={atCurrent} onClick={() => onChange(addWeeks(weekStart, 1))}>
          <IconRight />
        </button>
      </div>
      <button type="button" className={`${s.btn} ${s.btnSoft}`} disabled={atCurrent} onClick={() => onChange(thisMonday)}>
        Esta semana
      </button>
    </>
  );
}
