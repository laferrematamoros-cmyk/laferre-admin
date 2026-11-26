// Insignia de nivel (hexágono): Bronce I, Plata II, Oro III, Diamante con gema; gris sin nivel.
// El mismo dibujo vive en laferre-actividades/components/LevelBadge.tsx: cambiar los dos.
import type { LevelKey } from '@/lib/capacitaciones/levels';

export const LEVEL_COLORS: Record<LevelKey | 'none', { fill: string; edge: string; ring: string; ink: string }> = {
  bronce:   { fill: '#D08A4E', edge: '#9C5A28', ring: '#F1C49B', ink: '#FFF3E6' },
  plata:    { fill: '#CBD2D9', edge: '#8E98A2', ring: '#EEF1F4', ink: '#5D666E' },
  oro:      { fill: '#F4B731', edge: '#C98A12', ring: '#FFE29A', ink: '#7A4E05' },
  diamante: { fill: '#7FD6F5', edge: '#2E9CC8', ring: '#D4F3FD', ink: '#0E5B7A' },
  none:     { fill: '#ECEEF1', edge: '#C8CCD1', ring: '#F7F8F9', ink: '#B5BAC0' },
};
const ROMAN: Record<LevelKey, string> = { bronce: 'I', plata: 'II', oro: 'III', diamante: '' };

export default function LevelBadge({ level, size = 40, className }: { level: LevelKey | null; size?: number; className?: string }) {
  const c = LEVEL_COLORS[level ?? 'none'];
  return (
    <svg className={className} width={size} height={size * 1.1} viewBox="0 0 40 44" aria-hidden focusable="false">
      <polygon points="20,2 37,11.5 37,32.5 20,42 3,32.5 3,11.5" fill={c.fill} stroke={c.edge} strokeWidth="2" strokeLinejoin="round" />
      <polygon points="20,7 32.5,14 32.5,30 20,37 7.5,30 7.5,14" fill="none" stroke={c.ring} strokeWidth="1.5" strokeLinejoin="round" />
      {level === 'diamante' ? (
        <g>
          <polygon points="14,19 17,15 23,15 26,19 20,30" fill="#fff" stroke={c.ink} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M14 19h12M17 15l3 4 3-4M20 19v11" fill="none" stroke={c.ink} strokeWidth="1" strokeLinejoin="round" />
        </g>
      ) : level ? (
        <text x="20" y="27" textAnchor="middle" fontSize="12" fontWeight="800" fill={c.ink} fontFamily="system-ui, sans-serif">{ROMAN[level]}</text>
      ) : (
        <text x="20" y="27" textAnchor="middle" fontSize="12" fontWeight="800" fill={c.ink} fontFamily="system-ui, sans-serif">?</text>
      )}
    </svg>
  );
}
