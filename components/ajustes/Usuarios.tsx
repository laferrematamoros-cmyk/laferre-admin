'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { IconList, IconPlus } from '@/components/panel/icons';
import s from '@/components/panel/panel.module.css';
import a from './aj.module.css';
import {
  listUsers, listEmployees, createEmployee, createUser, updateUser, deleteUser,
  type AdminUser, type EmployeeOpt, type Role,
} from '@/app/ajustes/users-actions';

export interface CompanyOpt { id: string; name: string; slug: string }

/** La empresa "bfm" se muestra como "Bodega Ferretera" en este panel. */
export const companyLabel = (c: CompanyOpt) => (c.slug === 'bfm' ? 'Bodega Ferretera' : c.name);

export const ROLE: Record<Role, { label: string; sees: string }> = {
  practicante: { label: 'Practicante', sees: 'Dashboard, Reportes y Mis actividades. No crea ni cambia actividades.' },
  admin: { label: 'Administrador', sees: 'Todo el panel: actividades, equipo, alarmas y estos ajustes.' },
};

export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

/** own = empresa a la que está fijo quien ve la pantalla (null = las dos). */
export default function Usuarios({ companies, own }: { companies: CompanyOpt[]; own: string | null }) {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [employees, setEmployees] = useState<EmployeeOpt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ user: AdminUser | null } | null>(null);

  const load = useCallback(async () => {
    try {
      const [u, e] = await Promise.all([listUsers(), listEmployees()]);
      setUsers(u);
      setEmployees(e);
    } catch {
      setError('No se pudieron cargar los usuarios.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const companyText = (id: string | null) => {
    if (!id) return 'Las dos empresas';
    const c = companies.find(x => x.id === id);
    return c ? companyLabel(c) : 'Otra empresa';
  };

  async function remove(u: AdminUser) {
    setBusy(u.id);
    setError(null);
    const r = await deleteUser(u.id);
    if (!r.ok) setError(r.error);
    await load();
    setBusy(null);
    setConfirmId(null);
  }

  return (
    <section className={a.block}>
      <div className={a.secHead}>
        <div>
          <p className={a.secLbl}>Usuarios del panel{users ? ` (${users.length})` : ''}</p>
          <p className={a.secHint}>Cada quien entra sólo con su contraseña. Si eliminas a alguien o le cambias lo que ve, se aplica en ese momento.</p>
        </div>
        <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => setDialog({ user: null })}><IconPlus />Nuevo usuario</button>
      </div>

      {error && <div className={s.error}>{error}</div>}

      {!users ? (
        !error && <p className={s.loading}>Cargando usuarios…</p>
      ) : users.length === 0 ? (
        <div className={`${s.card} ${a.empty}`}>
          <p>Todavía no hay usuarios. Por ahora sólo se entra con la contraseña maestra.</p>
        </div>
      ) : (
        <div className={a.grid}>
          {users.map(u => (
            <article key={u.id} className={`${s.card} ${a.card}`}>
              <div className={a.who}>
                <span className={`${a.av} ${u.role === 'admin' ? a.avAdmin : a.avPrac}`}>{initials(u.name)}</span>
                <div className={a.name}><b>{u.name}</b><span>{companyText(u.company_id)}</span></div>
              </div>
              <div className={a.facts}>
                <span className={`${a.chip} ${u.role === 'admin' ? a.chipAdmin : a.chipPrac}`}>{ROLE[u.role].label}</span>
                {u.employeeName && <span className={`${a.chip} ${a.chipOk}`}><IconList size={13} />Hace actividades como {u.employeeName}</span>}
              </div>
              <p className={a.hint}>Ve: {ROLE[u.role].sees}</p>
              {confirmId === u.id ? (
                <div className={a.confirm} role="alert">
                  <span><b>¿Eliminar a {u.name}?</b> Ya no podrá entrar al panel; si está dentro, sale al cambiar de pantalla. Su historial de actividades se conserva.</span>
                  <div className={a.confirmBtns}>
                    <button type="button" className={`${a.btn} ${a.danger}`} disabled={busy === u.id} onClick={() => remove(u)}>
                      {busy === u.id ? 'Eliminando…' : 'Sí, eliminar'}
                    </button>
                    <button type="button" className={a.btn} onClick={() => setConfirmId(null)}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className={a.actions}>
                  <button type="button" className={`${a.btn} ${a.dark}`} onClick={() => setDialog({ user: u })}>Editar</button>
                  <button type="button" className={`${a.btn} ${a.danger}`} onClick={() => setConfirmId(u.id)}>Eliminar</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {dialog && (
        <UserDialog
          user={dialog.user}
          companies={companies}
          own={own}
          employees={employees}
          onEmployee={e => setEmployees(prev => [...prev, e].sort((x, y) => x.name.localeCompare(y.name)))}
          onClose={() => setDialog(null)}
          onSaved={async () => { setDialog(null); await load(); }}
        />
      )}
    </section>
  );
}

function UserDialog({ user, companies, own, employees, onEmployee, onClose, onSaved }: {
  user: AdminUser | null;
  companies: CompanyOpt[];
  own: string | null;
  employees: EmployeeOpt[];
  onEmployee: (e: EmployeeOpt) => void;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(user?.name ?? '');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [role, setRole] = useState<Role>(user?.role ?? 'practicante');
  const [companyId, setCompanyId] = useState<string>(user ? (user.company_id ?? '') : (own ?? ''));
  const [employeeId, setEmployeeId] = useState(user?.employee_id ?? '');
  const [newEmp, setNewEmp] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const p = pw.trim();
  const missing = { name: !name.trim(), pw: user ? p.length > 0 && p.length < 4 : p.length < 4 };
  const choices = [
    ...(own ? [] : [{ id: '', label: 'Las dos' }]),
    ...companies.filter(c => !own || c.id === own).map(c => ({ id: c.id, label: companyLabel(c) })),
  ];
  const nameOf = (id: string | null) => companies.find(c => c.id === id);
  const opts = companyId ? employees.filter(e => e.company_id === companyId) : employees;

  function pickCompany(id: string) {
    setCompanyId(id);
    if (id && employeeId && !employees.some(e => e.id === employeeId && e.company_id === id)) setEmployeeId('');
    setNewEmp(null);
  }

  async function addEmployee() {
    const n = (newEmp ?? '').trim();
    if (!n) return;
    setSaving(true);
    setErr(null);
    const r = await createEmployee(n, companyId || null);
    setSaving(false);
    if (!r.ok) { setErr(r.error); return; }
    onEmployee(r.employee);
    setEmployeeId(r.employee.id);
    setNewEmp(null);
  }

  async function save() {
    setTried(true);
    if (missing.name || missing.pw) return;
    setSaving(true);
    setErr(null);
    const input = { name: name.trim(), password: p, role, companyId: companyId || null, employeeId: employeeId || null };
    const r = user ? await updateUser(user.id, input) : await createUser(input);
    if (!r.ok) { setErr(r.error); setSaving(false); return; }
    await onSaved();
  }

  return (
    <>
      <div className={a.overlay} onClick={onClose} />
      <div className={a.dialog} role="dialog" aria-modal="true" aria-label={user ? 'Editar usuario' : 'Nuevo usuario'}>
        <div className={a.dHead}>
          <h2>{user ? `Editar a ${user.name}` : 'Nuevo usuario'}</h2>
          <button type="button" className={a.btn} onClick={onClose}>Cerrar</button>
        </div>
        <div className={a.dBody}>
          <div className={a.field}>
            <label className={a.label} htmlFor="u-name">Nombre</label>
            <input id="u-name" ref={nameRef} className={`${a.input} ${tried && missing.name ? a.invalid : ''}`} value={name} maxLength={60}
              autoComplete="off" placeholder="Ej. Laura (practicante)" onChange={e => setName(e.target.value)} />
            {tried && missing.name && <p className={a.err}>Escribe el nombre.</p>}
          </div>

          <div className={a.field}>
            <label className={a.label} htmlFor="u-pw">{user ? 'Contraseña nueva' : 'Contraseña'}</label>
            <div className={a.pwRow}>
              <input id="u-pw" className={`${a.input} ${tried && missing.pw ? a.invalid : ''}`} type={showPw ? 'text' : 'password'} value={pw}
                autoComplete="new-password" placeholder={user ? 'Sin cambio' : 'Al menos 4 caracteres'} onChange={e => setPw(e.target.value)} />
              <button type="button" className={a.btn} aria-pressed={showPw} onClick={() => setShowPw(v => !v)}>{showPw ? 'Ocultar' : 'Ver'}</button>
            </div>
            {tried && missing.pw
              ? <p className={a.err}>La contraseña debe tener al menos 4 caracteres.</p>
              : <p className={a.hint}>{user ? 'Déjala vacía para no cambiarla. ' : 'Con esto entra al panel. '}No puede ser igual a la de nadie más.</p>}
          </div>

          <div className={a.field}>
            <span className={a.label}>Qué puede ver</span>
            <div className={a.opts}>
              {(['practicante', 'admin'] as Role[]).map(r => (
                <button key={r} type="button" className={a.opt} aria-pressed={role === r} onClick={() => setRole(r)}>
                  <b>{ROLE[r].label}</b>
                  <span>{ROLE[r].sees}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={a.field}>
            <span className={a.label}>Empresa</span>
            {choices.length > 1 ? (
              <div className={a.seg}>
                {choices.map(c => (
                  <button key={c.id || 'todas'} type="button" aria-pressed={companyId === c.id} onClick={() => pickCompany(c.id)}>{c.label}</button>
                ))}
              </div>
            ) : (
              <span className={`${a.chip} ${a.fixed}`}>{choices[0]?.label ?? '—'}</span>
            )}
            <p className={a.hint}>{companyId ? 'Sólo verá esa empresa.' : 'Podrá cambiar entre las dos empresas desde el menú.'}</p>
          </div>

          <div className={a.field}>
            <label className={a.label} htmlFor="u-emp">Hace actividades como</label>
            <select id="u-emp" className={a.input} value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
              <option value="">Nadie (sólo consulta)</option>
              {opts.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name}{!companyId && nameOf(e.company_id) ? ` · ${companyLabel(nameOf(e.company_id)!)}` : ''}
                </option>
              ))}
            </select>
            {newEmp === null ? (
              <p className={a.hint}>
                Para que lo que marque en Mis actividades cuente en Reportes.{' '}
                {companyId && <button type="button" className={a.linkBtn} onClick={() => setNewEmp('')}>¿No está en la lista? Agrégalo</button>}
              </p>
            ) : (
              <div className={a.newEmp}>
                <input className={a.input} value={newEmp} maxLength={60} placeholder="Nombre del practicante" autoFocus
                  onChange={e => setNewEmp(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addEmployee(); }} />
                <button type="button" className={`${a.btn} ${a.dark}`} disabled={saving || !newEmp.trim()} onClick={addEmployee}>Agregar</button>
                <button type="button" className={a.btn} onClick={() => setNewEmp(null)}>Cancelar</button>
              </div>
            )}
          </div>

          {err && <p className={a.err} role="alert">{err}</p>}
          <div className={a.dFoot}>
            <button type="button" className={a.btn} onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="button" className={`${a.btn} ${a.dark}`} onClick={save} disabled={saving}>
              {saving ? 'Guardando…' : user ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
