# Capacitaciones de Actividades en la ficha de RH y su constancia (parte 2 de 3)

**Fecha:** 2026-11-27 · **Aprobado por el dueño:** sí (una hoja con todas)

Sigue a `2026-11-26-puente-rh-design.md`.

## Panel

- `GET /api/rh/capacitaciones?persona=<uuid>`: igual que `/api/rh/personas`, con `PUENTE_RH_SECRETO` y sólo lectura. 400 sin persona, 404 si ya no existe.
- `lib/rh-capacitaciones.ts` (`buildTrainingReport`): junta `cap_list` (versión actual de las prendidas) con `training_progress` (todas las versiones):
  - por capacitación: estado, plazo y la terminación más nueva (forma "Entendida" o "En persona", fecha, quién);
  - `versionNueva` si la terminó antes y le falta la actual;
  - las pausadas sólo salen si alguna vez la terminó.
  - Resumen: hechas/total de las prendidas, nivel y terminadas.

## RH

- `api/actividades.js`: acción `capacitaciones` con el uuid validado (lista cerrada; nunca se reenvía lo que manda el navegador).
- `CapacitacionesActividades.jsx` en la pestaña Capacitaciones, debajo del vínculo, sólo admin/rh con ficha vinculada:
  - avance "N de M · Nivel X";
  - un renglón por capacitación con su estado (`estadoDe`).
- Botón **"Constancia de capacitaciones"** (`generarConstanciaActividades.js`), carta vertical de la misma familia que la constancia de capacitación:
  - contenido: logos de Ajustes, datos de la ficha (CURP, puesto, empresa, ingreso), la tabla de lo terminado (`filasConstancia`), el resumen, qué significa cada forma y firmas del trabajador y del encargado;
  - si no cabe, sigue en otra hoja;
  - se descarga con `guardarPdf` (sirve en el iPhone) y se guarda con `guardarPdfEnExpediente` (cat. capacitación, `origen: 'actividades'`).

Sin SQL ni OTA.
