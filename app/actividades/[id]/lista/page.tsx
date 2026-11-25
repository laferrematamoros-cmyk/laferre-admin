import { redirect } from 'next/navigation';

/** La lista con firma ahora se edita junto con la actividad (una sola pantalla). Las ligas viejas llegan aquí. */
export default async function ListaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/actividades/${id}`);
}
