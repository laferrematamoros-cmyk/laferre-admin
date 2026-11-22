import { notFound, redirect } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import TrainingViewer from '@/components/capacitaciones/TrainingViewer';
import { adminAccess } from '@/lib/admin-access';
import { supabaseAdmin } from '@/lib/supabase';
import { catalogBySlug } from '@/lib/capacitaciones/catalog';
import { previewSettings } from '@/lib/capacitaciones/format';

// Vista previa del admin (el middleware no deja entrar a la practicante: /capacitaciones no está en INTERN_ALLOWED).
// Sólo lee: enseña el tiempo guardado en Ajustes, para revisarlo con "Ver" antes de activarla.
export default async function Preview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = catalogBySlug(slug);
  if (!c) notFound();
  const a = await adminAccess();
  if (!a.ok) redirect('/dashboard');
  // Si la tabla aún no existe (011 sin correr) o no hay fila, `data` viene vacío y se usa el catálogo.
  const { data } = await supabaseAdmin().from('trainings').select('title, min_seconds').eq('slug', slug).maybeSingle();
  const { title, minSeconds } = previewSettings(c, data);
  return (
    <AdminShell>
      {/* flex: 1 y no height: 100%: en el celular la barra superior del menú también ocupa alto. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        <TrainingViewer slug={slug} title={title} minSeconds={minSeconds} token={null} embedded
          back={{ href: '/capacitaciones?tab=ajustes', label: 'Volver a Capacitación' }} />
      </div>
    </AdminShell>
  );
}
