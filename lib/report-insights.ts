import { DAY_NAMES, type WeekReport, type TrendPoint } from './reports';

export type InsightTone = 'ok' | 'late' | 'miss';
export type InsightIcon = 'check' | 'x' | 'clock' | 'up' | 'down' | 'equal';
export interface Insight { tone: InsightTone; icon: InsightIcon; title: string; detail: string; }

/** "a" · "a y b" · "a, b y c" */
export function joinEs(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

/** Las frases de "Lectura rápida", en orden: sin hacer, tarde, comparación.
 *  `showCounts = false` (practicante) quita las cantidades por persona. */
export function buildInsights(r: WeekReport, prevPct: number | null, showCounts: boolean): Insight[] {
  const out: Insight[] = [];

  // 1. Sin hacer
  const miss = r.counts.miss;
  if (miss > 0) {
    const owners = r.people.filter(p => p.miss > 0).map(p => (showCounts ? `${p.name} (${p.miss})` : p.name));
    if (r.generalMiss > 0) owners.push(showCounts ? `Generales (${r.generalMiss})` : 'Generales');
    out.push({ tone: 'miss', icon: 'x', title: miss === 1 ? '1 quedó sin hacer' : `${miss} quedaron sin hacer`, detail: owners.join(' · ') });
  } else if (r.due > 0) {
    out.push({ tone: 'ok', icon: 'check', title: 'No quedó nada sin hacer', detail: 'Todo lo que ya tocaba se hizo' });
  }

  // 2. Tarde
  const late = r.counts.late;
  const done = r.done;
  if (done > 0) {
    if (late === 0) {
      out.push({ tone: 'ok', icon: 'clock', title: 'Todo lo hecho fue a tiempo', detail: 'Nada se hizo después de su hora' });
    } else {
      const title = late / done >= 0.5 ? 'La mitad o más se hizo tarde' : `1 de cada ${Math.round(done / late)} se hizo tarde`;
      let detail = `${late} de ${done}`;
      let top = r.days[0];
      for (const d of r.days) if (d.late > top.late) top = d;
      if (late >= 3 && top.late / late >= 0.4) detail += `, sobre todo el ${DAY_NAMES[top.date.getDay()]}`;
      out.push({ tone: 'late', icon: 'clock', title, detail });
    }
  }

  // 3. Comparación con la semana anterior
  if (prevPct !== null && r.pct !== null) {
    const diff = r.pct - prevPct;
    const detail = `${r.pct}% contra ${prevPct}%`;
    if (diff > 0) out.push({ tone: 'ok', icon: 'up', title: 'Mejor que la semana pasada', detail });
    else if (diff < 0) out.push({ tone: 'late', icon: 'down', title: 'Peor que la semana pasada', detail });
    else out.push({ tone: 'ok', icon: 'equal', title: 'Igual que la semana pasada', detail });
  }

  return out;
}

/** Resumen de una línea para "Día por día" (se ve aunque la sección esté cerrada). */
export function dailyPeek(r: WeekReport): string {
  if (r.due === 0) return 'Todavía no vence nada esta semana';
  const days = r.days.filter(d => d.miss > 0).map(d => (d.isToday ? 'hoy' : `el ${DAY_NAMES[d.date.getDay()]}`));
  return days.length ? `Quedó algo sin hacer ${joinEs(days)}` : 'Ningún día quedó algo sin hacer';
}

/** Resumen de una línea para "Semanas pasadas". */
export function trendPeek(points: TrendPoint[]): string {
  const vals = points.map(p => p.pct).filter((p): p is number => p !== null);
  if (vals.length === 0) return 'Todavía no hay semanas con datos';
  const avg = Math.round(vals.reduce((n, p) => n + p, 0) / vals.length);
  const meta = vals.filter(p => p >= 90).length;
  return `Promedio de ${vals.length} ${vals.length === 1 ? 'semana' : 'semanas'}: ${avg}% · ${meta} ${meta === 1 ? 'llegó' : 'llegaron'} a la meta`;
}
