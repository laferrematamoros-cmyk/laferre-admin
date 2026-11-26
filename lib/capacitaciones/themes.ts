// Temas de las medallas (diseño: docs/superpowers/specs/2026-11-25-medallas-temas-niveles-design.md). Puro.
// Cada capacitación del catálogo dice su tema; la medalla toma su color y su dibujo.
// La app de teléfonos tiene una copia de los colores en laferre-actividades/components/Medal.tsx: cambiar las dos.
import { catalogBySlug } from './catalog';

export type ThemeKey = 'plomeria' | 'electricidad' | 'pintura' | 'bodega' | 'herramientas' | 'atencion' | 'general';
export type ThemeIcon = 'drop' | 'bolt' | 'roller' | 'ruler' | 'wrench' | 'phone' | 'star';

export interface Theme {
  label: string; icon: ThemeIcon;
  /** disco, borde del disco, aro interior, listón izquierdo y derecho */
  disc: string; edge: string; ring: string; left: string; right: string;
}

export const THEMES: Record<ThemeKey, Theme> = {
  plomeria:     { label: 'Plomería y gas',               icon: 'drop',   disc: '#3B8DF0', edge: '#1C5DB8', ring: '#A9CCF8', left: '#1C5DB8', right: '#12407F' },
  electricidad: { label: 'Electricidad',                 icon: 'bolt',   disc: '#F4B731', edge: '#C98A12', ring: '#FFE29A', left: '#DB011C', right: '#A50016' },
  pintura:      { label: 'Pintura',                      icon: 'roller', disc: '#EC6A73', edge: '#B83A44', ring: '#F8C2C6', left: '#B83A44', right: '#8A2830' },
  bodega:       { label: 'Bodega: medir y cortar',       icon: 'ruler',  disc: '#F28C38', edge: '#C2651A', ring: '#FAD0AC', left: '#C2651A', right: '#8F4A12' },
  herramientas: { label: 'Herramientas y mantenimiento', icon: 'wrench', disc: '#8E6CEF', edge: '#5E43B8', ring: '#D3C6FA', left: '#5E43B8', right: '#432F87' },
  atencion:     { label: 'Atención y oficina',           icon: 'phone',  disc: '#2EB67D', edge: '#1E8A5B', ring: '#A8E6C9', left: '#1E8A5B', right: '#14633F' },
  // Respaldo: un tema que no se conoce (la app vieja con un tema nuevo) sale como la medalla dorada de estrella.
  general:      { label: 'General',                      icon: 'star',   disc: '#F4B731', edge: '#C98A12', ring: '#FFE29A', left: '#DB011C', right: '#A50016' },
};

export const isThemeKey = (x: unknown): x is ThemeKey => typeof x === 'string' && Object.prototype.hasOwnProperty.call(THEMES, x);

/** El tema de una capacitación por su slug; si no está en el catálogo, el de respaldo. */
export function themeOf(slug: string): ThemeKey {
  return catalogBySlug(slug)?.theme ?? 'general';
}
