import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { CompanyProvider } from '@/lib/company-context';
import { SessionProvider } from '@/lib/session-context';
import { getSession } from '@/lib/auth';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Admin · Actividades',
  description: 'Panel de administración de actividades',
  appleWebApp: {
    capable: true,
    title: 'Actividades',
    statusBarStyle: 'default',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Sesión leída en el servidor: evita el parpadeo del menú en la carga directa.
  const session = await getSession();
  const initial = {
    role: session?.role ?? null,
    name: session?.name ?? null,
    company: session?.company ?? null,
  };
  return (
    <html lang="es" className={`${inter.variable} h-full`}>
      <body className="h-full">
        <SessionProvider initial={initial}>
          <CompanyProvider>{children}</CompanyProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
