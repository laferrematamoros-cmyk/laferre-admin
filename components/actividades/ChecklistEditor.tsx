'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Employee } from '@/lib/supabase';
import type { ChecklistConfig } from '@/lib/checklist-types';
import { cleanItems } from '@/lib/checklist-config';
import { dutyOn, upcomingDuty, type Rotation } from '@/lib/duty';
import { IconCamera, IconCaretDown, IconCaretUp, IconPlus, IconX } from '@/components/panel/icons';
import s from '@/components/panel/panel.module.css';
import f from './form.module.css';
import c from './checklist.module.css';
import {
  addDutyOverride, getChecklistConfig, removeDutyOverride, saveChecklistItems, saveRotation, setChecklistEnabled,
} from '@/app/actividades/checklist-actions';

const WEEK = [1, 2, 3, 4, 5, 6, 0];
const LETTER = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const DAY_NAME = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

interface Draft { key: string; id?: string; area: string; label: string; days: number[]; needs_photo: boolean; }

let seq = 0;
const newKey = () => `n${++seq}`;
const toDraft = (cfg: ChecklistConfig): Draft[] =>
  cfg.items.map(i => ({ key: i.id, id: i.id, area: i.area, label: i.label, days: [...i.days], needs_photo: i.needs_photo }));
const bare = (d: Draft[]) => JSON.stringify(d.map(({ key: _k, ...x }) => x));

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

