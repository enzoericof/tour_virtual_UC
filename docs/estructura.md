# Estructura del código

Mapa del repositorio: cómo se reparte el código, para qué sirve cada carpeta y cuáles son los archivos que hay que leer primero. Los contratos de la API y los protocolos están en [Arquitectura](arquitectura.md); las medidas y su procedencia, en [Geografía y reconstrucción](base-geografica.md); cómo ejecutarlo, en el [README](../README.md).

## Vista general

| Capa | Carpeta | Tamaño aproximado | Qué hace |
| --- | --- | --- | --- |
| Visor y editor 3D | `frontend/src/` | 125 archivos, ~22.000 líneas | Three.js y TypeScript estricto. Geografía, escena, navegación, servicios de red e interfaz |
| Pruebas del frontend | `frontend/tests/` | 28 pruebas, ~3.500 líneas | `node:test` sobre módulos puros: geometría, colisiones, sesión, chat, vehículos. `chat.integration.mjs` corre aparte, contra un backend desechable |
| Backend | `campus-backend/src/main/java/` | 44 archivos, ~2.340 líneas | Spring Boot 4.1.2 con Java 21: cuentas, sesiones, materias, trabajos, presencia y chat |
| Pruebas del backend | `campus-backend/src/test/java/` | 10 archivos, ~530 líneas | JUnit y Spring Boot Test: cupo, chat, vehículos, cookies y migraciones |
| Esquema de datos | `campus-backend/src/main/resources/db/migration/` | 14 migraciones, ~320 líneas | Flyway aplica el esquema y el catálogo de materias |
| Herramientas | `scripts/` | 21 scripts de Blender y 9 utilidades | Preparación de recursos, importación de OSM, mediciones y ensayos de carga |
| Recursos | `frontend/public/assets/`, `frontend/editor-models/` | fotos, texturas, audio y GLB | Materiales del visor y modelos que ofrece el editor |
| Configuración | raíz y `frontend/` | — | Vite, TypeScript, Docker, Vercel y el flujo de despliegue |

Dos reglas estructurales que explican casi todo lo demás: **un único modelo de la facultad** (`data/faculty-blueprint.ts` más `data/faculty-annexes.ts`, en metros) alimenta tanto la vista general como el recorrido, y **el navegador nunca habla con PostgreSQL**: Vite o nginx reenvían `/api` y `/ws` al backend y solo Spring accede a la base.

## Árbol del repositorio

```
tour_virtual_UC/
├── README.md                    Arranque con y sin Docker, controles, verificación
├── AGENTS.md                    Reglas de trabajo del equipo
├── compose.yaml                 PostgreSQL + backend + frontend en Docker
├── .env.example                 Valores de ejemplo (credenciales locales)
│
├── frontend/
│   ├── index.html               Entrada del visor
│   ├── editor.html              Entrada del editor de mapa 3D
│   ├── package.json             Dependencias fijas y scripts (dev, build, test…)
│   ├── vite.config.ts           Proxy al backend, multipágina y plugins propios
│   ├── tsconfig.json            TypeScript estricto, sin emisión
│   ├── Containerfile            Build con Node 24 y publicación con nginx
│   ├── nginx.conf               Proxy de /api y /ws en la imagen de producción
│   ├── editor-models/           20 GLB/GLTF que el editor ofrece en su paleta
│   ├── public/assets/           Fotos, texturas, audio y avatares versionados
│   ├── scripts/measure-memory.mjs   Medición de heap de la escena
│   ├── src/                     Código del visor y del editor
│   └── tests/                   Pruebas de `node:test`
│
├── campus-backend/
│   ├── pom.xml                  Spring Boot 4.1.2, Java 21 y sus starters
│   ├── mvnw, mvnw.cmd, .mvn/    Maven Wrapper 3.10.0
│   ├── setup.md                 Guía de preparación del backend en Windows
│   ├── Containerfile.vercel     Imagen de producción (Temurin 21)
│   └── src/
│       ├── main/java/…/         Código por capas (ver más abajo)
│       ├── main/resources/      application.properties y migraciones SQL
│       └── test/java/…/         Pruebas JUnit
│
├── docs/                        Arquitectura, geografía, Docker, verificación y pendientes
├── scripts/                     Utilidades de preparación y de ensayo
├── .github/workflows/           Despliegue programado de producción desde main
├── vercel.json                  Servicios de frontend y backend en Vercel
└── design-qa.md                 Registro de revisión visual
```

