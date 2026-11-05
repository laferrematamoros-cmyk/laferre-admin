'use client';

import { useState } from 'react';
import type { Employee } from '@/lib/supabase';
import { EMPTY_VALUES, REMINDERS, summaryText, validate, type ActivityValues } from '@/lib/activity-form';
import { joinEs } from '@/lib/report-insights';
import { IconCamera, IconUsers } from '@/components/panel/icons';
import s from '@/components/panel/panel.module.css';
import f from './form.module.css';

const WEEK = [1, 2, 3, 4, 5, 6, 0];
const SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const PRESETS = [
  { label: 'Todos los días', days: [0, 1, 2, 3, 4, 5, 6] },
  { label: 'Lunes a viernes', days: [1, 2, 3, 4, 5] },
  { label: 'Lunes a sábado', days: [1, 2, 3, 4, 5, 6] },
];
const MONTH: { label: string; value: number | null }[] = [
  { label: 'Cada semana', value: null }, { label: '1ª', value: 1 }, { label: '2ª', value: 2 },
  { label: '3ª', value: 3 }, { label: '4ª', value: 4 }, { label: 'Última', value: -1 },
];

const same = (a: number[], b: number[]) => a.length === b.length && b.every(d => a.includes(d));
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const toggle = (list: string[] | number[], x: string | number) =>
  (list as (string | number)[]).includes(x) ? (list as (string | number)[]).filter(y => y !== x) : [...list, x];

