'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCompany } from '@/lib/company-context';

const NAV = [
  { href: '/dashboard',   label: 'Dashboard',   icon: IconHome },
  { href: '/calendario',  label: 'Calendario',  icon: IconCal },
  { href: '/actividades', label: 'Actividades', icon: IconList },
  { href: '/equipo',      label: 'Equipo',      icon: IconUser },
  { href: '/urgente',     label: 'Urgente',     icon: IconAlert },
  { href: '/conoce',      label: 'Conoce',      icon: IconBook },
  { href: '/reportes',    label: 'Reportes',    icon: IconChart },
  { href: '/ajustes',     label: 'Ajustes',     icon: IconCog },
];

const SETTINGS_KEY = 'lf_admin_settings';

function getAdminInfo() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { name: 'Administrador', initials: 'AD' };
    const s = JSON.parse(raw);
    return { name: s.adminName || 'Administrador', initials: s.adminInitials || 'AD' };
  } catch { return { name: 'Administrador', initials: 'AD' }; }
}

const LOGOS: Record<string, string> = {
  laferre: '/logo-laferre.png',
  bfm:     '/logo-bfm.png',
};

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { companies, current, setCurrent } = useCompany();
  const [admin, setAdmin]     = useState({ name: 'Administrador', initials: 'AD' });
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setAdmin(getAdminInfo());
    const onStorage = () => setAdmin(getAdminInfo());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const accent = current?.color_primary ?? '#E11D2E';
  const logoSrc = current ? (LOGOS[current.slug] ?? null) : null;

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent);
  }, [accent]);

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: '#FAFAFA' }}>
      {/* Sidebar */}
      <aside className="flex flex-col gap-1 shrink-0 p-[14px]" style={{ width: 224, background: '#0F0F10' }}>

        {/* Company selector */}
        <div className="relative mb-2">
          <button
            onClick={() => setPickerOpen(o => !o)}
            className="w-full flex flex-col items-center gap-1 rounded-xl px-2 py-3 transition-colors"
            style={{ background: pickerOpen ? 'rgba(255,255,255,.07)' : 'transparent' }}
          >
            {logoSrc ? (
              <div className="rounded-lg px-2 py-1" style={{ background: '#fff' }}>
                <Image src={logoSrc} alt={current?.name ?? ''} width={100} height={40} style={{ objectFit: 'contain', display: 'block', height: 36, width: 'auto' }} priority />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full text-[14px] font-bold text-white" style={{ background: accent }}>
                {current?.name?.[0] ?? '?'}
              </div>
            )}
            <div className="flex items-center gap-1">
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,.45)', letterSpacing: 2, fontWeight: 600 }}>ACTIVIDADES</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,.35)' }}>▾</span>
            </div>
          </button>

          {/* Dropdown */}
          {pickerOpen && companies.length > 1 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl overflow-hidden shadow-xl" style={{ background: '#1A1A1C', border: '1px solid rgba(255,255,255,.1)' }}>
              {companies.map(c => {
                const logo = LOGOS[c.slug];
                const isActive = c.id === current?.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => { setCurrent(c); setPickerOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                    style={{ background: isActive ? 'rgba(255,255,255,.08)' : 'transparent' }}
                  >
                    {logo ? (
                      <div className="rounded px-1.5 py-0.5 shrink-0" style={{ background: '#fff' }}>
                        <Image src={logo} alt={c.name} width={48} height={20} style={{ objectFit: 'contain', height: 18, width: 'auto', display: 'block' }} />
                      </div>
                    ) : (
                      <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: c.color_primary }}>{c.name[0]}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold truncate" style={{ color: '#fff' }}>{c.name}</p>
                    </div>
                    {isActive && <span style={{ color: accent, fontSize: 12 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Nav items */}
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-[10px] rounded-lg px-[10px] py-[9px] text-[13px] font-medium transition-colors"
              style={{
                background: active ? accent : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,.7)',
                fontWeight: active ? 600 : 500,
                textDecoration: 'none',
              }}
            >
              <Icon size={16} />
              <span>{label}</span>
            </Link>
          );
        })}

        {/* Bottom user */}
        <div className="mt-auto flex items-center gap-[10px] border-t pt-3" style={{ borderColor: 'rgba(255,255,255,.1)' }}>
          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: accent }}>
            {admin.initials}
          </div>
          <div className="min-w-0 flex-1">
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{admin.name}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)' }}>Administrador</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}

/* ── Icons ── */
function IconHome({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function IconCal({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}
function IconList({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
}
function IconUser({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function IconChart({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
}
function IconBook({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
}
function IconAlert({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
}
function IconCog({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
}