## Frontend: cómo arranca el visor

`index.html` carga `src/main.ts`, que **primero** aplica el bloqueo de escritorio (`ui/desktop-access.ts`) y recién después importa `src/tour.ts`. Ese orden evita descargar el motor 3D en un celular. La entrada del editor repite la idea con `editor.html` y `src/editor/main.ts`.

El recorrido sigue este camino:

1. `ui/welcome.ts` restaura la sesión con `services/session.ts` (la cookie `JSESSIONID` es la única credencial) y monta la portada con el formulario de `ui/auth-form.ts`.
2. `services/presence.ts` abre `/ws/presence` y pide una plaza. Si el cupo está completo, lanza `AdmissionError` con motivo `full` y `tour.ts` muestra el aviso correspondiente.
3. `tour-runtime.ts` arma la interfaz (`ui/tour-shell.ts`, `ui/tour-controls.ts`, `ui/community.ts`, `ui/campus-content.ts`) y crea el `TourEngine`.
4. `scene/engine.ts` construye la escena, la cámara, el `Walker`, la flota de vehículos, los avatares remotos y el bucle de cuadros. Desde ese momento la presencia envía posiciones a 10 Hz.
5. `services/visit-lifecycle.ts` cierra la visita por 15 minutos de inactividad o al abandonar la página.

`tour-runtime.ts` expone además `window.tourDiagnostics` con escena, posición, draw calls y triángulos: sirve para comprobar el visor desde la consola del navegador.

## Frontend: archivos más importantes

### Puntos de entrada y coordinación

| Archivo | Qué hace | Cuándo tocarlo |
| --- | --- | --- |
| `src/main.ts` | Entrada del visor: bloqueo de dispositivo y carga diferida del recorrido | Cambiar la secuencia de arranque |
| `src/tour.ts` | Sesión, admisión de presencia, pantalla de error y «volver a intentar» | Cambiar el flujo de acceso o los mensajes de cupo |
| `src/tour-runtime.ts` | Monta la interfaz completa y expone `tourDiagnostics` | Agregar una capa de interfaz o diagnóstico |
| `src/editor/main.ts` | Entrada del editor, con el mismo bloqueo de escritorio | Cambiar el arranque del editor |

### `src/services/` — acceso a datos y protocolo

| Archivo | Qué hace |
| --- | --- |
| `api.ts` | Cliente HTTP único: pide `GET /api/auth/csrf` la primera vez que hace falta una escritura, envía el encabezado CSRF en cada `POST`, `PUT` o `DELETE`, aplica un tiempo límite de 10 segundos, lanza `ApiError` con el estado y traduce el contrato en español (`nombre`, `correo`, `rol`) al modelo de la interfaz (`name`, `email`, `role`). Manda `/auth`, `/trabajos`, `/materias` y `/health` a `/api`; el resto va a `/api/v1`, el prefijo del módulo retirado que todavía usan los paneles |
| `session.ts` | Distingue «no hay sesión» de «el servidor no responde» |
| `presence.ts` | WebSocket de presencia: admisión, cupo, reconexión, reloj ajustado al servidor, envío de pose, chat y gestos. `AdmissionError` distingue `full`, `auth` y `connection` |
| `social.ts` | Tipos del protocolo social (mensajes, invitaciones, gestos) y textos de los gestos |
| `works.ts` | Biblioteca: listado propio y general, paginación, alta, edición y borrado de trabajos |
| `visit-lifecycle.ts` | Vencimiento de la visita por inactividad y motivo del cierre |

### `src/data/` — el modelo es el dato

