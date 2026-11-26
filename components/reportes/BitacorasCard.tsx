import Link from 'next/link';
import { summaryChips, type BitSummary, type ChipTone } from '@/lib/bitacora-summary';
import { IconRight } from '@/components/panel/icons';
import b from './bitacoras.module.css';

const TONE: Record<ChipTone, string> = { ok: b.ok, warn: b.warn, muted: b.muted };

/** Bitácoras de la semana (listas con firma): un renglón por lista con su resumen; al picarlo abre la hoja. Sólo admin. */
export default function BitacorasCard({ rows, week }: { rows: BitSummary[]; week: string }) {
  if (rows.length === 0) return <p className={b.empty}>No hay actividades con lista con firma.</p>;
  return (
    <ul className={b.list}>
      {rows.map(r => {
        const pending = r.toSign > 0 || r.missed > 0;
        return (
          <li key={r.id}>
            <Link href={`/actividades/${r.id}/bitacora?semana=${week}&desde=reportes`} className={b.row}>
              <span className={`${b.dot} ${pending ? b.dotWarn : b.dotOk}`} aria-hidden />
              <span className={b.main}>
                <b>{r.title}</b>
                <span className={b.chips}>
                  {summaryChips(r).map(c => <span key={c.text} className={`${b.chip} ${TONE[c.tone]}`}>{c.text}</span>)}
                </span>
              </span>
              <span className={b.go}>Ver hoja <IconRight size={14} /></span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
