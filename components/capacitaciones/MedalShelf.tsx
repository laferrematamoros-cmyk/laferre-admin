import { medalShelf } from '@/lib/capacitaciones/medals';
import type { TrainingStatus } from '@/lib/capacitaciones/status';
import Medal from './Medal';
import md from './medals.module.css';

/** La vitrina: una tira que se desliza con todas las medallas (ganadas primero, luego las grises). */
export default function MedalShelf({ items }: { items: { slug: string; title: string; sort_order: number; status: TrainingStatus }[] }) {
  if (items.length === 0) return null;
  return (
    <ul className={md.shelf} aria-label="Mis medallas">
      {medalShelf(items).map(i => (
        <li key={i.slug} className={`${md.item} ${i.earned ? '' : md.missing}`} aria-label={`${i.title}: ${i.earned ? 'ganada' : 'te falta'}`}>
          <Medal earned={i.earned} size={44} />
          <span className={md.name}>{i.title}</span>
        </li>
      ))}
    </ul>
  );
}
