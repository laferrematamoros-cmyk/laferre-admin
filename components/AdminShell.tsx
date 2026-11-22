'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCompany } from '@/lib/company-context';
import { useSession } from '@/lib/session-context';
import { logout } from '@/app/login/actions';
import { inventoryPendingCount } from '@/app/inventario/actions';
import { pendingSignCount } from '@/app/firmas/actions';
import { pendingDoubtCount } from '@/app/capacitaciones/actions';
import { myPendingCount } from '@/app/mis-capacitaciones/actions';

/** Lo dispara la página de Capacitación al cerrar una duda, para que el numerito baje sin cambiar de página. */
export const CAP_BADGE_EVENT = 'lf:cap-badge';

const NAV = [
  { href: '/dashboard',   label: 'Dashboard',   icon: IconHome },
  { href: '/calendario',  label: 'Calendario',  icon: IconCal },
  { href: '/actividades', label: 'Actividades', icon: IconList },
  { href: '/equipo',      label: 'Equipo',      icon: IconUser },
  { href: '/urgente',     label: 'Urgente',     icon: IconAlert },
  { href: '/conoce',      label: 'Conoce',      icon: IconBook },
  { href: '/capacitaciones', label: 'Capacitación', icon: IconCap },
  { href: '/inventario',  label: 'Inventario',  icon: IconBox },
  { href: '/firmas',      label: 'Por firmar',  icon: IconSign },
  { href: '/reportes',    label: 'Reportes y estadísticas',    icon: IconChart },
  { href: '/ajustes',     label: 'Ajustes',     icon: IconCog },
];

// Menú del practicante: Dashboard, Mis actividades, Mis capacitaciones y Reportes.
const INTERN_NAV_ITEMS = [
  { href: '/dashboard',       label: 'Dashboard',               icon: IconHome },
  { href: '/mis-actividades', label: 'Mis actividades',         icon: IconTask },
  { href: '/mis-capacitaciones', label: 'Mis capacitaciones',   icon: IconCap },
  { href: '/reportes',        label: 'Reportes y estadísticas', icon: IconChart },
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
  const { role, name: sessionName } = useSession();
  const isIntern = role === 'practicante';
  const navItems = isIntern ? INTERN_NAV_ITEMS : NAV;
  const roleLabel = isIntern ? 'Practicante' : 'Administrador';
  const [admin, setAdmin]     = useState({ name: 'Administrador', initials: 'AD' });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  // Nombre del usuario logueado; si es el admin maestro (sin nombre) usamos el de Ajustes.
  const displayName = sessionName || admin.name;
  const displayInitials = sessionName ? sessionName.slice(0, 2).toUpperCase() : admin.initials;

  // Cierra el menú lateral al cambiar de página (en móvil)
  useEffect(() => { setNavOpen(false); }, [path]);

  useEffect(() => {
    setAdmin(getAdminInfo());
    const onStorage = () => setAdmin(getAdminInfo());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Numerito de "Inventario": diferencias sin resolver (sólo administradores).
  const [invPending, setInvPending] = useState(0);
  useEffect(() => {
    if (isIntern || !current) { setInvPending(0); return; }
    let alive = true;
    inventoryPendingCount(current.id).then(n => { if (alive) setInvPending(n); }).catch(() => {});
    return () => { alive = false; };
  }, [current, isIntern, path]);

  // Numerito de "Por firmar": listas terminadas que esperan la firma (supabase/010).
  const [toSign, setToSign] = useState(0);
  useEffect(() => {
    if (isIntern || !current) { setToSign(0); return; }
    let alive = true;
    pendingSignCount(current.id).then(n => { if (alive) setToSign(n); }).catch(() => {});
    return () => { alive = false; };
  }, [current, isIntern, path]);

  // Numerito de Capacitación: dudas abiertas (admin) o por ver + atrasadas (practicante).
  const [capBadge, setCapBadge] = useState(0);
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      const p = isIntern ? myPendingCount() : current ? pendingDoubtCount(current.id) : Promise.resolve(0);
      p.then(n => { if (alive) setCapBadge(n); }).catch(() => {});
    };
    refresh();
    window.addEventListener(CAP_BADGE_EVENT, refresh);
    return () => { alive = false; window.removeEventListener(CAP_BADGE_EVENT, refresh); };
  }, [current, isIntern, path]);

  const accent = current?.color_primary ?? '#E11D2E';
  const logoSrc = current ? (LOGOS[current.slug] ?? null) : null;

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent);
  }, [accent]);

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: '#F4F4F6' }}>
      {/* Backdrop (solo móvil, cuando el menú está abierto) */}
      {navOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setNavOpen(false)} />
      )}

      {/* Sidebar — cajón deslizable en móvil, fijo en escritorio */}
      <aside
        className={`lf-side fixed inset-y-0 left-0 z-50 flex flex-col gap-1 shrink-0 overflow-y-auto p-[14px] transition-transform duration-300 md:static md:z-auto md:translate-x-0 ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: 220 }}
      >

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
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setNavOpen(false)}
              aria-current={active ? 'page' : undefined}
              className="lf-nav flex items-center gap-[10px] rounded-xl px-3 py-[10px] text-[13px]"
              style={{ fontWeight: active ? 600 : 500, textDecoration: 'none' }}
            >
              <Icon size={16} />
              <span>{label}</span>
              {href === '/firmas' && toSign > 0 && (
                <span
                  aria-label={`${toSign} por firmar`}
                  style={{ marginLeft: 'auto', minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: accent, color: '#fff', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {toSign}
                </span>
              )}
              {(href === '/capacitaciones' || href === '/mis-capacitaciones') && capBadge > 0 && (
                <span
                  aria-label={`${capBadge} pendientes`}
                  style={{ marginLeft: 'auto', minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: accent, color: '#fff', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {capBadge}
                </span>
              )}
              {href === '/inventario' && invPending > 0 && (
                <span
                  aria-label={`${invPending} pendientes`}
                  style={{ marginLeft: 'auto', minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: accent, color: '#fff', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {invPending}
                </span>
              )}
            </Link>
          );
        })}

        {/* Bottom user */}
        <div className="mt-auto border-t pt-3" style={{ borderColor: 'rgba(255,255,255,.1)' }}>
          <div className="flex items-center gap-[10px]">
            <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: accent }}>
              {displayInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{displayName}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)' }}>{roleLabel}</div>
            </div>
          </div>
          <form action={logout} className="mt-2">
            <button
              type="submit"
              className="w-full rounded-lg px-[10px] py-[8px] text-[12px] font-semibold text-left transition-colors"
              style={{ color: 'rgba(255,255,255,.55)' }}
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Barra superior móvil con botón de menú */}
        <div className="flex items-center gap-3 border-b px-4 py-2.5 md:hidden" style={{ borderColor: '#E4E4E7', background: '#fff' }}>
          <button
            onClick={() => setNavOpen(true)}
            aria-label="Abrir menú"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ background: '#F2F2F4' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F0F10" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="text-[14px] font-extrabold tracking-tight" style={{ color: '#0F0F10' }}>{current?.name ?? 'Actividades'}</span>
        </div>
        {children}
      </main>
    </div>
  );
}

/* ── Icons ── */
function IconCap({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></svg>;
}
function IconTask({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
}
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
function IconBox({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
}
function IconSign({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
}
function IconCog({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
}
