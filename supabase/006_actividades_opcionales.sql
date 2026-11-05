-- Actividades opcionales: avisan y se pueden marcar, pero si no se hacen no cuentan
-- (ni "sin hacer", ni el porcentaje). Ej.: devoluciones, hojas de traspaso.
-- Correr en el SQL Editor de Supabase, ANTES de subir el código del panel.

alter table public.activities
  add column if not exists is_optional boolean not null default false;

-- La app de empleados lee activities con select('*') usando la llave pública.
-- Si la lectura estuviera dada columna por columna, la columna nueva la tumbaría.
grant select (is_optional) on public.activities to anon, authenticated;
