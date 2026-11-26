# Medallas 2: temas, niveles y festejo grande

**Fecha:** 2026-11-25 · **Aprobado por el dueño:** sí (eligió A, B y C en el navegador; temas y niveles por porcentaje aprobados)

Sigue a `2026-11-25-medallas-capacitacion-design.md`. La regla de la medalla no cambia: `isDone(status)` de la versión actual.

## A · Una medalla por tema

| Tema (`theme`) | Color | Dibujo | Capacitaciones |
|---|---|---|---|
| `plomeria` Plomería y gas | azul | gota | fregadero, lavabo, gas-estufa, bomba, hidroneumatico, errores-bombas, tuberias |
| `electricidad` Electricidad | dorado | rayo | cables-interruptores, extension, focos-led |
| `pintura` Pintura | coral | rodillo | pintar-pared, impermeabilizar |
| `bodega` Bodega: medir y cortar | naranja | regla | tuberia-cortada, medir-manguera, manguera-nivel, poliducto |
| `herramientas` Herramientas y mantenimiento | morado | llave | brocas-metal, cortinas |
| `atencion` Atención y oficina | verde | teléfono | llamadas, facturacion |
| `general` (respaldo) | dorado | estrella | tema desconocido (p. ej. la app vieja con un tema nuevo) |

- El tema vive en `CATALOG` (`theme`), obligatorio. El panel lo lee del catálogo.
- El teléfono lo recibe de la base: SQL `014_temas_capacitacion.sql` agrega `trainings.theme` y `cap_list` lo regresa. `syncCatalog` lo escribe (altas y cambios).
- Orden para subir: SQL 014 → panel → OTA. Sin el SQL, `syncCatalog` fallaría al pedir `theme`.

## B · Niveles

- Bronce 25 %, Plata 50 %, Oro 75 %, Diamante 100 % de las capacitaciones prendidas que le tocan. La meta es `ceil(pct × total)`; Diamante = total.
- Nivel actual = el más alto cuya meta ≤ medallas (con total > 0). Siguiente = el primero cuya meta > medallas, con "Te faltan N para X". Con todas: "¡Tienes todas!".
- Insignia por nivel (hexágono): bronce, plata, oro con I/II/III; diamante azul con gema.
- Vitrina (teléfono y practicante): insignia + "Nivel Plata" + "12 de 20 medallas · Te faltan 3 para Oro", barra con marcas en 25/50/75 % y la tira de medallas de colores.
- Avance (admin): columna Medallas con la insignia del nivel + N/M.

## C · Festejo grande

- Pantalla final con medalla del tema: rayos girando, confeti, destello, `navigator.vibrate([60, 40, 120])`.
- Texto: "Ganaste la medalla de *título*." + "Ya llevas N de M medallas." Si sube de nivel: insignia + "¡Subiste a Oro!".
- La cuenta antes de contestar la arma el servidor (`cap_list` del empleado) en `loadViewer` y `openMyTraining`; después = antes + 1 si la capacitación no estaba terminada. Si la cuenta no se pudo leer, sólo sale la medalla.
- Vitrina: las medallas ganadas brillan por turnos (destello que cruza el disco).
- Nada se apaga con "reducir movimiento" (el dueño lo tiene así y quiere verlas).

## Pruebas

Jest de `levelFor`, `celebrate`, temas del catálogo y `catalogSyncPlan` con `theme`, en el panel y la copia de la app; `tsc`; compilación; en local con datos inventados y la app web con la base simulada.
