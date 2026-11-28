# Tour virtual UC

Recorrido interactivo por la Facultad de Ciencias y Tecnología de la Universidad Católica, en el campus Santa Librada. El proyecto se desarrolla para Informática III y reúne una vista general de la facultad, un recorrido a pie y un modo multijugador con cuentas y avatares.

El visor usa Three.js y TypeScript. El servidor utiliza Spring Boot y PostgreSQL.

El modelo se apoya en fotografías, planos y mediciones del equipo. Las medidas, las estimaciones y los sectores pendientes de relevamiento están en [Geografía y reconstrucción](docs/base-geografica.md#estado-de-las-medidas-03112026).

## Qué se necesita para ejecutar el proyecto

Hay dos caminos. El primero levanta PostgreSQL, el backend y el frontend con Docker y no instala nada más en la máquina. El segundo usa las herramientas instaladas directamente en el sistema.

| Dato | Requisito |
| --- | --- |
| Sistema | Windows 10 u 11, macOS o Linux (Linux Mint, Ubuntu, Debian, Arch; x86-64 o ARM) |
| Vía con Docker | Docker Engine 24 o posterior con el plugin Compose, o Docker Desktop. No hace falta JDK, Maven ni Node |
| Vía sin Docker | Node.js 24 LTS con npm, JDK 21, PostgreSQL 16 o 17 y Git |
| Puertos libres | `5173` para el visor y `8080` para la API |
| Internet | Solo la primera compilación o instalación: descarga imágenes, dependencias de npm y de Maven |
| Hardware | PC o laptop con navegador de escritorio. El celular y la tableta solo muestran un aviso |

Los dos caminos usan la misma configuración del backend: la base `TP_INFO3`, migraciones de Flyway al arrancar y sesiones HTTP con protección CSRF.

## Qué toca Docker en el equipo y qué no

La vía con Docker no instala ni cambia las versiones de Node, Java, Maven o PostgreSQL del sistema. Todo lo que necesita el proyecto vive dentro de las imágenes, con versiones fijas, y se descarta al borrar los contenedores.

Comprobado el 26/11/2026 en un equipo sin `psql`, sin `postgres` y sin `mvn` instalados: el proyecto corrió completo igual. Las versiones usadas estaban todas dentro de los contenedores.

| Componente | Versión usada por el proyecto | Dónde vive |
| --- | --- | --- |
| JDK | Temurin 21.0.13 (LTS) | Imagen de `backend`, etapas de compilación y ejecución |
| Maven | 3.10.0 | Wrapper descargado dentro de la imagen |
| Node.js | 24 (alpine) y las dependencias del `package-lock.json` | Etapa de compilación de la imagen de `frontend` |
| nginx | 1.27.5 | Imagen final de `frontend`, que no incluye Node |
| PostgreSQL | 17.12 | Contenedor `db`, con su volumen propio |

Lo que **no** ocurre en el equipo:

- No se instalan paquetes globales de npm (`npm i -g`) ni se modifica `PATH`, `JAVA_HOME` ni la configuración de nvm, volta o asdf.
- No se crea un clúster de PostgreSQL local ni se ocupa el puerto 5432: el puerto de la base no se publica.
- No se reemplaza el `node` ni el `java` que cada uno usa en otros trabajos. Si el equipo tiene Node 22, JDK 17 o ninguno de los dos, el resultado es el mismo.
- No se tocan archivos fuera del repositorio, salvo la carpeta interna de Docker.

Lo que **sí** agrega Docker, y conviene saberlo antes de instalarlo:

| Agrega | Detalle |
| --- | --- |
| Paquetes del motor | En Arch Linux, `docker` (unos 120 MB) más `containerd`, `runc`, `docker-compose` y `docker-buildx`; las dependencias son de sistema (`nftables`, `libseccomp`), no lenguajes ni bases de datos |
| Un servicio | `docker.service` en systemd, que arranca con el equipo si se habilitó |
| Un grupo y permisos | `docker`, para usarlo sin `sudo`. En Linux pertenecer a ese grupo equivale a tener permisos de root: es una decisión de la máquina, no del proyecto |
| Red y reglas de firewall | Una red `bridge` propia y reglas de `nftables`/`iptables` que Docker administra |
| Disco | Con las tres imágenes construidas y la base inicializada: cerca de 1,3 GB de imágenes, 66 MB de volumen y la caché de compilación (varios GB la primera vez; se puede liberar) |

Para dejar el equipo como antes:

```sh
docker compose down -v            # contenedores y base de datos del proyecto
docker image rm tour-virtual-uc-backend tour-virtual-uc-frontend
docker system prune -a --volumes  # además, toda la caché de compilación
```

Si se quiere eliminar también el motor, se desinstalan los paquetes (`sudo pacman -Rs docker docker-compose docker-buildx`) y, si hace falta, se borra `/var/lib/docker`, que es donde quedan las imágenes.

Un matiz sobre la reproducibilidad: las etiquetas `postgres:17`, `node:24-alpine` y `nginx:1.27-alpine` toman los parches nuevos que publique cada proyecto, y `package-lock.json` y `mvnw` fijan las dependencias de la aplicación. Si un trabajo exigiera una copia byte a byte, se pueden fijar las imágenes por `digest`.

La vía sin Docker es la que sí instala versiones globales en el equipo (Node 24, JDK 21, PostgreSQL 17) y la que puede chocar con lo que ya está instalado. Por eso, para una entrega o para probar en otra máquina, conviene Docker.

---

## Ejecución local con Docker (recomendada)

Los tres servicios corren en contenedores: la base PostgreSQL 17, el backend Spring Boot y el frontend compilado servido por nginx. nginx reenvía `/api` y `/ws` al backend, así que el navegador ve un solo origen.

### 1. Instalar Docker

**Linux Mint** (21 o 22). La vía corta usa los paquetes del propio sistema(https://docs.docker.com/engine/install/ubuntu/):

Eliminar los paquetes obsoletos de docker:
```sh
sudo apt remove $(dpkg --get-selections docker.io docker-compose docker-compose-v2 docker-doc docker-buildx podman-docker containerd runc | cut -f1)
```

```sh
sudo apt update
sudo apt install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl start --now docker
sudo systemctl status docker
sudo usermod -aG docker "$USER"
```


En todos los casos, cerrá la sesión y volvé a entrar, o ejecutá `newgrp docker`, para que el grupo `docker` tenga efecto. Si el demonio está detenido, se inicia con `sudo systemctl start docker`.

Comprobá la instalación antes de seguir:

```sh
docker --version
docker compose version
docker run --rm hello-world
```

`docker compose version` debe responder con la versión del plugin (por ejemplo `Docker Compose version v2.x` o posterior). Si el comando no existe, falta el paquete del plugin de Compose: en Mint y Ubuntu es `docker-compose-v2` o `docker-compose-plugin`. Si aparece `Cannot connect to the Docker daemon`, el servicio no está iniciado.

### 2. Obtener el repositorio

```sh
git clone <URL-DEL-REPOSITORIO> tour_virtual_UC
cd tour_virtual_UC
```

Todos los comandos de esta sección se ejecutan desde la raíz del repositorio, donde está `compose.yaml`.

### 3. Definir las credenciales de la base (opcional)

Sin configuración, la base local usa usuario `campus` y contraseña `campus`. Para usar otras, creá un archivo `.env` en la raíz del repositorio:

```sh
POSTGRES_USER=campus
POSTGRES_PASSWORD=campus
```

Compose lee ese archivo automáticamente para completar `POSTGRES_USER` y `POSTGRES_PASSWORD`. El archivo `.env` está en `.gitignore`: no se versiona y puede quedarse con valores locales. El ejemplo está en `.env.example`.

Esas credenciales son propias del contenedor de PostgreSQL y no tienen relación con las de Neon ni con un servidor externo. Si el volumen de datos ya existe, cambiarlas en `.env` no las cambia dentro de la base: hay que borrar el volumen (paso 8) o modificarlas desde `psql`.

### 4. Construir las imágenes y levantar los servicios

```sh
docker compose build
docker compose up -d
```

También se puede hacer en un solo paso, en primer plano:

```sh
docker compose up --build
```

La primera ejecución tarda varios minutos: descarga las imágenes `postgres:17`, `node:24-alpine`, `nginx:1.27-alpine` y `eclipse-temurin`, y resuelve las dependencias de npm y Maven. Las siguientes usan la caché de capas y arrancan en menos de un minuto.

Qué se construye:

| Servicio | Imagen | Función |
| --- | --- | --- |
| `db` | `postgres:17` | Base `TP_INFO3`, con healthcheck y volumen `tour-virtual-uc_pgdata` |
| `backend` | `campus-backend/Containerfile.vercel` | Compila con JDK 21 y ejecuta el JAR en el puerto 8080 |
| `frontend` | `frontend/Containerfile` | Compila con `npm ci && npm run build` y sirve `dist` con nginx en el puerto 80, publicado en el 5173 |

### 5. Comprobar que arrancó

Los contenedores quedan levantados en segundo plano y no hace falta mirar la consola, pero conviene confirmar el estado:

```sh
docker compose ps
curl http://127.0.0.1:5173/api/health
curl http://127.0.0.1:8080/api/health
```

Ambas consultas deben devolver `{"status":"ok"}`. El visor responde cuando está arriba el contenedor `frontend`; la conexión con la base recién funciona cuando el backend terminó de arrancar, entre 15 y 40 segundos después de `docker compose up` según cuánto tarde la base en pasar el healthcheck. En ese intervalo nginx devuelve `502`; hay que recargar.

Si algo no responde:

```sh
docker compose logs -f backend
docker compose logs -f db
docker compose logs -f frontend
```

Un arranque correcto del backend muestra `Tomcat started on port 8080` y `Started CampusBackendApplication`.

### 6. Usar el visor y crear una cuenta

Abrí `http://127.0.0.1:5173/` en el navegador. La primera vez la base está vacía de usuarios: elegí **Crear cuenta** o **Registrarse**, completá nombre, apellido, correo, una contraseña de al menos 8 caracteres y la carrera (1 = Ingeniería Informática, 2 = Ingeniería Electrónica). El registro siempre asigna el rol estudiante.

Con la cuenta iniciada se abre el recorrido. El servidor admite hasta diez personas conectadas al mismo tiempo.

`http://127.0.0.1:5173/api/health` sirve para comprobar la conexión al backend a través del proxy, sin abrir el 3D.

### 7. Convertir una cuenta en administradora

El editor de mapas y las rutas de administración piden rol administrador. Después de registrarte desde el visor, ascendé esa cuenta con SQL:

```sh
docker compose exec db psql -U campus -d TP_INFO3 \
  -c "UPDATE usuarios SET rol = 2, carrera = NULL WHERE correo = 'tu@correo';"
```

Cambiá `campus` si definiste otro `POSTGRES_USER` y `tu@correo` por el correo registrado. La sentencia debe informar `UPDATE 1`. Después cerrá sesión y volvé a iniciarla: el rol se lee de la base en cada inicio de sesión. Para consultar las cuentas existentes:

```sh
docker compose exec db psql -U campus -d TP_INFO3 -c "SELECT id, correo, rol FROM usuarios ORDER BY id;"
```

### 8. Comandos del día a día

| Necesidad | Comando |
| --- | --- |
| Ver el estado y los puertos | `docker compose ps` |
| Seguir los registros | `docker compose logs -f backend` |
| Detener sin borrar datos | `docker compose down` |
| Volver a levantar | `docker compose up -d` |
| Aplicar cambios de código | `docker compose up --build -d` |
| Reconstruir un solo servicio | `docker compose up --build -d backend` |
| Reiniciar sin reconstruir | `docker compose restart backend` |
| Abrir `psql` en la base | `docker compose exec db psql -U campus -d TP_INFO3` |
| Detener y borrar la base | `docker compose down -v` |

Los contenedores incluyen el código en el momento de la compilación: no hay recarga en caliente. Después de cambiar archivos del backend o del frontend hay que reconstruir la imagen correspondiente con `docker compose up --build -d`.

Los datos de PostgreSQL viven en el volumen `tour-virtual-uc_pgdata` y sobreviven a `down`, a `restart` y a reinicios del equipo. `docker compose down -v` borra el volumen y la base vuelve a crearse vacía en el siguiente arranque.

### 9. Problemas frecuentes con Docker

| Síntoma | Qué revisar |
| --- | --- |
| `permission denied while trying to connect to the Docker daemon` | Cerrar sesión y volver a entrar, o `newgrp docker`, después de agregar el usuario al grupo `docker` |
| `Cannot connect to the Docker daemon` | `sudo systemctl start docker` en Linux; abrir Docker Desktop en Windows o macOS |
| `port is already allocated` en 5173 u 8080 | Hay un Vite o un backend local en ejecución: `ss -ltnp \| grep -E ':5173\|:8080'` en Linux, `netstat -ano \| findstr 8080` en Windows. Cerrarlo o cambiar el puerto publicado |
| `docker: command not found` después de instalar en Mint | Cerrar sesión y volver a entrar, o `newgrp docker`; comprobar con `docker --version` |
| `docker compose` no existe, pero `docker` sí | Falta el plugin: `sudo apt install docker-compose-v2` en Mint y Ubuntu, o `docker-compose-plugin` con el repositorio oficial de Docker |
| Conflicto de `containerd` o `runc` al instalar la vía oficial | Quedó `docker.io` del sistema: desinstalarlo antes de instalar `docker-ce` |
| `E: Unable to locate package docker-ce` | El repositorio se agregó con el nombre de Mint (`wilma`, `xia`) en lugar de `UBUNTU_CODENAME` (`jammy`, `noble`): volver a agregarlo con el nombre de Ubuntu |
| `502 Bad Gateway` al abrir el visor | El backend todavía está arrancando: esperar y recargar |
| El backend reinicia en bucle y `logs backend` muestra un error de conexión | `docker compose ps` para ver si `db` está `healthy`; revisar que las credenciales del `.env` coincidan con las del volumen |
| La base rechaza la contraseña después de cambiar `.env` | El volumen conserva las credenciales del primer arranque: `docker compose down -v` o cambiarlas desde `psql` |
| `no configuration file provided` | No estar en la raíz del repositorio, donde está `compose.yaml` |
| La compilación falla al descargar dependencias | Falta Internet o hay un proxy que bloquea Maven Central y el registro de npm |
| Cambios en el código y no aparecen | Reconstruir con `docker compose up --build -d` |

---

## Ejecución local sin Docker

Camino manual, con PostgreSQL, el backend y Vite como procesos del sistema. Es el recomendado para programar en el visor, porque el servidor de desarrollo recarga los cambios y el editor puede escribir el mapa en el repositorio.

### 1. Instalar las herramientas

| Herramienta | Versión | Cómo comprobar | Paquete en Linux Mint y Ubuntu |
| --- | --- | --- | --- |
| Node.js | 24 LTS (`frontend/package.json` declara `>=24 <25`) | `node -v`, `npm -v` | No está en los repositorios: usar nvm o NodeSource |
| JDK | 21 (`campus-backend/pom.xml`) | `java -version` | `openjdk-21-jdk` |
| PostgreSQL | 17, o 16 | `psql --version` | `postgresql-16` en Mint 22, `postgresql-17` desde PGDG |
| Maven | No se instala: se usa el Wrapper versionado en `campus-backend/mvnw` | — | — |
| Git y curl | Cualquiera reciente | `git --version`, `curl --version` | `git`, `curl` |

**Linux Mint** (21 o 22). El JDK 21 está en los repositorios; Node 24 no, y el `nodejs` del sistema suele quedarse en la 18 o la 20, así que se instala con nvm:

```sh
sudo apt update
sudo apt install openjdk-21-jdk git curl
# nvm: comprobá en github.com/nvm-sh/nvm la versión vigente del instalador.
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# Cerrá y volvé a abrir la terminal, o cargá nvm en la actual:
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"
nvm install 24
nvm use 24
node -v   # debe informar v24.x
java -version   # debe informar 21
```

Si en la terminal sigue apareciendo otra versión de Java, verificá con `sudo update-alternatives --config java` cuál está seleccionada.

En **Windows** funcionan los instaladores MSI de Node 24 y del JDK 21 de Adoptium. En **Arch Linux**:

```sh
sudo pacman -S jdk21-openjdk nodejs postgresql
node -v   # debe informar v24.x
```

Si el paquete de Node entrega una versión mayor a 24, instalá la 24 con nvm. Si es la primera instalación de PostgreSQL en Arch Linux, hay que inicializar el directorio de datos antes de iniciar el servicio:

```sh
sudo -iu postgres initdb -D /var/lib/postgres/data
sudo systemctl enable --now postgresql
```

### 2. Instalar y preparar PostgreSQL

**Linux Mint y Ubuntu.** El paquete del sistema de Mint 22 es PostgreSQL 16 y funciona sin cambios: las catorce migraciones se aplican igual que en la 17, y es la combinación que se probó el 26/11/2026. Alcanza con:

```sh
sudo apt install postgresql
sudo systemctl enable --now postgresql
sudo -u postgres psql -c "SELECT version();"
```

Si se prefiere la 17, que es la que usa el contenedor, se instala desde el repositorio del proyecto PostgreSQL. **En Linux Mint no sirve el script rápido `apt.postgresql.org.sh`**: toma `VERSION_CODENAME`, que en Mint vale `wilma` o `xia`, y ese nombre no existe en ese repositorio. Hay que declararlo a mano con el nombre de Ubuntu:

```sh
sudo apt install curl ca-certificates
sudo install -d /usr/share/postgresql-common/pgdg
sudo curl --fail -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
  https://www.postgresql.org/media/keys/ACCC4CF8.asc
. /etc/os-release
echo "Repositorio para ${UBUNTU_CODENAME}-pgdg"   # debe decir jammy o noble
sudo tee /etc/apt/sources.list.d/pgdg.sources <<EOF
Types: deb
URIs: https://apt.postgresql.org/pub/repos/apt
Suites: ${UBUNTU_CODENAME}-pgdg
Architectures: $(dpkg --print-architecture)
Components: main
Signed-By: /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc
EOF
sudo apt update
sudo apt install postgresql-17
```

En Ubuntu y Debian el script rápido sí funciona: `sudo apt install postgresql-common` y `sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh`. Con dos versiones instaladas, los clientes se llaman `psql` y `psql-17`, y cada clúster se crea en un puerto propio: `pg_lsclusters` los lista.

**Windows y macOS.** El servicio es `postgresql-x64-17` en la aplicación **Servicios**, o la aplicación de PostgreSQL en macOS; el instalador de Windows ya trae `psql` y pgAdmin.

### 3. Crear la base de datos

Iniciá el servicio de PostgreSQL si no quedó activo: `sudo systemctl start postgresql` en Linux. En Windows, desde la aplicación **Servicios** o con `net start postgresql-x64-17`.

Entrá a la consola como superusuario (`sudo -u postgres psql` en Linux y macOS; en Windows, **SQL Shell (psql)** con el usuario `postgres`) y ejecutá:

```sql
CREATE USER campus WITH PASSWORD 'campus';
CREATE DATABASE "TP_INFO3" WITH ENCODING = 'UTF8' OWNER campus;
GRANT ALL PRIVILEGES ON DATABASE "TP_INFO3" TO campus;
\q
```

Las comillas dobles son imprescindibles: sin ellas PostgreSQL crearía `tp_info3`, que no coincide con la URL de conexión. `CREATE DATABASE` no puede ejecutarse dentro de una transacción ni con autocommit desactivado.

Solo se crea la base vacía. **Las tablas y el catálogo de materias los crea Flyway cuando arranca el backend.** También se puede usar una base `TP_INFO3` en Neon: en ese caso se omite este paso y se ajusta `DB_URL` en el siguiente. Los detalles con capturas de DBeaver están en la [guía del backend](campus-backend/setup.md).

### 4. Configurar y arrancar el backend

El backend lee `DB_URL`, `DB_USER` y `DB_PASSWORD` del entorno. Además, `application.properties` declara `spring.config.import=optional:file:./.env[.properties]`, así que también toma esas variables de un archivo `campus-backend/.env` si existe (está en `.gitignore`). Hay dos formas de dárselas.

**Opción A: archivo `.env` dentro de `campus-backend/`.** Se escribe una vez y sirve para todas las terminales:

```sh
DB_URL=jdbc:postgresql://localhost:5432/TP_INFO3
DB_USER=campus
DB_PASSWORD=campus
```

**Opción B: variables en la terminal.** En PowerShell:

```powershell
$env:DB_USER = "campus"
$env:DB_PASSWORD = "campus"
```

En bash, zsh o Git Bash, para una base local:

```sh
export DB_USER=campus
export DB_PASSWORD=campus
```

Para una base en Neon, además hay que apuntar `DB_URL`:

```powershell
$env:DB_URL = 'jdbc:postgresql://HOST-DE-NEON:5432/TP_INFO3?sslmode=require&channelBinding=require'
$env:DB_USER = 'neondb_owner'
```

```sh
export DB_URL='jdbc:postgresql://HOST-DE-NEON:5432/TP_INFO3?sslmode=require&channelBinding=require'
export DB_USER=neondb_owner
```

Si no se define `DB_URL`, se usa `jdbc:postgresql://localhost:5432/TP_INFO3`. No guardes contraseñas en archivos versionados.

Después, desde `campus-backend/`, iniciá el servidor:

```sh
cd campus-backend
sh ./mvnw spring-boot:run
```

```powershell
cd campus-backend
.\mvnw.cmd spring-boot:run
```

El Wrapper descarga Maven 3.10.0 la primera vez. Hay que ejecutarlo desde `campus-backend/`, porque ahí están `pom.xml`, `mvnw` y el `.env` que se lee con ruta relativa. Al arrancar, Flyway aplica las migraciones pendientes (V1 a V14 en una base nueva, más el catálogo de 70 materias) y Hibernate valida el esquema sin crearlo. La consola termina con `Started CampusBackendApplication` y el servicio escucha en `http://127.0.0.1:8080`. Se detiene con **Ctrl+C**.

Solo compilar sin iniciar el servidor: `sh ./mvnw -DskipTests package` (o `.\mvnw.cmd -DskipTests package`).

### 5. Arrancar el frontend

En otra terminal, desde la raíz del repositorio:

```sh
cd frontend
npm ci
npm run dev
```

`npm ci` instala exactamente las versiones del `package-lock.json`. Vite queda en `http://127.0.0.1:5173/` y redirige `/api` y `/ws` a `http://127.0.0.1:8080`, por defecto. Si el backend corre en otra dirección, se define `CAMPUS_API_URL` **antes** de arrancar Vite:

```sh
export CAMPUS_API_URL=http://127.0.0.1:9090
```

```powershell
$env:CAMPUS_API_URL = 'http://127.0.0.1:9090'
```

Ambos procesos tienen que quedar abiertos mientras se usa el visor. Los cambios del frontend se recargan solos; los del backend requieren reiniciar `spring-boot:run`.

Configurar `CAMPUS_FRONTEND_ORIGINS` no es necesario en este camino: el proxy deja el WebSocket en el mismo origen. El backend, de todos modos, admite los orígenes adicionales que se enumeren ahí, separados por comas.

### 6. Comprobar y crear la cuenta administradora

Revisá que respondan las dos direcciones:

```sh
curl http://127.0.0.1:5173/api/health
curl http://127.0.0.1:8080/api/health
```

Ambas devuelven `{"status":"ok"}`. Después abrí `http://127.0.0.1:5173/`, registrate como se explicó en el paso 6 de la vía con Docker y, para el editor, ascendé la cuenta desde `psql`:

```sh
psql -U campus -d TP_INFO3 \
  -c "UPDATE usuarios SET rol = 2, carrera = NULL WHERE correo = 'tu@correo';"
```

### 7. Problemas frecuentes sin Docker

| Síntoma | Qué revisar |
| --- | --- |
| `release version 21 not supported` | El JDK en uso no es 21: `java -version` y `JAVA_HOME` de la terminal |
| `No se encuentra mvnw` o `no se reconoce` | Estar en `campus-backend/` y usar `sh ./mvnw` o `.\mvnw.cmd` |
| `Connection refused` al conectar a PostgreSQL | El servicio no está iniciado, el puerto no es 5432 o el host de `DB_URL` es incorrecto |
| `database "TP_INFO3" does not exist` | La base no se creó con el nombre exacto entre comillas dobles |
| `password authentication failed` | Credenciales de `DB_USER` y `DB_PASSWORD` distintas a las de PostgreSQL; no son las de la cuenta del visor |
| `permission denied for schema public` | El usuario de `DB_USER` no tiene permisos sobre la base ni sobre el esquema `public` |
| `Port 8080 was already in use` | Ya hay un backend corriendo: detenelo con Ctrl+C antes de iniciar otro |
| `502` o error de proxy en el visor | Vite está arriba pero el backend no; revisá la otra terminal |
| `401` en `/api/materias` o `/api/trabajos` | Falta iniciar sesión o las cookies están desactivadas |
| `EADDRINUSE` en 5173 | Cerrar el otro Vite o usar `npm run dev -- --port 5174` |
| `node: command not found` después de instalar nvm | Cerrar y volver a abrir la terminal, o cargar nvm con `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"` |
| `npm ci` avisa de una versión de Node no soportada | `node -v` no es 24: `nvm use 24` en esa terminal |
| Dos versiones de PostgreSQL instaladas (16 y 17) y el backend conecta a la equivocada | `pg_lsclusters` lista los clústeres y su puerto; con la 17, usar `psql-17` y revisar el puerto de `DB_URL` |
| `sudo -u postgres psql` pide contraseña o falla | En Mint y Ubuntu se usa `sudo -u postgres psql`; si hay dos versiones, `sudo -u postgres psql-17` |
| Error de checksum de Flyway | Se modificó una migración ya aplicada: recuperar su contenido y crear una nueva versión |

Para usar `localhost` o `127.0.0.1` hay que ser consistente: la cookie de sesión se asocia al host con el que se inició sesión.

---

## Combinaciones de servicios

### Base de datos en Docker y el resto local

Sirve para trabajar con el visor en caliente sin instalar PostgreSQL. El servicio `db` no publica el puerto 5432 al equipo, así que hay que agregarlo a `compose.yaml`:

```yaml
  db:
    ports:
      - "5432:5432"
```

Después, `docker compose up -d db`, y en `campus-backend/.env`:

```sh
DB_URL=jdbc:postgresql://localhost:5432/TP_INFO3
DB_USER=campus
DB_PASSWORD=campus
```

El puerto 5432 tiene que estar libre: si hay un PostgreSQL local, detenelo o publicá otro, por ejemplo `"5433:5432"`, y ajustá `DB_URL`.

### Inicio con multijugador

El modo multijugador funciona con cualquiera de las dos vías: usa el WebSocket `/ws/presence` del backend y una sesión iniciada. El recorrido admite hasta 10 personas simultáneas; si está completo, muestra un aviso antes de abrir el 3D y permite reintentar manualmente. Recargar, cerrar la página o pasar quince minutos sin actividad termina el recorrido. Podés probar la presencia con dos sesiones de navegador independientes.

Para que todos trabajen contra un backend compartido, cada uno define la URL HTTPS pública en la terminal de Vite y comprueba la conexión con `http://127.0.0.1:5173/api/health`. El despliegue académico completo está en [Vercel Hobby y Neon](docs/despliegue-vercel.md).

```powershell
$env:CAMPUS_API_URL = 'https://TU-PROYECTO.vercel.app'
npm run dev -- --port 5173 --strictPort
```

En el backend: `CAMPUS_FRONTEND_ORIGINS=http://127.0.0.1:5173,http://localhost:5173`. Cuando se publica el frontend compilado, su servidor debe reenviar `/api` y `/ws` al backend, con soporte de WebSocket para `/ws`. Si el frontend tiene otro dominio, agregá su origen HTTPS a esa variable.

---

## Controles del recorrido

Para caminar, elegí **Recorrer** o hacé clic en un punto del modelo. Usá **WASD** o las **flechas** para moverte, el **mouse** para mirar y **Esc** para pausar y liberar el cursor. Mantené **Espacio** para usar el jetpack sin límite; al soltar, la gravedad y la inercia controlan la caída. **Menú → Ayuda** muestra los demás controles.

Al entrar a la Sala Manfred, aparece el aviso para pulsar **T** y abrir la biblioteca de trabajos prácticos en **Todos los trabajos**.

Las dieciséis Ranger Raptor del estacionamiento del LED se comparten entre jugadores. Acercate a la puerta del conductor y pulsá **F** para subir. **W/S** acelera, frena y retrocede; **A/D** gira; **Espacio** activa el freno de mano; **V** alterna cabina y cámara exterior. Detenete y pulsá **F** para bajar. **Esc** pausa y detiene la camioneta. La posición estacionada se conserva para los demás y para nuevas visitas.

En el recorrido, acercate y mirá un banco o silla: **E** permite sentarte y vuelve a levantarte. Cada banco tiene dos plazas y cada silla una. Sentado podés mirar alrededor; Esc pausa y conserva el asiento.

El recorrido y el editor requieren una PC o laptop. En celulares y tabletas se muestra un aviso con la tipografía del proyecto y no se inicia el motor 3D. Una ventana pequeña de escritorio no activa este bloqueo.

## Editor de mapa 3D

Abrí `/editor.html` con una cuenta administradora. Para una prueba local sin backend, usá `/editor.html?local=1`. El editor permite arrastrar modelos sobre el campus.

Al presionar **Publicar mapa**, las colocaciones se guardan directamente en `frontend/src/data/editor-placements.json` cuando el frontend corre con `npm run dev`, porque Vite expone ese endpoint. En la compilación servida por Docker o por Vercel la escritura no existe: el editor descarga `editor-placements.json` y hay que guardarlo a mano en esa ruta. Al hacer commit y push de ese archivo junto a los `.glb` de `frontend/editor-models/`, el mapa queda sincronizado para todos los compañeros y en la nube. [Modelos del editor](frontend/editor-models/LEEME.txt).

En el editor, **Eliminar objetos** activa el borrado por clic de los modelos colocados. **Esc** desactiva el modo. El cambio se guarda en este navegador; los edificios y objetos del escenario base no se eliminan con esta herramienta.

En el visor principal, **Más opciones → Eliminar objeto** permite señalar pilares y soportes verticales del escenario. Se marca la pieza y se pide confirmación; cancelar no modifica el mapa. **Restaurar objetos eliminados** recupera las piezas y sus colisiones. Los borrados son locales a este navegador, no se publican al servidor. Otros elementos agrupados aún no admiten selección individual.

## Chat, avatares y gestos

Durante el recorrido, **C** abre el chat y libera el mouse; **Enter** envía y **Esc** cierra dejando el recorrido en pausa. También se abre desde «Chat del campus» en la cuenta. Cerrado no ocupa la pantalla ni muestra indicaciones de teclas, tampoco se abre al recibir mensajes. Usa el mismo material, tipografía y controles que el menú. No hay susurros. Los mensajes recientes permanecen cinco minutos; después el servidor los archiva en PostgreSQL. El historial se consulta solo al abrir el chat y permite cargar páginas anteriores.

El avatar tiene un color automático estable por cuenta. Mirá a otro visitante a menos de 1,9 m y presioná **G**: podés invitarlo a **chocar los cinco** o **tomarse de las manos y saltar**. Puede aceptar o rechazar; la invitación vence a los 12 segundos. Se necesita estar de pie, fuera del ascensor, a la misma altura y en un lugar despejado. Sin alguien en la mira, **G** abre **OK**, **paz** y **caerse**. **E** queda reservado para sentarte o levantarte. Los atajos figuran en Ayuda; no se muestra un aviso permanente de gestos y chat sobre la escena.

Los gestos se muestran temporalmente con una cámara exterior. Al caerte, el cuerpo tiene gravedad, articulaciones y contactos con pisos, paredes, mobiliario del editor y puertas; los impactos activan fragmentos del MP3 según su fuerza. **WASD** y **Espacio** aplican impulsos mientras dura la caída. Al terminar se busca un punto cercano donde levantarse sin atravesar sólidos. Caminar no reproduce sonidos de pasos.

El modelo y sus siete clips se regeneran con Blender: `blender --background --python /ruta/absoluta/al/repositorio/scripts/blender/campus_person.py`. El GLB ya está versionado: no hace falta instalar Blender para ejecutar el proyecto. [Protocolo y límites](docs/arquitectura.md#chat-grupal-y-gestos).

La biblioteca está conectada al backend actual con vistas de trabajos propios y generales, paginación y formularios por materia; su verificación funcional está pendiente. Los paneles informativos todavía requieren integración. [Arquitectura y contratos](docs/arquitectura.md).

## Verificación

Con el frontend instalado, desde `frontend/`, ejecutá `npm test` y `npm run build`. Para el backend, con PostgreSQL en marcha, `sh ./mvnw verify` en Linux o macOS y `.\mvnw.cmd verify` en PowerShell, desde `campus-backend/`.

Para medir el heap JavaScript de la escena y sus colisiones después de liberar temporales, ejecutá `npm run measure:memory` desde `frontend/`. Incluye diez minutos simulados de gatos y separa heap, buffers y memoria del proceso. No requiere backend. Las condiciones y la comparación con el navegador están en el [registro de verificación](docs/verificacion.md).

Las pruebas no necesitan Docker: son del modelo y del código del frontend. El arranque completo con Docker se describe arriba y lo ejecutado hasta hoy está en el [registro de verificación](docs/verificacion.md).

## Documentación

- [Todo el proyecto en Docker](docs/docker-local.md)
- [Estructura del código y archivos principales](docs/estructura.md)
- [Despliegue académico en Vercel Hobby y Neon](docs/despliegue-vercel.md)
- [Configuración y ejecución del backend](campus-backend/setup.md)
- [Arquitectura y API](docs/arquitectura.md)
- [Referencias y recursos del modelo](docs/referencias.md)
- [Pendientes del proyecto](docs/pendientes.md)