/** El nombre de un área se guarda al salir del campo (escribir no mezcla áreas a medias). */
function AreaName({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input
      className={c.areaName} value={v} maxLength={60} aria-label="Nombre del área"
      onChange={e => setV(e.target.value)}
      onBlur={() => { const t = v.trim(); if (t && t !== value) onCommit(t); else setV(value); }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
    />
  );
}

/** Tareas, rol semanal y cambios de una actividad con lista con firma (supabase/010). */
export default function ChecklistEditor({ activityId, employees }: {
  activityId: string;
  employees: Pick<Employee, 'id' | 'name'>[];
}) {
  const [cfg, setCfg] = useState<ChecklistConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft[]>([]);
  const [newArea, setNewArea] = useState('');
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
  const areas = [...new Set(draft.map(d => d.area))];
  const patch = (key: string, p: Partial<Draft>) => setDraft(ds => ds.map(d => (d.key === key ? { ...d, ...p } : d)));
  const move = (key: string, dir: -1 | 1) => setDraft(ds => {
    const i = ds.findIndex(d => d.key === key);
    let j = i + dir;
    while (j >= 0 && j < ds.length && ds[j].area !== ds[i].area) j += dir;
    if (j < 0 || j >= ds.length) return ds;
    const out = [...ds];
    [out[i], out[j]] = [out[j], out[i]];
    return out;
  });
  const addTask = (area: string) => setDraft(ds => {
    const last = ds.map(d => d.area).lastIndexOf(area);
    const out = [...ds];
    out.splice(last + 1, 0, { key: newKey(), area, label: '', days: [1, 2, 3, 4, 5, 6], needs_photo: false });
    return out;
  });
  const addArea = () => {
    const name = newArea.trim();
    if (!name) return;
    setDraft(ds => [...ds, { key: newKey(), area: name, label: '', days: [1, 2, 3, 4, 5, 6], needs_photo: false }]);
    setNewArea('');
  };

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
  const outside = employees.filter(e => !order.includes(e.id));
  const shift = (i: number, dir: -1 | 1) => setOrder(o => {
    const j = i + dir;
    if (j < 0 || j >= o.length) return o;
    const out = [...o];
    [out[i], out[j]] = [out[j], out[i]];
    return out;
  });

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
          <div className={f.fields}>
            {areas.map(area => {
              const rows = draft.filter(d => d.area === area);
              return (
                <div key={area} className={c.area}>
                  <div className={c.areaHead}>
                    <AreaName value={area} onCommit={v => setDraft(ds => ds.map(d => (d.area === area ? { ...d, area: v } : d)))} />
                    <span className={c.count}>{rows.length} {rows.length === 1 ? 'tarea' : 'tareas'}</span>
                  </div>
                  {rows.map((d, idx) => (
                    <div key={d.key} className={c.row}>
                      <input
                        className={c.label} value={d.label} maxLength={120} placeholder="Nombre de la tarea"
                        aria-label="Nombre de la tarea" onChange={e => patch(d.key, { label: e.target.value })}
                      />
                      <div className={c.days} role="group" aria-label={`Días de ${d.label || 'la tarea'}`}>
                        {WEEK.map(day => (
                          <button
                            key={day} type="button" className={c.day} aria-pressed={d.days.includes(day)} aria-label={DAY_NAME[day]}
                            onClick={() => patch(d.key, { days: d.days.includes(day) ? d.days.filter(x => x !== day) : [...d.days, day] })}
                          >
                            {LETTER[day]}
                          </button>
                        ))}
                      </div>
                      <div className={c.tools}>
                        <button
                          type="button" className={`${c.mini} ${c.photo}`} aria-pressed={d.needs_photo}
                          aria-label="Pide foto" title={d.needs_photo ? 'Pide foto' : 'No pide foto'}
                          onClick={() => patch(d.key, { needs_photo: !d.needs_photo })}
                        >
                          <IconCamera size={15} />
                        </button>
                        <button type="button" className={c.mini} aria-label="Subir" disabled={idx === 0} onClick={() => move(d.key, -1)}><IconCaretUp size={14} /></button>
                        <button type="button" className={c.mini} aria-label="Bajar" disabled={idx === rows.length - 1} onClick={() => move(d.key, 1)}><IconCaretDown size={14} /></button>
                        <button type="button" className={c.mini} aria-label="Quitar" onClick={() => setDraft(ds => ds.filter(x => x.key !== d.key))}><IconX size={14} /></button>
                      </div>
                    </div>
                  ))}
                  <button type="button" className={`${f.segBtn} ${c.addRow}`} onClick={() => addTask(area)}>
                    <IconPlus size={13} /> Agregar tarea
                  </button>
                </div>
              );
            })}
            <div className={c.newArea}>
              <input
                className={f.input} value={newArea} maxLength={60} placeholder="Nueva área (ej. Bodega)" aria-label="Nueva área"
                onChange={e => setNewArea(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addArea(); }}
              />
              <button type="button" className={f.btn} onClick={addArea} disabled={!newArea.trim()}>Agregar área</button>
            </div>
          </div>
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
            <div className={c.order}>
              {order.length === 0 && <p className={f.hint}>Todavía no hay nadie en el rol.</p>}
              {order.map((id, i) => (
                <div key={id} className={c.member}>
                  <span className={c.num}>{i + 1}</span>
                  <span className={c.name}>{nameOf(id)}</span>
                  <span className={c.tools}>
                    <button type="button" className={c.mini} aria-label="Subir" disabled={i === 0} onClick={() => shift(i, -1)}><IconCaretUp size={14} /></button>
                    <button type="button" className={c.mini} aria-label="Bajar" disabled={i === order.length - 1} onClick={() => shift(i, 1)}><IconCaretDown size={14} /></button>
                    <button
                      type="button" className={c.mini} aria-label="Quitar del rol"
                      onClick={() => { setOrder(o => o.filter(x => x !== id)); if (current === id) setCurrent(order.find(x => x !== id) ?? null); }}
                    >
                      <IconX size={14} />
                    </button>
                  </span>
                  <button type="button" className={c.now} aria-pressed={current === id} onClick={() => setCurrent(id)}>
                    {current === id ? '✓ Le toca esta semana' : 'Le toca esta semana'}
                  </button>
                </div>
              ))}
            </div>
            {outside.length > 0 && (
              <div className={c.addPerson}>
                <select className={f.select} aria-label="Agregar al rol" value="" onChange={e => { if (e.target.value) { setOrder(o => [...o, e.target.value]); if (!current) setCurrent(e.target.value); } }}>
                  <option value="">Agregar persona al rol…</option>
                  {outside.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            )}
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