| Archivo | Qué hace | Regla |
| --- | --- | --- |
| `places.ts` | Catálogo de lugares visitables (id, nombre, piso, fotos, estado de la referencia) | **No cambiar los `id`**: los usan la interfaz, los paneles y las pruebas |
| `faculty-blueprint.ts` | Plano métrico de la facultad: bloques, aulas, pasillos, escaleras, plataformas y llegadas. Único origen de la geometría de CyT | Las medidas se respaldan en [base-geografica.md](base-geografica.md) |
| `faculty-annexes.ts` | Edificios secundarios con distancias estimadas: Laboratorio de Maquetas, Kampus Print, CTA–DICIA, DEI–LED, LED, DA/CAP, DAS y DG, con sus anclajes | Distinguir estimado de relevado |
| `campus-geometry.ts` | Huellas de OpenStreetMap, límites del campus y la transformación `facultyToWorld` (giro más traslación, sin escala) | Conservarla: aplica por igual a vista general y recorrido |
| `campus-layout.json` | Export de OSM en metros (huellas, caminos, árboles) con su procedencia y licencia | Se regenera con `scripts/import-campus-map.py` |
| `place-information.ts` | Textos editoriales de los puntos informativos, con fuente | Contenido, no lógica |
| `campus-zones.ts` | Nombres de zona y de piso para la barra del HUD | — |
| `skins.ts` | Paletas de avatar | El color lo asigna el servidor por cuenta |
| `editor-placements.json` | Colocaciones publicadas del editor | Se versiona: es el mapa compartido |
| `cantina-terrain.ts`, `cat-roaming-area.ts` | Terreno de cantina y zona de deambulación de los gatos | — |

### `src/scene/` — el modelo 3D

| Archivo | Qué hace |
| --- | --- |
| `engine.ts` | Motor del recorrido: escena, cámara, renderer, `OrbitControls`, modos (general, a pie, pausa), rayos de información y de asiento, teletransportes y bucle de cuadros |
| `campus.ts` | Une el contexto del campus con la facultad y aplica `facultyToWorld` a la geometría y a las colisiones |
| `faculty-reconstruction.ts` | Construye la facultad completa a partir de `data/`, reúne colliders, fusiona mallas y registra asientos |
| `faculty/*.ts` (41 archivos) | Un constructor por sector o detalle: cantina, baños, Sala Manfred, LED, DEI, galerías, aleros, mobiliario, pisos |
| `materials.ts` | Materiales y texturas compartidos (pasto, hormigón, baldosas) reutilizados por toda la escena |
| `editor-placements.ts` | Carga las colocaciones publicadas en el visor, en solo lectura |
| `avatar.ts`, `remote-players.ts`, `motion-buffer.ts` | Avatar articulado en GLB, interpolación del movimiento recibido y cámara exterior de gestos |
| `ragdoll.ts`, `social-performance.ts`, `social-audio.ts` | Caída con articulaciones y contactos, gestos en pareja y sonido por impacto |
| `seating.ts`, `entrance-doors.ts` | Marcadores de asiento y puertas corredizas con su barrera de colisión |
| `elevator.ts`, `elevator-audio.ts`, `faculty/elevator-shaft.ts` | Ascensor: estado, tiempos, sonidos y cabina |
| `vehicle-fleet.ts` | Las dieciséis camionetas compartidas: estado propio, objetivo interpolado y colisión en movimiento |
| `campus-cats.ts`, `cat-navigation.ts` | Gatos que recorren el campus |
| `campus-sky.ts`, `campus-rock.ts`, `campus-context.ts` | Cielo, terreno y entorno OSM |
| `courtyard-vegetation.ts`, `courtyard-elevator-tree.ts`, `cantina-tree.ts` | Vegetación con instancias y detalles compartidos para no duplicar memoria |

### `src/navigation/` — física del visitante

| Archivo | Qué hace |
| --- | --- |
| `walker.ts` | Cápsula del visitante: captura del mouse, WASD y flechas, salto, escaleras, rampas y jetpack |
| `collision-world.ts` | Índice de colisiones (`Octree` de Three.js) acotado en niveles y con margen en el máximo; se comparte entre caminante y gatos |
| `jetpack-physics.ts` | Empuje, techo y aterrizaje del jetpack, independiente de la tasa de cuadros |
| `vehicle-physics.ts` | Aceleración, giro y freno de mano de las camionetas |
| `moving-collider.ts` | Collider que sigue a un objeto en movimiento |
| `pick-destination.ts` | Convierte un clic en un destino con apoyo real, sin sustituirlo por un lugar del catálogo |

### `src/ui/` — interfaz

