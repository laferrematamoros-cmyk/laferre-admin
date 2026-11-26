'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/lib/company-context';
import { mondayOf } from '@/lib/duty';
import { buildBitacora, type BitItem, type BitMark, type BitRun } from '@/lib/bitacora';
import { validWeek } from '@/lib/bitacora-summary';
import { downloadBitacoraPdf } from '@/lib/bitacora-pdf';
import { IconCamera, IconDownload, IconLeft, IconRight } from '@/components/panel/icons';
import s from '@/components/panel/panel.module.css';
import v from '@/components/actividades/bitacora.module.css';

const DAY = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const TZ = 'America/Matamoros';
const todayShop = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
/** El día en Matamoros de una hora (no el de UTC). */
const shopDay = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });
const addDays = (d: string, n: number) => {
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, dd + n)).toISOString().slice(0, 10);
};
const dm = (d: string) => new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`)).replace('.', '');
const hm = (iso: string) => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });

interface Loaded { key: string; title: string; items: BitItem[]; runs: BitRun[]; marks: BitMark[]; names: Record<string, string>; }

/** Bitácora semanal de una lista con firma (supabase/010): la hoja de papel, ya llena, con PDF. */
export default function BitacoraPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  // Desde Reportes llega con ?semana=AAAA-MM-DD&desde=reportes: abre esa semana y ofrece regresar.
  const fromReports = search.get('desde') === 'reportes';
  const { current: company } = useCompany();
  const [week, setWeek] = useState(() => validWeek(search.get('semana'), mondayOf(todayShop())) ?? mondayOf(todayShop()));
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const key = `${company?.id ?? ''}|${id}|${week}`;
  const thisWeek = mondayOf(todayShop());

  useEffect(() => {
    if (!company || !id) return;
    let alive = true;
    (async () => {
      const [act, items, runs, emps] = await Promise.all([
        supabase.from('activities').select('title').eq('id', id).eq('company_id', company.id).maybeSingle(),
        supabase.from('checklist_items').select('id, area, label, days, sort, archived_at').eq('activity_id', id),
        supabase.from('checklist_runs')
          .select('id, scheduled_date, employee_id, status, finished_at, signed_at, signed_by_name, signed_via')
          .eq('activity_id', id).gte('scheduled_date', week).lte('scheduled_date', addDays(week, 6)),
        supabase.from('employees').select('id, name').eq('company_id', company.id),
      ]);
      const err = act.error ?? items.error ?? runs.error ?? emps.error;
      if (!alive) return;
      if (err) { setError(err.message); return; }
      if (!act.data) { setError('No se encontró esta actividad.'); return; }
      const runRows = (runs.data ?? []) as BitRun[];
      let marks: BitMark[] = [];
      if (runRows.length) {
        const m = await supabase.from('checklist_marks')
          .select('run_id, item_id, area, label, sort, state, reason, marked_by, photo_path').in('run_id', runRows.map(r => r.id));
        if (m.error) { if (alive) setError(m.error.message); return; }
        marks = (m.data ?? []) as BitMark[];
      }
      if (!alive) return;
      setError(null);
      setData({
        key, title: act.data.title as string, items: (items.data ?? []) as BitItem[], runs: runRows, marks,
        names: Object.fromEntries((emps.data ?? []).map(e => [e.id as string, e.name as string])),
      });
    })();
    return () => { alive = false; };
  }, [company, id, week, key]);

  const bit = useMemo(() => (data ? buildBitacora(week, data.items, data.runs, data.marks, data.names) : null), [data, week]);
  const loading = !data || data.key !== key;
  const today = todayShop();

  async function pdf() {
    if (!bit || !data) return;
    setPdfBusy(true);
    try { await downloadBitacoraPdf({ bitacora: bit, activityTitle: data.title, companyName: company?.name ?? '' }); }
    finally { setPdfBusy(false); }
  }

  return (
    <AdminShell>
      <div className={s.page}>
        <header className={s.top}>
          <div>
            <div className={s.eyebrow}><i />{company?.name ?? 'Actividades'} · Bitácora semanal</div>
            <h1 className={s.title}>{data?.title ?? 'Bitácora'}</h1>
            <div className={s.sub}>Lo que se hizo cada día, quién lo hizo y tu firma.</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {fromReports && <Link href={`/reportes?semana=${week}`} className={s.btn}><IconLeft size={15} /> Reportes</Link>}
            <Link href={`/actividades/${id}`} className={s.btn}>Editar actividad</Link>
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={pdf} disabled={loading || !bit || pdfBusy}>
              <IconDownload size={15} /> {pdfBusy ? 'Armando…' : 'Descargar PDF'}
            </button>
          </div>
        </header>
        <div className={s.content}>
          <div className={v.bar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button type="button" className={s.wbtn} aria-label="Semana anterior" onClick={() => setWeek(w => addDays(w, -7))}><IconLeft size={16} /></button>
              <span className={s.wlabel}>{week === thisWeek ? 'Esta semana' : `Semana del ${dm(week)}`} · {dm(week)} al {dm(addDays(week, 5))}</span>
              <button type="button" className={s.wbtn} aria-label="Semana siguiente" disabled={week >= thisWeek} onClick={() => setWeek(w => addDays(w, 7))}><IconRight size={16} /></button>
            </div>
            <div className={v.legend}>
              <span><span className={v.done}>✓</span> Hecha</span>
              <span><span className={v.skip}>No se pudo</span></span>
              <span><span className={v.none}>—</span> Sin lista ese día</span>
              <span><span className={v.sw} /> No tocaba</span>
            </div>
          </div>

          {error && <div className={s.error}>{error}</div>}
          {loading && !error && <p className={s.loading}>Cargando…</p>}
          {!loading && bit && bit.areas.length === 0 && <div className={s.error}>Esta actividad todavía no tiene tareas en su lista.</div>}
          {!loading && bit && bit.areas.length > 0 && (
            <div className={v.scroll}>
              <table className={v.table}>
                <thead>
                  <tr>
                    <th scope="col">Tarea</th>
                    {bit.days.map(d => <th key={d.date} scope="col" className={d.date === today ? v.today : undefined}>{DAY[d.dow]} {d.date.slice(8, 10)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {bit.areas.map(a => [
                    <tr key={`a-${a.area}`} className={v.area}><td colSpan={7}>{a.area}</td></tr>,
                    ...a.rows.map(r => (
                      <tr key={r.itemId}>
                        <td className={v.task}>{r.label}</td>
                        {r.cells.map((c, i) => (
                          <td key={i} className={`${v.cell} ${c === null ? v.off : ''}`}>
                            {c === null ? null
                              : c.state === 'none' ? <span className={v.none} title="Ese día no hubo lista">—</span>
                              : c.state === 'done' ? <span title={c.by ? `Lo hizo ${c.by}` : undefined}><span className={v.done}>✓</span>{c.photo && <span className={v.cam} title="Con foto"><IconCamera size={13} /></span>}</span>
                              : c.state === 'skipped' ? <span className={v.skip}>No se pudo{c.reason ? `: ${c.reason}` : ''}</span>
                              : <span className={v.pend}>Pendiente</span>}
                          </td>
                        ))}
                      </tr>
                    )),
                  ])}
                </tbody>
                <tfoot>
                  <tr className={v.foot}>
                    <td>La hizo</td>
                    {bit.days.map(d => <td key={d.date} className={d.employee ? undefined : v.muted}>{d.employee ?? '—'}</td>)}
                  </tr>
                  <tr className={v.foot}>
                    <td>Firma</td>
                    {bit.days.map(d => (
                      <td key={d.date}>
                        {d.status === 'signed' && d.signedAt
                          ? <span className={v.signed}>{d.signedBy} · {dm(shopDay(d.signedAt))} {hm(d.signedAt)}{d.signedVia === 'pin' ? ' (PIN)' : ''}</span>
                          : d.status === 'awaiting_signature' ? <Link className={v.wait} href="/firmas">Falta firma</Link>
                          : d.status === 'returned' ? <span className={v.wait}>Regresada</span>
                          : d.status === 'in_progress' ? <span className={v.muted}>Sin terminar</span>
                          : <span className={v.muted}>Sin lista</span>}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
