# Bitácoras en Reportes

**Fecha:** 2026-11-26 · **Aprobado por el dueño:** sí (sólo listas con firma; sólo para el admin)

## Lo que pidió

Ver las bitácoras de las actividades desde "Reportes y estadísticas", sin entrar a cada actividad.

## Diseño

- **Tarjeta "Bitácoras"** en Reportes (plegable, como "Día por día"), **sólo si el rol es admin**. Usa la semana del selector de Reportes.
- Un renglón por actividad con lista con firma: las que tienen `checklist_enabled` y no están archivadas, más cualquiera que tenga listas esa semana (si se apagó después). Resumen de lunes a sábado (igual que la hoja):
  - "X de Y días hechos": Y = días que tocaban hasta hoy; X = listas entregadas (`awaiting_signature` o `signed`). En color de aviso si faltó un día **ya pasado**; hoy no cuenta como faltante.
  - "N firmadas", "**N por firmar**" (aviso) y "N tareas no se pudieron".
  - Plegada: "2 listas · 1 por firmar · 1 día sin hacer".
- Al picar un renglón: `/actividades/[id]/bitacora?semana=AAAA-MM-DD&desde=reportes`. La hoja abre en esa semana (validada: un lunes, nunca futura) y lleva el botón "← Reportes", que regresa a `/reportes?semana=…`. Reportes toma esa semana al cargar.
- La hoja se queda en `/actividades/…`: el middleware ya no deja entrar a la practicante (no está en `INTERN_ALLOWED`).

## Piezas

- `lib/bitacora-summary.ts` (puro): `bitacoraSummary(acts, runs, skippedMarks, weekStart, today)`, `summaryChips`, `bitacorasPeek`. Pruebas.
- `components/reportes/BitacorasCard.tsx`.
- `app/reportes/page.tsx`: carga runs, actividades y marcas "no se pudo" de la semana (sólo admin) y lee `?semana=`.
- `app/actividades/[id]/bitacora/page.tsx`: `?semana=` y `?desde=reportes`.

Sin SQL ni OTA.
