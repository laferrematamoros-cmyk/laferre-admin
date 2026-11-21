import { notFound } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import TrainingViewer from '@/components/capacitaciones/TrainingViewer';
import { catalogBySlug } from '@/lib/capacitaciones/catalog';

// Vista previa del admin (el middleware no deja entrar a la practicante: /capacitaciones no está en INTERN_ALLOWED).
export default async function Preview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = catalogBySlug(slug);
  if (!c) notFound();
  return (
    <AdminShell>
      {/* flex: 1 y no height: 100%: en el celular la barra superior del menú también ocupa alto. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        <TrainingViewer slug={slug} title={c.title} minSeconds={c.minSeconds} token={null} embedded
          back={{ href: '/capacitaciones?tab=ajustes', label: 'Volver a Capacitación' }} />
      </div>
    </AdminShell>
  );
}
