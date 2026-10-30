'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { supabase, type Employee } from '@/lib/supabase';
import { useCompany } from '@/lib/company-context';
import { loadActivities, type LiveActivity } from '@/lib/load-activities';
import { IconBell, IconList, IconPlus } from '@/components/panel/icons';
import s from '@/components/panel/panel.module.css';
import q from '@/components/equipo/eq.module.css';
import { createEmployee, deleteEmployee, setEmployeeActive, updateEmployee, type Result } from './actions';

type EmpType = 'empleado' | 'practicante';
type Emp = Employee & { emp_type?: EmpType | null; push_token?: string | null };
interface FormState { name: string; role: string; color: string; empType: EmpType; }

const COLORS = ['#E11D2E', '#0F9D58', '#1A73E8', '#F2A20C', '#9B4DCA', '#00ACC1', '#FF7043', '#5E35B1'];
const EMPTY: FormState = { name: '', role: '', color: COLORS[0], empType: 'empleado' };

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

/** Actividades (no archivadas) a su nombre, y cuáles sólo tienen a esta persona activa. */
function assignedTo(id: string, acts: LiveActivity[], activeIds: Set<string>) {
  const mine = acts.filter(a => !a.archived_at && a.assigned_employee_ids.includes(id));
  const onlyMe = mine.filter(a => a.assigned_employee_ids.every(x => x === id || !activeIds.has(x)));
  return { mine, onlyMe };
}

