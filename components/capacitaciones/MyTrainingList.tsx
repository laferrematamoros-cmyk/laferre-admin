'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { MyTraining } from '@/app/mis-capacitaciones/actions';
import { groupMine, mineLine } from '@/lib/capacitaciones/my-view';
import { STATUS_LABEL, type TrainingStatus } from '@/lib/capacitaciones/status';
import { hasMedal, medalCount } from '@/lib/capacitaciones/medals';
import { themeOf } from '@/lib/capacitaciones/themes';
import s from '@/components/panel/panel.module.css';
import Medal from './Medal';
import MedalShelf from './MedalShelf';
import LevelProgress from './LevelProgress';
import m from './mis.module.css';
import md from './medals.module.css';

const TONE: Record<TrainingStatus, { edge: string; bg: string; ink: string }> = {
  overdue:    { edge: 'var(--st-miss)', bg: 'var(--st-miss-soft)', ink: 'var(--st-miss-ink)' },
  pending:    { edge: 'var(--st-run)',  bg: 'var(--st-run-soft)',  ink: 'var(--st-run-ink)' },
  doubt:      { edge: 'var(--st-late)', bg: 'var(--st-late-soft)', ink: 'var(--st-late-ink)' },
  understood: { edge: 'var(--st-ok)',   bg: 'var(--st-ok-soft)',   ink: 'var(--st-ok-ink)' },
  trained:    { edge: 'var(--st-ok)',   bg: 'var(--st-ok-soft)',   ink: 'var(--st-ok-ink)' },
};
const COUNT: Record<TrainingStatus, [string, string]> = {
  understood: ['entendida', 'entendidas'], trained: ['en persona', 'en persona'], doubt: ['con dudas', 'con dudas'],
  overdue: ['atrasada', 'atrasadas'], pending: ['por ver', 'por ver'],
};
const BAR_ORDER: TrainingStatus[] = ['understood', 'trained', 'doubt', 'overdue', 'pending'];

export default function MyTrainingList({ items, now }: { items: MyTraining[]; now: Date }) {
  if (items.length === 0) return <div className={`${s.card} ${m.empty}`}><b>Por ahora no hay capacitaciones.</b></div>;
  const g = groupMine(items);
  const total = items.length;
  const counts = BAR_ORDER.map(k => ({ k, n: items.filter(i => i.status === k).length })).filter(x => x.n > 0);

  const row = (i: MyTraining) => {
    const t = TONE[i.status];
    return (
      <Link key={i.id} href={`/mis-capacitaciones/${i.slug}`} className={m.row} style={{ '--edge': t.edge } as CSSProperties}>
        {hasMedal(i.status) && <Medal theme={themeOf(i.slug)} earned size={28} className={md.rowMedal} />}
        <span className={m.rowMain}>
          <span className={m.rowTitle}>{i.title}</span>
          <span className={m.rowSub}>{mineLine(i, now)}</span>
        </span>
        <span className={m.pill} style={{ background: t.bg, color: t.ink }}>{STATUS_LABEL[i.status]}</span>
        <span className={m.chev} aria-hidden>›</span>
      </Link>
    );
  };
  const block = (label: string, list: MyTraining[]) => list.length > 0 && (
    <section className={m.block}>
      <p className={m.secLbl}>{label} ({list.length})</p>
      <div className={m.list}>{list.map(row)}</div>
    </section>
  );

  const { earned } = medalCount(items);
  return (
    <>
      <section className={`${s.card} ${m.hero}`}>
        <LevelProgress earned={earned} total={total} />
        <div className={m.legend}>
          {counts.map(x => <span key={x.k}><i style={{ background: TONE[x.k].edge }} />{x.n} {COUNT[x.k][x.n === 1 ? 0 : 1]}</span>)}
        </div>
        <MedalShelf items={items} />
      </section>
      {block('Por ver', g.open)}
      {block('Con dudas', g.doubt)}
      {block('Listas', g.done)}
    </>
  );
}
