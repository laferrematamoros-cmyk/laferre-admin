// Capacitaciones en código (diseño: docs/superpowers/specs/2026-11-21-capacitaciones-design.md).
// Agregar una: su .jsx en components/capacitaciones/anim/, su entrada en registry.tsx y aquí.
// Cambiar una animación: subir `version` (a todos les vuelve a salir). Nunca bajarla.
// Cada una lleva su tema (la medalla): el teléfono lo recibe de la base (syncCatalog → trainings.theme → cap_list).

import type { ThemeKey } from './themes';

export interface CatalogEntry {
  slug: string;
  title: string;
  version: number;
  /** Tiempo mínimo inicial (s): una vuelta completa de la animación, redondeada hacia arriba a 5 s, y nunca menos de 20 s (hay que leer las tarjetas). El admin lo cambia. */
  minSeconds: number;
  /** Componentes de components/capacitaciones/anim/ (sin .jsx), en orden. */
  parts: string[];
  /** El tema de su medalla (lib/capacitaciones/themes.ts). Nunca 'general': ése es el respaldo. */
  theme: ThemeKey;
}

export const CATALOG: CatalogEntry[] = [
  { slug: 'fregadero',            title: 'Instalar un fregadero',       version: 1, minSeconds: 30, parts: ['InstalarFregadero'], theme: 'plomeria' },
  { slug: 'lavabo',               title: 'Instalar un lavabo',          version: 1, minSeconds: 30, parts: ['InstalarLavabo'], theme: 'plomeria' },
  { slug: 'gas-estufa',           title: 'Conectar el gas a la estufa', version: 1, minSeconds: 30, parts: ['InstalarGasEstufa'], theme: 'plomeria' },
  { slug: 'bomba',                title: 'Instalar una bomba',          version: 1, minSeconds: 40, parts: ['InstalarBomba'], theme: 'plomeria' },
  { slug: 'hidroneumatico',       title: 'Instalar un hidroneumático',  version: 1, minSeconds: 35, parts: ['InstalarHidroneumatico'], theme: 'plomeria' },
  { slug: 'errores-bombas',       title: 'Errores comunes con bombas',  version: 1, minSeconds: 20, parts: ['BombaSistemasIncorrectos'], theme: 'plomeria' },
  { slug: 'brocas-metal',         title: 'Brocas para metal',           version: 1, minSeconds: 20, parts: ['BrocaMetal'], theme: 'herramientas' },
  { slug: 'cables-interruptores', title: 'Cables e interruptores',      version: 1, minSeconds: 40, parts: ['CableDelgadoPeligro', 'CableEInterruptor'], theme: 'electricidad' },
  { slug: 'extension',            title: 'Extensión sobrecargada',      version: 1, minSeconds: 25, parts: ['ExtensionSobrecargada'], theme: 'electricidad' },
  { slug: 'focos-led',            title: 'Focos LED',                   version: 1, minSeconds: 20, parts: ['ComparativaFocos'], theme: 'electricidad' },
  { slug: 'cortinas',             title: 'Mantenimiento de cortinas',   version: 1, minSeconds: 30, parts: ['MantenimientoCortina'], theme: 'herramientas' },
  { slug: 'impermeabilizar',      title: 'Impermeabilizar un techo',    version: 1, minSeconds: 50, parts: ['CalculadoraYTipsImpermeabilizante', 'PasosImpermeabilizar', 'ProductosImpermeabilizante'], theme: 'pintura' },
  { slug: 'pintar-pared',         title: 'Pintar una pared',            version: 1, minSeconds: 20, parts: ['PasosPintar'], theme: 'pintura' },
  { slug: 'tuberias',             title: 'Conoce las tuberías',          version: 1, minSeconds: 60, parts: ['ConoceTuberias'], theme: 'plomeria' },
  { slug: 'tuberia-cortada',      title: 'Tubería cortada',              version: 1, minSeconds: 30, parts: ['TuberiaCortada'], theme: 'bodega' },
  { slug: 'medir-manguera',       title: 'Cómo medir manguera',          version: 1, minSeconds: 45, parts: ['MedirManguera'], theme: 'bodega' },
  { slug: 'manguera-nivel',       title: 'Cómo medir manguera de nivel', version: 1, minSeconds: 45, parts: ['MedirMangueraNivel'], theme: 'bodega' },
  { slug: 'poliducto',            title: 'Cómo medir poliducto',         version: 1, minSeconds: 35, parts: ['MedirPoliducto'], theme: 'bodega' },
  { slug: 'llamadas',             title: 'Recepción de llamadas',        version: 1, minSeconds: 45, parts: ['RecepcionLlamadas'], theme: 'atencion' },
  { slug: 'facturacion',          title: 'Proceso de facturación',       version: 1, minSeconds: 45, parts: ['ProcesoFacturacion'], theme: 'atencion' },
];

export function catalogBySlug(slug: string): CatalogEntry | null {
  return CATALOG.find(c => c.slug === slug) ?? null;
}
