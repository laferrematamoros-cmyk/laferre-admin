'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  color_primary: string;
}

interface CompanyCtx {
  companies: Company[];
  current: Company | null;
  setCurrent: (c: Company) => void;
  loading: boolean;
}

const Ctx = createContext<CompanyCtx>({ companies: [], current: null, setCurrent: () => {}, loading: true });

const STORAGE_KEY = 'lf_company_id';

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [current, setCurrentState] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from('companies').select('*').order('name');
    const list = (data ?? []) as Company[];
    setCompanies(list);

    const savedId = localStorage.getItem(STORAGE_KEY);
    const saved = list.find(c => c.id === savedId);
    setCurrentState(saved ?? list[0] ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function setCurrent(c: Company) {
    setCurrentState(c);
    localStorage.setItem(STORAGE_KEY, c.id);
  }

  return (
    <Ctx.Provider value={{ companies, current, setCurrent, loading }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCompany() { return useContext(Ctx); }
