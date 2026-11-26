'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { supabase } from '@/lib/supabase';
import { loadActivities } from '@/lib/load-activities';
import { useCompany } from '@/lib/company-context';
import { useSession } from '@/lib/session-context';
import {
  buildTrend, buildWeekReport, currentMonday, mondayOf, reportRange, toDateStr, weekLabel,
  type ReportActivity, type ReportCompletion, type ReportEmployee,
} from '@/lib/reports';
import { buildInsights, dailyPeek, trendPeek } from '@/lib/report-insights';
import { fetchAllPages } from '@/lib/fetch-all';
import { downloadReportPdf } from '@/lib/report-pdf';
import { FoldCard, TipProvider } from '@/components/panel/ui';
import WeekPicker from '@/components/panel/WeekPicker';
import SummaryCard from '@/components/reportes/SummaryCard';
import InsightsCard from '@/components/reportes/InsightsCard';
import PeopleCard from '@/components/reportes/PeopleCard';
import MissedCard from '@/components/reportes/MissedCard';
import OptionalCard from '@/components/reportes/OptionalCard';
import DailyChart from '@/components/reportes/DailyChart';
import TrendChart from '@/components/reportes/TrendChart';
import BitacorasCard from '@/components/reportes/BitacorasCard';
import { bitacoraSummary, bitacorasPeek, validWeek, type BitSummary, type SumActivity, type SumMark, type SumRun } from '@/lib/bitacora-summary';
import { IconBars, IconCheck, IconDownload, IconTrend } from '@/components/panel/icons';
import s from '@/components/panel/panel.module.css';

/** El día de hoy en Matamoros (AAAA-MM-DD). */
const shopToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Matamoros' });

interface Loaded {
  key: string;
  weekStart: Date;
  loadedAt: Date;
  activities: ReportActivity[];
  completions: ReportCompletion[];
  employees: ReportEmployee[];
}

