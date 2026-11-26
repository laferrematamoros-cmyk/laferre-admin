# Medallas de capacitación: plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Medalla por capacitación terminada (Entendí o en persona): festejo, vitrina, renglones y tabla de Avance.
**Architecture:** Sin cambio en la base: la medalla es `isDone(status)` de la versión actual. Reglas puras en `lib/capacitaciones/medals.ts` (panel) y `lib/training.ts` (app); un dibujo SVG compartido (`Medal`), copiado en la app con `react-native-svg`.
**Tech Stack:** Next.js 16 + CSS Modules + Jest (panel); Expo/React Native + react-native-svg + Jest (app).

**Reglas:** rutas explícitas en `git add`; en local no guardar; subir sólo con "súbelo"; OTA sólo con "sí, mándala".

---

### Task 1: reglas puras del panel

**Files:** Create `lib/capacitaciones/medals.ts` · Test `lib/__tests__/capacitaciones-medallas.test.ts`

- [ ] Prueba:

```ts
import { hasMedal, medalShelf, medalCount, wonText } from '../capacitaciones/medals';
const it3 = [
  { slug: 'a', title: 'A', sort_order: 1, status: 'pending' as const },
  { slug: 'b', title: 'B', sort_order: 2, status: 'trained' as const },
  { slug: 'c', title: 'C', sort_order: 3, status: 'understood' as const },
  { slug: 'd', title: 'D', sort_order: 4, status: 'doubt' as const },
];
it('medalla con entendida o en persona', () => {
  expect(['pending', 'overdue', 'doubt', 'understood', 'trained'].map(s => hasMedal(s as never))).toEqual([false, false, false, true, true]);
});
it('vitrina: ganadas primero, luego por orden', () => {
  expect(medalShelf(it3).map(i => [i.slug, i.earned])).toEqual([['b', true], ['c', true], ['a', false], ['d', false]]);
});
it('cuenta y texto', () => {
  expect(medalCount(it3)).toEqual({ earned: 2, total: 4 });
  expect(wonText('Tubería cortada')).toBe('Ganaste la medalla de Tubería cortada.');
});
```

- [ ] Correr `npx jest capacitaciones-medallas` → falla (no existe el módulo).
- [ ] Implementar:

```ts
import { isDone, type TrainingStatus } from './status';
interface MedalItem { slug: string; title: string; sort_order: number; status: TrainingStatus }
export const hasMedal = (s: TrainingStatus) => isDone(s);
export function medalShelf<T extends MedalItem>(items: T[]): (T & { earned: boolean })[] {
  return items.map(i => ({ ...i, earned: hasMedal(i.status) }))
    .sort((a, b) => Number(b.earned) - Number(a.earned) || a.sort_order - b.sort_order);
}
export function medalCount(items: { status: TrainingStatus }[]) {
  return { earned: items.filter(i => hasMedal(i.status)).length, total: items.length };
}
export const wonText = (title: string) => `Ganaste la medalla de ${title}.`;
```

- [ ] Pasa. Commit.

### Task 2: dibujo y vitrina del panel

**Files:** Create `components/capacitaciones/Medal.tsx`, `MedalShelf.tsx`, `medals.module.css`

