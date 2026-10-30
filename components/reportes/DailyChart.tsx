'use client';

import { DAY_NAMES, STATUSES, STATUS_LABEL, type DayReport, type Status } from '@/lib/reports';
import { TipBody, useTip, useWidth } from './ui';
import s from './reportes.module.css';

const FILL: Record<Status, string> = { ok: s.fOk, late: s.fLate, miss: s.fMiss, todo: s.fTodo };
const SW: Record<Status, string> = { ok: s.ok, late: s.late, miss: s.miss, todo: s.todo };

function niceMax(v: number): number {
  for (const n of [4, 5, 8, 10, 12, 15, 20, 25, 30, 40, 50]) if (v <= n) return n;
  return Math.ceil(v / 50) * 50;
}

/** Rectángulo con sólo las esquinas de arriba redondeadas (el extremo del dato). */
function topRounded(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export default function DailyChart({ days }: { days: DayReport[] }) {
  const { ref, w } = useWidth<HTMLDivElement>();
  const tip = useTip();
  const H = 256, pt = 46, pb = 44, pl = 30, pr = 6;
  const tot = (d: DayReport) => d.ok + d.late + d.miss + d.todo;
  const maxV = niceMax(Math.max(1, ...days.map(tot)));
  const plotW = Math.max(1, w - pl - pr), plotH = H - pt - pb;
  const band = plotW / 7, bw = Math.min(26, band * 0.46);
  const y = (v: number) => pt + plotH - (v / maxV) * plotH;

  return (
    <div>
      <div className={s.legend}>
        {STATUSES.map(k => <span key={k}><i className={`${s.sw} ${SW[k]}`} />{STATUS_LABEL[k]}</span>)}
      </div>
      <div ref={ref} className={s.chart}>
        {w > 0 && (
          <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} className={s.anim} role="img" aria-label="Actividades de cada día de la semana">
            {days.map((d, i) => d.isToday && (
              <g key={`hoy${i}`}>
                <rect x={pl + band * i + 3} y={2} width={band - 6} height={H - 4} rx={16} className={s.todayBand} />
                <rect x={pl + band * i + band / 2 - 17} y={8} width={34} height={16} rx={8} className={s.todayPill} />
                <text x={pl + band * i + band / 2} y={19.5} textAnchor="middle" className={s.tToday}>HOY</text>
              </g>
            ))}
            {[0, maxV / 2, maxV].map(g => (
              <g key={`g${g}`}>
                <line x1={pl} x2={w - pr} y1={y(g)} y2={y(g)} className={s.grid} />
                <text x={pl - 8} y={y(g) + 3.5} textAnchor="end" className={s.tTick}>{g}</text>
              </g>
            ))}
            {days.map((d, i) => {
              const cx = pl + band * i + band / 2;
              const x = cx - bw / 2;
              const total = tot(d);
              const done = d.ok + d.late;
              const segs = STATUSES.filter(k => d[k] > 0);
              const future = !d.isToday && total > 0 && d.todo === total;
              let acc = 0;
              return (
                <g key={i}>
                  <g className={s.bars} style={{ animationDelay: `${i * 70}ms` }}>
                    {segs.map((k, si) => {
                      const h = (d[k] / maxV) * plotH;
                      const yTop = pt + plotH - acc - h;
                      acc += h;
                      const hh = Math.max(0, h - (si > 0 ? 2 : 0)); // 2 px de separación entre segmentos
                      return si === segs.length - 1
                        ? <path key={k} d={topRounded(x, yTop, bw, hh, 5)} className={FILL[k]} />
                        : <rect key={k} x={x} y={yTop} width={bw} height={hh} className={FILL[k]} />;
                    })}
                  </g>
                  <text x={cx} y={(total > 0 ? y(total) : y(0)) - 8} textAnchor="middle" className={total > 0 && !future ? s.tVal : s.tMuted}>
                    {total > 0 ? `${done}/${total}` : '—'}
                  </text>
                  <text x={cx} y={H - 24} textAnchor="middle" className={`${s.tDay} ${d.isToday ? s.tDayToday : ''}`}>{d.label}</text>
                  <text x={cx} y={H - 10} textAnchor="middle" className={s.tDate}>{d.date.getDate()}</text>
                  <rect x={pl + band * i} y={pt - 14} width={band} height={plotH + 14} className={s.hit}
                    {...tip(
                      <TipBody
                        title={`${cap(DAY_NAMES[d.date.getDay()])} ${d.date.getDate()}${d.isToday ? ' · hoy' : ''}`}
                        counts={d}
                        foot={total ? `${done} hechas de ${total} programadas` : 'Sin actividades programadas'}
                      />,
                    )} />
                </g>
              );
            })}
          </svg>
        )}
      </div>
      <p className={s.foot}>Arriba de cada día: hechas / programadas. Pasa el mouse o toca un día para ver el detalle.</p>
    </div>
  );
}
