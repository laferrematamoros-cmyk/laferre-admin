// Nombre completo del empleado (SQL 015, tabla employee_identity). Puro.
// Mismas reglas que set_my_full_name en la base y que la copia del teléfono (laferre-actividades/lib/fullName.ts).

export type FullNameResult = { ok: true; name: string } | { ok: false; error: string };

export function cleanFullName(raw: string): FullNameResult {
  const n = (raw ?? '').trim().replace(/\s+/g, ' ');
  if (n.length < 5 || !/\S+ \S+/.test(n)) return { ok: false, error: 'Escribe nombre y apellidos.' };
  if (n.length > 120) return { ok: false, error: 'El nombre es demasiado largo.' };
  return { ok: true, name: n.toLocaleUpperCase('es-MX') };
}
