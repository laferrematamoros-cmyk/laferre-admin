'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/lib/company-context';
import { loadActivities, type LiveActivity } from '@/lib/load-activities';
import { dutyOn } from '@/lib/duty';
import { shopClock } from '@/lib/my-day';
import { archiveActivity, restoreActivity, setActivityActive, type Result } from './actions';
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
  const [taskCount, setTaskCount] = useState<Map<string, number>>(new Map());
  const today = shopClock(new Date()).dateStr;
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!company) return;
    try {
      // Con el día de hoy: a las de lista les trae su rol y sus cambios (para decir a quién le toca).
      const [acts, emps] = await Promise.all([
        loadActivities(supabase, company.id, { from: today, to: today }),
        supabase.from('employees').select('id, name, is_active').eq('company_id', company.id),
      ]);
      const listIds = acts.filter(x => x.checklist_enabled).map(x => x.id);
      const items = listIds.length
        ? await supabase.from('checklist_items').select('activity_id').is('archived_at', null).in('activity_id', listIds)
        : { data: [] as { activity_id: string }[] };
      const counts = new Map<string, number>();
      for (const r of (items.data ?? []) as { activity_id: string }[]) counts.set(r.activity_id, (counts.get(r.activity_id) ?? 0) + 1);
      setTaskCount(counts);
      setList(acts);
      setNames(new Map((emps.data ?? []).map((e: { id: string; name: string; is_active: boolean }) => [e.id, e.is_active ? e.name : `${e.name} (baja)`])));
    } catch (e) {
      setError(friendly(e));
    }
  }, [company, today]);

  useEffect(() => { load(); }, [load]);

  async function run(id: string, fn: () => Promise<Result>) {
    setBusy(id);
    setError(null);
    try {
      const r = await fn();
      if (!r.ok) setError(friendly(r.error));
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
                // Lista con firma: la hace el de turno del rol (no "General") y pide fotos por tarea.
                const duty = x.checklist_enabled ? dutyOn(x.rotations, x.overrides, today) : null;
                const tasks = taskCount.get(x.id) ?? 0;
                const paused = isPaused(x);
                return (
                  <article key={x.id} className={`${s.card} ${a.item} ${paused ? a.paused : ''}`}>
                    <div className={a.time}><b>{x.start_time.slice(0, 5)}</b><small>a {x.limit_time.slice(0, 5)}</small></div>
                    <div className={a.main}>
                      <div className={a.titleRow}>
                        <b>{x.title}</b>
                        {x.is_urgent && <span className={`${a.chip} ${a.chipUrgent}`}>Urgente</span>}
                        {paused && <span className={`${a.chip} ${a.chipPaused}`}>Pausada</span>}
                        {x.is_optional && <span className={`${a.chip} ${a.chipOptional}`} title="Si no se hace, no cuenta en tus reportes. Los empleados la ven como cualquier otra.">Opcional</span>}
                      </div>
                      {x.description && <p className={a.desc}>{x.description}</p>}
                      <div className={a.meta}>
                        <span className={a.days} aria-label={`Días: ${WEEK.filter(d => x.days_of_week.includes(d)).map(d => DAY_NAME[d]).join(', ')}`}>
                          {WEEK.map(d => (
                            <span key={d} className={`${a.day} ${x.days_of_week.includes(d) ? a.dayOn : ''}`} title={DAY_NAME[d]} aria-hidden>{LETTER[d]}</span>
                          ))}
                        </span>
                        {isMonthly(x) && <span className={`${a.chip} ${a.chipMonth}`}>{monthText(x.week_of_month!)}</span>}
                        {x.checklist_enabled
                          ? <span className={a.chip}><IconUsers size={13} />{duty ? `Esta semana: ${names.get(duty) ?? 'Empleado borrado'}` : 'Sin rol'}</span>
                          : who
                          ? <span className={a.chip}><IconUsers size={13} />{who}</span>
                          : <span className={`${a.chip} ${a.chipGeneral}`}>General</span>}
                        {x.reminder_minutes ? <span className={a.chip}><IconBell size={13} />Avisa cada {x.reminder_minutes} min</span> : null}
                        {x.checklist_enabled
                          ? <span className={a.chip}><IconCamera size={13} />Lista · {tasks} {tasks === 1 ? 'tarea' : 'tareas'}</span>
                          : ev && <span className={a.chip}><IconCamera size={13} />{ev}</span>}
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
