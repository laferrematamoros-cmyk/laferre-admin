import { signSession, verifySession } from '../auth-session';

const SECRET = 'test-secret-0123456789';

describe('auth-session', () => {
  it('un token firmado se verifica y devuelve el payload', async () => {
    const token = await signSession({ role: 'admin' }, SECRET, 3600);
    const payload = await verifySession(token, SECRET);
    expect(payload?.role).toBe('admin');
  });

  it('un token con secreto distinto se rechaza (null)', async () => {
    const token = await signSession({ role: 'admin' }, SECRET, 3600);
    expect(await verifySession(token, 'otro-secreto-distinto-9999')).toBeNull();
  });

  it('un token expirado se rechaza (null)', async () => {
    const token = await signSession({ role: 'admin' }, SECRET, -1);
    expect(await verifySession(token, SECRET)).toBeNull();
  });

  it('basura no es un token válido (null)', async () => {
    expect(await verifySession('no.es.jwt', SECRET)).toBeNull();
  });
});
