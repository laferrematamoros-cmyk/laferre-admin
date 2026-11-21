import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// El `matcher` de middleware.ts decide qué rutas piden sesión del panel. Next exige que sea
// una constante escrita en el archivo, así que se lee del texto y se convierte a expresión
// regular con la misma función que usa Next al compilar (si Next la mueve, esta prueba avisa).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getMiddlewareMatchers } = require('next/dist/build/analysis/get-page-static-info') as {
  getMiddlewareMatchers: (matchers: string[], nextConfig: object) => { regexp: string }[];
};

const src = readFileSync(join(process.cwd(), 'middleware.ts'), 'utf8');
const literal = src.match(/matcher:\s*\[\s*'((?:[^'\\]|\\.)*)'\s*\]/)?.[1];
const matcher = literal === undefined ? '' : JSON.parse(`"${literal.replace(/"/g, '\\"')}"`) as string;
const re = new RegExp(getMiddlewareMatchers([matcher], {})[0].regexp);
const protegida = (path: string) => re.test(path);

describe('middleware: rutas protegidas', () => {
  it('lee el matcher', () => {
    expect(matcher).toMatch(/^\/\(\(\?!login\|api\|ver-capacitacion\//);
  });

  it('la capacitación que abre el teléfono no pide sesión del panel', () => {
    expect(protegida('/ver-capacitacion/fregadero')).toBe(false);
    expect(protegida('/ver-capacitacion/impermeabilizar')).toBe(false);
  });

  it('las páginas del admin y de la practicante siguen protegidas', () => {
    for (const p of ['/capacitaciones', '/capacitaciones/ver/fregadero', '/mis-capacitaciones', '/mis-capacitaciones/fregadero', '/dashboard', '/ajustes']) {
      expect([p, protegida(p)]).toEqual([p, true]);
    }
  });

  it('la entrada y la API siguen abiertas', () => {
    expect(protegida('/login')).toBe(false);
    expect(protegida('/api/me')).toBe(false);
  });
});
