-- 014: tema de cada capacitación (la medalla de su color: plomería, electricidad, pintura, bodega,
-- herramientas, atención). El tema lo escribe el panel desde su catálogo (syncCatalog); aquí sólo se guarda
-- y cap_list se lo da al teléfono. Sólo agrega una columna y cambia cap_list: no borra nada.
-- Correr ANTES de subir el panel que lo usa (si no, syncCatalog falla al pedir la columna).

alter table public.trainings add column if not exists theme text;
alter table public.trainings drop constraint if exists trainings_theme_check;
alter table public.trainings add constraint trainings_theme_check check (theme is null or theme ~ '^[a-z]{1,20}$');

-- Teléfono y practicante: lo de UNA persona (igual que en la 011, más 'theme').
create or replace function public.cap_list(p_employee uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', r.training_id, 'slug', r.slug, 'title', r.title, 'sort_order', r.sort_order,
           'version', r.version, 'status', r.status, 'deadline', r.deadline, 'answered_at', r.answered_at,
           'theme', t.theme)
           order by r.sort_order, r.title), '[]'::jsonb)
    from cap_rows(now()) r
    join trainings t on t.id = r.training_id
   where r.employee_id = p_employee
$$;

revoke all on function public.cap_list(uuid) from public;
grant execute on function public.cap_list(uuid) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

-- Debe salir: columna_theme | 1 · cap_list_con_theme | true
select (select count(*) from information_schema.columns
         where table_schema = 'public' and table_name = 'trainings' and column_name = 'theme') as columna_theme,
       (select pg_get_functiondef('public.cap_list(uuid)'::regprocedure) like '%''theme''%') as cap_list_con_theme;
