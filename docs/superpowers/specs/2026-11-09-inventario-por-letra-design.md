# Inventario por letra — diseño

Fecha: 2026-11-09 · Estado: aprobado por el dueño en la conversación; falta que revise este documento.
Toca dos repos: **laferre-admin** (panel, cron, SQL) y **laferre-actividades** (app de teléfonos, APK sin OTA).

## Objetivo

Cada cierto tiempo (cada 4, 6 u 8 semanas, o lo que se configure) la tienda hace un inventario
completo, estante por estante. Cada estante tiene una letra (A, B, C…). Por cada letra queda
evidencia: foto del estante con la letra, fotos del reporte de diferencias de Sicar
(artículo · había · se contó), el estado del área, observaciones, mejora propuesta, qué se hizo
y si las diferencias quedaron resueltas. Lo que no quedó resuelto pasa a una lista de pendientes
para el dueño.

Reemplaza a las dos actividades "Inventario mensual" (Lun-Vie y Sábado, 2ª semana) que hoy se
cumplen con una sola foto.

## Decisiones tomadas (con el dueño)

| Tema | Decisión |
|---|---|
| Qué son las diferencias | Diferencias de inventario contra Sicar: faltantes **y** sobrantes. |
| Evidencia de diferencias | Fotos del reporte de Sicar. **No** se escribe cada producto en la app. |
| Reporte de Sicar | Se supone uno por letra (al terminar cada estante). Si resulta ser uno solo al final, se mueve al cierre de la ronda. |
| Quién lo hace | Entre todos: cada quien toma la letra que quiera; queda registrado quién la tomó y quién la terminó. |
| Cómo se abre | Sola, cada N semanas desde una fecha de inicio. Además, botón "Abrir ronda ahora" para una extra. |
| Plazo | Configurable en el panel, en **días o semanas** (base: 1 semana). |
| Calificaciones | No entra al % diario del Dashboard ni de Reportes. Tiene su propia sección. En el ranking de empleados se agrega cuántas letras hizo cada quien. |

## Lo que ve el empleado (app de teléfonos)

- **Inicio:** mientras haya una ronda abierta, una tarjeta "Inventario de diciembre · 7 de 18 letras ·
  quedan 3 días" con botón **Entrar** (debajo de la tarjeta negra de "lo que toca ahora").
- **Pantalla del inventario:** avance arriba y cuadrícula de letras:
  gris = pendiente · azul = "en proceso — Laura" · verde = hecha (con quién) ·
  naranja = "rehacer" (con la nota del dueño) · rojo = pendiente con el plazo vencido.
- **Tomar una letra:** botón "Empezar letra A". Si otra persona la tiene en proceso, avisa
  "Laura la empezó, ¿la tomas tú?" y deja tomarla.
- **Ficha de la letra** (pasos):
  1. Foto del estante con la letra visible — obligatoria.
  2. Fotos del reporte de Sicar, botón "+ otra página" — al menos una.
  3. Estado del área: Bien / Regular / Mal — obligatorio. Con Regular o Mal, "Observaciones" es obligatorio.
  4. Observaciones, mejora propuesta, qué se hizo (texto libre).
  5. ¿Hubo diferencias? Sí/No — obligatorio. Si Sí: ¿quedaron solucionadas? Sí/No. Si No: "¿Qué falta por resolver?" — obligatorio.
  6. **Terminar letra A**.
- Se puede salir a media ficha: los textos y las fotos tomadas se guardan en el teléfono
  (borrador por ficha) y siguen ahí al volver.

## Lo que ve el dueño (panel) — sección nueva "Inventario"

1. **Ronda actual:** "Diciembre · abierta el 1 · vence el 7 · 7 de 18 letras · En curso / Terminada / Atrasada".
   Cuadrícula de letras; al dar clic, la ficha completa (fotos con zoom, estado, textos, quién y a qué hora)
   y **lo de la ronda anterior para esa letra**. Botón **"Pedir que se rehaga"** con comentario:
   la regresa a pendiente y en el teléfono sale en naranja con la nota.
2. **Historial de rondas:** cada una con su resultado (terminada a tiempo, tarde o cerrada incompleta),
   cuántas letras y cuántos días tomó.
3. **Pendientes del inventario:** todas las diferencias no resueltas de todas las rondas (letra, qué falta,
   quién lo reportó, cuándo). Botón **"Resuelto"** con nota opcional. Numerito en el menú con cuántas van.