| Archivo | Qué hace |
| --- | --- |
| `tour-shell.ts` | Barra superior, diálogo compartido, avisos y estado de la red |
| `tour-controls.ts` | Modos de cámara, HUD, ayuda y transición entre vista general y recorrido |
| `community.ts` | Sesión, presencia, biblioteca, chat y gestos desde la cuenta |
| `campus-content.ts` | Explorador de lugares y paneles informativos |
| `library.ts` | Biblioteca de trabajos propia y general |
| `social-hud.ts` | Chat, invitaciones y gestos en pantalla |
| `welcome.ts`, `auth-form.ts` | Portada, acceso, registro y cuenta recordada |
| `desktop-access.ts`, `fonts.css` | Bloqueo en móviles y tipografía compartida |
| `campus-map.ts` | Plano 2D dibujado con las mismas huellas que la vista 3D |
| `visit-loading.ts`, `dom.ts`, `icons.ts` | Capa de carga, utilidades de DOM y escapes, e iconos |
| `tour-theme.css` y el resto de los CSS | Tema, controles, diálogos y HUD |

### `src/editor/` — editor de mapa 3D

| Archivo | Qué hace |
| --- | --- |
| `editor.ts` | Arrastrar modelos, borrador en `localStorage`, publicar o descargar el JSON y exportar/importar |
| `model-catalog.ts` | Catálogo de `.glb` y `.gltf` de `frontend/editor-models/` |
| `model-order.ts` | Orden de la paleta: último agregado primero |
| `placements-schema.ts` | Esquema y saneamiento de las colocaciones |
| `env.d.ts` | Tipos de los módulos virtuales de Vite |

`vite.config.ts` aporta dos piezas que solo existen en desarrollo: el módulo virtual `virtual:editor-model-dates` (fecha del commit que agregó cada modelo) y el endpoint `POST /api/editor-placements`, que escribe el JSON en el repositorio. Están documentados en [Arquitectura](arquitectura.md).

## Backend: capas y archivos principales

El backend es una API REST más un WebSocket. No sirve páginas: `/` no existe y `/api/health` es la comprobación útil. Cada escritura pasa por validación de DTO, sesión, CSRF y propiedad en el servidor.

```
controller/  →  service/  →  repository/  →  model/  (JPA)
      ↕             ↕
    dto/         config/         multiplayer/
```

| Capa | Archivos | Responsabilidad |
| --- | --- | --- |
| `CampusBackendApplication` | 1 | Arranque de Spring Boot |
| `controller/` | `AuthController`, `TrabajoController`, `MateriaController`, `HealthController`, `ContenidoExceptionHandler` | Rutas HTTP, validación de entrada y traducción de errores a códigos |
| `service/` | `AuthService`, `UsuarioService`, `TrabajoService`, `MateriaService`, `CustomUserDetailsService` | Reglas de negocio y control de propiedad; `CustomUserDetailsService` traduce rol 1 y 2 a `ROLE_ESTUDIANTE` y `ROLE_ADMIN` |
| `repository/` | `UsuarioRepository`, `TrabajoRepository`, `MateriaRepository`, `ArchivoTrabajoRepository` | Consultas Spring Data JPA |
| `model/` | `Usuario`, `Trabajo`, `Materia`, `ArchivoTrabajo` | Entidades; Hibernate valida el esquema, no lo crea |
| `dto/` | `RegistroRequest`, `LoginRequest`, `TrabajoRequest`, respuestas, `PaginaTrabajosResponse`, `ChatMessage`, `SocialAction`, `VehicleState` | Contratos de entrada y salida, con anotaciones de validación |
| `config/` | `SecurityConfig`, `AuthenticationConfig`, `PasswordConfig`, `SessionCookieConfig` | Cadena de seguridad, codificación de contraseñas y cookie de sesión (HttpOnly, SameSite) |
| `multiplayer/` | ver tabla siguiente | Presencia, chat, gestos y vehículos compartidos |

### `multiplayer/` — el estado compartido

| Archivo | Qué hace |
| --- | --- |
| `PresenceSocket.java` | El WebSocket `/ws/presence`: admisión con cupo de diez, validación de mensajes, difusión de posiciones, chat y gestos. Es el archivo más grande del backend |
| `PresenceConfig.java` | Registro del handler, verificación de sesión en el handshake y orígenes permitidos (`CAMPUS_FRONTEND_ORIGINS`) |
| `PresenceStore.java` | Presencia compartida entre instancias a través de PostgreSQL (`JdbcTemplate`): publica y lee posiciones y sesiones |
| `SocialService.java`, `SocialActions.java`, `SocialRelay.java` | Invitaciones, vencimiento a los 12 segundos, límites de envío y entrega entre instancias |
| `RecentChat.java`, `ChatArchive.java` | Mensajes recientes en memoria y archivo en PostgreSQL a los cinco minutos |
| `VehicleService.java`, `VehicleStore.java` | Flota compartida: posiciones y reserva atómica del conductor en PostgreSQL |
| `AvatarColor.java` | Color estable por cuenta |

