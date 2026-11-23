# Arquitectura y contratos

El frontend corre en Vite y `campus-backend/` sirve la API y el WebSocket de presencia. Vite redirige `/api` y `/ws` al backend para mantener un mismo origen en el navegador. Solo Spring Boot accede a PostgreSQL. [Inicio con multijugador](../README.md#inicio-con-multijugador).

Vite apunta al backend en `http://127.0.0.1:8080` por defecto. Para usar otra dirección, configurá `CAMPUS_API_URL` antes de iniciar Vite. Para probar el recorrido en la red local, ejecutá `npm run dev -- --host 0.0.0.0` desde `frontend/` y abrí el visor con la IP del equipo anfitrión.

## Componentes

| Capa | Contenido |
| --- | --- |
| Frontend `frontend/src` | Three.js directo, TypeScript estricto, Vite. `data/` (catálogo `places.ts`, geografía), `scene/`, `navigation/` (cápsula, colisiones, gravedad), `services/` (`api.ts` REST, `presence.ts` WebSocket, `social.ts` DTO de chat y gestos), `ui/`. Un único modelo procedural de CyT para todas las visitas; avatares articulados en GLB. |
| Backend `campus-backend/` | Autenticación y sesiones, materias, trabajos y presencia multijugador. |
| Datos | PostgreSQL con JPA y Flyway (`ddl-auto=validate`). |

`main.ts` comprueba el dispositivo antes de importar `tour.ts`, que monta la interfaz, el motor del recorrido y la comunidad. `editor/main.ts` aplica el mismo bloqueo antes de importar el editor. En celulares y tabletas se muestra un aviso con las fuentes compartidas en `ui/fonts.css`; no se inicia el motor 3D. La detección usa señales explícitas de dispositivo móvil del navegador y la identificación de iPad con interfaz de escritorio. El tipo de puntero y el ancho de la ventana no bloquean el acceso: una PC puede reportar únicamente entrada táctil. En `ui/`, `tour-shell.ts` monta la barra y administra el diálogo compartido, `tour-controls.ts` maneja la cámara y los modos del visor, y `community.ts` dirige la sesión y la presencia. La biblioteca y los paneles se implementan en `library.ts` y `campus-content.ts`.

`editor/` monta el editor de mapa 3D de `/editor.html`: descubre los `.glb` y `.gltf` de `frontend/editor-models/`, ordena la paleta con el último agregado primero y permite colocar objetos sobre el campus. Las colocaciones compartidas viajan versionadas en `frontend/src/data/editor-placements.json`, de modo que el mapa aparece igual en el sitio publicado (Vercel) y en las computadoras de todos los compañeros. El editor trabaja sobre un borrador local en `localStorage` y, al pulsar «Publicar mapa», guarda directamente en `editor-placements.json` (mediante endpoint de desarrollo en Vite o descarga manual). El orden de la paleta sale de `virtual:editor-model-dates` (`vite.config.ts`), que combina el commit que agregó cada archivo con su fecha de modificación cuando todavía no está versionado, y se aplica en `editor/model-order.ts`. El visor principal (`TourEngine`) carga estas colocaciones publicadas como solo lectura.

`scene/faculty-reconstruction.ts` arma el modelo a partir de las medidas de `data/`. En `scene/faculty/` están los constructores de la torre de baños, la Sala Manfred, la cantina y los anexos. Usan las mismas primitivas para añadir geometría visible y colisiones al marco de cada sector. El ascensor se arma en `scene/faculty/elevator-shaft.ts` (caja, murales, frentes y cabina). Su estado y sus tiempos están en `scene/elevator.ts`, y sus sonidos en `scene/elevator-audio.ts`, con Web Audio y el contexto creado en el primer gesto del visitante. `TourEngine` los une.

## Aporte campus-backend

El commit `9c5d019` retiró `backend/`. Sus contratos históricos de contenido y chat se conservan más abajo y su código sigue en `fd95f87`. Los archivos de Docker y Compose de ese módulo también quedaron en el historial. La ejecución actual se describe en [la guía del backend](../campus-backend/setup.md).

`campus-backend` compila con su propio Maven Wrapper y apunta a PostgreSQL local `TP_INFO3` con `DB_USER` y `DB_PASSWORD`. Expone `/api/materias` y `/api/trabajos` con listado paginado por materia y operaciones para el propietario o un administrador. La biblioteca usa estos contratos; los paneles siguen usando los anteriores. El chat y los gestos usan el protocolo actual de presencia. [Tareas pendientes](pendientes.md).

### Trabajos del usuario autenticado

El frontend abre «Mis trabajos» por defecto y permite cambiar a «Todos los trabajos». `services/works.ts` consulta las rutas actuales mediante el cliente compartido de sesión y CSRF; muestra páginas de 20 elementos. Los formularios de alta y edición envían `titulo`, `descripcion` y `materiaId`, con opciones cargadas de `/api/materias`. Las tarjetas muestran materia, título y descripción, con acciones para el propietario o un administrador. No hay enlace ni adjunto en el contrato actual. Los fallos muestran el mensaje del servicio y permiten reintentar; una respuesta 401 ofrece volver a la cuenta. El proxy local de Vite conserva su configuración.

`GET /api/trabajos/mis-trabajos?pagina=0&tamano=20` devuelve únicamente los trabajos de la cuenta activa identificada por la sesión, también cuando es administradora. No recibe un `usuarioId` del cliente. Requiere sesión autenticada; sin ella responde 401.

La página comienza en 0 y el tamaño admite entre 1 y 100 elementos; los valores predeterminados son 0 y 20. Los valores fuera de rango devuelven 400. Ordena por `fechaPublicacion` e `id` descendentes y conserva el formato `PaginaTrabajosResponse`: `contenido`, `pagina`, `tamano`, `totalElementos` y `totalPaginas`. Cada elemento usa `TrabajoResponse`; si no hay resultados, `contenido` es una lista vacía. El listado general y su filtro por materia mantienen su contrato.

## Usuarios, sesiones y multijugador en campus-backend

El visor usa `/api/auth/registro`, `/api/auth/login`, `/api/auth/me` y `/api/auth/logout`. Las escrituras requieren el token de `GET /api/auth/csrf`. El inicio de sesión rota el identificador de la sesión existente y restaura la identidad de Spring Security a través de la cookie HttpOnly. La tabla `usuarios` guarda los perfiles. V8 conserva la apariencia histórica. Desde el 19/11/2026 la respuesta de cuenta y presencia asigna `skin` como hexadecimal RGB calculado por `AvatarColor` a partir del id de cuenta; no hay selector ni se acepta un color enviado por el cliente.

`/ws/presence` es un WebSocket JSON autenticado con la sesión HTTP. Spring admite el mismo origen y los orígenes adicionales enumerados en `CAMPUS_FRONTEND_ORIGINS`, separados por comas. La configuración del proxy para el equipo está en el [inicio con multijugador](../README.md#inicio-con-multijugador). El cliente envía posición de los pies, orientación y marcha en coordenadas del mundo hasta 10 Hz cuando cambian; quieto manda un ping cada cinco segundos. La respuesta identifica la conexión propia y contiene la lista de avatares visibles. El servidor asigna nombre e identidad y carga la apariencia guardada. El visor interpola el movimiento. Al volver a la vista general, desconectarse o cerrar sesión se retira el avatar. Las posiciones son efímeras y el ascensor todavía se simula por cliente.

Las rutas `/api/v1` y el chat STOMP de las secciones siguientes pertenecen al módulo retirado. El multijugador conecta las cuentas y la presencia del recorrido al backend actual.

## Chat grupal y gestos

El mismo WebSocket autenticado `/ws/presence` transporta mensajes JSON sociales con `type`. Solo se procesan para una plaza admitida, visible y con sesión validada recientemente. No se agregó una ruta pública ni se deshabilitó CSRF en REST. El origen de WebSocket sigue validándose en el handshake. El nombre, identidad, color, ids y tiempos los asigna el servidor. Mensajes limitados a 500 caracteres y un envío por segundo por cuenta e instancia; comandos con separación mínima de 150 ms por conexión. No hay mensajes privados.

| Cliente → servidor | Datos y comportamiento |
| --- | --- |
| `social.sync` | Devuelve `chat.recent` con los últimos cinco minutos en RAM y las interacciones actuales. No consulta el archivo del chat. Se envía al aparecer en el recorrido y al reconectar. |
| `chat.send` | `{text}`; difunde `chat.message` con `message: {id, userId, name, text, sentAt}`. Texto mostrado mediante `textContent`. |
| `chat.history` | Solo lo pide el chat abierto con C o desde la cuenta. Cursores opcionales `before` (milisegundos) y `beforeId` (UUID). Devuelve hasta 50 mensajes archivados, más recientes primero, y `more`. Paginación por `(sent_at, id)`. |
| `social.request` | `{kind, target?}`; tipos `high-five`, `hold-hands`, `ok`, `peace`, `ragdoll`. Las parejas exigen otra cuenta, cercanía ≤1,9 m, altura compatible, orientación y disponibilidad de ambos. |
| `social.respond` | `{id, accept}`; solo el destinatario puede aceptar/rechazar una invitación pendiente. Se vuelve a validar cercanía al aceptar. |
| `social.cancel` | `{id}`; solo participantes. El cliente cancela si las anclas de la animación no tienen paso o espacio libre. |
| `social.impulse` | `{id, direction}`; direcciones `forward/back/left/right/up`. El servidor exige una caída activa del propio visitante; difunde el impulso. |

`social.action` contiene `action: {id, kind, from, to, fromName, toName, fromPose, toPose, status, startedAt, expiresAt}`. Las invitaciones pendientes solo se muestran a sus participantes. Los gestos aceptados se difunden a quienes recorren el campus, con el mismo inicio y duración. Las invitaciones duran 12 s; los gestos duran entre 3 y 6,5 s. Se anulan al vencer o desaparecer un participante. `social.error` comunica errores al emisor. Los eventos incluyen `serverNow` para compensar diferencias del reloj del navegador.

La migración V11 agrega `campus_chat_archive` y `campus_social_actions`. El chat reciente vive en `RecentChat`, sin INSERT antes de cumplir 300000 ms. Una tarea cada segundo archiva los vencidos y los elimina de RAM solo después de guardar. Si falla PostgreSQL se retienen para reintentar, pero se ocultan de la ventana reciente; el límite de 10000 mensajes en memoria evita crecimiento ilimitado. El archivo es idempotente por UUID. Un reinicio simultáneo de todas las instancias pierde los mensajes aún recientes: es el límite deliberado del almacenamiento en RAM.

`SocialRelay` usa PostgreSQL LISTEN/NOTIFY para comunicar instancias sin persistir el contenido reciente. Cada instancia con visitantes mantiene una copia RAM y puede archivar de forma idempotente. Al quedar sin visitantes conserva los mensajes pendientes de archivo, deja de incorporar mensajes nuevos y cierra el listener cuando se vacía esa RAM. Sin visitantes se omiten las consultas periódicas de acciones; una instancia vacía no mantiene la base activa con sondeos. Al conectar el listener solicita una copia de la ventana reciente a las instancias disponibles. Necesita una conexión PostgreSQL directa y persistente (sin pooler en modo transacción); reserva una conexión del pool. No es una cola durable: una interrupción del listener puede perder eventos en vivo; reconectar recupera la ventana que conserve otra instancia. Los cambios de consentimiento se serializan mediante transacción y bloqueo asesor en PostgreSQL.

El avatar se genera en Blender con `scripts/blender/campus_person.py`: jerarquía articulada y clips `Idle/Walk/HighFive/HoldHandsJump/OK/Peace/Fall` dentro de un GLB de unos 212 KiB. `Avatar` comparte geometrías y materiales fijos; cada usuario tiene su material de camiseta, mezclador e interpolación. Las manos de parejas se ajustan con cinemática inversa. Durante los gestos se usa una cámara exterior con comprobación de oclusión y se inmoviliza la navegación; Esc mantiene la pausa y los diálogos liberan el mouse.

`Ragdoll` simula 15 partículas a paso fijo de 1/120 s, enlaces de longitud, gravedad, fricción y restitución. Consulta los mismos octrees del caminante, incluidos el editor y las barreras activas. Los impactos físicos activan y modulan el sonido; los impulsos se validan y transmiten. Cada cliente simula visualmente el cuerpo con su geometría local: no es física autoritativa del servidor y puede diferir si los mapas locales difieren. Al finalizar se comprueba dónde puede ponerse de pie. La reproducción del audio se desbloquea con el gesto de comenzar/continuar el recorrido.

## API REST `/api/v1`

Convenciones: JSON; errores `{"message": "..."}`; cookie de sesión `JSESSIONID` (HttpOnly, SameSite=Lax, `Secure` si `COOKIE_SECURE=true`, 60 min). **Toda petición POST/PUT/DELETE exige CSRF, incluidos registro, login y logout**: pedir `GET /auth/csrf` y enviar `token` en el encabezado `headerName`. El token se invalida al iniciar sesión; pedir otro.

| Ruta | Acceso | Entrada | Respuesta |
| --- | --- | --- | --- |
| `GET /health` | pública | — | 200 `{status, version}` |
| `GET /auth/csrf` | pública | — | 200 `{token, headerName}` |
| `POST /auth/register` | pública | `name` ≤80, `email` válido ≤180, `password` 10–72 (≤72 bytes UTF-8) | 201 `{id, name, email, role}`; 409 correo repetido |
| `POST /auth/login` | pública | `email`, `password` ≤72 | 200 usuario; 401 credenciales |
| `POST /auth/logout` | sesión | — | 204; borra `JSESSIONID` |
| `GET /auth/me` | sesión | — | 200 usuario; 401 |
| `GET /works` | pública | — | 200 hasta 100 trabajos, más recientes primero: `{id, title, description, url, author, ownerId}` |
| `POST /works` | sesión | `title` ≤140, `description` ≤2000, `url` ≤2048 | 201 trabajo |
| `PUT /works/{id}` | propietario | igual que POST | 200; 403 si no es propio; 404 |
| `DELETE /works/{id}` | propietario | — | 204; 403; 404 |
| `GET /panels[?placeId=]` | pública | — | 200 `[{id, placeId, title, body, url}]` |
| `POST /panels` | `ADMIN` | `placeId` `[a-z0-9-]{1,80}`, `title` ≤140, `body` ≤5000, `url` opcional ≤2048 | 201 panel |
| `PUT /panels/{id}` | `ADMIN` | igual que POST | 200; 404 |
| `DELETE /panels/{id}` | `ADMIN` | — | 204; 404 |

- Errores comunes: 400 validación («Revisá los campos obligatorios y sus límites de longitud.») o enlace inválido; 401 sin sesión; 403 sin permiso o CSRF inválido; 409 integridad.
- Enlaces (`url`): solo `http`/`https` con host y sin credenciales embebidas. La biblioteca guarda enlaces, no archivos.
- `placeId` solo se valida por formato, no contra `places.ts`. Los paneles iniciales (Flyway) cubren `acceso`, `laboratorio`, `pasillo-p3`, `aula-p3`, `cantina-cyt` y `patio`; el resto de los espacios no tiene panel hasta que un administrador lo cree.
- Roles: registro crea `USER`. `ADMIN` se crea al arrancar con `ADMIN_EMAIL` y `ADMIN_PASSWORD` (≥12 caracteres, ≤72 bytes) solo si el correo no existe. Contraseñas con BCrypt (coste 12).

## Chat histórico retirado (STOMP sobre WebSocket)

| Paso | Detalle |
| --- | --- |
| Conexión | `/ws`; exige sesión y origen igual a `APP_ORIGIN` (local: `http://127.0.0.1:5173`). El `CONNECT` debe llevar `X-CSRF-TOKEN`. Mensaje ≤4096 bytes. |
| Enviar | `SEND /app/chat` con `{text}` (1–500 caracteres). Cualquier otro destino se rechaza. |
| Recibir | `SUBSCRIBE /topic/campus` → `{name, text, sentAt}`. `name` sale de la sesión del servidor, no del cliente. Única suscripción permitida. |

Broker en memoria: una sola instancia de backend, sin historial.

## No incluido en esta versión

Subida de archivos y agente IA. El historial de chat pertenece al protocolo actual descrito en Chat grupal y gestos.

## Presencia compartida y cupo

V9 agrega Spring Session JDBC y campus_presence para compartir sesiones y avatares entre instancias de Vercel. V10 reserva un máximo global de 10 plazas de recorrido mediante una transacción con bloqueo asesor de PostgreSQL y una restricción única por plaza. Cada visita admitida ocupa una plaza, también en vista general; la pantalla de acceso no ocupa ninguna. El servidor envía los jugadores de todas las instancias y calcula el color estable a partir del id de cuenta. Las posiciones caducan después de 20 segundos sin actualizarse y se retiran al salir o cerrar sesión. El cliente solicita join antes de descargar o construir el visor. El servidor reserva una plaza con la misma transacción global y confirma con {"admitted":true}; si no queda lugar cierra con 4001. El cliente muestra Recorrido completo y un botón para reintentar manualmente, sin bucle automático ni acceso al 3D. La cuenta permanece recordada.

Los mensajes de movimiento reemplazan la última posición del visitante en memoria. join reserva la plaza en PostgreSQL antes de abrir el visor; la primera posición solo inicia la aparición del avatar. Cada ciclo del servidor sincroniza todas las posiciones locales, consulta las posiciones globales y verifica las sesiones con una única operación SQL. La sentencia usa RETURNING para incluir los cambios de ese mismo ciclo en la respuesta. Así, la cantidad de viajes a la base por ciclo se mantiene constante al aumentar los jugadores. Al perder una plaza durante una interrupción se cierra la conexión con error de servidor para activar la reconexión del cliente. Los errores de persistencia durante la admisión se propagan al manejador WebSocket para registrarlos y cerrar la conexión.

### Asientos del recorrido
Marcadores locales registran dos plazas por banco y una por silla; heredan la transformación del mobiliario. E selecciona una plaza cercana libre y al salir restaura la posición de aproximación. La pose existente de presencia transmite la posición de cadera; los clientes reconocen esa posición para mostrar piernas flexionadas y ocupación. Un conflicto simultáneo se resuelve en la siguiente instantánea por id de visitante. No es una reserva autoritativa del servidor: requiere clientes actualizados, sesión y conexión a presencia; visitantes desconectados no comparten ocupación. No cambia el contrato WebSocket.


### Fluidez y consumo de presencia

La difusión WebSocket y el intercambio PostgreSQL usan planificadores independientes de un hilo. La difusión, hasta 10 Hz, mezcla posiciones locales recientes con la última copia remota y omite instantáneas idénticas salvo un latido cada cinco segundos. No consulta la base. La admisión inicial y la salida explícita sí acceden a PostgreSQL para conservar el cupo global.

El intercambio compartido hace como máximo cinco consultas por segundo **por instancia** (200 ms de espera más la duración de la consulta); tras un segundo sin movimiento local ni remoto conocido baja aproximadamente a una consulta cada dos segundos. Sin conexiones ni bajas pendientes no consulta. El lote refresca también la caducidad de visitantes quietos. Se siguen validando las sesiones; si no se logra sincronizar durante cinco segundos se suspende la difusión hasta recuperar la validación. Las bajas de conexiones cerradas se eliminan aun si salió el último visitante.

Cada pose incluye `at`, una marca temporal asignada por el servidor y conservada entre instancias. El cliente ignora poses duplicadas y reproduce un historial con un retardo adaptable de 120–450 ms; ajusta ese retardo gradualmente para no frenar al cambiar la cadencia. La predicción se limita a 100 ms; los teletransportes mayores de cinco metros reinician el historial. Esto intercambia una pequeña demora visual por continuidad y menos consultas. Los límites gratuitos dependen del tráfico y de las instancias activas: estas frecuencias limitan trabajo, no garantizan una cuota mensual determinada.


## Acceso previo y sesión recordada

Antes de construir el visor, `tour.ts` presenta `ui/welcome.ts` y hace una sola consulta a `/api/auth/me` mediante `services/session.ts`. Si la cookie identifica una cuenta válida, se muestra su nombre y se exige elegir Continuar con esta cuenta o Usar otra cuenta. Reconocer una cuenta no inicia el recorrido. Continuar vuelve a validar la identidad antes de abrir el campus; si cambió en otra pestaña se pide confirmar de nuevo. Si responde 401 se ofrecen únicamente inicio de sesión y registro. Un fallo de red muestra reintento; no se elimina ni reemplaza una credencial guardada. El formulario compartido `ui/auth-form.ts` sirve para la bienvenida y el diálogo de cuenta.

La cookie `JSESSIONID` usa Path=/, HttpOnly, SameSite=Lax y duración de 30 días; la caducidad de sesión del servidor y de Spring Session también es de 30 días de inactividad. HTTPS conserva la detección de cookie segura mediante las cabeceras del proxy. La contraseña y los identificadores de sesión no se guardan en localStorage. El cierre de sesión invalida la sesión en el servidor. La preferencia visual continúa usando localStorage. Configuración documentada por Spring: https://docs.spring.io/spring-boot/appendix/application-properties/ y https://docs.spring.io/spring-session/reference/configuration/common.html .

`ui/tour-theme.css` comparte el mismo material, borde, radios, fuentes y colores entre barra principal, cuenta, biblioteca, chat, administración, ayuda y acceso. Los temas claro/oscuro y el modo a pie seleccionan la misma variante para todos los paneles. Al abrir un diálogo se cierra el desplegable previo.


## Funciones retiradas del recorrido (18/11/2026)

Se retiraron Eliminar objeto y Restaurar objetos eliminados del menú público del recorrido, sus manejadores de selección y confirmación, y el registro y aplicación de borrados locales. La clave histórica `cyt-scene-removals-v1` ya no se lee: el campus vuelve a construirse completo con sus colisiones. Se quitaron las exclusiones del agrupado de mallas que solo necesitaba la selección para borrar. No se modifican las coordenadas ni las dimensiones del modelo.

Mi cuenta ya no ofrece selector ni guardado de apariencia; también se retiraron `PUT /api/auth/skin`, el servicio de cambio y la actualización de apariencia en presencia. La columna existente y las paletas históricas se conservan por compatibilidad; desde el 19/11/2026 el color visible se deriva del id de cuenta. La bienvenida ya no anuncia personalización.


## Duración de la visita y cuenta recordada

La visita multijugador y la cuenta recordada tienen ciclos distintos. `services/visit-lifecycle.ts` termina la visita tras 900000 ms (15 minutos) sin teclado, mouse o rueda. Pings, snapshots, renderizado y foco no reinician ese plazo. Se comprueba también al volver de una pestaña oculta; una entrada tardía no revive una visita vencida. `pagehide` termina la visita al cerrar, navegar o recargar. `pageshow.persisted` fuerza el acceso de nuevo si el navegador restaura un documento desde su caché.

Finalizar la visita envía leave si el WebSocket está abierto, detiene sus temporizadores y reconexión, cierra el socket que comparte con el chat, limpia las interacciones y pausa los controles. Al vencer por inactividad se recarga el documento para liberar escena y manejadores; un aviso temporal en sessionStorage explica la salida. No contiene identidad ni contraseñas. El cierre WebSocket retira la presencia en el servidor; ante un corte abrupto sigue existiendo la caducidad de respaldo del backend.

La cookie de cuenta de 30 días se conserva al finalizar una visita, para ofrecer Continuar sin volver a pedir contraseña. No equivale a invalidar la autenticación persistente del servidor. Usar otra cuenta y Cerrar sesión sí invalidan esa autenticación mediante logout con CSRF. Las otras pestañas no se cierran al terminar una visita individual. El acceso al recorrido requiere una cuenta validada; no existe entrada como invitado. Cerrar sesión también finaliza el recorrido y vuelve al acceso.

`tour.ts` solo monta el acceso; importa `tour-runtime.ts` después de la elección. `ui/visit-loading.ts` mantiene una capa con animación de compositor e indicador indeterminado durante validación, descarga y construcción de la escena. El estado se pinta antes de comenzar el trabajo síncrono del modelo, se muestra el primer cuadro antes de quitarlo y respeta prefers-reduced-motion. La pantalla de entrada usa un panel compacto del mismo material y fuentes que los menús; no incluye hero ni eslóganes.


### Admisión previa al visor

La reserva se representa con una pose hidden en campus_presence, sin migración de esquema. exchange conserva esa marca y publish excluye esas poses de los avatares visibles. join es idempotente por conexión; hide retiene la plaza al salir del modo a pie, mientras leave o el cierre liberan la reserva. Los pings existentes mantienen la reserva durante la carga y la vista general; continúa la caducidad de 20 segundos ante un corte abrupto. No se agrega polling HTTP ni una conexión adicional: la misma conexión admitida se entrega a la comunidad del visor. Si falta la confirmación durante 15 segundos, se cierra la conexión y se ofrece reintentar; si una reconexión pierde el cupo, se vuelve al acceso sin permitir una visita fuera de cupo.


### Empuje del jetpack — 20/11/2026

Las poses y snapshots de presencia incorporan `jetpacking`, opcional para clientes anteriores y falso cuando falta. El emisor actualiza el empuje a 10 Hz mientras está activo y transmite su apagado aunque no cambie la posición. El servidor conserva el campo en memoria y en el snapshot JSON; el rango vertical admitido llega a 1.000.000 m. La interpolación del avatar aplica la bandera al escape y lo apaga ante datos antiguos. No se añaden tablas ni migraciones. La integración mantiene la configuración y el tratamiento de colisiones existentes en main.


### Cookies de sesión inválidas — 20/11/2026

`SessionCookieConfig` registra un filtro antes de Spring Session JDBC. Usa el CookieSerializer configurado por Spring Boot para leer los identificadores y omite únicamente las cookies de sesión que se decodifican a un ID vacío o con caracteres de control. Un NUL decodificado provocaba un error PostgreSQL UTF8 al consultar SPRING_SESSION, incluso en la ruta pública de CSRF; el cliente terminaba mostrando «El servicio no está disponible».

El filtro conserva las otras cookies, los identificadores válidos y toda la configuración del serializador: nombre, Base64, dominio, Path, HttpOnly, SameSite, Secure y duración. CSRF y el inicio de sesión generan la cookie nueva por el mecanismo existente. También se aplica en despachos ERROR/FORWARD, porque Tomcat puede recuperar el request original al presentar un 401/403. No cambia permisos, comprobación de contraseña ni protección CSRF; una cookie descartada deja al visitante sin autenticar.


### Camionetas compartidas (21/11/2026)
`VehicleFleet` controla las ocho Raptor con identificadores estables `raptor-0` a `raptor-7`. `driveStep` usa metros/segundos, inercia, frenado, retroceso y giro dependiente de la velocidad. Los subpasos limitan el avance a unos 10 cm. Las consultas de carrocería, neumáticos y cabina respetan los sólidos, los modelos del editor, otros vehículos y el límite de la isla. Los índices móviles transforman consultas a coordenadas locales; las camionetas salen del índice estático al crear el campus para evitar colisiones fantasma. Los gatos también consultan esos sólidos móviles.

El WebSocket autenticado de presencia acepta `vehicle.claim {id}`, `vehicle.update {id,x,y,z,yaw,speed,steer}` y `vehicle.release {id}`. Cada snapshot agrega `vehicles: [{id,x,y,z,yaw,speed,steer,driver,at}]`. La cámara de cabina se monta después de la reserva confirmada; los observadores interpolan poses y ocultan el avatar exterior del conductor. F baja en un punto apoyado y libre alrededor del vehículo. V cambia la cámara. Pausar, abrir diálogos y perder foco detiene el movimiento; cambiar de destino/vista cancela también una reserva pendiente.

`VehicleService` conserva únicamente el último movimiento por visitante y una cola acotada para reservas/salidas. Sincroniza fuera del hilo de WebSocket. `VehicleStore` opera ocho filas PostgreSQL creadas por Flyway V12: reserva atómica, un conductor por camioneta y una camioneta por presencia, cercanía y presencia visible al montar, escritura solo del propietario, velocidad y desplazamiento acotados. Las poses estacionadas son durables entre visitas e instancias. Salir, ocultar la presencia o desconectarse libera la reserva; una reserva sin latido caduca a los seis segundos. La física y las colisiones se calculan en el cliente, con validación de propiedad y límites de desplazamiento en el servidor.
