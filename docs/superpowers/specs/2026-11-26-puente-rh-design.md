# Puente seguro con la app de RH (parte 1 de 3)

**Fecha:** 2026-11-26 · **Aprobado por el dueño:** sí

## Para qué

Que la app de RH (bfm-rrhh, otra base de Supabase) guarde las capacitaciones de cada empleado y practicante y
genere sus constancias para el expediente físico (parte 2), y que el nuevo ingreso se confirme desde RH (parte 3).
Esta parte es sólo el puente y el vínculo de personas.

## Diseño

```
RH (navegador) ──sesión de RH──▶ RH /api/actividades ──PUENTE_RH_SECRETO──▶ panel /api/rh/personas ──▶ base de Actividades
```

- **Contraseña** `PUENTE_RH_SECRETO` (≥ 32 caracteres, aleatoria) en Vercel en los dos proyectos. Nunca en un navegador, en el
  código ni en el chat. El panel la compara por resumen sha256 con `timingSafeEqual` (`lib/rh-bridge.ts`).
- **Panel** `GET /api/rh/personas`: sin contraseña → 401. Sólo lee: id, nombre, nombre completo, de dónde salió el nombre
  completo (`origen`: 'app' o 'panel'), empresa y si está activa. Nada de teléfonos ni fotos. `/api` no pasa por el middleware.
- **RH** `api/actividades.js`: exige la sesión de RH (Bearer del usuario), revisa con la llave de servicio que su perfil esté
  activo y sea **admin o rh**, y sólo entonces llama al panel. Acciones en lista cerrada (por ahora `personas`).
- **Nombre completo** (SQL 015): tabla `employee_identity` cerrada (RLS sin políticas, sin permisos para anon/authenticated).
  El teléfono sólo pregunta si falta (`identity_missing`) y lo guarda **una vez** (`set_my_full_name`). Corregirlo: panel → Equipo.
  En el teléfono: "Escribe tu nombre completo" en Inicio, con "Ahora no".
- **Riesgo aceptado:** el teléfono no tiene contraseña por persona (así funciona toda la app), así que alguien con la llave pública
  podría poner el nombre completo de otro que aún no lo puso. Mitigación: se escribe una sola vez, el vínculo en RH siempre lo
  confirma una persona, y RH ve el `origen` del nombre.
- **Vínculo en RH:** tarjeta "App de Actividades" en la pestaña Capacitaciones de la ficha (sólo admin/rh). Sugiere por parecido
  del nombre; se guarda `actividadesId` (+ `actividadesNombre`) en el `data` de la persona.

## Orden

SQL 015 → panel → RH (en su copia aparte `bfm-rrhh-puente`, rama `puente-actividades`; otra sesión trabaja en `bfm-rrhh`) → OTA.
Antes de subir: generar la contraseña y ponerla en los dos proyectos con `vercel env add … --value … --force --yes` (la tubería guarda vacío).
