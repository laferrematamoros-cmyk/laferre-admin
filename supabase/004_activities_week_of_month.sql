-- ══════════════════════════════════════════════
--  Actividades por semana del mes (ej. inventario mensual)
--  Pega este SQL en Supabase → SQL Editor → Run
-- ══════════════════════════════════════════════

-- week_of_month:
--   NULL = cada semana (comportamiento normal)
--   1..5 = solo esa semana del mes (la semana que contiene el día 1 es la 1ª)
--   -1   = última semana del mes
-- El panel prende/apaga is_active automáticamente según la semana en curso,
-- así la app del empleado la muestra solo cuando corresponde (sin actualizar la app).
alter table activities
  add column if not exists week_of_month smallint;