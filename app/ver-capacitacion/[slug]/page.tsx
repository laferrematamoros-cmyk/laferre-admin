import type { Metadata } from 'next';
import { loadViewer } from '@/lib/capacitaciones/viewer';
import TrainingViewer from '@/components/capacitaciones/TrainingViewer';

// Pública: la abre el teléfono con ?s=<sesión> (cap_open). El middleware no la protege; la protege la sesión de 12 h.
export const metadata: Metadata = { title: 'Capacitación', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function Page({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ s?: string | string[] }>;
}) {
  const { slug } = await params;
  const { s } = await searchParams;
  const v = await loadViewer(slug, typeof s === 'string' ? s : undefined);
  if (!v.ok) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#F4F4F6', fontFamily: 'var(--font-geist), system-ui' }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>Capacitación</h1>
          <p style={{ color: '#55555B', margin: '0 0 20px' }}>{v.error}</p>
          <a href="laferre://capacitacion" style={{ display: 'inline-block', padding: '14px 22px', borderRadius: 999, background: '#0B0B0C', color: '#fff', textDecoration: 'none', fontWeight: 600 }}>Regresar a la app</a>
        </div>
      </main>
    );
  }
  return <TrainingViewer slug={v.slug} title={v.title} employeeName={v.employeeName} minSeconds={v.minSeconds}
    token={v.token} previous={v.previous} back={{ href: 'laferre://capacitacion', label: 'Regresar a la app' }} />;
}
