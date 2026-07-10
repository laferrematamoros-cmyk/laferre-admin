'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Employee, Completion } from '@/lib/supabase';
import { mondayOf, toDateStr } from '@/lib/reports';
import { ChartTypeToggle } from '@/components/ReportCharts';

type Period = 'week' | 'month' | 'all';

const PERIOD_LABEL: Record<Period, string> = { week: 'esta semana', month: 'este mes', all: 'en total' };

// Ranking de empleados por cantidad de actividades REALIZADAS (según quién las
// completó, `completion.employee_id`). Sirve aunque las actividades sean generales.
export default function EmployeeRanking({ employees, completions }: { employees: Employee[]; completions: Completion[] }) {
  const [period, setPeriod] = useState<Period>('week');

  useEffect(() => {
    const p = localStorage.getItem('lf_report_emp_period');
    if (p === 'week' || p === 'month' || p === 'all') setPeriod(p);
  }, []);
  const setP = (p: Period) => { setPeriod(p); try { localStorage.setItem('lf_report_emp_period', p); } catch { /* ignore */ } };

  const ranking = useMemo(() => {
    const names = new Map(employees.map(e => [e.id, e.name]));
    const now = new Date();
    const monday = mondayOf(now);
    const wStart = toDateStr(monday);
    const wEnd = toDateStr(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6));
    const mPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const inPeriod = (d: string) =>
      period === 'all' ? true : period === 'month' ? d.startsWith(mPrefix) : (d >= wStart && d <= wEnd);

    const counts = new Map<string, number>();
    for (const c of completions) {
      if (!c.employee_id || !names.has(c.employee_id)) continue;
      if (!inPeriod(c.scheduled_date)) continue;
      counts.set(c.employee_id, (counts.get(c.employee_id) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, n]) => ({ name: names.get(id) ?? '?', count: n }))
      .sort((a, b) => b.count - a.count);
  }, [employees, completions, period]);

  const max = ranking.length ? ranking[0].count : 1;
  const totalDone = ranking.reduce((s, r) => s + r.count, 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <ChartTypeToggle value={period} onChange={setP}
          options={[['week', 'Esta semana'], ['month', 'Este mes'], ['all', 'Total']]} />
        <span className="text-[11px]" style={{ color: '#A8A8AD' }}>Quién realizó más actividades</span>
      </div>

      {ranking.length === 0 ? (
        <p className="py-4 text-center text-[13px]" style={{ color: '#A8A8AD' }}>
          Nadie realizó actividades {PERIOD_LABEL[period]}.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            {ranking.map((r, i) => (
              <div key={r.name}>
                <div className="mb-1 flex items-center justify-between text-[12px]">
                  <span className="font-semibold">
                    <span style={{ color: '#A8A8AD' }}>{i + 1}.</span> {r.name}
                  </span>
                  <span className="font-bold" style={{ fontFamily: 'monospace' }}>{r.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ background: '#F2F2F4' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.max(6, (r.count / max) * 100)}%`, background: i === 0 ? '#0F9D58' : '#0F0F10' }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px]" style={{ color: '#A8A8AD' }}>
            {totalDone} actividades realizadas {PERIOD_LABEL[period]} por {ranking.length} {ranking.length === 1 ? 'persona' : 'personas'}.
          </p>
        </>
      )}
    </div>
  );
}