export default function ReportesPage() {
  const { current: company } = useCompany();
  const { role } = useSession();
  const isAdmin = role === 'admin';
  const [weekStart, setWeekStart] = useState<Date>(currentMonday);
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [generating, setGenerating] = useState(false);

  const { from, to } = reportRange(weekStart);
  const key = `${company?.id ?? ''}|${from}`;

  // Al regresar de una bitácora (?semana=AAAA-MM-DD) se abre esa semana.
  useEffect(() => {
    const w = validWeek(new URLSearchParams(window.location.search).get('semana'), toDateStr(currentMonday()));
    if (w) setWeekStart(new Date(`${w}T00:00:00`));
  }, []);

  // Bitácoras de las listas con firma (sólo admin): resumen de lunes a sábado de la semana elegida.
  const [bits, setBits] = useState<{ key: string; rows: BitSummary[] | null; error: string | null }>({ key: '', rows: null, error: null });
  useEffect(() => {
    if (!company || !isAdmin) return;
    let alive = true;
    const wk = toDateStr(weekStart);
    const sat = toDateStr(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 5));
    (async () => {
      const runs = await supabase.from('checklist_runs').select('id, activity_id, scheduled_date, status')
        .eq('company_id', company.id).gte('scheduled_date', wk).lte('scheduled_date', sat);
      if (runs.error) { if (alive) setBits({ key, rows: null, error: runs.error.message }); return; }
      const runRows = (runs.data ?? []) as SumRun[];
      const runActs = [...new Set(runRows.map(r => r.activity_id))];
      const none = { data: [] as never[], error: null };
      const [on, extra, marks] = await Promise.all([
        supabase.from('activities').select('id, title, days_of_week')
          .eq('company_id', company.id).eq('checklist_enabled', true).is('archived_at', null),
        // Las que se apagaron después pero sí tuvieron listas esa semana.
        runActs.length ? supabase.from('activities').select('id, title, days_of_week').in('id', runActs) : Promise.resolve(none),
        runRows.length ? supabase.from('checklist_marks').select('run_id').in('run_id', runRows.map(r => r.id)).eq('state', 'skipped') : Promise.resolve(none),
      ]);
      const err = on.error ?? extra.error ?? marks.error;
      if (!alive) return;
      if (err) { setBits({ key, rows: null, error: err.message }); return; }
      const acts = new Map<string, SumActivity>();
      for (const a of [...(on.data ?? []), ...(extra.data ?? [])] as SumActivity[]) acts.set(a.id, a);
      // Cada lista cuenta desde que empezó su rol (una creada el miércoles no debe el lunes).
      if (acts.size) {
        const rot = await supabase.from('activity_rotations').select('activity_id, valid_from').in('activity_id', [...acts.keys()]);
        if (!alive) return;
        if (rot.error) { setBits({ key, rows: null, error: rot.error.message }); return; }
        for (const r of (rot.data ?? []) as { activity_id: string; valid_from: string }[]) {
          const a = acts.get(r.activity_id);
          if (a && (!a.start || r.valid_from < a.start)) a.start = r.valid_from;
        }
      }
      setBits({ key, rows: bitacoraSummary([...acts.values()], runRows, (marks.data ?? []) as SumMark[], wk, shopToday()), error: null });
    })();
    return () => { alive = false; };
  }, [company, isAdmin, key, weekStart]);

  useEffect(() => {
    if (!company) return;
    let alive = true;
    setError(null);
    (async () => {
      try {
        const [activities, emps] = await Promise.all([
          loadActivities(supabase, company.id, { from, to }) as Promise<ReportActivity[]>,
          supabase.from('employees')
            .select('id, name, initials')
            .eq('is_active', true).eq('company_id', company.id).order('name'),
        ]);
        if (emps.error) throw new Error(emps.error.message);
        const ids = activities.map(a => a.id);
        // Sólo las 12 semanas que se pintan, en orden y por páginas:
        // la base nunca entrega más de 1,000 filas por consulta y no avisa.
        const completions = ids.length === 0 ? [] : await fetchAllPages<ReportCompletion>((f, t) =>
          supabase.from('completions')
            .select('activity_id, employee_id, scheduled_date, was_late')
            .in('activity_id', ids)
            .gte('scheduled_date', from)
            .lte('scheduled_date', to)
            .order('scheduled_date')
            .order('id')
            .range(f, t));
        if (alive) {
          setData({ key, weekStart, loadedAt: new Date(), activities, completions, employees: (emps.data ?? []) as ReportEmployee[] });
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'error desconocido');
      }
    })();
    return () => { alive = false; };
  }, [company, key, from, to, weekStart, attempt]);

  // Letras de inventario terminadas por persona en la semana (no entran al %: sólo se enseñan).
  const [invLetters, setInvLetters] = useState<{ key: string; counts: Record<string, number> }>({ key: '', counts: {} });
  useEffect(() => {
    if (!company) return;
    let alive = true;
    const start = new Date(weekStart);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);
    supabase.from('inventory_sections').select('done_by')
      .eq('company_id', company.id).eq('status', 'done')
      .gte('done_at', start.toISOString()).lt('done_at', end.toISOString())
      .then(({ data: rows, error: e }) => {
        if (!alive) return;
        const counts: Record<string, number> = {};
        if (!e) for (const r of (rows ?? []) as { done_by: string | null }[]) if (r.done_by) counts[r.done_by] = (counts[r.done_by] ?? 0) + 1;
        setInvLetters({ key, counts });
      });
    return () => { alive = false; };
  }, [company, key, weekStart]);

  const loading = !data || data.key !== key;
  const report = useMemo(
    () => (data ? buildWeekReport(data.weekStart, data.activities, data.completions, data.employees, data.loadedAt) : null),
    [data],
  );
  const trend = useMemo(
    () => (data ? buildTrend(data.weekStart, data.activities, data.completions, data.employees, data.loadedAt) : []),
    [data],
  );
  const prevPct = trend.length >= 2 ? trend[trend.length - 2].pct : null;
  const insights = useMemo(() => (report ? buildInsights(report, prevPct, isAdmin) : []), [report, prevPct, isAdmin]);
  const isCurrent = !!data && data.weekStart.getTime() === mondayOf(data.loadedAt).getTime();
  const weekKey = data ? toDateStr(data.weekStart) : '';
  // Mientras carga otra semana de la misma empresa, la anterior se queda atenuada.
  // Si cambió la empresa o hubo error, no se enseñan números que no corresponden.
  const shown = report && !error && data!.key.startsWith(`${company?.id ?? ''}|`) ? report : null;

  async function handleDownload() {
    if (!report) return;
    setGenerating(true);
    try {
      await downloadReportPdf({ report, insights, companyName: company?.name ?? 'Actividades', showCounts: isAdmin });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <AdminShell>
      <div className={s.page}>
        <TipProvider>
          <header className={s.top}>
            <div>
              <div className={s.eyebrow}><i />{company?.name ?? 'Actividades'} · Actividades</div>
              <h1 className={s.title}>Reportes</h1>
              <div className={s.sub} suppressHydrationWarning>Semana del {weekLabel(weekStart)}</div>
            </div>
            <div className={s.tools}>
              <WeekPicker weekStart={weekStart} onChange={setWeekStart} />
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={handleDownload} disabled={!report || loading || generating}>
                <IconDownload />{generating ? 'Generando…' : 'PDF'}
              </button>
            </div>
          </header>

          <div className={s.content} style={{ opacity: loading && shown ? 0.55 : 1 }} aria-busy={loading}>
            {error && (
              <div className={s.error}>
                No se pudo cargar el reporte ({error}).
                <button type="button" className={`${s.btn} ${s.btnSoft}`} onClick={() => setAttempt(n => n + 1)}>Reintentar</button>
              </div>
            )}
            {!shown ? (
              !error && <p className={s.loading}>Cargando reporte…</p>
            ) : (
              <>
                <div className={s.bento}>
                  <SummaryCard key={weekKey} report={shown} prevPct={prevPct} isCurrent={isCurrent} />
                  <InsightsCard insights={insights} />
                </div>
                <PeopleCard key={`p${weekKey}`} people={shown.people} generalMiss={shown.generalMiss} showCounts={isAdmin}
                  inventoryLetters={invLetters.key === key ? invLetters.counts : {}} />
                <MissedCard missed={shown.missed} hasDue={shown.due > 0} today={toDateStr(data!.loadedAt)} />
                <OptionalCard rows={shown.optional} />
                <div className={s.divider}>Más detalle</div>
                {isAdmin && bits.key === key && (
                  <FoldCard storageKey="lf_rep_open_bitacoras" icon={<IconCheck />} title="Bitácoras"
                    peek={bits.error ? 'No se pudieron cargar' : bitacorasPeek(bits.rows ?? [])}>
                    {bits.error
                      ? <div className={s.error}>No se pudieron cargar las bitácoras ({bits.error}).</div>
                      : <BitacorasCard rows={bits.rows ?? []} week={toDateStr(weekStart)} />}
                  </FoldCard>
                )}
                <FoldCard storageKey="lf_rep_open_daily" icon={<IconBars />} title="Día por día" peek={dailyPeek(shown)}>
                  <DailyChart key={weekKey} days={shown.days} />
                </FoldCard>
                <FoldCard storageKey="lf_rep_open_trend" icon={<IconTrend />} title="Semanas pasadas" peek={trendPeek(trend)}>
                  <TrendChart key={weekKey} points={trend} current={isCurrent} onSelect={setWeekStart} />
                </FoldCard>
              </>
            )}
          </div>
        </TipProvider>
      </div>
    </AdminShell>
  );
}
