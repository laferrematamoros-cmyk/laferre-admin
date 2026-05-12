'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminShell from '@/components/AdminShell';
import { supabase, Employee } from '@/lib/supabase';
import { useCompany } from '@/lib/company-context';

const COLORS = ['#E11D2E', '#0F9D58', '#1A73E8', '#F2A20C', '#9B4DCA', '#00ACC1', '#FF7043', '#5E35B1'];

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase();
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,.45)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 shadow-xl" style={{ background: '#fff' }}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[17px] font-bold">{title}</h2>
          <button onClick={onClose} className="text-[20px] leading-none" style={{ color: '#A8A8AD' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

type EmpType = 'empleado' | 'practicante';
interface FormState { name: string; role: string; color: string; empType: EmpType; }
const EMPTY: FormState = { name: '', role: '', color: COLORS[0], empType: 'empleado' };

export default function EquipoPage() {
  const { current: company } = useCompany();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editEmp, setEditEmp]     = useState<Employee | null>(null);
  const [form, setForm]           = useState<FormState>(EMPTY);
  const [error, setError]         = useState('');

  const load = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    const { data } = await supabase.from('employees').select('*').eq('company_id', company.id).order('name');
    setEmployees((data ?? []) as Employee[]);
    setLoading(false);
  }, [company]);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditEmp(null);
    setForm(EMPTY);
    setError('');
    setShowModal(true);
  }

  function openEdit(emp: Employee) {
    setEditEmp(emp);
    setForm({ name: emp.name, role: emp.role, color: emp.color, empType: (emp as any).emp_type ?? 'empleado' });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.role.trim()) { setError('Nombre y puesto son requeridos.'); return; }
    setSaving(true);
    setError('');
    if (editEmp) {
      const { error: err } = await supabase.from('employees').update({
        name: form.name.trim(),
        role: form.role.trim(),
        color: form.color,
        emp_type: form.empType,
        initials: initials(form.name.trim()),
      }).eq('id', editEmp.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('employees').insert({
        name: form.name.trim(),
        role: form.role.trim(),
        color: form.color,
        emp_type: form.empType,
        initials: initials(form.name.trim()),
        is_active: true,
        company_id: company!.id,
      });
      if (err) { setError(err.message); setSaving(false); return; }
    }
    setSaving(false);
    setShowModal(false);
    load();
  }

  async function toggleActive(emp: Employee) {
    await supabase.from('employees').update({ is_active: !emp.is_active }).eq('id', emp.id);
    load();
  }

  async function handleDelete(emp: Employee) {
    if (!confirm(`¿Eliminar a ${emp.name}? Esta acción no se puede deshacer.`)) return;
    await supabase.from('employees').delete().eq('id', emp.id);
    load();
  }

  const active   = employees.filter(e => e.is_active);
  const inactive = employees.filter(e => !e.is_active);

  return (
    <AdminShell>
      {/* Topbar */}
      <div className="flex items-center justify-between gap-5 border-b px-7 py-5" style={{ borderColor: '#E4E4E7', background: '#fff' }}>
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">Equipo</h1>
          <p className="mt-0.5 text-[12px]" style={{ color: '#6E6E73' }}>{active.length} empleados activos</p>
        </div>
        <button
          onClick={openNew}
          className="rounded-[9px] px-[14px] py-[9px] text-[13px] font-semibold text-white"
          style={{ background: 'var(--accent)' }}
        >
          + Nuevo empleado
        </button>
      </div>

      <div className="flex-1 overflow-auto p-7">
        {loading ? (
          <p className="text-[13px] text-center py-10" style={{ color: '#A8A8AD' }}>Cargando...</p>
        ) : (
          <>
            {/* Active */}
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[1.5px]" style={{ color: '#6E6E73' }}>Activos</h2>
            <div className="mb-7 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {active.map(emp => (
                <EmpCard key={emp.id} emp={emp} onEdit={openEdit} onToggle={toggleActive} onDelete={handleDelete} />
              ))}
              {active.length === 0 && (
                <p className="text-[13px]" style={{ color: '#A8A8AD' }}>Sin empleados activos.</p>
              )}
            </div>

            {/* Inactive */}
            {inactive.length > 0 && (
              <>
                <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[1.5px]" style={{ color: '#A8A8AD' }}>Inactivos</h2>
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                  {inactive.map(emp => (
                    <EmpCard key={emp.id} emp={emp} onEdit={openEdit} onToggle={toggleActive} onDelete={handleDelete} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <Modal title={editEmp ? 'Editar empleado' : 'Nuevo empleado'} onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4">
            <Field label="Nombre completo">
              <input
                className="w-full rounded-[9px] border px-3 py-2 text-[13px] outline-none"
                style={{ borderColor: '#E4E4E7' }}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ej. Carlos Martínez"
              />
            </Field>
            <Field label="Puesto">
              <input
                className="w-full rounded-[9px] border px-3 py-2 text-[13px] outline-none"
                style={{ borderColor: '#E4E4E7' }}
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                placeholder="Ej. Vendedor, Almacenista"
              />
            </Field>
            <Field label="Tipo">
              <div className="flex gap-2">
                {(['empleado', 'practicante'] as EmpType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setForm(f => ({ ...f, empType: t }))}
                    className="flex-1 rounded-[9px] border py-[9px] text-[13px] font-semibold capitalize transition-colors"
                    style={{
                      borderColor: form.empType === t ? '#0F0F10' : '#E4E4E7',
                      background: form.empType === t ? '#0F0F10' : '#fff',
                      color: form.empType === t ? '#fff' : '#3A3A3D',
                    }}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Color de identificación">
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    className="h-7 w-7 rounded-full border-2 transition-transform"
                    style={{ background: c, borderColor: form.color === c ? '#0F0F10' : 'transparent', transform: form.color === c ? 'scale(1.2)' : 'scale(1)' }}
                  />
                ))}
              </div>
            </Field>

            {/* Preview */}
            <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: '#F2F2F4' }}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white" style={{ background: form.color }}>
                {form.name ? initials(form.name) : '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold">{form.name || 'Nombre empleado'}</p>
                <p className="text-[11px]" style={{ color: '#6E6E73' }}>{form.role || 'Puesto'}</p>
              </div>
              <span
                className="shrink-0 rounded-full px-[8px] py-[3px] text-[10px] font-bold"
                style={form.empType === 'practicante'
                  ? { background: '#EEE6FA', color: '#9B4DCA' }
                  : { background: '#E5F4EC', color: '#0F9D58' }}
              >
                {form.empType === 'practicante' ? 'PRACTICANTE' : 'EMPLEADO'}
              </span>
            </div>

            {error && <p className="text-[12px]" style={{ color: '#E11D2E' }}>{error}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowModal(false)} className="flex-1 rounded-[9px] border py-[10px] text-[13px] font-semibold" style={{ borderColor: '#E4E4E7' }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 rounded-[9px] py-[10px] text-[13px] font-semibold text-white" style={{ background: 'var(--accent)', opacity: saving ? .6 : 1 }}>
                {saving ? 'Guardando...' : editEmp ? 'Guardar cambios' : 'Crear empleado'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AdminShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px]" style={{ color: '#6E6E73' }}>{label}</label>
      {children}
    </div>
  );
}

function EmpCard({ emp, onEdit, onToggle, onDelete }: { emp: Employee; onEdit: (e: Employee) => void; onToggle: (e: Employee) => void; onDelete: (e: Employee) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border p-4" style={{ background: '#fff', borderColor: '#E4E4E7', opacity: emp.is_active ? 1 : 0.55 }}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white" style={{ background: emp.color }}>
        {initials(emp.name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-semibold truncate">{emp.name}</p>
          {(emp as any).emp_type === 'practicante' && (
            <span className="shrink-0 rounded-full px-[6px] py-[2px] text-[9px] font-bold" style={{ background: '#EEE6FA', color: '#9B4DCA' }}>PRAC</span>
          )}
        </div>
        <p className="text-[11px]" style={{ color: '#6E6E73' }}>{emp.role}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onEdit(emp)}
          className="rounded-[7px] border px-[10px] py-[6px] text-[11px] font-semibold"
          style={{ borderColor: '#E4E4E7', color: '#3A3A3D' }}
        >
          Editar
        </button>
        <button
          onClick={() => onToggle(emp)}
          className="rounded-[7px] px-[10px] py-[6px] text-[11px] font-semibold"
          style={{ background: emp.is_active ? '#FCE7E9' : '#E5F4EC', color: emp.is_active ? '#E11D2E' : '#0F9D58' }}
        >
          {emp.is_active ? 'Desactivar' : 'Activar'}
        </button>
        <button
          onClick={() => onDelete(emp)}
          className="rounded-[7px] px-[10px] py-[6px] text-[11px] font-semibold"
          style={{ background: '#F2F2F4', color: '#6E6E73' }}
          title="Eliminar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
