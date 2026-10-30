'use client';

import type { CSSProperties } from 'react';
import { STATUSES, STATUS_LABEL, RATING_LABEL, ratingOf, type Status, type WeekReport } from '@/lib/reports';
import { CountUp, TipBody, useInView, useTip } from './ui';
import { IconCaretDown, IconCaretUp, IconCheck, IconClock, IconX } from './icons';
import s from './reportes.module.css';

const SEG: Record<Status, string> = { ok: s.ok, late: s.late, miss: s.miss, todo: s.todo };
const PILL = { ok: s.okPill, late: s.latePill, miss: s.missPill };
const ARC = { ok: s.arcOk, late: s.arcLate, miss: s.arcMiss };

function Ring({ pct }: { pct: number | null }) {
  const r = 64;
  const C = 2 * Math.PI * r;
  const rating = pct === null ? null : ratingOf(pct);
  const arcStyle = { strokeDasharray: C, strokeDashoffset: C * (1 - (pct ?? 0) / 100), '--C': C } as CSSProperties;
  return (
    <div className={s.ringWrap}>
      <svg viewBox="0 0 156 156" width={156} height={156} aria-hidden>
        <defs>
          <linearGradient id="rp-arc-ok" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#19B97C" /><stop offset="1" stopColor="#0A7D55" />
          </linearGradient>
        </defs>
        <circle cx={78} cy={78} r={r} className={s.ringTrack} />
        {rating && pct! > 0 && (
          <circle cx={78} cy={78} r={r} transform="rotate(-90 78 78)" className={`${s.ringArc} ${ARC[rating]}`} style={arcStyle} />
        )}
      </svg>
      <div className={s.ringVal}>
        <b>{pct === null ? '—' : <><CountUp value={pct} duration={2200} />%</>}</b>
        <span>{pct === null ? 'sin datos' : 'hecho'}</span>
      </div>
    </div>
  );
}

export default function SummaryCard({ report, prevPct, isCurrent }: { report: WeekReport; prevPct: number | null; isCurrent: boolean }) {
  const tip = useTip();
  const { pct, done, due, counts } = report;
  const rating = pct === null ? null : ratingOf(pct);
  const total = STATUSES.reduce((n, k) => n + counts[k], 0);
  const legend = STATUSES.filter(k => k !== 'todo' || counts.todo > 0);
  const delta = pct !== null && prevPct !== null ? pct - prevPct : null;
  const { ref, seen } = useInView<HTMLElement>();

  return (
    <section ref={ref} className={`${s.card} ${s.hero} ${seen ? s.play : ''}`} aria-label="Cómo vamos esta semana">
      <Ring pct={pct} />
      <div className={s.heroText}>
        {rating && (
          <div>
            <span className={`${s.pill} ${PILL[rating]}`}>
              {rating === 'ok' ? <IconCheck /> : rating === 'late' ? <IconClock size={12} /> : <IconX />}
              {RATING_LABEL[rating]}
            </span>
          </div>
        )}
        <p className={s.headline}>
          {pct === null
            ? <>Todavía no toca nada esta semana.</>
            : <>Se hizo el <b><CountUp value={pct} duration={2200} />%</b> de lo que {isCurrent ? 'ya ' : ''}tocaba: <b><CountUp value={done} duration={2200} /> de {due}</b>.</>}
        </p>
        {delta !== null && (
          <p className={s.delta}>
            {delta > 0 && <><span className={s.up}><IconCaretUp />{delta} {delta === 1 ? 'punto' : 'puntos'}</span>más que la semana pasada ({prevPct}%)</>}
            {delta < 0 && <><span className={s.down}><IconCaretDown />{-delta} {delta === -1 ? 'punto' : 'puntos'}</span>menos que la semana pasada ({prevPct}%)</>}
            {delta === 0 && <>Igual que la semana pasada ({prevPct}%)</>}
          </p>
        )}
        {total > 0 && (
          <>
            <div className={s.weekBar} aria-label={`Las ${total} actividades de la semana`}>
              {/* Se llena de izquierda a derecha: un color tras otro. */}
              {STATUSES.filter(k => counts[k] > 0).map((k, i) => (
                <i key={k} className={`${s.seg} ${SEG[k]}`} style={{ flexGrow: counts[k], animationDelay: `${i * 650}ms` }}
                  {...tip(<TipBody title={STATUS_LABEL[k]} line={`${counts[k]} de ${total} actividades de la semana`} />)} />
              ))}
            </div>
            <div className={s.legendRow}>
              {legend.map((k, i) => (
                <span key={k}><i className={`${s.sw} ${SEG[k]}`} /><b><CountUp value={counts[k]} play={seen} delay={i * 650} duration={1000} /></b>{STATUS_LABEL[k].toLowerCase()}</span>
              ))}
              <span className={s.muted}>de {total} en la semana</span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
