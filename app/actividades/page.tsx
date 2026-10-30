'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/lib/company-context';
import { loadActivities, type LiveActivity } from '@/lib/load-activities';
import { archiveActivity, restoreActivity, setActivityActive } from './actions';
import { IconBell, IconCamera, IconChevronDown, IconPlus, IconUsers } from '@/components/panel/icons';
import s from '@/components/panel/panel.module.css';
import a from '@/components/actividades/act.module.css';

const WEEK = [1, 2, 3, 4, 5, 6, 0];                     // lunes a domingo
const LETTER = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const DAY_NAME = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const isMonthly = (x: LiveActivity) => x.week_of_month != null;
const isPaused = (x: LiveActivity) => !x.is_active && !isMonthly(x);

function monthText(w: number): string {
  return w === -1 ? 'Sólo la última semana del mes' : `Sólo la ${w}ª semana del mes`;
}

/** La app de empleados sólo pide foto (nombre/nota/firma existen en la base pero no se usan). */
function evidenceText(x: LiveActivity): string | null {
  return x.evidence_photo ? 'Pide foto' : null;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Mensaje claro si falta correr el SQL del historial. */
function friendly(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/archived_at|activity_pauses/.test(m)) {
    return 'Falta correr en Supabase el archivo supabase/005_historial_actividades.sql. Mientras tanto no se puede archivar ni guardar el historial de pausas.';
  }
  return m;
}

