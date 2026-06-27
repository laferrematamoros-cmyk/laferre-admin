'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminShell from '@/components/AdminShell';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/lib/company-context';
import { createUrgentAlert, deactivateUrgentAlert, deleteUrgentAlert } from './actions';

interface UrgentAlert {
  id: string;
  title: string;
  created_at: string;
  is_active: boolean;
  acks: { employee_name: string; seen_at: string }[];
}

export default function UrgentePage() {
  const { current } = useCompany();
  const [alerts, setAlerts]     = useState<UrgentAlert[]>([]);
  const [title, setTitle]       = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('urgent_alerts')
      .select('id, title, created_at, is_active')
      .order('created_at', { ascending: false })
      .limit(20);
    if (current?.id) q = q.eq('company_id', current.id);
    const { data: rows } = await q;

    const enriched: UrgentAlert[] = await Promise.all(
      (rows ?? []).map(async (row: any) => {
        const { data: acks } = await supabase
          .from('urgent_alert_acks')
          .select('employee_name, seen_at')
          .eq('alert_id', row.id)
          .order('seen_at');
        return { ...row, acks: acks ?? [] };
      })
    );
    setAlerts(enriched);
    setLoading(false);
  }, [current?.id]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!title.trim()) return;
    setCreating(true);

    await createUrgentAlert(title.trim(), current?.id ?? null);

    // Send push notification via server-side API
    await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '🚨 Actividad Urgente',
        body: title.trim(),
        companyId: current?.id ?? null,
      }),
    });

    setTitle('');
    setCreating(false);
    load();
  }

  async function handleDeactivate(id: string) {
    await deactivateUrgentAlert(id);
    load();
  }

  async function handleDelete(id: string) {
    await deleteUrgentAlert(id);
    load();
  }

  const active  = alerts.filter(a => a.is_active);
  const history = alerts.filter(a => !a.is_active);

  return (
    <AdminShell>
      <div className="flex flex-1 flex-col overflow-y-auto p-8 gap-8">
        <div>
          <h1 className="text-[22px] font-extrabold" style={{ color: '#0F0F10', letterSpacing: -0.4 }}>Actividad Urgente</h1>
          <p className="text-[13px] mt-1" style={{ color: '#6E6E73' }}>
            Activa una alarma que sonará en los celulares de todos los empleados cada 2 minutos hasta que la confirmen.
          </p>
        </div>

        {/* Create form */}
        <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: '#fff', border: '1px solid #E5E5EA' }}>
          <p className="text-[13px] font-700 uppercase tracking-wider" style={{ color: '#E11D2E', fontWeight: 700, letterSpacing: 1 }}>
            🚨 Nueva alarma
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Título de la actividad urgente…"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
              className="flex-1 rounded-xl px-4 py-3 text-[14px] font-medium outline-none"
              style={{ border: '1.5px solid #E5E5EA', color: '#0F0F10', background: '#FAFAFA' }}
            />
            <button
              onClick={handleCreate}
              disabled={creating || !title.trim()}
              className="rounded-xl px-6 py-3 text-[14px] font-bold text-white transition-opacity disabled:opacity-40"
              style={{ background: '#E11D2E' }}
            >
              {creating ? 'Activando…' : 'Activar alarma'}
            </button>
          </div>
        </div>

        {/* Active alerts */}
        {active.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6E6E73' }}>Alarmas activas</p>
            {active.map(a => (
              <AlertCard key={a.id} alert={a} onDeactivate={() => handleDeactivate(a.id)} onDelete={() => handleDelete(a.id)} />
            ))}
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6E6E73' }}>Historial</p>
            {history.map(a => (
              <AlertCard key={a.id} alert={a} onDelete={() => handleDelete(a.id)} />
            ))}
          </div>
        )}

        {!loading && alerts.length === 0 && (
          <p className="text-[13px] text-center mt-12" style={{ color: '#A8A8AD' }}>
            No hay alarmas urgentes registradas.
          </p>
        )}
      </div>
    </AdminShell>
  );
}

function AlertCard({ alert, onDeactivate, onDelete }: { alert: UrgentAlert; onDeactivate?: () => void; onDelete?: () => void }) {
  const time = new Date(alert.created_at).toLocaleString('es-MX', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short',
  });

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{
        background: alert.is_active ? '#FEF2F2' : '#fff',
        border: `1.5px solid ${alert.is_active ? '#FECACA' : '#E5E5EA'}`,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[15px] font-bold" style={{ color: '#0F0F10' }}>{alert.title}</p>
          <p className="text-[12px] mt-0.5" style={{ color: '#6E6E73' }}>{time}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="rounded-full px-3 py-1 text-[11px] font-bold"
            style={{
              background: alert.is_active ? '#E11D2E' : '#E5E5EA',
              color: alert.is_active ? '#fff' : '#6E6E73',
            }}
          >
            {alert.is_active ? 'Activa' : 'Desactivada'}
          </span>
          {alert.is_active && onDeactivate && (
            <button
              onClick={onDeactivate}
              className="rounded-full px-3 py-1 text-[11px] font-bold transition-colors"
              style={{ background: '#fff', border: '1px solid #E5E5EA', color: '#6E6E73' }}
            >
              Desactivar
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => { if (confirm('¿Eliminar esta alarma?')) onDelete(); }}
              className="rounded-full px-3 py-1 text-[11px] font-bold transition-colors"
              style={{ background: '#fff', border: '1px solid #FECACA', color: '#E11D2E' }}
            >
              Eliminar
            </button>
          )}
        </div>
      </div>

      {/* Acks */}
      {alert.acks.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6E6E73' }}>
            Confirmado por ({alert.acks.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {alert.acks.map((ack, i) => (
              <span
                key={i}
                className="rounded-full px-3 py-1 text-[12px] font-semibold"
                style={{ background: '#E5F4EC', color: '#0F9D58' }}
              >
                ✓ {ack.employee_name} · {new Date(ack.seen_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-[12px]" style={{ color: '#A8A8AD' }}>Sin confirmaciones aún</p>
      )}
    </div>
  );
}
