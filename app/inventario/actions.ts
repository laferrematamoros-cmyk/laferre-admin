'use server';

import { supabaseAdmin as admin } from '@/lib/supabase';
import { adminAccess, ownsRow, fail, OK, type Result as ActionResult } from '@/lib/admin-access';
import { allows, isUuid } from '@/lib/access-rules';
import { shopClock } from '@/lib/my-day';
import { dueDays, dueInstant } from '@/lib/inventory-schedule';
import { openRound } from '@/lib/inventory-server';
import type { InventoryData, InvLetter, InvPending, InvPlan, InvRound, InvRoundSummary, InvSection } from '@/lib/inventory-types';

// Con `export type Result = …`, no `export type { Result }`: en un archivo 'use server'
// la compilación de producción lo vuelve un export real y el archivo truena al cargar.
export type Result = ActionResult;

const BUCKET = 'inventario';
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function companyOk(own: string | null, companyId: unknown): companyId is string {
  return isUuid(companyId) && allows(own, companyId);
}

const validDate = (d: unknown): d is string =>
  typeof d === 'string' && DATE.test(d) && new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;

const cleanCode = (v: unknown) => String(v ?? '').trim().toUpperCase();
const cleanName = (v: unknown) => String(v ?? '').trim();

function checkLetter(code: string, name: string): Result {
  if (!code || code.length > 6) return fail('La letra debe tener de 1 a 6 caracteres.');
  if (name.length > 60) return fail('El nombre es muy largo (máximo 60 letras).');
  return OK;
}

/** Todo lo de la pantalla del inventario de una empresa (con service_role: planes y pendientes no son públicos). */
export async function loadInventory(companyId: string): Promise<{ ok: true; data: InventoryData } | { ok: false; error: string }> {
  const a = await adminAccess();
  if (!a.ok) return a;
  if (!companyOk(a.own, companyId)) return { ok: false, error: 'Empresa no permitida' };
  const db = admin();

  const [plan, letters, rounds, pendings, emps] = await Promise.all([
    db.from('inventory_plans').select('*').eq('company_id', companyId).maybeSingle(),
    db.from('inventory_letters').select('*').eq('company_id', companyId).order('sort_order').order('code'),
    db.from('inventory_rounds').select('*').eq('company_id', companyId).order('opened_at', { ascending: false }).limit(12),
    db.from('inventory_pendings').select('*, inventory_sections(code)').eq('company_id', companyId)
      .is('resolved_at', null).order('reported_at', { ascending: false }),
    db.from('employees').select('id, name').eq('company_id', companyId),
  ]);
  const err = plan.error ?? letters.error ?? rounds.error ?? pendings.error ?? emps.error;
  if (err) return { ok: false, error: err.message };

  const roundList = (rounds.data ?? []) as InvRound[];
  const current = roundList.find(r => !r.closed_at) ?? roundList[0] ?? null;
  const currentIdx = current ? roundList.indexOf(current) : -1;
  const prevRound = currentIdx >= 0 ? roundList[currentIdx + 1] ?? null : null;

  let allSections: InvSection[] = [];
  if (roundList.length) {
    const { data, error } = await db.from('inventory_sections').select('*')
      .in('round_id', roundList.map(r => r.id)).order('sort_order');
    if (error) return { ok: false, error: error.message };
    allSections = (data ?? []) as InvSection[];
  }
  const url = (p: string | null) => (p ? db.storage.from(BUCKET).getPublicUrl(p).data.publicUrl : null);
  const withUrls = (s: InvSection): InvSection => ({
    ...s, shelf_photo: url(s.shelf_photo), report_photos: (s.report_photos ?? []).map(p => url(p) as string),
  });

  const sections = current ? allSections.filter(s => s.round_id === current.id).map(withUrls) : [];
  const previous: Record<string, InvSection> = {};
  if (prevRound) {
    for (const s of allSections) if (s.round_id === prevRound.id && s.letter_id) previous[s.letter_id] = withUrls(s);
  }

  const summaries: InvRoundSummary[] = roundList.map(r => {
    const mine = allSections.filter(s => s.round_id === r.id);
    return { ...r, total: mine.length, done: mine.filter(s => s.status === 'done').length };
  });

  const people: Record<string, string> = Object.fromEntries((emps.data ?? []).map(e => [e.id as string, e.name as string]));
  const counts = new Map<string, { current: number; total: number }>();
  for (const s of allSections) {
    if (s.status !== 'done' || !s.done_by) continue;
    const c = counts.get(s.done_by) ?? { current: 0, total: 0 };
    c.total += 1;
    if (current && s.round_id === current.id) c.current += 1;
    counts.set(s.done_by, c);
  }
  const perPerson = [...counts.entries()]
    .map(([id, c]) => ({ id, name: people[id] ?? 'Sin nombre', ...c }))
    .sort((x, y) => y.current - x.current || y.total - x.total || x.name.localeCompare(y.name));

  const pend: InvPending[] = (pendings.data ?? []).map((p: Record<string, unknown>) => {
    const sec = p.inventory_sections as { code?: string } | null;
    const { inventory_sections: _drop, ...rest } = p;
    return { ...(rest as unknown as Omit<InvPending, 'code'>), code: sec?.code ?? '?' };
  });

  return {
    ok: true,
    data: {
      plan: (plan.data ?? null) as InvPlan | null,
      letters: (letters.data ?? []) as InvLetter[],
      current, sections, previous, rounds: summaries, pendings: pend, people, perPerson,
    },
  };
}

