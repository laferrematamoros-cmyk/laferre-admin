'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { TrainingStatus } from '@/lib/capacitaciones/status';
import TrainingContent from './TrainingContent';
import v from './viewer.module.css';

type Answer = 'understood' | 'doubt';
type Done = Answer | 'trained';

/** Lo que regresa cap_answer (supabase/011_capacitaciones.sql). */
interface CapAnswer {
  ok: boolean; status?: TrainingStatus; already?: boolean;
  code?: 'too_soon' | 'expired' | 'paused' | 'version' | 'employee' | 'note' | 'answer';
  error?: string; seconds_left?: number;
}

interface Props {
  slug: string;
  title: string;
  /** "Hola, Eddie" */
  employeeName?: string;
  minSeconds: number;
  /** null = vista previa del admin (no se registra nada, sin botones). */
  token: string | null;
  previous?: { status: TrainingStatus; answeredAt: string } | null;
  /** Teléfono: laferre://capacitacion "Regresar a la app"; practicante: /mis-capacitaciones. */
  back: { href: string; label: string };
  /** Dentro del panel (practicante / vista previa): la barra se queda en su contenedor, no en toda la pantalla. */
  embedded?: boolean;
}

/** "EDDIE GARCÍA" → "Eddie". Local a propósito: notices.ts no debe entrar al paquete del navegador. */
function firstName(full?: string): string {
  const w = (full ?? '').trim().split(/\s+/)[0] ?? '';
  return w ? w.charAt(0).toLocaleUpperCase('es-MX') + w.slice(1).toLocaleLowerCase('es-MX') : '';
}

/** "21 nov", con el día de Matamoros. */
function dayMonth(iso: string): string {
  const parts = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: 'America/Matamoros' })
    .formatToParts(new Date(iso));
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  return `${get('day')} ${get('month').replace('.', '')}`;
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const PREVIOUS: Partial<Record<TrainingStatus, (answeredAt: string) => string>> = {
  understood: at => `Ya la marcaste como entendida el ${dayMonth(at)}.`,
  doubt: () => 'Pediste que el Ing. te la explique.',
  trained: () => 'Ya te capacitó el Ing. en persona.',
};

const DONE: Record<Done, string> = {
  understood: 'Quedó como entendida.',
  doubt: 'Le avisamos al Ing. José para que te la explique.',
  trained: 'Ya te capacitó el Ing. en persona.',
};

