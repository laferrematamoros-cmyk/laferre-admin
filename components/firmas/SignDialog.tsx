'use client';

import { useEffect, useState } from 'react';
import type { SignRun } from '@/lib/checklist-types';
import { titleCase, shortDate } from '@/lib/checklist-mail';
import { safeHttps } from '@/lib/safe-url';
import c from '@/components/conoce/co.module.css';
import v from './firmas.module.css';

type Result = { ok: true } | { ok: false; error: string };

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Matamoros' });
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
/** El día en Matamoros (no el de UTC: una firma a las 7:30 pm ya es "mañana" en UTC). */
const shopDay = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Matamoros' });

/** La ficha de una lista terminada: lo que palomearon, fotos, motivos, y Firmar / Regresar. */
export default function SignDialog({ run, onClose, onSign, onReturn }: {
  run: SignRun;
  onClose: () => void;
  onSign: () => Promise<Result>;
  onReturn: (itemIds: string[], note: string) => Promise<Result>;
}) {
  const [viewer, setViewer] = useState<{ url: string; label: string } | null>(null);
  const [returning, setReturning] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (viewer) setViewer(null); else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewer, onClose]);

  const waiting = run.status === 'awaiting_signature';
  const areas = [...new Set(run.marks.map(m => m.area))];
  const done = run.marks.filter(m => m.state !== 'pending').length;

  async function act(fn: () => Promise<Result>) {
    setBusy(true);
    setError(null);
    const r = await fn();
    setBusy(false);
    if (!r.ok) setError(r.error);
  }

  return (
    <>
      <div className={c.overlay} onClick={onClose} />
      <div className={c.dialog} role="dialog" aria-modal="true" aria-label={`${run.activityTitle} de ${titleCase(run.employeeName)}`}>
        <div className={c.dHead}>
          <h2>{run.activityTitle} — {titleCase(run.employeeName)}</h2>
          <button type="button" className={c.btn} onClick={onClose}>Cerrar</button>
        </div>
        <div className={c.dBody}>
          <div className={v.info}>
            <span>{cap(shortDate(run.scheduledDate))}</span>
            {run.finishedAt && <span>· terminó a las {hhmm(run.finishedAt)}</span>}
            <span className={v.chip}>{done} de {run.marks.length} tareas</span>
            {run.wasLate && <span className={`${v.chip} ${v.late}`}>Después de la hora límite</span>}
          </div>

          {run.status === 'signed' && run.signedAt && (
            <div className={`${v.banner} ${v.bannerOk}`}>
              Firmada por {run.signedBy ?? 'el administrador'} el {shortDate(shopDay(run.signedAt))} a las {hhmm(run.signedAt)}
              {run.signedVia === 'pin' ? ' (con PIN en el teléfono).' : ' (desde el panel).'}
            </div>
          )}
          {(run.status === 'in_progress' || run.status === 'returned') && (
            <div className={`${v.banner} ${v.bannerLate}`}>
              {run.status === 'returned' ? `La regresaste: ${run.returnNote ?? ''}. Todavía no la corrigen.` : 'Todavía no la terminan.'}
            </div>
          )}
          {waiting && run.returnNote && (
            <div className={`${v.banner} ${v.bannerLate}`}>Ya la habías regresado: {run.returnNote}. La corrigieron y la volvieron a entregar.</div>
          )}

          {returning && <p className={c.hint}>Toca las tareas que hay que rehacer. Sólo ésas se le vuelven a abrir.</p>}

          {areas.map(area => (
            <div key={area}>
              <p className={v.area}>{area}</p>
              <div className={v.rows}>
                {run.marks.filter(m => m.area === area).map(m => {
                  const body = (
                    <>
                      {returning
                        ? <input type="checkbox" className={v.box} checked={picked.includes(m.item_id)} readOnly tabIndex={-1} aria-hidden />
                        : <span className={`${v.mark} ${m.state === 'done' ? v.mDone : m.state === 'skipped' ? v.mSkip : v.mPend}`} aria-hidden>
                            {m.state === 'done' ? '✓' : m.state === 'skipped' ? '!' : '·'}
                          </span>}
                      <span className={v.label}>
                        {m.label}
                        {m.state === 'skipped' && <span className={v.reason}>No se pudo: {m.reason}</span>}
                        {m.state === 'pending' && <span className={v.gone}>Sin palomear</span>}
                        {m.hadPhoto && m.photoUrls.length === 0 && <span className={v.gone}>Foto borrada (más de 21 días)</span>}
                      </span>
                      {!returning && m.photoUrls.some(u => safeHttps(u)) ? (
                        <span className={v.thumbs}>
                          {m.photoUrls.filter(u => safeHttps(u)).map((url, i, all) => {
                            const label = all.length > 1 ? `${m.label} · ${i + 1} de ${all.length}` : m.label;
                            return (
                              <button key={url} type="button" className={v.thumb} onClick={() => setViewer({ url, label })} aria-label={`Ver foto: ${label}`}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt={label} loading="lazy" />
                              </button>
                            );
                          })}
                        </span>
                      ) : <span />}
                    </>
                  );
                  return returning ? (
                    <button
                      key={m.item_id} type="button" className={`${v.row} ${picked.includes(m.item_id) ? v.picked : ''}`}
                      aria-pressed={picked.includes(m.item_id)}
                      onClick={() => setPicked(p => (p.includes(m.item_id) ? p.filter(x => x !== m.item_id) : [...p, m.item_id]))}
                    >
                      {body}
                    </button>
                  ) : <div key={m.item_id} className={v.row}>{body}</div>;
                })}
              </div>
            </div>
          ))}

          {returning && (
            <div className={c.field}>
              <label className={c.label} htmlFor="ret-note">¿Qué hay que corregir?</label>
              <textarea id="ret-note" className={c.input} value={note} maxLength={300} onChange={e => setNote(e.target.value)}
                placeholder="Ej.: el comedor quedó con migajas" />
            </div>
          )}
          {error && <p className={c.err} role="alert">{error}</p>}

          {waiting && (
            <div className={c.dFoot}>
              {returning ? (
                <>
                  <button type="button" className={c.btn} disabled={busy} onClick={() => { setReturning(false); setPicked([]); setError(null); }}>Cancelar</button>
                  <button type="button" className={`${c.btn} ${c.dark}`} disabled={busy || picked.length === 0 || !note.trim()}
                    onClick={() => act(() => onReturn(picked, note))}>
                    {busy ? 'Enviando…' : `Regresarla (${picked.length})`}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className={c.btn} disabled={busy} onClick={() => { setReturning(true); setError(null); }}>Regresar</button>
                  <button type="button" className={`${c.btn} ${c.dark}`} disabled={busy} onClick={() => act(onSign)}>
                    {busy ? 'Firmando…' : 'Firmar'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {viewer && (
        <div className={c.viewer} role="dialog" aria-modal="true" aria-label={viewer.label} onClick={() => setViewer(null)}>
          <div className={c.vTop}>
            <b>{viewer.label}</b>
            <button type="button" className={c.btn} onClick={() => setViewer(null)}>Cerrar</button>
          </div>
          <div className={c.vImg} onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={viewer.url} alt={viewer.label} />
          </div>
        </div>
      )}
    </>
  );
}
