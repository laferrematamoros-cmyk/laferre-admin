'use client';

import type { CSSProperties } from 'react';
import { ratingOf } from '@/lib/reports';
import { CountUp } from './ui';
import s from './panel.module.css';

const ARC = { ok: s.arcOk, late: s.arcLate, miss: s.arcMiss };

/** Aro con el porcentaje: verde ≥ 90, ámbar 70–89, rojo < 70. Se llena al aparecer. */
export default function Ring({ pct }: { pct: number | null }) {
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
        {/* "100%" no cabe con la letra normal: se achica para no tocar el aro. */}
        <b style={pct !== null && pct >= 100 ? { fontSize: 36 } : undefined}>
          {pct === null ? '—' : <><CountUp value={pct} duration={2200} />%</>}
        </b>
        <span>{pct === null ? 'sin datos' : 'hecho'}</span>
      </div>
    </div>
  );
}
