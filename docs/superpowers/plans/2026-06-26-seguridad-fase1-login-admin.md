# Seguridad Fase 1 — Login de admin + escrituras al servidor (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poner un login real (contraseña compartida) en el panel laferre-admin y mover TODAS las escrituras del navegador a server actions que usan `service_role`, para que la `anon` key deje de poder escribir desde el admin.

**Architecture:** Cookie de sesión httpOnly firmada (JWT HS256 con `jose`). Un `middleware.ts` (edge) protege todas las páginas; `/login` y `/api` quedan fuera. Cada mutación del panel pasa de `supabase.from(...)` (anon, en el cliente) a una **server action** (`'use server'`) que verifica la sesión y ejecuta con `supabaseAdmin()` (`service_role`). Las lecturas del panel se quedan en el cliente anon (siguen abiertas).

**Tech Stack:** Next.js 16 (App Router, React 19), `@supabase/supabase-js`, `jose` (JWT, edge-compatible), `crypto.timingSafeEqual` (Node). Tests del módulo puro de sesión con `ts-jest`.

> **Importante (todo el plan):** este repo se trabaja en `main`. Al hacer `git add`, **agrega solo los archivos exactos de cada tarea**; el repo puede tener cambios sin commitear. Nunca `git add -A`/`git add .`. Tras cada cambio de TS, correr `npx tsc --noEmit` no aplica directo (Next usa su propio build); el chequeo es `npx next build` cuando se indique, o `npm test` para el módulo puro.

---

## Estructura de archivos

**Nuevos:**
- `lib/auth-session.ts` — puro: firmar/verificar el JWT de sesión (jose). Sin imports de Next. Testeable.
- `lib/__tests__/auth-session.test.ts` — tests del módulo puro.
- `jest.config.js` — ts-jest, solo módulos puros.
- `lib/auth.ts` — server-only: nombre de cookie, leer sesión de cookies, `requireSession()`. Usa `lib/auth-session.ts` + `AUTH_SECRET`.
- `app/login/page.tsx` — formulario de login (client).
- `app/login/actions.ts` — `'use server'`: `login(formData)` y `logout()`.
- `middleware.ts` — protege páginas; excluye `/login`, `/api`, estáticos.
- `app/equipo/actions.ts`, `app/actividades/actions.ts`, `app/conoce/actions.ts`, `app/urgente/actions.ts` — `'use server'`: una función por mutación.

**Modificados:**
- `app/equipo/page.tsx`, `app/actividades/page.tsx`, `app/actividades/nueva/page.tsx`, `app/actividades/[id]/page.tsx`, `app/conoce/page.tsx`, `app/urgente/page.tsx` — llaman a las server actions en vez de `supabase.from(...).insert/update/delete`.
- `components/AdminShell.tsx` — botón "Cerrar sesión".
- `package.json` — devDeps de jest + `jose` + script `test`.
- `.env.local` / Vercel — `ADMIN_PASSWORD`, `AUTH_SECRET`.

---

## Task 1: Módulo puro de sesión (`lib/auth-session.ts`) con tests

**Files:**
- Create: `lib/auth-session.ts`
- Create: `lib/__tests__/auth-session.test.ts`
- Create: `jest.config.js`
- Modify: `package.json`

- [ ] **Step 1: Instalar dependencias**

Run:
```bash
npm install jose
npm install --save-dev jest@^29 ts-jest@^29 @types/jest@^29
```

- [ ] **Step 2: Crear `jest.config.js`**

```js
/** Solo módulos TS puros (sin Next/edge). */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/lib/__tests__/**/*.test.ts'],
};
```

- [ ] **Step 3: Agregar script `test` en `package.json`**

En `"scripts"`, agregar:
```json
"test": "jest"
```

- [ ] **Step 4: Escribir el test que falla (`lib/__tests__/auth-session.test.ts`)**

