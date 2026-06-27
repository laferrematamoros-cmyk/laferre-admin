# Seguridad Fase 2 — Cierre de RLS (Implementation Plan)

> Ejecutado de forma INTERACTIVA: yo escribo el SQL, el usuario lo corre en el SQL Editor de Supabase (el MCP no tiene acceso a este proyecto), yo verifico con Playwright/REST.

**Goal:** Que la `anon` key (en el bundle del cliente) ya NO pueda escribir/borrar en la base; solo lo mínimo que la app de empleados necesita. El panel admin sigue funcionando porque escribe con `service_role` (ignora RLS) desde la Fase 1.

**Pre-requisito cumplido:** Fase 1 desplegada en producción (admin usa service_role). Spec: `2026-06-26-seguridad-rls-admin-design.md`.

---

## Estado actual capturado (2026-06-27) — BASELINE para rollback

Políticas existentes (todas permisivas), rol entre `{}`:

| Tabla | Políticas actuales |
|-------|--------------------|
| activities | activities_delete (DELETE, public, true), activities_insert (INSERT, public, check true), activities_select (SELECT, public, true), activities_update (UPDATE, public, true) |
| companies | companies_insert (INSERT, public), companies_select (SELECT, public), companies_update (UPDATE, public) |
| completions | completions_insert (INSERT, public), completions_select (SELECT, public) |
| conoce_items | "public read" (SELECT, public), "service write" (ALL, public) |
| device_tokens | anon_all (ALL, anon, true/true) |
| employees | employees_delete (DELETE, public), employees_insert (INSERT, public), employees_select (SELECT, public), employees_update (UPDATE, public) |
| urgent_alert_acks | anon_all (ALL, anon, true/true) |
| urgent_alerts | anon_all (ALL, anon, true/true) |

## Matriz objetivo (rol `anon`)

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|:--:|:--:|:--:|:--:|
| companies | ✅ | — | — | — |
| employees | ✅ | — | ✅ solo `push_token` | — |
| activities | ✅ | — | — | — |
| completions | ✅ | ✅ | — | — |
| conoce_items | ✅ | — | — | — |
| urgent_alerts | ✅ | — | — | — |
| urgent_alert_acks | ✅ | ✅ | ✅ | — |
| device_tokens | ❌ | ✅ | ✅ | — |

El admin escribe todo con `service_role` (bypassa RLS). storage `evidence` no se toca (subida sigue, lectura pública).

---

## SQL de cierre (correr en SQL Editor, atómico)

```sql
begin;

-- 1) RLS activado en todas (idempotente)
alter table public.companies          enable row level security;
alter table public.employees          enable row level security;
alter table public.activities         enable row level security;
alter table public.completions        enable row level security;
alter table public.conoce_items       enable row level security;
alter table public.urgent_alerts      enable row level security;
alter table public.urgent_alert_acks  enable row level security;
alter table public.device_tokens      enable row level security;

-- 2) Borrar TODAS las políticas existentes en esas tablas
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('companies','employees','activities','completions',
                        'conoce_items','urgent_alerts','urgent_alert_acks','device_tokens')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 3) Column grant: anon solo puede actualizar la columna push_token de employees
revoke update on public.employees from anon;
grant  update (push_token) on public.employees to anon;

-- 4) Políticas mínimas para anon
-- Lecturas operativas (todo menos device_tokens)
create policy "anon_select_companies"     on public.companies         for select to anon using (true);
create policy "anon_select_employees"     on public.employees         for select to anon using (true);
create policy "anon_select_activities"    on public.activities        for select to anon using (true);
create policy "anon_select_completions"   on public.completions       for select to anon using (true);
create policy "anon_select_conoce"        on public.conoce_items      for select to anon using (true);
create policy "anon_select_urgent_alerts" on public.urgent_alerts     for select to anon using (true);
create policy "anon_select_acks"          on public.urgent_alert_acks for select to anon using (true);

-- Escrituras mínimas de la app de empleados
create policy "anon_insert_completions"   on public.completions       for insert to anon with check (true);
create policy "anon_update_emp_pushtoken" on public.employees         for update to anon using (true) with check (true);
create policy "anon_insert_acks"          on public.urgent_alert_acks for insert to anon with check (true);
create policy "anon_update_acks"          on public.urgent_alert_acks for update to anon using (true) with check (true);
create policy "anon_insert_devicetokens"  on public.device_tokens     for insert to anon with check (true);
create policy "anon_update_devicetokens"  on public.device_tokens     for update to anon using (true) with check (true);

commit;
```

## Verificación (yo, tras correrlo)
- App empleados (web): lee actividades/empleados, registra completion, push_token, ack. (Playwright)
- Admin (logueado): CRUD sigue (service_role). (Playwright)
- **Prueba de cierre:** REST anon `POST/DELETE` sobre `activities` → debe dar **401/403** (antes 201/200).
- Sondeo por tabla: insert anon en employees/conoce/urgent_alerts → rechazado; insert en completions/acks/device_tokens → permitido.

## ROLLBACK de emergencia (solo si algo se rompe)
```sql
begin;
-- Re-otorgar update completo a anon en employees
grant update on public.employees to anon;
-- Recrear acceso permisivo por tabla (vuelve al estado abierto previo)
do $$
declare t text;
begin
  foreach t in array array['companies','employees','activities','completions',
                           'conoce_items','urgent_alerts','urgent_alert_acks','device_tokens']
  loop
    execute format('drop policy if exists %I on public.%I', 'anon_select_'||replace(t,'_',''), t);
    execute format($f$create policy %I on public.%I for all to public using (true) with check (true)$f$,
                   'reopen_'||t, t);
  end loop;
end $$;
commit;
```
(Si el rollback se usa, después rehacemos el cierre con el ajuste necesario.)
```
```