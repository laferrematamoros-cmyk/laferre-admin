'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import { supabase, Employee } from '@/lib/supabase';
import { useCompany } from '@/lib/company-context';
import { createActivity } from '../actions';

const RECURRENCE: { label: string; days: number[] }[] = [
  { label: 'Diaria',        days: [0,1,2,3,4,5,6] },
  { label: 'Lun-Vie',       days: [1,2,3,4,5] },
  { label: 'Lun-Sáb',       days: [1,2,3,4,5,6] },
  { label: 'Personalizado', days: [] },
];
const CUSTOM_IDX = 3; // índice de "Personalizado"

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

export default function NuevaActividadPage() {
  const router = useRouter();
  const { current: company } = useCompany();

  // Form state
  const titleRef       = useRef<HTMLInputElement>(null);
  const descRef        = useRef<HTMLTextAreaElement>(null);
  const startRef       = useRef<HTMLInputElement>(null);
  const limitRef       = useRef<HTMLInputElement>(null);

  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [selected, setSelected]     = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState(1); // Lun-Vie
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [reminder, setReminder]     = useState(0); // 5 min
  const [evidence, setEvidence]     = useState([true]); // [Foto]
  const [saving, setSaving]         = useState(false);

  const isGeneral = selected.length === 0;
  const effectiveDays = recurrence === CUSTOM_IDX ? customDays : RECURRENCE[recurrence].days;

  function toggleCustomDay(d: number) {
    setCustomDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  useEffect(() => {
    if (!company) return;
    supabase.from('employees').select('*').eq('is_active', true).eq('company_id', company.id).order('name')
      .then(({ data }) => { if (data) setEmployees(data); });
  }, [company]);

  function toggleEmployee(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const assigneeLabel = isGeneral
    ? 'Sin asignar'
    : employees.filter(e => selected.includes(e.id)).map(e => e.name.split(' ')[0]).join(', ');

  async function handleCreate() {
    const title = titleRef.current?.value.trim();
    if (!title) return;
    setSaving(true);

    try {
      await createActivity({
        title,
        description:           descRef.current?.value.trim() || null,
        start_time:            startRef.current?.value || '09:00',
        limit_time:            limitRef.current?.value || '10:00',
        recurrence:            RECURRENCE[recurrence].label.toLowerCase().replace(' ', '-'),
        days_of_week:          effectiveDays,
        assigned_employee_ids: selected,
        is_urgent:             false,
        reminder_minutes:      REMINDER_MINUTES[reminder],
        evidence_photo:        evidence[0],
        evidence_name:         false,
        evidence_note:         false,
        evidence_signature:    false,
        company_id:            company?.id,
      });
    } catch {
      setSaving(false);
      return;
    }

    setSaving(false);
    const startTime = startRef.current?.value || '09:00';
    fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '📋 Nueva actividad',
        body: `${title} · ${startTime}`,
        companyId: company?.id ?? null,
      }),
    });
    router.push('/dashboard');
  }

  return (
    <AdminShell>
      {/* Topbar */}
      <div className="flex items-center justify-between gap-5 border-b px-7 py-5" style={{ borderColor: '#E4E4E7', background: '#fff' }}>
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">Nueva actividad</h1>
          <p className="mt-0.5 text-[12px]" style={{ color: '#6E6E73' }}>Crea y asigna una tarea con hora límite y recordatorios</p>
        </div>
        <div className="flex items-center gap-[10px]">
          <button onClick={() => router.push('/dashboard')} className="rounded-[9px] border px-[14px] py-[9px] text-[13px] font-semibold" style={{ borderColor: '#E4E4E7', background: '#fff' }}>Cancelar</button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="rounded-[9px] px-[14px] py-[9px] text-[13px] font-semibold text-white transition-opacity"
            style={{ background: 'var(--accent)', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Guardando...' : 'Crear actividad'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-7">
        <div className="grid gap-[22px]" style={{ gridTemplateColumns: '1fr 360px' }}>
          {/* Left: Form */}
          <div className="rounded-xl border p-6" style={{ background: '#fff', borderColor: '#E4E4E7' }}>
            {/* Title */}
            <div className="mb-[18px]">
              <FieldLabel>Título de la actividad</FieldLabel>
              <input ref={titleRef} placeholder="Ej. Limpiar pasillo de plomería" className="w-full rounded-lg border px-3 py-2.5 text-[14px] outline-none focus:border-gray-400" style={{ borderColor: '#E4E4E7', color: '#0F0F10' }} />
            </div>

            {/* Description */}
            <div className="mb-[18px]">
              <FieldLabel optional>Descripción</FieldLabel>
              <textarea ref={descRef} placeholder="Instrucciones detalladas para el empleado..." rows={3} className="w-full resize-none rounded-lg border px-3 py-2.5 text-[14px] leading-relaxed outline-none focus:border-gray-400" style={{ borderColor: '#E4E4E7', color: '#0F0F10' }} />
            </div>

            {/* Times */}
            <div className="mb-[18px] grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Hora de inicio</FieldLabel>
                <input ref={startRef} type="time" defaultValue="09:00" className="w-full rounded-lg border px-3 py-2.5 text-[16px] font-semibold outline-none" style={{ borderColor: '#E4E4E7', fontFamily: 'monospace' }} />
              </div>
              <div>
                <FieldLabel>Hora límite</FieldLabel>
                <input ref={limitRef} type="time" defaultValue="10:00" className="w-full rounded-lg border px-3 py-2.5 text-[16px] font-semibold outline-none" style={{ borderColor: '#E4E4E7', fontFamily: 'monospace' }} />
              </div>
            </div>

            {/* Assignees */}
            <div className="mb-[18px]">
              <div className="mb-2 flex items-center justify-between">
                <FieldLabel optional>Asignar a</FieldLabel>
                {selected.length > 0 && (
                  <button onClick={() => setSelected([])} className="text-[11px] font-semibold" style={{ color: '#6E6E73' }}>
                    Limpiar selección ✕
                  </button>
                )}
              </div>

              <div className="mb-3 flex items-center gap-2 rounded-lg border p-3" style={{ borderColor: isGeneral ? 'var(--accent)' : '#E4E4E7', background: isGeneral ? '#FFF6F7' : '#F2F2F4' }}>
                <div className="h-2 w-2 rounded-full" style={{ background: isGeneral ? 'var(--accent)' : '#A8A8AD' }} />
                <div className="flex-1">
                  <p className="text-[12px] font-semibold" style={{ color: isGeneral ? 'var(--accent)' : '#6E6E73' }}>
                    {isGeneral ? 'Actividad general — cualquier empleado puede realizarla' : `Asignada a: ${assigneeLabel}`}
                  </p>
                  {isGeneral && (
                    <p className="mt-0.5 text-[11px]" style={{ color: '#A8A8AD' }}>
                      Al completar la actividad, el empleado indicará quién la realizó.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {employees.map(e => {
                  const on = selected.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      onClick={() => toggleEmployee(e.id)}
                      className="flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 border transition-all"
                      style={{ borderColor: on ? 'var(--accent)' : '#E4E4E7', borderWidth: 1.5, background: on ? '#FFF6F7' : '#fff' }}
                    >
                      <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: e.color }}>{initials(e.name)}</div>
                      <span className="text-[12px] font-semibold" style={{ color: on ? 'var(--accent)' : '#0F0F10' }}>{e.name}</span>
                      {on && <span style={{ color: 'var(--accent)', fontSize: 12 }}>✓</span>}
                    </button>
                  );
                })}
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
                  {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map((name, d) => (
                    <button key={d} onClick={() => toggleCustomDay(d)} className="rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition-colors" style={{ background: customDays.includes(d) ? 'var(--accent)' : '#F2F2F4', color: customDays.includes(d) ? '#fff' : '#3A3A3D' }}>{name}</button>
                  ))}
                </div>
              )}
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

          </div>

          {/* Right: Notifications + Preview */}
          <div className="flex flex-col gap-4">
            {/* Reminders */}
            <div className="rounded-xl p-[18px] text-white" style={{ background: '#0F0F10' }}>
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

            {/* Mobile preview */}
            <div className="rounded-xl border p-[18px]" style={{ background: '#fff', borderColor: '#E4E4E7' }}>
              <h3 className="mb-3 text-[13px] font-bold">Vista previa móvil</h3>
              <div className="rounded-[10px] p-3" style={{ background: '#FAFAFA', border: '1px solid #F2F2F4' }}>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: '#6E6E73' }}>
                  🕐 <span>{startRef.current?.value || '09:00'}–{limitRef.current?.value || '10:00'}</span>
                </div>
                <p className="mt-1 text-[13px] font-semibold" style={{ color: '#0F0F10' }}>
                  {titleRef.current?.value || 'Título de la actividad'}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: '#F2F2F4', color: '#6E6E73' }}>● Pendiente</span>
                  <span className="text-[11px] font-bold" style={{ color: isGeneral ? '#A8A8AD' : 'var(--accent)' }}>
                    {isGeneral ? 'General' : assigneeLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
