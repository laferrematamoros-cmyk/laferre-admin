'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSigner, saveSigner, sendTestMail, setSignerPin } from '@/app/ajustes/signer-actions';
import type { SignerInfo } from '@/lib/checklist-types';
import type { NotifyEntry } from '@/lib/notify-scope';
import { companyLabel, type CompanyOpt } from '@/components/ajustes/Usuarios';
import { IconCheck, IconX } from '@/components/panel/icons';
import s from '@/components/panel/panel.module.css';
import a from '@/components/ajustes/aj.module.css';

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Matamoros' });

/** Ajustes → Firma de listas: nombre, PIN y a qué correos llega el aviso (supabase/010),
 *  cada uno de las dos empresas o sólo de una (supabase/012). */
export default function Firma({ companies }: { companies: CompanyOpt[] }) {
  const [info, setInfo] = useState<SignerInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [emails, setEmails] = useState<NotifyEntry[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [pinMsg, setPinMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [mailMsg, setMailMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await getSigner();
    if (!r.ok) { setError(r.error); return; }
    setError(null);
    setInfo(r.signer);
    setName(r.signer.name);
    setEmails(r.signer.emails);
  }, []);
  useEffect(() => { load(); }, [load]);

  const dirty = !!info && (name.trim() !== info.name || JSON.stringify(emails) !== JSON.stringify(info.emails));

  const pendingEntry = (): NotifyEntry | null => {
    const e = newEmail.trim().toLowerCase();
    return e ? { email: e, companyId: newCompany || null } : null;
  };

  function addEmail() {
    const p = pendingEntry();
    if (!p) return;
    if (!emails.some(x => x.email === p.email)) setEmails([...emails, p]);
    setNewEmail('');
  }

  const setCompanyOf = (email: string, companyId: string) =>
    setEmails(emails.map(x => (x.email === email ? { ...x, companyId: companyId || null } : x)));

  const coName = (id: string | null) => {
    if (!id) return 'Las dos empresas';
    const c = companies.find(x => x.id === id);
    return c ? companyLabel(c) : 'Otra empresa';
  };

  async function save() {
    setMsg(null);
    setBusy('save');
    const p = pendingEntry();
    const pending = p && !emails.some(x => x.email === p.email) ? [...emails, p] : emails;
    const r = await saveSigner(name, pending);
    setBusy(null);
    if (!r.ok) { setMsg({ ok: false, text: r.error }); return; }
    setNewEmail('');
    await load();
    setMsg({ ok: true, text: 'Guardado.' });
  }

  async function savePin() {
    setPinMsg(null);
    setBusy('pin');
    const r = await setSignerPin(pin, pin2);
    setBusy(null);
    if (!r.ok) { setPinMsg({ ok: false, text: r.error }); return; }
    setPin(''); setPin2(''); setPinOpen(false);
    await load();
    setPinMsg({ ok: true, text: 'PIN guardado. Ya puedes firmar en el teléfono de quien terminó la lista.' });
  }

  async function test() {
    setMailMsg(null);
    setBusy('mail');
    const r = await sendTestMail();
    setBusy(null);
    setMailMsg(r.ok ? { ok: true, text: 'Listo: revisa tu correo (y la carpeta de spam la primera vez).' } : { ok: false, text: r.error });
  }

  const pinState = !info ? null
    : info.pinDisabled ? { cls: a.chipMiss, text: 'Apagada por PIN equivocado: crea uno nuevo' }
    : info.lockedUntil ? { cls: a.chipLate, text: `Bloqueada hasta las ${hhmm(info.lockedUntil)}` }
    : info.hasPin ? { cls: a.chipOk, text: 'PIN creado' }
    : { cls: a.chipMiss, text: 'Sin PIN' };
  const ro = !info?.canEdit;

  return (
    <section className={a.block}>
      <div className={a.secHead}>
        <div>
          <p className={a.secLbl}>Firma de listas</p>
          <p className={a.secHint}>
            Cuando alguien termina una lista (como LIMPIEZA) te llega un correo para firmarla en el panel,
            o la firmas en su teléfono con tu PIN. Es lo mismo para La Ferre y BFM.
          </p>
        </div>
      </div>

      {error && <div className={s.error}>{error}</div>}
      {!info && !error && <p className={s.loading}>Cargando…</p>}

      {info && (
        <div className={`${s.card} ${a.card}`}>
          <div className={a.field}>
            <label className={a.label} htmlFor="sg-name">Nombre con que firmas</label>
            <input id="sg-name" className={a.input} value={name} maxLength={60} disabled={ro} onChange={e => setName(e.target.value)} placeholder="Ej. Ing. José Soto" />
          </div>

          <div className={a.field}>
            <span className={a.label}>A qué correos llega el aviso</span>
            {emails.length === 0 && <p className={a.hint}>Todavía ninguno.</p>}
            {emails.length > 0 && (
              <div className={a.mailList}>
                {emails.map(e => (
                  <div key={e.email} className={`${a.mailRow} ${ro ? a.ro : ''}`}>
                    <span className={a.mailAddr}>{e.email}</span>
                    {!ro && info.scopeReady ? (
                      <select className={`${a.input} ${a.mailCo}`} value={e.companyId ?? ''} aria-label={`Avisos de qué empresa le llegan a ${e.email}`}
                        onChange={ev => setCompanyOf(e.email, ev.target.value)}>
                        <option value="">Las dos empresas</option>
                        {companies.map(c => <option key={c.id} value={c.id}>Sólo {companyLabel(c)}</option>)}
                      </select>
                    ) : (
                      <span className={`${a.chip} ${a.mailCo}`}>{coName(e.companyId)}</span>
                    )}
                    {!ro && (
                      <button type="button" className={a.mailX} aria-label={`Quitar ${e.email}`} onClick={() => setEmails(emails.filter(x => x.email !== e.email))}>
                        <IconX size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!ro && (
              <div className={info.scopeReady ? a.mailAdd : a.pwRow}>
                <input className={a.input} type="email" inputMode="email" value={newEmail} placeholder="correo@gmail.com" aria-label="Agregar correo"
                  onChange={e => setNewEmail(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addEmail(); }} />
                {info.scopeReady && (
                  <select className={a.input} value={newCompany} aria-label="De qué empresa le llegan los avisos" onChange={e => setNewCompany(e.target.value)}>
                    <option value="">Las dos empresas</option>
                    {companies.map(c => <option key={c.id} value={c.id}>Sólo {companyLabel(c)}</option>)}
                  </select>
                )}
                <button type="button" className={a.btn} onClick={addEmail} disabled={!newEmail.trim()}>Agregar</button>
              </div>
            )}
            <p className={a.hint}>
              {info.scopeReady
                ? 'A cada correo le llegan sólo los avisos de su empresa. "Las dos empresas" recibe todos, y también el aviso si el PIN se bloquea.'
                : 'Para escoger de qué empresa le llegan los avisos a cada correo falta correr el SQL 012 en Supabase. Mientras, a todos les llegan los de las dos.'}
            </p>
          </div>

          {!ro && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              <button type="button" className={`${a.btn} ${a.dark}`} onClick={save} disabled={(!dirty && !newEmail.trim()) || busy === 'save'}>
                {busy === 'save' ? 'Guardando…' : 'Guardar'}
              </button>
              {msg && (msg.ok ? <span className={a.saved}><IconCheck size={13} />{msg.text}</span> : <p className={a.err}>{msg.text}</p>)}
            </div>
          )}

          <div className={a.field}>
            <span className={a.label}>PIN para firmar en el teléfono</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              {pinState && <span className={`${a.chip} ${pinState.cls}`}>{pinState.text}</span>}
              {!ro && !pinOpen && (
                <button type="button" className={a.btn} onClick={() => { setPinOpen(true); setPinMsg(null); }}>
                  {info.hasPin ? 'Cambiar PIN' : 'Crear PIN'}
                </button>
              )}
            </div>
            {pinOpen && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input className={a.input} type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin}
                    placeholder="PIN (4 a 6 números)" aria-label="PIN nuevo" onChange={e => setPin(e.target.value.replace(/\D/g, ''))} />
                  <input className={a.input} type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin2}
                    placeholder="Repítelo" aria-label="Repite el PIN" onChange={e => setPin2(e.target.value.replace(/\D/g, ''))} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button type="button" className={a.btn} onClick={() => { setPinOpen(false); setPin(''); setPin2(''); setPinMsg(null); }}>Cancelar</button>
                  <button type="button" className={`${a.btn} ${a.dark}`} onClick={savePin} disabled={pin.length < 4 || busy === 'pin'}>
                    {busy === 'pin' ? 'Guardando…' : 'Guardar PIN'}
                  </button>
                </div>
              </>
            )}
            {pinMsg && (pinMsg.ok ? <span className={a.saved}><IconCheck size={13} />{pinMsg.text}</span> : <p className={a.err}>{pinMsg.text}</p>)}
            <p className={a.hint}>
              Nadie lo puede ver, ni en la base. Tras 5 equivocados se bloquea 15 minutos, luego 30, y al tercer bloqueo
              se apaga hasta que crees uno nuevo. Siempre puedes firmar desde el panel.
            </p>
          </div>

          <div className={a.field}>
            <span className={a.label}>Correo</span>
            {!info.mailReady && (
              <p className={a.err}>
                Falta poner en Vercel la contraseña de aplicación del Gmail que manda los avisos (CORREO_USUARIO y CORREO_CLAVE).
                Mientras, no sale ningún correo.
              </p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              <button type="button" className={a.btn} onClick={test} disabled={!info.mailReady || info.emails.length === 0 || busy === 'mail'}>
                {busy === 'mail' ? 'Mandando…' : 'Mandar correo de prueba'}
              </button>
              {mailMsg && (mailMsg.ok ? <span className={a.saved}><IconCheck size={13} />{mailMsg.text}</span> : <p className={a.err}>{mailMsg.text}</p>)}
            </div>
          </div>
          {ro && <p className={a.hint}>Sólo un administrador que ve las dos empresas puede cambiar esto.</p>}
        </div>
      )}
    </section>
  );
}
