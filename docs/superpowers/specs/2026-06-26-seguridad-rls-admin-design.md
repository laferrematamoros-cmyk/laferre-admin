# Diseño — Seguridad: login de admin + cierre de RLS

**Fecha:** 2026-06-26
**Apps:** laferre-admin (Next.js, Vercel) y laferre-actividades (Expo/RN) — comparten el proyecto Supabase `yagsegxzodiffsfvnjvp`.
**Estado:** Aprobado por el usuario · pendiente de plan de implementación

---

## Problema

La base de datos está **abierta a la `anon` key** (que viaja en el bundle del cliente y es trivial de extraer):

- **Lectura total** con anon en todas las tablas (verificado): companies(2), employees(12, incl. `push_token`), activities(13), completions(258), conoce_items(10), device_tokens(4), urgent_alerts/acks.
- **Escritura anónima confirmada**: se pudo INSERT y DELETE en `activities` con solo la anon key.

Causa raíz: **ambas apps corren como rol `anon`** y el panel **laferre-admin** hace **todas sus escrituras desde el navegador con la anon key**. El panel no tiene autenticación propia (`app/page.tsx` redirige directo a `/dashboard`; no hay middleware). El "PIN 1234" solo vivía en la app de empleados (ya removido). El `service_role` existe pero solo se usa en 3 API routes (reminders, cleanup, push), no en el CRUD del panel.

La migración del repo (`laferre-admin/supabase/001_schema.sql`) está **desactualizada** (no incluye varias tablas/columnas ni refleja las políticas reales). **La fuente de verdad es la DB en vivo**, no ese archivo.

## Objetivo

1. Que solo personas autenticadas operen el panel admin.
2. Que la `anon` key ya no pueda escribir/borrar datos sensibles — solo lo mínimo que la app de empleados necesita.
3. Sin romper ninguna de las dos apps.

## Decisiones tomadas (con el usuario)

- **Autenticación admin: contraseña compartida (Opción A).** 3 gerentes comparten una clave. Tradeoff aceptado: no hay rendición de cuentas por persona; si un gerente se va, se rota la contraseña.
- **Alcance de RLS: cerrar escrituras, dejar lecturas operativas abiertas (Opción 1).** Excepción: se cierra la **lectura** de `device_tokens`. La app de empleados **no requiere cambios** (el único write sensible, `push_token`, se resuelve con GRANT a nivel de columna).

## Arquitectura

```
HOY:   navegador admin ──anon──► DB (escribe todo)               ← hueco
       app empleados   ──anon──► DB (lee todo + sus escrituras)

META:  navegador admin ──login (cookie)──► server actions ──service_role──► DB
       app empleados   ──anon (solo lecturas + 4 escrituras acotadas)──► DB
       RLS: anon NO puede escribir activities/employees/conoce/urgent_alerts
```

Dos fases secuenciales (la 2 depende de que la 1 esté en producción).

---

## Fase 1 — laferre-admin (login + escrituras al servidor)

### 1.a Login con contraseña compartida
- Variables de entorno en Vercel: `ADMIN_PASSWORD` (la clave compartida) y `AUTH_SECRET` (para firmar la cookie). `SUPABASE_SERVICE_ROLE_KEY` ya existe.
- Página `/login`: campo de contraseña → **server action** valida con comparación de tiempo constante → emite cookie de sesión **httpOnly, firmada** (JWT con `jose`), caducidad ~7 días.
- `middleware.ts`: protege **todas las páginas** del panel. Sin cookie válida → redirige a `/login`. Excluye `/login` y assets estáticos.
- Botón "Cerrar sesión" que borra la cookie.
- **API routes (`/api/reminders`, `/api/cleanup`, `/api/push`):** NO se protegen con la cookie (las dispara cron/máquina). Se verifica cómo se invocan y se les agrega su propio guard (header secreto `CRON_SECRET` o equivalente). Detalle a confirmar en el plan.

### 1.b Mover las escrituras al servidor
Convertir cada mutación que hoy hace el navegador con anon en una **server action** que (1) verifica la cookie de sesión y (2) usa `supabaseAdmin()` (`service_role`):

| Página | Mutaciones a mover |
|--------|--------------------|
| `app/actividades/nueva/page.tsx` | insert activities |
| `app/actividades/[id]/page.tsx` | update activities |
| `app/actividades/page.tsx` | toggle is_active, delete activity (+ delete completions del activity) |
| `app/equipo/page.tsx` | insert / update / toggle / delete employees |
| `app/conoce/page.tsx` | insert / update / toggle / delete conoce_items |
| `app/urgente/page.tsx` | insert / deactivate / delete urgent_alerts; delete urgent_alert_acks |