```ts
import { signSession, verifySession } from '../auth-session';

const SECRET = 'test-secret-0123456789';

describe('auth-session', () => {
  it('un token firmado se verifica y devuelve el payload', async () => {
    const token = await signSession({ role: 'admin' }, SECRET, 3600);
    const payload = await verifySession(token, SECRET);
    expect(payload?.role).toBe('admin');
  });

  it('un token con secreto distinto se rechaza (null)', async () => {
    const token = await signSession({ role: 'admin' }, SECRET, 3600);
    expect(await verifySession(token, 'otro-secreto-distinto-9999')).toBeNull();
  });

  it('un token expirado se rechaza (null)', async () => {
    const token = await signSession({ role: 'admin' }, SECRET, -1); // ya expirado
    expect(await verifySession(token, SECRET)).toBeNull();
  });

  it('basura no es un token válido (null)', async () => {
    expect(await verifySession('no.es.jwt', SECRET)).toBeNull();
  });
});
```

- [ ] **Step 5: Correr el test para verificar que falla**

Run: `npm test`
Expected: FAIL — "Cannot find module '../auth-session'".

- [ ] **Step 6: Implementar `lib/auth-session.ts`**

```ts
import { SignJWT, jwtVerify } from 'jose';

function key(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

/** Firma un JWT HS256 con expiración en `ttlSeconds` desde ahora. */
export async function signSession(
  payload: Record<string, unknown>,
  secret: string,
  ttlSeconds: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(key(secret));
}

/** Verifica un JWT; devuelve el payload o null si es inválido/expirado. */
export async function verifySession(
  token: string,
  secret: string,
): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret));
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}
```

- [ ] **Step 7: Correr el test para verificar que pasa**

Run: `npm test`
Expected: PASS — 4 tests verdes.

- [ ] **Step 8: Commit**

```bash
git add lib/auth-session.ts lib/__tests__/auth-session.test.ts jest.config.js package.json package-lock.json
git commit -m "feat(admin): módulo de sesión JWT (firmar/verificar) con tests"
```

---

## Task 2: Helpers de sesión server-side (`lib/auth.ts`)

**Files:**
- Create: `lib/auth.ts`

- [ ] **Step 1: Crear `lib/auth.ts`**

```ts
import 'server-only';
import { cookies } from 'next/headers';
import { signSession, verifySession } from './auth-session';

export const SESSION_COOKIE = 'lf_admin_session';
const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 días

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET no está configurado');
  return s;
}

/** Crea la cookie de sesión (llamar desde un server action / route handler). */
export async function createSessionCookie() {
  const token = await signSession({ role: 'admin' }, secret(), TTL_SECONDS);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_SECONDS,
  });
}

/** Borra la cookie de sesión. */
export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** True si hay sesión válida. Para usar dentro de server actions. */
export async function hasValidSession(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return (await verifySession(token, secret())) !== null;
}

/** Lanza si no hay sesión. Llamar al inicio de cada server action de escritura. */
export async function requireSession(): Promise<void> {
  if (!(await hasValidSession())) throw new Error('No autorizado');
}
```

- [ ] **Step 2: Verificar que compila (sin uso aún)**

Run: `npx next build`
Expected: build sin errores nuevos atribuibles a `lib/auth.ts`. (Si el build tarda, basta con que no falle por este archivo.)

- [ ] **Step 3: Commit**

```bash
git add lib/auth.ts
git commit -m "feat(admin): helpers de sesión server-side (cookie httpOnly)"
```

---

## Task 3: Login (página + server actions)

**Files:**
- Create: `app/login/actions.ts`
- Create: `app/login/page.tsx`

- [ ] **Step 1: Crear `app/login/actions.ts`**

```ts
'use server';

import { redirect } from 'next/navigation';
import { timingSafeEqual } from 'node:crypto';
import { createSessionCookie, clearSessionCookie } from '@/lib/auth';

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function login(_prev: string | undefined, formData: FormData): Promise<string | undefined> {
  const password = String(formData.get('password') ?? '');
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return 'Configuración faltante (ADMIN_PASSWORD).';
  if (!safeEqual(password, expected)) return 'Contraseña incorrecta.';
  await createSessionCookie();
  redirect('/dashboard');
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect('/login');
}
```