export default function ActividadesPage() {
  const router = useRouter();
  const { current: company } = useCompany();
  const [list, setList] = useState<LiveActivity[] | null>(null);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!company) return;
    try {
      const [acts, emps] = await Promise.all([
        loadActivities(supabase, company.id),
        supabase.from('employees').select('id, name, is_active').eq('company_id', company.id),
      ]);
      setList(acts);
      setNames(new Map((emps.data ?? []).map((e: { id: string; name: string; is_active: boolean }) => [e.id, e.is_active ? e.name : `${e.name} (baja)`])));
    } catch (e) {
      setError(friendly(e));
    }
  }, [company]);

  useEffect(() => { load(); }, [load]);

  async function run(id: string, fn: () => Promise<void>) {
    setBusy(id);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(friendly(e));
    }
    await load();
    setBusy(null);
    setConfirmId(null);
  }

  const live = (list ?? []).filter(x => !x.archived_at);
  const archived = (list ?? []).filter(x => x.archived_at);
  const pausedCount = live.filter(isPaused).length;

  return (
    <AdminShell>
      <div className={s.page}>
        <header className={s.top}>
          <div>
            <div className={s.eyebrow}><i />{company?.name ?? 'Actividades'} · Actividades</div>
            <h1 className={s.title}>Actividades</h1>
            <div className={s.sub}>
              {list
                ? `${live.length} actividad${live.length === 1 ? '' : 'es'} · ${live.length - pausedCount} activa${live.length - pausedCount === 1 ? '' : 's'}${pausedCount ? ` · ${pausedCount} pausada${pausedCount === 1 ? '' : 's'}` : ''}`
                : 'Cargando…'}
            </div>
          </div>
          <div className={s.tools}>
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => router.push('/actividades/nueva')}>
              <IconPlus />Nueva actividad
            </button>
          </div>
        </header>

        <div className={s.content}>
          {error && <div className={s.error}>{error}</div>}

          {!list ? (
            !error && <p className={s.loading}>Cargando actividades…</p>
          ) : live.length === 0 ? (
            <section className={`${s.card} ${a.empty}`}>
              <b>Todavía no hay actividades</b>
              <p>Crea la primera y aparecerá en la app de los empleados en sus días y horario.</p>
              <button type="button" className={`${a.btn} ${a.dark}`} onClick={() => router.push('/actividades/nueva')}><IconPlus />Nueva actividad</button>
            </section>
          ) : (
            <div className={a.list}>
              {live.map(x => {
                const who = x.assigned_employee_ids.length ? x.assigned_employee_ids.map(id => names.get(id) ?? 'Empleado borrado').join(', ') : null;
                const ev = evidenceText(x);
                const paused = isPaused(x);
                return (
                  <article key={x.id} className={`${s.card} ${a.item} ${paused ? a.paused : ''}`}>
                    <div className={a.time}><b>{x.start_time.slice(0, 5)}</b><small>a {x.limit_time.slice(0, 5)}</small></div>
                    <div className={a.main}>
                      <div className={a.titleRow}>
                        <b>{x.title}</b>
                        {x.is_urgent && <span className={`${a.chip} ${a.chipUrgent}`}>Urgente</span>}
                        {paused && <span className={`${a.chip} ${a.chipPaused}`}>Pausada</span>}
                      </div>
                      {x.description && <p className={a.desc}>{x.description}</p>}
                      <div className={a.meta}>
                        <span className={a.days} aria-label={`Días: ${WEEK.filter(d => x.days_of_week.includes(d)).map(d => DAY_NAME[d]).join(', ')}`}>
                          {WEEK.map(d => (
                            <span key={d} className={`${a.day} ${x.days_of_week.includes(d) ? a.dayOn : ''}`} title={DAY_NAME[d]} aria-hidden>{LETTER[d]}</span>
                          ))}
                        </span>
                        {isMonthly(x) && <span className={`${a.chip} ${a.chipMonth}`}>{monthText(x.week_of_month!)}</span>}
                        {who
                          ? <span className={a.chip}><IconUsers size={13} />{who}</span>
                          : <span className={`${a.chip} ${a.chipGeneral}`}>General</span>}
                        {x.reminder_minutes ? <span className={a.chip}><IconBell size={13} />Avisa cada {x.reminder_minutes} min</span> : null}
                        {ev && <span className={a.chip}><IconCamera size={13} />{ev}</span>}
                      </div>
                    </div>
                    <div className={a.actions}>
                      <button type="button" className={`${a.btn} ${a.dark}`} onClick={() => router.push(`/actividades/${x.id}`)}>Editar</button>
                      {!isMonthly(x) && (
                        <button type="button" className={a.btn} disabled={busy === x.id} onClick={() => run(x.id, () => setActivityActive(x.id, paused))}>
                          {busy === x.id && confirmId !== x.id ? '…' : paused ? 'Reanudar' : 'Pausar'}
                        </button>
                      )}
                      <button type="button" className={`${a.btn} ${a.danger}`} onClick={() => setConfirmId(confirmId === x.id ? null : x.id)}>Archivar</button>
                    </div>
                    {confirmId === x.id && (
                      <div className={a.confirm} role="alert">
                        <p>
                          <b>¿Archivar «{x.title}»?</b> Deja de aparecer en la app de los empleados y en esta lista.
                          Sus registros y los reportes pasados se conservan, y la puedes restaurar cuando quieras.
                        </p>
                        <div className={a.confirmBtns}>
                          <button type="button" className={`${a.btn} ${a.dark}`} disabled={busy === x.id} onClick={() => run(x.id, () => archiveActivity(x.id))}>
                            {busy === x.id ? 'Archivando…' : 'Sí, archivar'}
                          </button>
                          <button type="button" className={a.btn} onClick={() => setConfirmId(null)}>Cancelar</button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {archived.length > 0 && (
            <section className={s.card}>
              <button type="button" className={a.archToggle} aria-expanded={showArchived} onClick={() => setShowArchived(v => !v)}>
                <span>Archivadas ({archived.length}) <small>· siguen contando en los reportes pasados</small></span>
                <IconChevronDown />
              </button>
              {showArchived && archived.map(x => (
                <div key={x.id} className={a.archRow}>
                  <div>
                    <b>{x.title}</b>
                    <small>Archivada el {shortDate(x.archived_at!)} · {x.start_time.slice(0, 5)} a {x.limit_time.slice(0, 5)}</small>
                  </div>
                  <button type="button" className={a.btn} disabled={busy === x.id} onClick={() => run(x.id, () => restoreActivity(x.id))}>
                    {busy === x.id ? 'Restaurando…' : 'Restaurar'}
                  </button>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