- [ ] `Medal({ earned, size = 40, className })`: SVG `viewBox="0 0 40 48"`, `aria-hidden`. Listón izquierdo `9,0 17,0 22,20 14,20` y derecho `23,0 31,0 26,20 18,20`; círculo `cx 20 cy 31 r 15`; aro `r 11`; estrella `20,24 21.76,28.57 26.66,28.84 22.85,31.93 24.11,36.66 20,34 15.89,36.66 17.15,31.93 13.34,28.84 18.24,28.57`. Ganada: listón `#DB011C`/`#A50016`, oro `#F4B731` con borde `#C98A12`, aro `#FFE29A`, estrella `#FFF6D6` con borde `#E0A21F`. Falta: `#C9CDD2`/`#B5BAC0`, `#E6E8EB`/`#C8CCD1`, `#F3F4F6`, `#D3D7DC`.
- [ ] `MedalShelf({ items })`: `<ul>` que se desliza a lo ancho con `medalShelf(items)`; cada `<li>` lleva Medal de 44 px y el título en dos renglones; `aria-label` "Título: ganada" / "Título: te falta".
- [ ] `medals.module.css`: `.shelf` (flex, `overflow-x: auto`, `scroll-snap-type: x proximity`), `.item` (82 px, centrado), `.name` (11.5 px, 2 renglones), `.pop` y `@keyframes medalIn` (escala .3 → 1.12 → 1, gira -25° → 8° → 0) + `@keyframes glow` dos veces. **Sin** condicionar a reducir movimiento (el dueño lo quiere ver).
- [ ] `tsc`. Commit.

### Task 3: festejo al tocar "Entendí"

**Files:** Modify `components/capacitaciones/TrainingViewer.tsx` (pantalla final)

- [ ] Con `done` = `understood` o `trained`: en lugar de `<div className={v.check}>✓</div>`, `<div className={md.pop}><Medal earned size={96} /></div>`; texto: `understood` → `wonText(title)`; `trained` → `Ya te capacitó el Ing. en persona y tienes la medalla de ${title}.` Con `doubt`, igual que hoy.
- [ ] Prueba de textos en `capacitaciones-viewer.test.ts` si los textos salen de una función pura (`finalText(done, title)` en `lib/capacitaciones/medals.ts`). Commit.

### Task 4: practicante

**Files:** Modify `components/capacitaciones/MyTrainingList.tsx`

- [ ] La tarjeta dice `<b>{earned}</b> de {total} medallas` (con `medalCount`) y debajo de la leyenda va `<MedalShelf items={items} />`.
- [ ] En cada renglón terminado, `<Medal earned size={28} />` antes del título. Commit.

### Task 5: tabla de Avance

**Files:** Modify `components/capacitaciones/Matrix.tsx`, `capacitaciones.module.css`

- [ ] `StatusMark`: con `isDone(status)` regresa `<span className={`${v.mark} ${v.m_medal}`} aria-hidden><Medal earned size={30} /></span>` (24 en la leyenda vía CSS).
- [ ] Leyenda: Por ver, Atrasada, Con dudas y "Con medalla (entendida o en persona)".
- [ ] Columna "Avance" → "Medallas", celda con Medal de 18 px + `{p.done}<small>/{p.total}</small>`; chip `N de M medallas`. Commit.

### Task 6: app (rama `medallas` sobre `varias-fotos`)

**Files:** Modify `lib/training.ts`, `lib/__tests__/training.test.ts`, `app/(employee)/capacitacion.tsx` · Create `components/Medal.tsx`

- [ ] Prueba y copia de `medalShelf`/`medalCount` (marcadas como copia de `laferre-admin/lib/capacitaciones/medals.ts`).
- [ ] `components/Medal.tsx` con `react-native-svg` (`Svg`, `Polygon`, `Circle`), mismos puntos y colores.
- [ ] Resumen: `{earned} de {total} medallas`, barra y `ScrollView horizontal` con las medallas (44 px + nombre). Renglones terminados: `<Medal earned size={32} />` en lugar del punto con ✓.
- [ ] `npx jest`, `npx tsc --noEmit`. Commit.

### Task 7: verificación

- [ ] Panel: `npx jest`, `npx tsc --noEmit`, `AUTH_SECRET=solo-local-prueba-reportes npx next build`.
- [ ] Local a 390 px y 1280 px, sin guardar: vista previa de una capacitación, festejo (pantalla final armada en una página de prueba fuera del repo o con Playwright cambiando estado), Mis capacitaciones y Avance si hay datos. Con `reducedMotion: 'reduce'` el festejo se sigue animando.