- [ ] **Step 2: Crear `app/login/page.tsx`**

```tsx
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
```

- [ ] **Step 3: Configurar variables de entorno locales**

Agregar a `.env.local` (NO commitear; ya está en `.gitignore`):
```
ADMIN_PASSWORD=elige-una-clave-fuerte-aqui
AUTH_SECRET=una-cadena-larga-aleatoria-de-32-mas-caracteres
```
Generar `AUTH_SECRET` con: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

- [ ] **Step 4: Verificar el login manualmente**

Run: `npm run dev` (sirve en http://localhost:3000)
Acción: ir a `http://localhost:3000/login`, escribir una contraseña incorrecta → muestra "Contraseña incorrecta."; escribir la de `ADMIN_PASSWORD` → redirige a `/dashboard`. Detener el server al terminar.
Expected: cookie `lf_admin_session` presente tras login correcto (DevTools → Application → Cookies).

- [ ] **Step 5: Commit**

```bash
git add app/login/actions.ts app/login/page.tsx
git commit -m "feat(admin): página de login con contraseña compartida"
```

---

## Task 4: Middleware que protege el panel

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Crear `middleware.ts`** (en la raíz del proyecto, junto a `package.json`)

```ts
import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth-session';

const SESSION_COOKIE = 'lf_admin_session';

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.AUTH_SECRET ?? '';
  const ok = token ? (await verifySession(token, secret)) !== null : false;

  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// Protege todo MENOS: /login, /api, y archivos estáticos de Next.
export const config = {
  matcher: ['/((?!login|api|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest).*)'],
};
```

- [ ] **Step 2: Verificar el gate manualmente**

Run: `npm run dev`
Acción: en una ventana de incógnito (sin cookie), ir a `http://localhost:3000/dashboard` → debe redirigir a `/login`. Hacer login → entra al dashboard. Recargar `/dashboard` → permanece (cookie válida). Verificar que `http://localhost:3000/api/reminders` responde SIN exigir login (no debe redirigir).
Expected: páginas protegidas; `/login` y `/api/*` accesibles sin sesión.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat(admin): middleware protege el panel, excluye /login y /api"
```

---

## Task 5: Botón "Cerrar sesión" en AdminShell

**Files:**
- Modify: `components/AdminShell.tsx`

- [ ] **Step 1: Leer `components/AdminShell.tsx`** para ubicar dónde va el nav/sidebar y el patrón de botones. Identificar un lugar visible (pie del sidebar o topbar).

- [ ] **Step 2: Importar la acción y renderizar el botón**

Agregar el import (ajustar la ruta si `AdminShell` no es client component; si no lo es, crear un pequeño componente client `LogoutButton`):
```tsx
import { logout } from '@/app/login/actions';
```
Renderizar, en el lugar identificado:
```tsx
<form action={logout}>
  <button
    type="submit"
    className="w-full rounded-[9px] px-[12px] py-[8px] text-[12px] font-semibold text-left"
    style={{ color: '#6E6E73' }}
  >
    Cerrar sesión
  </button>
</form>
```
Nota: `<form action={serverAction}>` funciona en server o client components en Next 16. Si `AdminShell` es `'use client'`, igualmente puede invocar un server action importado.

- [ ] **Step 3: Verificar manualmente**

Run: `npm run dev`
Acción: estando logueado, click en "Cerrar sesión" → redirige a `/login`; intentar `/dashboard` → vuelve a `/login`.
Expected: la cookie se borra y el panel queda protegido.

- [ ] **Step 4: Commit**

```bash
git add components/AdminShell.tsx
git commit -m "feat(admin): botón cerrar sesión"
```

---

## Task 6: Server actions de Equipo + cablear la página

**Files:**
- Create: `app/equipo/actions.ts`
- Modify: `app/equipo/page.tsx`

- [ ] **Step 1: Crear `app/equipo/actions.ts`**

```ts
'use server';

import { requireSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export interface EmployeeInput {
  name: string;
  role: string;
  color: string;
  emp_type: 'empleado' | 'practicante';
  initials: string;
}

export async function createEmployee(input: EmployeeInput, companyId: string) {
  await requireSession();
  const { error } = await admin().from('employees').insert({
    ...input, is_active: true, company_id: companyId,
  });
  if (error) throw new Error(error.message);
}

export async function updateEmployee(id: string, input: EmployeeInput) {
  await requireSession();
  const { error } = await admin().from('employees').update(input).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setEmployeeActive(id: string, isActive: boolean) {
  await requireSession();
  const { error } = await admin().from('employees').update({ is_active: isActive }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteEmployee(id: string) {
  await requireSession();
  const { error } = await admin().from('employees').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 2: Cablear `app/equipo/page.tsx`** — reemplazar las llamadas anon

Agregar import:
```tsx
import { createEmployee, updateEmployee, setEmployeeActive, deleteEmployee } from './actions';
```
En `handleSave`, reemplazar el bloque `editEmp ? supabase...update : supabase...insert` por:
```tsx
const payload = {
  name: form.name.trim(),
  role: form.role.trim(),
  color: form.color,
  emp_type: form.empType,
  initials: initials(form.name.trim()),
};
try {
  if (editEmp) await updateEmployee(editEmp.id, payload);
  else await createEmployee(payload, company!.id);
} catch (e) {
  setError(e instanceof Error ? e.message : 'Error al guardar'); setSaving(false); return;
}
```
En `toggleActive`: `await setEmployeeActive(emp.id, !emp.is_active);`
En `handleDelete`: `await deleteEmployee(emp.id);`
Quitar el import de `supabase` SI ya no se usa para lecturas en este archivo. (En `load()` sí se usa `supabase.from('employees').select(...)` — entonces **mantener** el import; solo se quitan las escrituras.)

- [ ] **Step 3: Verificar manualmente (CRUD de equipo)**

Run: `npm run dev` (logueado)
Acción: crear un empleado de prueba, editarlo, desactivar/activar, y eliminarlo. Verificar que cada acción se refleja en la lista.
Expected: las 4 operaciones funcionan (ahora vía service_role). Sin errores en consola.

- [ ] **Step 4: Commit**

```bash
git add app/equipo/actions.ts app/equipo/page.tsx
git commit -m "feat(admin): escrituras de equipo vía server actions (service_role)"
```

---

## Task 7: Server actions de Actividades + cablear páginas

**Files:**
- Create: `app/actividades/actions.ts`
- Modify: `app/actividades/page.tsx`, `app/actividades/nueva/page.tsx`, `app/actividades/[id]/page.tsx`

- [ ] **Step 1: Leer los 3 archivos** para copiar EXACTAMENTE la forma de los objetos que hoy se pasan a `.insert(...)` y `.update(...)` (campos de la actividad: title, description, start_time, limit_time, recurrence, days_of_week, assigned_employee_ids, is_urgent, reminder_minutes, evidence_photo, evidence_name, evidence_note, evidence_signature, is_active, company_id).

- [ ] **Step 2: Crear `app/actividades/actions.ts`**

```ts
'use server';

import { requireSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// El payload refleja las columnas reales de `activities` (ver Step 1).
export type ActivityInput = Record<string, unknown>;

export async function createActivity(input: ActivityInput) {
  await requireSession();
  const { error } = await admin().from('activities').insert(input);
  if (error) throw new Error(error.message);
}

export async function updateActivity(id: string, input: ActivityInput) {
  await requireSession();
  const { error } = await admin().from('activities').update(input).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setActivityActive(id: string, isActive: boolean) {
  await requireSession();
  const { error } = await admin().from('activities').update({ is_active: isActive }).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Borra la actividad y sus completions (réplica del borrado en cascada actual). */
export async function deleteActivity(id: string) {
  await requireSession();
  const a = admin();
  const c = await a.from('completions').delete().eq('activity_id', id);
  if (c.error) throw new Error(c.error.message);
  const r = await a.from('activities').delete().eq('id', id);
  if (r.error) throw new Error(r.error.message);
}
```

- [ ] **Step 3: Cablear `app/actividades/page.tsx`**

Import:
```tsx
import { setActivityActive, deleteActivity } from './actions';
```
Reemplazar:
- `supabase.from('activities').update({ is_active: !act.is_active }).eq('id', act.id)` → `await setActivityActive(act.id, !act.is_active)`
- El bloque que hace `supabase.from('completions').delete().eq('activity_id', id)` + `supabase.from('activities').delete().eq('id', id)` → `await deleteActivity(id)`
Mantener el `supabase` import si se usa para lecturas (`select`).

- [ ] **Step 4: Cablear `app/actividades/nueva/page.tsx`**

Import `createActivity` y reemplazar `const { error } = await supabase.from('activities').insert({...})` por:
```tsx
try { await createActivity({ /* el MISMO objeto que ya construían */ }); }
catch (e) { setError(e instanceof Error ? e.message : 'Error'); return; }
```
(Preservar el objeto exacto leído en Step 1.)

- [ ] **Step 5: Cablear `app/actividades/[id]/page.tsx`**

Import `updateActivity` y reemplazar `await supabase.from('activities').update({...}).eq('id', ...)` por `await updateActivity(id, { /* mismo objeto */ })` con manejo try/catch igual que arriba.

- [ ] **Step 6: Verificar manualmente (CRUD de actividades)**

Run: `npm run dev` (logueado)
Acción: crear una actividad nueva, editarla, activar/desactivar desde la lista, y borrarla (confirmar que también desaparecen sus completions). 
Expected: las 4 operaciones funcionan vía service_role.

- [ ] **Step 7: Commit**

```bash
git add app/actividades/actions.ts app/actividades/page.tsx app/actividades/nueva/page.tsx "app/actividades/[id]/page.tsx"
git commit -m "feat(admin): escrituras de actividades vía server actions (service_role)"
```

---

## Task 8: Server actions de Conoce + cablear la página

**Files:**
- Create: `app/conoce/actions.ts`
- Modify: `app/conoce/page.tsx`

- [ ] **Step 1: Leer `app/conoce/page.tsx`** para copiar la forma exacta de los objetos de `insert`/`update` de `conoce_items` (campos: company_id, type, title, body, image_url, sort_order, is_active).

- [ ] **Step 2: Crear `app/conoce/actions.ts`**

```ts
'use server';

import { requireSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export type ConoceInput = Record<string, unknown>;

export async function createConoceItem(input: ConoceInput) {
  await requireSession();
  const { error } = await admin().from('conoce_items').insert(input);
  if (error) throw new Error(error.message);
}

export async function updateConoceItem(id: string, input: ConoceInput) {
  await requireSession();
  const { error } = await admin().from('conoce_items').update(input).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setConoceActive(id: string, isActive: boolean) {
  await requireSession();
  const { error } = await admin().from('conoce_items').update({ is_active: isActive }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteConoceItem(id: string) {
  await requireSession();
  const { error } = await admin().from('conoce_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 3: Cablear `app/conoce/page.tsx`** — reemplazar las 4 llamadas anon (`insert`, `update`, `delete`, el toggle `update({is_active})`) por las server actions correspondientes, con try/catch en el guardado. Mantener `supabase` para lecturas.

- [ ] **Step 4: Verificar manualmente**

Run: `npm run dev` (logueado)
Acción: crear un ítem de conoce, editarlo, activar/desactivar, borrarlo.
Expected: las 4 operaciones funcionan vía service_role.

- [ ] **Step 5: Commit**

```bash
git add app/conoce/actions.ts app/conoce/page.tsx
git commit -m "feat(admin): escrituras de conoce vía server actions (service_role)"
```

---

## Task 9: Server actions de Urgente + cablear la página

**Files:**
- Create: `app/urgente/actions.ts`
- Modify: `app/urgente/page.tsx`

- [ ] **Step 1: Leer `app/urgente/page.tsx`** para copiar la forma exacta del `insert` de `urgent_alerts` (campos: title, company_id, is_active) y el borrado de `urgent_alert_acks`.

- [ ] **Step 2: Crear `app/urgente/actions.ts`**

```ts
'use server';

import { requireSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function createUrgentAlert(title: string, companyId: string | null) {
  await requireSession();
  const { error } = await admin().from('urgent_alerts').insert({
    title, company_id: companyId, is_active: true,
  });
  if (error) throw new Error(error.message);
}

export async function deactivateUrgentAlert(id: string) {
  await requireSession();
  const { error } = await admin().from('urgent_alerts').update({ is_active: false }).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Borra la alerta y sus acks (réplica del borrado actual). */
export async function deleteUrgentAlert(id: string) {
  await requireSession();
  const a = admin();
  const acks = await a.from('urgent_alert_acks').delete().eq('alert_id', id);
  if (acks.error) throw new Error(acks.error.message);
  const r = await a.from('urgent_alerts').delete().eq('id', id);
  if (r.error) throw new Error(r.error.message);
}
```

- [ ] **Step 3: Cablear `app/urgente/page.tsx`** — reemplazar el `insert` de alerta, el `update({is_active:false})` y el borrado (acks + alerta) por las server actions. Mantener `supabase` para lecturas.

- [ ] **Step 4: Verificar manualmente**

Run: `npm run dev` (logueado)
Acción: crear una alerta urgente, desactivarla, borrarla.
Expected: las 3 operaciones funcionan vía service_role.

- [ ] **Step 5: Commit**

```bash
git add app/urgente/actions.ts app/urgente/page.tsx
git commit -m "feat(admin): escrituras de urgentes vía server actions (service_role)"
```

---

## Task 10: Auditoría — ninguna escritura del panel quedó en anon

**Files:** (solo verificación, sin cambios salvo hallazgos)

- [ ] **Step 1: Buscar escrituras anon remanentes en el panel**

Run (con Grep o):
```bash
grep -rnE "supabase\.from\([^)]*\)\.(insert|update|delete|upsert)\(" app components | grep -v "app/api/"
```
Expected: **0 resultados** fuera de `app/api/` (las API routes ya usan service_role; las server actions usan `admin()`, no el `supabase` anon). Si aparece alguno, moverlo a una server action como en las tareas anteriores y commitear.

- [ ] **Step 2: Commit (si hubo hallazgos)**

```bash
git add -- <archivos corregidos>
git commit -m "fix(admin): mover escrituras anon remanentes a server actions"
```

---

## Task 11: Hardening de API routes — dos guards distintos

**Files:**
- Modify: `app/api/push/route.ts` (guard de sesión)
- Modify: `app/api/reminders/route.ts`, `app/api/cleanup/route.ts` (guard de cron — opcional, coordinado)

> **Hecho confirmado por inspección:**
> - `/api/push` se invoca desde el **navegador del admin** (`app/dashboard/page.tsx`, `app/actividades/nueva/page.tsx`, `app/urgente/page.tsx` hacen `fetch('/api/push', ...)`). NO lo llama cron. → se protege con la **cookie de sesión** (no con un secreto, que no puede vivir en el cliente).
> - `/api/reminders` (cada 5 min) y `/api/cleanup` (1×/día) los dispara **cron-job.org** (máquina). → se protegen con `CRON_SECRET`.
> - El middleware (Task 4) excluye TODO `/api`, así que cada ruta hace su propia verificación.

### 11A — `/api/push`: guard por sesión (hacer siempre)

- [ ] **Step 1: Proteger `/api/push` con la cookie de sesión**

Al inicio del handler (es un `POST`), agregar:
```ts
import { hasValidSession } from '@/lib/auth';
// ...dentro del handler, antes de cualquier trabajo:
if (!(await hasValidSession())) {
  return NextResponse.json({ error: 'no autorizado' }, { status: 401 });
}
```
Como el `fetch('/api/push')` sale del navegador logueado y es mismo-origen, la cookie viaja automáticamente; las llamadas del panel siguen funcionando.

- [ ] **Step 2: Verificar**

Run: `npm run dev`
Acción: logueado, disparar una acción del panel que llame a `/api/push` (p. ej. crear alerta urgente) → funciona. En incógnito, `POST http://localhost:3000/api/push` sin cookie → responde 401.
Expected: con sesión funciona; sin sesión 401.

- [ ] **Step 3: Commit**

```bash
git add app/api/push/route.ts
git commit -m "feat(admin): /api/push exige sesión de admin"
```

### 11B — `/api/reminders` y `/api/cleanup`: guard de cron (opcional, coordinado)

> **Atención:** son GET públicos disparados por **cron-job.org**. Agregar el secreto exige actualizar la config de cron-job.org en la MISMA ventana, o el cron deja de correr. Hacer solo si el usuario coordina el cambio.

- [ ] **Step 1: Agregar guard por secreto**

Variable de entorno `CRON_SECRET`. Al inicio de cada handler (cambiar la firma a `GET(req: Request)` para leer headers):
```ts
const auth = req.headers.get('authorization');
if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'no autorizado' }, { status: 401 });
}
```

- [ ] **Step 2: Actualizar cron-job.org** para enviar `Authorization: Bearer <CRON_SECRET>` y configurar `CRON_SECRET` en Vercel.

- [ ] **Step 3: Verificar** que el cron sigue ejecutando (logs de cron-job.org / 200) y que sin el header responde 401.

- [ ] **Step 4: Commit**

```bash
git add app/api/reminders/route.ts app/api/cleanup/route.ts
git commit -m "feat(admin): guard por CRON_SECRET en reminders/cleanup"
```

---

## Task 12: Build + verificación funcional completa

- [ ] **Step 1: Build de producción**

Run: `npm run build`
Expected: build exitoso (sin errores de tipos/rutas).

- [ ] **Step 2: Verificación end-to-end (local, logueado y sin login)** — con Playwright o navegador:
  1. Sin sesión → cualquier página del panel redirige a `/login`.
  2. Login con contraseña incorrecta → error; con la correcta → `/dashboard`.
  3. CRUD completo funciona logueado: equipo (crear/editar/toggle/borrar), actividades (crear/editar/toggle/borrar+cascade), conoce (crear/editar/toggle/borrar), urgente (crear/desactivar/borrar).
  4. "Cerrar sesión" → `/login`, y el panel vuelve a quedar protegido.
  5. `/api/reminders` responde sin exigir login.
- [ ] **Step 3: `npm test`** → 4 tests del módulo de sesión verdes.

---

## Despliegue (fuera del plan de código, recordatorio)

- Configurar en Vercel (laferre-admin): `ADMIN_PASSWORD`, `AUTH_SECRET` (y `CRON_SECRET` si se hizo Task 11). `SUPABASE_SERVICE_ROLE_KEY` ya existe.
- Desplegar y verificar en producción el login + un CRUD.
- **Solo después** de confirmar producción, proceder con el **Plan de la Fase 2** (SQL de RLS), que se redactará en ese momento usando el snapshot de `pg_policies` en vivo.

---

## Notas de cobertura vs. spec

- Login contraseña compartida + cookie httpOnly firmada → Tasks 1–4.
- Cerrar sesión → Task 5.
- Mover TODAS las escrituras del panel a service_role → Tasks 6–9, auditado en Task 10.
- API routes fuera del login + guard de cron → Task 4 (exclusión) y Task 11 (guard).
- Verificación (login + CRUD) → Task 12.
- Fase 2 (RLS) → plan separado, posterior al despliegue de Fase 1 (por diseño).
