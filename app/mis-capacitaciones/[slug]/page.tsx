'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import TrainingViewer from '@/components/capacitaciones/TrainingViewer';
import { friendlyMineError } from '@/lib/capacitaciones/my-view';
import { openMyTraining, type MyOpen } from '../actions';
import m from '@/components/capacitaciones/mis.module.css';

export default function MiCapacitacionPage() {
  const { slug } = useParams<{ slug: string }>();
  const [r, setR] = useState<MyOpen | null>(null);
  // Abrir crea una fila de sesión: una sola vez, aunque el modo estricto monte dos veces.
  const asked = useRef(false);

  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    openMyTraining(slug)
      .then(setR)
      .catch(() => setR({ ok: false, error: 'No se pudo abrir. Intenta de nuevo.' }));
  }, [slug]);

  return (
    <AdminShell>
      {/* flex: 1 y no height: 100%: en el celular la barra superior del menú también ocupa alto. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        {!r ? <div className={m.msg}>Cargando…</div>
          : !r.ok ? (
            <div className={m.msg}>
              <span>{friendlyMineError(r.error)}</span>
              <Link href="/mis-capacitaciones">Volver</Link>
            </div>
          ) : (
            <TrainingViewer slug={slug} title={r.title} firstName={r.firstName} minSeconds={r.minSeconds} token={r.token}
              previous={r.previous} embedded back={{ href: '/mis-capacitaciones', label: 'Volver a mis capacitaciones' }} />
          )}
      </div>
    </AdminShell>
  );
}
