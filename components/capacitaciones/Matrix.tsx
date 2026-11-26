'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { buildMatrix, dueLabel, isOpen, summarize, STATUS_LABEL, type CapRow, type TrainingStatus } from '@/lib/capacitaciones/status';
import { hasMedal } from '@/lib/capacitaciones/medals';
import { groupPeople, stamp } from '@/lib/capacitaciones/admin-view';
import { titleCase } from '@/lib/checklist-mail';
import s from '@/components/panel/panel.module.css';
import Medal from './Medal';
import v from './capacitaciones.module.css';

// Entendida y En persona llevan la misma medalla: en la leyenda van juntas. La ficha de la celda dice cuál fue.
const LEGEND: { status: TrainingStatus; label: string }[] = [
  { status: 'pending', label: STATUS_LABEL.pending },
  { status: 'overdue', label: STATUS_LABEL.overdue },
  { status: 'doubt', label: STATUS_LABEL.doubt },
  { status: 'understood', label: 'Con medalla (entendida o en persona)' },
];
// "Por ver" es un punto dibujado con CSS: el carácter '·' sale cuadrado o chueco según la letra del sistema.
const SYMBOL: Record<TrainingStatus, string> = { pending: '', overdue: '!', understood: '✓', doubt: '?', trained: '✓' };
const MARK: Record<TrainingStatus, string> = {
  pending: v.m_pending, overdue: v.m_overdue, understood: v.m_understood, doubt: v.m_doubt, trained: v.m_trained,
};
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function StatusMark({ status }: { status: TrainingStatus }) {
  if (hasMedal(status)) return <span className={`${v.mark} ${v.m_medal}`} aria-hidden><Medal earned size={26} /></span>;
  return <span className={`${v.mark} ${MARK[status]}`} aria-hidden>{SYMBOL[status]}</span>;
}

const viewsText = (n: number) => (n === 0 ? 'No la ha abierto' : n === 1 ? 'La abrió 1 vez' : `La abrió ${n} veces`);

