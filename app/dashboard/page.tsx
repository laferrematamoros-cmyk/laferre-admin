'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import { supabase } from '@/lib/supabase';
import { loadActivities } from '@/lib/load-activities';
import { useCompany } from '@/lib/company-context';
import { useSession } from '@/lib/session-context';
import { toDateStr, type ReportEmployee } from '@/lib/reports';
import { buildToday, type TodayActivity, type TodayCompletion, type TodayRow } from '@/lib/today';
import { TipProvider } from '@/components/panel/ui';
import { IconPlus } from '@/components/panel/icons';
import DaySummary from '@/components/hoy/DaySummary';
import AttentionCard from '@/components/hoy/AttentionCard';
import TodayList from '@/components/hoy/TodayList';
import TeamToday from '@/components/hoy/TeamToday';
import ActivitySheet from '@/components/hoy/ActivitySheet';
import { useRemind } from '@/components/hoy/RemindButton';
import s from '@/components/panel/panel.module.css';
import h from '@/components/hoy/hoy.module.css';

interface Loaded {
  companyId: string;
  now: Date;
  activities: TodayActivity[];
  completions: TodayCompletion[];
  employees: ReportEmployee[];
}

const REFRESH_MS = 60_000;

export default function DashboardPage() {
  const router = useRouter();
  const { current: company } = useCompany();
  const { role } = useSession();
  const isAdmin = role === 'admin';
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const remind = useRemind(company?.id);

  const load = useCallback(async () => {
    if (!company) return;
    const now = new Date();
    try {
      const [activities, emps] = await Promise.all([
        loadActivities(supabase, company.id) as Promise<TodayActivity[]>,
        supabase.from('employees')
          .select('id, name, initials')
          .eq('is_active', true).eq('company_id', company.id).order('name'),
      ]);
      if (emps.error) throw new Error(emps.error.message);
      const ids = activities.map(a => a.id);
      let completions: TodayCompletion[] = [];
      if (ids.length) {
        const c = await supabase.from('completions')
          .select('activity_id, employee_id, scheduled_date, was_late, completed_at, photo_url, note')
          .in('activity_id', ids)
          .eq('scheduled_date', toDateStr(now));
        if (c.error) throw new Error(c.error.message);
        completions = (c.data ?? []) as TodayCompletion[];
      }
      setData({ companyId: company.id, now, activities, completions, employees: (emps.data ?? []) as ReportEmployee[] });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error desconocido');
    }
  }, [company]);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  // Sólo se enseña lo de la empresa elegida (si cambia, no se mezclan datos).
  const shown = data && company && data.companyId === company.id ? data : null;
  const report = useMemo(
    () => (shown ? buildToday(shown.activities, shown.completions, shown.employees, shown.now) : null),
    [shown],
  );
  const open = report && openId ? report.rows.find(r => r.id === openId) ?? null : null;
  const onOpen = useCallback((r: TodayRow) => setOpenId(r.id), []);
  const onClose = useCallback(() => setOpenId(null), []);

  const when = shown?.now ?? new Date();
  const dateLabel = `${when.toLocaleDateString('es-MX', { weekday: 'long' })} ${when.getDate()} de ${when.toLocaleDateString('es-MX', { month: 'long' })}`;
  const timeLabel = shown ? when.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';

  return (
    <AdminShell>
      <div className={s.page}>
        <TipProvider>
          <header className={s.top}>
            <div>
              <div className={s.eyebrow}><i />{company?.name ?? 'Actividades'} · Actividades</div>
              <h1 className={s.title}>Dashboard</h1>
              <div className={s.sub} suppressHydrationWarning>
                Hoy, {dateLabel}{timeLabel && ` · ${timeLabel}`} · se actualiza cada minuto
              </div>
            </div>
            {isAdmin && (
              <div className={s.tools}>
                <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => router.push('/actividades/nueva')}>
                  <IconPlus />Nueva actividad
                </button>
              </div>
            )}
          </header>

          <div className={s.content}>
            {error && (
              <div className={s.error}>
                No se pudo actualizar ({error}).
                <button type="button" className={`${s.btn} ${s.btnSoft}`} onClick={load}>Reintentar</button>
              </div>
            )}
            {!report ? (
              !error && <p className={s.loading}>Cargando el día…</p>
            ) : (
              <>
                <div className={h.grid2}>
                  <DaySummary report={report} now={shown!.now} onOpen={onOpen} />
                  <AttentionCard rows={report.attention} total={report.rows.length} remind={remind} onOpen={onOpen} />
                </div>
                <div className={h.grid2b}>
                  <TodayList rows={report.rows} remind={remind} onOpen={onOpen} />
                  <TeamToday people={report.people} generalOverdue={report.generalOverdue} showCounts={isAdmin} />
                </div>
              </>
            )}
          </div>

          {open && <ActivitySheet row={open} remind={remind} onClose={onClose} />}
        </TipProvider>
      </div>
    </AdminShell>
  );
}
