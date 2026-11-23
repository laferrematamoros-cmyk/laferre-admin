-- 012: de qué empresa es cada correo del aviso de "lista por firmar" (Ajustes → Firma de listas).
-- notify_scope = { "correo": "id de la empresa" }. Un correo que no está aquí es de las dos empresas.
-- Sólo agrega una columna vacía: no borra ni cambia nada de lo que ya hay.

alter table public.signer_settings
  add column if not exists notify_scope jsonb not null default '{}'::jsonb
  check (jsonb_typeof(notify_scope) = 'object');

notify pgrst, 'reload schema';

-- Debe salir UNA fila: notify_scope | jsonb | {}
select column_name, data_type, (select s.notify_scope from public.signer_settings s where s.id) as valor
from information_schema.columns
where table_schema = 'public' and table_name = 'signer_settings' and column_name = 'notify_scope';
