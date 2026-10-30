# Rediseño de Reportes — diseño

**Fecha:** 2026-10-30 · **Estado:** aprobado en maqueta, pendiente de revisión escrita
**Maqueta aprobada:** https://claude.ai/artifact/44EbTPimzFGKKkkWMF9ndz (versión "Claro premium")

## 1. Por qué

La pantalla de Reportes no se entiende y, en la semana en curso, da números equivocados.

1. **El cálculo cuenta como "no realizado" lo que todavía no toca.** `computeWeek` (`lib/reports.ts`) suma como no hecha cualquier actividad sin completar, incluidas las de hoy que no llegan a su hora límite y las de días que no han llegado. La semana del 26 de octubre marcaba 71% cuando de lunes a jueves iba en 97%. La tarjeta decía "No realizadas (15)" y adentro sólo enlistaba 1, porque la lista sí filtra los días pasados.
2. **La consulta está a punto de perder datos.** Reportes descarga todas las filas de `completions` desde la primera (`select('*')` sin orden ni rango). La base entrega como máximo 1,000 filas y no avisa. El 2026-10-30 había **985**. Con unas 50 por semana, la siguiente semana empieza a faltar información, y como no hay orden, no se sabe cuál.
3. **La presentación confunde:**
   - La fecha dice "26 al 1 de octubre".
   - El selector usa "Semana 44".
   - El ranking ignora la semana elegida y cuenta volumen, no cumplimiento.
   - Hay seis botones para cambiar el tipo de gráfica.
   - Hay números sin nombre.
   - El verde significa dos cosas distintas.
   - La tendencia pone un porcentaje en cada punto.

## 2. Alcance

**Entra:**
- La pantalla `/reportes` completa: cálculo, carga de datos, presentación y PDF.
- **Base del estilo nuevo**, que se verá en todas las pantallas porque es compartida: letra Geist y menú lateral (`AdminShell`).

**No entra:**
- El contenido de las demás pantallas. Cada una se rediseña después, en su turno.
- La app de los empleados (APK).
- El cálculo del Dashboard.

## 3. Reglas de conteo

Cada actividad programada en un día tiene **uno** de cuatro estados. "Vence" = la fecha programada a la hora `limit_time`, en hora local.

| Estado | Cuándo |
|---|---|
| **A tiempo** | Hay registro en `completions` para esa actividad y fecha, con `was_late = false`. |
| **Tarde** | Hay registro, con `was_late = true`. |
| **Sin hacer** | No hay registro y ya pasó la hora en que vence. |
| **Por hacer** | No hay registro y todavía no vence (más tarde hoy o un día que no ha llegado). |

- **Porcentaje = hechas ÷ (hechas + sin hacer).** "Por hacer" no entra. Si el divisor es 0, no se muestra porcentaje, sino "Todavía no toca nada esta semana".
- Lo hecho tarde cuenta como cumplido, y el número de tarde se muestra siempre junto al porcentaje.
- **Semáforo** (se queda igual que hoy):
  - 90% o más: verde, "Vamos bien".
  - 70 a 89%: ámbar, "Vamos regular".
  - Menos de 70%: rojo, "Vamos mal".

  Siempre va con ícono y palabra, nunca sólo el color.
- **Comparación:** el porcentaje de la semana anterior, calculado con las mismas reglas.
- Se conservan las reglas que ya existen: días de la semana y semana del mes (`activityRunsOn`), y la actividad sólo cuenta desde que se creó (`created_at` ≤ fin del día).
- Para una semana ya terminada, el resultado es el mismo que hoy, porque nada queda "por hacer". Esto sirve de prueba.

### Por persona

| Columna | Cuenta |
|---|---|
| **Hechas** | Registros de la semana con `employee_id` de esa persona, sobre actividades de la empresa. Incluye las generales que tomó. |
| **Tarde** | De esas hechas, las que tienen `was_late`. |
| **Sin hacer** | Actividades asignadas a su nombre (`assigned_employee_ids` incluye su id) que vencieron sin registro. Si una actividad tiene varios asignados y nadie la hizo, cuenta para cada uno. |

