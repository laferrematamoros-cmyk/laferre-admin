# Lista con firma (primera: LIMPIEZA)

Diseño aprobado en conversación el 2026-11-20. Reemplaza la "Bitácora semanal de limpieza" en papel de La Ferre: hoy marcan las casillas del día, le toman foto a la hoja y pasan a firmar con el Ing. José.

## Qué se construye

Una opción nueva para cualquier actividad: **"Lista con firma"**. La actividad sigue siendo la misma (horario, recordatorios, porcentaje, ranking), y además:

1. **Lista de tareas por día.** Cada tarea tiene área, nombre, días de la semana y la casilla "pide foto". El teléfono enseña solo las tareas de hoy.
2. **Rol semanal.** Cada semana (lunes a sábado) la actividad le toca a una persona, en un orden fijo que se repite. Se puede cambiar la persona de una semana o de un día sin mover el orden.
3. **Firma.** Al terminar, la actividad queda "Falta la firma". Se firma en persona con un PIN en el teléfono del empleado, o a distancia desde el panel (aviso por correo). Sin firma no cuenta como realizada.

La primera actividad que lo usa es **LIMPIEZA** (La Ferre, lun–sáb, 9:20–11:30). Se cargan las 18 tareas de la hoja con sus días. Rol: Eddie (semana del 16 nov 2026) → Laura → Yajaira → Eddie…

Por qué es una opción de actividad y no un módulo aparte: así reaprovecha horario, recordatorios, porcentaje y ranking, y la próxima hoja de papel (apertura, cierre, mantenimiento) se pasa al teléfono sin programar nada nuevo.

## Decisiones del dueño

| Pregunta | Decisión |
|---|---|
| ¿Cómo se firma? | Las dos: en persona y a distancia. |
| ¿Quién hace la limpieza? | Rol semanal, una persona por semana. |
| ¿Cómo llega el aviso? | Por correo; luego entra al panel a firmar. |
| ¿Cómo se firma en persona? | Con un PIN suyo (no dibujo con el dedo). |
| ¿Fotos? | Solo en las tareas marcadas "pide foto" en el panel. |
| ¿Y si no firma ese día? | Espera la firma lo que haga falta. Al firmar, cuenta con la hora en que el empleado terminó (no le baja el porcentaje). Si la regresa, cuenta como no hecha hasta que se corrija. |

## El teléfono del empleado

- **Inicio:** la actividad aparece solo para quien está de turno ese día, con su avance ("3 de 10 tareas"). Los demás no la ven.
- **La lista:** solo lo de hoy, agrupado por área.
  - Un toque palomea la tarea.
  - Las tareas con foto abren la cámara y quedan palomeadas al tomar la foto.
  - Con un toque largo se marca "No se pudo", con motivo obligatorio. Cuenta como resuelta, y el admin ve el motivo.
- **Guardado:** cada palomita se guarda en el servidor al momento. Si cierra la app, la lista sigue como estaba.
- **"Terminé":** se prende cuando todas las tareas están palomeadas o en "No se pudo". La tarjeta cambia a **"Falta la firma del Ing."** y sale al admin el correo, sin que el empleado elija nada.
- **"Firmar aquí":** el admin pone su PIN en ese teléfono y queda firmada. Firma lo que llegue primero: PIN o panel.
- **Si la regresan:**
  - le llega notificación con la nota del admin;
  - solo se reabren las tareas que el admin marcó;
  - al corregirlas vuelve a "Falta la firma".
- **"Tarde"** se calcula con la hora de "Terminé" contra la hora límite, en hora de Matamoros (en el servidor, no con el reloj del teléfono).
- Todo es código de pantallas (la cámara ya usa `expo-image-picker`), así que se manda **por internet** (`npm run actualizar`), sin APK nueva.

## El panel

**Correo de aviso**
- Asunto: "Limpieza por firmar — Eddie, martes 24 nov".
- Cuerpo: tareas hechas, las que "no se pudo" con su motivo, cuántas fotos, y el botón **Abrir en el panel** (pide iniciar sesión, no firma con un toque).

**Por firmar**
- Numerito en Inicio y en el menú.
- La ficha enseña:
  - la lista del día con quién y a qué hora;
  - las fotos, con visor;
  - los motivos.
- Botones:
  - **Firmar:** sin PIN, porque ya inició sesión; solo rol admin. La practicante no puede firmar.
  - **Regresar:** elige tareas y escribe una nota.

**Editar la actividad**
- Interruptor **"Lista con firma"**.
- Tareas por área con nombre, días (L M M J V S) y "pide foto": agregar, quitar, reordenar.
  - Quitar una tarea la archiva: las bitácoras viejas la siguen mostrando.
- **Rol semanal:**
  - orden de personas;
  - "esta semana le toca a…";
  - vista de las 4 siguientes;
  - **Cambiar esta semana** y **Cambiar un día**.

**Ajustes (solo admin)**
- Nombre con que se firma (Ing. José Soto).
- PIN: crear o cambiar; 4 a 6 dígitos.
- Correos que reciben el aviso.
- Estado de la cuenta que envía (laferre3matamoros@gmail.com).
- Es **una sola configuración para las dos empresas**.

**Bitácora**
- En la actividad: la misma tabla de la hoja de papel, por semana. Por cada tarea y día:
  - palomita, "no se pudo" o vacío;
  - quién lo hizo;
  - la firma con fecha y hora.
