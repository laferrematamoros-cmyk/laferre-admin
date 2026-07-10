import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth-session';

const SESSION_COOKIE = 'lf_admin_session';

// Rutas que el rol 'practicante' puede ver. Todo lo demás lo manda al dashboard.
const INTERN_ALLOWED = ['/dashboard', '/reportes', '/mis-actividades'];

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.AUTH_SECRET;
  // Fail-closed: sin secreto configurado, ninguna sesión es válida (igual que lib/auth.ts).
  const payload = token && secret ? await verifySession(token, secret) : null;

  if (!payload) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // El practicante solo entra a Dashboard y Reportes; cualquier otra ruta → dashboard.
  if (payload.role === 'practicante') {
    const path = req.nextUrl.pathname;
    const allowed = INTERN_ALLOWED.some(p => path === p || path.startsWith(p + '/'));
    if (!allowed) {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Protege todo MENOS: /login, /api, archivos estáticos de Next, el manifiesto
// del PWA y cualquier imagen (.png/.svg/.ico). Los íconos deben ser públicos
// para que el navegador pueda leer el manifiesto y ofrecer "Instalar".
export const config = {
  matcher: ['/((?!login|api|_next/static|_next/image|manifest.webmanifest|.*\\.(?:png|svg|ico|jpg|jpeg|webp)$).*)'],
};
