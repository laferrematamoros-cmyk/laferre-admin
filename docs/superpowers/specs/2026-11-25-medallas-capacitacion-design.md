# Medallas de capacitación

**Fecha:** 2026-11-25 · **Aprobado por el dueño:** sí

## Lo que pidió

Cuando un empleado o la practicante confirma que entendió una capacitación, que tenga una medalla de esa capacitación.

## Decisiones del dueño

- Se ve en cuatro lugares: festejo al tocar "Entendí", vitrina arriba de su lista, cada renglón de "Listas" y la tabla de Avance del admin.
- La misma medalla con "Entendí" que con "Capacitado en persona".
- Versión nueva: la medalla vuelve a gris hasta que la confirme otra vez.
- Un solo dibujo para todas (medalla dorada con estrella y listón rojo), con el nombre abajo.

## Regla

`tiene medalla = isDone(status)` (`understood` o `trained`) de la versión actual. Sin cambio en la base: `cap_rows` ya calcula el estado por versión, así que una versión nueva regresa a `pending` y la medalla sale gris. Las pausadas no salen (no vienen en `cap_list` ni en `cap_matrix`).

Vitrina: primero las ganadas, luego las que faltan; dentro de cada grupo por `sort_order`.

## Dónde

1. **Festejo** (`TrainingViewer`, pantalla final): con `understood` o `trained` la ✓ se cambia por la medalla, que entra con una animación corta (crece, gira un poco y brilla dos veces), y el texto "¡Ganaste la medalla de *título*!". Con "Tengo dudas" queda igual que hoy. Se anima aunque el equipo pida reducir movimiento (el dueño lo tiene así y quiere verlas).
2. **Vitrina**:
   - Practicante (`MyTrainingList`): la tarjeta de arriba dice "**N de M medallas**", con la barra de colores de hoy y una tira que se desliza con todas las medallas.
   - Teléfono (`app/(employee)/capacitacion.tsx`): la tarjeta de resumen igual, con "N de M medallas" y la tira.
3. **Renglones de "Listas"**: medalla chica en lugar de la ✓ (teléfono) o junto al título (practicante).
4. **Avance** (`Matrix`): las celdas terminadas llevan medalla; la leyenda junta Entendida y En persona en "Con medalla"; la columna "Avance" se llama "Medallas" y el chip dice "N de M medallas". La ficha de la celda sigue diciendo si fue entendida o en persona.

## Piezas

- Panel: `lib/capacitaciones/medals.ts` (puro: `hasMedal`, `medalShelf`, `medalCount`), `components/capacitaciones/Medal.tsx` (SVG, `earned`, `size`) y `MedalShelf.tsx` (tira).
- App: `medalShelf`/`medalCount` en `lib/training.ts` y `components/Medal.tsx` con `react-native-svg` (ya está en la APK: va por OTA).

## Cómo se sube

Panel en la rama `medallas` encima de `capacitaciones-nuevas` (un "súbelo" lleva las 7 nuevas y las medallas). App en la rama `medallas` encima de `varias-fotos` (un "sí, mándala" lleva varias fotos y medallas).

## Pruebas

Jest de las reglas en las dos; `tsc`; compilación del panel; en local a 390 px con y sin reducir movimiento, sin guardar.