- Los componentes llaman a la server action en vez de `supabase.from(...)`.
- **Las lecturas del panel se quedan igual** (cliente anon) — siguen funcionando porque la Fase 2 deja las lecturas abiertas.
- Dependencia nueva: `jose`.

## Fase 2 — DB (cerrar la RLS)

Script SQL ejecutado en el **SQL Editor de Supabase**, **después** de que la Fase 1 esté en producción. Pasos:

1. **Capturar políticas actuales** (`select * from pg_policies where schemaname='public'`) y guardarlas para rollback.
2. **Activar RLS** en todas las tablas (companies, employees, activities, completions, conoce_items, urgent_alerts, urgent_alert_acks, device_tokens).
3. **Borrar políticas permisivas existentes** con un bloque `DO` que recorre `pg_policies` (los nombres divergieron), y **crear** las de mínimo privilegio.
4. **GRANT a nivel de columna** para `push_token`:
   `revoke update on employees from anon; grant update (push_token) on employees to anon;` + política RLS de update en employees.
5. Storage `evidence`: se deja como está (insert para subir, lectura pública para que el admin vea las fotos).

### Matriz de acceso del rol `anon` (todo lo demás → service_role del admin)

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|:------:|:------:|:------:|:------:|
| companies | ✅ | — | — | — |
| employees | ✅ | — | ✅ solo `push_token` (column grant) | — |
| activities | ✅ | — | — | — |
| completions | ✅ | ✅ | — | — |
| conoce_items | ✅ | — | — | — |
| urgent_alerts | ✅ | — | — | — |
| urgent_alert_acks | ✅ | ✅ | ✅ (upsert) | — |
| device_tokens | ❌ | ✅ | ✅ (upsert) | — |
| storage `evidence` | ✅ público | ✅ subir | — | — |

Justificación de las 4 escrituras anon que se conservan (las que usa la app de empleados):
- `completions` INSERT — registrar actividad realizada (append-only).
- `device_tokens` INSERT/UPDATE — upsert del token push del dispositivo (sin lectura).
- `employees` UPDATE solo `push_token` — registrar token del empleado (column grant, no puede tocar otras columnas).
- `urgent_alert_acks` INSERT/UPDATE — registrar "visto" de alerta urgente (upsert).

## Orden de despliegue (crítico)

1. Desplegar **Fase 1 completa** a producción (con env vars). Verificar login y CRUD del admin logueado.
2. **Solo entonces** correr el SQL de la **Fase 2**.

Correr el SQL antes de que Fase 1 esté viva rompería el panel (aún escribiría con anon). Ventana entre ambos: el panel ya usa service_role, así que no hay hueco funcional; el anon sigue abierto hasta correr el SQL (ventana corta, aceptable).

## Pruebas (Playwright + REST, como en la verificación previa)

- **Tras Fase 1:** sin sesión → `/login`; logueado → cada CRUD del panel funciona (vía service_role).
- **Tras Fase 2:**
  - App de empleados intacta: lee actividades/empleados, registra completion, guarda push_token, flujo de ack.
  - Admin intacto (service_role ignora RLS).
  - **Prueba de cierre del hueco:** repetir el sondeo anónimo (INSERT/DELETE en `activities` con la anon key) → debe **fallar** (401/403). Repetir por tabla escribible.

## Manejo de errores / rollback

- Antes de la Fase 2, guardar el snapshot de `pg_policies` y dejar listo un SQL de reversa (re-crear políticas permisivas) por si la app de empleados se rompe.
- Auditar por grep que **todas** las mutaciones del panel se movieron a server actions antes de correr el SQL (una escritura admin olvidada en anon fallaría tras Fase 2).
- Confirmar que `SUPABASE_SERVICE_ROLE_KEY` está en el entorno de Vercel del admin.

## Fuera de alcance (anotado para después)
- Migrar el bucket `evidence` a privado + URLs firmadas (sería la Opción 2, más estricta).
- Restringir lecturas de columnas sensibles (`push_token`, historial de `completions`) detrás de RPCs/vistas.
- Auth por usuario (Supabase Auth con cuentas individuales) en lugar de contraseña compartida.
- Reescribir la migración `001_schema.sql` para reflejar el esquema real (deuda técnica).

## Criterios de éxito
- Entrar a `laferre-admin.vercel.app` sin sesión redirige a `/login`; con la contraseña correcta se accede.
- Todo el CRUD del panel funciona logueado (vía service_role).
- Un INSERT/DELETE con la anon key sobre `activities` (y demás tablas bloqueadas) es **rechazado**.
- La app de empleados sigue funcionando idéntica (lecturas, completions, push token, acks) — sin cambios de código.