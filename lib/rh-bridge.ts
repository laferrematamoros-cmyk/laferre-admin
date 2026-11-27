// Puente con la app de RH (bfm-rrhh). Diseño: docs/superpowers/specs/2026-11-26-puente-rh-design.md
// RH NUNCA habla directo con esta base: su servidor llama a /api/rh/* con la contraseña PUENTE_RH_SECRETO
// (en Vercel, en los dos proyectos; nunca en un navegador). Puro.
import { createHash, timingSafeEqual } from 'node:crypto';
import { cleanFullName } from './full-name';

/** ¿Trae la contraseña del puente? Sin contraseña configurada (o de menos de 32 caracteres), nadie pasa. */
export function bridgeAuthorized(header: string | null | undefined, secret: string | undefined): boolean {
  const s = (secret ?? '').trim();
  if (s.length < 32 || !header) return false;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!m) return false;
  // Se comparan los resúmenes (mismo largo) para que el tiempo no delate cuántas letras coinciden.
  const a = createHash('sha256').update(m[1].trim()).digest();
  const b = createHash('sha256').update(s).digest();
  return timingSafeEqual(a, b);
}

/** `origen`: quién escribió el nombre completo. 'app' = el empleado en su teléfono (sin contraseña por persona: tomarlo con cuidado); 'panel' = el encargado. */
export interface PersonaRH { id: string; nombre: string; nombreCompleto: string | null; origen: 'app' | 'panel' | null; empresa: string; activo: boolean }

/** Lo que RH necesita para vincular: nada más (sin teléfonos, sin fotos). Activos primero, luego por nombre. */
export function buildPersonas(
  employees: { id: string; name: string; company_id: string | null; is_active: boolean }[],
  companies: { id: string; name: string }[],
  identities: { employee_id: string; full_name: string; updated_by?: string | null }[],
): PersonaRH[] {
  const company = new Map(companies.map(c => [c.id, c.name]));
  const full = new Map(identities.map(i => [i.employee_id, i]));
  return employees
    .map(e => ({
      id: e.id, nombre: (e.name ?? '').trim().toLocaleUpperCase('es-MX'), nombreCompleto: full.get(e.id)?.full_name ?? null,
      origen: (full.get(e.id) ? (full.get(e.id)!.updated_by === 'app' ? 'app' : 'panel') : null) as PersonaRH['origen'],
      empresa: (e.company_id && company.get(e.company_id)) || 'Sin empresa', activo: !!e.is_active,
    }))
    .sort((x, y) => Number(y.activo) - Number(x.activo) || x.nombre.localeCompare(y.nombre, 'es'));
}

export interface NombreDeRH { persona: string; nombre: string }
export type ResultadoNombre =
  | { persona: string; estado: 'actualizado' | 'igual'; nombreCompleto: string; empresa: string }
  | { persona: string; estado: 'rechazado'; motivo: string; empresa?: string };

/**
 * Nombres completos que manda RH (los lee de la ficha en SU servidor, nunca del navegador). El de RH manda:
 * reemplaza el que el empleado escribió en su teléfono. Devuelve qué guardar y, por persona, en qué tienda está.
 */
export function planNombres(
  input: NombreDeRH[],
  employees: { id: string; company_id: string | null }[],
  companies: { id: string; name: string }[],
  identities: { employee_id: string; full_name: string }[],
): { upserts: { employee_id: string; full_name: string }[]; resultados: ResultadoNombre[] } {
  const emp = new Map(employees.map(e => [e.id, e]));
  const company = new Map(companies.map(c => [c.id, c.name]));
  const actual = new Map(identities.map(i => [i.employee_id, i.full_name]));
  const vistos = new Set<string>();
  const upserts: { employee_id: string; full_name: string }[] = [];
  const resultados: ResultadoNombre[] = [];
  for (const { persona, nombre } of input) {
    if (vistos.has(persona)) continue;
    vistos.add(persona);
    const e = emp.get(persona);
    if (!e) { resultados.push({ persona, estado: 'rechazado', motivo: 'No existe en Actividades.' }); continue; }
    const empresa = (e.company_id && company.get(e.company_id)) || 'Sin empresa';
    const c = cleanFullName(nombre);
    if (!c.ok) { resultados.push({ persona, estado: 'rechazado', motivo: c.error, empresa }); continue; }
    if (actual.get(persona) === c.name) { resultados.push({ persona, estado: 'igual', nombreCompleto: c.name, empresa }); continue; }
    upserts.push({ employee_id: persona, full_name: c.name });
    resultados.push({ persona, estado: 'actualizado', nombreCompleto: c.name, empresa });
  }
  return { upserts, resultados };
}
