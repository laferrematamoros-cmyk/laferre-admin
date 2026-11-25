'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Employee } from '@/lib/supabase';
import type { ChecklistConfig } from '@/lib/checklist-types';
import { cleanItems } from '@/lib/checklist-config';
import { dutyOn, upcomingDuty, type Rotation } from '@/lib/duty';
import { IconCamera } from '@/components/panel/icons';
import s from '@/components/panel/panel.module.css';
import f from './form.module.css';
import c from './checklist.module.css';
import ChecklistTasks, { type TaskDraft } from './ChecklistTasks';
import RotationPicker from './RotationPicker';
import {
  addDutyOverride, getChecklistConfig, removeDutyOverride, saveChecklistItems, saveRotation, setChecklistEnabled,
} from '@/app/actividades/checklist-actions';

const MON_SAT = [1, 2, 3, 4, 5, 6];

const toDraft = (cfg: ChecklistConfig): TaskDraft[] =>
  cfg.items.map(i => ({ key: i.id, id: i.id, area: i.area, label: i.label, days: [...i.days], needs_photo: i.needs_photo }));
const bare = (d: TaskDraft[]) => JSON.stringify(d.map(({ key: _k, ...x }) => x));

/** "2026-11-23" → "23 nov" */
function dayMonth(date: string): string {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(`${date}T12:00:00Z`)).replace('.', '');
}

/** La versión del rol vigente hoy (o la más nueva si ninguna ha empezado). */
function currentRotation(rots: Rotation[], today: string): Rotation | null {
  const started = rots.filter(r => r.valid_from <= today);
  const pool = started.length ? started : rots;
  return [...pool].sort((a, b) => b.valid_from.localeCompare(a.valid_from) || b.created_at.localeCompare(a.created_at))[0] ?? null;
}

