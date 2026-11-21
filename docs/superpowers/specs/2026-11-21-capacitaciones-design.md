# Capacitaciones

Diseño aprobado en conversación el 2026-11-21. Cada empleado de La Ferre y BFM, y la practicante, debe ver una animación por cada proceso (instalar un fregadero, conectar el gas, brocas para metal…). Al terminar, confirma que la entendió o pide que el Ing. José se la explique en persona.

## Qué se construye

1. **Una lista de capacitaciones que funciona como checklist.** Cada persona ve todas las capacitaciones activas, con su estado y su plazo.
2. **Una página por capacitación** con la animación, y abajo dos botones: **"Entendí"** y **"Tengo dudas"**. "Entendí" se prende hasta que pasa el tiempo mínimo de esa capacitación, y la base lo revisa de nuevo.
3. **"Tengo dudas"** da dos opciones: "Volver a verla" o "Que el Ing. me la explique", con una nota de qué no le quedó claro.
4. **En el panel, para el admin:** la tabla de avance (personas contra capacitaciones), la lista "Por capacitar" con el botón "Ya lo capacité", y los ajustes de cada capacitación.
5. **Avisos al teléfono:** cuando hay capacitaciones nuevas, y 2 días antes del plazo.

## Decisiones del dueño

| Pregunta | Decisión |
|---|---|
| ¿Dónde vive? | En la app de Actividades (teléfonos) y en el panel. |
| ¿Quién las ve? | Todos los empleados activos de las dos empresas y la practicante. Una sola lista para La Ferre y BFM. |
| ¿Plazo? | Sí, por capacitación; 7 días si no se pone otro. Aviso al teléfono cuando sale una nueva y 2 días antes del plazo. |
| ¿Cómo se ven en el teléfono? | Opción A: la app abre una página del panel en el navegador del teléfono. No hace falta APK nueva; la app nueva va por internet (OTA). |
| ¿La practicante? | Las ve dentro del panel, en su menú. |
| ¿Quién agrega animaciones nuevas? | Claude, en el código. Llegan pausadas y el dueño las prende. |
| ¿Tiempo mínimo? | Uno por capacitación, editable en el panel. |
| ¿Cerrar una duda? | Botón "Ya lo capacité" en el panel, sin PIN (ya está en su sesión). |
| ¿Si cambia una animación? | Versión nueva: a todos les vuelve a salir, con plazo nuevo. |

## Las 13 capacitaciones

Fuente: `C:\Users\jose_\Downloads\Nueva carpeta (12)\BFM Ferretería design versions actualizado\handoff-app-v2` (la carpeta vieja `handoff-app-v2` ya no se usa). Se integran tal como vienen, sin rediseñar.

| # | slug | Título | Componentes (en este orden) |
|---|---|---|---|
| 1 | `fregadero` | Instalar un fregadero | InstalarFregadero |
| 2 | `lavabo` | Instalar un lavabo | InstalarLavabo |
| 3 | `gas-estufa` | Conectar el gas a la estufa | InstalarGasEstufa |
| 4 | `bomba` | Instalar una bomba | InstalarBomba |
| 5 | `hidroneumatico` | Instalar un hidroneumático | InstalarHidroneumatico |
| 6 | `errores-bombas` | Errores comunes con bombas | BombaSistemasIncorrectos |
| 7 | `brocas-metal` | Brocas para metal | BrocaMetal |
| 8 | `cables-interruptores` | Cables e interruptores | CableDelgadoPeligro, CableEInterruptor |
| 9 | `extension` | Extensión sobrecargada | ExtensionSobrecargada |
| 10 | `focos-led` | Focos LED | ComparativaFocos |
| 11 | `cortinas` | Mantenimiento de cortinas | MantenimientoCortina |
| 12 | `impermeabilizar` | Impermeabilizar un techo | CalculadoraYTipsImpermeabilizante, PasosImpermeabilizar, ProductosImpermeabilizante |
| 13 | `pintar-pared` | Pintar una pared | PasosPintar |

Todas empiezan en la versión 1 y **pausadas**. El orden inicial es el de la tabla; el dueño lo cambia en el panel.

