'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/lib/session-context';
import { supabase } from '@/lib/supabase';
import {
  listUsers, createUser, updateUser, deleteUser,
  type AdminUser, type Role,
} from '@/app/ajustes/users-actions';

interface CompanyOpt { id: string; name: string; slug: string }

// La empresa "bfm" se muestra como "Bodega Ferretera" en este panel.
function companyLabel(c: CompanyOpt): string {
  if (c.slug === 'bfm') return 'Bodega Ferretera';
  return c.name;
}

const ROLE_LABEL: Record<Role, string> = { admin: 'Administrador', practicante: 'Practicante' };

const inputCls = 'w-full rounded-[9px] border px-3 py-2 text-[13px] outline-none focus:border-gray-400';
const inputStyle = { borderColor: '#E4E4E7' } as const;

interface FormState { name: string; password: string; role: Role; companyId: string }
const EMPTY_FORM: FormState = { name: '', password: '', role: 'practicante', companyId: '' };

export default function UsersSection() {
  const { role } = useSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [companies, setCompanies] = useState<CompanyOpt[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try { setUsers(await listUsers()); } catch { /* no admin */ }
  }, []);

  useEffect(() => {
    supabase.from('companies').select('id,name,slug').order('name')
      .then(({ data }) => setCompanies((data ?? []) as CompanyOpt[]));
    refresh();
  }, [refresh]);

  // Solo los administradores gestionan usuarios.
  if (role !== 'admin') return null;

  const companyName = (id: string | null) =>
    id ? (companies.find(c => c.id === id) ? companyLabel(companies.find(c => c.id === id)!) : '—') : 'Todas';

  async function handleCreate() {
    setBusy(true); setError(null);
    const res = await createUser({
      name: form.name, password: form.password, role: form.role,
      companyId: form.companyId || null,
    });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setForm(EMPTY_FORM);
    refresh();
  }

  function startEdit(u: AdminUser) {
    setEditingId(u.id);
    setEditForm({ name: u.name, password: '', role: u.role, companyId: u.company_id ?? '' });
    setError(null);
  }

  async function handleUpdate() {
    if (!editingId) return;
    setBusy(true); setError(null);
    const res = await updateUser(editingId, {
      name: editForm.name, password: editForm.password, role: editForm.role,
      companyId: editForm.companyId || null,
    });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setEditingId(null);
    refresh();
  }

  async function handleDelete(u: AdminUser) {
    if (!confirm(`¿Eliminar al usuario "${u.name}"?`)) return;
    setBusy(true); setError(null);
    const res = await deleteUser(u.id);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    if (editingId === u.id) setEditingId(null);
    refresh();
  }

  const CompanySelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select className={inputCls} style={inputStyle} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">Todas las empresas</option>
      {companies.map(c => <option key={c.id} value={c.id}>{companyLabel(c)}</option>)}
    </select>
  );

  const RoleSelect = ({ value, onChange }: { value: Role; onChange: (v: Role) => void }) => (
    <select className={inputCls} style={inputStyle} value={value} onChange={e => onChange(e.target.value as Role)}>
      <option value="practicante">Practicante (solo Dashboard y Reportes)</option>
      <option value="admin">Administrador (ve todo)</option>
    </select>
  );

  return (
    <div className="rounded-xl border p-4 md:p-[22px]" style={{ background: '#fff', borderColor: '#E4E4E7' }}>
      <h2 className="mb-1 text-[13px] font-bold">Usuarios del panel</h2>
      <p className="mb-4 text-[12px]" style={{ color: '#6E6E73' }}>
        Cada usuario entra con su propia contraseña. El practicante solo ve Dashboard y Reportes.
        Fija una empresa para limitarlo a ella.
      </p>

      {error && (
        <p className="mb-3 rounded-[9px] px-3 py-2 text-[12px] font-semibold" style={{ background: '#FCE7E9', color: '#E11D2E' }}>
          {error}
        </p>
      )}

      {/* Lista de usuarios */}
      <div className="mb-5 flex flex-col gap-2">
        {users.length === 0 && (
          <p className="text-[12px]" style={{ color: '#9A9A9F' }}>Todavía no hay usuarios. Agrega el primero abajo.</p>
        )}
        {users.map(u => (
          <div key={u.id} className="rounded-[10px] border" style={{ borderColor: '#EDEDEF' }}>
            {editingId === u.id ? (
              <div className="flex flex-col gap-3 p-3">
                <input className={inputCls} style={inputStyle} placeholder="Nombre"
                  value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                <input className={inputCls} style={inputStyle} type="password" placeholder="Nueva contraseña (vacío = no cambiar)"
                  value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} />
                <RoleSelect value={editForm.role} onChange={v => setEditForm(f => ({ ...f, role: v }))} />
                <CompanySelect value={editForm.companyId} onChange={v => setEditForm(f => ({ ...f, companyId: v }))} />
                <div className="flex gap-2">
                  <button disabled={busy} onClick={handleUpdate}
                    className="rounded-[9px] px-[14px] py-[8px] text-[12px] font-semibold text-white" style={{ background: 'var(--accent)', opacity: busy ? 0.6 : 1 }}>
                    Guardar
                  </button>
                  <button disabled={busy} onClick={() => setEditingId(null)}
                    className="rounded-[9px] border px-[14px] py-[8px] text-[12px] font-semibold" style={{ borderColor: '#E4E4E7', color: '#6E6E73' }}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: u.role === 'admin' ? '#0F0F10' : '#6E6E73' }}>
                  {u.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold truncate">{u.name}</p>
                  <p className="text-[11px]" style={{ color: '#6E6E73' }}>
                    {ROLE_LABEL[u.role]} · {companyName(u.company_id)}
                  </p>
                </div>
                <button onClick={() => startEdit(u)} className="rounded-[8px] border px-3 py-1.5 text-[12px] font-semibold" style={{ borderColor: '#E4E4E7' }}>
                  Editar
                </button>
                <button onClick={() => handleDelete(u)} className="rounded-[8px] border px-3 py-1.5 text-[12px] font-semibold" style={{ borderColor: '#FCE7E9', color: '#E11D2E' }}>
                  Eliminar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Alta de usuario */}
      <div className="rounded-[10px] border border-dashed p-3" style={{ borderColor: '#D8D8DC' }}>
        <p className="mb-3 text-[12px] font-bold">Agregar usuario</p>
        <div className="flex flex-col gap-3">
          <input className={inputCls} style={inputStyle} placeholder="Nombre"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input className={inputCls} style={inputStyle} type="password" placeholder="Contraseña"
            value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          <RoleSelect value={form.role} onChange={v => setForm(f => ({ ...f, role: v }))} />
          <CompanySelect value={form.companyId} onChange={v => setForm(f => ({ ...f, companyId: v }))} />
          <button disabled={busy} onClick={handleCreate}
            className="self-start rounded-[9px] px-[14px] py-[9px] text-[13px] font-semibold text-white" style={{ background: 'var(--accent)', opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Guardando…' : '+ Agregar usuario'}
          </button>
        </div>
      </div>
    </div>
  );
}
