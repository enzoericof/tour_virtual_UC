# Arquitectura y contratos

El frontend corre en Vite y `campus-backend/` sirve la API y el WebSocket de presencia. Vite redirige `/api` y `/ws` al backend para mantener un mismo origen en el navegador. Solo Spring Boot accede a PostgreSQL. [Inicio con multijugador](../README.md#inicio-con-multijugador).

Vite apunta al backend en `http://127.0.0.1:8080` por defecto. Para usar otra dirección, configurá `CAMPUS_API_URL` antes de iniciar Vite. Para probar el recorrido en la red local, ejecutá `npm run dev -- --host 0.0.0.0` desde `frontend/` y abrí el visor con la IP del equipo anfitrión.

## Componentes

| Capa | Contenido |
| --- | --- |
| Frontend `frontend/src` | Three.js directo, TypeScript estricto, Vite. `data/` (catálogo `places.ts`, geografía), `scene/`, `navigation/` (cápsula, colisiones, gravedad), `services/` (`api.ts` REST, `chat.ts` STOMP), `ui/`. Un único modelo de CyT para todas las visitas; sin cargador de escenas GLB. |
| Backend `campus-backend/` | Autenticación y sesiones, materias, trabajos y presencia multijugador. |
| Datos | PostgreSQL con JPA y Flyway (`ddl-auto=validate`). |

`main.ts` comprueba el dispositivo antes de importar `tour.ts`, que monta la interfaz, el motor del recorrido y la comunidad. `editor/main.ts` aplica el mismo bloqueo antes de importar el editor. En celulares y tabletas se muestra un aviso con las fuentes compartidas en `ui/fonts.css`; no se inicia el motor 3D. La detección combina señales del navegador y del puntero, sin usar el ancho de la ventana como criterio de bloqueo. En `ui/`, `tour-shell.ts` monta la barra y administra el diálogo compartido, `tour-controls.ts` maneja la cámara y los modos del visor, y `community.ts` dirige la sesión y la presencia. La biblioteca y los paneles se implementan en `library.ts` y `campus-content.ts`.

`scene/faculty-reconstruction.ts` arma el modelo a partir de las medidas de `data/`. En `scene/faculty/` están los constructores de la torre de baños, la Sala Manfred, la cantina y los anexos. Usan las mismas primitivas para añadir geometría visible y colisiones al marco de cada sector.

## Aporte campus-backend

El commit `9c5d019` retiró `backend/`. Sus contratos históricos de contenido y chat se conservan más abajo y su código sigue en `fd95f87`. Los archivos de Docker y Compose de ese módulo también quedaron en el historial. La ejecución actual se describe en [la guía del backend](../campus-backend/setup.md).

`campus-backend` compila con su propio Maven Wrapper y apunta a PostgreSQL local `TP_INFO3` con `DB_USER` y `DB_PASSWORD`. Expone `/api/materias` y `/api/trabajos` con listado paginado por materia y operaciones para el propietario o un administrador. La biblioteca, los paneles y el chat del visor siguen usando los contratos anteriores. [Tareas pendientes](pendientes.md).

## Usuarios, sesiones y multijugador en campus-backend

El visor usa `/api/auth/registro`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout` y `/api/auth/skin`. Las escrituras requieren el token de `GET /api/auth/csrf`. El inicio de sesión rota el identificador de la sesión existente y restaura la identidad de Spring Security a través de la cookie HttpOnly. La tabla `usuarios` guarda los perfiles. V8 agrega `skin` con valor inicial `azul` para cuentas previas. Los valores admitidos son `azul`, `verde`, `terracota` y `violeta`.

`/ws/presence` es un WebSocket JSON autenticado con la sesión HTTP. Spring admite el mismo origen y los orígenes adicionales enumerados en `CAMPUS_FRONTEND_ORIGINS`, separados por comas. La configuración del proxy para el equipo está en el [inicio con multijugador](../README.md#inicio-con-multijugador). El cliente envía posición de los pies, orientación y marcha en coordenadas del mundo a 10 Hz. La respuesta identifica la conexión propia y contiene la lista de avatares visibles. El servidor asigna nombre e identidad y carga la apariencia guardada. El visor interpola el movimiento. Al volver a la vista general, desconectarse o cerrar sesión se retira el avatar. Las posiciones son efímeras y el ascensor todavía se simula por cliente.

Las rutas `/api/v1` y el chat STOMP de las secciones siguientes pertenecen al módulo retirado. El multijugador conecta las cuentas y la presencia del recorrido al backend actual.

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

## Chat (STOMP sobre WebSocket)

| Paso | Detalle |
| --- | --- |
| Conexión | `/ws`; exige sesión y origen igual a `APP_ORIGIN` (local: `http://127.0.0.1:5173`). El `CONNECT` debe llevar `X-CSRF-TOKEN`. Mensaje ≤4096 bytes. |
| Enviar | `SEND /app/chat` con `{text}` (1–500 caracteres). Cualquier otro destino se rechaza. |
| Recibir | `SUBSCRIBE /topic/campus` → `{name, text, sentAt}`. `name` sale de la sesión del servidor, no del cliente. Única suscripción permitida. |

Broker en memoria: una sola instancia de backend, sin historial.

## No incluido en esta versión

Historial de chat, subida de archivos, agente IA y despliegue público.

## Presencia compartida y cupo

V9 agrega Spring Session JDBC y campus_presence para compartir sesiones y avatares entre instancias de Vercel. V10 reserva un máximo global de 10 plazas de recorrido mediante una transacción con bloqueo asesor de PostgreSQL y una restricción única por plaza. Las conexiones en vista general no ocupan plaza. El servidor envía los jugadores de todas las instancias y toma las skins actuales de usuarios. Las posiciones caducan después de 20 segundos sin actualizarse y se retiran al salir o cerrar sesión. El cliente muestra cupo completo ante el cierre WebSocket 4001 y reintenta después de 10 segundos.

Los mensajes de movimiento reemplazan la última posición del visitante en memoria. La primera posición reserva la plaza en PostgreSQL. Cada ciclo del servidor sincroniza todas las posiciones locales, consulta las posiciones globales y verifica las sesiones con una única operación SQL. La sentencia usa RETURNING para incluir los cambios de ese mismo ciclo en la respuesta. Así, la cantidad de viajes a la base por ciclo se mantiene constante al aumentar los jugadores. Al perder una plaza durante una interrupción se cierra la conexión con error de servidor para activar la reconexión del cliente. Los errores de persistencia durante la admisión se propagan al manejador WebSocket para registrarlos y cerrar la conexión.