/** Formulario único para crear y editar una actividad. */
export default function ActivityForm({ mode, initial = EMPTY_VALUES, employees, onSubmit, onCancel }: {
  mode: 'create' | 'edit';
  initial?: ActivityValues;
  employees: Pick<Employee, 'id' | 'name'>[];
  onSubmit: (v: ActivityValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [v, setV] = useState<ActivityValues>(initial);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const set = <K extends keyof ActivityValues>(k: K, val: ActivityValues[K]) => setV(p => ({ ...p, [k]: val }));

  const errs = tried ? validate(v) : {};
  const reminders = REMINDERS.includes(v.reminder) ? REMINDERS : [...REMINDERS, v.reminder].sort((a, b) => a - b);
  const names = employees.filter(e => v.assigned.includes(e.id)).map(e => e.name);
  const gone = v.assigned.filter(id => !employees.some(e => e.id === id)); // asignados dados de baja

  async function submit() {
    setTried(true);
    const e = validate(v);
    const first = (['title', 'limit', 'days'] as const).find(k => e[k]);
    if (first) {
      document.getElementById(`f-${first}`)?.focus();
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await onSubmit(v);
    } catch (err) {
      setSaveError(`No se pudo guardar: ${err instanceof Error ? err.message : 'error desconocido'}`);
      setSaving(false);
    }
  }

  return (
    <>
      <div className={f.wrap}>
        <div className={f.col}>
          <section className={s.card}>
            <h2 className={f.sectionTitle}>Qué hay que hacer</h2>
            <p className={f.sectionHint}>Así aparece en el teléfono del empleado.</p>
            <div className={f.fields}>
              <div className={f.field}>
                <label className={f.label} htmlFor="f-title">Nombre de la actividad</label>
                <input
                  id="f-title" className={`${f.input} ${errs.title ? f.invalid : ''}`} value={v.title} maxLength={120}
                  placeholder="Ej. Limpiar pasillo de plomería" onChange={e => set('title', e.target.value)}
                  aria-invalid={!!errs.title} aria-describedby={errs.title ? 'e-title' : undefined}
                />
                {errs.title && <p id="e-title" className={f.err}>{errs.title}</p>}
              </div>
              <div className={f.field}>
                <label className={f.label} htmlFor="f-desc">Instrucciones <span className={f.opt}>opcional</span></label>
                <textarea
                  id="f-desc" className={f.textarea} value={v.description} rows={3}
                  placeholder="Qué revisar, cómo hacerlo, qué foto tomar…" onChange={e => set('description', e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className={s.card}>
            <h2 className={f.sectionTitle}>Cuándo</h2>
            <p className={f.sectionHint}>{summaryText(v)}.</p>
            <div className={f.fields}>
              <div className={f.row2}>
                <div className={f.field}>
                  <label className={f.label} htmlFor="f-start">Empieza</label>
                  <input id="f-start" type="time" className={`${f.input} ${f.timeInput}`} value={v.start} onChange={e => set('start', e.target.value)} />
                </div>
                <div className={f.field}>
                  <label className={f.label} htmlFor="f-limit">Hora límite</label>
                  <input
                    id="f-limit" type="time" className={`${f.input} ${f.timeInput} ${errs.limit ? f.invalid : ''}`} value={v.limit}
                    onChange={e => set('limit', e.target.value)} aria-invalid={!!errs.limit} aria-describedby="e-limit"
                  />
                </div>
              </div>
              {errs.limit
                ? <p id="e-limit" className={f.err}>{errs.limit}</p>
                : <p id="e-limit" className={f.hint}>{v.optional ? 'Hasta esta hora se le recuerda. Si no se marca, no pasa nada.' : 'Si a la hora límite no se ha hecho, cuenta como atrasada.'}</p>}

              <div className={f.field}>
                <span className={f.label} id="l-days">Días</span>
                <div className={f.seg}>
                  {PRESETS.map(p => (
                    <button key={p.label} type="button" className={f.segBtn} aria-pressed={same(v.days, p.days)} onClick={() => set('days', p.days)}>{p.label}</button>
                  ))}
                </div>
                <div id="f-days" tabIndex={-1} className={f.dayGrid} role="group" aria-labelledby="l-days">
                  {WEEK.map(d => (
                    <button key={d} type="button" className={f.dayBtn} aria-pressed={v.days.includes(d)} onClick={() => set('days', toggle(v.days, d) as number[])}>
                      {SHORT[d]}
                    </button>
                  ))}
                </div>
                {errs.days && <p className={f.err}>{errs.days}</p>}
              </div>

              <div className={f.field}>
                <span className={f.label}>Semana del mes</span>
                <div className={f.seg}>
                  {MONTH.map(m => (
                    <button key={String(m.value)} type="button" className={f.segBtn} aria-pressed={v.weekOfMonth === m.value} onClick={() => set('weekOfMonth', m.value)}>{m.label}</button>
                  ))}
                </div>
                <p className={f.hint}>
                  {v.weekOfMonth == null
                    ? 'Se repite todas las semanas.'
                    : 'Sólo aparece esa semana de cada mes, en los días de arriba (como el inventario mensual).'}
                </p>
              </div>
            </div>
          </section>

          <section className={s.card}>
            <h2 className={f.sectionTitle}>Quién</h2>
            <p className={f.sectionHint}>
              {v.assigned.length === 0
                ? 'General: la puede hacer cualquiera. Al terminarla, el empleado dice quién la hizo.'
                : `Sólo le aparece a ${joinEs(names.length ? names : ['la persona elegida'])} en su teléfono.`}
            </p>
            <div className={f.people}>
              <button type="button" className={`${f.person} ${f.generalPill}`} aria-pressed={v.assigned.length === 0} onClick={() => set('assigned', [])}>
                <span className={f.pav}><IconUsers size={15} /></span>General
              </button>
              {employees.map(e => (
                <button key={e.id} type="button" className={f.person} aria-pressed={v.assigned.includes(e.id)} onClick={() => set('assigned', toggle(v.assigned, e.id) as string[])}>
                  <span className={f.pav}>{initials(e.name)}</span>{e.name}
                </button>
              ))}
            </div>
            {gone.length > 0 && (
              <p className={f.hint} style={{ marginTop: 10 }}>
                También está asignada a {gone.length === 1 ? 'un empleado dado de baja' : `${gone.length} empleados dados de baja`}.{' '}
                <button type="button" className={f.segBtn} style={{ minHeight: 30 }} onClick={() => set('assigned', v.assigned.filter(id => !gone.includes(id)))}>Quitar</button>
              </p>
            )}
          </section>

          <section className={s.card}>
            <h2 className={f.sectionTitle}>Al terminar y avisos</h2>
            <div className={f.fields}>
              <button type="button" className={f.switchRow} role="switch" aria-checked={v.photo} onClick={() => set('photo', !v.photo)}>
                <span>
                  <b>Pedir foto de evidencia</b>
                  <small>{v.photo ? 'El empleado toma una foto para marcarla como hecha.' : 'Basta con que confirme que la hizo.'}</small>
                </span>
                <span className={`${f.switch} ${v.photo ? f.switchOn : ''}`} aria-hidden />
              </button>
              <button type="button" className={f.switchRow} role="switch" aria-checked={v.optional} onClick={() => set('optional', !v.optional)}>
                <span>
                  <b>Actividad opcional</b>
                  <small>{v.optional ? 'Avisa y se puede marcar, pero si ese día no se hace no cuenta como sin hacer ni baja el porcentaje.' : 'Si no se hace, cuenta como sin hacer.'}</small>
                </span>
                <span className={`${f.switch} ${v.optional ? f.switchOn : ''}`} aria-hidden />
              </button>
              {v.optional ? (
                <p className={f.hint}>
                  Avisa al empezar y a la hora límite, y ya no insiste. <b>Pon la hora límite al cierre:</b> la app de los teléfonos todavía no conoce las opcionales,
                  así que al pasar esa hora la muestra en rojo como atrasada y manda un aviso. El panel y los reportes sí la tratan como opcional.
                </p>
              ) : (
              <div className={f.field}>
                <span className={f.label}>Recordatorio después de la hora límite</span>
                <div className={f.seg}>
                  {reminders.map(m => (
                    <button key={m} type="button" className={f.segBtn} aria-pressed={v.reminder === m} onClick={() => set('reminder', m)}>Cada {m} min</button>
                  ))}
                </div>
                <p className={f.hint}>Si pasa la hora límite y no se ha hecho, la app avisa cada {v.reminder} minutos hasta terminar la jornada.</p>
              </div>
              )}
            </div>
          </section>
        </div>

        <aside className={f.side}>
          <section className={s.card}>
            <h2 className={f.sectionTitle}>Así la verá el empleado</h2>
            <div className={f.phone} style={{ marginTop: 10 }}>
              <div className={f.phoneCard}>
                <span className={f.phoneTime}>{v.start} – {v.limit}</span>
                <span className={f.phoneTitle}>{v.title.trim() || 'Nombre de la actividad'}</span>
                {v.description.trim() && <span className={f.phoneDesc}>{v.description}</span>}
                <span className={f.phoneMeta}>
                  <span className={f.tag}>{v.assigned.length ? (names.length ? joinEs(names) : 'Asignada') : 'General'}</span>
                  {v.photo && <span className={f.tag}><IconCamera size={12} />Foto</span>}
                </span>
              </div>
            </div>
            <p className={f.summary} style={{ marginTop: 12 }}><b>{summaryText(v)}.</b></p>
          </section>
          {mode === 'edit' && (
            <p className={f.hint}>
              Si cambias los días, el horario o si es opcional, Reportes recalcula las semanas pasadas con lo nuevo.
              Si la actividad cambió de verdad, conviene archivarla y crear una nueva.
            </p>
          )}
        </aside>
      </div>

      <div className={f.bar}>
        {saveError && <p className={f.barMsg} role="alert">{saveError}</p>}
        {tried && Object.keys(errs).length > 0 && !saveError && <p className={f.barMsg} role="alert">Revisa lo que está marcado en rojo.</p>}
        <button type="button" className={f.btn} onClick={onCancel} disabled={saving}>Cancelar</button>
        <button type="button" className={`${f.btn} ${f.primary}`} onClick={submit} disabled={saving}>
          {saving ? 'Guardando…' : mode === 'create' ? 'Crear actividad' : 'Guardar cambios'}
        </button>
      </div>
    </>
  );
}
