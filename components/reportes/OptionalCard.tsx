import type { OptionalRow } from '@/lib/reports';
import { IconList } from '@/components/panel/icons';
import s from '@/components/panel/panel.module.css';

/** Opcionales de la semana: se ven aparte porque no cuentan en el porcentaje. */
export default function OptionalCard({ rows }: { rows: OptionalRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section className={s.card}>
      <div className={s.cardHead}>
        <h2 className={s.h3}><span className={s.hico}><IconList /></span>Opcionales</h2>
        <span className={s.hint}>No cuentan en el porcentaje</span>
      </div>
      <ul className={s.missed}>
        {rows.map(r => (
          <li key={r.id}>
            <span className={s.mdot} style={{ background: 'var(--st-opt)' }} />
            <div>
              <b>{r.title}</b>
              <span>Se marcó {r.done} de {r.days} día{r.days === 1 ? '' : 's'}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
