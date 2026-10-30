'use client';

import {
  createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState,
  type FocusEvent, type PointerEvent, type ReactNode,
} from 'react';
import { STATUSES, STATUS_LABEL, type Status } from '@/lib/reports';
import { IconChevronDown } from './icons';
import s from './reportes.module.css';

// ── Globo de ayuda ──────────────────────────────────────────────────────────────
type TipState = { content: ReactNode; x: number; y: number } | null;
const TipCtx = createContext<(t: TipState) => void>(() => {});

/** Un solo globo para toda la pantalla. Va DENTRO de `.page` para heredar sus colores. */
export function TipProvider({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<TipState>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!tip || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    let left = tip.x + 14, top = tip.y + 14;
    if (left + r.width > window.innerWidth - 8) left = tip.x - r.width - 14;
    if (top + r.height > window.innerHeight - 8) top = tip.y - r.height - 14;
    setPos({ left: Math.max(8, left), top: Math.max(8, top) });
  }, [tip]);

  return (
    <TipCtx.Provider value={setTip}>
      {children}
      <div ref={ref} role="tooltip" className={`${s.tip} ${tip ? s.tipOn : ''}`} style={pos}>{tip?.content}</div>
    </TipCtx.Provider>
  );
}

/** Devuelve una función que arma las props para que un elemento muestre un globo
 *  al pasar el mouse o al enfocarlo con el teclado. */
export function useTip() {
  const set = useContext(TipCtx);
  return useCallback((content: ReactNode, onShow?: () => void, onHide?: () => void) => ({
    tabIndex: 0,
    onPointerMove: (e: PointerEvent<Element>) => { set({ content, x: e.clientX, y: e.clientY }); onShow?.(); },
    onPointerLeave: () => { set(null); onHide?.(); },
    onFocus: (e: FocusEvent<Element>) => {
      const r = e.currentTarget.getBoundingClientRect();
      set({ content, x: r.left + r.width / 2, y: r.top });
      onShow?.();
    },
    onBlur: () => { set(null); onHide?.(); },
  }), [set]);
}

export function TipBody({ title, counts, line, foot }: {
  title: string; counts?: Partial<Record<Status, number>>; line?: string; foot?: string;
}) {
  return (
    <>
      <div className={s.tipTitle}>{title}</div>
      {line && <div>{line}</div>}
      {counts && STATUSES.filter(k => (counts[k] ?? 0) > 0).map(k => (
        <div key={k} className={s.tipRow}><i className={`${s.sw} ${s[k]}`} />{STATUS_LABEL[k]}<b>{counts[k]}</b></div>
      ))}
      {foot && <div className={s.tipFoot}>{foot}</div>}
    </>
  );
}

// ── Número que cuenta hacia arriba al aparecer ──────────────────────────────────
export function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 1000);
      setShown(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    setShown(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{shown}</>;
}

// ── Ancho real de un contenedor (para dibujar SVG sin deformar) ─────────────────
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

// ── Tarjeta plegable (arranca cerrada; recuerda lo que eligió el usuario) ───────
export function FoldCard({ storageKey, icon, title, peek, children }: {
  storageKey: string; icon: ReactNode; title: string; peek: string; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  useEffect(() => {
    try { setOpen(localStorage.getItem(storageKey) === '1'); } catch { /* sin almacenamiento: cerrada */ }
  }, [storageKey]);
  function toggle() {
    setOpen(o => {
      const next = !o;
      try { localStorage.setItem(storageKey, next ? '1' : '0'); } catch { /* ignorar */ }
      return next;
    });
  }
  return (
    <section className={`${s.card} ${s.fold}`}>
      <button type="button" className={s.foldHead} aria-expanded={open} aria-controls={id} onClick={toggle}>
        <span>
          <span className={s.h3}><span className={s.hico}>{icon}</span>{title}</span>
          <span className={s.peek}>{peek}</span>
        </span>
        <IconChevronDown className={s.chev} />
      </button>
      {open && <div id={id} className={s.foldBody}>{children}</div>}
    </section>
  );
}
