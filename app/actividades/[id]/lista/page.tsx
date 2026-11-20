'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import { supabase, type Activity, type Employee } from '@/lib/supabase';
import { useCompany } from '@/lib/company-context';
import ChecklistEditor from '@/components/actividades/ChecklistEditor';
import s from '@/components/panel/panel.module.css';

/** Lista con firma de una actividad: tareas, rol semanal y cambios (supabase/010). */
export default function ListaPage() {
  const { id } = useParams<{ id: string }>();
  const { current: company } = useCompany();
  const [activity, setActivity] = useState<Pick<Activity, 'id' | 'title'> | null>(null);
  const [employees, setEmployees] = useState<Pick<Employee, 'id' | 'name'>[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!company || !id) return;
    Promise.all([
      supabase.from('activities').select('id, title').eq('id', id).eq('company_id', company.id).maybeSingle(),
      supabase.from('employees').select('id, name').eq('is_active', true).eq('company_id', company.id).order('name'),
    ]).then(([act, emps]) => {
      if (act.error) { setError(act.error.message); return; }
      if (!act.data) { setError('No se encontró esta actividad.'); return; }
      setActivity(act.data);
      setEmployees(emps.data ?? []);
    });
  }, [company, id]);

  return (
    <AdminShell>
      <div className={s.page}>
        <header className={s.top}>
          <div>
            <div className={s.eyebrow}><i />{company?.name ?? 'Actividades'} · Lista con firma</div>
            <h1 className={s.title}>{activity ? activity.title : 'Lista con firma'}</h1>
            <div className={s.sub}>Las tareas de cada día, quién la hace cada semana y la firma.</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Link href={`/actividades/${id}/bitacora`} className={`${s.btn} ${s.btnSoft}`}>Ver bitácora</Link>
            <Link href={`/actividades/${id}`} className={s.btn}>Volver a la actividad</Link>
          </div>
        </header>
        <div className={s.content}>
          {error ? <div className={s.error}>{error}</div>
            : !activity || !employees ? <p className={s.loading}>Cargando…</p>
            : <ChecklistEditor activityId={activity.id} employees={employees} />}
        </div>
      </div>
    </AdminShell>
  );
}
