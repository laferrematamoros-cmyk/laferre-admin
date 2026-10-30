-- ══════════════════════════════════════════════
--  Historial de actividades: archivar y pausar SIN borrar el pasado
--  Pega este SQL en Supabase → SQL Editor → Run (una sola vez)
-- ══════════════════════════════════════════════
--
-- Antes, "Eliminar" borraba la actividad y todos sus registros, y "Pausar"
-- hacía que Reportes dejara de contarla también en semanas pasadas.
-- Con esto:
--   · archived_at: la actividad se archiva (sale de la lista y de la app),
--     pero Reportes la sigue contando en los días anteriores a esa fecha.
--   · activity_pauses: cada pausa con su inicio y su fin; Reportes sólo
--     deja fuera los días que quedaron dentro de una pausa.

alter table public.activities
  add column if not exists archived_at timestamptz;

create table if not exists public.activity_pauses (
  id          uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  paused_at   timestamptz not null default now(),
  resumed_at  timestamptz
);

create index if not exists activity_pauses_activity_idx
  on public.activity_pauses (activity_id);

-- El panel lee con la llave pública (igual que activities);
-- sólo el servidor del panel (service role) escribe.
alter table public.activity_pauses enable row level security;

drop policy if exists "anon_select_activity_pauses" on public.activity_pauses;
create policy "anon_select_activity_pauses"
  on public.activity_pauses for select to anon using (true);

-- Comprobación: debe regresar una fila con archived_at y otra con la tabla.
select 'archived_at' as que, count(*) as hay
  from information_schema.columns
 where table_schema = 'public' and table_name = 'activities' and column_name = 'archived_at'
union all
select 'activity_pauses', count(*)
  from information_schema.tables
 where table_schema = 'public' and table_name = 'activity_pauses';
