'use client';

import { useEffect, useState } from 'react';
import { IconCamera, IconCaretDown, IconCaretUp, IconPlus, IconX } from '@/components/panel/icons';
import f from './form.module.css';
import c from './checklist.module.css';

const WEEK = [1, 2, 3, 4, 5, 6, 0];
const LETTER = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const DAY_NAME = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MON_SAT = [1, 2, 3, 4, 5, 6];

/** Una tarea en edición: `key` es para React; `id` sólo si ya está guardada. */
export interface TaskDraft { key: string; id?: string; area: string; label: string; days: number[]; needs_photo: boolean; }

let seq = 0;
export const newKey = () => `n${++seq}`;

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

/** Áreas y tareas de una lista con firma. Controlado: quien lo usa guarda el borrador.
 *  Las tareas nuevas toman `defaultDays` (si viene vacío, lunes a sábado). */
export default function ChecklistTasks({ draft, onChange, defaultDays }: {
  draft: TaskDraft[];
  onChange: (d: TaskDraft[]) => void;
  defaultDays: number[];
}) {
  const [newArea, setNewArea] = useState('');
  const areas = [...new Set(draft.map(d => d.area))];
  const startDays = () => (defaultDays.length ? [...defaultDays].sort((a, b) => a - b) : [...MON_SAT]);
  const blank = (area: string): TaskDraft => ({ key: newKey(), area, label: '', days: startDays(), needs_photo: false });

  const patch = (key: string, p: Partial<TaskDraft>) => onChange(draft.map(d => (d.key === key ? { ...d, ...p } : d)));
  const move = (key: string, dir: -1 | 1) => {
    const i = draft.findIndex(d => d.key === key);
    let j = i + dir;
    while (j >= 0 && j < draft.length && draft[j].area !== draft[i].area) j += dir;
    if (j < 0 || j >= draft.length) return;
    const out = [...draft];
    [out[i], out[j]] = [out[j], out[i]];
    onChange(out);
  };
  const addTask = (area: string) => {
    const last = draft.map(d => d.area).lastIndexOf(area);
    const out = [...draft];
    out.splice(last + 1, 0, blank(area));
    onChange(out);
  };
  const addArea = () => {
    const name = newArea.trim();
    if (!name) return;
    onChange([...draft, blank(name)]);
    setNewArea('');
  };

  return (
    <div className={f.fields}>
      {areas.map(area => {
        const rows = draft.filter(d => d.area === area);
        return (
          <div key={area} className={c.area}>
            <div className={c.areaHead}>
              <AreaName value={area} onCommit={v => onChange(draft.map(d => (d.area === area ? { ...d, area: v } : d)))} />
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
                  <button type="button" className={c.mini} aria-label="Quitar" onClick={() => onChange(draft.filter(x => x.key !== d.key))}><IconX size={14} /></button>
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
  );
}
