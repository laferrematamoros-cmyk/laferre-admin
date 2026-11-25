'use client';

import { useState } from 'react';
import type { Employee } from '@/lib/supabase';
import { upcomingDuty, type DutyOverride, type Rotation } from '@/lib/duty';
import f from './form.module.css';
import c from './checklist.module.css';
import { addDutyOverride, removeDutyOverride } from '@/app/actividades/checklist-actions';

/** "2026-11-23" → "23 nov" */
function dayMonth(date: string): string {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(`${date}T12:00:00Z`)).replace('.', '');
}

/** Debajo del rol al editar: quién la hace las próximas semanas y los cambios de una semana o un día.
 *  Los cambios se guardan al momento (no esperan a "Guardar cambios") y cuentan con el rol ya guardado. */
export default function DutyChanges({ activityId, employees, rotations, overrides, today, onChanged }: {
  activityId: string;
  employees: Pick<Employee, 'id' | 'name'>[];
  rotations: Rotation[];
  overrides: (DutyOverride & { id: string })[];
  today: string;
  onChanged: () => Promise<void>;
}) {
  const [change, setChange] = useState<{ kind: 'week' | 'day'; date: string; who: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  if (rotations.length === 0) return null;

  const names = new Map(employees.map(e => [e.id, e.name]));
  const nameOf = (id: string | null) => (id ? names.get(id) ?? 'Dado de baja' : 'Nadie');
  const weeks = upcomingDuty(rotations, overrides, today, 5);
  const base = upcomingDuty(rotations, [], today, 5);

  async function saveChange() {
    if (!change) return;
    setMsg(null);
    setBusy('change');
    const r = await addDutyOverride(activityId, change.kind, change.date, change.who);
    if (!r.ok) { setBusy(null); setMsg(r.error); return; }
    setChange(null);
    await onChanged();
    setBusy(null);
  }

  async function dropChange(id: string) {
    setMsg(null);
    setBusy(id);
    const r = await removeDutyOverride(id);
    if (!r.ok) { setBusy(null); setMsg(r.error); return; }
    await onChanged();
    setBusy(null);
  }

  return (
    <>
      <div className={f.field}>
        <span className={f.label}>Quién la hace</span>
        <div className={c.weeks}>
          {weeks.map((w, i) => (
            <div key={w.weekStart} className={c.week}>
              <span className={i === 0 ? c.weekNow : undefined}>{i === 0 ? 'Esta semana' : `Semana del ${dayMonth(w.weekStart)}`}</span>
              <span>
                <b>{nameOf(w.employeeId)}</b>{' '}
                {w.employeeId !== base[i].employeeId && <span className={c.tag}>cambio</span>}
              </span>
            </div>
          ))}
        </div>
        <p className={f.hint}>Con el rol guardado. Si cambias el rol arriba, se ve aquí después de guardar.</p>
      </div>

      {change ? (
        <div className={c.change}>
          <b>{change.kind === 'week' ? 'Cambiar una semana' : 'Cambiar un día'}</b>
          <div className={c.changeRow}>
            <label className={f.field}>
              <span className={f.label}>{change.kind === 'week' ? 'Cualquier día de esa semana' : 'Día'}</span>
              <input type="date" className={f.input} min={today} value={change.date} onChange={e => setChange({ ...change, date: e.target.value })} />
            </label>
            <label className={f.field}>
              <span className={f.label}>La hace</span>
              <select className={f.select} value={change.who} onChange={e => setChange({ ...change, who: e.target.value })}>
                <option value="">Elige…</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </label>
          </div>
          <div className={c.saveBar} style={{ marginTop: 0 }}>
            <button type="button" className={f.btn} onClick={() => setChange(null)}>Cancelar</button>
            <button type="button" className={`${f.btn} ${f.primary}`} disabled={!change.who || !change.date || busy === 'change'} onClick={saveChange}>
              {busy === 'change' ? 'Guardando…' : 'Guardar cambio'}
            </button>
          </div>
        </div>
      ) : (
        <div className={f.seg}>
          <button type="button" className={f.segBtn} onClick={() => setChange({ kind: 'week', date: today, who: '' })}>Cambiar esta semana</button>
          <button type="button" className={f.segBtn} onClick={() => setChange({ kind: 'day', date: today, who: '' })}>Cambiar un día</button>
        </div>
      )}

      {overrides.length > 0 && (
        <div className={f.field}>
          <span className={f.label}>Cambios</span>
          <div className={c.overrides}>
            {overrides.map(o => (
              <div key={o.id} className={c.override}>
                <span>
                  {o.from_date === o.to_date ? dayMonth(o.from_date) : `${dayMonth(o.from_date)} al ${dayMonth(o.to_date)}`}: <b>{nameOf(o.employee_id)}</b>
                </span>
                <button type="button" className={c.mini} disabled={busy === o.id} onClick={() => dropChange(o.id)}>Quitar</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {msg && <p className={`${c.msg} ${c.msgErr}`} role="alert">{msg}</p>}
    </>
  );
}
