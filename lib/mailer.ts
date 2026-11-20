import 'server-only';
import nodemailer from 'nodemailer';

// Correo con Gmail + contraseña de aplicación (igual que bfm-rrhh). En Vercel:
// CORREO_USUARIO = la cuenta de Gmail que envía, CORREO_CLAVE = las 16 letras (los espacios se quitan).

const user = () => process.env.CORREO_USUARIO?.trim() ?? '';
const pass = () => (process.env.CORREO_CLAVE ?? '').replace(/\s+/g, '');

/** ¿Hay cuenta para mandar? */
export function mailReady(): boolean {
  return !!user() && !!pass();
}

export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export async function sendMail(to: string[], m: { subject: string; html: string; text: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!mailReady()) return { ok: false, error: 'Falta la cuenta de correo (CORREO_USUARIO y CORREO_CLAVE en Vercel).' };
  const list = [...new Set(to.map(e => e.trim()).filter(validEmail))];
  if (list.length === 0) return { ok: false, error: 'No hay correos a quién avisar (Ajustes → Firma de listas).' };
  try {
    const t = nodemailer.createTransport({ service: 'gmail', auth: { user: user(), pass: pass() } });
    await t.sendMail({ from: `Actividades La Ferre <${user()}>`, to: list.join(', '), ...m });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
