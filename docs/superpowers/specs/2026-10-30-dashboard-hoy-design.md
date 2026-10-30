# Dashboard "hoy" — diseño

**Fecha:** 2026-10-30 · **Estado:** aprobado por el usuario (con línea del día)
**Base visual:** la de Reportes (`docs/superpowers/specs/2026-10-30-reportes-rediseno-design.md`), ahora en `components/panel/`.

## Por qué
- El % de cumplimiento contaba lo que todavía no tocaba (mismo error que Reportes).
- "Empleados activos" mostraba un puntito verde fijo; "Alertas activas" repetía la lista.
- El ámbar significaba "en curso" aquí y "tarde" en Reportes.
- La campanita avisaba a TODOS los teléfonos de la empresa.
- "Exportar" sólo llevaba a Reportes. Campanitas de 28 px en celular.

## Usos (dicho por el usuario)
Ver cómo va el día · ver qué falta ahorita · mandar recordatorios · ver evidencias.

## Estados de hoy (`lib/today.ts`)
Hecha (verde) · Hecha tarde (ámbar) · En curso (azul `#2563EB`, nuevo: ya empezó y no vence) · Por hacer (gris) · Atrasada (rojo: venció sin hacerse).
% = hechas ÷ (hechas + atrasadas), igual que Reportes. Mismas reglas de semana del mes y `created_at`.

## Pantalla
1. **Cómo va el día:** aro, semáforo, "Van X de Y que ya tocaban", conteo por estado y **línea del día** (7:00–19:00 como mínimo; cada actividad en su horario y color; carriles si se enciman; raya "Ahora"). Tocar una barra abre el detalle.
2. **Necesita atención:** atrasadas (más atraso primero) y en curso con 30 min o menos; cada una con **Recordar**. Vacío: "Todo al día".
3. **Actividades de hoy:** por hora, con estado, responsable, quién la hizo, ícono de foto y Recordar.
4. **Equipo hoy:** hechas, tarde, atrasadas y por hacer de cada quien; renglón "Generales" para atrasadas sin dueño; el practicante ve etiquetas sin cifras.
5. **Detalle:** panel a la derecha (celular: sube desde abajo) con horario, asignada a, quién la hizo, hora de registro, atraso o tiempo restante, instrucciones, foto y nota.
- "Nueva actividad" sólo para administrador. Se quitó "Exportar". Se actualiza cada minuto.

## Recordatorio (`/api/push`)
Acepta `employeeIds`: manda sólo a `employees.push_token` de esas personas. Si no hay ninguno registrado (o la actividad es general / Urgente), va a todos los `device_tokens` de la empresa como antes. Responde `target: 'personas' | 'todos'` y el botón dice "Avisado a ANA" o "Avisado a todos". Al 2026-10-30 sólo 3 de 13 empleados activos tenían teléfono registrado.

## Pruebas
`lib/__tests__/today.test.ts` (13): estados, minutos, %, atención, quién la hizo, equipo, registros de otro día/repetidos, dados de baja, carriles y rango de horas. Verificado en local a 1366 y 390 px, y con el reloj adelantado a las 18:40 para ver atrasadas.
