'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import { supabase, Activity, Completion, Employee } from '@/lib/supabase';
import { useCompany } from '@/lib/company-context';

// ── Constants ─────────────────────────────────────────────────────────────────
const ROW_H   = 38;
const HOUR_START = 8;
const HOURS   = Array.from({ length: 13 }, (_, i) => String(i + HOUR_START).padStart(2, '0'));
const DAY_ABBR = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const EVENT_BG:     Record<string, string> = { done: '#E5F4EC', active: '#FFF6E0', late: '#FCE7E9', pending: '#F2F2F4' };
const EVENT_BORDER: Record<string, string> = { done: '#0F9D58', active: '#F2A20C', late: '#E11D2E', pending: '#A8A8AD' };

// ── Helpers ───────────────────────────────────────────────────────────────────
function monOfWeek(offset = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function toDateStr(d: Date) { return d.toISOString().split('T')[0]; }

function timeToH(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h + m / 60;
}

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

type Status = 'done' | 'active' | 'late' | 'pending';

function resolveStatus(act: Activity, dayComps: Completion[], dateStr: string): Status {
  const isDone = dayComps.some(c => c.activity_id === act.id);
  if (isDone) return 'done';

  const today  = toDateStr(new Date());
  const isPast = dateStr < today;
  if (isPast) return 'late';
  if (dateStr > today) return 'pending';

  // Today
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const lim    = timeToMin(act.limit_time);
  const sta    = timeToMin(act.start_time);
  if (nowMin > lim) return 'late';
  if (nowMin >= sta) return 'active';
  return 'pending';
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface CalEvent {
  id: string;
  activityId: string;
  dateStr: string;
  title: string;
  who: string;
  startTime: string;
  limitTime: string;
  status: Status;
  dayIndex: number;
  topOffset: number;
  height: number;
}

interface EventDetail {
  title: string;
  who: string;
  startTime: string;
  limitTime: string;
  status: Status;
  date: string;
  photoUrl: string | null;
  completedAt: string | null;
  wasLate: boolean;
  employeeName: string | null;
}

// ── Subcomponents ─────────────────────────────────────────────────────────────
function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[12px]" style={{ color: '#6E6E73' }}>{label}</span>
      <span className="text-right text-[12px] font-semibold" style={{ color: accent ? '#0F9D58' : '#0F0F10' }}>{value}</span>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="inline-block h-[10px] w-[10px] rounded-[3px]" style={{ background: color }} />
      <span className="text-[11px] font-semibold" style={{ color: '#3A3A3D' }}>{label}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CalendarioPage() {
  const router = useRouter();
  const { current: company } = useCompany();
  const [offset, setOffset]     = useState(0);
  const [events, setEvents]     = useState<CalEvent[]>([]);
  const [loading, setLoading]   = useState(true);
  const [detail, setDetail]     = useState<EventDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const mon = monOfWeek(offset);

  // Build the 7 days of the displayed week (Mon–Sun)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });

  // Current time line offset (only visible when today is in the week)
  const todayStr = toDateStr(new Date());
  const todayIndex = weekDays.findIndex(d => toDateStr(d) === todayStr);
  const now = new Date();
  const currentTimeOffset = (now.getHours() - HOUR_START) + now.getMinutes() / 60;

  const load = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    const dates = weekDays.map(toDateStr);

    const [{ data: acts }, { data: comps }, { data: emps }] = await Promise.all([
      supabase.from('activities').select('*').eq('is_active', true).eq('company_id', company.id),
      supabase.from('completions').select('*').gte('scheduled_date', dates[0]).lte('scheduled_date', dates[6]),
      supabase.from('employees').select('id, name').eq('is_active', true).eq('company_id', company.id),
    ]);

    const activities  = (acts  ?? []) as Activity[];
    const completions = (comps ?? []) as Completion[];
    const empMap      = Object.fromEntries(((emps ?? []) as Employee[]).map(e => [e.id, e.name.split(' ')[0]]));

    const calEvents: CalEvent[] = [];

    weekDays.forEach((date, dayIndex) => {
      const dateStr  = toDateStr(date);
      const dow      = date.getDay();
      const dayActs  = activities.filter(a => (a.days_of_week as number[]).includes(dow));
      const dayComps = completions.filter(c => c.scheduled_date === dateStr);

      for (const act of dayActs) {
        const startH   = timeToH(act.start_time);
        const endH     = timeToH(act.limit_time);
        const duration = Math.max(endH - startH, 0.25);
        const topOffset = (startH - HOUR_START) * ROW_H + 2;
        const height    = duration * ROW_H - 4;

        if (topOffset < 0 || topOffset > HOURS.length * ROW_H) continue;

        const assigneeNames = (act.assigned_employee_ids as string[])
          .map(id => empMap[id] ?? '?').join(', ') || 'General';

        calEvents.push({
          id:         `${act.id}-${dateStr}`,
          activityId: act.id,
          dateStr,
          title:      act.title,
          who:        assigneeNames,
          startTime:  act.start_time.slice(0, 5),
          limitTime:  act.limit_time.slice(0, 5),
          status:     resolveStatus(act, dayComps, dateStr),
          dayIndex,
          topOffset,
          height:    Math.max(height, 18),
        });
      }
    });

    setEvents(calEvents);
    setLoading(false);
  }, [offset, company]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleEventClick = useCallback(async (ev: CalEvent) => {
    setDetail(null);
    setDetailLoading(true);

    const { data: comp } = await supabase
      .from('completions')
      .select('*')
      .eq('activity_id', ev.activityId)
      .eq('scheduled_date', ev.dateStr)
      .maybeSingle();

    const completion = comp as Completion | null;
    let employeeName: string | null = null;
    if (completion?.employee_id) {
      const { data: emp } = await supabase
        .from('employees').select('name').eq('id', completion.employee_id).single();
      employeeName = (emp as { name: string } | null)?.name ?? null;
    }

    setDetail({
      title:       ev.title,
      who:         ev.who,
      startTime:   ev.startTime,
      limitTime:   ev.limitTime,
      status:      ev.status,
      date:        ev.dateStr,
      photoUrl:    completion?.photo_url ?? null,
      completedAt: completion?.completed_at ?? null,
      wasLate:     completion?.was_late ?? false,
      employeeName,
    });
    setDetailLoading(false);
  }, []);

  // Week label for topbar
  const monthName = mon.toLocaleString('es-MX', { month: 'long' });
  const lastDay   = weekDays[6];
  const weekLabel = mon.getMonth() === lastDay.getMonth()
    ? `${mon.getDate()} al ${lastDay.getDate()} de ${monthName}`
    : `${mon.getDate()} ${monthName} – ${lastDay.getDate()} ${lastDay.toLocaleString('es-MX', { month: 'long' })}`;

  return (
    <AdminShell>
      {/* Topbar */}
      <div className="flex items-center justify-between gap-5 border-b px-7 py-5" style={{ borderColor: '#E4E4E7', background: '#fff' }}>
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">Calendario</h1>
          <p className="mt-0.5 text-[12px]" style={{ color: '#6E6E73' }}>Semana del {weekLabel} · vista semanal</p>
        </div>
        <div className="flex items-center gap-[10px]">
          <button onClick={() => setOffset(o => o - 1)} className="rounded-[9px] border px-[14px] py-[9px] text-[13px] font-semibold" style={{ borderColor: '#E4E4E7', background: '#fff' }}>← Anterior</button>
          <button onClick={() => setOffset(0)} className="rounded-[9px] border px-[14px] py-[9px] text-[13px] font-semibold" style={{ borderColor: offset === 0 ? '#0F0F10' : '#E4E4E7', background: offset === 0 ? '#0F0F10' : '#fff', color: offset === 0 ? '#fff' : '#0F0F10' }}>Hoy</button>
          <button onClick={() => setOffset(o => o + 1)} className="rounded-[9px] border px-[14px] py-[9px] text-[13px] font-semibold" style={{ borderColor: '#E4E4E7', background: '#fff' }}>Siguiente →</button>
          <button onClick={() => router.push('/actividades/nueva')} className="rounded-[9px] px-[14px] py-[9px] text-[13px] font-semibold text-white" style={{ background: 'var(--accent)' }}>+ Nueva</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-7 pb-7">
        {/* Legend */}
        <div className="flex gap-[18px] py-4">
          <Legend color="#0F9D58" label="Realizadas" />
          <Legend color="#F2A20C" label="En curso" />
          <Legend color="#E11D2E" label="Atrasadas" />
          <Legend color="#A8A8AD" label="Pendientes" />
          {loading && <span className="text-[11px]" style={{ color: '#A8A8AD' }}>Cargando...</span>}
        </div>

        {/* Grid */}
        <div className="rounded-xl border overflow-hidden" style={{ background: '#fff', borderColor: '#E4E4E7' }}>
          {/* Day headers */}
          <div className="grid border-b" style={{ gridTemplateColumns: '56px repeat(7, 1fr)', borderColor: '#E4E4E7' }}>
            <div />
            {weekDays.map((d, i) => {
              const isToday = toDateStr(d) === todayStr;
              return (
                <div key={i} className="border-l px-3 py-2.5" style={{ borderColor: '#F2F2F4', background: isToday ? '#FFF6F6' : 'transparent' }}>
                  <div className="text-[10px] font-semibold uppercase tracking-[1px]" style={{ color: '#6E6E73' }}>{DAY_ABBR[d.getDay()]}</div>
                  <div className="text-[16px] font-bold" style={{ color: isToday ? 'var(--accent)' : '#0F0F10' }}>{d.getDate()}</div>
                </div>
              );
            })}
          </div>

          {/* Body */}
          <div className="relative grid" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
            {/* Time labels */}
            <div>
              {HOURS.map(h => (
                <div key={h} className="border-t text-right pr-2 pt-0.5 text-[10px] font-semibold" style={{ height: ROW_H, color: '#6E6E73', borderColor: '#F2F2F4', fontFamily: 'monospace' }}>{h}:00</div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((d, di) => {
              const isToday = toDateStr(d) === todayStr;
              const colEvents = events.filter(e => e.dayIndex === di);
              return (
                <div key={di} className="relative border-l" style={{ borderColor: '#F2F2F4', background: isToday ? '#FFFAFA' : 'transparent' }}>
                  {/* Hour rows */}
                  {HOURS.map(h => (
                    <div key={h} className="border-t" style={{ height: ROW_H, borderColor: '#F2F2F4' }} />
                  ))}

                  {/* Events */}
                  {colEvents.map(ev => (
                    <div
                      key={ev.id}
                      onClick={() => handleEventClick(ev)}
                      className="absolute left-1 right-1 overflow-hidden rounded-[5px] border-l-[3px] px-1.5 py-1 cursor-pointer text-[11px] leading-tight"
                      style={{ top: ev.topOffset, height: ev.height, background: EVENT_BG[ev.status], borderLeftColor: EVENT_BORDER[ev.status] }}
                    >
                      <div className="font-bold overflow-hidden text-ellipsis whitespace-nowrap" style={{ color: '#0F0F10' }}>{ev.title}</div>
                      {ev.height > 26 && (
                        <div className="text-[9px] mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap" style={{ color: '#6E6E73' }}>{ev.who}</div>
                      )}
                    </div>
                  ))}

                  {/* Current time line */}
                  {isToday && currentTimeOffset >= 0 && currentTimeOffset <= HOURS.length && (
                    <div className="absolute left-0 right-0 z-10" style={{ top: currentTimeOffset * ROW_H, height: 2, background: 'var(--accent)' }}>
                      <div className="absolute -top-1 -left-1 h-[10px] w-[10px] rounded-full" style={{ background: 'var(--accent)' }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail side panel */}
      {(detail !== null || detailLoading) && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.25)' }}
            onClick={() => { setDetail(null); setDetailLoading(false); }}
          />
          <div
            className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-y-auto"
            style={{ width: 360, background: '#fff', borderLeft: '1px solid #E4E4E7', boxShadow: '-4px 0 24px rgba(0,0,0,0.08)' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-6 py-5 border-b" style={{ borderColor: '#E4E4E7' }}>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[1px]" style={{ color: '#6E6E73' }}>Detalle de actividad</p>
                {detail && <h2 className="mt-1 text-[17px] font-extrabold leading-snug truncate" style={{ color: '#0F0F10' }}>{detail.title}</h2>}
              </div>
              <button
                onClick={() => { setDetail(null); setDetailLoading(false); }}
                className="mt-0.5 flex-shrink-0 rounded-[8px] px-3 py-1.5 text-[12px] font-semibold"
                style={{ background: '#F2F2F4', color: '#3A3A3D' }}
              >Cerrar</button>
            </div>

            {detailLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <span className="text-[13px]" style={{ color: '#A8A8AD' }}>Cargando…</span>
              </div>
            ) : detail ? (
              <div className="flex flex-col gap-5 px-6 py-5">
                {/* Status badge */}
                <div className="inline-flex w-fit items-center gap-2 rounded-[8px] px-3 py-1.5" style={{ background: EVENT_BG[detail.status], border: `1px solid ${EVENT_BORDER[detail.status]}` }}>
                  <span className="h-[8px] w-[8px] rounded-full" style={{ background: EVENT_BORDER[detail.status] }} />
                  <span className="text-[12px] font-semibold" style={{ color: EVENT_BORDER[detail.status] }}>
                    {{ done: 'Realizada', active: 'En curso', late: 'Atrasada', pending: 'Pendiente' }[detail.status]}
                  </span>
                </div>

                {/* Info rows */}
                <div className="rounded-[10px] border p-4 flex flex-col gap-3" style={{ borderColor: '#E4E4E7' }}>
                  <Row label="Fecha" value={new Date(detail.date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })} />
                  <Row label="Horario" value={`${detail.startTime} – ${detail.limitTime}`} />
                  <Row label="Asignado a" value={detail.who} />
                  {detail.employeeName && <Row label="Completó" value={detail.employeeName} />}
                  {detail.completedAt && (
                    <Row
                      label="Hora de registro"
                      value={new Date(detail.completedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    />
                  )}
                  {detail.status === 'done' && (
                    <Row label="¿A tiempo?" value={detail.wasLate ? '⚠ Tarde' : '✓ A tiempo'} accent={!detail.wasLate} />
                  )}
                </div>

                {/* Evidence photo */}
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.8px]" style={{ color: '#6E6E73' }}>Evidencia fotográfica</p>
                  {detail.photoUrl ? (
                    <a href={detail.photoUrl} target="_blank" rel="noreferrer">
                      <img
                        src={detail.photoUrl}
                        alt="Evidencia"
                        className="w-full rounded-[10px] object-cover"
                        style={{ maxHeight: 260, border: '1px solid #E4E4E7' }}
                      />
                    </a>
                  ) : (
                    <div className="flex h-[120px] items-center justify-center rounded-[10px] text-[13px]" style={{ background: '#F2F2F4', color: '#A8A8AD' }}>
                      Sin foto de evidencia
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}
    </AdminShell>
  );
}
