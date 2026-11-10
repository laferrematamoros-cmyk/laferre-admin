'use client';

import { useState } from 'react';
import type { InvPending } from '@/lib/inventory-types';
import s from '@/components/panel/panel.module.css';
import c from '@/components/conoce/co.module.css';
import v from './inv.module.css';
import { shopDate, shopTime } from './labels';
import { dayLabel } from '@/lib/inventory-schedule';

type Result = { ok: true } | { ok: false; error: string };

/** Diferencias que quedaron sin resolver, de todos los inventarios. */
export default function PendingList({ pendings, people, onResolve }: {
  pendings: InvPending[];
  people: Record<string, string>;
  onResolve: (id: string, note: string) => Promise<Result>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (pendings.length === 0) return <div className={c.empty}>No hay pendientes del inventario.</div>;

  async function resolve(id: string) {
    setBusy(true);
    setError(null);
    const r = await onResolve(id, note);
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    setOpenId(null);
    setNote('');
  }

  return (
    <div className={v.pendings}>
      {pendings.map(p => (
        <article key={p.id} className={`${s.card} ${v.pending}`}>
          <div className={v.pendTop}>
            <span className={v.pendCode}>{p.code}</span>
            <p className={v.small}>
              {p.reported_by ? people[p.reported_by] ?? 'Sin nombre' : 'Sin nombre'} · {dayLabel(shopDate(p.reported_at))} {shopTime(p.reported_at)}
            </p>
          </div>
          <p className={v.pendNote}>{p.note}</p>
          {openId === p.id ? (
            <div className={c.field}>
              <label className={c.label} htmlFor={`res-${p.id}`}>¿Cómo se resolvió? (opcional)</label>
              <textarea id={`res-${p.id}`} className={c.input} value={note} maxLength={300}
                onChange={e => setNote(e.target.value)} placeholder="Ej.: se ajustó en Sicar" />
              {error && <p className={c.err}>{error}</p>}
              <div className={c.dFoot}>
                <button type="button" className={c.btn} onClick={() => { setOpenId(null); setError(null); }} disabled={busy}>Cancelar</button>
                <button type="button" className={`${c.btn} ${c.dark}`} onClick={() => resolve(p.id)} disabled={busy}>
                  {busy ? 'Guardando…' : 'Marcar resuelto'}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className={c.btn} onClick={() => { setOpenId(p.id); setNote(''); setError(null); }}>Resuelto</button>
          )}
        </article>
      ))}
    </div>
  );
}