- Las **generales** (sin asignados) que vencieron sin hacerse van en un renglón aparte, **"Generales"**.
- **Orden:** más "sin hacer" primero, luego más "tarde", luego más "hechas" y al final por nombre.
- Los empleados activos sin nada en la semana van al final, atenuados, con la leyenda "Sin actividades esta semana".
- La barra de cada persona mide hechas + sin hacer, a escala de la persona con más, y va partida en a tiempo, tarde y sin hacer.
- **El practicante** ve nombres, barras y una etiqueta sin cifras ("Al día" o "Con pendientes"), pero **ningún número por persona**, tampoco en los globos de ayuda. Así se mantiene la regla actual.

### Lectura rápida

Son tres frases que la pantalla arma con los números de la semana, en este orden:

1. **Sin hacer:**
   - Si hay: "2 quedaron sin hacer" ("1 quedó sin hacer" si es una), con los responsables abajo ("YAJAIRA (1) · Generales (1)"). El practicante ve los nombres sin la cantidad de cada uno ("YAJAIRA · Generales").
   - Si no hay: "No quedó nada sin hacer", en verde.
2. **Tarde:** se usa *r* = tarde ÷ hechas.
   - Si *r* ≥ 0.5: "La mitad o más se hizo tarde".
   - Si no: "1 de cada N se hizo tarde", con N = redondeo de hechas ÷ tarde.
   - Debajo: "13 de 36". Si un solo día tiene el 40% o más de lo tarde, se agrega ", sobre todo el lunes".
   - Si no hubo nada tarde: "Todo lo hecho fue a tiempo", en verde.
   - Si no se ha hecho nada, se omite.
3. **Comparación:**
   - "Mejor que la semana pasada", "Peor que la semana pasada" o "Igual que la semana pasada", con "95% contra 90%" debajo.
   - Si no hay semana anterior con datos, se omite.

## 4. La pantalla, de arriba hacia abajo

1. **Encabezado:**
   - Arriba, el nombre de la empresa en letra chica, luego el título "Reportes" y debajo "Semana del 26 de octubre al 1 de noviembre". Se corrige `weekLabel` para cuando la semana cruza de mes.
   - El selector es **‹ 26 oct – 1 nov ›**, con flechas. Reemplaza al `<input type="week">`. La flecha de adelante se apaga en la semana actual.
   - Botón **"Esta semana"** y botón **PDF**, negro, como acción principal.
2. **Resumen y Lectura rápida**, lado a lado (una columna en pantallas angostas):
   - **Resumen:** un aro con el porcentaje, la etiqueta del semáforo y la frase "Se hizo el 95% de lo que ya tocaba: 36 de 38".
   - Debajo: la comparación con la semana pasada y **una barra con todas las actividades de la semana**, partida en a tiempo, tarde, sin hacer y por hacer, con el número de cada parte escrito abajo.
3. **Por persona.**
4. **Lo que no se hizo:**
   - Cada renglón trae actividad, día, hora límite y responsable ("General (nadie la tomó)" si no tiene dueño).
   - Si no hay ninguna, una línea verde que dice "No quedó nada sin hacer".
5. **Más detalle.** Cerradas al abrir la pantalla; se recuerda si el usuario las abrió, igual que hoy con `localStorage`. Cada encabezado muestra un resumen de una línea aunque esté cerrada.
   - **Día por día:**
     - Columnas apiladas en a tiempo, tarde, sin hacer (rojo) y por hacer (gris).
     - Arriba de cada columna dice "hechas/programadas".
     - Hoy va marcado con una etiqueta "HOY" y un fondo suave.
     - Al pasar el mouse sale el desglose.
   - **Semanas pasadas:**
     - Las últimas 12 semanas en una línea, con la franja de la meta (90% a 100%) en verde.
     - Puntos de color según el semáforo.
     - Sólo llevan número la semana elegida (la última de la línea) y la peor. Si la elegida es la actual, su tramo va punteado y dice "en curso". Si es una semana pasada, ya está completa y va con línea normal. La etiqueta "HOY" de "Día por día" sólo aparece cuando la semana elegida incluye el día de hoy.
     - Línea vertical guía y globo al pasar el mouse. Al tocar un punto se abre esa semana.

