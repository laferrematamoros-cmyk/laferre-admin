import { allows, isUuid, pick } from '../access-rules';

const LF = 'a6798a18-9565-4f2b-929a-0c6771e7ef54';
const BFM = '22604654-8a66-4a30-9a20-ab48d7a9c794';

describe('isUuid', () => {
  it('acepta ids de la base y rechaza lo demás', () => {
    expect(isUuid(LF)).toBe(true);
    expect(isUuid('laferre')).toBe(false);
    expect(isUuid(`${LF}' or 1=1`)).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(42)).toBe(false);
  });
});

describe('allows', () => {
  it('quien ve las dos empresas puede tocar cualquiera, y lo que no tiene empresa', () => {
    expect(allows(null, LF)).toBe(true);
    expect(allows(null, BFM)).toBe(true);
    expect(allows(null, null)).toBe(true);
  });

  it('quien está fijo a una empresa sólo toca la suya', () => {
    expect(allows(LF, LF)).toBe(true);
    expect(allows(LF, BFM)).toBe(false);
    expect(allows(LF, null)).toBe(false);
  });

  it('rechaza valores que no son un id', () => {
    expect(allows(null, undefined)).toBe(false);
    expect(allows(null, '')).toBe(false);
    expect(allows(null, 'bfm')).toBe(false);
    expect(allows(LF, LF.toUpperCase().replace(/./, 'x'))).toBe(false);
  });
});

describe('pick', () => {
  it('deja sólo las columnas permitidas', () => {
    expect(pick({ title: 'A', company_id: BFM, is_active: true }, ['title', 'is_active']))
      .toEqual({ title: 'A', is_active: true });
  });

  it('no inventa columnas que no vinieron', () => {
    expect(pick({ title: 'A' }, ['title', 'description'])).toEqual({ title: 'A' });
  });

  it('conserva null y false (son valores válidos)', () => {
    expect(pick({ description: null, evidence_photo: false }, ['description', 'evidence_photo']))
      .toEqual({ description: null, evidence_photo: false });
  });

  it('tolera entradas que no son objeto', () => {
    expect(pick(null, ['title'])).toEqual({});
    expect(pick('x', ['title'])).toEqual({});
  });

  it('ignora propiedades heredadas', () => {
    const proto = { company_id: BFM };
    const input = Object.assign(Object.create(proto), { title: 'A' });
    expect(pick(input, ['title', 'company_id'])).toEqual({ title: 'A' });
  });
});
