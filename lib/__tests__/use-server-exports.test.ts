import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// En un archivo 'use server', `export type { X }` o `export { X }` pasan la compilación
// y funcionan en `next dev --webpack`, pero en producción (Turbopack) el archivo truena
// al cargar con "ReferenceError: X is not defined" y fallan TODAS sus acciones.
// Así se cayó guardar en Actividades, Equipo, Urgente, Conoce y Ajustes (2026-10-30).

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

const useServer = sourceFiles(join(process.cwd(), 'app'))
  .filter(f => /^\s*['"]use server['"]/.test(readFileSync(f, 'utf8')));

describe("archivos 'use server'", () => {
  it('se encuentran', () => {
    expect(useServer.length).toBeGreaterThanOrEqual(6);
  });

  it.each(useServer)('%s no reexporta con llaves', f => {
    expect(readFileSync(f, 'utf8')).not.toMatch(/^\s*export\s+(type\s+)?\{/m);
  });
});
