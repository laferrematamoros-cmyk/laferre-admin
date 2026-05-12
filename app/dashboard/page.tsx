'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import { supabase, Activity, Completion, Employee } from '@/lib/supabase';
import { useCompany } from '@/lib/company-context';

type Status = 'done' | 'active' | 'late' | 'pending';

interface ActivityRow extends Activity {
  status: Status;
  completion?: Completion;
  assigneeName: string;
  minutesLate?: number;
  minutesLeft?: number;
}

const STATUS_DOT: Record<Status, string> = {
  done: '#0F9D58', active: '#F2A20C', late: '#E11D2E', pending: '#A8A8AD',
};

function initials(name: string) {
  return name.split(' ').map(s => s[0]).join('');
}

function fmtTime(t: string) { return t.slice(0, 5); }

function timeToMin(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function resolveStatus(act: Activity, completions: Completion[], nowMin: number): Status {
  if (completions.some(c => c.activity_id === act.id)) return 'done';
  const lim = timeToMin(act.limit_time);
  const sta = timeToMin(act.start_time);
  if (nowMin > lim) return 'late';
  if (nowMin >= sta) return 'active';
  return 'pending';
}

function nowLabel() {
  return new Date().toLocaleString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const { current: company } = useCompany();
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [loading, setLoading]       = useState(true);
  const [timeLabel, setTimeLabel]   = useState(nowLabel());

  const load = useCallback(async () => {
    if (!company) return;
    const today      = new Date().toISOString().split('T')[0];
    const dayOfWeek  = new Date().getDay();
    const nowMin     = new Date().getHours() * 60 + new Date().getMinutes();

    const [{ data: acts }, { data: comps }, { data: emps }] = await Promise.all([
      supabase.from('activities').select('*').eq('is_active', true).eq('company_id', company.id),
      supabase.from('completions').select('*').eq('scheduled_date', today),
      supabase.from('employees').select('*').eq('is_active', true).eq('company_id', company.id).order('name'),
    ]);

    const empMap = Object.fromEntries((emps ?? []).map(e => [e.id, e]));

    const todayActs = (acts ?? [])
      .filter((a: Activity) => (a.days_of_week as number[]).includes(dayOfWeek))
      .map((a: Activity): ActivityRow => {
        const status = resolveStatus(a, comps ?? [], nowMin);
        const completion = (comps ?? []).find(c => c.activity_id === a.id);
        const limMin = timeToMin(a.limit_time);

        const assignedNames = (a.assigned_employee_ids as string[])
          .map(id => empMap[id]?.name ?? '?')
          .join(', ');

        return {
          ...a,
          status,
          completion,
          assigneeName: assignedNames || 'General',
          minutesLate: status === 'late' ? nowMin - limMin : undefined,
          minutesLeft: status === 'active' ? limMin - nowMin : undefined,
        };
      })
      .sort((a, b) => timeToMin(a.start_time) - timeToMin(b.start_time));

    setActivities(todayActs);
    setEmployees(emps ?? []);
    setLoading(false);
    setTimeLabel(nowLabel());
  }, [company]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  const total   = activities.length;
  const done    = activities.filter(a => a.status === 'done').length;
  const active  = activities.filter(a => a.status === 'active').length;
  const late    = activities.filter(a => a.status === 'late').length;
  const pct     = total > 0 ? Math.round(done / total * 100) : 0;
  const alerts  = activities.filter(a => a.status === 'late');
  const upcoming = activities.filter(a => a.status === 'active');

  const STATS = [
    { label: 'Actividades hoy', value: String(total),  delta: `${pct}% del día`,          color: '#0F0F10' },
    { label: 'Completadas',     value: String(done),   delta: `${pct}% cumplimiento`,      color: '#0F9D58' },
    { label: 'En curso',        value: String(active), delta: active > 0 ? 'en progreso' : 'ninguna activa', color: '#F2A20C' },
    { label: 'Atrasadas',       value: String(late),   delta: late > 0 ? 'requieren atención' : 'al corriente', color: late > 0 ? '#E11D2E' : '#0F9D58' },
  ];

  return (
    <AdminShell>
      {/* Topbar */}
      <div className="flex items-center justify-between gap-5 border-b px-7 py-5" style={{ borderColor: '#E4E4E7', background: '#fff' }}>
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">Dashboard</h1>
          <p className="mt-0.5 text-[12px] capitalize" style={{ color: '#6E6E73' }}>{timeLabel}</p>
        </div>
        <div className="flex items-center gap-[10px]">
          <button className="flex items-center gap-[7px] rounded-[9px] border px-[14px] py-[9px] text-[13px] font-semibold" style={{ borderColor: '#E4E4E7', background: '#fff' }}>
            ↓ Exportar
          </button>
          <button
            onClick={() => router.push('/actividades/nueva')}
            className="flex items-center gap-[7px] rounded-[9px] px-[14px] py-[9px] text-[13px] font-semibold text-white"
            style={{ background: 'var(--accent)' }}
          >
            + Nueva actividad
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-7">
        {/* Stats */}
        <div className="mb-[22px] grid grid-cols-4 gap-[14px]">
          {STATS.map(s => (
            <div key={s.label} className="rounded-xl border p-[18px]" style={{ background: '#fff', borderColor: '#E4E4E7' }}>
              <p className="text-[11px] font-semibold uppercase tracking-[1px]" style={{ color: '#6E6E73' }}>{s.label}</p>
              <p className="mt-1.5 text-[32px] font-extrabold leading-none tracking-[-1px]" style={{ color: s.color }}>
                {loading ? '—' : s.value}
              </p>
              <p className="mt-1.5 text-[11px]" style={{ color: '#6E6E73' }}>{s.delta}</p>
            </div>
          ))}
        </div>

        {/* Two columns */}
        <div className="grid gap-4" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
          {/* Today timeline */}
          <div className="rounded-xl border p-[18px]" style={{ background: '#fff', borderColor: '#E4E4E7' }}>
            <div className="mb-3.5 flex items-center justify-between">
              <h3 className="text-[14px] font-bold">Actividades de hoy</h3>
              <span className="text-[12px] font-semibold" style={{ color: '#A8A8AD' }}>{total} total</span>
            </div>

            {loading ? (
              <p className="text-[13px] py-4 text-center" style={{ color: '#A8A8AD' }}>Cargando...</p>
            ) : activities.length === 0 ? (
              <p className="text-[13px] py-4 text-center" style={{ color: '#A8A8AD' }}>Sin actividades para hoy</p>
            ) : (
              <div className="flex flex-col">
                {activities.map((a, i) => (
                  <div key={a.id} className="grid items-center gap-[10px] py-[10px]"
                    style={{ gridTemplateColumns: '52px 16px 1fr auto', borderTop: i === 0 ? 'none' : '1px solid #F2F2F4' }}>
                    <span className="text-[12px] font-semibold" style={{ color: '#6E6E73', fontFamily: 'monospace' }}>{fmtTime(a.start_time)}</span>
                    <div className="mx-auto h-[10px] w-[10px] rounded-full" style={{ background: STATUS_DOT[a.status] }} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold truncate"
                        style={{ textDecoration: a.status === 'done' ? 'line-through' : 'none', color: '#0F0F10', textDecorationColor: '#A8A8AD' }}>
                        {a.title}
                      </p>
                      <p className="mt-0.5 text-[11px]" style={{ color: '#6E6E73' }}>
                        {a.assigneeName} · límite {fmtTime(a.limit_time)}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {a.status === 'done' && a.completion?.photo_url &&
                        <span className="rounded-full px-[7px] py-[3px] text-[10px] font-bold" style={{ background: '#E5F4EC', color: '#0F9D58' }}>EVIDENCIA</span>}
                      {a.status === 'late' &&
                        <span className="rounded-full px-[7px] py-[3px] text-[10px] font-bold text-white" style={{ background: '#E11D2E' }}>{a.minutesLate} min</span>}
                      {a.status === 'active' &&
                        <span className="rounded-full px-[7px] py-[3px] text-[10px] font-bold" style={{ background: '#FFF6E0', color: '#A67200' }}>EN CURSO</span>}
                      {a.status === 'pending' &&
                        <span className="text-[10px] font-semibold" style={{ color: '#6E6E73' }}>—</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            {/* Employees */}
            <div className="rounded-xl p-[18px] text-white" style={{ background: '#0F0F10' }}>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[1px]" style={{ color: 'rgba(255,255,255,.5)' }}>Empleados activos</p>
              <div className="flex flex-col gap-[10px]">
                {loading ? (
                  <p className="text-[12px]" style={{ color: 'rgba(255,255,255,.4)' }}>Cargando...</p>
                ) : employees.map(e => (
                  <div key={e.id} className="flex items-center gap-[10px]">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: e.color }}>
                      {initials(e.name)}
                    </div>
                    <div className="flex-1">
                      <p className="text-[12px] font-semibold">{e.name}</p>
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,.5)' }}>{e.role}</p>
                    </div>
                    <div className="h-2 w-2 rounded-full" style={{ background: '#0F9D58' }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Alerts */}
            <div className="rounded-xl border p-[18px]" style={{ background: '#fff', borderColor: '#E4E4E7' }}>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[1px]" style={{ color: '#6E6E73' }}>Alertas activas</p>
              <div className="flex flex-col gap-[10px]">
                {!loading && alerts.length === 0 && upcoming.length === 0 && (
                  <p className="text-[12px]" style={{ color: '#A8A8AD' }}>Sin alertas activas</p>
                )}
                {alerts.map(a => (
                  <div key={a.id} className="flex gap-[10px] rounded-lg p-[10px]" style={{ background: '#FCE7E9' }}>
                    <div className="w-1.5 self-stretch rounded-full" style={{ background: '#E11D2E' }} />
                    <div>
                      <p className="text-[12px] font-bold" style={{ color: '#E11D2E' }}>
                        {a.assigneeName} · {a.minutesLate} min de retraso
                      </p>
                      <p className="mt-0.5 text-[11px]" style={{ color: '#3A3A3D' }}>{a.title}</p>
                    </div>
                  </div>
                ))}
                {upcoming.map(a => (
                  <div key={a.id} className="flex gap-[10px] rounded-lg p-[10px]" style={{ background: '#FFF6E0' }}>
                    <div className="w-1.5 self-stretch rounded-full" style={{ background: '#F2A20C' }} />
                    <div>
                      <p className="text-[12px] font-bold" style={{ color: '#A67200' }}>Próxima a vencer</p>
                      <p className="mt-0.5 text-[11px]" style={{ color: '#3A3A3D' }}>{a.title} · {a.minutesLeft} min restantes</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
