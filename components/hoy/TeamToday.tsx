'use client';

import type { TodayPerson } from '@/lib/today';
import { useInView } from '@/components/panel/ui';
import { IconCheck, IconUsers, IconX } from '@/components/panel/icons';
import s from '@/components/panel/panel.module.css';
import h from './hoy.module.css';

/** Cómo va cada quien hoy. El practicante ve barras y etiquetas, sin cifras por persona. */
export default function TeamToday({ people, generalOverdue, showCounts }: {
  people: TodayPerson[]; generalOverdue: number; showCounts: boolean;
}) {
  const view = useInView<HTMLElement>();
  const total = (p: TodayPerson) => p.done + p.overdue + p.pending;
  const active = people.filter(p => total(p) > 0);
  const idle = people.filter(p => total(p) === 0);
  const max = Math.max(1, generalOverdue, ...active.map(total));

  return (
    <section ref={view.ref} className={`${s.card} ${view.seen ? s.play : ''}`}>
      <div className={s.cardHead}>
        <h2 className={s.h3}><span className={s.hico}><IconUsers /></span>Equipo hoy</h2>
      </div>
      {people.length === 0 && generalOverdue === 0 ? (
        <p className={s.foot}>No hay empleados activos.</p>
      ) : (
        <div className={h.team}>
          {active.map((p, i) => {
            const onTime = p.done - p.late;
            return (
              <div key={p.id} className={h.trow}>
                <div className={s.who}>
                  <span className={s.av}>{p.initials}</span>
                  <div className={s.pn}>
                    <b>{p.name}</b>
                    {p.overdue > 0
                      ? <span className={`${s.pill} ${s.missPill}`}><IconX size={11} />{showCounts ? `${p.overdue} atrasada${p.overdue === 1 ? '' : 's'}` : 'Con pendientes'}</span>
                      : <span className={`${s.pill} ${s.okPill}`}><IconCheck />Al día</span>}
                  </div>
                </div>
                {showCounts && (
                  <div className={h.tnums}>
                    <span><b>{p.done}</b> hecha{p.done === 1 ? '' : 's'}</span>
                    {p.late > 0 && <span><b>{p.late}</b> tarde</span>}
                    {p.pending > 0 && <span><b>{p.pending}</b> por hacer</span>}
                  </div>
                )}
                <div className={`${s.pbar} ${h.tbar}`}>
                  <div className={s.pfill} style={{ width: `${(total(p) / max) * 100}%`, animationDelay: `${i * 240}ms` }}>
                    {onTime > 0 && <i className={s.ok} style={{ flexGrow: onTime }} />}
                    {p.late > 0 && <i className={s.late} style={{ flexGrow: p.late }} />}
                    {p.overdue > 0 && <i className={s.miss} style={{ flexGrow: p.overdue }} />}
                    {p.pending > 0 && <i className={s.todo} style={{ flexGrow: p.pending }} />}
                  </div>
                </div>
              </div>
            );
          })}

          {generalOverdue > 0 && (
            <div className={h.trow}>
              <div className={s.who}>
                <span className={s.av}><IconUsers size={17} /></span>
                <div className={s.pn}><b>Generales</b><small>Sin dueño: las toma quien sea</small></div>
              </div>
              {showCounts && <div className={h.tnums}><span className={s.bad}><b>{generalOverdue}</b> atrasada{generalOverdue === 1 ? '' : 's'}</span></div>}
              <div className={`${s.pbar} ${h.tbar}`}>
                <div className={s.pfill} style={{ width: `${(generalOverdue / max) * 100}%`, animationDelay: `${active.length * 240}ms` }}>
                  <i className={s.miss} style={{ flexGrow: 1 }} />
                </div>
              </div>
            </div>
          )}

          {idle.map(p => (
            <div key={p.id} className={`${h.trow} ${s.idle}`}>
              <div className={s.who}>
                <span className={s.av}>{p.initials}</span>
                <div className={s.pn}><b>{p.name}</b><small>Sin actividades hoy</small></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
