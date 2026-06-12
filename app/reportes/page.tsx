'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminShell from '@/components/AdminShell';
import { supabase, Activity, Completion, Employee } from '@/lib/supabase';
import { useCompany } from '@/lib/company-context';

// ── Helpers ───────────────────────────────────────────────────────────────────

function startOfWeek() {
  const d = new Date();
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function toDateStr(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

function weekLabel(mon: Date) {
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return `${mon.getDate()} al ${sun.getDate()} de ${mon.toLocaleString('es-MX', { month: 'long' })}`;
}

function rateColor(rate: number) {
  if (rate < 70) return '#E11D2E';
  if (rate < 90) return '#F2A20C';
  return '#0F9D58';
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// ── Types ─────────────────────────────────────────────────────────────────────

interface EmployeeStat { name: string; done: number; missed: number; rate: number; }
interface MissedItem   { title: string; date: string; assignee: string; }
interface DayBar       { d: string; done: number; missed: number; }
interface ReportData {
  done: number; missed: number; late: number; total: number;
  byEmployee: EmployeeStat[]; missed_list: MissedItem[]; daily: DayBar[];
}

// ── PDF ───────────────────────────────────────────────────────────────────────

async function downloadPDF(data: ReportData, label: string) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const pct = data.total > 0 ? Math.round(data.done / data.total * 100) : 0;

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
  doc.text(`${data.done} realizadas · ${data.missed} no realizadas · ${data.late} tardías · ${data.total} total`, 44, 53);

  // By employee
  let y = 68;
  doc.setTextColor(15, 15, 16);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('Cumplimiento por empleado', 14, y); y += 5;

  for (const e of data.byEmployee) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.setTextColor(15, 15, 16);
    doc.text(e.name, 14, y + 5);
    doc.setTextColor(100, 100, 100);
    doc.text(`${e.done}/${e.done + e.missed} · ${e.rate}%`, W - 14 - 26, y + 5);
    doc.setFillColor(240, 240, 244);
    doc.roundedRect(66, y, W - 14 - 66 - 28, 5, 1, 1, 'F');
    const [r, g, b] = e.rate < 70 ? [225, 29, 46] : e.rate < 90 ? [242, 162, 12] : [15, 157, 88];
    doc.setFillColor(r, g, b);
    doc.roundedRect(66, y, Math.max(2, ((W - 14 - 66 - 28) * e.rate) / 100), 5, 1, 1, 'F');
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

  doc.save(`reporte-laferre-${toDateStr(new Date())}.pdf`);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReportesPage() {
  const { current: company } = useCompany();
  const [data, setData]           = useState<ReportData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [generating, setGenerating] = useState(false);
  const [weekStart]               = useState(startOfWeek);

  const load = useCallback(async () => {
    if (!company) return;
    const mon  = startOfWeek();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon); d.setDate(mon.getDate() + i); return toDateStr(d);
    });

    const [{ data: acts }, { data: comps }, { data: emps }] = await Promise.all([
      supabase.from('activities').select('*').eq('is_active', true).eq('company_id', company.id),
      supabase.from('completions').select('*').gte('scheduled_date', days[0]).lte('scheduled_date', days[6]),
      supabase.from('employees').select('*').eq('is_active', true).eq('company_id', company.id),
    ]);

    const activities  = (acts  ?? []) as Activity[];
    const completions = (comps ?? []) as Completion[];
    const employees   = (emps  ?? []) as Employee[];
    const empMap      = Object.fromEntries(employees.map(e => [e.id, e]));

    let totalScheduled = 0, totalDone = 0, totalLate = 0;
    const byEmpMap: Record<string, { done: number; missed: number }> = {};
    const missedList: MissedItem[] = [];
    const daily: DayBar[] = [];

    for (const dateStr of days) {
      const dow      = new Date(dateStr + 'T12:00:00').getDay();
      const dayActs  = activities.filter(a => (a.days_of_week as number[]).includes(dow));
      const dayComps = completions.filter(c => c.scheduled_date === dateStr);
      const doneIds  = new Set(dayComps.map(c => c.activity_id));
      let dayDone = 0, dayMissed = 0;

      for (const act of dayActs) {
        totalScheduled++;
        const isDone = doneIds.has(act.id);
        const comp   = dayComps.find(c => c.activity_id === act.id);
        const ids    = (act.assigned_employee_ids as string[]).length > 0
          ? act.assigned_employee_ids as string[]
          : ['general'];
        const assigneeNames = (act.assigned_employee_ids as string[]).map(id => empMap[id]?.name ?? '?').join(', ') || 'General';

        for (const eid of ids) {
          if (!byEmpMap[eid]) byEmpMap[eid] = { done: 0, missed: 0 };
          isDone ? byEmpMap[eid].done++ : byEmpMap[eid].missed++;
        }

        if (isDone) {
          totalDone++; dayDone++;
          if (comp?.was_late) totalLate++;
        } else {
          dayMissed++;
          if (new Date(dateStr + 'T23:59:00') < new Date()) {
            missedList.push({
              title: act.title,
              date:  new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
              assignee: assigneeNames,
            });
          }
        }
      }
      daily.push({ d: DAY_LABELS[dow], done: dayDone, missed: dayMissed });
    }

    const byEmployee = employees.map(e => {
      const s   = byEmpMap[e.id] ?? { done: 0, missed: 0 };
      const tot = s.done + s.missed;
      return { name: e.name, done: s.done, missed: s.missed, rate: tot > 0 ? Math.round(s.done / tot * 100) : 100 };
    }).sort((a, b) => b.rate - a.rate);

    setData({ done: totalDone, missed: totalScheduled - totalDone, late: totalLate, total: totalScheduled, byEmployee, missed_list: missedList, daily });
    setLoading(false);
  }, [company]);

  useEffect(() => { load(); }, [load]);

  const pct    = data ? Math.round(data.done / Math.max(data.total, 1) * 100) : 0;
  const maxBar = data ? Math.max(...data.daily.map(b => b.done + b.missed), 1) : 1;
  const label  = weekLabel(weekStart);

  async function handleDownload() {
    if (!data) return;
    setGenerating(true);
    await downloadPDF(data, label);
    setGenerating(false);
  }

  return (
    <AdminShell>
      {/* Topbar */}
      <div className="flex items-center justify-between gap-3 border-b px-4 py-4 md:px-7 md:py-5" style={{ borderColor: '#E4E4E7', background: '#fff' }}>
        <div className="min-w-0">
          <h1 className="text-[18px] md:text-[22px] font-extrabold tracking-tight">Reporte semanal</h1>
          <p className="mt-0.5 text-[11px] md:text-[12px]" style={{ color: '#6E6E73' }}>Semana del {label} · resumen automático</p>
        </div>
        <button
          onClick={handleDownload}
          disabled={loading || generating}
          className="shrink-0 whitespace-nowrap rounded-[9px] border px-3 py-2 md:px-[14px] md:py-[9px] text-[12px] md:text-[13px] font-semibold transition-opacity"
          style={{ borderColor: '#E4E4E7', background: '#fff', opacity: loading || generating ? 0.5 : 1 }}
        >
          {generating ? 'Generando...' : '↓ Descargar PDF'}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-7">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-[13px]" style={{ color: '#A8A8AD' }}>Cargando reporte...</p>
          </div>
        ) : data && (
          <>
            {/* Hero */}
            <div className="mb-5 md:mb-[22px] grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 rounded-[14px] p-5 md:p-[26px] text-white" style={{ background: '#0F0F10' }}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[1.5px]" style={{ color: 'rgba(255,255,255,.5)' }}>Cumplimiento</p>
                <p className="mt-1.5 text-[40px] md:text-[48px] font-extrabold leading-none tracking-[-2px]">{pct}<span className="text-[20px] md:text-[22px]">%</span></p>
                <p className="mt-1 text-[11px]" style={{ color: 'rgba(255,255,255,.6)' }}>{data.done} de {data.total} actividades</p>
              </div>
              {[
                { label: 'Realizadas',       value: data.done,   color: '#0F9D58' },
                { label: 'No realizadas',    value: data.missed, color: '#E11D2E' },
                { label: 'Realizadas tarde', value: data.late,   color: '#F2A20C' },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-[10px] font-bold uppercase tracking-[1.5px]" style={{ color: 'rgba(255,255,255,.5)' }}>{s.label}</p>
                  <p className="mt-1.5 text-[30px] md:text-[38px] font-extrabold leading-none tracking-[-1.5px]" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Two columns */}
            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* By employee */}
              <div className="rounded-xl border p-5" style={{ background: '#fff', borderColor: '#E4E4E7' }}>
                <h3 className="mb-3.5 text-[14px] font-bold">Cumplimiento por empleado</h3>
                <div className="flex flex-col gap-3">
                  {data.byEmployee.map(e => (
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
              </div>

              {/* Missed */}
              <div className="rounded-xl border p-5" style={{ background: '#fff', borderColor: '#E4E4E7' }}>
                <h3 className="mb-3.5 flex items-center gap-2 text-[14px] font-bold">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#E11D2E' }} />
                  Actividades no realizadas ({data.missed})
                </h3>
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
                        <span className="shrink-0 rounded-full px-2 py-1 text-[10px] font-bold" style={{ background: '#FCE7E9', color: '#E11D2E' }}>NO REALIZADA</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bar chart */}
            <div className="rounded-xl border p-5" style={{ background: '#fff', borderColor: '#E4E4E7' }}>
              <h3 className="mb-3.5 text-[14px] font-bold">Actividades por día</h3>
              <div className="flex h-[140px] items-end gap-3 pl-1">
                {data.daily.map(b => {
                  const doneH = (b.done / maxBar) * 110;
                  const missH = (b.missed / maxBar) * 110;
                  return (
                    <div key={b.d} className="flex flex-1 flex-col items-center gap-1.5">
                      <div className="flex w-full flex-col justify-end" style={{ height: 110 }}>
                        {b.missed > 0 && <div className="w-full rounded-t-[4px]" style={{ height: missH, background: '#E11D2E' }} />}
                        <div className="w-full" style={{ height: doneH, background: '#0F0F10', borderRadius: b.missed > 0 ? '0 0 4px 4px' : '4px 4px 0 0' }} />
                      </div>
                      <span className="text-[11px] font-semibold" style={{ color: '#6E6E73' }}>{b.d}</span>
                      <span className="text-[10px]" style={{ color: '#A8A8AD', fontFamily: 'monospace' }}>{b.done + b.missed}</span>
                    </div>
                  );
                })}
          </div>
        </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
