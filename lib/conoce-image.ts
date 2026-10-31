// Imágenes de Conoce en Supabase Storage (antes ImgBB, que llegó a contestar 503).
// Reglas puras: se prueban sin servidor.

export const CONOCE_BUCKET = 'conoce';

const EXT: Record<string, 'jpg' | 'png' | 'webp'> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** Extensión para un tipo de imagen aceptado; null si no se acepta (HEIC, GIF…). */
export function conoceExt(mime: string): 'jpg' | 'png' | 'webp' | null {
  return EXT[mime.toLowerCase()] ?? null;
}

/**
 * Si el enlace es una imagen de Conoce en nuestro almacén (y de esa empresa,
 * cuando se pide), devuelve su ruta dentro del almacén: "<empresa>/<uuid>.jpg".
 * Si no, null. Se revisa el enlace ya interpretado, así no se cuelan "..",
 * otro dominio ni otro almacén.
 */
export function conocePathOf(url: string | null | undefined, base: string, companyId?: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    // Sólo enlaces ya "limpios": new URL resuelve los ".." y no deben llegar así.
    if (u.href !== url || u.origin !== new URL(base).origin || u.search || u.hash) return null;
    const m = /^\/storage\/v1\/object\/public\/conoce\/([0-9a-f-]{36})\/([0-9a-f-]{36}\.(?:jpg|png|webp))$/i.exec(u.pathname);
    if (!m) return null;
    if (companyId && m[1].toLowerCase() !== companyId.toLowerCase()) return null;
    return `${m[1]}/${m[2]}`;
  } catch {
    return null;
  }
}