/** Tareas, rol semanal y cambios de una actividad con lista con firma (supabase/010). */
export default function ChecklistEditor({ activityId, employees }: {
  activityId: string;
  employees: Pick<Employee, 'id' | 'name'>[];
}) {
  const [cfg, setCfg] = useState<ChecklistConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<TaskDraft[]>([]);
  const [itemsMsg, setItemsMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [rotMsg, setRotMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [change, setChange] = useState<{ kind: 'week' | 'day'; date: string; who: string } | null>(null);
  const [switchMsg, setSwitchMsg] = useState<string | null>(null);

  const names = useMemo(() => new Map(employees.map(e => [e.id, e.name])), [employees]);
  const nameOf = (id: string | null) => (id ? names.get(id) ?? 'Dado de baja' : 'Nadie');

  const load = useCallback(async () => {
    const r = await getChecklistConfig(activityId);
    if (!r.ok) { setLoadError(r.error); return; }
    setLoadError(null);
    setCfg(r.config);
    setDraft(toDraft(r.config));
    const rot = currentRotation(r.config.rotations, r.config.today);
    const now = rot ? dutyOn([rot], [], r.config.today) : null;
    const ids = rot ? rot.employee_ids : [];
    const i = now ? ids.indexOf(now) : 0;
    const ordered = i > 0 ? [...ids.slice(i), ...ids.slice(0, i)] : ids;
    setOrder(ordered);
    setCurrent(ordered[0] ?? null);
  }, [activityId]);

  useEffect(() => { load(); }, [load]);

  if (loadError) return <div className={s.error}>No se pudo cargar la lista: {loadError}</div>;
  if (!cfg) return <p className={s.loading}>Cargando la lista…</p>;

  // ── Tareas ──
  const dirty = bare(draft) !== bare(toDraft(cfg));

  async function saveItems() {
    setItemsMsg(null);
    const clean = cleanItems(draft.map(({ key: _k, ...x }) => x));
    if (!clean.ok) { setItemsMsg({ ok: false, text: clean.error }); return; }
    setBusy('items');
    const r = await saveChecklistItems(activityId, clean.items);
    setBusy(null);
    if (!r.ok) { setItemsMsg({ ok: false, text: r.error }); return; }
    await load();
    setItemsMsg({ ok: true, text: 'Tareas guardadas.' });
  }

  // ── Rol ──
  const rot = currentRotation(cfg.rotations, cfg.today);
  const rotDirty = !rot ? order.length > 0
    : JSON.stringify(order) !== JSON.stringify((() => {
        const now = dutyOn([rot], [], cfg.today);
        const i = now ? rot.employee_ids.indexOf(now) : 0;
        return i > 0 ? [...rot.employee_ids.slice(i), ...rot.employee_ids.slice(0, i)] : rot.employee_ids;
      })()) || current !== order[0];

  async function saveRot() {
    setRotMsg(null);
    if (!current) { setRotMsg({ ok: false, text: 'Elige a quién le toca esta semana.' }); return; }
    setBusy('rot');
    const r = await saveRotation(activityId, order, current);
    setBusy(null);
    if (!r.ok) { setRotMsg({ ok: false, text: r.error }); return; }
    await load();
    setRotMsg({ ok: true, text: 'Rol guardado. Cuenta desde hoy; las semanas pasadas no cambian.' });
  }

  async function saveChange() {
    if (!change) return;
    setRotMsg(null);
    setBusy('change');
    const r = await addDutyOverride(activityId, change.kind, change.date, change.who);
    setBusy(null);
    if (!r.ok) { setRotMsg({ ok: false, text: r.error }); return; }
    setChange(null);
    await load();
  }

  async function dropChange(id: string) {
    setBusy(id);
    const r = await removeDutyOverride(id);
    setBusy(null);
    if (!r.ok) { setRotMsg({ ok: false, text: r.error }); return; }
    await load();
  }

  const weeks = upcomingDuty(cfg.rotations, cfg.overrides, cfg.today, 5);
  const base = upcomingDuty(cfg.rotations, [], cfg.today, 5);

  // ── Interruptor ──
  async function toggle() {
    setSwitchMsg(null);
    if (!cfg!.enabled && !window.confirm('Al prenderla, el teléfono de quien esté de turno enseña la lista del día y la actividad sólo cuenta cuando tú la firmes. ¿La prendo?')) return;
    setBusy('switch');
    const r = await setChecklistEnabled(activityId, !cfg!.enabled);
    setBusy(null);
    if (!r.ok) { setSwitchMsg(r.error); return; }
    await load();
  }

  return (
    <div className={f.wrap}>
      <div className={f.col}>
        <section className={s.card}>
          <h2 className={f.sectionTitle}>Tareas</h2>
          <p className={f.sectionHint}>
            Cada día el teléfono enseña sólo las tareas de ese día. Las que tienen <span className={c.icon}><IconCamera size={13} /></span> piden foto.
            Quitar una tarea no la borra de las bitácoras pasadas.
          </p>
          <ChecklistTasks draft={draft} onChange={setDraft} defaultDays={MON_SAT} />
          <div className={c.saveBar}>
            {itemsMsg && <p className={`${c.msg} ${itemsMsg.ok ? c.msgOk : c.msgErr}`} role="status">{itemsMsg.text}</p>}
            <button type="button" className={f.btn} disabled={!dirty || busy === 'items'} onClick={() => { setDraft(toDraft(cfg)); setItemsMsg(null); }}>Deshacer cambios</button>
            <button type="button" className={`${f.btn} ${f.primary}`} disabled={!dirty || busy === 'items'} onClick={saveItems}>
              {busy === 'items' ? 'Guardando…' : 'Guardar tareas'}
            </button>
          </div>
        </section>
      </div>

      <aside className={f.col}>
        <section className={s.card}>
          <button type="button" className={f.switchRow} role="switch" aria-checked={cfg.enabled} onClick={toggle} disabled={busy === 'switch'}>
            <span>
              <b>Lista con firma</b>
              <small>
                {cfg.enabled
                  ? 'Prendida: quien está de turno ve la lista en su teléfono y la actividad cuenta cuando la firmas.'
                  : 'Apagada: la actividad funciona como siempre (una foto). Prende cuando la lista y el rol estén listos.'}
              </small>
            </span>
            <span className={`${f.switch} ${cfg.enabled ? f.switchOn : ''}`} aria-hidden />
          </button>
          {switchMsg && <p className={`${c.msg} ${c.msgErr}`} role="alert" style={{ marginTop: 10 }}>{switchMsg}</p>}
        </section>

        <section className={s.card}>
          <h2 className={f.sectionTitle}>Rol semanal</h2>
          <p className={f.sectionHint}>Cada semana (lunes a sábado) le toca a una persona, en este orden, y vuelve a empezar.</p>
          <div className={f.fields}>
            <RotationPicker employees={employees} order={order} current={current} onChange={(o, cur) => { setOrder(o); setCurrent(cur); }} />
            <div className={c.saveBar} style={{ marginTop: 0 }}>
              {rotMsg && <p className={`${c.msg} ${rotMsg.ok ? c.msgOk : c.msgErr}`} role="status">{rotMsg.text}</p>}
              <button type="button" className={`${f.btn} ${f.primary}`} disabled={!rotDirty || order.length === 0 || busy === 'rot'} onClick={saveRot}>
                {busy === 'rot' ? 'Guardando…' : 'Guardar rol'}
              </button>
            </div>

            {cfg.rotations.length > 0 && (
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
              </div>
            )}

            {cfg.rotations.length > 0 && (change ? (
              <div className={c.change}>
                <b>{change.kind === 'week' ? 'Cambiar una semana' : 'Cambiar un día'}</b>
                <div className={c.changeRow}>
                  <label className={f.field}>
                    <span className={f.label}>{change.kind === 'week' ? 'Cualquier día de esa semana' : 'Día'}</span>
                    <input type="date" className={f.input} min={cfg.today} value={change.date} onChange={e => setChange({ ...change, date: e.target.value })} />
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
                <button type="button" className={f.segBtn} onClick={() => setChange({ kind: 'week', date: cfg.today, who: '' })}>Cambiar esta semana</button>
                <button type="button" className={f.segBtn} onClick={() => setChange({ kind: 'day', date: cfg.today, who: '' })}>Cambiar un día</button>
              </div>
            ))}

            {cfg.overrides.length > 0 && (
              <div className={f.field}>
                <span className={f.label}>Cambios</span>
                <div className={c.overrides}>
                  {cfg.overrides.map(o => (
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
          </div>
        </section>
      </aside>
    </div>
  );
}
