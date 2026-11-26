# Medallas 2 (temas, niveles, festejo): plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Medalla por tema, niveles por porcentaje y festejo grande (spec `2026-11-25-medallas-temas-niveles-design.md`).
**Architecture:** Reglas puras (`themes.ts`, `levels.ts`) probadas; dibujos SVG (`Medal` por tema, `LevelBadge`); `theme` en el catálogo, en `trainings` (SQL 014) y en `cap_list`; la cuenta de medallas antes de contestar sale del servidor.
**Tech Stack:** Next.js 16, CSS Modules, Jest; Expo + react-native-svg + expo-linear-gradient (ya en la APK).

**Reglas:** rutas explícitas en `git add`; el dueño corre el SQL; subir con "súbelo" (después del SQL); OTA con "sí, mándala".

### Task 1: temas (panel)
- [ ] `lib/capacitaciones/themes.ts`: `ThemeKey`, `THEMES` (label, colores: disc, edge, ring, left, right; icon), `themeOf(slug)` (catálogo → tema, si no `general`).
- [ ] `CatalogEntry.theme: ThemeKey` y las 20 entradas con su tema. Prueba: todas con tema conocido distinto de `general`.
- [ ] `catalogSyncPlan` escribe `theme` en altas y lo corrige si cambia; `DbTraining.theme`; `syncCatalog` lo pide. Pruebas en `capacitaciones.test.ts`.

### Task 2: niveles (panel)
- [ ] `lib/capacitaciones/levels.ts`: `LEVELS`, `levelFor(earned, total)` → `{ current, next: { key, label, need, missing } | null }`, `levelLine`, `celebrate(before, wasDone)` → `{ earned, total, levelUp }`. Pruebas con 20, 4, 2, 1 y 0 capacitaciones.

### Task 3: SQL 014
- [ ] `supabase/014_temas_capacitacion.sql`: `trainings.theme text` (check formato), `cap_list` con `'theme'` (join a `trainings`), grants iguales, `notify pgrst`. Prueba en PGlite con el arnés.

### Task 4: dibujos (panel)
- [ ] `Medal({ theme, earned, size })` con el ícono de cada tema; gris si falta.
- [ ] `LevelBadge({ level, size })` hexágono.
- [ ] `MedalShelf`: medallas por tema + brillo por turnos; `LevelProgress` (insignia, textos, barra con marcas).

### Task 5: festejo
- [ ] `loadViewer` y `openMyTraining` regresan `medals: { earned, total } | null` (con `cap_list`).
- [ ] `TrainingViewer`: rayos, confeti, medalla del tema, vibración, "Ya llevas…", "¡Subiste a…!".

### Task 6: practicante y Avance
- [ ] `MyTrainingList`: `LevelProgress` + `MedalShelf`; renglones con la medalla del tema.
- [ ] `Matrix`: celdas con la medalla del tema; columna Medallas con `LevelBadge`.

### Task 7: app
- [ ] `lib/training.ts`: `theme` en `TrainingItem`, copia de `levelFor`/`levelLine`; pruebas.
- [ ] `components/Medal.tsx` por tema, `components/LevelBadge.tsx`; resumen con nivel, barra con marcas, tira con brillo; renglones con la medalla del tema.

### Task 8: verificación
- [ ] Panel: jest, tsc, build. App: jest, tsc.
- [ ] Local con página temporal de datos inventados (no se guarda) y app web con base simulada; festejo con `cap_answer` simulado.