export async function saveInventoryPlan(companyId: string, input: Record<string, unknown>): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  if (!companyOk(a.own, companyId)) return fail('Empresa no permitida');
  const every = Number(input.every_weeks);
  const amount = Number(input.due_amount);
  const unit = input.due_unit;
  if (!Number.isInteger(every) || every < 1 || every > 52) return fail('Cada cuántas semanas: un número de 1 a 52.');
  if (!validDate(input.first_open_date)) return fail('Escoge la fecha del primer inventario.');
  if (unit !== 'days' && unit !== 'weeks') return fail('El plazo va en días o en semanas.');
  if (!Number.isInteger(amount) || amount < 1 || amount > 60) return fail('El plazo: un número de 1 a 60.');
  if (dueDays({ due_amount: amount, due_unit: unit }) > every * 7) {
    return fail('El plazo no puede ser más largo que el tiempo entre un inventario y otro.');
  }
  const { error } = await admin().from('inventory_plans').upsert({
    company_id: companyId, every_weeks: every, first_open_date: input.first_open_date, due_amount: amount,
    due_unit: unit, is_active: input.is_active !== false, updated_at: new Date().toISOString(),
  }, { onConflict: 'company_id' });
  return error ? fail(error.message) : OK;
}

export async function addInventoryLetter(companyId: string, code: string, name: string): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  if (!companyOk(a.own, companyId)) return fail('Empresa no permitida');
  const c = cleanCode(code), n = cleanName(name);
  const chk = checkLetter(c, n);
  if (!chk.ok) return chk;
  const db = admin();
  const { data: last } = await db.from('inventory_letters').select('sort_order').eq('company_id', companyId)
    .order('sort_order', { ascending: false }).limit(1).maybeSingle();
  const { error } = await db.from('inventory_letters')
    .insert({ company_id: companyId, code: c, name: n || null, sort_order: ((last?.sort_order as number | undefined) ?? -1) + 1 });
  if (error?.code === '23505') return fail('Esa letra ya existe.');
  return error ? fail(error.message) : OK;
}

export async function updateInventoryLetter(id: string, code: string, name: string): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const own = await ownsRow('inventory_letters', id, a.own);
  if (!own.ok) return own;
  const c = cleanCode(code), n = cleanName(name);
  const chk = checkLetter(c, n);
  if (!chk.ok) return chk;
  const { error } = await admin().from('inventory_letters').update({ code: c, name: n || null }).eq('id', id);
  if (error?.code === '23505') return fail('Esa letra ya existe.');
  return error ? fail(error.message) : OK;
}

/** Sube (−1) o baja (+1) una letra en el orden. Renumera todas para que no queden empates. */
export async function moveInventoryLetter(id: string, dir: number): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const own = await ownsRow('inventory_letters', id, a.own);
  if (!own.ok) return own;
  if (dir !== -1 && dir !== 1) return fail('Movimiento no válido');
  const db = admin();
  const { data: me } = await db.from('inventory_letters').select('company_id').eq('id', id).single();
  const { data: list, error } = await db.from('inventory_letters').select('id')
    .eq('company_id', me!.company_id).order('sort_order').order('code');
  if (error) return fail(error.message);
  const ids = (list ?? []).map(l => l.id as string);
  const i = ids.indexOf(id), j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return OK;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  for (let k = 0; k < ids.length; k++) {
    const { error: e } = await db.from('inventory_letters').update({ sort_order: k }).eq('id', ids[k]);
    if (e) return fail(e.message);
  }
  return OK;
}

