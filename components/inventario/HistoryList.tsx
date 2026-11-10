'use client';

import type { InvRoundSummary } from '@/lib/inventory-types';
import { daysBetween, roundStatus } from '@/lib/inventory-schedule';
import c from '@/components/conoce/co.module.css';
import v from './inv.module.css';
import { ROUND_LABEL, roundDates, roundName, shopDate } from './labels';

/** Los últimos inventarios: cuántas letras, cómo terminó y cuántos días tomó. */
export default function HistoryList({ rounds, now }: { rounds: InvRoundSummary[]; now: Date }) {
  if (rounds.length === 0) return <div className={c.empty}>Todavía no hay inventarios.</div>;
  return (
    <div className={v.history}>
      {rounds.map(r => {
        const st = roundStatus(r, now);
        const days = r.closed_at ? daysBetween(shopDate(r.opened_at), shopDate(r.closed_at)) + 1 : null;
        return (
          <div key={r.id} className={v.hrow}>
            <div>
              <b>{roundName(r)}</b>
              <small>{roundDates(r)}{days ? ` · tomó ${days} ${days === 1 ? 'día' : 'días'}` : ''}</small>
            </div>
            <span className={v.hnum}>{r.done} de {r.total}</span>
            <span className={`${v.status} ${v[`st_${st}`]}`}>{ROUND_LABEL[st]}</span>
          </div>
        );
      })}
    </div>
  );
}
