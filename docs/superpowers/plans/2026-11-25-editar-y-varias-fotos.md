# Editar en una sola pantalla + varias fotos: plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Pasos con `- [ ]`.

**Goal:** Editar actividad con la lista adentro (un solo Guardar) y tareas que piden de 1 a 6 fotos.
**Architecture:** Reglas puras en `lib/checklist-config.ts` (`photo_count`, `checkList` con ids); guardado en `lib/checklist-create.ts` (`syncItems` + `insertListActivity`) probado con base de mentiras; acción `updateActivityWithList`; `ActivityForm` sirve para crear y editar; `DutyChanges` sale de `ChecklistEditor` (que se borra). App en rama aparte `varias-fotos` (ayudante).
**Tech Stack:** Next.js 16, React 19, Supabase JS, Jest/ts-jest, PGlite para el SQL.

**Reglas:** rutas explícitas en `git add`; en local no guardar; subir sólo con "súbelo"; OTA sólo con "sí, mándala"; el dueño corre el SQL.

### Task 1: SQL 013 (hecho)
- [x] `supabase/013_varias_fotos.sql` + `013_varias_fotos_prueba.sql`; PGlite: 9/9 nuevas y 26/26 de 010; idempotente.

### Task 2: `photo_count` en las reglas
- [ ] `ItemInput.photo_count` (1–6; falta → 1; fuera de rango → error "La tarea N pide demasiadas fotos."). `cleanItems` lo limpia; con `needs_photo=false` queda 1.
- [ ] `checkList(items, order, current)` = como `checkNewList` pero conserva `id`; `checkNewList` la usa y quita ids.
- [ ] Pruebas en `checklist-config.test.ts`. Commit.

### Task 3: guardar con `photo_count` y `syncItems`
- [ ] `insertListActivity` escribe `photo_count`.
- [ ] `syncItems(db, activityId, items)`: lee las vivas, rechaza ids ajenos ("Una tarea ya no existe. Recarga la página."), actualiza las que traen id (con `sort` y `photo_count`), inserta las nuevas, archiva las que faltan. Pruebas con base de mentiras. Commit.

### Task 4: acciones
- [ ] `updateActivityWithList(id, input, list | null)`: admin + `ownsRow`; con lista: `checkList`, si `rotChanged` revisa empleados de la empresa e inserta versión del rol (`mondayOf(hoy)`, `valid_from` hoy); si no, exige que ya haya rol; `syncItems`; al final `update(pick(EDITABLE) + checklist_enabled + assigned [] si lista)`.
- [ ] `getChecklistConfig` lee `photo_count`. Quitar `saveChecklistItems`, `saveRotation`, `setChecklistEnabled` si ya nadie las usa. Commit.

### Task 5: selector de fotos
- [ ] `TaskDraft.photo_count`; en `ChecklistTasks` el botón de cámara → `<select>` "Sin foto / 1 foto … 6 fotos" (aria-label "Fotos de <tarea>"). Commit.

### Task 6: pantalla única de Editar
- [ ] `DutyChanges` (próximas semanas + cambiar semana/día + lista de cambios) sale de `ChecklistEditor`.
- [ ] `ActivityForm`: "¿Cómo se marca?" también al editar; props `initialList` y `rolExtra`; `NewList.rotChanged`; usa `checkList`.
- [ ] `app/actividades/[id]/page.tsx`: carga `getChecklistConfig`, arma `initialList`, guarda con `updateActivityWithList`; se quita el botón "Lista con firma".
- [ ] `/lista` → `redirect` a la actividad; bitácora → "Editar actividad". Borrar `ChecklistEditor`. Commit.

### Task 7: etiquetas
- [ ] Actividades: con lista, chips "Esta semana: X" (con `loadActivities(..., {from: hoy, to: hoy})` y `dutyOn`) y "Lista · N tareas"; sin "General" ni "Pide foto". Commit.

### Task 8: varias fotos al firmar y en el Calendario
- [ ] `SignMark.photoUrls: string[]` (lee `photo_paths`, o `photo_path` si viene vacío); `SignDialog` enseña todas; "Por firmar" cuenta todas; `listShots` una por foto ("Llantas · 2 de 4"). Limpieza: `photo_paths: null` junto con `photo_path`. Pruebas. Commit.

### Task 9: verificación
- [ ] `npx jest`, `npx tsc --noEmit`, compilación con `AUTH_SECRET=solo-local-prueba-reportes`.
- [ ] Local a 1280 y 390 px sin guardar: Editar LIMPIEZA y REVISAR UNIDADES (lista adentro, cambios de semana visibles), Normal sin cambios, Nueva actividad, selector de fotos, Actividades con chips. Requiere el SQL 013 ya corrido (lee `photo_count`).
