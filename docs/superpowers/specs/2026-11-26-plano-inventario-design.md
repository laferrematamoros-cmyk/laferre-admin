# Plano de la tienda en el inventario

**Fecha:** 2026-11-26 · **Aprobado por el dueño:** sí (opción A: plano dibujado en la app; los tres lugares)

## Lo que pidió

Usar el plano de La Ferre (PDF "LAYOUT LA FERRE") para que sepan dónde está la letra que van a inventariar.

## Diseño

- El plano se redibuja en código (`lib/store-layout.ts`, copia en `laferre-actividades/lib/storeLayout.ts`): zonas con su color (Reciba, Área 1 · Atención al cliente, Área 2, Comedor, Tubería), muros, entradas, baño, oficina y cada estante con su letra, en las medidas del dibujo. E y Q tienen dos estantes. Sin sensores ni extintores.
- Sólo La Ferre (`hasLayout('laferre')`).
- **Teléfono, ficha de la letra:** tarjeta "¿Dónde está?" con el plano acercado a la letra (`focusBox`, 4:3), la letra en rojo con un marco que parpadea (no se apaga con reducir movimiento) y "Letra H · Área 1 · Atención al cliente". Botón "Ver plano completo" / "Acercar".
- **Teléfono, lista de letras:** "Ver letras / Ver plano". El plano pinta cada letra según su estado (libre, la tuya, en proceso, hecha, rehacer, vencida); tocarla hace lo mismo que tocarla en la lista.
- **Panel, Inventario → Ronda actual:** tarjeta "Plano de la tienda" con el avance; picar una letra abre su detalle.
- La **Z** no existe en la tienda: el dueño la apaga en Inventario → Configuración (sale de las próximas rondas).

Sin SQL. Panel con "súbelo"; teléfono por OTA con "sí, mándala".

## Pruebas

Jest del plano en las dos (todas las letras sin la Z, E y Q dobles, todo dentro del dibujo, zona de cada letra, acercamiento dentro del dibujo y en 4:3); `tsc`; en local con la ronda real (panel, sólo lectura) y la app web con datos simulados.
