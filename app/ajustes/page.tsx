'use client';

import { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/session-context';
import Usuarios, { companyLabel, initials, ROLE, type CompanyOpt } from '@/components/ajustes/Usuarios';
import Telefonos from '@/components/ajustes/Telefonos';
import { IconCheck } from '@/components/panel/icons';
import s from '@/components/panel/panel.module.css';
import a from '@/components/ajustes/aj.module.css';

// Nombre e iniciales con que aparece la contraseña maestra en el menú. Viven en
// este navegador; los lee AdminShell (misma llave).
const SETTINGS_KEY = 'lf_admin_settings';
const DEFAULT_NAME = 'Administrador';
const DEFAULT_INITIALS = 'AD';

function readLocal(): { name: string; initials: string } {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
    return { name: raw.adminName || DEFAULT_NAME, initials: raw.adminInitials || DEFAULT_INITIALS };
  } catch {
    return { name: DEFAULT_NAME, initials: DEFAULT_INITIALS };
  }
}

function writeLocal(name: string, inits: string): boolean {
  try {
    const prev = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...prev, adminName: name, adminInitials: inits }));
    window.dispatchEvent(new Event('storage'));
    return true;
  } catch {
    return false;
  }
}

export default function AjustesPage() {
  const { role, name, company } = useSession();
  const [companies, setCompanies] = useState<CompanyOpt[] | null>(null);

  useEffect(() => {
    supabase.from('companies').select('id, name, slug').order('name')
      .then(({ data }) => setCompanies((data ?? []) as CompanyOpt[]));
  }, []);

  const ownCompany = company && companies ? companies.find(c => c.slug === company) ?? null : null;
  const isMaster = role === 'admin' && !name;

  return (
    <AdminShell>
      <div className={s.page}>
        <header className={s.top}>
          <div>
            <div className={s.eyebrow}><i />Panel de actividades</div>
            <h1 className={s.title}>Ajustes</h1>
            <div className={s.sub}>Quién entra al panel y qué ve cada quien.</div>
          </div>
        </header>

        <div className={s.content}>
          <section className={a.block}>
            <p className={a.secLbl}>Tu sesión</p>
            {isMaster ? (
              <MasterCard />
            ) : (
              <div className={`${s.card} ${a.me}`}>
                <div className={a.meWho}>
                  <span className={`${a.av} ${role === 'admin' ? a.avAdmin : a.avPrac}`}>{initials(name ?? '?')}</span>
                  <div className={a.meText}>
                    <b>{name}</b>
                    <p>
                      {role ? ROLE[role].label : ''} · {company ? (ownCompany ? companyLabel(ownCompany) : company) : 'las dos empresas'}
                    </p>
                  </div>
                </div>
                <p className={a.hint}>Para cambiar tu nombre o tu contraseña, edítate en la lista de abajo.</p>
              </div>
            )}
          </section>

          {role === 'admin' && companies && (
            <Usuarios companies={companies} own={company ? ownCompany?.id ?? null : null} />
          )}

          {role === 'admin' && <Telefonos />}
        </div>
      </div>
    </AdminShell>
  );
}

/** Contraseña maestra: no está en la tabla de usuarios; su nombre es sólo de este navegador. */
function MasterCard() {
  const [shown, setShown] = useState({ name: DEFAULT_NAME, initials: DEFAULT_INITIALS });
  const [form, setForm] = useState({ name: '', initials: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const l = readLocal();
    setShown(l);
    setForm(l);
  }, []);

  const dirty = form.name.trim() !== shown.name || form.initials.trim().toUpperCase() !== shown.initials;

  function save(n: string, i: string) {
    const nm = n.trim() || DEFAULT_NAME;
    const ini = (i.trim() || initials(nm)).toUpperCase().slice(0, 2);
    if (!writeLocal(nm, ini)) return;
    setShown({ name: nm, initials: ini });
    setForm({ name: nm, initials: ini });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className={`${s.card} ${a.me}`}>
      <div className={a.meWho}>
        <span className={`${a.av} ${a.avAdmin}`}>{shown.initials}</span>
        <div className={a.meText}>
          <b>{shown.name}</b>
          <p>Entraste con la contraseña maestra: ves las dos empresas y todo el panel.</p>
        </div>
      </div>
      <div className={a.meForm}>
        <label className={a.label} htmlFor="me-name">Cómo apareces en el menú</label>
        <div className={a.meRow}>
          <input id="me-name" className={a.input} value={form.name} maxLength={40} placeholder={DEFAULT_NAME}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input className={a.input} value={form.initials} maxLength={2} aria-label="Iniciales" placeholder="AD"
            style={{ textAlign: 'center', textTransform: 'uppercase' }}
            onChange={e => setForm(f => ({ ...f, initials: e.target.value }))} />
        </div>
        <div className={a.meBtns}>
          <button type="button" className={`${a.btn} ${a.dark}`} disabled={!dirty} onClick={() => save(form.name, form.initials)}>Guardar</button>
          {shown.name !== DEFAULT_NAME && (
            <button type="button" className={a.btn} onClick={() => save(DEFAULT_NAME, DEFAULT_INITIALS)}>Volver a “{DEFAULT_NAME}”</button>
          )}
          {saved && <span className={a.saved} role="status"><IconCheck size={12} />Guardado</span>}
        </div>
        <p className={a.hint}>Sólo en esta computadora: en otra se verá “{DEFAULT_NAME}”.</p>
      </div>
    </div>
  );
}
