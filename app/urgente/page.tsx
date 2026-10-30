'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/lib/company-context';
import { IconAlert, IconCheck } from '@/components/panel/icons';
import s from '@/components/panel/panel.module.css';
import u from '@/components/urgente/urg.module.css';
import { createUrgentAlert, deactivateUrgentAlert, deleteUrgentAlert, type Result } from './actions';

interface Ack { alert_id: string; employee_id: string | null; employee_name: string; seen_at: string; }
interface Alarm { id: string; title: string; created_at: string; is_active: boolean; acks: Ack[]; }

/** Mientras haya una alarma sonando, la pantalla se actualiza sola cada 15 s. */
const LIVE_MS = 15_000;

function ago(iso: string, now: number): string {
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (m < 1) return 'hace un momento';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h${m % 60 ? ` ${m % 60} min` : ''}`;
  return `el ${new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}`;
}
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

/** Una confirmación por persona (la primera). */
function uniqueAcks(acks: Ack[]): Ack[] {
  const seen = new Set<string>();
  return acks.filter(k => {
    const key = k.employee_id ?? k.employee_name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function UrgentePage() {
  const { current: company } = useCompany();
  const [alarms, setAlarms] = useState<Alarm[] | null>(null);
  const [team, setTeam] = useState<{ id: string; name: string }[]>([]);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!company) return;
    const [a, e] = await Promise.all([
      supabase.from('urgent_alerts').select('id, title, created_at, is_active')
        .eq('company_id', company.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('employees').select('id, name').eq('company_id', company.id).eq('is_active', true).order('name'),
    ]);
    if (a.error) { setError(a.error.message); return; }
    const rows = (a.data ?? []) as Omit<Alarm, 'acks'>[];
    let acks: Ack[] = [];
    if (rows.length) {
      // Una sola consulta para todas (antes era una por alarma).
      const k = await supabase.from('urgent_alert_acks').select('alert_id, employee_id, employee_name, seen_at')
        .in('alert_id', rows.map(r => r.id)).order('seen_at');
      acks = (k.data ?? []) as Ack[];
    }
    setAlarms(rows.map(r => ({ ...r, acks: acks.filter(x => x.alert_id === r.id) })));
    setTeam((e.data ?? []) as { id: string; name: string }[]);
    setNow(Date.now());
  }, [company]);

  useEffect(() => { load(); }, [load]);

  const live = (alarms ?? []).filter(x => x.is_active);
  const past = (alarms ?? []).filter(x => !x.is_active);
  useEffect(() => {
    if (live.length === 0) return;
    const t = setInterval(load, LIVE_MS);
    return () => clearInterval(t);
  }, [live.length, load]);

  async function run(id: string, fn: () => Promise<Result>) {
    setBusy(id);
    setError(null);
    const r = await fn();
    if (!r.ok) setError(r.error);
    await load();
    setBusy(null);
    setConfirmId(null);
  }

  async function fire() {
    const t = title.trim();
    if (!t || !company) return;
    setBusy('new');
    setError(null);
    const r = await createUrgentAlert(t, company.id);
    if (!r.ok) { setError(`No se pudo activar la alarma: ${r.error}`); setBusy(null); return; }
    // Aviso a todos los teléfonos de la empresa (si falla, la alarma ya está activa en la app).
    fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '🚨 Actividad Urgente', body: t, companyId: company.id }),
    }).catch(() => {});
    setTitle('');
    await load();
    setBusy(null);
  }

  return (
    <AdminShell>
      <div className={s.page}>
        <header className={s.top}>
          <div>
            <div className={s.eyebrow}><i />{company?.name ?? 'Actividades'} · Actividades</div>
            <h1 className={s.title}>Urgente</h1>
            <div className={s.sub}>Una alarma que aparece en el teléfono de todos hasta que la confirman.</div>
          </div>
        </header>

        <div className={s.content}>
          {error && <div className={s.error}>{error}</div>}

          <section className={`${s.card} ${u.newCard}`}>
            <div className={u.newHead}><span className={u.siren}><IconAlert size={18} /></span><b>Nueva alarma</b></div>
            <div className={u.newRow}>
              <input
                className={u.input} value={title} maxLength={120} aria-label="Qué hay que hacer"
                placeholder="Ej. Cliente esperando en mostrador 2"
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') fire(); }}
              />
              <button type="button" className={u.fire} disabled={!title.trim() || busy === 'new'} onClick={fire}>
                {busy === 'new' ? 'Activando…' : 'Activar alarma'}
              </button>
            </div>
            <p className={u.hint}>Le llega a todos los teléfonos de {company?.name ?? 'la empresa'}. Al confirmarla, cada quien escoge su nombre; si alguien la cierra sin escogerlo, no aparece aquí.</p>
          </section>

          {!alarms ? (
            !error && <p className={s.loading}>Cargando alarmas…</p>
          ) : (
            <>
              {live.map(al => {
                const acks = uniqueAcks(al.acks);
                const ids = new Set(acks.map(k => k.employee_id).filter(Boolean));
                const names = new Set(acks.map(k => k.employee_name));
                const waiting = team.filter(p => !ids.has(p.id) && !names.has(p.name));
                const total = team.length;
                const done = total - waiting.length;
                return (
                  <section key={al.id} className={`${s.card} ${u.live}`} aria-live="polite">
                    <div className={u.liveTop}>
                      <div>
                        <span className={u.pulse}>Sonando</span>
                        <b style={{ marginTop: 10 }}>{al.title}</b>
                        <small>Activada {ago(al.created_at, now)} · esta vista se actualiza sola</small>
                      </div>
                      <button type="button" className={`${u.btn} ${u.dark}`} disabled={busy === al.id} onClick={() => run(al.id, () => deactivateUrgentAlert(al.id))}>
                        {busy === al.id ? 'Terminando…' : 'Terminar alarma'}
                      </button>
                    </div>
                    <div className={u.progress}>
                      <span>La vieron <b>{done} de {total}</b>{waiting.length === 0 && total > 0 ? ': ya la vieron todos' : ''}</span>
                      <div className={u.bar}><i style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
                    </div>
                    {acks.length > 0 && (
                      <div className={u.group}>
                        <span>Ya la vieron</span>
                        <div className={u.people}>
                          {acks.map(k => <span key={k.employee_id ?? k.employee_name} className={`${u.chip} ${u.seen}`}><IconCheck size={12} />{k.employee_name} · {hhmm(k.seen_at)}</span>)}
                        </div>
                      </div>
                    )}
                    {waiting.length > 0 && (
                      <div className={u.group}>
                        <span>Faltan</span>
                        <div className={u.people}>
                          {waiting.map(p => <span key={p.id} className={`${u.chip} ${u.waiting}`}>{p.name}</span>)}
                        </div>
                      </div>
                    )}
                  </section>
                );
              })}

              {past.length > 0 && (
                <>
                  <p className={u.secLbl}>Historial</p>
                  <section className={s.card}>
                    <div className={u.hist}>
                      {past.map(al => {
                        const acks = uniqueAcks(al.acks);
                        return (
                          <div key={al.id} className={u.hrow}>
                            <div>
                              <b>{al.title}</b>
                              <small>
                                {ago(al.created_at, now).replace(/^el /, '')} · {acks.length ? `la vieron ${acks.length}: ${acks.map(k => k.employee_name).join(', ')}` : 'nadie la confirmó'}
                              </small>
                            </div>
                            {confirmId === al.id ? null : (
                              <button type="button" className={`${u.btn} ${u.danger}`} onClick={() => setConfirmId(al.id)}>Borrar</button>
                            )}
                            {confirmId === al.id && (
                              <div className={u.confirm} role="alert">
                                <span>¿Borrar esta alarma y sus confirmaciones?</span>
                                <div className={u.confirmBtns}>
                                  <button type="button" className={`${u.btn} ${u.danger}`} disabled={busy === al.id} onClick={() => run(al.id, () => deleteUrgentAlert(al.id))}>
                                    {busy === al.id ? 'Borrando…' : 'Sí, borrar'}
                                  </button>
                                  <button type="button" className={u.btn} onClick={() => setConfirmId(null)}>Cancelar</button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </>
              )}

              {alarms.length === 0 && <p className={s.foot}>Todavía no se ha activado ninguna alarma.</p>}
            </>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
