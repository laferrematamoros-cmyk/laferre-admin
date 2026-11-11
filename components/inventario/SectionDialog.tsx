'use client';

import { useEffect, useState } from 'react';
import type { InvSection } from '@/lib/inventory-types';
import { safeHttps } from '@/lib/safe-url';
import c from '@/components/conoce/co.module.css';
import v from './inv.module.css';
import { AREA_LABEL, shopTime } from './labels';
import { minutesText, spanText } from '@/lib/inventory-time';

type Result = { ok: true } | { ok: false; error: string };

/** La ficha de una letra: fotos (con visor), lo que escribieron, la ronda anterior y "Pedir que se rehaga". */
export default function SectionDialog({ section, previous, people, onClose, onRedo }: {
  section: InvSection;
  previous?: InvSection;
  people: Record<string, string>;
  onClose: () => void;
  onRedo: (note: string) => Promise<Result>;
}) {
  const [viewer, setViewer] = useState<{ url: string; label: string } | null>(null);
  const [redo, setRedo] = useState(false);
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

  const who = (id: string | null) => (id ? people[id] ?? 'Sin nombre' : '—');
  const photos = [
    ...(section.shelf_photo ? [{ url: section.shelf_photo, label: 'Estante' }] : []),
    ...section.report_photos.map((url, i) => ({ url, label: `Sicar ${i + 1}` })),
  ].filter(p => safeHttps(p.url));

  async function sendRedo() {
    setBusy(true);
    setError(null);
    const r = await onRedo(note);
    setBusy(false);
    if (!r.ok) setError(r.error);
  }

  return (
    <>
      <div className={c.overlay} onClick={onClose} />
      <div className={c.dialog} role="dialog" aria-modal="true" aria-label={`Letra ${section.code}`}>
        <div className={c.dHead}>
          <h2>Letra {section.code}{section.name ? ` — ${section.name}` : ''}</h2>
          <button type="button" className={c.btn} onClick={onClose}>Cerrar</button>
        </div>
        <div className={c.dBody}>
          {section.redo_note && section.status !== 'done' && (
            <div className={v.redoNote}>Pediste rehacerla: {section.redo_note}</div>
          )}

          {section.status !== 'done' ? (
            <p className={c.hint}>
              {section.status === 'in_progress'
                ? `${who(section.claimed_by)} la está haciendo (desde las ${section.claimed_at ? shopTime(section.claimed_at) : '—'}).`
                : 'Todavía nadie la toma.'}
            </p>
          ) : (
            <>
              {photos.length > 0 && (
                <div className={v.photos}>
                  {photos.map(p => (
                    <button key={p.url} type="button" className={v.photo} onClick={() => setViewer(p)} aria-label={`Ver foto: ${p.label}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt={p.label} loading="lazy" />
                      <em>{p.label}</em>
                    </button>
                  ))}
                </div>
              )}
              <dl className={v.facts}>
                <div>
                  <dt>Estado del área</dt>
                  <dd>{section.area_state ? <span className={`${v.area} ${v[`a_${section.area_state}`]}`}>{AREA_LABEL[section.area_state]}</span> : '—'}</dd>
                </div>
                {section.observations && <div><dt>Observaciones</dt><dd>{section.observations}</dd></div>}
                {section.improvement && <div><dt>Mejora propuesta</dt><dd>{section.improvement}</dd></div>}
                {section.action_taken && <div><dt>Qué se hizo</dt><dd>{section.action_taken}</dd></div>}
                <div>
                  <dt>Diferencias contra Sicar</dt>
                  <dd>
                    {section.had_differences === false && 'No hubo.'}
                    {section.had_differences && section.differences_resolved && 'Hubo, y quedaron solucionadas.'}
                    {section.had_differences && section.differences_resolved === false && `Hubo y falta resolver: ${section.pending_note ?? ''}`}
                  </dd>
                </div>
                <div>
                  <dt>Quién</dt>
                  <dd>{who(section.done_by)}</dd>
                </div>
                <div>
                  <dt>Tiempo</dt>
                  <dd>
                    {section.minutes_taken ? <>Anotó que tardó <b>{minutesText(section.minutes_taken)}</b>.</> : 'No anotó cuánto tardó.'}
                    {section.done_at && <span className={v.span}>{spanText(section.claimed_at, section.done_at)}</span>}
                  </dd>
                </div>
              </dl>
            </>
          )}

          {previous && (
            <div className={v.prev}>
              <b>Inventario anterior</b>
              {previous.status === 'done'
                ? <>{previous.area_state ? AREA_LABEL[previous.area_state] : '—'}{previous.observations ? ` — ${previous.observations}` : ''}
                    {previous.had_differences && previous.differences_resolved === false ? ` · Quedó pendiente: ${previous.pending_note ?? ''}` : ''}</>
                : 'No se hizo.'}
            </div>
          )}

          {section.status === 'done' && (
            redo ? (
              <div className={c.field}>
                <label className={c.label} htmlFor="redo-note">¿Qué hay que corregir?</label>
                <textarea id="redo-note" className={c.input} value={note} maxLength={300}
                  onChange={e => setNote(e.target.value)} placeholder="Ej.: la foto del reporte salió borrosa" />
                {error && <p className={c.err}>{error}</p>}
                <div className={c.dFoot}>
                  <button type="button" className={c.btn} onClick={() => { setRedo(false); setError(null); }} disabled={busy}>Cancelar</button>
                  <button type="button" className={`${c.btn} ${c.dark}`} onClick={sendRedo} disabled={busy || !note.trim()}>
                    {busy ? 'Enviando…' : 'Regresarla'}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className={c.btn} onClick={() => setRedo(true)}>Pedir que se rehaga</button>
            )
          )}
        </div>
      </div>

      {viewer && (
        <div className={c.viewer} role="dialog" aria-modal="true" aria-label={viewer.label} onClick={() => setViewer(null)}>
          <div className={c.vTop}>
            <b>Letra {section.code} · {viewer.label}</b>
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
