'use client';

import type { InvSection } from '@/lib/inventory-types';
import s from '@/components/panel/panel.module.css';
import v from './inv.module.css';
import { tileState, tileText } from './labels';

/** Avance de la ronda, cuadrícula de letras y quién hizo qué. */
export default function LetterGrid({ sections, people, perPerson, late, onPick }: {
  sections: InvSection[];
  people: Record<string, string>;
  perPerson: { id: string; name: string; current: number; total: number }[];
  late: boolean;
  onPick: (s: InvSection) => void;
}) {
  const done = sections.filter(x => x.status === 'done').length;
  const pct = sections.length ? Math.round((done / sections.length) * 100) : 0;
  const working = perPerson.filter(p => p.current > 0 || p.total > 0);

  return (
    <div className={v.block}>
      <section className={`${s.card} ${v.block}`}>
        <div className={v.headRow}>
          <h2>{done} de {sections.length} letras</h2>
          <span className={v.small}>{pct}%</span>
        </div>
        <div className={v.progress} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <div className={v.letters}>
          {sections.map(x => {
            const st = tileState(x, late);
            return (
              <button key={x.id} type="button" className={`${v.letter} ${v[`s_${st}`]}`} onClick={() => onPick(x)}
                aria-label={`Letra ${x.code}${x.name ? `, ${x.name}` : ''}: ${tileText(x, people, late)}`}>
                <span className={v.code}>{x.code}</span>
                {x.name && <span className={v.lname}>{x.name}</span>}
                <span className={v.lstate}>{tileText(x, people, late)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={`${s.card} ${v.block}`}>
        <div className={v.headRow}><h2>Quién hizo qué</h2></div>
        {working.length === 0 ? (
          <p className={v.small}>Todavía nadie termina una letra.</p>
        ) : (
          <div className={v.people}>
            {working.map(p => (
              <div key={p.id} className={v.person}>
                <b>{p.name}</b>
                <span>{p.current} {p.current === 1 ? 'letra' : 'letras'} en este · {p.total} en los últimos</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
