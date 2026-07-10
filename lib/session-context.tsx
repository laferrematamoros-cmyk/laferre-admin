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
      .then(d => { if (alive) setState({ role: d.role ?? null, name: d.name ?? null, company: d.company ?? null, employeeId: d.employeeId ?? null }); })
      .catch(() => { /* mantiene estado previo */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [pathname]);

  return <Ctx.Provider value={{ ...state, loading }}>{children}</Ctx.Provider>;
}

export function useSession() { return useContext(Ctx); }