**Tiempo mínimo inicial:** lo que dura una vuelta completa de la animación (o la suma de sus componentes animados), medida en el navegador, redondeada hacia arriba a 5 s. La calculadora y la lista de productos no suman tiempo.

## Estados y plazos

Cada persona tiene, por capacitación (en su versión actual), uno de estos estados:

| Estado | Cuándo | Se ve como |
|---|---|---|
| Por ver | No ha contestado y no se ha pasado el plazo. | gris, "vence el jue 27" |
| Atrasada | No ha contestado y ya pasó el plazo. | rojo |
| Entendida | Presionó "Entendí". | verde |
| Con dudas | Pidió que el Ing. se la explique. Espera al Ing., no cuenta como atrasada. | ámbar |
| Capacitado en persona | El admin presionó "Ya lo capacité". | verde con persona |

- **Plazo** = fin del día (hora de Matamoros) de `fecha base + días de plazo`, donde la fecha base es la más reciente entre "cuándo se activó la capacitación (o su versión)" y "cuándo se dio de alta el empleado". Así, al nuevo le salen todas con plazo desde que entra.
- **Pausar y volver a activar** reinicia el plazo para todos (cuenta desde la nueva activación).
- **Cambios de respuesta:** quien está en "Por ver", "Atrasada", "Entendida" o "Con dudas" puede volver a contestar; la última respuesta manda. "Capacitado en persona" ya no cambia. Si alguien con dudas la vuelve a ver y presiona "Entendí", sale de "Por capacitar".
- **"Volver a verla"** no se guarda como respuesta: reinicia la animación. Cada vez que se abre queda una "vista" registrada; el panel enseña cuántas veces la vio.
- **Versión nueva:** las respuestas de la versión anterior se guardan como historial, y en la tabla manda la versión actual.
- Las capacitaciones **no cuentan** en el porcentaje de actividades ni en el ranking de Reportes.

## El teléfono del empleado (app de Actividades)

- **Pestaña nueva "Capacitación"** entre "Conoce" y "Perfil", con un numerito (por ver + atrasadas).
- **Tarjeta en Hoy**, arriba, sólo si hay pendientes: *"Tienes 3 capacitaciones por ver"*. Si hay atrasadas, en rojo: *"2 capacitaciones atrasadas"*. Al tocarla va a la pestaña.
- **La pestaña** enseña la lista en el orden del panel, con el estado de cada una. Arriba, un resumen: *"8 de 13 listas"*.
- **Al tocar una**, la app pide a la base una "sesión" (`cap_open`) y abre en el navegador del teléfono `https://laferre-admin.vercel.app/ver-capacitacion/<slug>?s=<sesión>`.
- **Al regresar a la app** (cuando vuelve a primer plano) la lista se recarga y ya enseña la palomita.
- Si la sesión del empleado caducó (más de 10 h desde que eligió su nombre), pide elegir su nombre como las otras pantallas.
- Sin conexión: *"No hay conexión. Intenta de nuevo."*

## La página de la animación (`/ver-capacitacion/[slug]`)

Página pública del panel: no pide contraseña. Lo que la protege es la sesión del enlace, un identificador aleatorio que sólo la app conoce y que vence a las 12 horas.

- **Arriba:** "Capacitación · Hola, Eddie" y el título.
- **En medio:** los componentes de esa capacitación, uno debajo del otro.
- **Abajo, fija:** **[Entendí · 0:23]** (se prende al llegar a 0) y **[Tengo dudas]**.
- **Tengo dudas** abre una hoja con:
  - "Volver a verla": sube al inicio y reinicia las animaciones;
  - "Que el Ing. me la explique": un cuadro *"¿Qué no te quedó claro?"* (opcional, hasta 500 letras) y el botón Enviar.
