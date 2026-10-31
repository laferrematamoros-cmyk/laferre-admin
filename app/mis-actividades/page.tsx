'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import AdminShell from '@/components/AdminShell';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/lib/company-context';
import { useSession } from '@/lib/session-context';
import { loadActivities, type LiveActivity } from '@/lib/load-activities';
import { toDateStr, type ReportEmployee } from '@/lib/reports';
import { buildDay, TODAY_LABEL, type TodayCompletion, type TodayRow, type TodayStatus } from '@/lib/today';
import { groupMine, mine, niceName } from '@/lib/my-day';
import { safeHttps } from '@/lib/safe-url';
import { fmtMin } from '@/components/hoy/look';
import { IconCamera, IconCheck } from '@/components/panel/icons';
import DoneSheet from '@/components/mis/DoneSheet';
import s from '@/components/panel/panel.module.css';
import m from '@/components/mis/mis.module.css';

/** Color de cada estado (mismos que Dashboard y Reportes). */
const TONE: Record<TodayStatus, { edge: string; bg: string; ink: string }> = {
  overdue:  { edge: 'var(--st-miss)', bg: 'var(--st-miss-soft)', ink: 'var(--st-miss-ink)' },
  running:  { edge: 'var(--st-run)',  bg: 'var(--st-run-soft)',  ink: 'var(--st-run-ink)' },
  upcoming: { edge: 'var(--st-todo)', bg: '#F0F0F3',             ink: '#55555B' },
  done:     { edge: 'var(--st-ok)',   bg: 'var(--st-ok-soft)',   ink: 'var(--st-ok-ink)' },
  doneLate: { edge: 'var(--st-late)', bg: 'var(--st-late-soft)', ink: 'var(--st-late-ink)' },
};
const BAR_ORDER: TodayStatus[] = ['done', 'doneLate', 'overdue', 'running', 'upcoming'];

interface Toast { title: string; body: string; tone: 'info' | 'ok' | 'warn' | 'alert' }
interface Day { date: string; acts: LiveActivity[]; comps: TodayCompletion[]; emps: ReportEmployee[] }

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

/** Para la leyenda: "1 hecha", "5 hechas", "2 por hacer". */
const COUNT_LABEL: Record<TodayStatus, [string, string]> = {
  done: ['hecha', 'hechas'], doneLate: ['hecha tarde', 'hechas tarde'], overdue: ['atrasada', 'atrasadas'],
  running: ['en curso', 'en curso'], upcoming: ['por hacer', 'por hacer'],
};

function pillText(r: TodayRow, nowMin: number): string {
  if (r.status === 'overdue' && r.minutesLate !== null) return `Atrasada · ${fmtMin(r.minutesLate)}`;
  if (r.status === 'running' && r.minutesLeft !== null) return `Faltan ${fmtMin(r.minutesLeft)}`;
  if (r.status === 'upcoming' && r.startMin > nowMin) return `Empieza en ${fmtMin(r.startMin - nowMin)}`;
  return TODAY_LABEL[r.status];
}

/** Pitido corto (normal) o tres secos (urgente). Si el navegador no deja sonar, nada. */
function beep(urgent: boolean) {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const tone = (f: number, at: number, dur: number, type: OscillatorType = 'sine') => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.connect(g); g.connect(ctx.destination);
      o.frequency.setValueAtTime(f, at);
      g.gain.setValueAtTime(0.3, at);
      g.gain.exponentialRampToValueAtTime(0.001, at + dur);
      o.start(at); o.stop(at + dur);
    };
    if (urgent) [0, 0.2, 0.4].forEach((t, i) => tone(440, ctx.currentTime + t, i === 2 ? 0.25 : 0.15, 'square'));
    else [440, 554, 659, 554, 659, 880].forEach((f, i) => tone(f, ctx.currentTime + i * 0.09, 0.09));
  } catch { /* audio bloqueado */ }
}

