import 'server-only';
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

// Hash de contraseñas con scrypt (nativo de Node, sin dependencias).
// Formato almacenado: "<salt_hex>:<hash_hex>".
const KEYLEN = 64;

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plain, salt, KEYLEN).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [salt, hashHex] = stored.split(':');
  if (!salt || !hashHex) return false;
  const hash = Buffer.from(hashHex, 'hex');
  const test = scryptSync(plain, salt, KEYLEN);
  // Compara en tiempo constante; longitudes distintas => no coincide.
  if (hash.length !== test.length) return false;
  return timingSafeEqual(hash, test);
}