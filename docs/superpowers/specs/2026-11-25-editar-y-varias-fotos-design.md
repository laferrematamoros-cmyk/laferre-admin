# Editar en una sola pantalla + varias fotos por tarea

**Fecha:** 2026-11-25 · **Aprobado por el dueño:** sí

## Lo que pidió

1. Algunas tareas piden varias fotos (llantas: 4).
2. Es confuso tener que picar otro botón para ver la lista: juntar Editar actividad y Lista con firma.
3. ¿Por qué sale "General" si sólo puso a Esteban? Es sólo la etiqueta del panel: el teléfono enseña la lista al de turno y Reportes e Inicio ya cuentan con el rol. Lo arreglan 1 y 2.

## 1. Editar en una sola pantalla

- En Editar también sale **"¿Cómo se marca?"** (Normal / Lista con firma). Reemplaza el interruptor prendida/apagada. Regresar a Normal apaga la lista y deja guardadas sus tareas y su rol.
- Con Lista: Tareas, Rol semanal y, debajo del rol, "Quién la hace" (próximas semanas) y "Cambiar esta semana / un día" con su lista de cambios. Los cambios de semana o día se guardan al momento (como hoy).
- **Guardar cambios** guarda la actividad, las tareas y el rol (el rol sólo si cambió: nueva versión desde hoy). Orden: tareas → rol → actividad. Si algo falla, se dice cuál y no se sigue.
- `/actividades/[id]/lista` manda a `/actividades/[id]`. Se quitan `ChecklistEditor` y las acciones que sólo él usaba. La bitácora apunta a "Editar actividad".
- Vista previa y tarjeta de Actividades: con lista enseñan **"Esta semana: NOMBRE"** y **"Lista · N tareas"** en lugar de "General" y "Pide foto".

## 2. Varias fotos

- SQL `013_varias_fotos.sql` (probado en PGlite con las pruebas de 010 y las nuevas de `013_varias_fotos_prueba.sql`): `checklist_items.photo_count` y `checklist_marks.photo_count` (1–6), `checklist_marks.photo_paths`; `chk_mark(…, p_photos text[] default null)`; `chk_open` regresa `photo_count` y `photo_paths`; `chk_return` borra `photo_paths`. Con todo en 1 foto se porta igual que antes, y la app vieja sigue sirviendo en tareas de 1 foto.
- Panel: el botón de cámara de cada tarea se vuelve un selector "Sin foto / 1 foto … 6 fotos". Firmar, Calendario y la cuenta de fotos de "Por firmar" enseñan todas. La limpieza diaria también borra `photo_paths`.
- App: "Foto 1 de 4…", no marca hasta tener todas; con 1 foto igual que hoy. Se manda por internet sólo con "sí, mándala".

## Orden para subir

SQL 013 → panel → app por internet. El panel nuevo lee `photo_count`, así que va después del SQL.

## Pruebas

Jest de las reglas puras y de guardar (base de mentiras), `tsc`, compilación; en local a 1280 y 390 px sin guardar; PGlite para el SQL.
