'use client';

import { useState, useEffect } from 'react';
import AdminShell from '@/components/AdminShell';
import UsersSection from '@/components/UsersSection';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Settings {
  storeName: string;
  adminName: string;
  adminInitials: string;
  workStart: string;
  workEnd: string;
  lateThreshold: number;
  timezone: string;
}

const DEFAULT: Settings = {
  storeName: 'La Ferre',
  adminName: 'Don Beto',
  adminInitials: 'RB',
  workStart: '08:00',
  workEnd: '20:00',
  lateThreshold: 15,
  timezone: 'America/Matamoros',
};

const STORAGE_KEY = 'lf_admin_settings';

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch { return DEFAULT; }
}

function save(s: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  window.dispatchEvent(new Event('storage'));
}

// ── Components ────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-4 md:p-[22px]" style={{ background: '#fff', borderColor: '#E4E4E7' }}>
      <h2 className="mb-4 text-[13px] font-bold">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid items-start gap-1.5 sm:grid-cols-[200px_1fr] sm:gap-2">
      <div>
        <p className="text-[13px] font-semibold">{label}</p>
        {hint && <p className="mt-0.5 text-[11px]" style={{ color: '#6E6E73' }}>{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      className="w-full rounded-[9px] border px-3 py-2 text-[13px] outline-none focus:border-gray-400"
      style={{ borderColor: '#E4E4E7' }}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      className="rounded-[9px] border px-3 py-2 text-[13px] outline-none"
      style={{ borderColor: '#E4E4E7' }}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AjustesPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [saved, setSaved]       = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(load());
    setHydrated(true);
  }, []);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    save(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleReset() {
    setSettings(DEFAULT);
    save(DEFAULT);
    setSaved(false);
  }

  // Secciones que se guardan pero todavía NO afectan nada (negocio, horario,
  // minutos de gracia, zona horaria). Ocultas hasta conectarlas de verdad.
  // Cambiar a true para volver a mostrarlas.
  const SHOW_WIP_SETTINGS = false;

  if (!hydrated) return <AdminShell><div /></AdminShell>;

  return (
    <AdminShell>
      {/* Topbar */}
      <div className="flex items-center justify-between gap-3 border-b px-4 py-4 md:px-7 md:py-5" style={{ borderColor: '#E4E4E7', background: '#fff' }}>
        <div className="min-w-0">
          <h1 className="text-[18px] md:text-[22px] font-extrabold tracking-tight">Ajustes</h1>
          <p className="mt-0.5 text-[11px] md:text-[12px]" style={{ color: '#6E6E73' }}>Configuración general del panel</p>
        </div>
        <div className="flex shrink-0 items-center gap-[10px]">
          {saved && (
            <span className="rounded-full px-2.5 py-1 text-[11px] md:text-[12px] font-semibold" style={{ background: '#E5F4EC', color: '#0F9D58' }}>
              ✓ Guardado
            </span>
          )}
          <button
            onClick={handleSave}
            className="shrink-0 whitespace-nowrap rounded-[9px] px-3 py-2 md:px-[14px] md:py-[9px] text-[12px] md:text-[13px] font-semibold text-white"
            style={{ background: 'var(--accent)' }}
          >
            Guardar cambios
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-7">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">

          {/* Negocio — oculto: aún no afecta el PDF (usa "LA FERRE" fijo) */}
          {SHOW_WIP_SETTINGS && (
          <Section title="Negocio">
            <Field label="Nombre del negocio" hint="Se muestra en reportes PDF">
              <TextInput value={settings.storeName} onChange={v => set('storeName', v)} placeholder="La Ferre" />
            </Field>
          </Section>
          )}

          {/* Administrador */}
          <Section title="Administrador">
            <Field label="Nombre" hint="Visible en la barra lateral">
              <TextInput value={settings.adminName} onChange={v => set('adminName', v)} placeholder="Don Beto" />
            </Field>
            <Field label="Iniciales" hint="Máximo 2 caracteres">
              <input
                className="w-16 rounded-[9px] border px-3 py-2 text-[13px] text-center uppercase outline-none"
                style={{ borderColor: '#E4E4E7' }}
                value={settings.adminInitials}
                maxLength={2}
                onChange={e => set('adminInitials', e.target.value.toUpperCase())}
              />
            </Field>
          </Section>

          {/* Horario — oculto: no se usa en ningún cálculo todavía */}
          {SHOW_WIP_SETTINGS && (
          <Section title="Horario de operación">
            <Field label="Inicio de jornada">
              <TimeInput value={settings.workStart} onChange={v => set('workStart', v)} />
            </Field>
            <Field label="Fin de jornada">
              <TimeInput value={settings.workEnd} onChange={v => set('workEnd', v)} />
            </Field>
            <Field label="Minutos de gracia" hint="Margen antes de marcar como atrasado">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={5}
                  value={settings.lateThreshold}
                  onChange={e => set('lateThreshold', Number(e.target.value))}
                  className="w-40"
                />
                <span className="text-[13px] font-semibold w-16">{settings.lateThreshold} min</span>
              </div>
            </Field>
          </Section>
          )}

          {/* Zona horaria — oculto: no se aplica (recordatorios usan zona fija) */}
          {SHOW_WIP_SETTINGS && (
          <Section title="Región">
            <Field label="Zona horaria">
              <select
                className="w-full max-w-full rounded-[9px] border px-3 py-2 text-[13px] outline-none"
                style={{ borderColor: '#E4E4E7' }}
                value={settings.timezone}
                onChange={e => set('timezone', e.target.value)}
              >
                <option value="America/Matamoros">America/Matamoros (CST)</option>
                <option value="America/Mexico_City">America/Mexico_City (CST)</option>
                <option value="America/Monterrey">America/Monterrey (CST)</option>
                <option value="America/Tijuana">America/Tijuana (PST)</option>
                <option value="America/Hermosillo">America/Hermosillo (MST)</option>
                <option value="America/Cancun">America/Cancun (EST)</option>
              </select>
            </Field>
          </Section>
          )}

          {/* Usuarios del panel (solo visible para administradores) */}
          <UsersSection />

          {/* Danger zone */}
          <div className="rounded-xl border p-4 md:p-[22px]" style={{ borderColor: '#FCE7E9', background: '#FFFAFA' }}>
            <h2 className="mb-1 text-[13px] font-bold" style={{ color: 'var(--accent)' }}>Restablecer ajustes</h2>
            <p className="mb-4 text-[12px]" style={{ color: '#6E6E73' }}>Regresa todos los ajustes a sus valores predeterminados. No afecta datos de empleados ni actividades.</p>
            <button
              onClick={handleReset}
              className="rounded-[9px] border px-[14px] py-[9px] text-[13px] font-semibold"
              style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
            >
              Restablecer
            </button>
          </div>

        </div>
      </div>
    </AdminShell>
  );
}
