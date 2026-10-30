'use client';

import { useMemo } from 'react';
import { assignLanes, dayRange, TODAY_LABEL, TODAY_STATUSES, type TodayRow } from '@/lib/today';
import { TipBody, useInView, useTip, useWidth } from '@/components/panel/ui';
import h from './hoy.module.css';
import { BG, FILL } from './look';

const hhmm = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;

/** Cada actividad dibujada en su horario y con su color; la raya de AHORA avanza con el día. */
export default function DayLine({ rows, now, onOpen }: { rows: TodayRow[]; now: Date; onOpen: (r: TodayRow) => void }) {
  const { ref, w } = useWidth<HTMLDivElement>();
  const view = useInView<HTMLDivElement>(0.2);
  const tip = useTip();
  const lanes = useMemo(() => assignLanes(rows), [rows]);
  const { from, to } = useMemo(() => dayRange(rows), [rows]);
  const order = useMemo(() => [...rows].sort((a, b) => a.startMin - b.startMin), [rows]);

  const laneCount = Math.max(1, ...Object.values(lanes).map(l => l + 1));
  const BAR = 12, GAP = 5, pt = 28, pb = 22, pl = 2, pr = 2;
  const H = pt + laneCount * (BAR + GAP) - GAP + pb;
  const plotW = Math.max(1, w - pl - pr);
  const x = (m: number) => pl + ((m - from) / (to - from)) * plotW;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNow = nowMin >= from && nowMin <= to;
  const pillW = 66;
  const pillX = Math.min(Math.max(x(nowMin) - pillW / 2, pl), w - pr - pillW);
  const labelEvery = plotW / ((to - from) / 60) < 40 ? 3 : 2; // horas entre etiquetas
  const hours: number[] = [];
  for (let m = from; m <= to; m += 60) hours.push(m);

  return (
    <div ref={view.ref} className={view.seen ? h.play : undefined}>
      <div ref={ref} className={h.dayLine}>
        {w > 0 && (
          <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="img" aria-label="Línea del día: cada actividad en su horario">
            {hours.map(m => <line key={m} x1={x(m)} x2={x(m)} y1={pt - 4} y2={H - pb + 2} className={h.hourGrid} />)}
            {hours.filter(m => ((m - from) / 60) % labelEvery === 0).map(m => (
              <text key={`t${m}`} x={x(m)} y={H - 6} textAnchor={m === from ? 'start' : m === to ? 'end' : 'middle'} className={h.hourLbl}>
                {hhmm(m)}
              </text>
            ))}
            {order.map((r, i) => {
              const x1 = x(r.startMin);
              const x2 = x(Math.max(r.limitMin, r.startMin));
              return (
                <rect
                  key={r.id}
                  x={x1} y={pt + lanes[r.id] * (BAR + GAP)} width={Math.max(6, x2 - x1)} height={BAR} rx={6}
                  className={`${h.span} ${FILL[r.status]}`}
                  style={{ animationDelay: `${i * 70}ms` }}
                  role="button"
                  aria-label={`${r.title}, de ${r.start} a ${r.limit}, ${TODAY_LABEL[r.status]}`}
                  onClick={() => onOpen(r)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(r); } }}
                  {...tip(<TipBody title={r.title} line={`${r.start} – ${r.limit} · ${TODAY_LABEL[r.status]}`} foot={r.assignee} />)}
                />
              );
            })}
            {showNow && (
              <g className={h.nowMark} style={{ animationDelay: `${Math.min(order.length * 70, 900)}ms` }}>
                <line x1={x(nowMin)} x2={x(nowMin)} y1={pt - 6} y2={H - pb + 2} className={h.nowLine} />
                <rect x={pillX} y={3} width={pillW} height={17} rx={8.5} className={h.nowPill} />
                <text x={pillX + pillW / 2} y={15} textAnchor="middle" className={h.nowTxt}>Ahora {hhmm(nowMin)}</text>
              </g>
            )}
          </svg>
        )}
      </div>
      <div className={h.lineLegend}>
        {TODAY_STATUSES.map(k => <span key={k}><i className={`${h.sw} ${BG[k]}`} />{TODAY_LABEL[k]}</span>)}
      </div>
    </div>
  );
}
