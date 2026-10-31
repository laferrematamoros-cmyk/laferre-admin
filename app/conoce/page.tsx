'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/lib/company-context';
import { safeHttps } from '@/lib/safe-url';
import { fitWithin } from '@/lib/my-day';
import { IconCamera, IconPlus } from '@/components/panel/icons';
import s from '@/components/panel/panel.module.css';
import c from '@/components/conoce/co.module.css';
import { CONOCE_BUCKET, conoceExt } from '@/lib/conoce-image';
import { conoceUploadTicket, createConoceItem, updateConoceItem, setConoceActive, deleteConoceItem, type Result } from './actions';

type ItemType = 'instruccion' | 'ayuda_visual';

interface ConoceItem {
  id: string;
  type: ItemType;
  title: string;
  body: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const TYPES: Record<ItemType, { label: string; plural: string; hint: string }> = {
  instruccion:  { label: 'Instrucción de trabajo', plural: 'Instrucciones de trabajo', hint: 'Cómo se hace algo, paso a paso.' },
  ayuda_visual: { label: 'Ayuda visual', plural: 'Ayudas visuales', hint: 'Una imagen para reconocer o ubicar algo.' },
};
const ORDER: ItemType[] = ['instruccion', 'ayuda_visual'];

/**
 * Las imágenes de más de 2 MB (o en un formato que el almacén no acepta, como
 * HEIC) se pasan a JPEG de 2400 px como máximo: se sigue leyendo la letra.
 */
async function prepare(file: File): Promise<Blob> {
  if (file.size <= 2_000_000 && conoceExt(file.type)) return file;
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const { w, h } = fitWithin(bmp.width, bmp.height, 2400);
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  cv.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await new Promise<Blob | null>(res => cv.toBlob(res, 'image/jpeg', 0.88));
  if (!blob) throw new Error('jpeg');
  return conoceExt(file.type) && blob.size >= file.size ? file : blob;
}

/** Sube al almacén "conoce" de Supabase (con permiso de un solo uso del servidor) y devuelve el enlace. */
async function uploadImage(file: File, companyId: string): Promise<string> {
  let blob: Blob;
  try {
    blob = await prepare(file);
  } catch {
    throw new Error('Ese formato de imagen no se puede abrir aquí. Usa una JPG o PNG.');
  }
  const t = await conoceUploadTicket(companyId, blob.type);
  if (!t.ok) throw new Error(t.error);
  const up = await supabase.storage.from(CONOCE_BUCKET).uploadToSignedUrl(t.path, t.token, blob, { contentType: blob.type });
  if (up.error) throw new Error('No se pudo subir la imagen. Revisa tu conexión e intenta otra vez.');
  return supabase.storage.from(CONOCE_BUCKET).getPublicUrl(t.path).data.publicUrl;
}

export default function ConocePage() {
  const { current: company } = useCompany();
  const [items, setItems] = useState<ConoceItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ item: ConoceItem | null; type: ItemType } | null>(null);
  const [viewer, setViewer] = useState<{ url: string; title: string } | null>(null);
  // Imágenes que no cargaron (las viejas de ImgBB llegaron a dar 503): se avisa en lugar de dejar la tarjeta en blanco.
  const [broken, setBroken] = useState<Record<string, number>>({});
  const [retry, setRetry] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    if (!company) return;
    const { data, error: e } = await supabase.from('conoce_items').select('*')
      .eq('company_id', company.id).order('sort_order').order('created_at');
    if (e) { setError(e.message); return; }
    setItems((data ?? []) as ConoceItem[]);
  }, [company]);

  useEffect(() => { setItems(null); load(); }, [load]);

  useEffect(() => {
    if (!viewer) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setViewer(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewer]);

  async function run(id: string, fn: () => Promise<Result>) {
    setBusy(id);
    setError(null);
    const r = await fn();
    if (!r.ok) setError(r.error);
    await load();
    setBusy(null);
    setConfirmId(null);
  }

  const visible = (items ?? []).filter(i => i.is_active).length;
  const hidden = (items ?? []).length - visible;

  return (
    <AdminShell>
      <div className={s.page}>
        <header className={s.top}>
          <div>
            <div className={s.eyebrow}><i />{company?.name ?? 'Actividades'} · Conoce</div>
            <h1 className={s.title}>Conoce</h1>
            <div className={s.sub}>
              {items
                ? `Lo que los empleados consultan en su app · ${visible} visible${visible === 1 ? '' : 's'}${hidden ? ` · ${hidden} oculto${hidden === 1 ? '' : 's'}` : ''}`
                : 'Instrucciones y ayudas visuales para los empleados.'}
            </div>
          </div>
          <div className={s.tools}>
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => setDialog({ item: null, type: 'instruccion' })} disabled={!company}>
              <IconPlus />Nuevo
            </button>
          </div>
        </header>

        <div className={s.content}>
          {error && <div className={s.error} role="alert">{error}</div>}
          {!company ? (
            <p className={s.foot}>Escoge una empresa en el menú.</p>
          ) : !items ? (
            !error && <p className={s.loading}>Cargando…</p>
          ) : ORDER.map(t => {
            const list = items.filter(i => i.type === t);
            return (
              <section key={t} className={c.block}>
                <div className={c.secHead}>
                  <p className={c.secLbl}>{TYPES[t].plural} ({list.length})</p>
                  <p className={c.secHint}>{TYPES[t].hint} Los empleados las ven en este orden.</p>
                </div>
                {list.length === 0 ? (
                  <div className={c.empty}>
                    Todavía no hay {TYPES[t].plural.toLowerCase()}.{' '}
                    <button type="button" className={c.btn} onClick={() => setDialog({ item: null, type: t })}>Agregar</button>
                  </div>
                ) : (
                  <div className={c.grid}>
                    {list.map(it => {
                      const img = safeHttps(it.image_url);
                      const n = retry[it.id] ?? 0;
                      const src = img && n ? `${img}${img.includes('?') ? '&' : '?'}r=${n}` : img;
                      return (
                        <article key={it.id} className={`${s.card} ${c.item} ${it.is_active ? '' : c.off}`}>
                          {img && broken[it.id] === n ? (
                            <div className={c.noImg}>
                              <span className={c.broken}>
                                La imagen no cargó.
                                <button type="button" className={c.btn} onClick={() => setRetry(r => ({ ...r, [it.id]: n + 1 }))}>Reintentar</button>
                              </span>
                            </div>
                          ) : img && src ? (
                            <button type="button" className={c.thumb} onClick={() => setViewer({ url: src, title: it.title })} aria-label={`Ver en grande: ${it.title}`}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img key={src} src={src} alt="" loading="lazy" onError={() => setBroken(b => ({ ...b, [it.id]: n }))} />
                              <span className={c.zoom}>Ver en grande</span>
                            </button>
                          ) : (
                            <div className={c.noImg}>Sin imagen</div>
                          )}
                          <div className={c.itemBody}>
                            <h3>{it.title}</h3>
                            {it.body && <p className={c.text}>{it.body}</p>}
                            <div className={c.chips}>
                              <span className={`${c.chip} ${it.is_active ? c.chipOn : c.chipOff}`}>
                                {it.is_active ? 'Lo ven los empleados' : 'Oculto'}
                              </span>
                            </div>
                            {confirmId === it.id ? (
                              <div className={c.confirm} role="alert">
                                <span><b>¿Eliminar &ldquo;{it.title}&rdquo;?</b> Deja de verse en la app. Si sólo quieres quitarlo un tiempo, mejor ocúltalo.</span>
                                <div className={c.confirmBtns}>
                                  <button type="button" className={`${c.btn} ${c.danger}`} disabled={busy === it.id} onClick={() => run(it.id, () => deleteConoceItem(it.id))}>
                                    {busy === it.id ? 'Eliminando…' : 'Sí, eliminar'}
                                  </button>
                                  <button type="button" className={c.btn} onClick={() => setConfirmId(null)}>Cancelar</button>
                                </div>
                              </div>
                            ) : (
                              <div className={c.actions}>
                                <button type="button" className={c.btn} disabled={busy === it.id} onClick={() => run(it.id, () => setConoceActive(it.id, !it.is_active))}>
                                  {busy === it.id ? '…' : it.is_active ? 'Ocultar' : 'Mostrar'}
                                </button>
                                <button type="button" className={`${c.btn} ${c.dark}`} onClick={() => setDialog({ item: it, type: it.type })}>Editar</button>
                                <button type="button" className={`${c.btn} ${c.danger}`} onClick={() => setConfirmId(it.id)}>Eliminar</button>
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {viewer && (
          <div className={c.viewer} role="dialog" aria-modal="true" aria-label={viewer.title} onClick={() => setViewer(null)}>
            <div className={c.vTop} onClick={e => e.stopPropagation()}>
              <b>{viewer.title}</b>
              <button type="button" className={c.btn} onClick={() => setViewer(null)} autoFocus>Cerrar</button>
            </div>
            <div className={c.vImg}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={viewer.url} alt={viewer.title} onClick={e => e.stopPropagation()} />
            </div>
          </div>
        )}

        {dialog && company && (
          <ItemDialog
            item={dialog.item}
            initialType={dialog.type}
            companyId={company.id}
            onClose={() => setDialog(null)}
            onSaved={async () => { setDialog(null); await load(); }}
          />
        )}
      </div>
    </AdminShell>
  );
}

function ItemDialog({ item, initialType, companyId, onClose, onSaved }: {
  item: ConoceItem | null;
  initialType: ItemType;
  companyId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [type, setType] = useState<ItemType>(item?.type ?? initialType);
  const [title, setTitle] = useState(item?.title ?? '');
  const [body, setBody] = useState(item?.body ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(safeHttps(item?.image_url));
  const [tried, setTried] = useState(false);
  const [stage, setStage] = useState<null | 'imagen' | 'guardando'>(null);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const busy = stage !== null;

  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  useEffect(() => () => { if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);

  function pick(f: File | null) {
    setErr(null);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function save() {
    setTried(true);
    if (!title.trim()) return;
    setErr(null);
    let imageUrl: string | null = preview && !file ? (item?.image_url ?? null) : null;
    if (file) {
      setStage('imagen');
      try {
        imageUrl = await uploadImage(file, companyId);
      } catch (e) {
        setStage(null);
        setErr(e instanceof Error ? e.message : 'No se pudo subir la imagen.');
        return;
      }
    }
    setStage('guardando');
    const fields = { type, title: title.trim(), body: body.trim() || null, image_url: imageUrl };
    const r = item ? await updateConoceItem(item.id, fields) : await createConoceItem({ ...fields, company_id: companyId });
    setStage(null);
    if (!r.ok) { setErr(`No se pudo guardar: ${r.error}`); return; }
    await onSaved();
  }

  return (
    <>
      <div className={c.overlay} onClick={() => !busy && onClose()} />
      <div className={c.dialog} role="dialog" aria-modal="true" aria-label={item ? 'Editar' : 'Nuevo en Conoce'}>
        <div className={c.dHead}>
          <h2>{item ? 'Editar' : 'Nuevo en Conoce'}</h2>
          <button type="button" className={c.btn} onClick={onClose} disabled={busy}>Cerrar</button>
        </div>
        <div className={c.dBody}>
          <div className={c.field}>
            <span className={c.label}>Qué es</span>
            <div className={c.seg}>
              {ORDER.map(t => (
                <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)}>
                  <b>{TYPES[t].label}</b><span>{TYPES[t].hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={c.field}>
            <label className={c.label} htmlFor="co-title">Título</label>
            <input id="co-title" ref={titleRef} className={`${c.input} ${tried && !title.trim() ? c.invalid : ''}`} value={title} maxLength={120}
              placeholder="Ej. Cómo medir mangueras" onChange={e => setTitle(e.target.value)} />
            {tried && !title.trim() && <p className={c.hint} style={{ color: 'var(--st-miss-ink)', fontWeight: 600 }}>Escribe el título.</p>}
          </div>

          <div className={c.field}>
            <label className={c.label} htmlFor="co-body">Texto (opcional)</label>
            <textarea id="co-body" className={c.input} value={body} maxLength={2000} rows={4}
              placeholder="Pasos o explicación. Si la imagen ya lo dice todo, déjalo vacío." onChange={e => setBody(e.target.value)} />
          </div>

          <div className={c.field}>
            <span className={c.label}>Imagen (opcional)</span>
            <input ref={input} className={c.hidden} type="file" accept="image/*" tabIndex={-1} aria-hidden
              onChange={e => { pick(e.target.files?.[0] ?? null); e.target.value = ''; }} />
            {preview ? (
              <>
                <div className={c.preview}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Vista previa" />
                </div>
                <div className={c.previewBtns}>
                  <button type="button" className={c.btn} disabled={busy} onClick={() => input.current?.click()}>Cambiar imagen</button>
                  <button type="button" className={c.btn} disabled={busy} onClick={() => pick(null)}>Quitar</button>
                </div>
              </>
            ) : (
              <button type="button" className={c.drop} disabled={busy} onClick={() => input.current?.click()}>
                <IconCamera size={24} />
                <b>Subir imagen</b>
                <span>Foto o imagen (JPG, PNG). Si pesa mucho, se achica sola.</span>
              </button>
            )}
          </div>

          {err && <p className={c.err} role="alert">{err}</p>}
          <div className={c.dFoot}>
            <button type="button" className={c.btn} onClick={onClose} disabled={busy}>Cancelar</button>
            <button type="button" className={`${c.btn} ${c.dark}`} onClick={save} disabled={busy}>
              {stage === 'imagen' ? 'Subiendo imagen…' : stage === 'guardando' ? 'Guardando…' : item ? 'Guardar cambios' : 'Agregar'}
            </button>
          </div>
          <p className={c.hint}>Se ve en la app de los empleados, en la sección Conoce{item && !item.is_active ? ' (cuando lo vuelvas a mostrar)' : ''}.</p>
        </div>
      </div>
    </>
  );
}
