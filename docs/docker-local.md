# Todo el proyecto en Docker (rama local)

Guía para levantar PostgreSQL, el backend Spring Boot y el frontend Vite con un
solo `docker compose up`. No hace falta instalar JDK, Maven, Node ni usar Neon:
la base de datos también corre en un contenedor.

Esta configuración es para desarrollo local. Las credenciales de la base son
valores de ejemplo; no usarlas en producción.

## 1. Requisitos e instalación en Arch Linux

```sh
sudo pacman -S docker docker-compose docker-buildx
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

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

## 2. Crear la rama

```sh
cd /home/Mati/Repos/tour_virtual_UC
git checkout -b feat/docker-local
```

Si la rama ya existe:

```sh
git checkout feat/docker-local
```

## 3. Archivos de la configuración

- `compose.yaml`: define `db` (PostgreSQL 17), `backend` (Spring Boot) y
  `frontend` (nginx con el build de Vite).
- `frontend/Containerfile`: compila el visor/editor y sirve `dist` con nginx.
- `frontend/nginx.conf`: proxy de `/api` y `/ws` hacia el backend.
- `frontend/.dockerignore` y `campus-backend/.dockerignore`: excluyen
  `node_modules`, `dist` y `target` del contexto de build.
- El backend reutiliza `campus-backend/Containerfile.vercel`, que ya compila con
  JDK 21 y ejecuta el JAR con Java 21.

## 4. Levantar todo

```sh
cd /home/Mati/Repos/tour_virtual_UC
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

Flyway aplica las migraciones al arrancar el backend. La base local queda vacía
de usuarios: hay que registrar una cuenta desde el visor.

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

# Volver a levantar
docker compose up

# Reconstruir después de cambiar código
docker compose up --build

# Reconstruir solo un servicio
docker compose up --build backend
docker compose up --build frontend

# Detener y borrar también el volumen de PostgreSQL
docker compose down -v
```

Los datos de PostgreSQL viven en el volumen `tour-virtual-uc_pgdata`. El comando
`down -v` los elimina por completo.

## 7. Cambiar las credenciales locales

Por defecto se usan usuario `campus` y contraseña `campus`. Se pueden cambiar
con variables de entorno al levantar:

```sh
POSTGRES_USER=otro POSTGRES_PASSWORD=otra-clave docker compose up --build
```

Si el volumen ya fue creado, PostgreSQL conserva las credenciales anteriores.
Para aplicar las nuevas, borrar el volumen con `docker compose down -v` o
cambiar la contraseña dentro de la base.

## 8. Problemas frecuentes

| Síntoma | Qué revisar |
| --- | --- |
| `permission denied` al usar Docker | Cerrar sesión y volver a entrar, o `newgrp docker`. |
| `Cannot connect to the Docker daemon` | `sudo systemctl start docker`. |
| `port is already allocated` en 5173 u 8080 | Detener el Vite/backend local: `ss -ltnp \| grep -E ':5173\|:8080'`. |
| El backend no conecta a la base | Esperar el healthcheck de `db`; ver `docker compose logs backend`. |
| El frontend devuelve 502 | El backend todavía está arrancando; esperar y recargar. |
| Cambios del backend no aparecen | `docker compose up --build backend`. |
| Quiero empezar de cero | `docker compose down -v` y volver a levantar. |

## 9. Qué no cubre

- No reemplaza el despliegue en Vercel/Neon; es una configuración local.
- No incluye TLS ni credenciales de producción.
- La primera compilación necesita Internet para descargar imágenes, Maven y npm.
