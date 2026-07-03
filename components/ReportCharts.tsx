'use client';

import { useRef, useState, useEffect } from 'react';
import type { DayBar } from '@/lib/reports';

const GREEN = '#0F9D58', AMBER = '#F2A20C', RED = '#E11D2E';
const INK = '#0F0F10', GRID = '#ECECEE', MUTED = '#A8A8AD', AXIS = '#9A9A9F';

export function rateColor(rate: number) {
  if (rate < 70) return RED;
  if (rate < 90) return AMBER;
  return GREEN;
}

// Ancho real del contenedor (para dibujar SVG sin distorsión).
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(es => { for (const e of es) setW(e.contentRect.width); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

// Redondea el máximo del eje a un número "lindo".
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const steps = [1, 2, 4, 5, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100];
  for (const s of steps) if (v <= s) return s;
  return Math.ceil(v / 50) * 50;
}

// ── Selector de tipo de gráfico ──────────────────────────────────────────────────
export function ChartTypeToggle<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: [T, string][];
}) {
  return (
    <div className="inline-flex rounded-[8px] border p-0.5" style={{ borderColor: '#E4E4E7', background: '#F7F7F8' }}>
      {options.map(([val, label]) => (
        <button
          key={val}
          type="button"
          onClick={() => onChange(val)}
          className="rounded-[6px] px-2.5 py-1 text-[11px] font-semibold transition-colors"
          style={val === value
            ? { background: '#fff', color: INK, boxShadow: '0 1px 2px rgba(0,0,0,.08)' }
            : { background: 'transparent', color: '#6E6E73' }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Actividades por día ──────────────────────────────────────────────────────────
export type DailyType = 'stacked' | 'grouped' | 'lines';

export function DailyChart({ daily, type }: { daily: DayBar[]; type: DailyType }) {
  const { ref, w } = useWidth();
  const H = 200, padT = 12, padB = 30, padL = 26, padR = 8;
  const plotW = Math.max(1, w - padL - padR);
  const plotH = H - padT - padB;
  const n = daily.length;
  const band = plotW / n;

  const onT = (d: DayBar) => d.done - d.late;
  const totals = daily.map(d => d.done + d.missed);
  const singleMax = Math.max(1, ...daily.flatMap(d => [onT(d), d.late, d.missed]));
  const scaleMax = type === 'stacked' ? niceMax(Math.max(1, ...totals)) : niceMax(singleMax);
  const y = (v: number) => padT + plotH - (v / scaleMax) * plotH;
  const cx = (i: number) => padL + band * i + band / 2;

  const series: { key: string; color: string; label: string; val: (d: DayBar) => number }[] = [
    { key: 'onTime', color: GREEN, label: 'A tiempo',      val: onT },
    { key: 'late',   color: AMBER, label: 'Tarde',         val: d => d.late },
    { key: 'missed', color: RED,   label: 'No realizadas', val: d => d.missed },
  ];

  return (
    <div ref={ref}>
      <svg width={w} height={H} role="img" aria-label="Actividades por día">
        {[0, scaleMax / 2, scaleMax].map((gv, i) => (
          <g key={i}>
            <line x1={padL} y1={y(gv)} x2={w - padR} y2={y(gv)} stroke={GRID} strokeWidth={1} />
            <text x={padL - 6} y={y(gv) + 3} textAnchor="end" fontSize={9} fill={AXIS}>{Math.round(gv)}</text>
          </g>
        ))}

        {type === 'stacked' && daily.map((d, i) => {
          const bw = Math.min(46, band * 0.6);
          const segs = [
            { v: onT(d), color: GREEN }, { v: d.late, color: AMBER }, { v: d.missed, color: RED },
          ].filter(s => s.v > 0);
          let acc = 0;
          return (
            <g key={i}>
              <title>{`${d.d}: ${onT(d)} a tiempo · ${d.late} tarde · ${d.missed} no realizadas`}</title>
              {segs.map((s, si) => {
                const h = (s.v / scaleMax) * plotH;
                const yTop = padT + plotH - acc - h; acc += h;
                const isTop = si === segs.length - 1;
                return <rect key={si} x={cx(i) - bw / 2} y={yTop} width={bw} height={Math.max(0, h - 2)} rx={isTop ? 3 : 0} fill={s.color} />;
              })}
            </g>
          );
        })}

        {type === 'grouped' && daily.map((d, i) => {
          const inner = Math.min(band * 0.82, 66);
          const gap = 3;
          const bw = Math.max(2, (inner - gap * 2) / 3);
          const start = cx(i) - inner / 2;
          return series.map((s, si) => {
            const v = s.val(d);
            const h = (v / scaleMax) * plotH;
            return (
              <rect key={s.key} x={start + si * (bw + gap)} y={padT + plotH - h} width={bw} height={h} rx={2} fill={s.color}>
                <title>{`${d.d} · ${s.label}: ${v}`}</title>
              </rect>
            );
          });
        })}

        {type === 'lines' && series.map(s => {
          const pts = daily.map((d, i) => [cx(i), y(s.val(d))] as [number, number]);
          const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
          return (
            <g key={s.key}>
              <path d={path} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {pts.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r={3.2} fill={s.color} stroke="#fff" strokeWidth={1}>
                  <title>{`${daily[i].d} · ${s.label}: ${s.val(daily[i])}`}</title>
                </circle>
              ))}
            </g>
          );
        })}

        {daily.map((d, i) => (
          <g key={`x${i}`}>
            <text x={cx(i)} y={H - 13} textAnchor="middle" fontSize={11} fontWeight={600} fill="#6E6E73">{d.d}</text>
            <text x={cx(i)} y={H - 2} textAnchor="middle" fontSize={9} fill={MUTED}>{d.done + d.missed}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Tendencia por semana ─────────────────────────────────────────────────────────
export type TrendType = 'bars' | 'line' | 'area';
export interface TrendPoint { key: string; label: string; pct: number; start: Date; tooltip: string; }

export function TrendChart({ trend, selectedKey, onSelect, type }: {
  trend: TrendPoint[];
  selectedKey: string;
  onSelect: (start: Date) => void;
  type: TrendType;
}) {
  const { ref, w } = useWidth();
  const H = 200, padT = 16, padB = 28, padL = 30, padR = 12;
  const n = trend.length;
  const svgW = Math.max(w, n * 48 + padL + padR);
  const plotW = svgW - padL - padR;
  const plotH = H - padT - padB;
  const band = plotW / n;
  const y = (p: number) => padT + plotH - (p / 100) * plotH;
  const cx = (i: number) => padL + band * i + band / 2;

  const pts = trend.map((t, i) => [cx(i), y(t.pct)] as [number, number]);
  const linePath = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const areaPath = n > 0
    ? `${linePath} L ${cx(n - 1).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${cx(0).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`
    : '';

  return (
    <div ref={ref} className="overflow-x-auto">
      <svg width={svgW} height={H} role="img" aria-label="Tendencia de cumplimiento">
        {[0, 50, 100].map(g => (
          <g key={g}>
            <line x1={padL} y1={y(g)} x2={svgW - padR} y2={y(g)} stroke={GRID} strokeWidth={1} />
            <text x={padL - 6} y={y(g) + 3} textAnchor="end" fontSize={9} fill={AXIS}>{g}%</text>
          </g>
        ))}
        {[70, 90].map(t => (
          <line key={t} x1={padL} y1={y(t)} x2={svgW - padR} y2={y(t)} stroke={t >= 90 ? GREEN : AMBER} strokeWidth={1} strokeDasharray="3 3" opacity={0.35} />
        ))}

        {type === 'area' && areaPath && <path d={areaPath} fill={INK} opacity={0.06} />}
        {(type === 'line' || type === 'area') && (
          <>
            <path d={linePath} fill="none" stroke={INK} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {trend.map((t, i) => {
              const sel = t.key === selectedKey;
              return <circle key={i} cx={cx(i)} cy={y(t.pct)} r={sel ? 5 : 3.5} fill={rateColor(t.pct)} stroke="#fff" strokeWidth={sel ? 2 : 1.2} />;
            })}
          </>
        )}
        {type === 'bars' && trend.map((t, i) => {
          const sel = t.key === selectedKey;
          const bw = Math.min(34, band * 0.6);
          const bh = (t.pct / 100) * plotH;
          return <rect key={i} x={cx(i) - bw / 2} y={padT + plotH - bh} width={bw} height={bh} rx={3} fill={rateColor(t.pct)} stroke={sel ? INK : 'none'} strokeWidth={sel ? 2 : 0} />;
        })}

        {trend.map((t, i) => (
          <g key={`x${i}`}>
            <text x={cx(i)} y={y(t.pct) - 8} textAnchor="middle" fontSize={9} fontWeight={700} fill={rateColor(t.pct)}>{t.pct}%</text>
            <text x={cx(i)} y={H - 4} textAnchor="middle" fontSize={9} fill={MUTED}>{t.label}</text>
            <rect x={padL + band * i} y={padT} width={band} height={plotH} fill="transparent" style={{ cursor: 'pointer' }} onClick={() => onSelect(new Date(t.start))}>
              <title>{t.tooltip}</title>
            </rect>
          </g>
        ))}
      </svg>
    </div>
  );
}
