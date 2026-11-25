'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import { supabase, type Activity, type Employee } from '@/lib/supabase';
import { useCompany } from '@/lib/company-context';
import { matchesWeekOfMonth } from '@/lib/reports';
import { fromActivity, toRow, type ActivityValues } from '@/lib/activity-form';
import { rolNow } from '@/lib/checklist-config';
import type { ChecklistConfig } from '@/lib/checklist-types';
import ActivityForm, { type InitialList, type NewList } from '@/components/actividades/ActivityForm';
import DutyChanges from '@/components/actividades/DutyChanges';
import s from '@/components/panel/panel.module.css';
import { updateActivityWithList } from '../actions';
import { getChecklistConfig } from '../checklist-actions';

/** Cómo está guardada la lista, para arrancar el formulario (aunque esté apagada). */
function toInitialList(cfg: ChecklistConfig): InitialList {
  return {
    enabled: cfg.enabled,
    tasks: cfg.items.map(i => ({ key: i.id, id: i.id, area: i.area, label: i.label, days: [...i.days], needs_photo: i.needs_photo, photo_count: i.photo_count })),
    ...rolNow(cfg.rotations, cfg.today),
  };
}

/** Editar actividad en una sola pantalla: los datos, si es Normal o Lista con firma y, con lista,
 *  sus tareas, su rol y los cambios de semana o día (supabase/010 y 013). */
export default function EditActividadPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { current: company } = useCompany();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [employees, setEmployees] = useState<Pick<Employee, 'id' | 'name'>[] | null>(null);
  const [cfg, setCfg] = useState<ChecklistConfig | null>(null);
  const [initialList, setInitialList] = useState<InitialList | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!company || !id) return;
    Promise.all([
      supabase.from('activities').select('*').eq('id', id).maybeSingle(),
      supabase.from('employees').select('id, name').eq('is_active', true).eq('company_id', company.id).order('name'),
      getChecklistConfig(id),
    ]).then(([act, emps, conf]) => {
      if (act.error) { setError(act.error.message); return; }
      if (!act.data) { setError('No se encontró esta actividad.'); return; }
      if (!conf.ok) { setError(`No se pudo cargar la lista: ${conf.error}`); return; }
      setActivity(act.data as Activity);
      setEmployees(emps.data ?? []);
      setCfg(conf.config);
      setInitialList(toInitialList(conf.config));
    });
  }, [company, id]);

  // Después de un cambio de semana o día: sólo se recargan el rol y los cambios (el formulario no se reinicia).
  const reloadDuty = useCallback(async () => {
    const r = await getChecklistConfig(id);
    if (r.ok) setCfg(r.config);
  }, [id]);

  async function save(v: ActivityValues, list?: NewList) {
    if (!activity) return;
    // is_active: las mensuales las mantiene el cron por semana; si deja de ser mensual,
    // se vuelve a prender (si no, quedaría apagada sin que se note). Las demás no se tocan.
    const active = activity.archived_at ? {}
      : v.weekOfMonth != null ? { is_active: matchesWeekOfMonth(v.weekOfMonth, new Date()) }
      : activity.week_of_month != null ? { is_active: true }
      : {};
    const r = await updateActivityWithList(activity.id, { ...toRow(v), ...active },
      list ? { items: list.items, order: list.order, current: list.current, rotChanged: list.rotChanged } : null);
    if (!r.ok) throw new Error(r.error);
    router.push('/actividades');
  }

  return (
    <AdminShell>
      <div className={s.page}>
        <header className={s.top}>
          <div>
            <div className={s.eyebrow}><i />{company?.name ?? 'Actividades'} · Actividades</div>
            <h1 className={s.title}>Editar actividad</h1>
            <div className={s.sub}>{activity ? activity.title : 'Cargando…'}</div>
          </div>
          {activity && cfg && (cfg.enabled || cfg.items.length > 0) && (
            <Link href={`/actividades/${activity.id}/bitacora`} className={`${s.btn} ${s.btnSoft}`}>Ver bitácora</Link>
          )}
        </header>
        <div className={s.content}>
          {error ? (
            <div className={s.error}>
              {error}
              <button type="button" className={`${s.btn} ${s.btnSoft}`} onClick={() => router.push('/actividades')}>Volver a Actividades</button>
            </div>
          ) : !activity || !employees || !cfg || !initialList ? (
            <p className={s.loading}>Cargando…</p>
          ) : (
            <ActivityForm
              key={activity.id} mode="edit" initial={fromActivity(activity)} initialList={initialList} employees={employees}
              rolExtra={<DutyChanges activityId={activity.id} employees={employees} rotations={cfg.rotations} overrides={cfg.overrides} today={cfg.today} onChanged={reloadDuty} />}
              onSubmit={save} onCancel={() => router.push('/actividades')}
            />
          )}
        </div>
      </div>
    </AdminShell>
  );
}
