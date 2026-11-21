'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export type Role = 'admin' | 'practicante';

export interface SessionData {
  role: Role | null;
  name: string | null;
  /** slug de la empresa fijada; null = ve todas. */
  company: string | null;
  /** empleado vinculado (para "Mis actividades"); null = ninguno. */
  employeeId: string | null;
}

interface SessionCtx extends SessionData { loading: boolean; }

const EMPTY: SessionData = { role: null, name: null, company: null, employeeId: null };

const Ctx = createContext<SessionCtx>({ ...EMPTY, loading: true });

// Páginas sin sesión del panel: la entrada y la capacitación que abre el teléfono.
const PUBLIC_PATHS = ['/login', '/ver-capacitacion'];
const isPublic = (p: string | null) => !!p && PUBLIC_PATHS.some(x => p === x || p.startsWith(x + '/'));

export function SessionProvider({ children, initial }: { children: React.ReactNode; initial?: SessionData }) {
  const [state, setState] = useState<SessionData>(initial ?? EMPTY);
  const [loading, setLoading] = useState(!initial);
  const pathname = usePathname();

  // Reconsulta al cambiar de ruta (cubre el redirect del login, que es una
  // navegación suave y no remonta el provider). Conserva el estado previo
  // mientras reconsulta, así no hay parpadeo del menú.
  useEffect(() => {
    let alive = true;
    fetch('/api/me')
      .then(r => r.json())
      .then(d => {
        if (!alive) return;
        // Usuario eliminado desde Ajustes: el servidor ya borró su cookie → a la entrada.
        if (!d.role && !isPublic(pathname)) { window.location.replace('/login'); return; }
        setState({ role: d.role ?? null, name: d.name ?? null, company: d.company ?? null, employeeId: d.employeeId ?? null });
      })
      .catch(() => { /* mantiene estado previo */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [pathname]);

  return <Ctx.Provider value={{ ...state, loading }}>{children}</Ctx.Provider>;
}

export function useSession() { return useContext(Ctx); }