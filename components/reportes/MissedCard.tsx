import { toDateStr, type MissedItem } from '@/lib/reports';
import { IconCheck, IconXCircle } from './icons';
import s from './reportes.module.css';

const DAY = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function when(d: Date, today: string): string {
  return toDateStr(d) === today ? 'Hoy' : `${DAY[d.getDay()]} ${d.getDate()}`;
}

export default function MissedCard({ missed, hasDue, today }: { missed: MissedItem[]; hasDue: boolean; today: string }) {
  if (!hasDue) return null;
  return (
    <section className={s.card}>
      <div className={s.cardHead}>
        <h2 className={s.h3}>
          <span className={s.hico}><IconXCircle /></span>Lo que no se hizo
          {missed.length > 0 && <span className={s.count}>{missed.length}</span>}
        </h2>
        {missed.length > 0 && <span className={s.hint}>Ya pasó su hora y nadie la marcó</span>}
      </div>
      {missed.length === 0 ? (
        <p className={s.allGood}><IconCheck size={14} />No quedó nada sin hacer.</p>
      ) : (
        <ul className={s.missed}>
          {missed.map((m, i) => (
            <li key={i}>
              <span className={s.mdot} />
              <div>
                <b>{m.title}</b>
                <span>{when(m.date, today)} · límite {m.limit} · {m.general ? 'General (nadie la tomó)' : m.assignee}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
