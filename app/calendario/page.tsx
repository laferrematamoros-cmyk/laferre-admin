'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import { supabase } from '@/lib/supabase';
import { loadActivities } from '@/lib/load-activities';
import { useCompany } from '@/lib/company-context';
import { useSession } from '@/lib/session-context';
import { currentMonday, toDateStr, weekLabel, type ReportEmployee } from '@/lib/reports';
import { buildDay, TODAY_STATUSES, type TodayActivity, type TodayCompletion, type TodayRow } from '@/lib/today';
import { fetchAllPages } from '@/lib/fetch-all';
import { TipProvider } from '@/components/panel/ui';
import { IconPlus } from '@/components/panel/icons';
import WeekPicker from '@/components/panel/WeekPicker';
import ActivitySheet from '@/components/hoy/ActivitySheet';
import { useRemind } from '@/components/hoy/RemindButton';
import { BG } from '@/components/hoy/look';
import WeekColumns from '@/components/calendario/WeekColumns';
import DayAgenda from '@/components/calendario/DayAgenda';
import { longDate, type CalDay } from '@/components/calendario/days';
import s from '@/components/panel/panel.module.css';
import h from '@/components/hoy/hoy.module.css';
import c from '@/components/calendario/cal.module.css';

interface Loaded {
  key: string;
  weekStart: Date;
  now: Date;
  activities: TodayActivity[];
  completions: TodayCompletion[];
  employees: ReportEmployee[];
}

const REFRESH_MS = 60_000;
const LEGEND: Record<string, string> = { done: 'Hecha', doneLate: 'Hecha tarde', running: 'En curso', upcoming: 'Por hacer', overdue: 'Atrasada o sin hacer', optional: 'Opcional (no cuenta)' };

function plusDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export default function CalendarioPage() {
  const router = useRouter();
  const { current: company } = useCompany();
  const { role } = useSession();
  const isAdmin = role === 'admin';
  const [weekStart, setWeekStartState] = useState<Date>(currentMonday);
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<number | null>(null);          // día elegido en el celular
  const [open, setOpen] = useState<{ day: number; id: string } | null>(null);
  const remind = useRemind(company?.id);

  const from = toDateStr(weekStart);
  const to = toDateStr(plusDays(weekStart, 6));
  const key = `${company?.id ?? ''}|${from}`;

  const setWeekStart = useCallback((d: Date) => { setWeekStartState(d); setPicked(null); setOpen(null); }, []);

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
      const completions = ids.length === 0 ? [] : await fetchAllPages<TodayCompletion>((f, t) =>
        supabase.from('completions')
          .select('activity_id, employee_id, scheduled_date, was_late, completed_at, photo_url, note')
          .in('activity_id', ids)
          .gte('scheduled_date', from)
          .lte('scheduled_date', to)
          .order('scheduled_date')
          .order('id')
          .range(f, t));
      setData({ key: `${company.id}|${from}`, weekStart, now, activities, completions, employees: (emps.data ?? []) as ReportEmployee[] });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error desconocido');
    }
  }, [company, from, to, weekStart]);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  // Mientras carga otra semana de la misma empresa, la anterior se queda atenuada.
  const shown = data && data.key.startsWith(`${company?.id ?? ''}|`) ? data : null;
  const loading = !data || data.key !== key;

  const days: CalDay[] = useMemo(() => {
    if (!shown) return [];
    const today = toDateStr(shown.now);
    return Array.from({ length: 7 }, (_, i) => {
      const date = plusDays(shown.weekStart, i);
      const ds = toDateStr(date);
      return {
        date,
        report: buildDay(date, shown.activities, shown.completions, shown.employees, shown.now),
        isToday: ds === today,
        past: ds < today,
      };
    });
  }, [shown]);

  const selected = picked ?? Math.max(0, days.findIndex(d => d.isToday));
  const onOpen = useCallback((d: CalDay, r: TodayRow) => setOpen({ day: days.indexOf(d), id: r.id }), [days]);
  const onClose = useCallback(() => setOpen(null), []);
  const openDay = open ? days[open.day] : null;
  const openRow = openDay ? openDay.report.rows.find(r => r.id === open!.id) ?? null : null;

  return (
    <AdminShell>
      <div className={s.page}>
        <TipProvider>
          <header className={s.top}>
            <div>
              <div className={s.eyebrow}><i />{company?.name ?? 'Actividades'} · Actividades</div>
              <h1 className={s.title}>Calendario</h1>
              <div className={s.sub} suppressHydrationWarning>Semana del {weekLabel(weekStart)}</div>
            </div>
            <div className={s.tools}>
              <WeekPicker weekStart={weekStart} onChange={setWeekStart} allowFuture />
              {isAdmin && (
                <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => router.push('/actividades/nueva')}>
                  <IconPlus />Nueva actividad
                </button>
              )}
            </div>
          </header>

          <div className={s.content} style={{ opacity: loading && shown ? 0.55 : 1 }} aria-busy={loading}>
            {error && (
              <div className={s.error}>
                No se pudo cargar el calendario ({error}).
                <button type="button" className={`${s.btn} ${s.btnSoft}`} onClick={load}>Reintentar</button>
              </div>
            )}
            {!shown ? (
              !error && <p className={s.loading}>Cargando la semana…</p>
            ) : (
              <>
                <div className={h.lineLegend}>
                  {TODAY_STATUSES.map(k => <span key={k}><i className={`${h.sw} ${BG[k]}`} />{LEGEND[k]}</span>)}
                </div>
                <div className={c.desk}><WeekColumns days={days} now={shown.now} onOpen={onOpen} /></div>
                <div className={c.mobile}><DayAgenda days={days} selected={selected} onSelect={setPicked} onOpen={onOpen} /></div>
              </>
            )}
          </div>

          {openRow && openDay && (
            <ActivitySheet
              row={openRow}
              remind={remind}
              onClose={onClose}
              dateLabel={longDate(openDay.date)}
              isToday={openDay.isToday}
              past={openDay.past}
            />
          )}
        </TipProvider>
      </div>
    </AdminShell>
  );
}
