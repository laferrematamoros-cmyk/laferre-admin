'use client';

import { LAYOUT, focusBox, type Shelf } from '@/lib/store-layout';
import type { TileState } from './labels';
import m from './storemap.module.css';

// El plano de La Ferre (lib/store-layout.ts). La copia del teléfono: laferre-actividades/components/StoreMap.tsx.

export const SHELF_LOOK: Record<TileState | 'plain' | 'here', { fill: string; stroke: string; ink: string; sw: number }> = {
  plain: { fill: '#FFFFFF', stroke: '#E8463A', ink: '#1E1E1E', sw: 2 },
  todo:  { fill: '#FFFFFF', stroke: '#E8463A', ink: '#1E1E1E', sw: 2 },
  late:  { fill: '#FFFFFF', stroke: '#E11D2E', ink: '#A50F1C', sw: 3.5 },
  run:   { fill: '#FCE3A8', stroke: '#E8930C', ink: '#7A4A00', sw: 2 },
  redo:  { fill: '#FDE0C2', stroke: '#E8930C', ink: '#8A5100', sw: 2 },
  done:  { fill: '#9ADBB8', stroke: '#0A7D55', ink: '#064D33', sw: 2 },
  here:  { fill: '#E11D2E', stroke: '#A50F1C', ink: '#FFFFFF', sw: 3 },
};

export const MAP_LEGEND: { state: TileState; label: string }[] = [
  { state: 'todo', label: 'Por hacer' }, { state: 'run', label: 'En proceso' }, { state: 'done', label: 'Terminada' },
  { state: 'redo', label: 'Por rehacer' }, { state: 'late', label: 'Atrasada' },
];

function fontFor(s: Shelf) {
  const per = s.code.length > 2 ? 0.34 : s.code.length > 1 ? 0.44 : 0.62;
  return Math.max(9, Math.min(16, s.h * 0.62, s.w * per));
}

/**
 * Plano de la tienda. `statuses` pinta cada letra según su avance; `highlight` marca una (parpadeando);
 * `focus` acerca el dibujo a esa letra; `onPick` la vuelve botón.
 */
export default function StoreMap({ statuses, highlight, focus, onPick, label = 'Plano de la tienda' }: {
  statuses?: Record<string, TileState>;
  highlight?: string | null;
  focus?: string | null;
  onPick?: (code: string) => void;
  label?: string;
}) {
  const box = (focus && focusBox(focus)) || LAYOUT.viewBox;
  const hi = highlight?.trim().toUpperCase() ?? null;
  return (
    <svg className={m.map} viewBox={box.join(' ')} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
      {LAYOUT.zones.map(z => z.rects.map((r, i) => <rect key={`${z.key}${i}`} x={r[0]} y={r[1]} width={r[2]} height={r[3]} fill={z.fill} />))}
      {LAYOUT.rooms.map(r => (
        <g key={r.label}>
          <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#FFFFFF" stroke="#9AA0A6" strokeWidth={2} rx={4} />
          <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 5} textAnchor="middle" fontSize={14} fontWeight={600} fill="#8A8F96">{r.label}</text>
        </g>
      ))}
      {LAYOUT.walls.map((w, i) => <line key={`w${i}`} x1={w[0]} y1={w[1]} x2={w[2]} y2={w[3]} stroke="#1E1E1E" strokeWidth={6} strokeLinecap="square" />)}
      {LAYOUT.inner.map((w, i) => <line key={`i${i}`} x1={w[0]} y1={w[1]} x2={w[2]} y2={w[3]} stroke="#3A3A3A" strokeWidth={4} strokeLinecap="square" />)}
      {LAYOUT.entrances.map(e => (
        <g key={e.x}>
          <rect x={e.x} y={42} width={e.w} height={8} fill="#1E9E55" />
          <text x={e.x + e.w / 2} y={37} textAnchor="middle" fontSize={11} fontWeight={700} fill="#1E9E55" letterSpacing={1}>ENTRADA</text>
        </g>
      ))}
      {LAYOUT.shelves.map((s, i) => {
        const isHere = hi === s.code;
        const look = SHELF_LOOK[isHere ? 'here' : statuses?.[s.code] ?? 'plain'];
        const tall = s.code === '9I';
        const fs = tall ? 16 : fontFor(s);
        const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
        const body = (
          <>
            <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={4} fill={look.fill} stroke={look.stroke} strokeWidth={look.sw} />
            {isHere && <rect className={m.pulse} x={s.x - 5} y={s.y - 5} width={s.w + 10} height={s.h + 10} rx={8} fill="none" stroke="#E11D2E" strokeWidth={4} />}
            {tall
              ? <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={fs} fontWeight={800} fill={look.ink} transform={`rotate(-90 ${cx} ${cy})`}>TUBERÍA 9I</text>
              : <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={fs} fontWeight={800} fill={look.ink}>{s.code}</text>}
          </>
        );
        if (!onPick) return <g key={`${s.code}${i}`}>{body}</g>;
        return (
          <g key={`${s.code}${i}`} className={m.hit} role="button" tabIndex={0} aria-label={`Letra ${s.code}`}
            onClick={() => onPick(s.code)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(s.code); } }}>
            {body}
          </g>
        );
      })}
    </svg>
  );
}
