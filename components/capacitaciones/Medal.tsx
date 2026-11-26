// La medalla de capacitación: el color y el dibujo de su tema (lib/capacitaciones/themes.ts); gris si todavía no se gana.
// El mismo dibujo vive en laferre-actividades/components/Medal.tsx (react-native-svg): cambiar los dos.
import { THEMES, type ThemeIcon, type ThemeKey } from '@/lib/capacitaciones/themes';

const STAR = '20,24 21.76,28.57 26.66,28.84 22.85,31.93 24.11,36.66 20,34 15.89,36.66 17.15,31.93 13.34,28.84 18.24,28.57';
const GREY = { disc: '#E6E8EB', edge: '#C8CCD1', ring: '#F3F4F6', left: '#C9CDD2', right: '#B5BAC0' };
const GREY_INK = '#CDD1D6';

function Icon({ icon, ink, edge }: { icon: ThemeIcon; ink: string; edge: string }) {
  switch (icon) {
    case 'drop':
      return <path d="M20 23.5 C17.5 27 15.5 29.5 15.5 32 a4.5 4.5 0 0 0 9 0 C24.5 29.5 22.5 27 20 23.5 Z" fill={ink} />;
    case 'bolt':
      return <path d="M21.8 23 L15.5 32.2 H19.6 L18.4 39 L24.8 29.8 H20.7 Z" fill={ink} />;
    case 'roller':
      return (
        <g>
          <rect x="13.5" y="25" width="12" height="5" rx="1.5" fill={ink} />
          <path d="M25.5 27.5 h1.8 v4.2 h-7.3 v2.6" fill="none" stroke={ink} strokeWidth="1.6" />
          <rect x="19" y="33.8" width="2" height="5" rx="1" fill={ink} />
        </g>
      );
    case 'ruler':
      return (
        <g transform="rotate(-35 20 31)">
          <rect x="11" y="28" width="18" height="6" rx="1.2" fill={ink} />
          <path d="M14 28v2.6M17 28v1.6M20 28v2.6M23 28v1.6M26 28v2.6" stroke={edge} strokeWidth="1.1" />
        </g>
      );
    case 'wrench':
      return <path d="M24.6 24.4a4 4 0 0 0-5 5l-5.1 5.1a1.6 1.6 0 0 0 2.3 2.3l5.1-5.1a4 4 0 0 0 5-5l-2.4 2.4-2.1-.3-.3-2.1z" fill={ink} />;
    case 'phone':
      return <path d="M16.2 24.6c.9-.9 2.2-.8 2.8.2l1.3 2.2c.5.9.2 1.9-.7 2.4.7 1.7 1.9 2.9 3.6 3.6.5-.9 1.5-1.2 2.4-.7l2.2 1.3c1 .6 1.1 1.9.2 2.8-1.6 1.6-4 1.9-6.6.2-2.6-1.7-4.6-3.9-5.6-6.6-.8-2.2-.5-4.1.4-5.4z" fill={ink} />;
    default:
      return <polygon points={STAR} fill={ink === GREY_INK ? '#D3D7DC' : '#FFF6D6'} stroke={ink === GREY_INK ? '#D3D7DC' : '#E0A21F'} strokeWidth="1" strokeLinejoin="round" />;
  }
}

export default function Medal({ theme = 'general', earned, size = 40, className }: {
  theme?: ThemeKey; earned: boolean; size?: number; className?: string;
}) {
  const t = THEMES[theme] ?? THEMES.general;
  const c = earned ? t : GREY;
  return (
    <svg className={className} width={size} height={size * 1.2} viewBox="0 0 40 48" aria-hidden focusable="false">
      <polygon points="9,0 17,0 22,20 14,20" fill={c.left} />
      <polygon points="23,0 31,0 26,20 18,20" fill={c.right} />
      <circle cx="20" cy="31" r="15" fill={c.disc} stroke={c.edge} strokeWidth="2" />
      <circle cx="20" cy="31" r="11" fill="none" stroke={c.ring} strokeWidth="1.5" />
      <Icon icon={t.icon} ink={earned ? '#fff' : GREY_INK} edge={c.edge} />
    </svg>
  );
}
