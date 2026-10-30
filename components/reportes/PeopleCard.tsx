'use client';

import type { PersonRow } from '@/lib/reports';
import { CountUp, TipBody, useInView, useTip } from './ui';
import { IconCheck, IconUsers, IconX } from './icons';
import s from './reportes.module.css';

export default function PeopleCard({ people, generalMiss, showCounts }: {
  people: PersonRow[]; generalMiss: number; showCounts: boolean;
}) {
  const tip = useTip();
  const { ref, seen } = useInView<HTMLElement>();
  const STEP = 240; // ms entre una barra y la siguiente
  const active = people.filter(p => p.done + p.miss > 0);
  const idle = people.filter(p => p.done + p.miss === 0);
  const max = Math.max(1, generalMiss, ...active.map(p => p.done + p.miss));

  return (
    <section ref={ref} className={`${s.card} ${seen ? s.play : ''}`}>
      <div className={s.cardHead}>
        <h2 className={s.h3}><span className={s.hico}><IconUsers /></span>Por persona</h2>
        <span className={s.hint}>Arriba, quien necesita atención</span>
      </div>

      {people.length === 0 && generalMiss === 0 ? (
        <p className={s.foot}>No hay empleados activos en esta empresa.</p>
      ) : (
        <div className={s.people}>
          {active.map((p, idx) => {
            const total = p.done + p.miss;
            const onTime = p.done - p.late;
            const pill = p.miss > 0
              ? <span className={`${s.pill} ${s.missPill}`}><IconX size={11} />{showCounts ? `${p.miss} sin hacer` : 'Con pendientes'}</span>
              : <span className={`${s.pill} ${s.okPill}`}><IconCheck />Al día</span>;
            const barTip = showCounts
              ? tip(<TipBody title={p.name} counts={{ ok: onTime, late: p.late, miss: p.miss }} foot={`${p.done} hechas de ${total} que le tocaban`} />)
              : {};
            return (
              <div key={p.id} className={s.prow}>
                <div className={s.who}>
                  <span className={s.av}>{p.initials}</span>
                  <div className={s.pn}><b>{p.name}</b>{pill}</div>
                </div>
                <div className={s.pbar} {...barTip}>
                  <div className={s.pfill} style={{ width: `${(total / max) * 100}%`, animationDelay: `${idx * STEP}ms` }}>
                    {onTime > 0 && <i className={s.ok} style={{ flexGrow: onTime }} />}
                    {p.late > 0 && <i className={s.late} style={{ flexGrow: p.late }} />}
                    {p.miss > 0 && <i className={s.miss} style={{ flexGrow: p.miss }} />}
                  </div>
                </div>
                {showCounts && (
                  <div className={s.nums}>
                    <span><b><CountUp value={p.done} play={seen} delay={idx * STEP} /></b> hechas</span>
                    <span><b><CountUp value={p.late} play={seen} delay={idx * STEP} /></b> tarde{p.done > 0 && <em> ({Math.round((p.late / p.done) * 100)}%)</em>}</span>
                    <span className={p.miss ? s.bad : undefined}><b><CountUp value={p.miss} play={seen} delay={idx * STEP} /></b> sin hacer</span>
                  </div>
                )}
              </div>
            );
          })}

          {generalMiss > 0 && (
            <div className={s.prow}>
              <div className={s.who}>
                <span className={s.av}><IconUsers size={17} /></span>
                <div className={s.pn}><b>Generales</b><small>Sin dueño: las toma quien sea</small></div>
              </div>
              <div className={s.pbar} {...(showCounts ? tip(<TipBody title="Generales" line={`${generalMiss} sin hacer: ya pasó su hora y nadie la tomó`} />) : {})}>
                <div className={s.pfill} style={{ width: `${(generalMiss / max) * 100}%`, animationDelay: `${active.length * STEP}ms` }}>
                  <i className={s.miss} style={{ flexGrow: 1 }} />
                </div>
              </div>
              {showCounts && <div className={s.nums}><span className={s.bad}><b><CountUp value={generalMiss} play={seen} delay={active.length * STEP} /></b> sin hacer</span></div>}
            </div>
          )}

          {idle.map(p => (
            <div key={p.id} className={`${s.prow} ${s.idle}`}>
              <div className={s.who}>
                <span className={s.av}>{p.initials}</span>
                <div className={s.pn}><b>{p.name}</b><small>Sin actividades esta semana</small></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCounts && (
        <p className={s.foot}>
          &quot;Hechas&quot; incluye las generales que tomó cada quien. &quot;Sin hacer&quot; sólo cuenta las que tiene a su nombre. La barra más larga es quien más actividades tuvo.
        </p>
      )}
    </section>
  );
}
