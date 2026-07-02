-- ══════════════════════════════════════════════
--  LA FERRE ACTIVIDADES — Usuarios del panel admin
--  Pega este SQL en Supabase → SQL Editor → Run
-- ══════════════════════════════════════════════

-- Usuarios que pueden entrar al panel de administración.
-- La contraseña se guarda hasheada (scrypt: "salt:hash" en hex).
-- role:       'admin' ve todo · 'practicante' solo Dashboard + Reportes
-- company_id: si está fijo, el usuario solo ve esa empresa; NULL = ve todas.
create table if not exists admin_users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  password_hash text not null,
  role          text not null default 'practicante'
                  check (role in ('admin', 'practicante')),
  company_id    uuid references companies(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- RLS habilitada SIN políticas: la clave anon no puede leer ni escribir
-- (contiene hashes de contraseña). Solo el service role del panel accede.
alter table admin_users enable row level security;