- **Al contestar:** *"¡Listo, Eddie!"*, con el botón **"Regresar a la app"** (enlace `laferre://capacitacion`) y el texto *"o cierra esta pestaña"*.
- **Si ya la había contestado:** lo dice arriba (*"Ya la marcaste como entendida el 21 nov"*) y deja volver a contestar, salvo que ya esté "Capacitado en persona".
- **Errores:**
  - enlace vencido o inválido: *"Este enlace ya no sirve. Ábrela otra vez desde la app."*;
  - capacitación en pausa: *"Esta capacitación está en pausa."*;
  - versión cambiada: *"Esta capacitación se actualizó. Ábrela otra vez desde la app."*;
  - "Entendí" antes de tiempo (si alguien se brinca el botón): *"Todavía no termina; faltan N segundos."*
- **Animaciones apagadas en el teléfono** ("quitar animaciones"): casi todas se quedan quietas en el último paso. La página lo detecta y avisa: *"Tu teléfono tiene las animaciones apagadas: toca cada paso para verlo."* No se modifican los componentes.
- `noindex`, para que no salga en buscadores.

## La practicante (panel)

- Entrada **"Mis capacitaciones"** en su menú, con numerito (por ver + atrasadas).
- La misma lista que el teléfono, para su empleado vinculado (`admin_users.employee_id`). Si su usuario no tiene empleado: *"Tu usuario no está vinculado a un empleado. Pídeselo a un administrador."*
- Al abrir una (`/mis-capacitaciones/[slug]`) se crea la sesión con su empleado y se ve la misma página, dentro del panel.

## El panel del admin: "Capacitación"

Entrada **"Capacitación"** en el menú, después de "Conoce", con numerito = personas con dudas esperando. Tres pestañas:

1. **Avance:** tabla con las personas en filas (agrupadas por empresa; respeta el selector de empresa del panel) y las capacitaciones activas en columnas.
   - Cada celda lleva el ícono de su estado.
   - Al tocarla se ven la fecha, la nota y las vistas.
   - Arriba de cada columna, cuántos la terminaron; al final de cada fila, el avance de la persona.
   - En celular, la primera columna queda fija y la tabla se desliza de lado.
2. **Por capacitar:** las dudas abiertas, de la más vieja a la más nueva. Cada una enseña quién, cuál, qué no entendió y desde cuándo, con el botón **"Ya lo capacité"** (pide confirmar).
3. **Ajustes:** las 13 en su orden, cada una con:
   - activa / en pausa;
   - subir y bajar en el orden;
   - plazo en días (1 a 60);
   - tiempo mínimo en segundos (5 a 600);
   - versión;
   - botón **"Ver"**: vista previa sin registrar nada, con el letrero "Vista previa".

## Avisos al teléfono

Los manda el cron que ya corre cada 5 minutos (`/api/reminders`), sólo entre 9:00 y 19:00 hora de Matamoros.

- **Nuevas:** a cada persona con capacitaciones activas que no ha contestado y de las que todavía no se le avisó (en esa versión). Se juntan en un solo aviso: *"Eddie, tienes 3 capacitaciones nuevas por ver."* (con una: *"…una capacitación nueva: Instalar un fregadero."*).
- **Por vencer:** cuando faltan 48 h o menos para el plazo y sigue sin contestar: *"Eddie, te quedan 2 días para ver: Instalar un fregadero."* (con varias: *"…para ver 3 capacitaciones."*).
- Cada aviso se aparta en la base **antes** de mandarse (no se repite aunque dos corridas del cron se encimen).
- **A qué teléfonos:** los de esa persona (`personTargets`, igual que la lista con firma). Si no tiene, a los de su empresa, y por eso el texto lleva su nombre.

## Datos (Supabase) — `supabase/011_capacitaciones.sql`

### Tablas (RLS prendido y sin políticas: sólo se leen con las funciones o con la llave de servicio)

