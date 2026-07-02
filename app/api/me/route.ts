import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

// Devuelve rol, nombre y empresa fija de la sesión para que el cliente
// (menú, selector de empresa, etiqueta de usuario) sepa qué mostrar.
// La cookie es httpOnly, por eso se lee en el servidor.
export async function GET() {
  const session = await getSession();
  return NextResponse.json({
    role: session?.role ?? null,
    name: session?.name ?? null,
    company: session?.company ?? null,
  });
}
