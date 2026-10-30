'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import { supabase, type Activity, type Employee } from '@/lib/supabase';
import { useCompany } from '@/lib/company-context';
import { matchesWeekOfMonth } from '@/lib/reports';
import { fromActivity, toRow, type ActivityValues } from '@/lib/activity-form';
import ActivityForm from '@/components/actividades/ActivityForm';
import s from '@/components/panel/panel.module.css';
import { updateActivity } from '../actions';

export default function EditActividadPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { current: company } = useCompany();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [employees, setEmployees] = useState<Pick<Employee, 'id' | 'name'>[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!company || !id) return;
    Promise.all([
      supabase.from('activities').select('*').eq('id', id).maybeSingle(),
      supabase.from('employees').select('id, name').eq('is_active', true).eq('company_id', company.id).order('name'),
    ]).then(([act, emps]) => {
      if (act.error) { setError(act.error.message); return; }
      if (!act.data) { setError('No se encontró esta actividad.'); return; }
      setActivity(act.data as Activity);
      setEmployees(emps.data ?? []);
    });
  }, [company, id]);

  async function save(v: ActivityValues) {
    if (!activity) return;
    // is_active: las mensuales las mantiene el cron por semana; si deja de ser mensual,
    // se vuelve a prender (si no, quedaría apagada sin que se note). Las demás no se tocan.
    const active = activity.archived_at ? {}
      : v.weekOfMonth != null ? { is_active: matchesWeekOfMonth(v.weekOfMonth, new Date()) }
      : activity.week_of_month != null ? { is_active: true }
      : {};
    await updateActivity(activity.id, { ...toRow(v), ...active });
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
        </header>
        <div className={s.content}>
          {error ? (
            <div className={s.error}>
              {error}
              <button type="button" className={`${s.btn} ${s.btnSoft}`} onClick={() => router.push('/actividades')}>Volver a Actividades</button>
            </div>
          ) : !activity || !employees ? (
            <p className={s.loading}>Cargando…</p>
          ) : (
            <ActivityForm key={activity.id} mode="edit" initial={fromActivity(activity)} employees={employees} onSubmit={save} onCancel={() => router.push('/actividades')} />
          )}
        </div>
      </div>
    </AdminShell>
  );
}
