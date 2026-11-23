import { lockRecipients, parseNotify, recipientsFor, toStorage } from '../notify-scope';

const LF = 'a6798a18-9565-4f2b-929a-0c6771e7ef54';
const BFM = '22604654-8a66-4a30-9a20-ab48d7a9c794';

describe('parseNotify', () => {
  it('sin empresa apuntada, el correo es de las dos', () => {
    expect(parseNotify(['jose@x.com'], {})).toEqual([{ email: 'jose@x.com', companyId: null }]);
  });

  it('lee la empresa de cada correo', () => {
    expect(parseNotify(['jose@x.com', 'juan@x.com'], { 'juan@x.com': BFM })).toEqual([
      { email: 'jose@x.com', companyId: null },
      { email: 'juan@x.com', companyId: BFM },
    ]);
  });

  it('aguanta datos raros: sin columna, nulos o no-texto', () => {
    expect(parseNotify(['a@x.com'], undefined)).toEqual([{ email: 'a@x.com', companyId: null }]);
    expect(parseNotify(null, null)).toEqual([]);
    expect(parseNotify(['a@x.com', 7, ''], { 'a@x.com': 5 })).toEqual([{ email: 'a@x.com', companyId: null }]);
  });
});

describe('recipientsFor', () => {
  const list = [
    { email: 'jose@x.com', companyId: null },
    { email: 'juan@x.com', companyId: BFM },
    { email: 'laura@x.com', companyId: LF },
  ];

  it('una lista de La Ferre: los de las dos y los de La Ferre', () => {
    expect(recipientsFor(list, LF)).toEqual(['jose@x.com', 'laura@x.com']);
  });

  it('una lista de BFM: los de las dos y los de BFM', () => {
    expect(recipientsFor(list, BFM)).toEqual(['jose@x.com', 'juan@x.com']);
  });

  it('si nadie es de esa empresa, no hay a quién', () => {
    expect(recipientsFor([{ email: 'laura@x.com', companyId: LF }], BFM)).toEqual([]);
  });
});

describe('lockRecipients', () => {
  it('el PIN es de las dos empresas: avisa a los de las dos', () => {
    expect(lockRecipients([
      { email: 'jose@x.com', companyId: null },
      { email: 'juan@x.com', companyId: BFM },
    ])).toEqual(['jose@x.com']);
  });

  it('si ninguno es de las dos, avisa a todos (alguien tiene que saber)', () => {
    expect(lockRecipients([
      { email: 'juan@x.com', companyId: BFM },
      { email: 'laura@x.com', companyId: LF },
    ])).toEqual(['juan@x.com', 'laura@x.com']);
  });
});

describe('toStorage', () => {
  it('separa la lista de correos y a qué empresa es cada uno (sólo los que no son de las dos)', () => {
    expect(toStorage([
      { email: 'jose@x.com', companyId: null },
      { email: 'juan@x.com', companyId: BFM },
    ])).toEqual({ emails: ['jose@x.com', 'juan@x.com'], scope: { 'juan@x.com': BFM } });
  });
});
