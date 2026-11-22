import { shopClock } from '../my-day';
import { dueLabel } from './status';

/** Un aviso ya apartado en la base, suelto (lo que usan groupClaims y noticeText). */
export interface NoticeClaim {
  employee_id: string; employee_name: string; company_id: string | null;
  training_id: string; title: string; kind: 'new' | 'due_soon'; deadline: string;
}
/**
 * Lo que regresa cap_claim_notices(): UN renglón por persona con sus avisos en `notices`
 * (así la respuesta no choca con el tope de 1,000 filas de Supabase).
 */
export interface NoticeClaimRow {
  employee_id: string; employee_name: string; company_id: string | null;
  notices: Pick<NoticeClaim, 'training_id' | 'title' | 'kind' | 'deadline'>[] | null;
}
export interface NoticeGroup { employeeId: string; name: string; companyId: string | null; news: NoticeClaim[]; dues: NoticeClaim[] }

/** Abre los renglones por persona en avisos sueltos, como los espera groupClaims. */
export function flattenClaimRows(rows: NoticeClaimRow[]): NoticeClaim[] {
  return rows.flatMap(r => (r.notices ?? []).map(n => ({
    employee_id: r.employee_id, employee_name: r.employee_name, company_id: r.company_id,
    training_id: n.training_id, title: n.title, kind: n.kind, deadline: n.deadline,
  })));
}

export function groupClaims(claims: NoticeClaim[]): NoticeGroup[] {
  const by = new Map<string, NoticeGroup>();
  for (const c of claims) {
    const g = by.get(c.employee_id) ?? { employeeId: c.employee_id, name: c.employee_name, companyId: c.company_id, news: [], dues: [] };
    (c.kind === 'due_soon' ? g.dues : g.news).push(c);
    by.set(c.employee_id, g);
  }
  for (const g of by.values()) {
    const due = new Set(g.dues.map(d => d.training_id));
    g.news = g.news.filter(n => !due.has(n.training_id));
  }
  return [...by.values()];
}

const firstName = (full: string) => {
  const w = full.trim().split(/\s+/)[0] ?? '';
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
};

export function noticeText(g: NoticeGroup, now: Date): { title: string; body: string } {
  const n = firstName(g.name);
  const dueTxt = g.dues.length === 1 ? `${dueLabel(g.dues[0].deadline, now)}: ${g.dues[0].title}.`
    : g.dues.length > 1 ? `tienes ${g.dues.length} capacitaciones por vencer.` : '';
  const newTxt = g.news.length === 1 ? `tienes una capacitación nueva: ${g.news[0].title}.`
    : g.news.length > 1 ? `tienes ${g.news.length} capacitaciones nuevas por ver.` : '';
  let body: string;
  if (dueTxt && newTxt) body = `${n}, ${dueTxt} También tienes ${g.news.length === 1 ? 'una nueva' : `${g.news.length} nuevas`}.`;
  else body = `${n}, ${dueTxt || newTxt}`;
  return { title: 'Capacitación', body };
}

/** Los avisos de capacitación sólo salen de 9:00 a 19:00, hora de la tienda. */
export function inNoticeHours(now: Date): boolean {
  const m = shopClock(now).minutes;
  return m >= 9 * 60 && m < 19 * 60;
}
