'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import { supabase, Employee } from '@/lib/supabase';
import { useCompany } from '@/lib/company-context';
import { matchesWeekOfMonth } from '@/lib/reports';
import { updateActivity } from '../actions';

const WEEK_OF_MONTH: { label: string; value: number | null }[] = [
  { label: 'Cada semana', value: null },
  { label: '1ª', value: 1 },
  { label: '2ª', value: 2 },
  { label: '3ª', value: 3 },
  { label: '4ª', value: 4 },
  { label: 'Última', value: -1 },
];

const RECURRENCE: { label: string; days: number[] }[] = [
  { label: 'Diaria',        days: [0,1,2,3,4,5,6] },
  { label: 'Lun-Vie',       days: [1,2,3,4,5] },
  { label: 'Lun-Sáb',       days: [1,2,3,4,5,6] },
  { label: 'Personalizado', days: [] },
];
const CUSTOM_IDX = 3; // índice de "Personalizado"

const DAY_NAMES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const REMINDER_MINUTES = [5, 10, 15, 30];
const EVIDENCE_FIELDS = [
  { key: 'evidence_photo', label: 'Foto' },
] as const;

function initials(name: string) {
  return name.split(' ').map(s => s[0]).join('');
}

function FieldLabel({ children, optional }: { children: string; optional?: boolean }) {
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.8px]" style={{ color: '#6E6E73' }}>{children}</p>
      {optional && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: '#F2F2F4', color: '#A8A8AD' }}>Opcional</span>}
    </div>
  );
}

function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex items-center gap-2 rounded-lg px-3 py-2 border transition-colors" style={{ background: on ? '#FFF6F7' : '#F2F2F4', borderColor: on ? 'var(--accent)' : 'transparent', borderWidth: 1.5 }}>
      <div className="relative h-4 w-7 rounded-full transition-colors" style={{ background: on ? 'var(--accent)' : '#A8A8AD' }}>
        <div className="absolute top-[2px] h-3 w-3 rounded-full bg-white transition-all" style={{ left: on ? 14 : 2 }} />
      </div>
      <span className="text-[12px] font-semibold" style={{ color: on ? '#0F0F10' : '#6E6E73' }}>{label}</span>
    </button>
  );
}

