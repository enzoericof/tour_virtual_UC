# Arquitectura y contratos

Monolito: el backend Spring Boot sirve la API, el WebSocket y, en Docker, el frontend compilado (mismo origen). Solo el backend accede a la base. Versiones: [README](../README.md#stack).

## Componentes

| Capa | Contenido |
| --- | --- |
| Frontend `frontend/src` | Three.js directo, TypeScript estricto, Vite. `data/` (catálogo `places.ts`, geografía), `scene/`, `navigation/` (cápsula, colisiones, gravedad), `services/` (`api.ts` REST, `chat.ts` STOMP), `ui/`. Un único modelo de CyT para todas las visitas; sin cargador de escenas GLB. |
| Backend `py.edu.uc.tour` | `users` (registro, login), `security` (sesiones, CSRF, alta de ADMIN), `content` (trabajos y paneles), `chat`. |
| Datos | JPA + Flyway (`V1__initial_schema.sql`: `campus_user`, `work`, `panel`; `ddl-auto=validate`). PostgreSQL 18 en entrega; H2 en modo PostgreSQL solo con el perfil `local`. |
| Despliegue | `Dockerfile` en 3 etapas (build del frontend → copia a `static/` del JAR → JRE). `compose.yaml`: `app` (8080, solo en 127.0.0.1) y `database` (sin puerto publicado, volumen `campus-data`). |

## Aporte campus-backend

**Estado al 03/11/2026:** el commit `9c5d019` (CRUD de trabajos por materia en `campus-backend`) retiró la carpeta `backend/` del repositorio; su guía `campus-backend/setup.md` la llama «carpeta retirada». No se adaptaron el frontend, el `Dockerfile` ni `compose.yaml`: el frontend sigue llamando a `/api/v1` y a `/ws`, que `campus-backend` no ofrece, y la imagen de Docker no compila porque copia `backend/`. Hasta que el equipo decida cómo seguir, los contratos de esta página describen el servidor retirado (recuperable desde `fd95f87`) y no hay un servidor compatible con el frontend en `main`. Tarea en [pendientes](pendientes.md).

`campus-backend` compila con su propio Maven Wrapper (03/11/2026). Expone `/api/auth/registro`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`, `/api/materias` y `/api/trabajos` (listado paginado y por materia, alta, edición y baja del propietario o de un administrador). Lectura de trabajos solo con sesión, errores con la clave `mensaje` y CSRF desactivado: tres diferencias con lo que exige AGENTS.md para el servidor integrado.

Integrado desde `feature/campus-backend` el 01/11/2026 para conservar el trabajo del equipo. Es un proyecto separado con usuarios, autenticación y modelos de trabajos/archivos; no está conectado al frontend ni al Dockerfile. El servidor activo continúa en `backend/`.

El aporte usa Java 21 en su POM y rutas `/api/auth/registro`, `/api/auth/login` y `/api/auth/logout`, distintas de `/api/v1`. Apunta a PostgreSQL local `TP_INFO3`, con variables `DB_USER` y `DB_PASSWORD`; su prueba de contexto requiere esa base. La configuración actual desactiva CSRF y necesita adecuarse a la política del proyecto antes de usarla como sustituto del servidor. Ambos proyectos configuran el puerto 8080 y no deben arrancarse juntos con esa configuración.

Su incorporación conserva código e historial; no unifica los contratos, las migraciones ni las funciones de seguridad. La compilación se verificó con Java 25 usando el Maven Wrapper de `backend/` y `-DskipTests`; no se declara verificado el arranque del aporte con PostgreSQL.

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

Avatares sincronizados, historial de chat, subida de archivos, agente IA y despliegue público.