**Se quitan:**
- `ChartTypeToggle`.
- Los selectores Semanas, Meses y Años.
- `EmployeeRanking`.
- Las tres cajitas del resumen actual.
- La leyenda "A tiempo + Tarde + No realizadas = …".

## 5. Datos

- Actividades de la empresa: igual que hoy (`is_active` o `week_of_month` no nulo).
- **Registros (`completions`):**
  - Sólo de las actividades de la empresa (`.in('activity_id', ids)`).
  - Sólo del rango necesario: 12 semanas que terminan en la elegida, o sea del lunes de **11 semanas antes** al domingo de la semana elegida. Es justo lo que pinta "Semanas pasadas" y ya incluye la semana anterior para la comparación.
  - Columnas: `activity_id, employee_id, scheduled_date, was_late`.
  - **Paginado:** con `.order('scheduled_date').order('id')` y `.range()` en bloques de 1,000, hasta que un bloque regrese menos de 1,000. Sin orden, la paginación pierde filas sin avisar.
- Se vuelve a cargar al cambiar a una semana fuera del rango ya cargado.
- Volumen esperado: unas 600 filas chicas por carga. Hoy se bajan 985 filas completas.
- Se deja de consultar "la primera fecha de todas".

## 6. Estilo: la base que estrena Reportes

- **Letra Geist**, con `next/font/google` en `app/layout.tsx`, en lugar de Inter.
- **Colores de estado nuevos.** Se revisaron con el validador de daltonismo de la guía de gráficas:
  - A tiempo `#0A7D55`
  - Tarde `#E8930C`
  - Sin hacer `#E11D2E`
  - Por hacer `#DEDEE4`

  Cada uno tiene su versión suave para fondos y su tono oscuro para texto. El ámbar viejo, `#F2A20C`, casi no se veía sobre blanco. Van como tokens en `globals.css`.
- **Menú lateral (`AdminShell`):**
  - Flotante, con 12 px de margen, esquinas de 22 px y un degradado negro.
  - La opción activa lleva un degradado rojo con un brillo suave.
  - En el celular se queda como cajón, igual que hoy.
- **Tarjetas:** blanco translúcido con desenfoque, borde de 1 px muy tenue, sombra en capas y esquinas de 24 px.
- **Píldoras y botones:** redondos.
- **Fondo de Reportes:** un brillo rojo suave arriba y una retícula de puntos que se desvanece. Por ahora sólo en esta pantalla; las demás lo adoptan en su turno.
- **Animaciones al abrir:** el aro se llena, las barras crecen y los números cuentan. Sólo corren al abrir o al cambiar de semana, no al redimensionar la ventana. Con "reducir movimiento" activado, no se mueve nada.
- **Gráficas:**
  - Texto en colores de texto, nunca del color de la barra.
  - Rejilla de líneas sólidas muy tenues.
  - 2 px de separación entre segmentos.
  - Leyenda siempre visible.

## 7. PDF

- Mismos números que la pantalla: resumen (porcentaje y los cuatro estados), las frases de Lectura rápida, Por persona (hechas, tarde, sin hacer) y Lo que no se hizo.
- El encabezado usa el nombre de la empresa elegida (hoy dice "LA FERRE" fijo, también para BFM).
- Se sigue usando jsPDF.

## 8. Pruebas

- **Unitarias** (jest, en `lib/__tests__/`):
  - El estado de una actividad antes y después de su hora límite, para hoy, un día pasado y un día futuro.
  - El porcentaje sin contar lo que está por hacer.
  - Por persona: asignada, general, con varios asignados, y hecha por alguien distinto del asignado.
  - Las frases de Lectura rápida y sus casos sin datos.
  - `weekLabel` cuando la semana cruza de mes.
  - La paginación, con un cliente simulado que regresa 1,000 y luego 37 filas.
- **Semana completa:** para una semana ya terminada, el porcentaje nuevo debe ser igual al de la pantalla vieja.
- **Visual:** revisión con Playwright en local (escritorio y celular) contra la maqueta.

## 9. Entrega

- Rama `feat/reportes-rediseno`, revisión en local y subida a `main` (despliegue automático en Vercel) cuando el usuario dé el visto bueno.
- Después siguen las demás pantallas, una por una, con esta misma base.