/** La página de una capacitación: las animaciones, la cuenta regresiva y "Entendí" / "Tengo dudas". */
export default function TrainingViewer({ slug, title, employeeName, minSeconds, token, previous = null, back, embedded = false }: Props) {
  const name = firstName(employeeName);
  const preview = token === null;
  const canAnswer = !preview && previous?.status !== 'trained';
  const prevText = previous ? PREVIOUS[previous.status]?.(previous.answeredAt) ?? null : null;

  const rootRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);
  const doubtBtnRef = useRef<HTMLButtonElement>(null);
  const startRef = useRef(0);
  const noteId = useId();
  const sheetTitleId = useId();

  const [round, setRound] = useState(0);
  const [left, setLeft] = useState(minSeconds);
  const [reduced, setReduced] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<Answer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);

  // Cuenta regresiva desde que se abrió la página. "Volver a verla" no la reinicia.
  useEffect(() => {
    startRef.current = performance.now();
    const tick = () => setLeft(Math.max(0, minSeconds - Math.floor((performance.now() - startRef.current) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [minSeconds]);

  /** La base dice cuántos segundos faltan: se mueve el inicio para que la cuenta diga eso. */
  function resync(n: number) {
    startRef.current = performance.now() - (minSeconds - n) * 1000;
    setLeft(Math.max(0, n));
  }

  // Con "quitar animaciones" casi todas se quedan en el último paso: se avisa que hay que tocar cada paso.
  useEffect(() => {
    setReduced(!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // Hoja "Tengo dudas": foco adentro al abrir y de regreso al botón al cerrar.
  useEffect(() => {
    if (!sheet) return;
    firstRef.current?.focus();
    const btn = doubtBtnRef.current;
    return () => btn?.focus({ preventScroll: true });
  }, [sheet]);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) setSheet(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet, busy]);

  // Al contestar se ve la pantalla final desde arriba.
  useEffect(() => {
    if (done) rootRef.current?.scrollIntoView({ block: 'start' });
  }, [done]);

  function rewatch() {
    setSheet(false);
    setError(null);
    setRound(r => r + 1);
    // scrollIntoView sirve igual en la página suelta que dentro del panel (donde no se mueve la ventana).
    rootRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  async function answer(kind: Answer) {
    if (!token || busy) return;
    setBusy(kind);
    setError(null);
    let r: { data: CapAnswer | null; error: unknown };
    try {
      r = await supabase.rpc('cap_answer', { p_session: token, p_answer: kind, p_note: kind === 'doubt' ? note.trim() || null : null });
    } catch (e) {
      r = { data: null, error: e };
    }
    setBusy(null);
    if (r.error) setError('No hay conexión. Intenta de nuevo.');
    else if (!r.data?.ok) {
      if (r.data?.code === 'too_soon' && typeof r.data.seconds_left === 'number') resync(r.data.seconds_left);
      setError(r.data?.error ?? 'No se pudo guardar.');
    } else {
      setSheet(false);
      setDone(r.data.status === 'trained' ? 'trained' : kind);
    }
  }

  const rootCls = `${v.root} ${embedded ? v.embedded : v.standalone}`;

  if (done) {
    return (
      <div ref={rootRef} className={rootCls}>
        <div className={v.final}>
          <div className={v.check} aria-hidden>✓</div>
          <h1 className={v.finalTitle}>{name ? `¡Listo, ${name}!` : '¡Listo!'}</h1>
          <p className={v.finalText}>{DONE[done]}</p>
          <a className={`${v.btn} ${v.dark} ${v.big}`} href={back.href}>{back.label}</a>
          {back.href.startsWith('laferre://') && <p className={v.closeTab}>o cierra esta pestaña</p>}
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`${rootCls} ${preview ? '' : v.withBar}`}>
      <div className={v.wrap}>
        {preview && (
          <div className={v.preview}>
            <span>
              <b>Vista previa: no se registra nada.</b>{' '}
              <span className={v.previewTimer}>
                {left > 0 ? <>El botón Entendí se prende en <span className={v.num}>{clock(left)}</span>.</> : 'El botón Entendí ya estaría prendido.'}
              </span>
            </span>
            <a className={v.previewBack} href={back.href}>{back.label}</a>
          </div>
        )}

        <header className={v.head}>
          <span className={v.eyebrow}><i aria-hidden />Capacitación</span>
          {name && <p className={v.hello}>Hola, {name}</p>}
          <h1 className={v.title}>{title}</h1>
        </header>

        {prevText && (
          <p className={`${v.notice} ${previous?.status === 'doubt' ? v.noticeDoubt : v.noticeOk}`}>{prevText}</p>
        )}
        {reduced && (
          <p className={`${v.notice} ${v.noticeInfo}`}>Tu teléfono tiene las animaciones apagadas: toca cada paso para verlo.</p>
        )}

        <TrainingContent slug={slug} round={round} />
      </div>

      {!preview && (
        <div className={v.bar}>
          <div className={v.barIn}>
            {error && !sheet && <p className={v.error} role="alert">{error}</p>}
            <div className={v.barBtns}>
              {canAnswer ? (
                <>
                  <button ref={doubtBtnRef} type="button" className={`${v.btn} ${v.light}`} disabled={!!busy}
                    onClick={() => { setError(null); setSheet(true); }}>
                    Tengo dudas
                  </button>
                  <button type="button" className={`${v.btn} ${v.dark}`} disabled={left > 0 || !!busy} onClick={() => answer('understood')}>
                    {busy === 'understood' ? 'Guardando…'
                      : left > 0 ? <>Entendí · <span className={v.num}>{clock(left)}</span></>
                      : 'Entendí'}
                  </button>
                </>
              ) : (
                <a className={`${v.btn} ${v.dark}`} href={back.href}>{back.label}</a>
              )}
            </div>
          </div>
        </div>
      )}

      {sheet && (
        <>
          <div className={v.overlay} style={{ zIndex: 80 }} onClick={() => { if (!busy) setSheet(false); }} />
          <div className={v.sheet} style={{ zIndex: 81 }} role="dialog" aria-modal="true" aria-labelledby={sheetTitleId}>
            <div className={v.sheetHead}>
              <h2 id={sheetTitleId}>Tengo dudas</h2>
              <button type="button" className={v.x} onClick={() => setSheet(false)} disabled={!!busy} aria-label="Cerrar">✕</button>
            </div>

            <button ref={firstRef} type="button" className={v.option} onClick={rewatch} disabled={!!busy}>
              <b>Volver a verla</b>
              <span>Empieza otra vez desde el principio.</span>
            </button>

            <div className={v.ask}>
              <label htmlFor={noteId}>
                <b>Que el Ing. me la explique</b>
                <span>Le avisamos para que te la explique en persona.</span>
              </label>
              <textarea id={noteId} className={v.textarea} value={note} maxLength={500} rows={3}
                placeholder="¿Qué no te quedó claro? (opcional)" onChange={e => setNote(e.target.value)} />
              <span className={v.count}>{note.length}/500</span>
              {error && <p className={v.error} role="alert">{error}</p>}
              <button type="button" className={`${v.btn} ${v.dark}`} disabled={!!busy} onClick={() => answer('doubt')}>
                {busy === 'doubt' ? 'Guardando…' : 'Enviar'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
