// La medalla de capacitación: dorada con estrella y listón rojo; gris si todavía no se gana.
// El mismo dibujo vive en laferre-actividades/components/Medal.tsx (react-native-svg): cambiar los dos.

const STAR = '20,24 21.76,28.57 26.66,28.84 22.85,31.93 24.11,36.66 20,34 15.89,36.66 17.15,31.93 13.34,28.84 18.24,28.57';

const GOLD = { left: '#DB011C', right: '#A50016', disc: '#F4B731', edge: '#C98A12', ring: '#FFE29A', star: '#FFF6D6', starEdge: '#E0A21F' };
const GREY = { left: '#C9CDD2', right: '#B5BAC0', disc: '#E6E8EB', edge: '#C8CCD1', ring: '#F3F4F6', star: '#D3D7DC', starEdge: '#D3D7DC' };

export default function Medal({ earned, size = 40, className }: { earned: boolean; size?: number; className?: string }) {
  const c = earned ? GOLD : GREY;
  return (
    <svg className={className} width={size} height={size * 1.2} viewBox="0 0 40 48" aria-hidden focusable="false">
      <polygon points="9,0 17,0 22,20 14,20" fill={c.left} />
      <polygon points="23,0 31,0 26,20 18,20" fill={c.right} />
      <circle cx="20" cy="31" r="15" fill={c.disc} stroke={c.edge} strokeWidth="2" />
      <circle cx="20" cy="31" r="11" fill="none" stroke={c.ring} strokeWidth="1.5" />
      <polygon points={STAR} fill={c.star} stroke={c.starEdge} strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}