export async function setInventoryLetterActive(id: string, active: boolean): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const own = await ownsRow('inventory_letters', id, a.own);
  if (!own.ok) return own;
  const { error } = await admin().from('inventory_letters').update({ is_active: active === true }).eq('id', id);
  return error ? fail(error.message) : OK;
}

/** Las rondas guardan copia de la letra y su nombre, así que borrarla no cambia el historial. */
export async function deleteInventoryLetter(id: string): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const own = await ownsRow('inventory_letters', id, a.own);
  if (!own.ok) return own;
  const { error } = await admin().from('inventory_letters').delete().eq('id', id);
  return error ? fail(error.message) : OK;
}

export async function openInventoryRoundNow(companyId: string): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  if (!companyOk(a.own, companyId)) return fail('Empresa no permitida');
  const db = admin();
  const { data: plan } = await db.from('inventory_plans').select('*').eq('company_id', companyId).maybeSingle();
  if (!plan) return fail('Primero guarda la frecuencia y el plazo del inventario.');
  const { data: open } = await db.from('inventory_rounds').select('id').eq('company_id', companyId).is('closed_at', null).maybeSingle();
  if (open) return fail('Ya hay un inventario abierto.');
  const today = shopClock(new Date()).dateStr;
  const r = await openRound(db, companyId, {
    scheduledFor: null, dueAt: dueInstant(today, plan as InvPlan).toISOString(), openedBy: a.session.userId ?? 'admin',
  });
  return r.ok ? OK : fail(r.error);
}

/**
 * Regresa una letra hecha a pendiente con la nota del dueño. Si con eso la ronda ya estaba
 * terminada, se reabre (sólo la más reciente y si no hay otra abierta).
 */
export async function requestSectionRedo(sectionId: string, note: string): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const own = await ownsRow('inventory_sections', sectionId, a.own);
  if (!own.ok) return own;
  const text = String(note ?? '').trim();
  if (!text) return fail('Escribe qué hay que corregir.');
  if (text.length > 300) return fail('La nota es muy larga (máximo 300 letras).');
  const db = admin();
  const { data: sec } = await db.from('inventory_sections').select('id, round_id, company_id, status').eq('id', sectionId).single();
  if (!sec || sec.status !== 'done') return fail('Sólo se puede pedir rehacer una letra que ya está hecha.');
  const { data: round } = await db.from('inventory_rounds').select('id, closed_at, close_reason, opened_at').eq('id', sec.round_id).single();
  if (!round) return fail('No encontrado');

  if (round.closed_at) {
    const { data: newer } = await db.from('inventory_rounds').select('id').eq('company_id', sec.company_id)
      .gt('opened_at', round.opened_at).limit(1);
    const { data: other } = await db.from('inventory_rounds').select('id').eq('company_id', sec.company_id).is('closed_at', null).limit(1);
    if (round.close_reason !== 'completed' || newer?.length || other?.length) {
      return fail('Ese inventario ya se cerró y hay uno más nuevo.');
    }
    const { error: re } = await db.from('inventory_rounds').update({ closed_at: null, close_reason: null }).eq('id', round.id);
    if (re) return fail(re.message);
  }

  const { error } = await db.from('inventory_sections').update({
    status: 'pending', claimed_by: null, claimed_at: null, redo_note: text, redo_requested_at: new Date().toISOString(),
  }).eq('id', sectionId);
  if (error) return fail(error.message);
  await db.from('inventory_pendings').delete().eq('section_id', sectionId).is('resolved_at', null);
  return OK;
}

export async function resolveInventoryPending(id: string, note: string): Promise<Result> {
  const a = await adminAccess();
  if (!a.ok) return a;
  const own = await ownsRow('inventory_pendings', id, a.own);
  if (!own.ok) return own;
  const text = String(note ?? '').trim();
  if (text.length > 300) return fail('La nota es muy larga (máximo 300 letras).');
  const { error } = await admin().from('inventory_pendings').update({
    resolved_at: new Date().toISOString(), resolved_by: a.session.name ?? 'Administrador', resolution_note: text || null,
  }).eq('id', id).is('resolved_at', null);
  return error ? fail(error.message) : OK;
}

/** Para el numerito del menú. 0 si no se puede ver. */
export async function inventoryPendingCount(companyId: string): Promise<number> {
  const a = await adminAccess();
  if (!a.ok || !companyOk(a.own, companyId)) return 0;
  const { count } = await admin().from('inventory_pendings').select('id', { count: 'exact', head: true })
    .eq('company_id', companyId).is('resolved_at', null);
  return count ?? 0;
}
