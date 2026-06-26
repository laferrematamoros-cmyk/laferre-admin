import { SignJWT, jwtVerify } from 'jose';

function key(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

/** Firma un JWT HS256 con expiración en `ttlSeconds` desde ahora. */
export async function signSession(
  payload: Record<string, unknown>,
  secret: string,
  ttlSeconds: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(key(secret));
}

/** Verifica un JWT; devuelve el payload o null si es inválido/expirado. */
export async function verifySession(
  token: string,
  secret: string,
): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret));
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}
