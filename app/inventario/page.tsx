'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { useCompany } from '@/lib/company-context';
import type { InventoryData, InvSection } from '@/lib/inventory-types';
import { roundStatus } from '@/lib/inventory-schedule';
import LetterGrid from '@/components/inventario/LetterGrid';
import SectionDialog from '@/components/inventario/SectionDialog';
import PendingList from '@/components/inventario/PendingList';
import HistoryList from '@/components/inventario/HistoryList';
import SettingsPanel from '@/components/inventario/SettingsPanel';
import { ROUND_LABEL, roundDates, roundName } from '@/components/inventario/labels';
import s from '@/components/panel/panel.module.css';
import c from '@/components/conoce/co.module.css';
import v from '@/components/inventario/inv.module.css';
import { loadInventory, requestSectionRedo, resolveInventoryPending } from './actions';

type Tab = 'ronda' | 'pendientes' | 'historial' | 'config';
const TABS: { key: Tab; label: string }[] = [
  { key: 'ronda', label: 'Ronda actual' },
  { key: 'pendientes', label: 'Pendientes' },
  { key: 'historial', label: 'Historial' },
  { key: 'config', label: 'Configuración' },
];
const TAB_KEY = 'lf_inv_tab';

function readTab(): Tab {
  try {
    const t = localStorage.getItem(TAB_KEY);
    return TABS.some(x => x.key === t) ? (t as Tab) : 'ronda';
  } catch { return 'ronda'; }
}

export default function InventarioPage() {
  const { current: company } = useCompany();
  const [data, setData] = useState<InventoryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('ronda');
  const [picked, setPicked] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => { setTab(readTab()); }, []);

  const load = useCallback(async () => {
    if (!company) return;
    const r = await loadInventory(company.id);
    setNow(new Date());
    if (!r.ok) { setError(r.error); return; }
    setError(null);
    setData(r.data);
  }, [company]);

  useEffect(() => { setData(null); setError(null); load(); }, [load]);

  function choose(t: Tab) {
    setTab(t);
    try { localStorage.setItem(TAB_KEY, t); } catch { /* sin almacenamiento: sólo no se recuerda */ }
  }

  const round = data?.current ?? null;
  const st = round ? roundStatus(round, now) : null;
  const done = data?.sections.filter(x => x.status === 'done').length ?? 0;
  const pickedSection: InvSection | undefined = data?.sections.find(x => x.id === picked);

  return (
    <AdminShell>
      <div className={s.page}>
        <header className={s.top}>
          <div>
            <div className={s.eyebrow}><i />{company?.name ?? 'Actividades'} · Inventario</div>
            <h1 className={s.title}>Inventario</h1>
            <div className={s.sub}>
              {!data ? 'Inventario por letra de estante.'
                : round ? <>{roundName(round)} · {roundDates(round)} · {done} de {data.sections.length} letras{' '}
                    {st && <span className={`${v.status} ${v[`st_${st}`]}`}>{ROUND_LABEL[st]}</span>}</>
                : 'Todavía no hay inventarios. Configúralo en la pestaña Configuración.'}
            </div>
          </div>
        </header>

        <div className={s.content}>
          {error && <div className={s.error} role="alert">{error}</div>}
          {!company ? (
            <p className={s.foot}>Escoge una empresa en el menú.</p>
          ) : !data ? (
            !error && <p className={s.loading}>Cargando…</p>
          ) : (
            <>
              <div className={v.tabs} role="tablist" aria-label="Secciones del inventario">
                {TABS.map(t => (
                  <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={v.tab} onClick={() => choose(t.key)}>
                    {t.label}
                    {t.key === 'pendientes' && data.pendings.length > 0 && <span className={v.badge}>{data.pendings.length}</span>}
                  </button>
                ))}
              </div>

              {tab === 'ronda' && (
                round
                  ? <LetterGrid sections={data.sections} people={data.people} perPerson={data.perPerson}
                      late={st === 'late'} onPick={x => setPicked(x.id)} />
                  : <div className={c.empty}>No hay inventarios todavía. En Configuración pones cada cuándo, el plazo y las letras.</div>
              )}
              {tab === 'pendientes' && (
                <PendingList pendings={data.pendings} people={data.people}
                  onResolve={async (id, note) => { const r = await resolveInventoryPending(id, note); if (r.ok) await load(); return r; }} />
              )}
              {tab === 'historial' && <HistoryList rounds={data.rounds} now={now} />}
              {tab === 'config' && company && (
                <SettingsPanel companyId={company.id} plan={data.plan} letters={data.letters} rounds={data.rounds}
                  hasOpen={!!round && !round.closed_at} onChanged={load} />
              )}
            </>
          )}
        </div>
      </div>

      {pickedSection && data && (
        <SectionDialog
          section={pickedSection}
          previous={pickedSection.letter_id ? data.previous[pickedSection.letter_id] : undefined}
          people={data.people}
          onClose={() => setPicked(null)}
          onRedo={async note => {
            const r = await requestSectionRedo(pickedSection.id, note);
            if (r.ok) { await load(); setPicked(null); }
            return r;
          }}
        />
      )}
    </AdminShell>
  );
}
