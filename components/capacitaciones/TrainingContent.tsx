'use client';
import { catalogBySlug } from '@/lib/capacitaciones/catalog';
import { PARTS } from './registry';

/** Las partes de una capacitación, una debajo de otra. `round` cambia → se vuelven a montar (reinicia animaciones). */
export default function TrainingContent({ slug, round = 0 }: { slug: string; round?: number }) {
  const parts = catalogBySlug(slug)?.parts ?? [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {parts.map(p => { const C = PARTS[p]; return C ? <C key={`${p}-${round}`} /> : null; })}
    </div>
  );
}
