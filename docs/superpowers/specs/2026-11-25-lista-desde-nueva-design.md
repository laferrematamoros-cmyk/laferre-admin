# Lista con firma desde "Nueva actividad"

**Fecha:** 2026-11-25 · **Aprobado por el dueño:** sí ("Todo en una pantalla")

## Problema

Para hacer una actividad con lista con firma hoy hay que crearla como actividad normal, guardarla, entrar a Editar y luego a "Lista con firma". Al dueño le parece confuso. Además, entre que se crea y se prende la lista, la actividad ya sale en los teléfonos como actividad normal de una foto.

## Lo que se construye

En **Nueva actividad** (sólo al crear), una tarjeta arriba: **"¿Cómo se marca?"**

- **Normal**: igual que hoy (una marca, con o sin foto).
- **Lista con firma**: varias tareas con foto y la firma del admin.

Con **Lista con firma** escogida:

- Se esconden "Quién" y "Pedir foto de evidencia" (en una lista los deciden el rol y la cámara de cada tarea). Se guarda `assigned_employee_ids = []`.
- Aparecen **Tareas** (áreas, tareas, días por tarea, 📷, subir/bajar/quitar) y **Rol semanal** (orden de personas y a quién le toca esta semana), iguales a los de la pantalla "Lista con firma".
- Una tarea nueva toma los días de la actividad (la pantalla de la lista sigue usando lunes a sábado).
- La vista previa dice "Lista · N tareas".
- **Crear actividad** pide al menos una tarea y una persona en el rol. Los errores salen en la barra de abajo antes de mandar nada al servidor.
- El servidor crea todo de un jalón: la actividad con la lista apagada, luego las tareas, el rol y por último prende la lista. Si falla un paso después de crear la actividad, borra la actividad (las tareas y el rol se van con ella por `on delete cascade`) y regresa el error. Así no queda una actividad a medias en los teléfonos.
- El aviso push "Nueva actividad" sale sólo cuando todo quedó guardado.

**No cambia:** Editar actividad, la pantalla "Lista con firma" (cambios de semana, quién la hace, bitácora) y pasar a lista una actividad normal que ya existe.

## Piezas

| Pieza | Qué hace |
|---|---|
| `components/actividades/ChecklistTasks.tsx` (nuevo) | Editor de áreas y tareas, controlado (`draft`, `onChange`, `defaultDays`). Sale de `ChecklistEditor`. |
| `components/actividades/RotationPicker.tsx` (nuevo) | Orden del rol y "le toca esta semana", controlado. Sale de `ChecklistEditor`. |
| `ChecklistEditor.tsx` | Usa las dos piezas; se porta igual que antes. |
| `lib/checklist-config.ts` → `checkNewList` | Regla pura: tareas válidas (≥1), rol válido (1–20, sin repetidos) y la persona de esta semana dentro del rol. Regresa el rol ya girado. |
| `lib/checklist-create.ts` (nuevo) → `insertListActivity(db, row, items, order, today)` | Los cuatro pasos y el deshacer. Recibe la base para poder probarlo sin tocar producción. |
| `app/actividades/actions.ts` → `createChecklistActivity` | Pide admin y empresa permitida, revisa que el rol sea de empleados activos de esa empresa y llama a `insertListActivity`. |
| `ActivityForm.tsx` | Tarjeta "¿Cómo se marca?", secciones de lista, validación y `onSubmit(v, list?)`. |
| `app/actividades/nueva/page.tsx` | Con lista llama a `createChecklistActivity`; si no, a `createActivity`. |

## Pruebas

- Jest: `checkNewList` (casos buenos y malos) e `insertListActivity` con base de mentiras (orden de pasos, rol girado, deshacer si fallan las tareas, el rol o el prendido).
- `tsc`, `lint`, compilación de producción.
- En local con la compilación de producción, a 1280 y 390 px, **sin crear nada**: escoger lista, agregar áreas y tareas, rol, y los errores de validación (que se detienen antes del servidor). En local se escribe en la base de verdad.
- La primera actividad real la crea el dueño ya en producción.