### Migraciones

Se aplican en orden al arrancar el backend. Una base nueva recibe las catorce; una existente, solo las pendientes.

| Versión | Contenido |
| --- | --- |
| V1 a V3 | Usuarios, trabajos y metadatos de archivos |
| V4 a V7 | Materias, catálogo (70 materias y 106 asociaciones), relación con trabajos y materia obligatoria |
| V8 | Apariencia histórica del avatar, conservada por compatibilidad |
| V9, V10 | Sesiones JDBC, presencia compartida y cupo global de diez |
| V11, V12 | Chat e interacciones; camionetas compartidas |
| V13, V14 | Metadatos de archivos de trabajo y plazas adicionales del LED |

Nunca se edita una migración ya aplicada: el cambio se hace con una nueva versión. Si hay que corregir el historial, se documenta en [Correcciones](correcciones.md).

## Recursos y datos versionados

| Ruta | Contenido | Cómo se mantiene |
| --- | --- | --- |
| `frontend/public/assets/photos/` | Fotos de los lugares | Derivadas de los originales con `scripts/prepare-assets.py` |
| `frontend/public/assets/textures/`, `vegetation/`, `ascensor/`, `audio/`, `avatar/` | Texturas, follaje, cabina y sonidos | Ídem; los `.glb` de escaneos se versionan con `git add -f` |
| `frontend/public/assets/sources.json` | Procedencia, licencia y hash de cada recurso | Lo escribe `prepare-assets.py`; no editar a mano |
| `frontend/editor-models/` | 20 modelos que el editor coloca sobre el campus | Se agregan con `git add -f` y aparecen solos en la paleta |
| `frontend/src/data/editor-placements.json` | Colocaciones publicadas | Lo escribe el editor en desarrollo; se versiona |

Los originales (HEIC, escaneos y la carpeta compartida de Drive) quedan fuera del repositorio y se tratan como solo lectura.

## Herramientas y scripts

| Script | Para qué |
| --- | --- |
| `scripts/import-campus-map.py` | Convierte un export de OSM en `campus-layout.json` en metros |
| `scripts/prepare-assets.py` | Genera fotos, texturas y `sources.json` desde la carpeta compartida |
| `scripts/prepare-courtyard-tree-assets.py`, `prepare-elevator-assets.py` | Recursos del árbol del patio y del ascensor |
| `scripts/blender/*.py` | Regeneran el avatar, los árboles y el mobiliario; el GLB ya está versionado |
| `scripts/verify-presence-capacity.mjs` | Ensayo de cupo contra dos instancias locales |
| `scripts/verify-shared-vehicles.mjs` | Ensayo de camionetas compartidas |
| `scripts/postgres-test-latency.mjs` | Retrasa el tráfico a PostgreSQL para probar la sincronización |
| `scripts/scheduled-deploy.test.cjs` | Prueba el script del flujo de despliegue |
| `frontend/scripts/measure-memory.mjs` | Mide heap, buffers y memoria del proceso tras diez minutos simulados |

Scripts de npm, desde `frontend/`: `dev` (Vite en 127.0.0.1), `build` (TypeScript y Vite), `test` (`node --test tests/*.test.mjs`), `measure:memory` y `preview`.

## Configuración, compilación y despliegue

