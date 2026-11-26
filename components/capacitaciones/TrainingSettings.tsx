'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { TrainingConfig } from '@/app/capacitaciones/actions';
import { addBusy, parseLimit, removeBusy, SHARED_EDIT_ONLY, type BusyMap, type LimitField } from '@/lib/capacitaciones/admin-view';
import s from '@/components/panel/panel.module.css';
import v from './capacitaciones.module.css';

type Result = { ok: true } | { ok: false; error: string };
type Patch = { is_active?: boolean; deadline_days?: number; min_seconds?: number };
type What = 'switch' | 'move' | LimitField;

const FIELDS: { field: LimitField; label: string; unit: string; min: number; max: number }[] = [
  { field: 'deadline_days', label: 'Plazo', unit: 'días', min: 1, max: 60 },
  { field: 'min_seconds', label: 'Tiempo mínimo', unit: 'seg', min: 5, max: 600 },
];
const OFFLINE = 'No se pudo guardar. Revisa la conexión y vuelve a intentar.';

function without<T>(o: Record<string, T>, key: string): Record<string, T> {
  if (!(key in o)) return o;
  const { [key]: _gone, ...rest } = o;
  return rest;
}

const Arrow = ({ up }: { up: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {up ? <path d="M12 19V5M5 12l7-7 7 7" /> : <path d="M12 5v14M19 12l-7 7-7-7" />}
  </svg>
);

/**
 * Ajustes: todas en su orden, con activa/pausa, plazo, tiempo mínimo, orden y vista previa.
 * Con `canEdit` en false (admin fijo a una empresa) todo se ve pero no se cambia; "Ver" sí funciona.
 */
export default function TrainingSettings({ trainings, canEdit, onSave, onMove }: {
  trainings: TrainingConfig[];
  canEdit: boolean;
  onSave: (id: string, patch: Patch) => Promise<Result>;
  onMove: (id: string, dir: -1 | 1) => Promise<Result>;
}) {
  // Lo escrito en un campo mientras no se guarda; llave `${id}:${campo}`.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // Errores por renglón y por qué los causó; llave `${id}:${what}`.
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Lo que se está guardando por renglón (una lista: dos guardados del mismo renglón no se pisan).
  const [busy, setBusy] = useState<BusyMap<What>>({});
  const [asking, setAsking] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const askRef = useRef<HTMLDivElement>(null);
  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current); }, []);
  // Al pedir confirmar la pausa, el foco pasa al aviso (así el lector de pantalla lo lee).
  useEffect(() => { if (asking) askRef.current?.focus(); }, [asking]);

  // El mismo orden que usa moveTraining (sort_order y luego título).
  const list = useMemo(
    () => [...trainings].sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, 'es')),
    [trainings],
  );
  const active = list.filter(t => t.is_active).length;
  const isBusy = (id: string, what?: What) => (what ? !!busy[id]?.includes(what) : !!busy[id]?.length);

  async function run(id: string, what: What, fn: () => Promise<Result>): Promise<boolean> {
    setBusy(b => addBusy(b, id, what));
    setErrors(e => without(e, `${id}:${what}`));
    let r: Result;
    try { r = await fn(); } catch { r = { ok: false, error: OFFLINE }; }
    setBusy(b => removeBusy(b, id, what));
    if (!r.ok) { const msg = r.error; setErrors(e => ({ ...e, [`${id}:${what}`]: msg })); }
    return r.ok;
  }

  function markSaved(k: string) {
    setSaved(k);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(null), 1800);
  }

  const focusSwitch = (id: string) => requestAnimationFrame(() => document.getElementById(`cap-sw-${id}`)?.focus());

  function toggle(t: TrainingConfig) {
    if (!canEdit || isBusy(t.id, 'switch')) return; // mientras guarda se ve apagado y dice "guardando…"
    if (asking === t.id) { closeAsk(t.id); return; } // tocarlo otra vez es "Cancelar"
    if (t.is_active) { setAsking(t.id); return; } // pausar pide confirmar; prender no
    run(t.id, 'switch', () => onSave(t.id, { is_active: true }));
  }

  function closeAsk(id: string) {
    setAsking(null);
    setErrors(e => without(e, `${id}:switch`));
    focusSwitch(id);
  }

  async function pause(t: TrainingConfig) {
    if (!canEdit || isBusy(t.id, 'switch')) return;
    if (await run(t.id, 'switch', () => onSave(t.id, { is_active: false }))) { setAsking(null); focusSwitch(t.id); }
  }

  async function commit(t: TrainingConfig, field: LimitField) {
    const k = `${t.id}:${field}`;
    const raw = drafts[k];
    if (raw === undefined || !canEdit) return;
    const p = parseLimit(field, raw);
    if (!p.ok) { setErrors(e => ({ ...e, [k]: p.error })); return; }
    if (p.value === t[field]) { setDrafts(d => without(d, k)); setErrors(e => without(e, k)); return; }
    // El campo está apagado mientras guarda, así que esto casi no pasa; si pasa, el borrador se queda y se avisa.
    if (isBusy(t.id, field)) { setErrors(e => ({ ...e, [k]: 'Espera a que termine de guardar y vuelve a intentar.' })); return; }
    const value = p.value;
    if (await run(t.id, field, () => onSave(t.id, { [field]: value }))) {
      setDrafts(d => without(d, k));
      markSaved(k);
    }
  }

  async function move(t: TrainingConfig, dir: -1 | 1) {
    if (!canEdit || moving) return;
    setMoving(true);
    const ok = await run(t.id, 'move', () => onMove(t.id, dir));
    setMoving(false);
    // El renglón cambió de lugar: el foco vuelve a su flecha (o a la otra si ésa ya no se puede).
    if (ok) requestAnimationFrame(() => {
      const same = document.getElementById(`cap-mv-${dir}-${t.id}`) as HTMLButtonElement | null;
      (same && !same.disabled ? same : document.getElementById(`cap-mv-${-dir}-${t.id}`))?.focus();
    });
  }

  return (
    <section className={s.card} aria-label="Ajustes de las capacitaciones">
      <div className={v.setTop}>
        <h2>Las {list.length} capacitaciones</h2>
        <span>{active === 0 ? 'Ninguna activa' : `${active} de ${list.length} ${active === 1 ? 'activa' : 'activas'}`}</span>
      </div>
      {!canEdit && <p className={v.readOnly}>{SHARED_EDIT_ONLY}</p>}

      <div className={v.setHead} aria-hidden>
        <span>Activa</span><span>Capacitación</span><span>Plazo</span><span>Tiempo mínimo</span><span>Orden</span>
      </div>
      <ol className={v.setList}>
        {list.map((t, i) => {
          const swBusy = isBusy(t.id, 'switch');
          const rowErrors = Object.entries(errors).filter(([k]) => k.startsWith(`${t.id}:`));
          return (
            <li key={t.id} className={`${v.setRow} ${t.is_active ? '' : v.paused}`}>
              <div className={v.aSw}>
                <button type="button" id={`cap-sw-${t.id}`} role="switch" aria-checked={t.is_active} className={v.switch}
                  aria-label={`Activa: ${t.title}`} disabled={!canEdit} aria-disabled={swBusy || undefined} onClick={() => toggle(t)}>
                  <i />
                </button>
              </div>

              <div className={v.aName}>
                <span className={v.pos} aria-hidden>{i + 1}</span>
                <div className={v.tName}>
                  <b>{t.title}</b>
                  <small>
                    v{t.version} · {t.is_active ? <span className={v.on}>Activa</span> : 'En pausa'}
                    {isBusy(t.id) && <span className={v.saving}> · Guardando…</span>}
                  </small>
                </div>
              </div>

              {FIELDS.map(f => {
                const k = `${t.id}:${f.field}`;
                const id = `cap-${f.field}-${t.id}`;
                const err = errors[k];
                const fieldBusy = isBusy(t.id, f.field);
                return (
                  <div key={f.field} className={`${v.field} ${f.field === 'deadline_days' ? v.aPlazo : v.aTiempo}`}>
                    <label className={v.fLabel} htmlFor={id}>{f.label}</label>
                    <div className={v.numWrap}>
                      <input
                        id={id} className={`${v.num} ${saved === k ? v.numOk : ''}`} type="number" inputMode="numeric" enterKeyHint="done"
                        min={f.min} max={f.max} step={1}
                        value={drafts[k] ?? String(t[f.field])}
                        aria-invalid={err ? true : undefined}
                        aria-describedby={err ? `${k}-err` : undefined}
                        aria-busy={fieldBusy || undefined}
                        disabled={!canEdit || fieldBusy}
                        onChange={e => { const val = e.target.value; setDrafts(d => ({ ...d, [k]: val })); setErrors(x => without(x, k)); }}
                        onBlur={() => commit(t, f.field)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                          if (e.key === 'Escape') { setDrafts(d => without(d, k)); setErrors(x => without(x, k)); }
                        }}
                        onWheel={e => e.currentTarget.blur()}
                      />
                      <span className={v.unit}>{f.unit}</span>
                    </div>
                  </div>
                );
              })}

              <div className={v.aOrder}>
                <button type="button" id={`cap-mv--1-${t.id}`} className={v.iconBtn} aria-label={`Subir ${t.title}`}
                  disabled={!canEdit || moving || i === 0} onClick={() => move(t, -1)}><Arrow up /></button>
                <button type="button" id={`cap-mv-1-${t.id}`} className={v.iconBtn} aria-label={`Bajar ${t.title}`}
                  disabled={!canEdit || moving || i === list.length - 1} onClick={() => move(t, 1)}><Arrow up={false} /></button>
              </div>

              <div className={v.aVer}>
                <Link href={`/capacitaciones/ver/${t.slug}`} className={v.btn} aria-label={`Ver ${t.title}`}>Ver</Link>
              </div>

              <div className={v.aMsg}>
                {asking === t.id && (
                  <div ref={askRef} tabIndex={-1} className={v.pauseAsk} role="group" aria-labelledby={`cap-pause-${t.id}`}
                    onKeyDown={e => { if (e.key === 'Escape' && !swBusy) closeAsk(t.id); }}>
                    <p id={`cap-pause-${t.id}`}>Si la pausas y la vuelves a prender, a todos los que no la han visto les llega otro aviso y su plazo empieza de nuevo.</p>
                    <div>
                      <button type="button" className={`${v.btn} ${v.dark}`} disabled={swBusy} onClick={() => pause(t)}>
                        {swBusy ? 'Pausando…' : 'Pausar'}
                      </button>
                      <button type="button" className={v.btn} disabled={swBusy} onClick={() => closeAsk(t.id)}>Cancelar</button>
                    </div>
                  </div>
                )}
                {rowErrors.map(([k, msg]) => <p key={k} id={`${k}-err`} className={v.err} role="alert">{msg}</p>)}
              </div>
            </li>
          );
        })}
      </ol>
      <span className={v.sr} role="status" aria-live="polite">{saved ? 'Guardado' : ''}</span>

      <p className={v.note}>
        Al prender una, a todos les llega un aviso y su plazo empieza hoy. Si prendes varias juntas, a cada quien le llega un solo aviso.
      </p>
    </section>
  );
}
