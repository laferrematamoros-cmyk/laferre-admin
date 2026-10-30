'use client';

import { addWeeks, currentMonday, weekShortLabel } from '@/lib/reports';
import { IconLeft, IconRight } from './icons';
import s from './panel.module.css';

/** ‹ 26 oct – 1 nov › + "Esta semana". Con `allowFuture` deja avanzar a semanas que vienen (Calendario). */
export default function WeekPicker({ weekStart, onChange, allowFuture = false }: {
  weekStart: Date; onChange: (monday: Date) => void; allowFuture?: boolean;
}) {
  const thisMonday = currentMonday();
  const isCurrent = weekStart.getTime() === thisMonday.getTime();
  const blockNext = !allowFuture && weekStart.getTime() >= thisMonday.getTime();
  return (
    <>
      <div className={s.weekNav}>
        <button type="button" className={s.wbtn} aria-label="Semana anterior" onClick={() => onChange(addWeeks(weekStart, -1))}>
          <IconLeft />
        </button>
        <span className={s.wlabel} suppressHydrationWarning>{weekShortLabel(weekStart)}</span>
        <button type="button" className={s.wbtn} aria-label="Semana siguiente" disabled={blockNext} onClick={() => onChange(addWeeks(weekStart, 1))}>
          <IconRight />
        </button>
      </div>
      <button type="button" className={`${s.btn} ${s.btnSoft}`} disabled={isCurrent} onClick={() => onChange(thisMonday)}>
        Esta semana
      </button>
    </>
  );
}
