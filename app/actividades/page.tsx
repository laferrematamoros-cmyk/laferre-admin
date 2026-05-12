'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/lib/company-context';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

interface Activity {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  limit_time: string;
  days_of_week: number[];
  is_urgent: boolean;
  is_active: boolean;
  assigned_employee_ids: string[];
  recurrence: string;
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: color + '18', color }}>
      {children}
    </span>
  );
}

export default function ActividadesPage() {
  const router = useRouter();
  const { current: company } = useCompany();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    const { data } = await supabase
      .from('activities')
      .select('*')
      .eq('company_id', company.id)
      .order('start_time');
    if (data) setActivities(data);
    setLoading(false);
  }, [company]);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(act: Activity) {
    await supabase.from('activities').update({ is_active: !act.is_active }).eq('id', act.id);
    setActivities(prev => prev.map(a => a.id === act.id ? { ...a, is_active: !a.is_active } : a));
  }

  async function deleteActivity(id: string) {
    setDeleting(id);
    await supabase.from('completions').delete().eq('activity_id', id);
    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (error) {
      alert('Error al eliminar: ' + error.message);
      setDeleting(null);
      setConfirmId(null);
      return;
    }
    setActivities(prev => prev.filter(a => a.id !== id));
    setDeleting(null);
    setConfirmId(null);
  }

  return (
    <AdminShell>
      {/* Topbar */}
      <div className="flex items-center justify-between gap-5 border-b px-7 py-5" style={{ borderColor: '#E4E4E7', background: '#fff' }}>
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">Actividades</h1>
          <p className="mt-0.5 text-[12px]" style={{ color: '#6E6E73' }}>
            {activities.length} actividad{activities.length !== 1 ? 'es' : ''} configurada{activities.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => router.push('/actividades/nueva')}
          className="rounded-[9px] px-[14px] py-[9px] text-[13px] font-semibold text-white"
          style={{ background: 'var(--accent)' }}
        >
          + Nueva actividad
        </button>
      </div>

      <div className="flex-1 overflow-auto p-7">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[13px]" style={{ color: '#A8A8AD' }}>
            Cargando...
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-[32px]">📋</p>
            <p className="text-[15px] font-semibold" style={{ color: '#3A3A3D' }}>Sin actividades</p>
            <p className="text-[13px]" style={{ color: '#A8A8AD' }}>Crea tu primera actividad para empezar</p>
            <button
              onClick={() => router.push('/actividades/nueva')}
              className="mt-2 rounded-[9px] px-4 py-2 text-[13px] font-semibold text-white"
              style={{ background: 'var(--accent)' }}
            >
              + Nueva actividad
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {activities.map(act => (
              <div
                key={act.id}
                className="rounded-xl border p-5"
                style={{ background: '#fff', borderColor: act.is_active ? '#E4E4E7' : '#F2F2F4', opacity: act.is_active ? 1 : 0.6 }}
              >
                <div className="flex items-start gap-4">
                  {/* Time block */}
                  <div className="shrink-0 rounded-lg px-3 py-2 text-center" style={{ background: '#F2F2F4', minWidth: 72 }}>
                    <p className="text-[11px] font-semibold" style={{ color: '#6E6E73' }}>Inicio</p>
                    <p className="text-[15px] font-bold" style={{ fontFamily: 'monospace', color: '#0F0F10' }}>{act.start_time.slice(0, 5)}</p>
                    <p className="mt-0.5 text-[10px]" style={{ color: '#A8A8AD' }}>límite {act.limit_time.slice(0, 5)}</p>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[15px] font-bold" style={{ color: '#0F0F10' }}>{act.title}</p>
                      {act.is_urgent && <Badge color="#E11D2E">🔴 Urgente</Badge>}
                      {!act.is_active && <Badge color="#A8A8AD">Pausada</Badge>}
                    </div>
                    {act.description && (
                      <p className="mt-0.5 text-[12px] truncate" style={{ color: '#6E6E73' }}>{act.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(act.days_of_week as number[]).map(d => (
                        <span key={d} className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: '#F2F2F4', color: '#3A3A3D' }}>
                          {DAY_NAMES[d]}
                        </span>
                      ))}
                      {act.assigned_employee_ids.length === 0 && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: '#F0FDF4', color: '#16A34A' }}>General</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Toggle active */}
                    <button
                      onClick={() => toggleActive(act)}
                      className="rounded-lg px-3 py-1.5 text-[12px] font-semibold border transition-colors"
                      style={{
                        borderColor: act.is_active ? '#E4E4E7' : 'var(--accent)',
                        color: act.is_active ? '#6E6E73' : 'var(--accent)',
                        background: '#fff',
                      }}
                    >
                      {act.is_active ? 'Pausar' : 'Activar'}
                    </button>

                    {/* Delete */}
                    {confirmId === act.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px]" style={{ color: '#6E6E73' }}>¿Eliminar?</span>
                        <button
                          onClick={() => deleteActivity(act.id)}
                          disabled={deleting === act.id}
                          className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white"
                          style={{ background: '#E11D2E', opacity: deleting === act.id ? 0.6 : 1 }}
                        >
                          {deleting === act.id ? '...' : 'Sí, eliminar'}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="rounded-lg px-3 py-1.5 text-[12px] font-semibold border"
                          style={{ borderColor: '#E4E4E7', color: '#6E6E73' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmId(act.id)}
                        className="rounded-lg px-3 py-1.5 text-[12px] font-semibold border transition-colors"
                        style={{ borderColor: '#E4E4E7', color: '#E11D2E', background: '#fff' }}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
