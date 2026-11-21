// Capacitaciones en código (diseño: docs/superpowers/specs/2026-11-21-capacitaciones-design.md).
// Agregar una: su .jsx en components/capacitaciones/anim/, su entrada en registry.tsx y aquí.
// Cambiar una animación: subir `version` (a todos les vuelve a salir). Nunca bajarla.

export interface CatalogEntry {
  slug: string;
  title: string;
  version: number;
  /** Tiempo mínimo inicial (s): una vuelta completa de la animación, redondeada hacia arriba a 5 s. El admin lo cambia. */
  minSeconds: number;
  /** Componentes de components/capacitaciones/anim/ (sin .jsx), en orden. */
  parts: string[];
}

export const CATALOG: CatalogEntry[] = [
  { slug: 'fregadero',            title: 'Instalar un fregadero',       version: 1, minSeconds: 30, parts: ['InstalarFregadero'] },
  { slug: 'lavabo',               title: 'Instalar un lavabo',          version: 1, minSeconds: 30, parts: ['InstalarLavabo'] },
  { slug: 'gas-estufa',           title: 'Conectar el gas a la estufa', version: 1, minSeconds: 30, parts: ['InstalarGasEstufa'] },
  { slug: 'bomba',                title: 'Instalar una bomba',          version: 1, minSeconds: 30, parts: ['InstalarBomba'] },
  { slug: 'hidroneumatico',       title: 'Instalar un hidroneumático',  version: 1, minSeconds: 30, parts: ['InstalarHidroneumatico'] },
  { slug: 'errores-bombas',       title: 'Errores comunes con bombas',  version: 1, minSeconds: 30, parts: ['BombaSistemasIncorrectos'] },
  { slug: 'brocas-metal',         title: 'Brocas para metal',           version: 1, minSeconds: 30, parts: ['BrocaMetal'] },
  { slug: 'cables-interruptores', title: 'Cables e interruptores',      version: 1, minSeconds: 30, parts: ['CableDelgadoPeligro', 'CableEInterruptor'] },
  { slug: 'extension',            title: 'Extensión sobrecargada',      version: 1, minSeconds: 30, parts: ['ExtensionSobrecargada'] },
  { slug: 'focos-led',            title: 'Focos LED',                   version: 1, minSeconds: 30, parts: ['ComparativaFocos'] },
  { slug: 'cortinas',             title: 'Mantenimiento de cortinas',   version: 1, minSeconds: 30, parts: ['MantenimientoCortina'] },
  { slug: 'impermeabilizar',      title: 'Impermeabilizar un techo',    version: 1, minSeconds: 50, parts: ['CalculadoraYTipsImpermeabilizante', 'PasosImpermeabilizar', 'ProductosImpermeabilizante'] },
  { slug: 'pintar-pared',         title: 'Pintar una pared',            version: 1, minSeconds: 20, parts: ['PasosPintar'] },
];

export function catalogBySlug(slug: string): CatalogEntry | null {
  return CATALOG.find(c => c.slug === slug) ?? null;
}