export default function EquipoPage() {
  const { current: company } = useCompany();
  const [emps, setEmps] = useState<Emp[] | null>(null);
  const [acts, setActs] = useState<LiveActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ emp: Emp | null } | null>(null);

  const load = useCallback(async () => {
    if (!company) return;
    try {
      const [e, a] = await Promise.all([
        supabase.from('employees').select('*').eq('company_id', company.id).order('name'),
        loadActivities(supabase, company.id),
      ]);
      if (e.error) throw new Error(e.error.message);
      setEmps((e.data ?? []) as Emp[]);
      setActs(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el equipo.');
    }
  }, [company]);

  useEffect(() => { load(); }, [load]);

  async function run(id: string, fn: () => Promise<Result>) {
    setBusy(id);
    setError(null);
    const r = await fn();
    if (!r.ok) setError(r.error);
    await load();
    setBusy(null);
    setConfirmId(null);
  }

  const active = (emps ?? []).filter(e => e.is_active);
  const inactive = (emps ?? []).filter(e => !e.is_active);
  const activeIds = new Set(active.map(e => e.id));
  const withPhone = active.filter(e => e.push_token).length;

  return (
    <AdminShell>
      <div className={s.page}>
        <header className={s.top}>
          <div>
            <div className={s.eyebrow}><i />{company?.name ?? 'Actividades'} · Actividades</div>
            <h1 className={s.title}>Equipo</h1>
            <div className={s.sub}>
              {emps ? `${active.length} activo${active.length === 1 ? '' : 's'} · ${withPhone} con avisos en su teléfono` : 'Cargando…'}
            </div>
          </div>
          <div className={s.tools}>
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => setDialog({ emp: null })}><IconPlus />Nuevo empleado</button>
          </div>
        </header>

        <div className={s.content}>
          {error && <div className={s.error}>{error}</div>}
          {!emps ? (
            !error && <p className={s.loading}>Cargando equipo…</p>
          ) : (
            <>
              {active.length === 0 ? (
                <p className={s.foot}>Todavía no hay empleados activos.</p>
              ) : (
                <div className={q.grid}>
                  {active.map(e => {
                    const { mine, onlyMe } = assignedTo(e.id, acts, activeIds);
                    return (
                      <article key={e.id} className={`${s.card} ${q.card}`}>
                        <div className={q.who}>
                          <span className={q.av} style={{ background: e.color }}>{initials(e.name)}</span>
                          <div className={q.name}><b>{e.name}</b><span>{e.role}</span></div>
                        </div>
                        <div className={q.facts}>
                          <span className={`${q.chip} ${e.emp_type === 'practicante' ? q.chipPrac : ''}`}>{e.emp_type === 'practicante' ? 'Practicante' : 'Empleado'}</span>
                          {e.push_token
                            ? <span className={`${q.chip} ${q.chipOk}`}><IconBell size={13} />Recibe avisos</span>
                            : <span className={`${q.chip} ${q.chipWarn}`} title="Que abra la app de actividades en su teléfono y escoja su nombre"><IconBell size={13} />Sin teléfono registrado</span>}
                          <span className={q.chip}><IconList size={13} />{mine.length ? `${mine.length} a su nombre` : 'Sólo generales'}</span>
                        </div>
                        {confirmId === e.id ? (
                          <div className={q.confirm} role="alert">
                            <span><b>¿Dar de baja a {e.name}?</b> Deja de aparecer en la app y en las listas. Su historial se conserva y lo puedes reactivar.</span>
                            {onlyMe.length > 0 && (
                              <span>
                                Estas actividades quedarían sin nadie que las vea en su teléfono; después pásalas a otra persona o hazlas generales en Actividades:
                                <ul>{onlyMe.map(a => <li key={a.id}>{a.title}</li>)}</ul>
                              </span>
                            )}
                            <div className={q.confirmBtns}>
                              <button type="button" className={`${q.btn} ${q.dark}`} disabled={busy === e.id} onClick={() => run(e.id, () => setEmployeeActive(e.id, false))}>
                                {busy === e.id ? 'Guardando…' : 'Sí, dar de baja'}
                              </button>
                              <button type="button" className={q.btn} onClick={() => setConfirmId(null)}>Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <div className={q.actions}>
                            <button type="button" className={`${q.btn} ${q.dark}`} onClick={() => setDialog({ emp: e })}>Editar</button>
                            <button type="button" className={`${q.btn} ${q.danger}`} onClick={() => setConfirmId(e.id)}>Dar de baja</button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}

              {inactive.length > 0 && (
                <>
                  <p className={q.secLbl}>Dados de baja ({inactive.length})</p>
                  <div className={q.grid}>
                    {inactive.map(e => (
                      <article key={e.id} className={`${s.card} ${q.card} ${q.off}`}>
                        <div className={q.who}>
                          <span className={q.av} style={{ background: e.color }}>{initials(e.name)}</span>
                          <div className={q.name}><b>{e.name}</b><span>{e.role}</span></div>
                        </div>
                        <div className={q.actions}>
                          <button type="button" className={q.btn} onClick={() => setDialog({ emp: e })}>Editar</button>
                          <button type="button" className={q.btn} disabled={busy === e.id} onClick={() => run(e.id, () => setEmployeeActive(e.id, true))}>
                            {busy === e.id ? 'Guardando…' : 'Reactivar'}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {dialog && company && (
          <EmployeeDialog
            emp={dialog.emp}
            companyId={company.id}
            onClose={() => setDialog(null)}
            onSaved={async () => { setDialog(null); await load(); }}
          />
        )}
      </div>
    </AdminShell>
  );
}

function EmployeeDialog({ emp, companyId, onClose, onSaved }: {
  emp: Emp | null; companyId: string; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(
    emp ? { name: emp.name, role: emp.role, color: emp.color, empType: emp.emp_type ?? 'empleado' } : EMPTY,
  );
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [askDelete, setAskDelete] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const missing = { name: !form.name.trim(), role: !form.role.trim() };

  async function save() {
    setTried(true);
    if (missing.name || missing.role) return;
    setSaving(true);
    setErr(null);
    const payload = { name: form.name.trim(), role: form.role.trim(), color: form.color, emp_type: form.empType, initials: initials(form.name) };
    const r = emp ? await updateEmployee(emp.id, payload) : await createEmployee(payload, companyId);
    if (!r.ok) { setErr(`No se pudo guardar: ${r.error}`); setSaving(false); return; }
    await onSaved();
  }

  async function remove() {
    if (!emp) return;
    setSaving(true);
    setErr(null);
    const r = await deleteEmployee(emp.id);
    if (!r.ok) { setErr(r.error); setSaving(false); setAskDelete(false); return; }
    await onSaved();
  }

  return (
    <>
      <div className={q.overlay} onClick={onClose} />
      <div className={q.dialog} role="dialog" aria-modal="true" aria-label={emp ? 'Editar empleado' : 'Nuevo empleado'}>
        <div className={q.dHead}>
          <h2>{emp ? 'Editar empleado' : 'Nuevo empleado'}</h2>
          <button type="button" className={q.btn} onClick={onClose}>Cerrar</button>
        </div>
        <div className={q.dBody}>
          <div className={q.field}>
            <label className={q.label} htmlFor="e-name">Nombre</label>
            <input id="e-name" ref={nameRef} className={`${q.input} ${tried && missing.name ? q.invalid : ''}`} value={form.name} maxLength={60}
              placeholder="Ej. Carlos Martínez" onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className={q.field}>
            <label className={q.label} htmlFor="e-role">Puesto</label>
            <input id="e-role" className={`${q.input} ${tried && missing.role ? q.invalid : ''}`} value={form.role} maxLength={60}
              placeholder="Ej. Vendedor, almacenista" onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
          </div>
          {tried && (missing.name || missing.role) && <p className={q.err}>Escribe {missing.name && missing.role ? 'el nombre y el puesto' : missing.name ? 'el nombre' : 'el puesto'}.</p>}
          <div className={q.field}>
            <span className={q.label}>Tipo</span>
            <div className={q.seg}>
              {(['empleado', 'practicante'] as EmpType[]).map(t => (
                <button key={t} type="button" aria-pressed={form.empType === t} onClick={() => setForm(f => ({ ...f, empType: t }))}>
                  {t === 'empleado' ? 'Empleado' : 'Practicante'}
                </button>
              ))}
            </div>
          </div>
          <div className={q.field}>
            <span className={q.label}>Color</span>
            <div className={q.swatches}>
              {COLORS.map(c => (
                <button key={c} type="button" className={q.sw} style={{ background: c }} aria-pressed={form.color === c} aria-label={`Color ${c}`} onClick={() => setForm(f => ({ ...f, color: c }))} />
              ))}
            </div>
            <p className={q.hint}>Así aparece en la app de los empleados cuando escogen su nombre.</p>
          </div>
          <div className={q.preview}>
            <span className={q.av} style={{ background: form.color }}>{initials(form.name)}</span>
            <div className={q.name}><b>{form.name.trim() || 'Nombre'}</b><span>{form.role.trim() || 'Puesto'} · {form.empType === 'practicante' ? 'Practicante' : 'Empleado'}</span></div>
          </div>
          {err && <p className={q.err} role="alert">{err}</p>}
          <div className={q.dFoot}>
            <button type="button" className={q.btn} onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="button" className={`${q.btn} ${q.dark}`} onClick={save} disabled={saving}>{saving ? 'Guardando…' : emp ? 'Guardar cambios' : 'Crear empleado'}</button>
          </div>
          {emp && (
            <div className={q.dangerZone}>
              {askDelete ? (
                <>
                  <p className={q.hint}><b>¿Eliminar a {emp.name} para siempre?</b> Sólo se puede si nunca ha registrado actividades; si tiene historial, mejor dale de baja.</p>
                  <div className={q.confirmBtns}>
                    <button type="button" className={`${q.btn} ${q.danger}`} disabled={saving} onClick={remove}>Sí, eliminar</button>
                    <button type="button" className={q.btn} onClick={() => setAskDelete(false)}>Cancelar</button>
                  </div>
                </>
              ) : (
                <button type="button" className={`${q.btn} ${q.danger}`} onClick={() => setAskDelete(true)}>Eliminar empleado</button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
