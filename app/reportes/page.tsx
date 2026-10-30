'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { supabase } from '@/lib/supabase';
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
import DailyChart from '@/components/reportes/DailyChart';
import TrendChart from '@/components/reportes/TrendChart';
import { IconBars, IconDownload, IconTrend } from '@/components/panel/icons';
import s from '@/components/panel/panel.module.css';

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

  useEffect(() => {
    if (!company) return;
    let alive = true;
    setError(null);
    (async () => {
      try {
        const [acts, emps] = await Promise.all([
          supabase.from('activities')
            .select('id, title, limit_time, days_of_week, week_of_month, assigned_employee_ids, created_at')
            .eq('company_id', company.id)
            .or('is_active.eq.true,week_of_month.not.is.null'),
          supabase.from('employees')
            .select('id, name, initials')
            .eq('is_active', true).eq('company_id', company.id).order('name'),
        ]);
        if (acts.error) throw new Error(acts.error.message);
        if (emps.error) throw new Error(emps.error.message);
        const activities = (acts.data ?? []) as ReportActivity[];
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
                <PeopleCard key={`p${weekKey}`} people={shown.people} generalMiss={shown.generalMiss} showCounts={isAdmin} />
                <MissedCard missed={shown.missed} hasDue={shown.due > 0} today={toDateStr(data!.loadedAt)} />
                <div className={s.divider}>Más detalle</div>
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
