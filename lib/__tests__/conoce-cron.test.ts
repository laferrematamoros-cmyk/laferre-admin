import { conoceExt, conocePathOf } from '../conoce-image';
import { cronKeyOk } from '../cron-auth';

const BASE = 'https://yagsegxzodiffsfvnjvp.supabase.co';
const LF = 'a6798a18-9565-4f2b-929a-0c6771e7ef54';
const BFM = '22604654-8a66-4a30-9a20-ab48d7a9c794';
const FILE = '0b1c2d3e-4f50-4617-8899-aabbccddeeff.jpg';

describe('conoceExt', () => {
  it('acepta JPG, PNG y WEBP', () => {
    expect(conoceExt('image/jpeg')).toBe('jpg');
    expect(conoceExt('IMAGE/PNG')).toBe('png');
    expect(conoceExt('image/webp')).toBe('webp');
  });
  it('rechaza lo demás', () => {
    expect(conoceExt('image/heic')).toBeNull();
    expect(conoceExt('image/gif')).toBeNull();
    expect(conoceExt('')).toBeNull();
  });
});

describe('conocePathOf', () => {
  const good = `${BASE}/storage/v1/object/public/conoce/${LF}/${FILE}`;
  it('reconoce una imagen nuestra y devuelve su ruta', () => {
    expect(conocePathOf(good, BASE)).toBe(`${LF}/${FILE}`);
    expect(conocePathOf(good, BASE, LF)).toBe(`${LF}/${FILE}`);
  });
  it('rechaza la de otra empresa cuando se pide una', () => {
    expect(conocePathOf(good, BASE, BFM)).toBeNull();
  });
  it('rechaza otro dominio, otro almacén, rutas raras y ImgBB', () => {
    expect(conocePathOf(good.replace(BASE, 'https://otro.supabase.co'), BASE)).toBeNull();
    expect(conocePathOf(good.replace('/conoce/', '/evidence/'), BASE)).toBeNull();
    expect(conocePathOf(`${BASE}/storage/v1/object/public/conoce/${LF}/../${BFM}/${FILE}`, BASE, BFM)).toBeNull();
    expect(conocePathOf(`${good}?x=1`, BASE)).toBeNull();
    expect(conocePathOf('https://i.ibb.co/GvB0YDN8/06c705095bdd.jpg', BASE)).toBeNull();
    expect(conocePathOf('no es enlace', BASE)).toBeNull();
    expect(conocePathOf(null, BASE)).toBeNull();
  });
});

describe('cronKeyOk', () => {
  const S = 'clave-larga-de-prueba-123';
  it('sin clave puesta en Vercel deja pasar (transición)', () => {
    expect(cronKeyOk(undefined, null, null)).toBe(true);
    expect(cronKeyOk('   ', null, null)).toBe(true);
  });
  it('con clave puesta, exige la misma en el encabezado o en ?key=', () => {
    expect(cronKeyOk(S, `Bearer ${S}`, null)).toBe(true);
    expect(cronKeyOk(S, `bearer   ${S}  `, null)).toBe(true);
    expect(cronKeyOk(S, null, S)).toBe(true);
  });
  it('rechaza sin clave, con otra o casi igual', () => {
    expect(cronKeyOk(S, null, null)).toBe(false);
    expect(cronKeyOk(S, 'Bearer otra', null)).toBe(false);
    expect(cronKeyOk(S, `Bearer ${S}x`, null)).toBe(false);
    expect(cronKeyOk(S, S, null)).toBe(false); // sin "Bearer"
    expect(cronKeyOk(S, null, '')).toBe(false);
  });
});
