'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import AdminShell, { CAP_BADGE_EVENT } from '@/components/AdminShell';
import Matrix from '@/components/capacitaciones/Matrix';
import DoubtList from '@/components/capacitaciones/DoubtList';
import TrainingSettings from '@/components/capacitaciones/TrainingSettings';
import { useCompany } from '@/lib/company-context';
import { openDoubts, type CapRow } from '@/lib/capacitaciones/status';
import { friendlyLoadError, tabFromSearch, tabHref, type CapTab } from '@/lib/capacitaciones/admin-view';
import { titleCase } from '@/lib/checklist-mail';
import s from '@/components/panel/panel.module.css';
import v from '@/components/capacitaciones/capacitaciones.module.css';
import { loadTrainingAdmin, markTrained, moveTraining, saveTraining, type LoadResult, type TrainingConfig } from './actions';

const TABS: { key: CapTab; label: string }[] = [
  { key: 'avance', label: 'Avance' },
  { key: 'capacitar', label: 'Por capacitar' },
  { key: 'ajustes', label: 'Ajustes' },
];
const tabId = (t: CapTab) => `cap-tab-${t}`;
const focusTab = (t: CapTab) => requestAnimationFrame(() => document.getElementById(tabId(t))?.focus());

interface PageData { companyId: string; trainings: TrainingConfig[]; rows: CapRow[]; canEdit: boolean }

/** Capacitación: quién vio cada proceso (Avance), las dudas que esperan (Por capacitar) y Ajustes (supabase/011). */
export default function CapacitacionesPage() {
  const { current: company, companies, loading: companyLoading } = useCompany();
  const companyId = company?.id ?? null;
  const [data, setData] = useState<PageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<CapTab>('avance');
  const [flash, setFlash] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  // Cada carga lleva un número: si llega tarde una respuesta vieja (otra empresa, o una carga anterior), no pisa la nueva.
  const seq = useRef(0);

  // La pestaña sale de ?tab= (la vista previa regresa a /capacitaciones?tab=ajustes).
  useEffect(() => { setTab(tabFromSearch(window.location.search)); }, []);

  const load = useCallback(async () => {
    if (!companyId) return;
    const n = ++seq.current;
    let r: LoadResult;
    try { r = await loadTrainingAdmin(companyId); }
    catch { r = { ok: false, error: 'No se pudo cargar. Revisa la conexión y vuelve a intentar.' }; }
    if (n !== seq.current) return;
    setNow(new Date());
    if (!r.ok) { setError(r.error); return; }
    setError(null);
    setData({ companyId, trainings: r.trainings, rows: r.rows, canEdit: r.canEdit });
  }, [companyId]);

  // Al cambiar de empresa en el selector se vuelve a cargar (la tabla es de una sola empresa).
  useEffect(() => { setData(null); setError(null); setFlash(null); load(); }, [load]);

  // Sólo lo de la empresa que está escogida (mientras llega la otra, no se enseña la anterior).
  const current = data && data.companyId === companyId ? data : null;
  const rows = useMemo(() => current?.rows ?? [], [current]);
  const doubts = useMemo(() => openDoubts(rows), [rows]);
  const names = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c.name])), [companies]);
  const noneActive = !!current && !current.trainings.some(t => t.is_active);

  function choose(t: CapTab) {
    setTab(t);
    setFlash(null);
    window.history.replaceState(null, '', tabHref(window.location.pathname, t));
  }

  // Flechas izquierda/derecha entre pestañas (patrón de pestañas de ARIA).
  function onTabKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const i = TABS.findIndex(x => x.key === tab);
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
    choose(TABS[j].key);
    document.getElementById(tabId(TABS[j].key))?.focus();
  }

  async function done(trainingId: string, employeeId: string) {
    const row = rows.find(r => r.training_id === trainingId && r.employee_id === employeeId);
    const r = await markTrained(trainingId, employeeId);
    if (r.ok) setFlash(row ? `Listo. Le explicaste ${row.title} a ${titleCase(row.employee_name)}.` : 'Listo.');
    // También si falló (p. ej. "Esa duda ya no está abierta": alguien más la cerró): la lista y el numerito del menú se ponen al día.
    await load();
    window.dispatchEvent(new Event(CAP_BADGE_EVENT));
    return r;
  }

  async function save(id: string, patch: { is_active?: boolean; deadline_days?: number; min_seconds?: number }) {
    const t = current?.trainings.find(x => x.id === id);
    const r = await saveTraining(id, patch);
    if (r.ok) {
      if (t && patch.is_active === true) setFlash(`Activaste ${t.title}. El aviso les llega a los teléfonos en unos minutos (los avisos salen de 9:00 a 19:00).`);
      else if (t && patch.is_active === false) setFlash(`Pausaste ${t.title}.`);
      await load();
    }
    return r;
  }

  async function move(id: string, dir: -1 | 1) {
    const r = await moveTraining(id, dir);
    if (r.ok) await load();
    return r;
  }

  const fe = error ? friendlyLoadError(error) : null;

  return (
    <AdminShell>
      <div className={s.page}>
        <header className={s.top}>
          <div>
            <div className={s.eyebrow}><i />{company?.name ?? 'Actividades'} · Capacitación</div>
            <h1 className={s.title}>Capacitación</h1>
            <div className={s.sub}>Quién ya vio cada proceso y quién necesita que se lo expliques.</div>
          </div>
        </header>

        <div className={s.content}>
          <div className={v.tabs} role="tablist" aria-label="Secciones de Capacitación" onKeyDown={onTabKey}>
            {TABS.map(t => (
              <button key={t.key} id={tabId(t.key)} type="button" role="tab" className={v.tab}
                aria-selected={tab === t.key} aria-controls="cap-panel" tabIndex={tab === t.key ? 0 : -1}
                onClick={() => choose(t.key)}>
                {t.label}
                {t.key === 'capacitar' && doubts.length > 0 && (
                  <><span className={v.badge} aria-hidden>{doubts.length}</span><span className={v.sr}> ({doubts.length} pendientes)</span></>
                )}
              </button>
            ))}
          </div>

          {flash && <div className={v.flash} role="status">{flash}</div>}
          {fe && (
            <div className={v.errBox} role="alert">
              <span>{fe.text}</span>
              {fe.detail && <small>{fe.detail}</small>}
              <button type="button" className={v.btn} onClick={() => { setError(null); load(); }}>Reintentar</button>
            </div>
          )}

          <div id="cap-panel" role="tabpanel" aria-labelledby={tabId(tab)}>
            {!company ? (
              companyLoading ? <p className={s.loading}>Cargando…</p> : <p className={s.foot}>Escoge una empresa en el menú.</p>
            ) : !current ? (
              !error && <p className={s.loading}>Cargando…</p>
            ) : tab === 'avance' ? (
              noneActive ? (
                <div className={`${s.card} ${v.notice}`}>
                  <p>Todavía no hay capacitaciones activas. Préndelas en Ajustes.</p>
                  <button type="button" className={`${v.btn} ${v.dark}`} onClick={() => { choose('ajustes'); focusTab('ajustes'); }}>Ir a Ajustes</button>
                </div>
              ) : rows.length === 0 ? (
                <div className={v.empty}>No hay personas activas en {company.name}.</div>
              ) : (
                <Matrix rows={rows} companyNames={names} now={now} />
              )
            ) : tab === 'capacitar' ? (
              <DoubtList rows={doubts} now={now} onDone={done} focusWhenEmpty={() => focusTab('capacitar')} />
            ) : (
              <TrainingSettings trainings={current.trainings} canEdit={current.canEdit} onSave={save} onMove={move} />
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
