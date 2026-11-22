'use client';
import { memo } from 'react';
import { catalogBySlug } from '@/lib/capacitaciones/catalog';
import { PARTS } from './registry';

/** Las partes de una capacitación, una debajo de otra. `round` cambia → se vuelven a montar (reinicia animaciones). */
function TrainingContent({ slug, round = 0 }: { slug: string; round?: number }) {
  const parts = catalogBySlug(slug)?.parts ?? [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Cada parte en su propio bloque: varias animaciones son `container-type: inline-size` con
          `margin: 0 auto`, y como hijo directo de un flex se encogían a 32 px de ancho. */}
      {parts.map(p => { const C = PARTS[p]; return C ? <div key={`${p}-${round}`} style={{ minWidth: 0 }}><C /></div> : null; })}
    </div>
  );
}

// memo: la página se vuelve a pintar cada segundo por la cuenta regresiva; las animaciones no tienen por qué.
export default memo(TrainingContent);
