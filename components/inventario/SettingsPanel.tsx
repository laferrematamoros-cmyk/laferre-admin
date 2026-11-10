'use client';

import { useEffect, useState } from 'react';
import type { InvLetter, InvPlan, InvRoundSummary } from '@/lib/inventory-types';
import { dayLabel, monthLabel, nextOpening } from '@/lib/inventory-schedule';
import { shopClock } from '@/lib/my-day';
import {
  saveInventoryPlan, addInventoryLetter, updateInventoryLetter, moveInventoryLetter,
  setInventoryLetterActive, deleteInventoryLetter, openInventoryRoundNow,
} from '@/app/inventario/actions';
import s from '@/components/panel/panel.module.css';
import c from '@/components/conoce/co.module.css';
import v from './inv.module.css';

type Result = { ok: true } | { ok: false; error: string };
const ABC = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');

/** Frecuencia, plazo, letras de la tienda y "Abrir inventario ahora". Sólo administradores. */
export default function SettingsPanel({ companyId, plan, letters, rounds, hasOpen, onChanged }: {
  companyId: string;
  plan: InvPlan | null;
  letters: InvLetter[];
  rounds: InvRoundSummary[];
  hasOpen: boolean;
  onChanged: () => Promise<void>;
}) {
  const today = shopClock(new Date()).dateStr;
  const [every, setEvery] = useState(String(plan?.every_weeks ?? 6));
  const [first, setFirst] = useState(plan?.first_open_date ?? today);
  const [amount, setAmount] = useState(String(plan?.due_amount ?? 1));
  const [unit, setUnit] = useState<'days' | 'weeks'>(plan?.due_unit ?? 'weeks');
  const [active, setActive] = useState(plan?.is_active ?? true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [upTo, setUpTo] = useState('N');
  const [editId, setEditId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    setEvery(String(plan?.every_weeks ?? 6));
    setFirst(plan?.first_open_date ?? today);
    setAmount(String(plan?.due_amount ?? 1));
    setUnit(plan?.due_unit ?? 'weeks');
    setActive(plan?.is_active ?? true);
  }, [plan, today]);

  async function run(key: string, fn: () => Promise<Result>, okText?: string) {
    setBusy(key);
    setMsg(null);
    const r = await fn();
    await onChanged();
    setBusy(null);
    setMsg(r.ok ? (okText ? { ok: true, text: okText } : null) : { ok: false, text: r.error });
    return r.ok;
  }

  const opened = rounds.map(r => r.scheduled_for).filter((d): d is string => !!d);
  const next = plan ? nextOpening(plan, today, opened) : null;
  const activeLetters = letters.filter(l => l.is_active).length;

  async function addRange() {
    const end = ABC.indexOf(upTo);
    const have = new Set(letters.map(l => l.code));
    const todo = ABC.slice(0, end + 1).filter(x => !have.has(x));
    await run('range', async () => {
      for (const code of todo) {
        const r = await addInventoryLetter(companyId, code, '');
        if (!r.ok) return r;
      }
      return { ok: true };
    }, todo.length ? `Se agregaron ${todo.length} letras.` : 'Ya estaban todas.');
  }

  return (
    <div className={v.block}>
      {msg && <div className={msg.ok ? v.next : s.error} role={msg.ok ? 'status' : 'alert'}>{msg.text}</div>}

      <section className={`${s.card} ${v.block}`}>
        <div className={v.headRow}><h2>Cada cuándo</h2></div>
        <div className={v.planGrid}>
          <div className={c.field}>
            <label className={c.label} htmlFor="inv-every">Cada cuántas semanas</label>
            <input id="inv-every" className={c.input} type="number" min={1} max={52} value={every} onChange={e => setEvery(e.target.value)} />
            <p className={c.hint}>4 = cada mes · 6 = mes y medio · 8 = dos meses.</p>
          </div>
          <div className={c.field}>
            <label className={c.label} htmlFor="inv-first">Primer inventario</label>
            <input id="inv-first" className={c.input} type="date" value={first} onChange={e => setFirst(e.target.value)} />
            <p className={c.hint}>Abre ese día a las 8:00 de la mañana.</p>
          </div>
          <div className={c.field}>
            <label className={c.label} htmlFor="inv-amount">Plazo para terminar</label>
            <div className={v.inline}>
              <input id="inv-amount" className={c.input} type="number" min={1} max={60} value={amount} onChange={e => setAmount(e.target.value)} />
              <select className={c.input} value={unit} onChange={e => setUnit(e.target.value as 'days' | 'weeks')} aria-label="Unidad del plazo">
                <option value="days">días</option>
                <option value="weeks">semanas</option>
              </select>
            </div>
          </div>
        </div>
        <label className={v.switch}>
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
          Abrir los inventarios solos {active ? '(encendido)' : '(en pausa)'}
        </label>
        {plan && next && active && (
          <div className={v.next}>Próximo inventario: {dayLabel(next)} de {monthLabel(next)}{next === today ? ' (hoy)' : ''}.</div>
        )}
        <div>
          <button type="button" className={`${c.btn} ${c.dark}`} disabled={busy !== null}
            onClick={() => run('plan', () => saveInventoryPlan(companyId, {
              every_weeks: Number(every), first_open_date: first, due_amount: Number(amount), due_unit: unit, is_active: active,
            }), 'Guardado.')}>
            {busy === 'plan' ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </section>

      <section className={`${s.card} ${v.block}`}>
        <div className={v.headRow}>
          <h2>Letras de la tienda ({activeLetters} activas)</h2>
        </div>
        <p className={v.small}>Cada letra es un estante. El nombre ayuda a reconocerlo en el reporte (ej.: “Tornillería”). Los cambios cuentan desde el siguiente inventario.</p>

        {letters.length > 0 && (
          <div className={v.letterRows}>
            {letters.map((l, i) => (
              <div key={l.id} className={`${v.lrow} ${l.is_active ? '' : v.offRow}`}>
                {editId === l.id ? (
                  <>
                    <input className={c.input} value={editCode} maxLength={6} onChange={e => setEditCode(e.target.value)} aria-label="Letra" />
                    <input className={c.input} value={editName} maxLength={60} onChange={e => setEditName(e.target.value)} aria-label="Nombre" placeholder="Nombre (opcional)" />
                    <div className={v.lbtns}>
                      <button type="button" className={v.mini} disabled={busy !== null}
                        onClick={async () => { if (await run(`e${l.id}`, () => updateInventoryLetter(l.id, editCode, editName))) setEditId(null); }}>Guardar</button>
                      <button type="button" className={v.mini} onClick={() => setEditId(null)}>Cancelar</button>
                    </div>
                  </>
                ) : (
                  <>
                    <b className={v.code} style={{ fontSize: 20 }}>{l.code}</b>
                    <span className={v.lname}>{l.name || 'Sin nombre'}{l.is_active ? '' : ' · apagada'}</span>
                    <div className={v.lbtns}>
                      <button type="button" className={v.mini} disabled={i === 0 || busy !== null} aria-label={`Subir ${l.code}`}
                        onClick={() => run(`u${l.id}`, () => moveInventoryLetter(l.id, -1))}>↑</button>
                      <button type="button" className={v.mini} disabled={i === letters.length - 1 || busy !== null} aria-label={`Bajar ${l.code}`}
                        onClick={() => run(`d${l.id}`, () => moveInventoryLetter(l.id, 1))}>↓</button>
                      <button type="button" className={v.mini} onClick={() => { setEditId(l.id); setEditCode(l.code); setEditName(l.name ?? ''); }}>Editar</button>
                      <button type="button" className={v.mini} disabled={busy !== null}
                        onClick={() => run(`a${l.id}`, () => setInventoryLetterActive(l.id, !l.is_active))}>{l.is_active ? 'Apagar' : 'Prender'}</button>
                      {confirmDel === l.id ? (
                        <>
                          <button type="button" className={`${v.mini} ${c.danger}`} disabled={busy !== null}
                            onClick={async () => { await run(`x${l.id}`, () => deleteInventoryLetter(l.id)); setConfirmDel(null); }}>Sí, borrar</button>
                          <button type="button" className={v.mini} onClick={() => setConfirmDel(null)}>No</button>
                        </>
                      ) : (
                        <button type="button" className={`${v.mini} ${c.danger}`} onClick={() => setConfirmDel(l.id)}>Borrar</button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <div className={v.lrow}>
          <input className={c.input} value={newCode} maxLength={6} onChange={e => setNewCode(e.target.value)} placeholder="Letra" aria-label="Letra nueva" />
          <input className={c.input} value={newName} maxLength={60} onChange={e => setNewName(e.target.value)} placeholder="Nombre (opcional)" aria-label="Nombre de la letra nueva" />
          <div className={v.lbtns}>
            <button type="button" className={`${c.btn} ${c.dark}`} disabled={!newCode.trim() || busy !== null}
              onClick={async () => { if (await run('add', () => addInventoryLetter(companyId, newCode, newName))) { setNewCode(''); setNewName(''); } }}>
              Agregar
            </button>
          </div>
        </div>
        <div className={v.inline} style={{ gridTemplateColumns: 'auto 90px auto', alignItems: 'center', justifyContent: 'start' }}>
          <span className={v.small}>Agregar de un jalón de la A a la</span>
          <select className={c.input} value={upTo} onChange={e => setUpTo(e.target.value)} aria-label="Última letra">
            {ABC.map(x => <option key={x} value={x}>{x}</option>)}
          </select>
          <button type="button" className={c.btn} disabled={busy !== null} onClick={addRange}>{busy === 'range' ? 'Agregando…' : 'Agregar'}</button>
        </div>
      </section>

      <section className={`${s.card} ${v.block}`}>
        <div className={v.headRow}><h2>Inventario extra</h2></div>
        <p className={v.small}>Abre uno ahora, fuera del calendario. No mueve las fechas programadas.</p>
        {hasOpen ? (
          <p className={c.hint}>Ya hay un inventario abierto.</p>
        ) : confirmOpen ? (
          <div className={c.confirm}>
            <span>Se abre ahora con <b>{activeLetters} letras</b> y los teléfonos reciben el aviso. ¿Lo abro?</span>
            <div className={c.confirmBtns}>
              <button type="button" className={c.btn} onClick={() => setConfirmOpen(false)}>No</button>
              <button type="button" className={`${c.btn} ${c.dark}`} disabled={busy !== null}
                onClick={async () => { await run('open', () => openInventoryRoundNow(companyId), 'Inventario abierto.'); setConfirmOpen(false); }}>
                {busy === 'open' ? 'Abriendo…' : 'Sí, abrir'}
              </button>
            </div>
          </div>
        ) : (
          <div><button type="button" className={c.btn} disabled={!plan || activeLetters === 0} onClick={() => setConfirmOpen(true)}>Abrir inventario ahora</button></div>
        )}
        {(!plan || activeLetters === 0) && !hasOpen && (
          <p className={c.hint}>Primero guarda la frecuencia y da de alta las letras.</p>
        )}
      </section>
    </div>
  );
}