export default function MisActividadesPage() {
  const { current: company } = useCompany();
  const { employeeId, loading: sessionLoading } = useSession();
  const [day, setDay] = useState<Day | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [open, setOpen] = useState<TodayRow | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const shown = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!company || !employeeId) return;
    try {
      const today = new Date();
      const [acts, emps] = await Promise.all([
        loadActivities(supabase, company.id),
        supabase.from('employees').select('id, name, initials').eq('company_id', company.id).eq('is_active', true),
      ]);
      if (emps.error) throw new Error(emps.error.message);
      const ids = acts.map(a => a.id);
      let comps: TodayCompletion[] = [];
      if (ids.length) {
        const c = await supabase.from('completions')
          .select('activity_id, employee_id, scheduled_date, was_late, completed_at, photo_url, note')
          .eq('scheduled_date', toDateStr(today)).in('activity_id', ids).order('completed_at');
        if (c.error) throw new Error(c.error.message);
        comps = (c.data ?? []) as TodayCompletion[];
      }
      setDay({ date: toDateStr(today), acts, comps, emps: (emps.data ?? []) as ReportEmployee[] });
      setNow(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar tus actividades.');
    }
  }, [company, employeeId]);

  useEffect(() => { if (!sessionLoading) load(); }, [sessionLoading, load]);

  // Reloj de la pantalla cada 30 s; datos cada 20 s (por si la marcan en otro teléfono)
  // y de nuevo al cambiar de día.
  useEffect(() => {
    const t = setInterval(() => {
      const n = new Date();
      setNow(n);
      if (day && toDateStr(n) !== day.date) load();
    }, 30_000);
    return () => clearInterval(t);
  }, [day, load]);
  useEffect(() => {
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [load]);

  const view = useMemo(() => {
    if (!day || !employeeId) return null;
    const rows = mine(buildDay(new Date(`${day.date}T00:00:00`), day.acts, day.comps, day.emps, now).rows, employeeId);
    const photo = new Map(day.acts.map(a => [a.id, !!a.evidence_photo]));
    const me = day.emps.find(e => e.id === employeeId);
    const counts = { done: 0, doneLate: 0, running: 0, upcoming: 0, overdue: 0 } as Record<TodayStatus, number>;
    rows.forEach(r => counts[r.status]++);
    return { rows, ...groupMine(rows), photo, me, counts };
  }, [day, now, employeeId]);

  // Avisos: empieza, llega a la hora límite y cada 15 min de retraso (una vez cada uno).
  useEffect(() => {
    if (!view) return;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    for (const r of [...view.now, ...view.later]) {
      const fire = (key: string, body: string, urgent: boolean) => {
        if (shown.current.has(key)) return false;
        shown.current.add(key);
        setToast({ title: r.title, body, tone: urgent ? 'alert' : 'info' });
        beep(urgent);
        return true;
      };
      if (nowMin >= r.startMin && nowMin < r.startMin + 2) { if (fire(`${r.id}-s`, `Empieza ahora · límite ${r.limit}`, false)) break; }
      else if (nowMin >= r.limitMin && nowMin < r.limitMin + 2) { if (fire(`${r.id}-l`, `Llegó la hora límite (${r.limit}) y no está hecha`, true)) break; }
      else if (nowMin > r.limitMin) {
        const late = nowMin - r.limitMin;
        if (late >= 15 && late % 15 < 2) { if (fire(`${r.id}-t${Math.floor(late / 15)}`, `Lleva ${fmtMin(late)} de retraso`, true)) break; }
      }
    }
  }, [view, now]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5500);
    return () => clearTimeout(t);
  }, [toast]);

  const total = view?.rows.length ?? 0;
  const doneN = view ? view.counts.done + view.counts.doneLate : 0;
  const next = view ? view.now[0] ?? view.later[0] ?? null : null;
  const dateLabel = now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  function card(r: TodayRow) {
    const tone = TONE[r.status];
    const needs = view?.photo.get(r.id);
    return (
      <article key={r.id} className={`${s.card} ${m.act}`} style={{ '--edge': r.status === 'upcoming' ? 'transparent' : tone.edge } as CSSProperties}>
        <div className={m.actTop}>
          <span className={m.time}>{r.start} – {r.limit}</span>
          <span className={m.pill} style={{ background: tone.bg, color: tone.ink }}>{pillText(r, now.getHours() * 60 + now.getMinutes())}</span>
        </div>
        <h3 className={m.actTitle}>{r.title}</h3>
        {r.description && <p className={m.desc}>{r.description}</p>}
        <div className={m.chips}>
          <span className={`${m.chip} ${r.general ? '' : m.chipMine}`}>{r.general ? 'General' : 'A tu nombre'}</span>
          {needs && <span className={m.chip}><IconCamera size={13} />Pide foto</span>}
        </div>
        <button type="button" className={`${m.doBtn} ${r.status === 'overdue' ? m.doLate : ''}`} onClick={() => setOpen(r)}>
          <IconCheck size={13} />Marcar como hecha
        </button>
      </article>
    );
  }

  return (
    <AdminShell>
      <div className={s.page}>
        {toast && (
          <div className={`${m.toast} ${m[`t${toast.tone[0].toUpperCase()}${toast.tone.slice(1)}`]}`} role="status" aria-live="polite">
            <b>{toast.title}</b><span>{toast.body}</span>
          </div>
        )}

        <header className={s.top}>
          <div>
            <div className={s.eyebrow}><i />{company?.name ?? 'Actividades'} · Mis actividades</div>
            <h1 className={s.title}>{view?.me ? `Hola, ${niceName(view.me.name)}` : 'Mis actividades'}</h1>
            <div className={s.sub} suppressHydrationWarning>{dateLabel[0].toUpperCase() + dateLabel.slice(1)}</div>
          </div>
        </header>

        <div className={s.content}>
          {error && <div className={s.error}>{error}</div>}

          {sessionLoading || (employeeId && company && !day && !error) ? (
            <p className={s.loading}>Cargando tus actividades…</p>
          ) : !employeeId ? (
            <div className={`${s.card} ${m.empty}`}>
              <b>Todavía no estás vinculado a un empleado</b>
              <p>Pídele a un administrador que te vincule en <b>Ajustes → Usuarios del panel</b> (&ldquo;Hace actividades como&rdquo;). Después de eso, aquí verás lo que te toca hoy y podrás marcarlo como hecho.</p>
            </div>
          ) : !company ? (
            <div className={`${s.card} ${m.empty}`}><b>Escoge una empresa en el menú</b></div>
          ) : view && total === 0 ? (
            <div className={`${s.card} ${m.empty}`}>
              <b>Hoy no tienes actividades</b>
              <p>No hay actividades generales ni a tu nombre para hoy.</p>
            </div>
          ) : view && (
            <>
              <section className={`${s.card} ${m.hero}`}>
                <div>
                  <div className={m.count}><b>{doneN}</b><span>de {total}</span></div>
                  <div className={m.countLbl}>hechas hoy</div>
                </div>
                <div className={m.heroMain}>
                  <div className={m.bar} role="img" aria-label={`${doneN} de ${total} hechas`}>
                    {BAR_ORDER.filter(k => view.counts[k] > 0).map(k => (
                      <i key={k} style={{ width: `${(view.counts[k] / total) * 100}%`, background: TONE[k].edge }} />
                    ))}
                  </div>
                  <div className={m.legend}>
                    {BAR_ORDER.filter(k => view.counts[k] > 0).map(k => (
                      <span key={k}><i style={{ background: TONE[k].edge }} />{view.counts[k]} {COUNT_LABEL[k][view.counts[k] === 1 ? 0 : 1]}</span>
                    ))}
                  </div>
                  {doneN === total ? (
                    <p className={m.allDone}>¡Terminaste todo lo de hoy!</p>
                  ) : next && (
                    <p className={m.next}>
                      {next.status === 'overdue'
                        ? <>Lo primero: <b>{next.title}</b>, que lleva {fmtMin(next.minutesLate ?? 0)} de retraso.</>
                        : next.status === 'running'
                          ? <>Ahora toca <b>{next.title}</b>: faltan {fmtMin(next.minutesLeft ?? 0)} para el límite ({next.limit}).</>
                          : <>Lo que sigue: <b>{next.title}</b> a las {next.start}.</>}
                    </p>
                  )}
                </div>
              </section>

              {view.now.length > 0 && (
                <section className={m.block}>
                  <p className={m.secLbl}>Ahora ({view.now.length})</p>
                  <div className={m.list}>{view.now.map(card)}</div>
                </section>
              )}

              {view.later.length > 0 && (
                <section className={m.block}>
                  <p className={m.secLbl}>Más tarde ({view.later.length})</p>
                  <div className={m.list}>{view.later.map(card)}</div>
                </section>
              )}

              {view.done.length > 0 && (
                <section className={m.block}>
                  <p className={m.secLbl}>Hechas ({view.done.length})</p>
                  <div className={s.card}>
                    <div className={m.doneList}>
                      {view.done.map(r => {
                        const tone = TONE[r.status];
                        const photo = safeHttps(r.completion?.photo_url);
                        return (
                          <div key={r.id} className={m.doneRow}>
                            <span className={m.tick} style={{ background: tone.bg, color: tone.ink }}><IconCheck size={13} /></span>
                            <div>
                              <b>{r.title}</b>
                              <small>
                                {r.completion ? `${r.status === 'doneLate' ? 'Hecha tarde' : 'Hecha'} a las ${hhmm(r.completion.completed_at)}` : 'Hecha'}
                                {r.doneBy ? ` · ${niceName(r.doneBy)}` : ''}
                              </small>
                            </div>
                            {photo && (
                              <a className={m.photoLink} href={photo} target="_blank" rel="noopener noreferrer"><IconCamera size={14} />Foto</a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {open && (
          <DoneSheet
            row={open}
            needsPhoto={!!view?.photo.get(open.id)}
            onClose={() => setOpen(null)}
            onDone={r => {
              setOpen(null);
              setToast({
                title: open.title,
                body: r.wasLate ? `Quedó como hecha tarde (${hhmm(r.at)}).` : `¡Listo! Quedó hecha a las ${hhmm(r.at)}.`,
                tone: r.wasLate ? 'warn' : 'ok',
              });
              load();
            }}
          />
        )}
      </div>
    </AdminShell>
  );
}
