'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { useCompany } from '@/lib/company-context';
import type { SignRun } from '@/lib/checklist-types';
import { shortDate, titleCase } from '@/lib/checklist-mail';
import SignDialog from '@/components/firmas/SignDialog';
import s from '@/components/panel/panel.module.css';
import v from '@/components/firmas/firmas.module.css';
import { getRun, listToSign, returnRun, signRun } from './actions';

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Matamoros' });
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Por firmar: listas terminadas (como LIMPIEZA) que esperan tu firma (supabase/010). */
export default function FirmasPage() {
  const { current: company } = useCompany();
  const [runs, setRuns] = useState<SignRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<SignRun | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!company) return;
    const r = await listToSign(company.id);
    if (!r.ok) { setError(r.error); return; }
    setError(null);
    setRuns(r.runs);
  }, [company]);

  useEffect(() => { load(); }, [load]);

  // El botón del correo trae ?run=<id>: se abre esa lista aunque ya esté firmada.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('run');
    if (!id) return;
    getRun(id).then(r => { if (r.ok) setOpen(r.run); else setError(r.error); });
  }, []);

  function close() {
    setOpen(null);
    if (window.location.search) window.history.replaceState(null, '', '/firmas');
  }

  async function sign() {
    if (!open) return { ok: false as const, error: 'Sin lista' };
    const r = await signRun(open.id);
    if (r.ok) { setFlash(`Firmaste ${open.activityTitle} de ${titleCase(open.employeeName)}.`); close(); await load(); }
    return r;
  }
  async function giveBack(itemIds: string[], note: string) {
    if (!open) return { ok: false as const, error: 'Sin lista' };
    const r = await returnRun(open.id, itemIds, note);
    if (r.ok) { setFlash(`Regresaste ${open.activityTitle} a ${titleCase(open.employeeName)}. Le llegó un aviso a su teléfono.`); close(); await load(); }
    return r;
  }

  return (
    <AdminShell>
      <div className={s.page}>
        <header className={s.top}>
          <div>
            <div className={s.eyebrow}><i />{company?.name ?? 'Actividades'} · Por firmar</div>
            <h1 className={s.title}>Por firmar</h1>
            <div className={s.sub}>Listas terminadas que esperan tu firma. Cuentan con la hora en que las terminaron.</div>
          </div>
        </header>
        <div className={s.content}>
          {flash && <div className={`${v.banner} ${v.bannerOk}`} role="status">{flash}</div>}
          {error && <div className={s.error}>{error}</div>}
          {!runs && !error && <p className={s.loading}>Cargando…</p>}
          {runs && runs.length === 0 && <div className={v.empty}>No hay nada por firmar. Cuando alguien termine una lista, aparece aquí y te llega un correo.</div>}
          {runs && runs.length > 0 && (
            <div className={v.list}>
              {runs.map(r => {
                const skipped = r.marks.filter(m => m.state === 'skipped').length;
                const photos = r.marks.filter(m => m.photoUrl).length;
                return (
                  <button key={r.id} type="button" className={v.item} onClick={() => { setFlash(null); setOpen(r); }}>
                    <div className={v.itemTop}>
                      <b>{r.activityTitle}</b>
                      {r.wasLate && <span className={`${v.chip} ${v.late}`}>Tarde</span>}
                    </div>
                    <span className={v.meta}>
                      {titleCase(r.employeeName)} · {cap(shortDate(r.scheduledDate))}{r.finishedAt ? ` · terminó ${hhmm(r.finishedAt)}` : ''}
                    </span>
                    <div className={v.chips}>
                      <span className={v.chip}>{r.marks.length} tareas</span>
                      {skipped > 0 && <span className={`${v.chip} ${v.late}`}>{skipped} no se {skipped === 1 ? 'pudo' : 'pudieron'}</span>}
                      {photos > 0 && <span className={v.chip}>{photos} {photos === 1 ? 'foto' : 'fotos'}</span>}
                      {r.returnNote && <span className={v.chip}>La habías regresado</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {open && <SignDialog run={open} onClose={close} onSign={sign} onReturn={giveBack} />}
    </AdminShell>
  );
}
