'use client';

import { useState } from 'react';
import { ratingOf, type Rating, type TrendPoint } from '@/lib/reports';
import { TipBody, useInView, useTip, useWidth } from '@/components/panel/ui';
import s from '@/components/panel/panel.module.css';

const FILL: Record<Rating, string> = { ok: s.fOk, late: s.fLate, miss: s.fMiss };
const WORD: Record<Rating, string> = { ok: 'Bien', late: 'Regular', miss: 'Bajo' };

type Valid = TrendPoint & { i: number; pct: number };

export default function TrendChart({ points, current, onSelect }: {
  points: TrendPoint[]; current: boolean; onSelect: (start: Date) => void;
}) {
  const { ref, w: vw } = useWidth<HTMLDivElement>();
  const view = useInView<HTMLDivElement>();
  const tip = useTip();
  const [hover, setHover] = useState<number | null>(null);
  const DRAW = 2400; // ms que tarda la línea en dibujarse de izquierda a derecha

  const n = points.length;
  const lastI = n - 1;
  const H = 236, pt = 24, pb = 34, pl = 40, pr = 62;
  const w = Math.max(vw, n * 46 + pl + pr);
  const plotW = w - pl - pr, plotH = H - pt - pb;
  const step = n > 1 ? plotW / (n - 1) : plotW;
  const x = (i: number) => pl + step * i;
  const y = (p: number) => pt + plotH - (p / 100) * plotH;

  const valid: Valid[] = points
    .map((p, i) => ({ ...p, i }))
    .filter((p): p is Valid => p.pct !== null);
  const lastPct = points[lastI]?.pct ?? null;
  const dashed = current && lastPct !== null && valid.length >= 2;
  const solid = dashed ? valid.slice(0, -1) : valid;
  const pathOf = (pts: Valid[]) =>
    pts.map((p, k) => `${k === 0 || p.i !== pts[k - 1].i + 1 ? 'M' : 'L'}${x(p.i).toFixed(1)} ${y(p.pct).toFixed(1)}`).join(' ');
  const area = valid.length >= 2
    ? `${pathOf(valid)} L${x(valid[valid.length - 1].i).toFixed(1)} ${y(0)} L${x(valid[0].i).toFixed(1)} ${y(0)} Z`
    : '';
  const minP = valid.reduce<Valid | null>((m, p) => (m === null || p.pct < m.pct ? p : m), null);
  const every = step < 52 ? 2 : 1;

  return (
    <div ref={view.ref} className={view.seen ? s.play : undefined}>
      <div className={s.legend}>
        <span><i className={`${s.sw} ${s.dotSw} ${s.ok}`} />90% o más</span>
        <span><i className={`${s.sw} ${s.dotSw} ${s.late}`} />70 a 89%</span>
        <span><i className={`${s.sw} ${s.dotSw} ${s.miss}`} />Menos de 70%</span>
      </div>
      <div ref={ref} className={`${s.chart} ${s.scroll}`}>
        {valid.length === 0 && <p className={s.foot}>Todavía no hay semanas con datos.</p>}
        {vw > 0 && valid.length > 0 && (
          <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="img" aria-label="Porcentaje hecho en las últimas 12 semanas">
            <defs>
              <linearGradient id="rp-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" className={s.areaTop} /><stop offset="1" className={s.areaBot} />
              </linearGradient>
            </defs>
            <rect x={pl} y={y(100)} width={plotW} height={y(90) - y(100)} className={s.metaBand} />
            {[0, 50, 90, 100].map(g => (
              <g key={g}>
                <line x1={pl} x2={pl + plotW} y1={y(g)} y2={y(g)} className={s.grid} />
                <text x={pl - 8} y={y(g) + 3.5} textAnchor="end" className={s.tTick}>{g}%</text>
              </g>
            ))}
            <text x={pl + 8} y={y(95) + 3.5} className={s.tMeta}>Meta</text>
            {area && <path d={area} fill="url(#rp-area)" className={s.fadeIn} style={{ animationDelay: `${DRAW / 3}ms` }} />}
            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pt} y2={pt + plotH} className={s.xhair} />}
            {solid.length > 0 && (
              <path d={pathOf(solid)} pathLength={1} className={`${s.trendLine} ${s.draw}`}
                style={{ animationDuration: `${DRAW * (dashed ? (lastI - 1) / Math.max(1, lastI) : 1)}ms` }} />
            )}
            {dashed && (
              <path
                d={`M${x(valid[valid.length - 2].i).toFixed(1)} ${y(valid[valid.length - 2].pct).toFixed(1)} L${x(lastI).toFixed(1)} ${y(lastPct!).toFixed(1)}`}
                className={`${s.trendLine} ${s.dash} ${s.fadeIn}`} style={{ animationDelay: `${DRAW * 0.9}ms` }}
              />
            )}
            {/* Cada punto aparece cuando la línea llega a él. */}
            {valid.map(p => (
              <circle key={p.i} cx={x(p.i)} cy={y(p.pct)} r={p.i === lastI ? 6 : 4.5}
                className={`${s.dot} ${FILL[ratingOf(p.pct)]} ${s.pop}`} style={{ animationDelay: `${(p.i / Math.max(1, lastI)) * DRAW}ms` }} />
            ))}
            {lastPct !== null && (
              <>
                <text x={x(lastI) + 12} y={y(lastPct) + 1} className={`${s.tVal} ${s.fadeIn}`} style={{ fontSize: 14, animationDelay: `${DRAW}ms` }}>{lastPct}%</text>
                {current && <text x={x(lastI) + 12} y={y(lastPct) + 15} className={`${s.tMuted} ${s.fadeIn}`} style={{ fontSize: 10.5, animationDelay: `${DRAW}ms` }}>en curso</text>}
              </>
            )}
            {minP && minP.i !== lastI && (
              <text x={x(minP.i)} y={minP.pct < 15 ? y(minP.pct) - 12 : y(minP.pct) + 20} textAnchor="middle"
                className={`${s.tVal} ${s.fadeIn}`} style={{ animationDelay: `${(minP.i / Math.max(1, lastI)) * DRAW + 200}ms` }}>{minP.pct}%</text>
            )}
            {points.map((p, i) => (i === lastI || (lastI - i) % every === 0) && (
              <text key={`l${i}`} x={x(i)} y={H - 10} textAnchor="middle" className={s.tDate}
                style={i === lastI ? { fontWeight: 700, fill: 'var(--ink2)' } : undefined}>
                {i === lastI && current ? 'esta' : p.label}
              </text>
            ))}
            {points.map((p, i) => (
              <rect key={`h${i}`} x={x(i) - step / 2} y={pt} width={step} height={plotH} className={s.hit} role="button" aria-label={`Abrir la semana del ${p.label}`}
                onClick={() => onSelect(p.start)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(p.start); } }}
                {...tip(
                  <TipBody
                    title={`Semana del ${p.label}${i === lastI && current ? ' (en curso)' : ''}`}
                    line={p.pct === null ? 'Sin actividades vencidas' : `${p.pct}% hecho · ${WORD[ratingOf(p.pct)]}`}
                    foot="Toca para abrir esa semana"
                  />,
                  () => setHover(i),
                  () => setHover(null),
                )} />
            ))}
          </svg>
        )}
      </div>
      <p className={s.foot}>
        La franja verde es la meta (90% o más).{current ? ' La semana en curso va punteada porque todavía no termina.' : ''} Toca un punto para abrir esa semana.
      </p>
    </div>
  );
}
