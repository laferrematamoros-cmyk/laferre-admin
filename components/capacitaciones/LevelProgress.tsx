import { levelFor, levelLine, LEVEL_LABEL } from '@/lib/capacitaciones/levels';
import LevelBadge, { LEVEL_COLORS } from './LevelBadge';
import md from './medals.module.css';

/** Arriba de la vitrina: insignia, "Nivel Plata", "12 de 20 medallas · Te faltan 3 para Oro" y la barra con las metas. */
export default function LevelProgress({ earned, total }: { earned: number; total: number }) {
  if (total <= 0) return null;
  const { current } = levelFor(earned, total);
  const line = levelLine(earned, total);
  const pct = Math.min(100, (earned / total) * 100);
  return (
    <div className={md.level}>
      <div className={md.levelTop}>
        <LevelBadge level={current} size={46} />
        <div className={md.levelText}>
          <b>{current ? `Nivel ${LEVEL_LABEL[current]}` : 'Sin nivel todavía'}</b>
          <span>{earned} de {total} medallas{line ? ` · ${line}` : ''}</span>
        </div>
      </div>
      <div className={md.track} role="img" aria-label={`${earned} de ${total} medallas. ${line}`}>
        <i style={{ width: `${pct}%`, background: current ? LEVEL_COLORS[current].edge : LEVEL_COLORS.bronce.fill }} />
        {[25, 50, 75].map(p => <span key={p} className={md.tick} style={{ left: `${p}%` }} />)}
      </div>
    </div>
  );
}