| Archivo | Qué define |
| --- | --- |
| `frontend/vite.config.ts` | Proxy de `/api` y `/ws` a `CAMPUS_API_URL`, dos páginas HTML, plugin de fechas de modelos y endpoint de publicaciones, y separación del paquete de Three.js |
| `frontend/package.json` | Versiones fijas de Three.js, TypeScript y Vite, más `engines` de Node 24 |
| `frontend/tsconfig.json` | TypeScript estricto, `noEmit`, módulos ESNext |
| `campus-backend/pom.xml` | Spring Boot 4.1.2, Java 21, starters de webmvc, JPA, validation, Flyway, Security, Session JDBC y WebSocket |
| `campus-backend/src/main/resources/application.properties` | Puerto, datasource por variables de entorno, cookie de sesión, Flyway y carga opcional de `.env` |
| `compose.yaml` | Los tres servicios locales y el volumen `pgdata` |
| `frontend/Containerfile`, `frontend/nginx.conf` | Build con Node 24 y publicación con proxy al backend |
| `campus-backend/Containerfile.vercel` | Imagen de producción con Temurin 21 |
| `vercel.json` | Servicios de frontend y backend, y reescrituras de `/api` y `/ws` |
| `.github/workflows/scheduled-vercel-production.yml` | Despliegue programado de `main` solo si cambió, sujeto a una variable de repositorio |

## Pruebas: dónde está cada cosa

| Grupo | Archivos | Cubre |
| --- | --- | --- |
| Geometría y datos | `campus-layout`, `faculty-blueprint`, `faculty-annexes`, `cantina-terrain`, `paving-cutouts`, `roof-collision`, `bedelia-windows`, `dei-forecourt-layout`, `campus-cats` | Medidas, huellas, encuentros de piso, colisiones del modelo y recorrido de los gatos |
| Navegación | `walker-capture`, `collision-world`, `pick-destination`, `scene-startup`, `gesture-space` | Cápsula, captura del mouse, destinos y despegue de gestos |
| Multijugador | `admission`, `session`, `remote-movement`, `social`, `social-controls`, `seating`, `vehicles`, `visit-lifecycle`, `motion-buffer` | Cupo, sesión, interpolación, chat, gestos, asientos y camionetas |
| Integración optativa | `chat.integration.mjs` | Chat real contra un backend desechable; exige `TEST_BASE_URL` y `CHAT_TEST_ALLOW_MUTATION=yes`, así que no corre en `npm test` |
| Interfaz y editorial | `desktop-access`, `assets`, `editor-placements`, `editor-model-order`, `place-information` | Bloqueo móvil, recursos, editor y textos |
| Backend | `PresenceSocketTest`, `SocialServiceTest`, `VehicleServiceTest`, `VehicleStoreTest`, `PresenceStoreTest`, `SessionCookie*Test`, `HistoricalMigrationRecoveryTest`, `JetpackPoseTest` | Protocolo de presencia, cupo, cookies y recuperación de migraciones |

## Guía rápida: quiero cambiar algo

| Quiero… | Archivos |
| --- | --- |
| Mover un edificio, un aula o un sendero | `data/faculty-blueprint.ts` (y `faculty-annexes.ts` si es un anexo), después `npm test` |
| Agregar un lugar visitable | `data/places.ts` y la llegada correspondiente en `faculty-blueprint.ts` |
| Agregar un punto informativo | `data/place-information.ts` y el anclaje en `faculty-blueprint.ts` o `faculty-annexes.ts` |
| Cambiar el aspecto de la facultad | `scene/faculty/*.ts` y `scene/materials.ts` |
| Ajustar controles o física del visitante | `navigation/walker.ts`, `jetpack-physics.ts`, `engine.ts` |
| Cambiar la interfaz o el menú | `ui/tour-shell.ts`, `tour-controls.ts` y los CSS de `ui/` |
| Tocar el chat o los gestos | `services/social.ts`, `ui/social-hud.ts` en el cliente; `multiplayer/SocialService.java` y `PresenceSocket.java` en el servidor |
| Agregar o cambiar una ruta HTTP | `controller/`, `service/`, `repository/` y `dto/`, en ese orden, más la documentación en [Arquitectura](arquitectura.md) |
| Cambiar el esquema | Nueva migración en `db/migration/`; nunca editar una aplicada |
| Agregar modelos al editor | Copiar el GLB a `frontend/editor-models/` con `git add -f` |
| Cambiar el arranque local | `compose.yaml`, `frontend/Containerfile`, `campus-backend/Containerfile.vercel` |

## Qué no está en el repositorio

`node_modules/`, `dist/`, `target/`, `.env`, las bases locales, los originales de fotos y escaneos, `para_la_ia/`, `output/` y `frontend/src/replica*` (un banco de pruebas local) están en `.gitignore`. Si falta uno de esos recursos, el visor falla al cargar fotos: se regeneran con `scripts/prepare-assets.py` a partir de la carpeta compartida.
