'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import AdminShell from '@/components/AdminShell';
import { supabase, Activity, Completion, Employee } from '@/lib/supabase';
import { useCompany } from '@/lib/company-context';
import {
  computeWeek, weekStartFromInput, weekInputValue, weekLabel, currentMonday,
  mondayOf, pctOf, toDateStr, rangeStats, type ReportData,
} from '@/lib/reports';
import { DailyChart, TrendChart, ChartTypeToggle, type DailyType, type TrendType, type TrendPoint } from '@/components/ReportCharts';

type Granularity = 'weeks' | 'months' | 'years';
const MONTHS_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// ── Colores de estado ──────────────────────────────────────────────────────────
const GREEN = '#0F9D58';   // a tiempo / realizada
const AMBER = '#F2A20C';   // tarde (relleno)
const AMBER_TX = '#B26A00'; // tarde (texto sobre blanco, más contraste)
const RED = '#E11D2E';     // no realizada

function rateColor(rate: number) {
  if (rate < 70) return RED;
  if (rate < 90) return AMBER;
  return GREEN;
}

// ── Leyenda reutilizable ────────────────────────────────────────────────────────
function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
      {items.map(([label, color]) => (
        <span key={label} className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: '#6E6E73' }}>
          <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

// ── Tarjeta plegable ────────────────────────────────────────────────────────────
function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6E6E73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform .2s' }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CollapsibleCard({ storageKey, title, children }: { storageKey: string; title: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(storageKey) !== '0';
  });
  function toggle() {
    setOpen(o => {
      const next = !o;
      try { localStorage.setItem(storageKey, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  }
  return (
    <div className="rounded-xl border" style={{ background: '#fff', borderColor: '#E4E4E7' }}>
      <button
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-5 py-4 text-left"
      >
        <div className="text-[14px] font-bold">{title}</div>
        <Chevron open={open} />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

// ── PDF ───────────────────────────────────────────────────────────────────────

async function downloadPDF(data: ReportData, label: string, weekStart: Date) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const pct = data.total > 0 ? Math.round(data.done / data.total * 100) : 0;
  const onTime = data.done - data.late;

  // Header
  doc.setFillColor(15, 15, 16);
  doc.rect(0, 0, W, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text('LA FERRE · REPORTE SEMANAL', 14, 13);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 180);
  doc.text(`Semana del ${label}`, 14, 20);
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 14, 26);

  // Compliance banner
  doc.setFillColor(225, 29, 46);
  doc.roundedRect(14, 36, W - 28, 22, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26); doc.setFont('helvetica', 'bold');
  doc.text(`${pct}%`, 20, 52);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text('Cumplimiento general', 44, 46);
  doc.setFontSize(9);
  doc.text(`${onTime} a tiempo · ${data.late} tarde · ${data.missed} no realizadas · ${data.total} total`, 44, 53);

  // By employee
  let y = 68;
  doc.setTextColor(15, 15, 16);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('Cumplimiento por empleado', 14, y); y += 5;

  for (const e of data.byEmployee) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.setTextColor(15, 15, 16);
    doc.text(e.name, 14, y + 5);
    const tot = e.done + e.missed;
    doc.setTextColor(100, 100, 100);
    doc.text(tot > 0 ? `${e.done}/${tot} · ${e.rate}%` : 'sin actividades', W - 14 - 30, y + 5);
    if (tot > 0) {
      doc.setFillColor(240, 240, 244);
      doc.roundedRect(66, y, W - 14 - 66 - 32, 5, 1, 1, 'F');
      const [r, g, b] = e.rate < 70 ? [225, 29, 46] : e.rate < 90 ? [242, 162, 12] : [15, 157, 88];
      doc.setFillColor(r, g, b);
      doc.roundedRect(66, y, Math.max(2, ((W - 14 - 66 - 32) * e.rate) / 100), 5, 1, 1, 'F');
    }
    y += 11;
  }

  // Missed list
  y += 4;
  doc.setTextColor(15, 15, 16);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text(`Actividades no realizadas (${data.missed})`, 14, y); y += 5;

  if (data.missed_list.length === 0) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('¡Sin actividades perdidas esta semana!', 14, y + 4); y += 10;
  } else {
    for (const m of data.missed_list) {
      if (y > 270) { doc.addPage(); y = 14; }
      doc.setFillColor(252, 231, 233);
      doc.roundedRect(14, y, W - 28, 10, 2, 2, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
      doc.setTextColor(225, 29, 46);
      doc.text('NO REALIZADA', W - 14 - 26, y + 6.5);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 15, 16);
      doc.text(m.title, 18, y + 4);
      doc.setTextColor(100, 100, 100); doc.setFontSize(7.5);
      doc.text(`${m.date} · ${m.assignee}`, 18, y + 8.5);
      y += 13;
    }
  }

  doc.save(`reporte-laferre-${toDateStr(weekStart)}.pdf`);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReportesPage() {
  const { current: company } = useCompany();
  const [loading, setLoading]     = useState(true);
  const [generating, setGenerating] = useState(false);
  const [weekStart, setWeekStart]   = useState<Date>(currentMonday);
  const [dailyType, setDailyTypeState] = useState<DailyType>('stacked');
  const [trendType, setTrendTypeState] = useState<TrendType>('line');
  const [granularity, setGranularityState] = useState<Granularity>('weeks');
  const [activities, setActivities]       = useState<Activity[]>([]);
  const [allCompletions, setAllCompletions] = useState<Completion[]>([]);
  const [employees, setEmployees]         = useState<Employee[]>([]);

  const load = useCallback(async () => {
    if (!company) return;
    setLoading(true);

    const { data: firstRow } = await supabase
      .from('completions').select('scheduled_date')
      .order('scheduled_date', { ascending: true }).limit(1);
    const firstDate = firstRow?.[0]?.scheduled_date ?? toDateStr(currentMonday());
    const firstMon = mondayOf(new Date(firstDate + 'T12:00:00'));

    const [{ data: acts }, { data: comps }, { data: emps }] = await Promise.all([
      supabase.from('activities').select('*').eq('is_active', true).eq('company_id', company.id),
      supabase.from('completions').select('*').gte('scheduled_date', toDateStr(firstMon)),
      supabase.from('employees').select('*').eq('is_active', true).eq('company_id', company.id),
    ]);

    setActivities((acts ?? []) as Activity[]);
    setAllCompletions((comps ?? []) as Completion[]);
    setEmployees((emps ?? []) as Employee[]);
    setLoading(false);
  }, [company]);

  useEffect(() => { load(); }, [load]);

  // Recupera el tipo de gráfico elegido por el usuario.
  useEffect(() => {
    const d = localStorage.getItem('lf_report_daily_type');
    if (d === 'stacked' || d === 'grouped' || d === 'lines') setDailyTypeState(d);
    const t = localStorage.getItem('lf_report_trend_type');
    if (t === 'bars' || t === 'line' || t === 'area') setTrendTypeState(t);
    const g = localStorage.getItem('lf_report_granularity');
    if (g === 'weeks' || g === 'months' || g === 'years') setGranularityState(g);
  }, []);

  const setDailyType = (t: DailyType) => { setDailyTypeState(t); try { localStorage.setItem('lf_report_daily_type', t); } catch { /* ignore */ } };
  const setTrendType = (t: TrendType) => { setTrendTypeState(t); try { localStorage.setItem('lf_report_trend_type', t); } catch { /* ignore */ } };
  const setGranularity = (g: Granularity) => { setGranularityState(g); try { localStorage.setItem('lf_report_granularity', g); } catch { /* ignore */ } };

  const data: ReportData | null = useMemo(
    () => loading ? null : computeWeek(weekStart, activities, allCompletions, employees),
    [loading, weekStart, activities, allCompletions, employees],
  );

  const trend = useMemo<TrendPoint[]>(() => {
    if (loading || allCompletions.length === 0) return [];
    const dates = allCompletions.map(c => c.scheduled_date).sort();
    const first = new Date(dates[0] + 'T12:00:00');
    const today = new Date(); today.setHours(12, 0, 0, 0);
    const out: TrendPoint[] = [];

    if (granularity === 'weeks') {
      // Mismo cálculo que el reporte de la semana (7 días) para que al hacer clic coincida.
      for (let m = mondayOf(first); m <= currentMonday(); m.setDate(m.getDate() + 7)) {
        const mon = new Date(m);
        const pct = pctOf(computeWeek(mon, activities, allCompletions, employees));
        out.push({ key: toDateStr(mon), label: `${mon.getDate()}/${mon.getMonth() + 1}`, tooltip: `Semana del ${weekLabel(mon)} · ${pct}%`, start: mon, pct });
      }
    } else if (granularity === 'months') {
      for (let m = new Date(first.getFullYear(), first.getMonth(), 1); m <= today; m.setMonth(m.getMonth() + 1)) {
        const s = new Date(m.getFullYear(), m.getMonth(), 1);
        let e = new Date(m.getFullYear(), m.getMonth() + 1, 0); if (e > today) e = today;
        const { done, total } = rangeStats(s, e, activities, allCompletions);
        const pct = total > 0 ? Math.round(done / total * 100) : 0;
        out.push({ key: `${s.getFullYear()}-${s.getMonth()}`, label: `${MONTHS_ABBR[s.getMonth()]} ${String(s.getFullYear()).slice(2)}`, tooltip: `${MONTHS_ABBR[s.getMonth()]} ${s.getFullYear()} · ${pct}%`, start: mondayOf(s), pct });
      }
    } else {
      for (let y = first.getFullYear(); y <= today.getFullYear(); y++) {
        const s = new Date(y, 0, 1); let e = new Date(y, 11, 31); if (e > today) e = today;
        const { done, total } = rangeStats(s, e, activities, allCompletions);
        const pct = total > 0 ? Math.round(done / total * 100) : 0;
        out.push({ key: `${y}`, label: `${y}`, tooltip: `Año ${y} · ${pct}%`, start: mondayOf(new Date(y, 0, 1)), pct });
      }
    }
    return out;
  }, [loading, granularity, activities, allCompletions, employees]);

  const trendSelectedKey =
    granularity === 'weeks'  ? toDateStr(mondayOf(weekStart))
    : granularity === 'months' ? `${weekStart.getFullYear()}-${weekStart.getMonth()}`
    : `${weekStart.getFullYear()}`;

  const pct    = data ? pctOf(data) : 0;
  const label  = weekLabel(weekStart);

  const onTime    = data ? data.done - data.late : 0;
  const empWith    = data ? data.byEmployee.filter(e => e.done + e.missed > 0) : [];
  const empWithout = data ? data.byEmployee.filter(e => e.done + e.missed === 0) : [];

  async function handleDownload() {
    if (!data) return;
    setGenerating(true);
    await downloadPDF(data, label, weekStart);
    setGenerating(false);
  }

  return (
    <AdminShell>
      {/* Topbar */}
      <div className="flex items-center justify-between gap-3 border-b px-4 py-4 md:px-7 md:py-5" style={{ borderColor: '#E4E4E7', background: '#fff' }}>
        <div className="min-w-0">
          <h1 className="text-[18px] md:text-[22px] font-extrabold tracking-tight">Reportes y estadísticas</h1>
          <p className="mt-0.5 text-[11px] md:text-[12px]" style={{ color: '#6E6E73' }}>Semana del {label} · resumen automático</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
        <input
          type="week"
          value={weekInputValue(weekStart)}
          onChange={e => { if (e.target.value) setWeekStart(weekStartFromInput(e.target.value)); }}
          className="rounded-[9px] border px-3 py-2 text-[12px] md:text-[13px] font-semibold"
          style={{ borderColor: '#E4E4E7', background: '#fff', color: '#0F0F10' }}
        />
        <button
          onClick={handleDownload}
          disabled={loading || generating}
          className="shrink-0 whitespace-nowrap rounded-[9px] border px-3 py-2 md:px-[14px] md:py-[9px] text-[12px] md:text-[13px] font-semibold transition-opacity"
          style={{ borderColor: '#E4E4E7', background: '#fff', opacity: loading || generating ? 0.5 : 1 }}
        >
          {generating ? 'Generando...' : '↓ Descargar PDF'}
        </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-7">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-[13px]" style={{ color: '#A8A8AD' }}>Cargando reporte...</p>
          </div>
        ) : data && (
          <>
            {/* Resumen en palabras */}
            <div className="mb-4 rounded-[14px] border p-4 md:p-5" style={{ background: '#fff', borderColor: '#E4E4E7' }}>
              <p className="text-[13px] md:text-[15px] leading-relaxed" style={{ color: '#0F0F10' }}>
                Esta semana se cumplieron <b>{data.done} de {data.total}</b> actividades (<b style={{ color: rateColor(pct) }}>{pct}%</b>).{' '}
                {data.missed > 0
                  ? <>Quedaron <b style={{ color: RED }}>{data.missed} sin hacer</b></>
                  : <>No quedó <b style={{ color: GREEN }}>ninguna sin hacer</b></>}
                {data.late > 0 ? <> y <b style={{ color: AMBER_TX }}>{data.late} se hicieron tarde</b>.</> : <>.</>}
              </p>
            </div>

            {/* Hero: % + 3 categorías que suman el total */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.1fr_2fr]">
              <div className="flex flex-col justify-center rounded-[14px] p-5 md:p-6 text-white" style={{ background: '#0F0F10' }}>
                <p className="text-[10px] font-bold uppercase tracking-[1.5px]" style={{ color: 'rgba(255,255,255,.5)' }}>Cumplimiento</p>
                <p className="mt-1 text-[48px] md:text-[56px] font-extrabold leading-none tracking-[-2px]">{pct}<span className="text-[22px]">%</span></p>
                <p className="mt-1.5 text-[12px]" style={{ color: 'rgba(255,255,255,.6)' }}>{data.done} de {data.total} actividades</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,.15)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: rateColor(pct) }} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'A tiempo',      value: onTime,      color: GREEN, hint: 'dentro de hora' },
                  { label: 'Tarde',         value: data.late,   color: AMBER, hint: 'fuera de hora' },
                  { label: 'No realizadas', value: data.missed, color: RED,   hint: 'no se hicieron' },
                ].map(s => (
                  <div key={s.label} className="flex flex-col rounded-[14px] border p-4" style={{ background: '#fff', borderColor: '#E4E4E7' }}>
                    <span className="mb-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                    <p className="text-[28px] md:text-[36px] font-extrabold leading-none tracking-[-1px]" style={{ color: s.color }}>{s.value}</p>
                    <p className="mt-1.5 text-[12px] font-bold leading-tight">{s.label}</p>
                    <p className="mt-0.5 text-[10px] leading-tight" style={{ color: '#9A9A9F' }}>{s.hint}</p>
                  </div>
                ))}
              </div>
            </div>
            <p className="mb-5 mt-2 text-[11px]" style={{ color: '#A8A8AD' }}>
              A tiempo + Tarde + No realizadas = {data.total} actividades programadas en la semana.
            </p>

            {/* Two columns */}
            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* By employee */}
              <CollapsibleCard storageKey="lf_report_open_emp" title="Cumplimiento por empleado">
                {empWith.length === 0 ? (
                  <p className="py-4 text-center text-[13px]" style={{ color: '#A8A8AD' }}>Nadie tuvo actividades asignadas esta semana.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {empWith.map(e => (
                      <div key={e.name}>
                        <div className="mb-1.5 flex justify-between text-[12px]">
                          <span className="font-semibold">{e.name}</span>
                          <span className="font-bold" style={{ color: rateColor(e.rate), fontFamily: 'monospace' }}>{e.rate}% · {e.done}/{e.done + e.missed}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full" style={{ background: '#F2F2F4' }}>
                          <div className="h-full rounded-full" style={{ width: `${e.rate}%`, background: rateColor(e.rate) }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {empWithout.length > 0 && (
                  <p className="mt-3.5 border-t pt-3 text-[11px] leading-relaxed" style={{ borderColor: '#F2F2F4', color: '#A8A8AD' }}>
                    Sin actividades asignadas esta semana: {empWithout.map(e => e.name).join(', ')}.
                  </p>
                )}
              </CollapsibleCard>

              {/* Missed */}
              <CollapsibleCard
                storageKey="lf_report_open_missed"
                title={<span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: RED }} />Actividades no realizadas ({data.missed})</span>}
              >
                {data.missed_list.length === 0 ? (
                  <p className="py-4 text-center text-[13px]" style={{ color: '#A8A8AD' }}>¡Sin actividades perdidas esta semana!</p>
                ) : (
                  <div className="flex flex-col">
                    {data.missed_list.map((m, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 py-2.5" style={{ borderTop: i === 0 ? 'none' : '1px solid #F2F2F4' }}>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold">{m.title}</p>
                          <p className="mt-0.5 text-[11px]" style={{ color: '#6E6E73' }}>{m.date} · {m.assignee}</p>
                        </div>
                        <span className="shrink-0 rounded-full px-2 py-1 text-[10px] font-bold" style={{ background: '#FCE7E9', color: RED }}>NO REALIZADA</span>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleCard>
            </div>

            {/* Bar chart por día */}
            <CollapsibleCard storageKey="lf_report_open_daily" title="Actividades por día">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <ChartTypeToggle value={dailyType} onChange={setDailyType}
                  options={[['stacked', 'Apiladas'], ['grouped', 'Agrupadas'], ['lines', 'Líneas']]} />
                <Legend items={[['A tiempo', GREEN], ['Tarde', AMBER], ['No realizadas', RED]]} />
              </div>
              <DailyChart daily={data.daily} type={dailyType} />
            </CollapsibleCard>

            {/* Trend */}
            {trend.length > 0 && (
              <div className="mt-4">
              <CollapsibleCard storageKey="lf_report_open_trend" title="Tendencia de cumplimiento (%)">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <ChartTypeToggle value={trendType} onChange={setTrendType}
                      options={[['line', 'Línea'], ['area', 'Área'], ['bars', 'Barras']]} />
                    <ChartTypeToggle value={granularity} onChange={setGranularity}
                      options={[['weeks', 'Semanas'], ['months', 'Meses'], ['years', 'Años']]} />
                  </div>
                  <Legend items={[['Bien (≥90%)', GREEN], ['Regular (70–89%)', AMBER], ['Bajo (<70%)', RED]]} />
                </div>
                <TrendChart
                  trend={trend}
                  selectedKey={trendSelectedKey}
                  onSelect={m => setWeekStart(m)}
                  type={trendType}
                />
                <p className="mt-2 text-[11px]" style={{ color: '#A8A8AD' }}>Toca un punto para abrir su semana. El período que estás viendo queda resaltado.</p>
              </CollapsibleCard>
              </div>
            )}
          </>
        )}
      </div>
    </AdminShell>
  );
}