- Botón **Descargar PDF** (jsPDF, que ya está en el proyecto).

**Reportes, Inicio y recordatorios**
- Con rol semanal, "a quién le toca" un día se calcula con el rol de ESE día, también en semanas pasadas. Hoy Reportes usa `assigned_employee_ids` actual para todo el historial; con rol eso le pasaría las semanas de Eddie a Laura.
- "Falta firma" aparece como estado propio, no como "no hecha".
- Los recordatorios (cron) van solo a quien está de turno.

## Datos (Supabase)

Migración `supabase/010_lista_con_firma.sql`:

- `activities.checklist_enabled boolean default false`.
- `checklist_items`
  - columnas: id, activity_id, area, label, days int[], needs_photo, sort, archived_at;
  - archivar, no borrar.
- `activity_rotations`: activity_id (pk), employee_ids uuid[] (orden), anchor_week date (lunes en que le toca a `employee_ids[1]`).
- `activity_duty_overrides`: id, activity_id, from_date, to_date, employee_id. Una semana = lun–sáb; un día = from = to. Gana el más reciente.
- `checklist_runs`
  - columnas: id, activity_id, company_id, scheduled_date, employee_id;
  - status `in_progress | awaiting_signature | returned | signed`;
  - started_at, finished_at, was_late, notified_at, signed_at, signed_by_name, signed_via `pin | panel`, return_note, returned_at, completion_id;
  - único por (activity_id, scheduled_date).
- `checklist_marks`
  - columnas: run_id, item_id, area, label y needs_photo **copiados** al abrir la lista (la bitácora vieja no cambia si se renombra una tarea);
  - state `pending | done | skipped`, reason, photo_path, marked_by, marked_at;
  - pk (run_id, item_id).
- `signer_settings` (una fila): signer_name, pin_hash (pgcrypto `crypt` + `gen_salt('bf')`), notify_emails text[], failed_pin_attempts, pin_locked_until.
- Función SQL `duty_employee(activity, date)`: rol + cambios. Es la única fuente de verdad para las RPC. El panel tiene una copia en TS (`lib/duty.ts`) con las mismas pruebas.

**Seguridad.** Mismo patrón que el inventario:
- El teléfono escribe solo con RPC `SECURITY DEFINER`: `chk_open`, `chk_mark`, `chk_finish`, `chk_sign_pin`. Las tablas nuevas tienen RLS sin escritura para anon.
- Las RPC validan:
  - que el empleado esté de turno ese día;
  - el estado de la lista;
  - la ruta de las fotos, que debe existir en el depósito.
- `chk_sign_pin`:
  - un PIN de 4 dígitos se adivina en 10,000 intentos, así que tras **5 PIN equivocados** se bloquea la firma en persona 15 minutos y se avisa por correo;
  - nunca regresa el hash.
- Fotos en depósito **privado** `listas`, con ruta `<run>/<item>/<13 dígitos>.jpg`. El panel usa enlaces firmados de 1 h.
- Las fotos se borran a los 21 días, igual que la evidencia normal. Las palomitas, motivos y firmas se quedan.
- **Al firmar** (PIN o panel) se inserta la fila en `completions`:
  - `completed_at = finished_at`, `was_late` de la lista, `employee_id` de quien estaba de turno;
  - así Reportes y el ranking la cuentan sin cambios.
- **Candado para teléfonos viejos:** un trigger en `completions` rechaza la inserción directa para actividades con lista ("Esta actividad ahora se hace con la lista. Actualiza la app"). Solo la firma la crea.

**El correo.**
- Gmail con contraseña de aplicación y nodemailer, igual que en bfm-rrhh. Variables `CORREO_USUARIO` y `CORREO_CLAVE` en Vercel (laferre-admin).
- Al tocar "Terminé", la app llama a `/api/listas/aviso` con el id de la lista. El servidor manda el correo solo si la lista está en `awaiting_signature` y sin `notified_at`, y lo marca. Así cualquiera puede llamarlo sin riesgo.
- Respaldo: el cron de `/api/reminders` manda los que se hayan quedado sin aviso.

## Transición

1. El dueño corre `010_lista_con_firma.sql`.
2. Se sube el panel.
3. Se carga la lista de LIMPIEZA y el rol, y se pone el PIN y el correo.
4. Se manda la app por internet.
5. Se prende el interruptor en LIMPIEZA.
6. Se cambia su descripción ("pasar a firmar el documento" ya no aplica).

## Fuera de alcance

- Firma dibujada con el dedo.
- Notificación push al admin (el admin no tiene la app).
- Configuración de firma distinta por empresa.
- Cobertura parcial de un día entre dos personas.

## Pruebas

- `duty_employee` y `lib/duty.ts` con los mismos casos: rol que se repite, cambio de semana, cambio de un día, semanas pasadas.
- Script SQL de prueba que termina en `raise exception` (el editor no enseña NOTICE). Cubre RPC fuera de turno, PIN equivocado y bloqueo, foto inexistente, doble firma, y el trigger de `completions`.
- Reportes: una semana de Eddie sigue siendo de Eddie después de que el rol pasa a Laura.
- App: probada en web con datos de ejemplo, sin escribir en la base de producción.