/** Avance: personas en renglones, capacitaciones activas en columnas. Al tocar una celda se ve su ficha debajo. */
export default function Matrix({ rows, companyNames = {}, now = new Date() }: {
  rows: CapRow[];
  /** id de empresa → nombre, para el renglón separador cuando hay gente de dos empresas. */
  companyNames?: Record<string, string>;
  now?: Date;
}) {
  const { trainings, people } = useMemo(() => buildMatrix(rows), [rows]);
  const groups = useMemo(() => groupPeople(people, companyNames), [people, companyNames]);
  const sum = useMemo(() => summarize(rows.map(r => r.status)), [rows]);
  const [picked, setPicked] = useState<{ e: string; t: string } | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const sel = picked ? people.find(p => p.id === picked.e)?.cells[picked.t] ?? null : null;
  const selKey = sel ? `${sel.employee_id}:${sel.training_id}` : null;

  // En celular la ficha queda debajo de la tabla: se acerca a la pantalla al abrirla.
  useEffect(() => {
    if (!selKey) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    detailRef.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [selKey]);

  const pendingOnly = sum.open - sum.overdue;
  const cellId = (e: string, t: string) => `cap-cell-${e}-${t}`;

  /** Cierra la ficha y regresa el foco a la celda que la abrió. */
  function close() {
    if (!picked) return;
    const id = cellId(picked.e, picked.t);
    setPicked(null);
    requestAnimationFrame(() => document.getElementById(id)?.focus());
  }

  return (
    <section className={s.card} aria-label="Avance por persona">
      <div className={v.headRow}>
        <h2>Avance por persona</h2>
        <div className={v.chips}>
          <span className={`${v.chip} ${v.cOk}`}><b>{sum.done}</b> de {sum.total} medallas</span>
          {sum.doubts > 0 && <span className={`${v.chip} ${v.cLate}`}><b>{sum.doubts}</b> con dudas</span>}
          {sum.overdue > 0 && <span className={`${v.chip} ${v.cMiss}`}><b>{sum.overdue}</b> {sum.overdue === 1 ? 'atrasada' : 'atrasadas'}</span>}
          {pendingOnly > 0 && <span className={v.chip}><b>{pendingOnly}</b> por ver</span>}
        </div>
      </div>

      <ul className={v.legend} aria-label="Qué significa cada marca">
        {LEGEND.map(x => <li key={x.status}><StatusMark status={x.status} />{x.label}</li>)}
      </ul>

      <div className={v.scroller} onKeyDown={e => { if (e.key === 'Escape') setPicked(null); }}>
        <table className={v.table}>
          <thead>
            <tr>
              <th scope="col" className={v.corner}>Persona</th>
              {trainings.map(t => (
                <th key={t.id} scope="col" className={v.colHead} title={t.title}>
                  <span className={v.colTitle}>{t.title}</span>
                  <span className={`${v.count} ${t.total > 0 && t.done === t.total ? v.full : ''}`}>
                    <span aria-hidden>{t.done}/{t.total}</span>
                    <span className={v.sr}>{t.done} de {t.total} la terminaron</span>
                  </span>
                </th>
              ))}
              <th scope="col" className={v.total}>Medallas</th>
            </tr>
          </thead>
          {groups.map(g => (
            <tbody key={g.key}>
              {g.name && (
                <tr>
                  <th scope="rowgroup" className={v.groupCell}>{g.name}</th>
                  <td colSpan={trainings.length + 1} className={v.groupFill} />
                </tr>
              )}
              {g.people.map(p => {
                const name = titleCase(p.name);
                return (
                  <tr key={p.id}>
                    <th scope="row" className={v.who}>{name}</th>
                    {trainings.map(t => {
                      const r = p.cells[t.id];
                      const on = picked?.e === p.id && picked.t === t.id;
                      return (
                        <td key={t.id}>
                          {r ? (
                            <button type="button" id={cellId(p.id, t.id)} className={v.cell} aria-expanded={on} aria-controls={on ? 'cap-detail' : undefined}
                              aria-label={`${name} · ${t.title}: ${STATUS_LABEL[r.status]}`}
                              onClick={() => setPicked(on ? null : { e: p.id, t: t.id })}>
                              <StatusMark status={r.status} />
                            </button>
                          ) : <><span className={v.none} aria-hidden>—</span><span className={v.sr}>No aplica</span></>}
                        </td>
                      );
                    })}
                    <td className={v.total}>
                      <span className={v.medals} aria-hidden><Medal earned={p.done > 0} size={16} />{p.done}<small>/{p.total}</small></span>
                      <span className={v.sr}>{p.done} de {p.total} medallas</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>

      {/* Siempre en la página (vacía al principio): así el lector de pantalla también anuncia la primera ficha que se abre. */}
      <p className={v.sr} aria-live="polite">
        {sel ? `${titleCase(sel.employee_name)} · ${sel.title}: ${STATUS_LABEL[sel.status]}. La ficha está debajo de la tabla.` : ''}
      </p>
      {sel && (
        <div ref={detailRef} id="cap-detail" className={v.detail} role="region" aria-label={`${titleCase(sel.employee_name)} · ${sel.title}`}
          onKeyDown={e => { if (e.key === 'Escape') close(); }}>
          <div className={v.detailHead}>
            <div className={v.detailWho}>
              <StatusMark status={sel.status} />
              <div><b>{titleCase(sel.employee_name)}</b><span>{sel.title}</span></div>
            </div>
            <button type="button" className={v.btn} onClick={close}>Cerrar</button>
          </div>
          <dl className={v.facts}>
            <div><dt>Estado</dt><dd>{STATUS_LABEL[sel.status]}</dd></div>
            {isOpen(sel.status) ? (
              <div><dt>Plazo</dt><dd className={sel.status === 'overdue' ? v.lateText : undefined}>{cap(dueLabel(sel.deadline, now))}</dd></div>
            ) : sel.answered_at && (
              <div>
                <dt>Contestó</dt>
                <dd>{stamp(sel.answered_at)}{new Date(sel.answered_at) >= new Date(sel.deadline) ? ' · después del plazo' : ' · a tiempo'}</dd>
              </div>
            )}
            <div><dt>Vistas</dt><dd>{viewsText(sel.views)}</dd></div>
            {(sel.status === 'doubt' || sel.doubt_note) && (
              <div className={v.wide}><dt>Lo que no entendió</dt><dd>{sel.doubt_note ? `“${sel.doubt_note}”` : 'Sin nota'}</dd></div>
            )}
            {sel.status === 'trained' && (
              <div className={v.wide}>
                <dt>Capacitado en persona</dt>
                <dd>Por {sel.trained_by ?? 'el administrador'}{sel.trained_at ? ` el ${stamp(sel.trained_at)}` : ''}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </section>
  );
}
