'use client';

import { useActionState } from 'react';
import { login } from './actions';

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(login, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: '#F2F2F4' }}>
      <form action={formAction} className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-xl">
        <h1 className="text-[20px] font-extrabold tracking-tight">Panel · La Ferre</h1>
        <p className="mt-1 mb-5 text-[13px]" style={{ color: '#6E6E73' }}>Acceso para gerentes</p>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px]" style={{ color: '#6E6E73' }}>
          Contraseña
        </label>
        <input
          name="password"
          type="password"
          autoFocus
          required
          className="w-full rounded-[9px] border px-3 py-2 text-[14px] outline-none"
          style={{ borderColor: '#E4E4E7' }}
        />
        {error && <p className="mt-2 text-[12px]" style={{ color: '#E11D2E' }}>{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="mt-4 w-full rounded-[9px] py-[10px] text-[13px] font-semibold text-white"
          style={{ background: 'var(--accent, #E11D2E)', opacity: pending ? 0.6 : 1 }}
        >
          {pending ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
