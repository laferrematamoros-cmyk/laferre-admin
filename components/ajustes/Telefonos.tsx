'use client';

import { useEffect, useState } from 'react';
import { listDevices } from '@/app/ajustes/devices-actions';
import { phoneStates, isStale, summarizePhones, type DeviceRow, type PhoneState } from '@/lib/devices';
import { initials } from '@/components/ajustes/Usuarios';
import s from '@/components/panel/panel.module.css';
import a from '@/components/ajustes/aj.module.css';

const TZ = 'America/Matamoros';

const STATE: Record<PhoneState, { label: string; cls: string; hint: string }> = {
  current: { label: 'Al día', cls: a.chipOk, hint: '' },
  behind: { label: 'Le falta abrir la app', cls: a.chipLate, hint: 'Ya hay una versión nueva: se baja sola cuando abran la app.' },
  old: { label: 'App vieja', cls: a.chipMiss, hint: 'Hay que instalarle la APK nueva.' },
  unknown: { label: 'Sin dato', cls: '', hint: '' },
};

const day = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: TZ });

function versionText(r: DeviceRow): string {
  if (!r.appVersion) return 'Versión de antes de la 1.1.0';
  return r.updateAt ? `Versión ${r.appVersion} · actualizada el ${day(r.updateAt)}` : `Versión ${r.appVersion} · como se instaló`;
}

function lastSeenText(iso: string | null, now: Date): string {
  if (!iso) return 'Nunca se ha abierto';
  const shop = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ });
  const at = new Date(iso);
  const days = Math.round((Date.parse(shop(now)) - Date.parse(shop(at))) / 86_400_000);
  const time = at.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', timeZone: TZ });
  if (days <= 0) return `Abrió la app hoy a las ${time}`;
  if (days === 1) return `Abrió la app ayer a las ${time}`;
  if (days < 21) return `Abrió la app hace ${days} días`;
  return `No abre la app desde el ${day(iso)}`;
}

/** Ajustes → qué versión de la app trae cada teléfono. */
export default function Telefonos() {
  const [data, setData] = useState<{ versionsKnown: boolean; rows: DeviceRow[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDevices()
      .then(r => (r.ok ? setData({ versionsKnown: r.versionsKnown, rows: r.rows }) : setError(r.error)))
      .catch(() => setError('No se pudo leer la lista de teléfonos.'));
  }, []);

  const now = new Date();
  const rows = data?.rows ?? [];
  const states = phoneStates(rows, data?.versionsKnown ?? false);
  const sum = summarizePhones(rows, states, now);
  const ordered = [...rows].sort((x, y) => Number(isStale(x.lastSeen, now)) - Number(isStale(y.lastSeen, now)));

  return (
    <section className={a.block}>
      <div className={a.secHead}>
        <div>
          <p className={a.secLbl}>
            Teléfonos con la app{data ? ` (${sum.active})` : ''}
          </p>
          <p className={a.secHint}>
            Cada teléfono se reporta al abrir la app.
            {data?.versionsKnown && sum.active > 0 && ` ${sum.current} de ${sum.active} están al día.`}
            {sum.stale > 0 && ` Abajo, en gris, ${sum.stale === 1 ? 'uno que no se abre' : `${sum.stale} que no se abren`} hace más de 3 semanas.`}
          </p>
        </div>
      </div>

      {error && <div className={s.error}>{error}</div>}
      {!data && !error && <p className={s.loading}>Cargando teléfonos…</p>}
      {data && !data.versionsKnown && (
        <div className={`${s.card} ${a.empty}`}>
          <p>Para ver la versión de cada teléfono falta correr en Supabase el archivo <b>supabase/008_telefonos.sql</b>.</p>
        </div>
      )}
      {data && rows.length === 0 && (
        <div className={`${s.card} ${a.empty}`}><p>Todavía no hay teléfonos registrados.</p></div>
      )}

      {rows.length > 0 && (
        <div className={a.grid}>
          {ordered.map(r => {
            const st = STATE[states.get(r.key) ?? 'unknown'];
            const stale = isStale(r.lastSeen, now);
            return (
              <article key={r.key} className={`${s.card} ${a.card} ${stale ? a.stale : ''}`}>
                <div className={a.who}>
                  <span className={`${a.av} ${a.avAdmin}`}>{r.employeeName ? initials(r.employeeName) : '—'}</span>
                  <div className={a.name}>
                    <b>{r.employeeName ?? 'Sin persona registrada'}</b>
                    <span>{r.companyName ?? 'Sin empresa'} · teléfono …{r.key}</span>
                  </div>
                </div>
                <div className={a.facts}>
                  {data?.versionsKnown && <span className={`${a.chip} ${st.cls}`}>{st.label}</span>}
                  {data?.versionsKnown && <span className={a.chip}>{versionText(r)}</span>}
                </div>
                <p className={a.hint}>
                  {lastSeenText(r.lastSeen, now)}.{st.hint && !stale ? ` ${st.hint}` : ''}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
