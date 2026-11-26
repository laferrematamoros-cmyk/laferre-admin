import type { CSSProperties } from 'react';
import { medalShelf } from '@/lib/capacitaciones/medals';
import { themeOf } from '@/lib/capacitaciones/themes';
import type { TrainingStatus } from '@/lib/capacitaciones/status';
import Medal from './Medal';
import md from './medals.module.css';

/** La vitrina: una tira que se desliza con todas las medallas (ganadas primero, de colores y brillando por turnos). */
export default function MedalShelf({ items }: { items: { slug: string; title: string; sort_order: number; status: TrainingStatus }[] }) {
  if (items.length === 0) return null;
  let n = 0;
  return (
    <ul className={md.shelf} aria-label="Mis medallas">
      {medalShelf(items).map(i => (
        <li key={i.slug} className={`${md.item} ${i.earned ? '' : md.missing}`} aria-label={`${i.title}: ${i.earned ? 'ganada' : 'te falta'}`}>
          <span className={i.earned ? md.shine : md.plain} style={i.earned ? { '--d': `${(n++ % 8) * 0.55}s` } as CSSProperties : undefined}>
            <Medal theme={themeOf(i.slug)} earned={i.earned} size={44} />
          </span>
          <span className={md.name}>{i.title}</span>
        </li>
      ))}
    </ul>
  );
}
