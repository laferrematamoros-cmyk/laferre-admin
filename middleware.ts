import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth-session';

const SESSION_COOKIE = 'lf_admin_session';

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.AUTH_SECRET ?? '';
  const ok = token ? (await verifySession(token, secret)) !== null : false;

  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// Protege todo MENOS: /login, /api, y archivos estáticos de Next.
export const config = {
  matcher: ['/((?!login|api|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest).*)'],
};
