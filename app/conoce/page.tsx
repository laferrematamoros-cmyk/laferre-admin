'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminShell from '@/components/AdminShell';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/lib/company-context';

type ItemType = 'instruccion' | 'ayuda_visual';

interface ConoceItem {
  id: string;
  type: ItemType;
  title: string;
  body: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const TYPE_LABELS: Record<ItemType, string> = {
  instruccion:  'Instrucción de trabajo',
  ayuda_visual: 'Ayuda visual',
};

const TYPE_COLORS: Record<ItemType, { bg: string; text: string; border: string }> = {
  instruccion:  { bg: '#FEF2F2', text: '#E11D2E', border: '#FECACA' },
  ayuda_visual: { bg: '#F0FBF6', text: '#0F9D58', border: '#BBF7D0' },
};

export default function ConocePage() {
  const { current } = useCompany();
  const [items, setItems]       = useState<ConoceItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<ConoceItem | null>(null);

  const [type, setType]   = useState<ItemType>('instruccion');
  const [title, setTitle] = useState('');
  const [body, setBody]   = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('conoce_items').select('*').order('type').order('sort_order').order('created_at');
    if (current?.id) q = q.eq('company_id', current.id);
    const { data } = await q;
    setItems(data ?? []);
    setLoading(false);
  }, [current?.id]);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditItem(null);
    setType('instruccion');
    setTitle('');
    setBody('');
    setShowForm(true);
  }

  function openEdit(item: ConoceItem) {
    setEditItem(item);
    setType(item.type);
    setTitle(item.title);
    setBody(item.body ?? '');
    setShowForm(true);
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    if (editItem) {
      await supabase.from('conoce_items').update({ type, title: title.trim(), body: body.trim() || null }).eq('id', editItem.id);
    } else {
      await supabase.from('conoce_items').insert({ type, title: title.trim(), body: body.trim() || null, company_id: current?.id ?? null });
    }
    setSaving(false);
    setShowForm(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este elemento?')) return;
    await supabase.from('conoce_items').delete().eq('id', id);
    load();
  }

  async function handleToggle(item: ConoceItem) {
    await supabase.from('conoce_items').update({ is_active: !item.is_active }).eq('id', item.id);
    load();
  }

  const instrucciones = items.filter(i => i.type === 'instruccion');
  const ayudaVisual   = items.filter(i => i.type === 'ayuda_visual');

  return (
    <AdminShell>
      <div className="flex flex-1 flex-col overflow-y-auto p-8 gap-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-extrabold" style={{ color: '#0F0F10', letterSpacing: -0.4 }}>Conoce</h1>
            <p className="text-[13px] mt-1" style={{ color: '#6E6E73' }}>
              Gestiona las instrucciones de trabajo y ayuda visual para tus empleados.
            </p>
          </div>
          <button
            onClick={openNew}
            className="rounded-xl px-5 py-2.5 text-[13px] font-bold text-white"
            style={{ background: '#E11D2E' }}
          >
            + Nuevo elemento
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: '#fff', border: '1px solid #E5E5EA' }}>
            <p className="text-[13px] font-bold uppercase tracking-wider" style={{ color: '#6E6E73' }}>
              {editItem ? 'Editar elemento' : 'Nuevo elemento'}
            </p>

            {/* Type selector */}
            <div className="flex gap-2">
              {(['instruccion', 'ayuda_visual'] as ItemType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className="rounded-lg px-4 py-2 text-[13px] font-semibold transition-all"
                  style={{
                    background: type === t ? TYPE_COLORS[t].bg : '#F5F5F7',
                    color:      type === t ? TYPE_COLORS[t].text : '#6E6E73',
                    border:     `1.5px solid ${type === t ? TYPE_COLORS[t].border : 'transparent'}`,
                  }}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Título…"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="rounded-xl px-4 py-3 text-[14px] outline-none"
              style={{ border: '1.5px solid #E5E5EA', color: '#0F0F10', background: '#FAFAFA' }}
            />
            <textarea
              placeholder="Descripción o instrucciones detalladas… (opcional)"
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={4}
              className="rounded-xl px-4 py-3 text-[14px] outline-none resize-none"
              style={{ border: '1.5px solid #E5E5EA', color: '#0F0F10', background: '#FAFAFA' }}
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-xl px-5 py-2.5 text-[13px] font-semibold"
                style={{ border: '1px solid #E5E5EA', color: '#6E6E73' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !title.trim()}
                className="rounded-xl px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-40"
                style={{ background: '#E11D2E' }}
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-[13px] text-center mt-12" style={{ color: '#A8A8AD' }}>Cargando…</p>
        ) : (
          <>
            <ItemSection title="Instrucciones de trabajo" items={instrucciones} type="instruccion" onEdit={openEdit} onDelete={handleDelete} onToggle={handleToggle} />
            <ItemSection title="Ayuda visual" items={ayudaVisual} type="ayuda_visual" onEdit={openEdit} onDelete={handleDelete} onToggle={handleToggle} />
          </>
        )}
      </div>
    </AdminShell>
  );
}

function ItemSection({ title, items, type, onEdit, onDelete, onToggle }: {
  title: string; items: ConoceItem[]; type: ItemType;
  onEdit: (i: ConoceItem) => void;
  onDelete: (id: string) => void;
  onToggle: (i: ConoceItem) => void;
}) {
  const c = TYPE_COLORS[type];
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6E6E73' }}>{title}</p>
      {items.length === 0 ? (
        <p className="text-[13px]" style={{ color: '#A8A8AD' }}>Sin elementos registrados.</p>
      ) : (
        items.map(item => (
          <div
            key={item.id}
            className="rounded-2xl p-5 flex flex-col gap-2"
            style={{ background: item.is_active ? c.bg : '#F5F5F7', border: `1.5px solid ${item.is_active ? c.border : '#E5E5EA'}`, opacity: item.is_active ? 1 : 0.6 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-[15px] font-bold" style={{ color: '#0F0F10' }}>{item.title}</p>
                {item.body && <p className="text-[13px] mt-1" style={{ color: '#6E6E73' }}>{item.body}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: item.is_active ? c.bg : '#E5E5EA', color: item.is_active ? c.text : '#6E6E73', border: `1px solid ${item.is_active ? c.border : '#E5E5EA'}` }}>
                  {item.is_active ? 'Visible' : 'Oculto'}
                </span>
                <button onClick={() => onToggle(item)} className="rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: '#fff', border: '1px solid #E5E5EA', color: '#6E6E73' }}>
                  {item.is_active ? 'Ocultar' : 'Mostrar'}
                </button>
                <button onClick={() => onEdit(item)} className="rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: '#fff', border: '1px solid #E5E5EA', color: '#6E6E73' }}>
                  Editar
                </button>
                <button onClick={() => onDelete(item.id)} className="rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: '#fff', border: '1px solid #FECACA', color: '#E11D2E' }}>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
