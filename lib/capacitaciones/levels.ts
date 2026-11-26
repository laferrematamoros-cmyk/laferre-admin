// Niveles de medallas (diseño: docs/superpowers/specs/2026-11-25-medallas-temas-niveles-design.md). Puro.
// Por porcentaje de las capacitaciones prendidas que le tocan: si se agregan más, las metas crecen solas.
// La app de teléfonos tiene una copia en laferre-actividades/lib/training.ts: cambiar las dos.

export type LevelKey = 'bronce' | 'plata' | 'oro' | 'diamante';

export const LEVELS: { key: LevelKey; label: string; pct: number }[] = [
  { key: 'bronce', label: 'Bronce', pct: 0.25 },
  { key: 'plata', label: 'Plata', pct: 0.5 },
  { key: 'oro', label: 'Oro', pct: 0.75 },
  { key: 'diamante', label: 'Diamante', pct: 1 },
];

export const LEVEL_LABEL: Record<LevelKey, string> = { bronce: 'Bronce', plata: 'Plata', oro: 'Oro', diamante: 'Diamante' };

export interface NextLevel { key: LevelKey; label: string; need: number; missing: number }

/** Medallas que pide un nivel: redondeo hacia arriba, nunca menos de 1; Diamante = todas. */
const need = (pct: number, total: number) => (pct >= 1 ? total : Math.max(1, Math.ceil(pct * total)));

/** Nivel actual (el más alto alcanzado) y el siguiente con cuántas le faltan. Sin capacitaciones, ninguno. */
export function levelFor(earned: number, total: number): { current: LevelKey | null; next: NextLevel | null } {
  if (total <= 0) return { current: null, next: null };
  let current: LevelKey | null = null;
  let next: NextLevel | null = null;
  for (const l of LEVELS) {
    const n = need(l.pct, total);
    if (earned >= n) current = l.key;
    else if (!next) next = { key: l.key, label: l.label, need: n, missing: n - earned };
  }
  return { current, next };
}

/** "Te faltan 3 para Oro" · "Te falta 1 para Diamante" · "¡Tienes todas!" */
export function levelLine(earned: number, total: number): string {
  const { next } = levelFor(earned, total);
  if (next) return `Te falta${next.missing === 1 ? '' : 'n'} ${next.missing} para ${next.label}`;
  return total > 0 ? '¡Tienes todas!' : '';
}

export function countText(earned: number, total: number): string {
  return earned >= total ? `¡Ya tienes las ${total} medallas!` : `Ya llevas ${earned} de ${total} medallas.`;
}

/**
 * La cuenta después de tocar "Entendí": `before` la arma el servidor al abrir la página (antes de contestar).
 * Suma 1 si la capacitación no estaba terminada; `levelUp` = el nivel nuevo si cambió.
 */
export function celebrate(before: { earned: number; total: number } | null, wasDone: boolean):
  { earned: number; total: number; levelUp: LevelKey | null } | null {
  if (!before) return null;
  const earned = Math.min(before.total, before.earned + (wasDone ? 0 : 1));
  const prev = levelFor(before.earned, before.total).current;
  const now = levelFor(earned, before.total).current;
  return { earned, total: before.total, levelUp: now !== prev ? now : null };
}
