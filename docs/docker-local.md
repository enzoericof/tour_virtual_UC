# Todo el proyecto en Docker

Guía para levantar PostgreSQL, el backend Spring Boot y el frontend Vite con un
solo `docker compose up`. No hace falta instalar JDK, Maven, Node ni usar Neon:
la base de datos también corre en un contenedor.

Esta configuración es para desarrollo local. Las credenciales de la base son
valores de ejemplo; no usarlas en producción. Los pasos resumidos, junto con la
vía sin Docker, están en el [README](../README.md#ejecución-local-con-docker-recomendada).

Comprobado el 26/11/2026: `docker compose build` y `docker compose up -d` con las
tres imágenes, `/api/health` por los puertos 5173 y 8080, registro, inicio de
sesión, consultas autenticadas, WebSocket `/ws/presence` a través de nginx y la
promoción de una cuenta administradora con `psql`. El detalle está en el
[registro de verificación](verificacion.md).

### 1. Requisitos e instalación

En **Arch Linux**:

```sh
sudo pacman -S --needed docker docker-compose docker-buildx
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

En **Linux Mint, Ubuntu y Debian** alcanza con los paquetes del sistema:

```sh
sudo apt update
sudo apt install docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

Linux Mint no tiene repositorio propio en Docker. Si se prefiere la versión oficial
del motor, hay que agregar el repositorio de Ubuntu usando `UBUNTU_CODENAME`
(`jammy` en Mint 21, `noble` en Mint 22) y no `VERSION_CODENAME`, que devuelve el
nombre de Mint. Los pasos completos están en el
[README](../README.md#ejecución-local-con-docker-recomendada). Las dos vías no se
mezclan: `docker.io` y `docker-ce` comparten `containerd` y `runc`.

Cerrá la sesión y volvé a entrar (o ejecutá `newgrp docker`) para que el grupo
tenga efecto. Comprobación:

```sh
docker run --rm hello-world
docker compose version
```

Si el daemon no está activo:

```sh
sudo systemctl start docker
```

En Windows o macOS alcanza con Docker Desktop y su motor WSL 2 en ejecución.

## 2. Obtener el código

```sh
git clone <URL-DEL-REPOSITORIO> tour_virtual_UC
cd tour_virtual_UC
```

## 3. Archivos de la configuración

- `compose.yaml`: define `db` (PostgreSQL 17), `backend` (Spring Boot) y
  `frontend` (nginx con el build de Vite). Los puertos publicados son 5173 y
  8080; el 5432 no se publica.
- `frontend/Containerfile`: compila el visor/editor y sirve `dist` con nginx.
- `frontend/nginx.conf`: proxy de `/api` y `/ws` hacia el backend.
- `frontend/.dockerignore` y `campus-backend/.dockerignore`: excluyen
  `node_modules`, `dist` y `target` del contexto de build.
- El backend reutiliza `campus-backend/Containerfile.vercel`, que ya compila con
  JDK 21 y ejecuta el JAR con Java 21.

## 4. Levantar todo

```sh
docker compose up --build
```

La primera vez tarda varios minutos (descarga imágenes, Maven y dependencias de
npm). Cuando termine:

- Visor: `http://127.0.0.1:5173/`
- Editor: `http://127.0.0.1:5173/editor.html`
- API directa: `http://127.0.0.1:8080/api/health`

Comprobaciones:

```sh
curl -s http://127.0.0.1:5173/api/health
docker compose ps
docker compose logs -f backend
```

El backend tarda entre 15 y 40 segundos en quedar listo después de `docker compose up`,
según cuánto demore la base en pasar el healthcheck; hasta entonces nginx devuelve
502. Flyway aplica las migraciones
al arrancar el backend. La base local queda vacía de usuarios: hay que registrar
una cuenta desde el visor (contraseña de al menos 8 caracteres y carrera 1 o 2).

## 5. Crear una cuenta administradora

Primero registrate normalmente desde el visor. Después, ascendé esa cuenta:

```sh
docker compose exec db psql -U campus -d TP_INFO3 \
  -c "UPDATE usuarios SET rol = 2, carrera = NULL WHERE correo = 'tu@correo';"
```

Cerrá sesión y volvé a iniciarla. Con esa cuenta podés abrir `/editor.html`.

## 6. Detener, reiniciar y borrar datos

```sh
# Detener sin borrar la base
docker compose down

# Volver a levantar en segundo plano
docker compose up -d

# Reconstruir después de cambiar código
docker compose up --build -d

# Reconstruir solo un servicio
docker compose up --build -d backend
docker compose up --build -d frontend

# Reiniciar sin reconstruir
docker compose restart backend

# Detener y borrar también el volumen de PostgreSQL
docker compose down -v
```

Los datos de PostgreSQL viven en el volumen `tour-virtual-uc_pgdata`. El comando
`down -v` los elimina por completo. Los contenedores incluyen el código en el
momento de la compilación: no hay recarga en caliente, y por eso los cambios
exigen reconstruir la imagen.

El editor servido desde la imagen no puede escribir en el repositorio: al pulsar
«Publicar mapa» descarga `editor-placements.json` para guardarlo a mano en
`frontend/src/data/`. La escritura directa solo existe con `npm run dev`.

## 7. Cambiar las credenciales locales

Por defecto se usan usuario `campus` y contraseña `campus`. Se pueden cambiar con
variables de entorno al levantar o con un archivo `.env` en la raíz del
repositorio, que Compose lee para completar `POSTGRES_USER` y `POSTGRES_PASSWORD`:

```sh
POSTGRES_USER=otro POSTGRES_PASSWORD=otra-clave docker compose up --build
```

```sh
# .env en la raíz del repositorio (está en .gitignore)
POSTGRES_USER=otro
POSTGRES_PASSWORD=otra-clave
```

Si el volumen ya fue creado, PostgreSQL conserva las credenciales anteriores.
Para aplicar las nuevas, borrar el volumen con `docker compose down -v` o
cambiar la contraseña dentro de la base.

## 8. Usar la base del compose desde un backend local

El servicio `db` no publica el 5432. Para conectarse desde `campus-backend/`
corriendo en la máquina hay que agregar el mapeo a `compose.yaml`:

```yaml
  db:
    ports:
      - "5432:5432"
```

Después, `docker compose up -d db` y en `campus-backend/.env`:
`DB_URL=jdbc:postgresql://localhost:5432/TP_INFO3`. El puerto tiene que estar
libre; si ya hay un PostgreSQL local, se puede publicar `"5433:5432"` y ajustar
la URL.

## 9. Problemas frecuentes

| Síntoma | Qué revisar |
| --- | --- |
| `permission denied` al usar Docker | Cerrar sesión y volver a entrar, o `newgrp docker`. |
| `Cannot connect to the Docker daemon` | `sudo systemctl start docker`. |
| `port is already allocated` en 5173 u 8080 | Detener el Vite/backend local: `ss -ltnp \| grep -E ':5173\|:8080'`. |
| El backend no conecta a la base | Esperar el healthcheck de `db`; ver `docker compose logs backend`. |
| La base rechaza la contraseña | Las credenciales del volumen no coinciden con `.env`: `docker compose down -v` o cambiarlas en `psql`. |
| El frontend devuelve 502 | El backend todavía está arrancando; esperar y recargar. |
| Cambios del backend no aparecen | `docker compose up --build -d backend`. |
| Quiero empezar de cero | `docker compose down -v` y volver a levantar. |

## 10. Qué no cubre

- No reemplaza el despliegue en Vercel/Neon; es una configuración local.
- No incluye TLS ni credenciales de producción.
- La primera compilación necesita Internet para descargar imágenes, Maven y npm.
- No sirve para programar con recarga en caliente: para eso está la vía sin
  Docker del [README](../README.md#ejecución-local-sin-docker).
- No instala ni modifica las versiones de Node, Java, Maven ni PostgreSQL del
  sistema. Qué agrega Docker en el equipo y cómo retirarlo está en el
  [README](../README.md#qué-toca-docker-en-el-equipo-y-qué-no).
