// Teléfonos con la app de actividades: qué versión trae cada uno (reglas puras, con pruebas).

export interface DeviceRow {
  /** Final del token, para distinguir teléfonos sin enseñar el token completo. */
  key: string;
  companyId: string | null;
  companyName: string | null;
  employeeName: string | null;
  appVersion: string | null;
  updateId: string | null;
  updateAt: string | null;
  lastSeen: string | null;
}

/**
 * current = al día con los demás teléfonos de su empresa · behind = misma app, le falta
 * abrirla para bajar la actualización · old = app vieja, hay que instalar la APK nueva ·
 * unknown = la base todavía no guarda versiones (falta el SQL 008).
 */
export type PhoneState = 'current' | 'behind' | 'old' | 'unknown';

/** Más de esto sin abrir la app: probablemente ya no se usa ese teléfono. */
export const STALE_DAYS = 21;

export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

const ms = (iso: string | null) => (iso ? new Date(iso).getTime() || 0 : 0);

export function phoneStates(rows: DeviceRow[], versionsKnown: boolean): Map<string, PhoneState> {
  const out = new Map<string, PhoneState>();
  if (!versionsKnown) { for (const r of rows) out.set(r.key, 'unknown'); return out; }

  const byCompany = new Map<string, DeviceRow[]>();
  for (const r of rows) {
    const k = r.companyId ?? '—';
    byCompany.set(k, [...(byCompany.get(k) ?? []), r]);
  }
  for (const list of byCompany.values()) {
    const versions = list.map(r => r.appVersion).filter((v): v is string => !!v);
    const top = versions.reduce<string | null>((m, v) => (!m || compareVersions(v, m) > 0 ? v : m), null);
    const newest = Math.max(0, ...list.filter(r => r.appVersion && top && compareVersions(r.appVersion, top) === 0).map(r => ms(r.updateAt)));
    for (const r of list) {
      if (!r.appVersion || !top || compareVersions(r.appVersion, top) < 0) out.set(r.key, 'old');
      else if (ms(r.updateAt) < newest) out.set(r.key, 'behind');
      else out.set(r.key, 'current');
    }
  }
  return out;
}

export function isStale(lastSeen: string | null, now: Date = new Date()): boolean {
  if (!lastSeen) return true;
  return now.getTime() - ms(lastSeen) > STALE_DAYS * 86_400_000;
}

/** Para el renglón de arriba: "4 de 6 teléfonos al día" (sin contar los que ya no se abren). */
export function summarizePhones(rows: DeviceRow[], states: Map<string, PhoneState>, now: Date = new Date()) {
  const active = rows.filter(r => !isStale(r.lastSeen, now));
  return {
    active: active.length,
    current: active.filter(r => states.get(r.key) === 'current').length,
    stale: rows.length - active.length,
  };
}
