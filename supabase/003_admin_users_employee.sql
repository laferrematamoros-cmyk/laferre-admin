-- ══════════════════════════════════════════════
--  Vincular un usuario del panel a un empleado
--  Pega este SQL en Supabase → SQL Editor → Run
-- ══════════════════════════════════════════════

-- Cuando un usuario del panel (p. ej. el practicante) tiene un empleado
-- vinculado, sus actividades completadas se registran bajo ese empleado.
alter table admin_users
  add column if not exists employee_id uuid references employees(id) on delete set null;