4. **Quién hizo qué:** letras hechas por empleado en la ronda y en las anteriores. También como columna
   en el ranking de Reportes.
5. **Configuración** (administradores): letras de la empresa (agregar, quitar, ordenar, nombre
   "A — Tornillería"); frecuencia (cada N semanas, desde qué fecha); plazo (número + días/semanas);
   interruptor para pausar; "Abrir ronda ahora".

## Reglas del calendario

- La ronda programada abre el día que toca a las **08:00 hora de Matamoros**
  (fechas programadas = fecha de inicio + k × N semanas, k ≥ 0).
- **Vencimiento:** con plazo de P días, el último día es el de apertura + P − 1, y vence al terminar ese día
  (23:59 Matamoros). "1 semana" = 7 días: abre lunes 1, último día domingo 7.
- Nunca hay dos rondas abiertas. Si llega la fecha de la siguiente y la anterior sigue abierta,
  la anterior se cierra como **"cerrada incompleta"** (sus letras pendientes quedan en rojo en el historial)
  y se abre la nueva.
- La ronda se cierra sola (**terminada**) cuando se termina la última letra. A tiempo si fue antes del
  vencimiento; tarde si fue después.
- Las letras de la ronda se copian al abrirla (código, nombre, orden): cambiar las letras en la
  configuración no altera una ronda ya abierta.
- "Abrir ronda ahora" crea una ronda sin fecha programada; no mueve el calendario. Si hay una abierta, no deja.

## Avisos (push a los teléfonos de la empresa)

- Al abrir: "Empezó el inventario de diciembre: 18 letras, tienen hasta el domingo 7".
- Cada día a las **10:00**, mientras falten letras: "Faltan 6 letras del inventario, quedan 3 días".
- El último día, además a las **13:00**.
- Cada aviso se manda **una sola vez** aunque el cron corra cada 5 minutos (se anota en la ronda).

## Datos — migración `supabase/007_inventario.sql`

La corre el dueño en el SQL Editor (el MCP de Supabase no ve este proyecto).

- **`inventory_plans`** — una fila por empresa: `company_id` (único), `every_weeks` int ≥ 1,
  `first_open_date` date, `due_amount` int ≥ 1, `due_unit` ('days' | 'weeks'), `is_active` bool, `updated_at`.
- **`inventory_letters`** — `id`, `company_id`, `code` (texto corto, único por empresa), `name` (opcional),
  `sort_order`, `is_active`.
- **`inventory_rounds`** — `id`, `company_id`, `scheduled_for` date (null si fue manual), `opened_at`,
  `due_at`, `closed_at` (null = abierta), `close_reason` ('completed' | 'superseded'), `notices` jsonb
  (avisos ya mandados: 'open', 'daily:AAAA-MM-DD', 'last:AAAA-MM-DD'), `opened_by` ('cron' o id de admin).
- **`inventory_sections`** (una ficha por letra y ronda) — `id`, `round_id`, `company_id`, `letter_id`,
  copia de `code`/`name`/`sort_order`, `status` ('pending' | 'in_progress' | 'done'), `claimed_by`,
  `claimed_at`, `done_by`, `done_at`, `shelf_photo`, `report_photos` text[], `area_state`
  ('bien' | 'regular' | 'mal'), `observations`, `improvement`, `action_taken`, `had_differences`,
  `differences_resolved`, `pending_note`, `redo_note`, `redo_requested_at`. Único (`round_id`, `letter_id`).
- **`inventory_pendings`** — `id`, `company_id`, `round_id`, `section_id`, `note`, `reported_by`,
  `reported_at`, `resolved_at`, `resolved_by`, `resolution_note`.

**Permisos:** anon (la app) sólo **lee** rondas, fichas y letras (como las demás tablas operativas).
No lee planes ni pendientes. **Ninguna escritura directa de anon**: el teléfono escribe sólo con
funciones `SECURITY DEFINER` que validan todo. El panel escribe con server actions (service_role),
con las reglas de empresa que ya existen (`adminAccess`, `ownsRow`, `pick`).

## Funciones para la app (RPC, `SECURITY DEFINER`, permitidas a anon)

- **`inv_claim_section(p_section, p_employee, p_force)`** — la ronda está abierta; el empleado existe,
  está activo y es de la empresa de la ronda; la ficha no está `done`. Si está `in_progress` con otra persona,
  sólo con `p_force = true`. Pone `in_progress`, `claimed_by`, `claimed_at`.
