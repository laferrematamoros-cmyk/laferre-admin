import type { Insight } from '@/lib/report-insights';
import { IconCheck, IconClock, IconDown, IconEqual, IconSpark, IconUp, IconX } from '@/components/panel/icons';
import s from '@/components/panel/panel.module.css';

const ICON = { check: IconCheck, x: IconX, clock: IconClock, up: IconUp, down: IconDown, equal: IconEqual };
const TONE = { ok: s.okPill, late: s.latePill, miss: s.missPill };

export default function InsightsCard({ insights }: { insights: Insight[] }) {
  return (
    <section className={s.card} aria-label="Lectura rápida">
      <div className={s.cardHead}>
        <h2 className={s.h3}><span className={`${s.hico} ${s.spark}`}><IconSpark /></span>Lectura rápida</h2>
      </div>
      {insights.length === 0 ? (
        <p className={s.foot}>Todavía no hay nada que contar esta semana.</p>
      ) : (
        <ul className={s.ins}>
          {insights.map((it, i) => {
            const Icon = ICON[it.icon];
            return (
              <li key={i}>
                <span className={`${s.ico} ${TONE[it.tone]}`}><Icon size={it.icon === 'x' || it.icon === 'check' ? 15 : 17} /></span>
                <div><b>{it.title}</b><span>{it.detail}</span></div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