```
trainings
  id uuid pk default gen_random_uuid()
  slug text unique not null              -- check ~ '^[a-z0-9-]+$'
  title text not null
  sort_order int not null default 0
  is_active boolean not null default false
  deadline_days int not null default 7   -- check 1..60
  min_seconds int not null default 30    -- check 5..600
  version int not null default 1         -- check >= 1
  published_at timestamptz               -- base del plazo; lo pone el trigger
  created_at, updated_at timestamptz not null default now()

training_sessions                        -- una por cada vez que se abre
  id uuid pk default gen_random_uuid()   -- es el ?s= del enlace
  training_id uuid not null references trainings on delete cascade
  employee_id uuid not null references employees on delete cascade
  version int not null
  source text not null                   -- 'app' | 'panel'
  opened_at timestamptz not null default now()
  answered_at timestamptz

training_progress                        -- la respuesta vigente por persona y versión
  id uuid pk default gen_random_uuid()
  training_id, employee_id (como arriba), version int not null
  status text not null                   -- 'understood' | 'doubt' | 'trained'
  doubt_note text                        -- <= 500
  answered_at timestamptz not null
  trained_at timestamptz, trained_by text
  unique (training_id, employee_id, version)

training_notices                         -- avisos ya apartados
  training_id, employee_id, version int, kind text  -- 'new' | 'due_soon'
  sent_at timestamptz not null default now()
  primary key (training_id, employee_id, version, kind)
```

**Trigger `trainings_publish`** (before insert or update):
- al pasar a `is_active = true`, o al subir `version` estando activa, `published_at = now()`;
- siempre actualiza `updated_at`.

### Funciones

| Función | Quién | Qué hace |
|---|---|---|
| `cap_deadline(base timestamptz, days int)` | interna | Inicio del día siguiente a `fecha(base, Matamoros) + days`, en hora de Matamoros. |
| `cap_rows()` | interna | Una fila por empleado activo × capacitación activa, con estado, plazo, respuesta, nota, capacitado por y número de vistas (versión actual). Toda la lógica de estados vive aquí. |
| `cap_list(p_employee)` | anon | Lo de esa persona (activa) para el teléfono y la practicante: id, slug, título, orden, estado, plazo, fecha de respuesta. Empleado inactivo o inexistente: lista vacía. |
| `cap_open(p_training, p_employee)` | anon | Revisa que la capacitación esté activa y el empleado activo; crea la sesión (origen `app`) con la versión actual y regresa `{ok, session, slug}`. Freno: con 60 aperturas o más de esa persona en la última hora no crea otra; reutiliza su última sesión válida (menos de 12 h, misma capacitación y versión) y, si no tiene, rechaza. Así nadie puede bloquear a otro llenándole el freno. |
| `cap_open_panel(p_training, p_employee)` | service_role | Igual, con origen `panel` (la practicante). Desde el teléfono no se puede fingir ese origen. |
| `cap_answer(p_session, p_answer, p_note)` | anon | Revisa: sesión existe y tiene menos de 12 h; capacitación activa y misma versión; empleado activo; para `understood`, que hayan pasado `min_seconds` desde `opened_at` (si no, `{ok:false, code:'too_soon', seconds_left}`); nota de hasta 500. Si ya está `trained` no cambia nada (`{ok:true, already:true}`). Si no, guarda la respuesta (la nota sólo con `doubt`) y marca la sesión contestada. |
| `cap_matrix()` | service_role | `cap_rows()` completo, para la tabla de Avance y "Por capacitar". |
| `cap_mark_trained(p_training, p_employee, p_by)` | service_role | Pasa de `doubt` a `trained` en la versión actual (`trained_at`, `trained_by`). Si no estaba en `doubt`, `{ok:false}`. |
| `cap_claim_notices(p_now)` | service_role | Calcula los avisos "nueva" y "por vencer" que tocan, los inserta en `training_notices` con `on conflict do nothing` y regresa sólo los que sí se insertaron (empleado, nombre, empresa, capacitación, título, tipo). |

Los ajustes (activar, orden, plazo, tiempo) se guardan con acciones del servidor con la llave de servicio, sólo con sesión de admin.

**Sin semilla en el SQL:** las 13 filas las crea la sincronización del catálogo (siguiente sección), pausadas, con su orden y su tiempo mínimo inicial, la primera vez que corre el cron o se abre la página Capacitación. Así la lista vive en un solo lugar (el código).

## Catálogo y versiones (código del panel)

- `lib/capacitaciones/catalog.ts`: la lista en código. Cada capacitación tiene slug, título, versión, tiempo mínimo inicial y sus componentes.
- **Sincronización** (`syncCatalog`), al abrir la página Capacitación y en cada corrida del cron:
  - un slug nuevo se inserta pausado, al final del orden;
  - si la versión del código es mayor que la de la base, se sube (el trigger pone el plazo nuevo);
  - el título se toma del código.

  La base nunca baja de versión.
