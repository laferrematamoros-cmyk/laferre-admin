'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import AdminShell from '@/components/AdminShell';
import { supabase, Activity, Completion, Employee } from '@/lib/supabase';
import { useCompany } from '@/lib/company-context';
import { useSession } from '@/lib/session-context';

const GREEN = '#0F9D58', AMBER = '#F2A20C', RED = '#E11D2E', INK = '#0F0F10';

type Status = 'done' | 'active' | 'late' | 'pending';
interface ActRow extends Activity {
  status: Status;
  completion?: Completion;
  assigneeNames: string;
  remaining?: string;
  lateBy?: string;
}

const STATUS_META: Record<Status, { label: string; color: string; bg: string }> = {
  done:    { label: 'Realizada',  color: GREEN, bg: '#E5F4EC' },
  active:  { label: 'En curso',   color: AMBER, bg: '#FEF6E7' },
  late:    { label: 'Atrasada',   color: RED,   bg: '#FCE7E9' },
  pending: { label: 'Pendiente',  color: '#6E6E73', bg: '#F2F2F4' },
};

function toMin(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function diffLabel(min: number) {
  const h = Math.floor(Math.abs(min) / 60), m = Math.abs(min) % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m} min`;
}
function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function resolveStatus(a: Activity, comps: Completion[], nameMap: Map<string, string>): ActRow {
  const assigneeNames = (a.assigned_employee_ids as string[]).map(id => nameMap.get(id) ?? '').filter(Boolean).join(', ') || 'General';
  const completion = comps.find(c => c.activity_id === a.id);
  if (completion) return { ...a, status: 'done', completion, assigneeNames };
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const limitMin = toMin(a.limit_time.slice(0, 5));
  const startMin = toMin(a.start_time.slice(0, 5));
  if (nowMin > limitMin) return { ...a, status: 'late', lateBy: diffLabel(nowMin - limitMin), assigneeNames };
  if (nowMin >= startMin) return { ...a, status: 'active', remaining: diffLabel(limitMin - nowMin), assigneeNames };
  return { ...a, status: 'pending', assigneeNames };
}

function playBeep(urgent: boolean) {
  if (typeof window === 'undefined') return;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const beep = (freq: number, start: number, dur: number, type: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = type; osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.3, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.start(start); osc.stop(start + dur);
    };
    if (urgent) { beep(440, ctx.currentTime, 0.15, 'square'); beep(440, ctx.currentTime + 0.2, 0.15, 'square'); beep(440, ctx.currentTime + 0.4, 0.25, 'square'); }
    else { [440, 554, 659, 554, 659, 880].forEach((f, i) => beep(f, ctx.currentTime + i * 0.09, 0.09)); }
  } catch { /* audio bloqueado */ }
}

export default function MisActividadesPage() {
  const { current: company } = useCompany();
  const { employeeId, name: sessionName, loading: sessionLoading } = useSession();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ActRow[]>([]);
  const [modal, setModal] = useState<ActRow | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ title: string; body: string; urgent: boolean } | null>(null);
  const rowsRef = useRef<ActRow[]>([]);
  const shown = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!company || !employeeId) { setLoading(false); return; }
    const dow = new Date().getDay();
    const today = todayStr();
    const [{ data: acts }, { data: comps }, { data: emps }] = await Promise.all([
      supabase.from('activities').select('*').eq('is_active', true).eq('company_id', company.id),
      supabase.from('completions').select('*').eq('scheduled_date', today),
      supabase.from('employees').select('id, name').eq('is_active', true).eq('company_id', company.id),
    ]);
    const nameMap = new Map((emps ?? []).map((e: { id: string; name: string }) => [e.id, e.name]));
    const mine = ((acts ?? []) as Activity[]).filter(a => {
      const ids = a.assigned_employee_ids as string[];
      return (a.days_of_week as number[]).includes(dow) && (ids.length === 0 || ids.includes(employeeId));
    });
    const withStatus = mine
      .map(a => resolveStatus(a, (comps ?? []) as Completion[], nameMap))
      .sort((a, b) => toMin(a.start_time.slice(0, 5)) - toMin(b.start_time.slice(0, 5)));
    setRows(withStatus);
    rowsRef.current = withStatus;
    setLoading(false);
  }, [company, employeeId]);

  useEffect(() => { if (!sessionLoading) load(); }, [sessionLoading, load]);

  // Recarga periódica (por si otro dispositivo completa algo).
  useEffect(() => {
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [load]);

  // Avisos in-app: revisa cada minuto los eventos de inicio / límite / retraso.
  useEffect(() => {
    function check() {
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      for (const a of rowsRef.current) {
        if (a.status === 'done') continue;
        const startMin = toMin(a.start_time.slice(0, 5));
        const limitMin = toMin(a.limit_time.slice(0, 5));
        const lbl = a.limit_time.slice(0, 5);
        const show = (key: string, body: string, urgent: boolean) => {
          if (shown.current.has(key)) return false;
          shown.current.add(key);
          setBanner({ title: a.title, body, urgent });
          playBeep(urgent);
          return true;
        };
        if (nowMin >= startMin && nowMin < startMin + 2) { if (show(`${a.id}-s`, `▶ Empieza ahora · límite ${lbl}`, false)) break; }
        else if (nowMin >= limitMin && nowMin < limitMin + 2) { if (show(`${a.id}-lim`, `⚠ Hora límite (${lbl}) — sin completar`, true)) break; }
        else if (nowMin > limitMin) {
          const e = nowMin - limitMin;
          if (e >= 15 && e % 15 < 2) { if (show(`${a.id}-late-${Math.floor(e / 15)}`, `🔴 ${e} min de retraso`, true)) break; }
        }
      }
    }
    check();
    const t = setInterval(check, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(t);
  }, [banner]);

  function openRealizar(a: ActRow) { setModal(a); setFile(null); setSaveErr(null); }

  async function confirmRealizar() {
    if (!modal || !employeeId) return;
    if (modal.evidence_photo && !file) { setSaveErr('Esta actividad requiere una foto de evidencia.'); return; }
    setSaving(true); setSaveErr(null);
    try {
      let photo_url: string | null = null;
      if (file) {
        const filename = `${modal.id}/${Date.now()}.jpg`;
        const { data, error } = await supabase.storage.from('evidence').upload(filename, file, { contentType: file.type || 'image/jpeg', upsert: true });
        if (error) throw error;
        if (data) photo_url = supabase.storage.from('evidence').getPublicUrl(data.path).data.publicUrl;
      }
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      const was_late = nowMin > toMin(modal.limit_time.slice(0, 5));
      const { error } = await supabase.from('completions').insert({
        activity_id: modal.id, employee_id: employeeId, scheduled_date: todayStr(), photo_url, was_late,
      });
      if (error) throw error;
      setModal(null); setFile(null);
      await load();
    } catch {
      setSaveErr('No se pudo guardar. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  const done = rows.filter(r => r.status === 'done').length;
  const total = rows.length;
  const late = rows.filter(r => r.status === 'late').length;
  const active = rows.filter(r => r.status === 'active').length;

  return (
    <AdminShell>
      {/* Banner de aviso */}
      {banner && (
        <div className="fixed left-1/2 top-3 z-[100] w-[min(92%,420px)] -translate-x-1/2 rounded-2xl px-4 py-3 shadow-xl"
          style={{ background: banner.urgent ? RED : '#1A1A1E' }}>
          <p className="text-[14px] font-bold text-white">{banner.title}</p>
          <p className="mt-0.5 text-[12px]" style={{ color: 'rgba(255,255,255,.8)' }}>{banner.body}</p>
        </div>
      )}

      {/* Topbar */}
      <div className="flex items-center justify-between gap-3 border-b px-4 py-4 md:px-7 md:py-5" style={{ borderColor: '#E4E4E7', background: '#fff' }}>
        <div className="min-w-0">
          <h1 className="text-[18px] md:text-[22px] font-extrabold tracking-tight">Mis actividades</h1>
          <p className="mt-0.5 text-[11px] md:text-[12px]" style={{ color: '#6E6E73' }}>
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {employeeId && total > 0 && (
          <div className="shrink-0 rounded-[10px] px-3 py-2 text-center" style={{ background: INK }}>
            <p className="text-[16px] font-extrabold leading-none text-white">{done}/{total}</p>
            <p className="mt-0.5 text-[9px] uppercase tracking-wide" style={{ color: 'rgba(255,255,255,.55)' }}>completadas</p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-7">
        {sessionLoading || loading ? (
          <p className="py-10 text-center text-[13px]" style={{ color: '#A8A8AD' }}>Cargando…</p>
        ) : !employeeId ? (
          <div className="mx-auto max-w-md rounded-xl border p-6 text-center" style={{ background: '#fff', borderColor: '#E4E4E7' }}>
            <p className="text-[14px] font-bold">Todavía no estás vinculado a un empleado</p>
            <p className="mt-2 text-[12px]" style={{ color: '#6E6E73' }}>
              Pedile a un administrador que te vincule a un empleado en <b>Ajustes → Usuarios</b> para poder realizar actividades desde aquí.
            </p>
          </div>
        ) : total === 0 ? (
          <div className="mx-auto max-w-md rounded-xl border p-6 text-center" style={{ background: '#fff', borderColor: '#E4E4E7' }}>
            <p className="text-[14px] font-bold">Sin actividades para hoy 🎉</p>
            <p className="mt-2 text-[12px]" style={{ color: '#6E6E73' }}>No tienes actividades asignadas ni generales para el día de hoy.</p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {(late > 0 || active > 0) && (
              <p className="text-[12px]" style={{ color: '#6E6E73' }}>
                {late > 0 && <span style={{ color: RED, fontWeight: 700 }}>{late} atrasada{late > 1 ? 's' : ''}</span>}
                {late > 0 && active > 0 && ' · '}
                {active > 0 && <span style={{ color: AMBER, fontWeight: 700 }}>{active} en curso</span>}
              </p>
            )}
            {rows.map(a => {
              const meta = STATUS_META[a.status];
              return (
                <div key={a.id} className="flex items-center gap-3 rounded-xl border p-4" style={{ background: '#fff', borderColor: '#E4E4E7', borderLeft: `3px solid ${meta.color}`, opacity: a.status === 'done' ? 0.72 : 1 }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold" style={{ color: '#6E6E73' }}>{a.start_time.slice(0, 5)}–{a.limit_time.slice(0, 5)}</p>
                    <p className="mt-0.5 text-[15px] font-semibold" style={{ textDecoration: a.status === 'done' ? 'line-through' : 'none' }}>{a.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: meta.bg, color: meta.color }}>
                        {meta.label}{a.remaining ? ` · ${a.remaining}` : ''}{a.lateBy ? ` · ${a.lateBy}` : ''}
                      </span>
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: a.assigneeNames === 'General' ? '#EEF2FF' : '#F0FDF4', color: a.assigneeNames === 'General' ? '#4F46E5' : GREEN }}>
                        {a.assigneeNames === 'General' ? 'GENERAL' : a.assigneeNames}
                      </span>
                      {a.evidence_photo && <span className="text-[10px]" style={{ color: '#A8A8AD' }}>📷 evidencia</span>}
                    </div>
                  </div>
                  {a.status === 'done' ? (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[16px] font-bold" style={{ background: '#E5F4EC', color: GREEN }}>✓</div>
                  ) : (
                    <button onClick={() => openRealizar(a)}
                      className="shrink-0 rounded-[10px] px-4 py-2.5 text-[13px] font-bold text-white"
                      style={{ background: a.status === 'late' ? RED : INK }}>
                      Realizar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Realizar */}
      {modal && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => !saving && setModal(null)}>
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl" onClick={e => e.stopPropagation()}>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#6E6E73' }}>Realizar actividad</p>
            <p className="mt-1 text-[18px] font-extrabold leading-tight">{modal.title}</p>
            <p className="mt-1 text-[12px]" style={{ color: '#6E6E73' }}>Límite {modal.limit_time.slice(0, 5)} · {modal.assigneeNames}</p>

            <label className="mt-4 block text-[12px] font-semibold">
              {modal.evidence_photo ? 'Foto de evidencia (obligatoria)' : 'Foto de evidencia (opcional)'}
            </label>
            <input type="file" accept="image/*" capture="environment"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="mt-1.5 w-full text-[12px]" />
            {file && <p className="mt-1 text-[11px]" style={{ color: GREEN }}>✓ {file.name}</p>}

            {saveErr && <p className="mt-3 rounded-[9px] px-3 py-2 text-[12px] font-semibold" style={{ background: '#FCE7E9', color: RED }}>{saveErr}</p>}

            <div className="mt-5 flex gap-2">
              <button disabled={saving} onClick={confirmRealizar}
                className="flex-1 rounded-[10px] py-3 text-[13px] font-bold text-white" style={{ background: GREEN, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Guardando…' : '✓ Marcar realizada'}
              </button>
              <button disabled={saving} onClick={() => setModal(null)}
                className="rounded-[10px] border px-4 py-3 text-[13px] font-semibold" style={{ borderColor: '#E4E4E7', color: '#6E6E73' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}