- **`inv_finish_section(p_section, p_employee, p_shelf_photo, p_report_photos, p_area_state, p_observations,
  p_improvement, p_action_taken, p_had_differences, p_differences_resolved, p_pending_note)`** —
  la ficha está `in_progress` y tomada por `p_employee`; la ronda sigue abierta; cada foto tiene la forma
  `<round_id>/<section_id>/<13 dígitos>.jpg` y existe en el depósito `inventario`; hay foto del estante y al
  menos una del reporte; reglas de obligatorios de la ficha (Regular/Mal → observaciones; diferencias no
  resueltas → `pending_note`). Pone `done`, `done_by`, `done_at`, borra `redo_note`; si hay diferencias no
  resueltas crea la fila en `inventory_pendings`; si era la última letra, cierra la ronda (`completed`).
- **Fotos:** depósito nuevo **`inventario`**, lectura pública. Anon sólo puede **subir** archivos cuya
  primera carpeta sea una ronda abierta (política de storage). Sin actualizar ni borrar. La limpieza de
  21 días (`/api/cleanup`) no toca este depósito.

## Panel — server actions

`saveInventoryPlan`, `saveInventoryLetter` / `reorderInventoryLetters` / `toggleInventoryLetter`,
`openInventoryRoundNow`, `requestSectionRedo(sectionId, note)` (vuelve la ficha a `pending`, limpia
`claimed_by`, borra el pendiente no resuelto de esa ficha si lo había), `resolveInventoryPending(id, note)`.
Regla de los archivos `'use server'`: `export type Result = ActionResult`, nunca `export type { … }`
(ver `lib/__tests__/use-server-exports.test.ts`).

## Cron

`/api/reminders` (cada 5 min, cron-job.org con `CRON_SECRET`) llama además a `inventoryTick(now)`:
abrir la ronda que toca (y cerrar como `superseded` la anterior si sigue abierta), mandar los avisos
pendientes del momento y anotarlos en `notices`. La lógica de decisión vive en funciones puras
(`lib/inventory-schedule.ts`) para poder probarla sin base de datos.

## App — piezas nuevas

- `app/inventario.tsx` (cuadrícula) y `app/inventario/[id].tsx` (ficha), tarjeta en el inicio.
- Borrador por ficha en AsyncStorage (`@inv_draft_<sectionId>`): textos, elecciones y fotos
  (ruta subida o, si no hubo señal, la foto local para reintentar al terminar).
- Cada foto se sube al tomarla a `inventario/<round>/<section>/<Date.now()>.jpg`; "Terminar letra"
  manda todo con `inv_finish_section`.
- Mismo estilo del panel (tarjetas de vidrio, Geist, íconos dibujados, animaciones con "reducir movimiento").

## Pruebas

- **Funciones puras (jest):** fechas programadas y siguiente apertura; vencimiento a partir del plazo en días
  o semanas; estado de la ronda (en curso, atrasada, terminada a tiempo o tarde, cerrada incompleta); qué
  aviso toca y si ya se mandó; qué le falta a una ficha para poder terminarse.
- **Panel:** verificar las server actions con la compilación de producción (preview de Vercel con
  `AUTH_SECRET` de prueba), no sólo con `next dev`.
- **App:** export web con escrituras bloqueadas y datos de ejemplo; capturas de cuadrícula, ficha y tarjeta.
- **SQL:** probar las RPC con la llave anon contra casos que deben fallar (ronda cerrada, letra de otra
  empresa, ficha tomada por otro sin forzar, foto con ruta ajena) antes de usarlo con datos reales.

## Arranque

1. El dueño corre `007_inventario.sql`.
2. Se sube el panel; el dueño da de alta sus letras, la frecuencia, el plazo y la fecha de la primera ronda.
3. Se apagan las dos actividades "Inventario mensual" (Lun-Vie y Sábado) cuando abra la primera ronda.
4. APK nueva (La Ferre y BFM) con esto y con lo ya hecho el 2026-11-09 (inicio nuevo, foto, Conoce).

## Fuera de alcance (por ahora)

Capturar producto por producto en la app · conexión con Sicar · PDF del inventario · repartir letras por
persona · modo completamente sin conexión (más allá del borrador por ficha).