- `components/capacitaciones/registry.tsx` asigna a cada componente su `import()` dinámico, sin render en servidor.

## Cómo se integran las animaciones

- Los 16 `.jsx` se copian a `components/capacitaciones/anim/` con `"use client"` en la primera línea y, si no, sin cambios. El panel ya tiene `allowJs`.
- `bfm-assets/` se copia a `public/bfm-assets/` y `aislamax-recorte.webp` a `public/` (≈3.3 MB). El middleware ya deja pasar imágenes sin sesión.
- Desde la versión actualizada, cada componente usa nombres de animación propios (`if17-`, `bm10-`…) y ya no mete estilos globales, así que se pueden mostrar varios juntos y no afectan al panel.
- Los enlaces a productos llevan al cotizador de BFM (`bfmpedidosv-2.vercel.app/cotizar`); se dejan así.

## Cambios en lo que ya existe

- `middleware.ts`:
  - el `matcher` excluye `ver-capacitacion/`, que es pública. No se excluye "capacitacion" a secas, porque eso dejaría abierta `/capacitaciones`;
  - `INTERN_ALLOWED` suma `/mis-capacitaciones`.
- `lib/session-context.tsx`: no manda a `/login` desde `/ver-capacitacion/...`. Hoy manda a cualquiera sin sesión.
- `components/AdminShell.tsx`: las dos entradas nuevas con su numerito.
- `app/api/reminders/route.ts`: suma `syncCatalog` y `runTrainingNotices`. Si falla una, sigue lo demás, como ya pasa con las listas.
- App:
  - `app/(employee)/_layout.tsx`: pestaña nueva;
  - `components/PanelTabBar.tsx`: soporta numerito;
  - `components/TabIcon.tsx`: ícono nuevo;
  - `app/(employee)/index.tsx`: tarjeta.

## Arranque

1. El dueño corre `011_capacitaciones.sql` y su prueba en Supabase. La prueba no guarda nada.
2. Se sube el panel ("súbelo"). Todo está pausado, así que nadie ve nada todavía.
3. Se manda la app por internet ("sí, mándala").
4. El dueño revisa cada una con "Ver", ajusta tiempos y plazos, y las prende. Si prende varias juntas, a cada persona le llega un solo aviso.

## Fuera de alcance

- Preguntas o examen después de la animación.
- Que el admin marque "capacitado en persona" a alguien sin que haya pedido ayuda.
- Excluir personas (todas las activas cuentan).
- Ver las animaciones dentro de la app sin navegador (necesitaría APK nueva con webview).
- PDF o reporte imprimible del avance.
- Capacitaciones distintas por empresa.

## Pruebas

- `supabase/011_capacitaciones_prueba.sql`: un bloque que termina con `raise exception 'RESULTADOS (no se guardó nada): …'`. Cubre:
  - estados y plazos (incluye empleado nuevo y reactivación);
  - `cap_open` con capacitación pausada o empleado inactivo;
  - `cap_answer`: antes de tiempo, enlace vencido, versión cambiada, nota larga, `trained` que no cambia y cambio de respuesta;
  - `cap_mark_trained`;
  - `cap_claim_notices`: no repite, horario de 48 h, nada para contestadas;
  - permisos: anon no puede llamar las de service_role ni leer las tablas.

  Se corre antes en PGlite.
- Jest (panel):
  - plan de sincronización del catálogo;
  - texto de los avisos (una o varias, nueva o por vencer);
  - horario de avisos;
  - etiquetas y conteos para los numeritos;
  - que cada componente del catálogo exista en `anim/`.
- Jest (app): agrupado, resumen y etiquetas de la lista.
- En pantalla:
  - cada una de las 13 páginas a 390 px y en escritorio, sin errores en consola y con la animación corriendo;
  - una prueba también con "reducir movimiento";
  - el flujo completo con la base simulada: abrir → esperar → Entendí, y Tengo dudas → Por capacitar → Ya lo capacité.
