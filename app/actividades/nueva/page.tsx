'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import { supabase, type Employee } from '@/lib/supabase';
import { useCompany } from '@/lib/company-context';
import { matchesWeekOfMonth } from '@/lib/reports';
import { toRow, type ActivityValues } from '@/lib/activity-form';
import ActivityForm from '@/components/actividades/ActivityForm';
import s from '@/components/panel/panel.module.css';
import { createActivity } from '../actions';

export default function NuevaActividadPage() {
  const router = useRouter();
  const { current: company } = useCompany();
  const [employees, setEmployees] = useState<Pick<Employee, 'id' | 'name'>[] | null>(null);

  useEffect(() => {
    if (!company) return;
    supabase.from('employees').select('id, name').eq('is_active', true).eq('company_id', company.id).order('name')
      .then(({ data }) => setEmployees(data ?? []));
  }, [company]);

  async function save(v: ActivityValues) {
    if (!company) throw new Error('Escoge una empresa en el menú.');
    await createActivity({
      ...toRow(v),
      // Si es mensual y no estamos en su semana, arranca apagada (el cron la prende en su semana).
      is_active: v.weekOfMonth == null ? true : matchesWeekOfMonth(v.weekOfMonth, new Date()),
      is_urgent: false,
      evidence_name: false,
      evidence_note: false,
      evidence_signature: false,
      company_id: company.id,
    });
    // Aviso a los teléfonos de la empresa (si falla, la actividad ya quedó creada).
    fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '📋 Nueva actividad', body: `${v.title.trim()} · ${v.start}`, companyId: company.id }),
    }).catch(() => {});
    router.push('/actividades');
  }

  return (
    <AdminShell>
      <div className={s.page}>
        <header className={s.top}>
          <div>
            <div className={s.eyebrow}><i />{company?.name ?? 'Actividades'} · Actividades</div>
            <h1 className={s.title}>Nueva actividad</h1>
            <div className={s.sub}>Aparecerá en la app de los empleados en sus días y horario.</div>
          </div>
        </header>
        <div className={s.content}>
          {!employees
            ? <p className={s.loading}>Cargando…</p>
            : <ActivityForm key={company?.id} mode="create" employees={employees} onSubmit={save} onCancel={() => router.push('/actividades')} />}
        </div>
      </div>
    </AdminShell>
  );
}
