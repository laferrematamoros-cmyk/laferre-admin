'use client';

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { supabase } from '@/lib/supabase';
import { isDone, type TrainingStatus } from '@/lib/capacitaciones/status';
import { shortDay } from '@/lib/capacitaciones/format';
import { medalLine } from '@/lib/capacitaciones/medals';
import { celebrate, countText, LEVEL_LABEL } from '@/lib/capacitaciones/levels';
import { themeOf } from '@/lib/capacitaciones/themes';
import TrainingContent from './TrainingContent';
import Medal from './Medal';
import LevelBadge from './LevelBadge';
import v from './viewer.module.css';
import md from './medals.module.css';

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
  /** Sólo el primer nombre, ya en tipo título ("Hola, Eddie"); lo arma el servidor (firstNameOf). */
  firstName?: string;
  minSeconds: number;
  /** null = vista previa del admin (no se registra nada, sin botones). */
  token: string | null;
  /** `day` ("21 nov") conviene mandarlo del servidor (shortDay): si no viene, se escribe aquí. */
  previous?: { status: TrainingStatus; answeredAt: string; day?: string } | null;
  /** Teléfono: laferre://capacitacion "Regresar a la app"; practicante: /mis-capacitaciones. */
  back: { href: string; label: string };
  /** Dentro del panel (practicante / vista previa): la barra se queda en su contenedor, no en toda la pantalla. */
  embedded?: boolean;
  /** Cuántas medallas llevaba al abrir (lo arma el servidor): para "ya llevas 9 de 20" y "¡Subiste a Oro!". */
  medals?: { earned: number; total: number } | null;
}

// Confeti del festejo: posición, retraso, color y giro de cada papelito.
const CONFETTI: [number, number, string, number][] = [
  [4, 0, '#DB011C', 540], [14, .5, '#F4B731', -420], [24, .2, '#3B8DF0', 600], [33, .8, '#2EB67D', -560],
  [42, .35, '#EC6A73', 480], [51, 1, '#F28C38', -500], [60, .15, '#8E6CEF', 620], [69, .65, '#F4B731', -460],
  [78, .3, '#DB011C', 520], [87, .9, '#3B8DF0', -600], [95, .45, '#2EB67D', 440], [10, 1.2, '#F28C38', -520],
];

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const PREVIOUS: Partial<Record<TrainingStatus, (day: string) => string>> = {
  understood: day => `Ya la marcaste como entendida el ${day}.`,
  doubt: () => 'Pediste que el Ing. te la explique.',
  trained: () => 'Ya te capacitó el Ing. en persona.',
};

const DONE: Record<Done, string> = {
  understood: 'Quedó como entendida.',
  doubt: 'Le avisamos al Ing. José para que te la explique.',
  trained: 'Ya te capacitó el Ing. en persona.',
};

