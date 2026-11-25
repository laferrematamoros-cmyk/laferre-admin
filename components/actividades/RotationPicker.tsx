'use client';

import type { Employee } from '@/lib/supabase';
import { IconCaretDown, IconCaretUp, IconX } from '@/components/panel/icons';
import f from './form.module.css';
import c from './checklist.module.css';

/** El orden del rol semanal y a quién le toca esta semana. Controlado: quien lo usa guarda los dos.
 *  Quitar a la de esta semana le pasa el ✓ a la primera que queda; la primera que se agrega lo trae. */
export default function RotationPicker({ employees, order, current, onChange }: {
  employees: Pick<Employee, 'id' | 'name'>[];
  order: string[];
  current: string | null;
  onChange: (order: string[], current: string | null) => void;
}) {
  const names = new Map(employees.map(e => [e.id, e.name]));
  const outside = employees.filter(e => !order.includes(e.id));
  const shift = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const out = [...order];
    [out[i], out[j]] = [out[j], out[i]];
    onChange(out, current);
  };
  const remove = (id: string) => {
    const out = order.filter(x => x !== id);
    onChange(out, current === id ? out[0] ?? null : current);
  };

  return (
    <>
      <div className={c.order}>
        {order.length === 0 && <p className={f.hint}>Todavía no hay nadie en el rol.</p>}
        {order.map((id, i) => (
          <div key={id} className={c.member}>
            <span className={c.num}>{i + 1}</span>
            <span className={c.name}>{names.get(id) ?? 'Dado de baja'}</span>
            <span className={c.tools}>
              <button type="button" className={c.mini} aria-label="Subir" disabled={i === 0} onClick={() => shift(i, -1)}><IconCaretUp size={14} /></button>
              <button type="button" className={c.mini} aria-label="Bajar" disabled={i === order.length - 1} onClick={() => shift(i, 1)}><IconCaretDown size={14} /></button>
              <button type="button" className={c.mini} aria-label="Quitar del rol" onClick={() => remove(id)}><IconX size={14} /></button>
            </span>
            <button type="button" className={c.now} aria-pressed={current === id} onClick={() => onChange(order, id)}>
              {current === id ? '✓ Le toca esta semana' : 'Le toca esta semana'}
            </button>
          </div>
        ))}
      </div>
      {outside.length > 0 && (
        <div className={c.addPerson}>
          <select
            className={f.select} aria-label="Agregar al rol" value=""
            onChange={e => { const id = e.target.value; if (id) onChange([...order, id], current ?? id); }}
          >
            <option value="">Agregar persona al rol…</option>
            {outside.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      )}
    </>
  );
}