export default function EditActividadPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { current: company } = useCompany();

  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime]   = useState('');
  const [limitTime, setLimitTime]   = useState('');

  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [selected, setSelected]     = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState(1); // Lun-Vie
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [weekOfMonth, setWeekOfMonth] = useState<number | null>(null);
  const [reminder, setReminder]     = useState(0); // 5 min
  const [evidence, setEvidence]     = useState([true]); // [Foto]
  const [saving, setSaving]         = useState(false);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!company || !id) return;

    Promise.all([
      supabase.from('activities').select('*').eq('id', id).single(),
      supabase.from('employees').select('*').eq('is_active', true).eq('company_id', company.id).order('name'),
    ]).then(([{ data: act }, { data: emps }]) => {
      if (emps) setEmployees(emps);
      if (!act) return;

      setTitle(act.title);
      setDescription(act.description ?? '');
      setStartTime(act.start_time.slice(0, 5));
      setLimitTime(act.limit_time.slice(0, 5));

      setSelected(act.assigned_employee_ids ?? []);
      setWeekOfMonth(act.week_of_month ?? null);
      setEvidence([act.evidence_photo]);
      const ri = REMINDER_MINUTES.indexOf(act.reminder_minutes);
      setReminder(ri >= 0 ? ri : 0);

      // Match recurrence
      const days: number[] = act.days_of_week ?? [];
      const match = RECURRENCE.findIndex((r, i) => i < CUSTOM_IDX && JSON.stringify(r.days.sort()) === JSON.stringify([...days].sort()));
      if (match >= 0) {
        setRecurrence(match);
      } else {
        setRecurrence(CUSTOM_IDX); // Personalizado
        setCustomDays(days);
      }

      setLoading(false);
    });
  }, [company, id]);

  function toggleEmployee(eid: string) {
    setSelected(prev => prev.includes(eid) ? prev.filter(x => x !== eid) : [...prev, eid]);
  }

  function toggleCustomDay(d: number) {
    setCustomDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  const effectiveDays = recurrence === CUSTOM_IDX ? customDays : RECURRENCE[recurrence].days;
  const isGeneral = selected.length === 0;
  const assigneeLabel = isGeneral
    ? 'Sin asignar'
    : employees.filter(e => selected.includes(e.id)).map(e => e.name.split(' ')[0]).join(', ');

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);

    try {
      await updateActivity(id, {
        title:                 title.trim(),
        description:           description.trim() || null,
        start_time:            startTime || '09:00',
        limit_time:            limitTime || '10:00',
        recurrence:            RECURRENCE[recurrence].label.toLowerCase().replace(' ', '-'),
        days_of_week:          effectiveDays,
        week_of_month:         weekOfMonth,
        // Solo tocamos is_active en las mensuales (el cron las mantiene); las normales quedan como estaban.
        ...(weekOfMonth != null ? { is_active: matchesWeekOfMonth(weekOfMonth, new Date()) } : {}),
        assigned_employee_ids: selected,
        is_urgent:             false,
        reminder_minutes:      REMINDER_MINUTES[reminder],
        evidence_photo:        evidence[0],
        evidence_name:         false,
        evidence_note:         false,
        evidence_signature:    false,
      });
    } catch {
      setSaving(false);
      return;
    }

    setSaving(false);
    router.push('/actividades');
  }

  if (loading) {
    return (
      <AdminShell>
        <div className="flex flex-1 items-center justify-center text-[13px]" style={{ color: '#A8A8AD' }}>Cargando...</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      {/* Topbar */}
      <div className="flex items-center justify-between gap-5 border-b px-7 py-5" style={{ borderColor: '#E4E4E7', background: '#fff' }}>
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">Editar actividad</h1>
          <p className="mt-0.5 text-[12px]" style={{ color: '#6E6E73' }}>Modifica los datos de esta actividad</p>
        </div>
        <div className="flex items-center gap-[10px]">
          <button onClick={() => router.push('/actividades')} className="rounded-[9px] border px-[14px] py-[9px] text-[13px] font-semibold" style={{ borderColor: '#E4E4E7', background: '#fff' }}>Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-[9px] px-[14px] py-[9px] text-[13px] font-semibold text-white transition-opacity"
            style={{ background: 'var(--accent)', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-7">
        <div className="rounded-xl border p-6" style={{ background: '#fff', borderColor: '#E4E4E7', maxWidth: 720 }}>
          {/* Title */}
          <div className="mb-[18px]">
            <FieldLabel>Título de la actividad</FieldLabel>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-[14px] outline-none focus:border-gray-400" style={{ borderColor: '#E4E4E7', color: '#0F0F10' }} />
          </div>

          {/* Description */}
          <div className="mb-[18px]">
            <FieldLabel optional>Descripción</FieldLabel>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full resize-none rounded-lg border px-3 py-2.5 text-[14px] leading-relaxed outline-none focus:border-gray-400" style={{ borderColor: '#E4E4E7', color: '#0F0F10' }} />
          </div>

          {/* Times */}
          <div className="mb-[18px] grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Hora de inicio</FieldLabel>
              <input value={startTime} onChange={e => setStartTime(e.target.value)} type="time" className="w-full rounded-lg border px-3 py-2.5 text-[16px] font-semibold outline-none" style={{ borderColor: '#E4E4E7', fontFamily: 'monospace' }} />
            </div>
            <div>
              <FieldLabel>Hora límite</FieldLabel>
              <input value={limitTime} onChange={e => setLimitTime(e.target.value)} type="time" className="w-full rounded-lg border px-3 py-2.5 text-[16px] font-semibold outline-none" style={{ borderColor: '#E4E4E7', fontFamily: 'monospace' }} />
            </div>
          </div>

          {/* Recurrence */}
          <div className="mb-[18px]">
            <FieldLabel>Recurrencia</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {RECURRENCE.map((r, i) => (
                <button key={r.label} onClick={() => setRecurrence(i)} className="rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition-colors" style={{ background: recurrence === i ? '#0F0F10' : '#F2F2F4', color: recurrence === i ? '#fff' : '#3A3A3D' }}>{r.label}</button>
              ))}
            </div>
            {recurrence === CUSTOM_IDX && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {DAY_NAMES.map((name, d) => (
                  <button key={d} onClick={() => toggleCustomDay(d)} className="rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition-colors" style={{ background: customDays.includes(d) ? 'var(--accent)' : '#F2F2F4', color: customDays.includes(d) ? '#fff' : '#3A3A3D' }}>{name}</button>
                ))}
              </div>
            )}
          </div>

          {/* Semana del mes */}
          <div className="mb-[18px]">
            <FieldLabel>Semana del mes</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {WEEK_OF_MONTH.map(w => {
                const on = weekOfMonth === w.value;
                return (
                  <button key={String(w.value)} onClick={() => setWeekOfMonth(w.value)} className="rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition-colors" style={{ background: on ? '#0F0F10' : '#F2F2F4', color: on ? '#fff' : '#3A3A3D' }}>{w.label}</button>
                );
              })}
            </div>
            {weekOfMonth != null && (
              <p className="mt-2 text-[11px]" style={{ color: '#6E6E73' }}>
                Se activa solo en {weekOfMonth === -1 ? 'la última semana' : `la ${weekOfMonth}ª semana`} de cada mes.
              </p>
            )}
          </div>

          {/* Assignees */}
          <div className="mb-[18px]">
            <div className="mb-2 flex items-center justify-between">
              <FieldLabel optional>Asignar a</FieldLabel>
              {selected.length > 0 && (
                <button onClick={() => setSelected([])} className="text-[11px] font-semibold" style={{ color: '#6E6E73' }}>Limpiar ✕</button>
              )}
            </div>
            <div className="mb-3 flex items-center gap-2 rounded-lg border p-3" style={{ borderColor: isGeneral ? 'var(--accent)' : '#E4E4E7', background: isGeneral ? '#FFF6F7' : '#F2F2F4' }}>
              <div className="h-2 w-2 rounded-full" style={{ background: isGeneral ? 'var(--accent)' : '#A8A8AD' }} />
              <p className="text-[12px] font-semibold" style={{ color: isGeneral ? 'var(--accent)' : '#6E6E73' }}>
                {isGeneral ? 'Actividad general — cualquier empleado puede realizarla' : `Asignada a: ${assigneeLabel}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {employees.map(e => {
                const on = selected.includes(e.id);
                return (
                  <button key={e.id} onClick={() => toggleEmployee(e.id)} className="flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 border transition-all" style={{ borderColor: on ? 'var(--accent)' : '#E4E4E7', borderWidth: 1.5, background: on ? '#FFF6F7' : '#fff' }}>
                    <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: e.color }}>{initials(e.name)}</div>
                    <span className="text-[12px] font-semibold" style={{ color: on ? 'var(--accent)' : '#0F0F10' }}>{e.name}</span>
                    {on && <span style={{ color: 'var(--accent)', fontSize: 12 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Evidence */}
          <div className="mb-[18px]">
            <FieldLabel>Evidencia requerida</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {EVIDENCE_FIELDS.map((ef, i) => (
                <Toggle key={ef.key} label={ef.label} on={evidence[i]} onToggle={() => setEvidence(prev => prev.map((v, j) => j === i ? !v : v))} />
              ))}
            </div>
          </div>

          {/* Reminders */}
          <div className="mt-[18px] rounded-xl p-5 text-white" style={{ background: '#0F0F10' }}>
            <div className="mb-3 flex items-center gap-2">
              <span>🔔</span>
              <h3 className="text-[13px] font-bold tracking-[0.3px]">RECORDATORIOS</h3>
            </div>
            <p className="mb-3.5 text-[12px]" style={{ color: 'rgba(255,255,255,.7)' }}>Si no se completa en la hora límite, enviar notificación cada:</p>
            <div className="grid grid-cols-4 gap-1.5">
              {REMINDER_MINUTES.map((min, i) => (
                <button key={min} onClick={() => setReminder(i)} className="rounded-lg py-2.5 text-center text-[12px] font-bold transition-colors" style={{ background: reminder === i ? 'var(--accent)' : 'rgba(255,255,255,.08)' }}>{min} min</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