/** La página de una capacitación: las animaciones, la cuenta regresiva y "Entendí" / "Tengo dudas". */
export default function TrainingViewer({ slug, title, firstName: name = '', minSeconds, token, previous = null, back, embedded = false, medals = null }: Props) {
  const preview = token === null;
  const canAnswer = !preview && previous?.status !== 'trained';
  const prevText = previous ? PREVIOUS[previous.status]?.(previous.day ?? shortDay(previous.answeredAt)) ?? null : null;

  const rootRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
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
  /** `tooSoon`: el aviso de "todavía no termina" se quita solo cuando la cuenta llega a 0. */
  const [error, setError] = useState<{ msg: string; tooSoon?: boolean } | null>(null);
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

  useEffect(() => {
    if (left === 0) setError(e => (e?.tooSoon ? null : e));
  }, [left]);

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

  // Escape cierra. Tab no sale de la hoja: la página y la barra quedan `inert`, y dentro del panel
  // (donde el menú lateral sigue vivo) Tab da la vuelta del último control al primero.
  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) { setSheet(false); return; }
      if (e.key !== 'Tab' || !sheetRef.current) return;
      const f = [...sheetRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled)')];
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1], at = document.activeElement;
      if (e.shiftKey && (at === first || !sheetRef.current.contains(at))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (at === last || !sheetRef.current.contains(at))) { e.preventDefault(); first.focus(); }
    };
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
    if (r.error) setError({ msg: 'No hay conexión. Intenta de nuevo.' });
    else if (!r.data?.ok) {
      const tooSoon = r.data?.code === 'too_soon' && typeof r.data.seconds_left === 'number';
      if (tooSoon) resync(r.data!.seconds_left!);
      setError({ msg: r.data?.error ?? 'No se pudo guardar.', tooSoon });
    } else {
      setSheet(false);
      const finished: Done = r.data.status === 'trained' ? 'trained' : kind;
      // Medalla: el teléfono vibra (sólo donde el navegador lo permite; en iPhone no hace nada).
      if (finished !== 'doubt') try { navigator.vibrate?.([60, 40, 120]); } catch { /* sin vibración */ }
      setDone(finished);
    }
  }

  const rootCls = `${v.root} ${embedded ? v.embedded : v.standalone}`;

  if (done) {
    // Entendida o en persona: llega la medalla de su tema con rayos y confeti. Con dudas, la ✓ y el texto de siempre.
    const medal = medalLine(done, title);
    const after = medal ? celebrate(medals, previous ? isDone(previous.status) : false) : null;
    return (
      <div ref={rootRef} className={rootCls}>
        <div className={v.final}>
          {medal ? (
            <div className={md.party}>
              <div className={md.rays} aria-hidden />
              <div className={md.confetti} aria-hidden>
                {CONFETTI.map(([x, d, c, r], i) => (
                  <i key={i} style={{ left: `${x}%`, background: c, '--d': `${d}s`, '--r': `${r}deg` } as CSSProperties} />
                ))}
              </div>
              <div className={md.pop}><Medal theme={themeOf(slug)} earned size={110} /></div>
            </div>
          ) : <div className={v.check} aria-hidden>✓</div>}
          <h1 className={v.finalTitle}>{name ? `¡Listo, ${name}!` : '¡Listo!'}</h1>
          <p className={v.finalText}>{medal ?? DONE[done]}</p>
          {after && <p className={md.count}>{countText(after.earned, after.total)}</p>}
          {after?.levelUp && (
            <div className={md.levelUp}>
              <LevelBadge level={after.levelUp} size={38} />
              <b>¡Subiste a {LEVEL_LABEL[after.levelUp]}!</b>
            </div>
          )}
          <a className={`${v.btn} ${v.dark} ${v.big}`} href={back.href}>{back.label}</a>
          {back.href.startsWith('laferre://') && <p className={v.closeTab}>o cierra esta pestaña</p>}
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`${rootCls} ${preview ? '' : v.withBar}`}>
      <div className={v.wrap} inert={sheet}>
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
          // Sin `day` del servidor, la fecha se escribe aquí y el navegador podría escribirla distinto.
          <p className={`${v.notice} ${previous?.status === 'doubt' ? v.noticeDoubt : v.noticeOk}`} suppressHydrationWarning={!previous?.day}>{prevText}</p>
        )}
        {reduced && (
          <p className={`${v.notice} ${v.noticeInfo}`}>Tu teléfono tiene las animaciones apagadas: toca cada paso para verlo.</p>
        )}

        <TrainingContent slug={slug} round={round} />
      </div>

      {!preview && (
        <div className={v.bar} inert={sheet}>
          <div className={v.barIn}>
            {error && !sheet && <p className={v.error} role="alert">{error.msg}</p>}
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
          <div ref={sheetRef} className={v.sheet} style={{ zIndex: 81 }} role="dialog" aria-modal="true" aria-labelledby={sheetTitleId}>
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
              {error && <p className={v.error} role="alert">{error.msg}</p>}
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
