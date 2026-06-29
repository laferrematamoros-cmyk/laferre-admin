# Diseño — Reportes: historial de semanas + tendencia

**Fecha:** 2026-06-27
**App:** laferre-admin (Next.js, Vercel)
**Estado:** Aprobado por el usuario · pendiente de plan

---

## Problema

La página `app/reportes/page.tsx` solo muestra el reporte de la **semana actual** (la semana está fija a `startOfWeek()`, sin setter). No se pueden ver/descargar semanas pasadas, ni ver si el cumplimiento mejora con el tiempo.

## Objetivo

1. Ver y **descargar el PDF de cualquier semana** (no solo la actual).
2. Una **gráfica de tendencia**: % de cumplimiento de las últimas ~8 semanas, para ver si van mejorando.
3. Sin cambios de base de datos (todo se calcula al vuelo desde `completions` + `activities`).

## Decisiones (con el usuario)

- **Navegación:** selector de semana (`<input type="week">`).
- **Tendencia:** gráfica de % por semana, **desde la primera semana con una actividad realizada** hasta la semana actual, semana seleccionada resaltada.
- **Periodos:** solo semanal (sin mensual).
- **Enfoque:** cálculo al vuelo, **sin tablas nuevas ni cron/snapshots** (YAGNI para este volumen).

## Arquitectura

Todo vive en `app/reportes/page.tsx` (un solo archivo, como hoy). Se parametriza el cálculo por semana y se agrega la sección de tendencia. El PDF (jsPDF) se reusa, parametrizado por la semana elegida.

### 1. Selector de semana
- Estado `weekStart` (lunes de la semana), inicial = semana actual.
- `<input type="week">` en la barra superior. Al cambiar, se parsea el valor ISO (`YYYY-Www`) → lunes de esa semana → `setWeekStart` → recarga.
- El `load()` actual ya calcula con `days[0..6]`; se cambia para que parta de `weekStart` (no de `startOfWeek()` fijo).
- La etiqueta ("Semana del X al Y") y el nombre del PDF usan `weekStart`.

### 2. Exactitud de semanas pasadas (refinamiento)
Hoy el reporte cuenta **todas** las actividades activas para cada día, sin importar si ya existían. Para semanas pasadas eso infla las "no realizadas" (cuenta actividades que aún no se creaban).
- **Fix:** al contar lo "programado" de una semana, incluir solo actividades con `created_at <= fin de esa semana`.
- **Limitación documentada:** no hay historial de pausas/activaciones; se usa el estado actual (`is_active`) + `created_at`. Aproximación buena, no perfecta. (Se anota en el código y en la UI no se promete exactitud histórica total.)

### 3. Gráfica de tendencia (nueva sección)
- Rango: **desde la primera semana con una actividad realizada** (lunes de la `MIN(scheduled_date)` de `completions`) **hasta la semana actual**. El número de semanas es dinámico y crece con el tiempo.
- Una sola consulta: `MIN(scheduled_date)` de `completions` (o cargar todas las `completions` de la empresa una vez) → define la semana inicial; luego se computa `done/total` por cada semana del rango con `computeWeek` + el filtro `created_at`.
- Render: barras de % por semana, color por rango (rojo <70, ámbar <90, verde ≥90, igual que `rateColor`). La **semana seleccionada** se resalta.
- **Interacción:** tocar una barra hace `setWeekStart` a esa semana (salta el reporte a ella).
- **Muchas semanas con el tiempo:** si el rango crece mucho (p. ej. >12-15 barras), el contenedor hace **scroll horizontal** y las barras mantienen un ancho mínimo legible. (Sin truncar el historial; el usuario pidió desde el inicio.)

### 4. PDF
- Igual que hoy, pero con la etiqueta y el nombre de archivo de la semana seleccionada (`reporte-laferre-<lunes>.pdf`).

## Componentes / unidades

- **`weekStartFromInput(value: string): Date`** — parsea `YYYY-Www` al lunes. Puro, testeable.
- **`computeWeek(weekStart, activities, completions, employees): ReportData`** — extrae la lógica de cálculo actual (hoy embebida en `load`) a una función pura reutilizable por la semana seleccionada **y** por cada semana de la tendencia. Incluye el filtro `created_at <= weekEnd`. Puro, testeable.
- `load()` — usa `computeWeek` para la semana seleccionada y para las 8 de la tendencia.
- El resto de la UI (hero, por empleado, no realizadas, barras por día) sin cambios de lógica.

## Manejo de errores / casos borde
- Semana sin datos → muestra 0% / "sin actividades" (como hoy).
- `<input type="week">` no soportado (navegadores viejos) → cae a texto; el admin se usa en Chrome de escritorio, aceptable. (Opcional: flechas ◀▶ como respaldo — fuera de alcance salvo que se pida.)
- Semana futura → se permite elegirla pero mostrará 0 hechas (sin completions). Aceptable.

## Pruebas
- Unit: `weekStartFromInput` (varias semanas ISO → lunes correcto) y `computeWeek` (con un set fijo de activities/completions → done/total/late/byEmployee esperados, incluido el filtro created_at).
- Manual (Playwright): cambiar de semana recalcula; la tendencia muestra 8 barras; tocar una barra salta a esa semana; descargar PDF de una semana pasada.

## Fuera de alcance
- Resumen mensual.
- Snapshots/tabla de reportes históricos.
- Historial de estado (pausas/activaciones) de actividades.
- Flechas ◀▶ (salvo que se pidan).

## Criterios de éxito
- Puedo elegir una semana pasada y ver/descargar su reporte (PDF con esa semana).
- Veo una gráfica de % desde la primera semana con actividad realizada hasta hoy, y noto si sube o baja.
- Las semanas pasadas no cuentan como "no realizadas" actividades que aún no existían.
