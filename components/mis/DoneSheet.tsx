'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { TodayRow } from '@/lib/today';
import { fitWithin } from '@/lib/my-day';
import { fmtMin } from '@/components/hoy/look';
import { IconCamera, IconCheck } from '@/components/panel/icons';
import { completeActivity, type DoneResult } from '@/app/mis-actividades/actions';
import m from './mis.module.css';

/** Achica la foto del teléfono (4000 px, 3-8 MB) a 1600 px en JPEG antes de subirla. */
async function toJpeg(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const { w, h } = fitWithin(bmp.width, bmp.height, 1600);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>(res => c.toBlob(res, 'image/jpeg', 0.82));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file; // formato que el navegador no sabe abrir: se sube tal cual
  }
}

export default function DoneSheet({ row, needsPhoto, onClose, onDone }: {
  row: TodayRow;
  needsPhoto: boolean;
  onClose: () => void;
  onDone: (r: DoneResult & { ok: true }) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [stage, setStage] = useState<null | 'foto' | 'guardando'>(null);
  const [err, setErr] = useState<string | null>(null);
  const [already, setAlready] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const busy = stage !== null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function pick(f: File | null) {
    setErr(null);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function save() {
    if (needsPhoto && !file) { setErr('Esta actividad pide una foto. Tómala para poder marcarla.'); return; }
    setErr(null);
    let photoPath: string | null = null;
    if (file) {
      setStage('foto');
      const blob = await toJpeg(file);
      const path = `${row.id}/${Date.now()}.jpg`;
      const up = await supabase.storage.from('evidence').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (up.error) { setStage(null); setErr('No se pudo subir la foto. Revisa tu conexión e intenta otra vez.'); return; }
      photoPath = up.data.path;
    }
    setStage('guardando');
    let r: DoneResult;
    try {
      r = await completeActivity(row.id, photoPath);
    } catch {
      r = { ok: false, error: 'No se pudo guardar. Revisa tu conexión e intenta otra vez.' };
    }
    setStage(null);
    if (!r.ok) { setErr(r.error); setAlready(!!r.already); return; }
    onDone(r);
  }

  const late = row.status === 'overdue';
  return (
    <>
      <div className={m.overlay} onClick={() => !busy && onClose()} />
      <div className={m.sheet} role="dialog" aria-modal="true" aria-label={`Marcar como hecha: ${row.title}`}>
        <div className={m.sHead}>
          <div>
            <small>Marcar como hecha</small>
            <h2>{row.title}</h2>
          </div>
          <button type="button" className={m.btn} onClick={onClose} disabled={busy}>Cerrar</button>
        </div>
        <div className={m.sBody}>
          <p className={`${m.when} ${late ? m.whenLate : m.whenOk}`}>
            {row.optional
              ? `Opcional: márcala sólo si hoy hubo. Se le recuerda hasta las ${row.limit}.`
              : late
              ? `Vas ${fmtMin(row.minutesLate ?? 0)} tarde (límite ${row.limit}). Quedará como hecha tarde.`
              : row.status === 'running'
                ? `Límite ${row.limit} · faltan ${fmtMin(row.minutesLeft ?? 0)}.`
                : `Empieza a las ${row.start} · límite ${row.limit}.`}
          </p>
          {row.description && <p className={m.hint}>{row.description}</p>}

          <input ref={input} className={m.hidden} type="file" accept="image/*" capture="environment" tabIndex={-1} aria-hidden
            onChange={e => { pick(e.target.files?.[0] ?? null); e.target.value = ''; }} />
          {preview ? (
            <>
              <div className={m.preview}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Foto de evidencia" />
              </div>
              <div className={m.previewBtns}>
                <button type="button" className={m.btn} disabled={busy} onClick={() => input.current?.click()}>Cambiar foto</button>
                <button type="button" className={m.btn} disabled={busy} onClick={() => pick(null)}>Quitar</button>
              </div>
            </>
          ) : (
            <button type="button" className={m.shot} disabled={busy} onClick={() => input.current?.click()}>
              <IconCamera size={26} />
              <b>Tomar foto</b>
              <span>{needsPhoto ? 'Obligatoria para esta actividad' : 'Opcional'}</span>
            </button>
          )}

          {err && <p className={m.err} role="alert">{err}</p>}
          <div className={m.sFoot}>
            <button type="button" className={m.btn} onClick={onClose} disabled={busy}>{already ? 'Cerrar' : 'Cancelar'}</button>
            {!already && (
              <button type="button" className={`${m.btn} ${m.go}`} onClick={save} disabled={busy || (needsPhoto && !file)}>
                {stage === 'foto' ? 'Subiendo foto…' : stage === 'guardando' ? 'Guardando…' : <><IconCheck size={13} />Marcar como hecha</>}
              </button>
            )}
          </div>
          {needsPhoto && !file && <p className={m.hint}>El botón se activa cuando tomes la foto.</p>}
        </div>
      </div>
    </>
  );
}
