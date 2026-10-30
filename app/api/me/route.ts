import { NextResponse } from 'next/server';
import { syncSessionCookie } from '@/lib/auth';

// Devuelve rol, nombre y empresa fija de la sesión para que el cliente
// (menú, selector de empresa, etiqueta de usuario) sepa qué mostrar.
// La cookie es httpOnly, por eso se lee en el servidor.
export async function GET() {
  // También borra la cookie de un usuario eliminado y la pone al día si le
  // cambiaron el rol o la empresa (ver lib/auth.ts).
  const session = await syncSessionCookie();
  return NextResponse.json({
    role: session?.role ?? null,
    name: session?.name ?? null,
    company: session?.company ?? null,
    employeeId: session?.employeeId ?? null,
  });
}
