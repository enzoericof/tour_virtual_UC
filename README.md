# Tour virtual UC

Recorrido interactivo por la Facultad de Ciencias y Tecnología de la Universidad Católica, en el campus Santa Librada. El proyecto se desarrolla para Informática III y reúne una vista general de la facultad, un recorrido a pie y un modo multijugador con cuentas y avatares.

El visor usa Three.js y TypeScript. El servidor utiliza Spring Boot y PostgreSQL.

El modelo se apoya en fotografías, planos y mediciones del equipo. Las medidas, las estimaciones y los sectores pendientes de relevamiento están en [Geografía y reconstrucción](docs/base-geografica.md#estado-de-las-medidas-03112026).

## Inicio rápido

Con **Node.js 24 LTS** y npm, ejecutá estos comandos desde la raíz del repositorio.

```sh
cd frontend
npm ci
npm run dev
```

Abrí la dirección que indica Vite, normalmente `http://127.0.0.1:5173/`. Podés explorar el modelo y recorrer el campus sin iniciar el servidor.

Para caminar, elegí **Recorrer** o hacé clic en un punto del modelo. Usá **WASD** o las **flechas** para moverte, el **mouse** para mirar y **Esc** para pausar y liberar el cursor. Mantené **Espacio** para usar el jetpack sin límite; al soltar, la gravedad y la inercia controlan la caída. **Más opciones → Ayuda** muestra los demás controles.

El recorrido y el editor requieren una PC o laptop. En celulares y tabletas se muestra un aviso con la tipografía del proyecto y no se inicia el motor 3D. Una ventana pequeña de escritorio no activa este bloqueo.

## Inicio con multijugador

Configurá PostgreSQL y las variables de entorno siguiendo la [guía del backend](campus-backend/setup.md). Con **Java 21**, iniciá el servidor en otra terminal desde la raíz del repositorio.

```powershell
cd campus-backend
.\mvnw.cmd spring-boot:run
```

En Linux o macOS, usá `sh ./mvnw spring-boot:run` desde el mismo directorio.

Mantené Vite en ejecución. Por defecto, redirige la API y el WebSocket al puerto `8080`. En la pantalla de acceso, iniciá sesión o elegí continuar con la cuenta recordada; también podés usar otra cuenta o registrarte. Se requiere una cuenta para entrar. El recorrido admite hasta 10 personas simultáneas; si está completo, muestra un aviso antes de abrir el 3D y permite reintentar manualmente. Recargar, cerrar la página o pasar tres minutos sin actividad termina el recorrido. Podés probar la presencia con dos sesiones de navegador independientes.

Para usar un backend compartido, cada compañero configura la URL HTTPS pública del servicio Spring Boot en la terminal de PowerShell donde inicia Vite. Desde `frontend/`, ejecutá estos comandos con la URL del servicio.

```powershell
$env:CAMPUS_API_URL = 'https://TU-PROYECTO.vercel.app'
npm run dev -- --port 5173 --strictPort
```

En el backend, configurá `CAMPUS_FRONTEND_ORIGINS=http://127.0.0.1:5173,http://localhost:5173` para que ambos orígenes puedan abrir la conexión de presencia. Desde el equipo de cada compañero, `http://127.0.0.1:5173/api/health` permite comprobar la conexión al backend a través de Vite.

Cuando publiques el frontend compilado, configurá su servidor para reenviar `/api` y `/ws` al backend, con soporte de WebSocket para `/ws`. Si el frontend tiene otro dominio, agregá su origen HTTPS a `CAMPUS_FRONTEND_ORIGINS`.

La biblioteca y los paneles informativos están pendientes de integración con el backend actual. El chat grupal y las interacciones usan el WebSocket de presencia. [Arquitectura y contratos](docs/arquitectura.md#chat-grupal-y-gestos).

## Todo con Docker

Como alternativa al inicio manual, el proyecto puede correr completo —PostgreSQL, backend y frontend— con Docker Compose. No hace falta instalar JDK, Maven, Node ni usar Neon.

Requisitos: Docker Engine con el plugin Compose (en Windows o macOS, Docker Desktop). La primera ejecución necesita Internet para descargar imágenes y dependencias.

```sh
docker compose up --build
```

Abrí `http://127.0.0.1:5173/` para el visor y `http://127.0.0.1:5173/editor.html` para el editor. La API queda disponible en `http://127.0.0.1:8080/api/health`.

**Las credenciales de PostgreSQL se definen en `compose.yaml`**, en `POSTGRES_USER` y `POSTGRES_PASSWORD` (por defecto `campus` y `campus`). No son las credenciales de Neon ni de un servidor externo: el contenedor de PostgreSQL crea la base `TP_INFO3` y ese usuario en el primer arranque. Flyway crea las tablas al iniciar el backend. La base local arranca vacía, así que hay que registrar una cuenta desde el visor.

Para convertir esa cuenta en administradora:

```sh
docker compose exec db psql -U campus -d TP_INFO3 \
  -c "UPDATE usuarios SET rol = 2, carrera = NULL WHERE correo = 'tu@correo';"
```

Los datos se guardan en el volumen `pgdata`. Para detener sin borrarlos, usá `docker compose down`; para borrarlos también, `docker compose down -v`. Si se cambian las credenciales en `compose.yaml` después del primer arranque, hay que borrar el volumen o cambiarlas dentro de la base.

Las credenciales por defecto son solo para desarrollo local; no deben usarse en un servidor público. Guía completa y solución de problemas: [Todo el proyecto en Docker](docs/docker-local.md).

## Editor de mapa 3D
Con el frontend en marcha, abrí `/editor.html` con una cuenta administradora. Para una prueba local sin backend, usá `/editor.html?local=1`. El editor guarda las colocaciones en el navegador y permite exportarlas o importarlas en JSON. [Modelos del editor](frontend/editor-models/LEEME.txt).

## Verificación
Desde `frontend/`, ejecutá `npm test` y `npm run build`. Para verificar el backend, configurá PostgreSQL y ejecutá `.\mvnw.cmd verify` desde `campus-backend/` en PowerShell, o `sh ./mvnw verify` en Linux o macOS. [Registro de verificación](docs/verificacion.md).

Para medir el heap JavaScript de la escena y sus colisiones después de liberar temporales, ejecutá `npm run measure:memory` desde `frontend/`. Incluye diez minutos simulados de gatos y separa heap, buffers y memoria del proceso. No requiere backend. Las condiciones y la comparación con el navegador están en el [registro de verificación](docs/verificacion.md).

## Documentación

- [Despliegue académico en Vercel Hobby y Neon](docs/despliegue-vercel.md)
- [Todo el proyecto en Docker (rama local)](docs/docker-local.md)
- [Arquitectura y API](docs/arquitectura.md)
- [Referencias y recursos del modelo](docs/referencias.md)
- [Pendientes del proyecto](docs/pendientes.md)

En el editor, **Eliminar objetos** activa el borrado por clic de los modelos colocados. **Esc** desactiva el modo. El cambio se guarda en este navegador; los edificios y objetos del escenario base no se eliminan con esta herramienta.

En el visor principal, **Más opciones → Eliminar objeto** permite señalar pilares y soportes verticales del escenario. Se marca la pieza y se pide confirmación; cancelar no modifica el mapa. **Restaurar objetos eliminados** recupera las piezas y sus colisiones. Los borrados son locales a este navegador, no se publican al servidor. Otros elementos agrupados aún no admiten selección individual.

En el recorrido, acercate y mirá un banco o silla: **E** permite sentarte y vuelve a levantarte. Cada banco tiene dos plazas y cada silla una. Sentado podés mirar alrededor; Esc pausa y conserva el asiento.

## Chat, avatares y gestos

Durante el recorrido, **C** abre el chat y libera el mouse; **Enter** envía y **Esc** cierra dejando el recorrido en pausa. También se abre desde «Chat del campus» en la cuenta. Cerrado no ocupa la pantalla ni muestra indicaciones de teclas, tampoco se abre al recibir mensajes. Usa el mismo material, tipografía y controles que el menú. No hay susurros. Los mensajes recientes permanecen cinco minutos; después el servidor los archiva en PostgreSQL. El historial se consulta solo al abrir el chat y permite cargar páginas anteriores.

El avatar tiene un color automático estable por cuenta. Mirá a otro visitante a menos de 1,9 m y presioná **G**: podés invitarlo a **chocar los cinco** o **tomarse de las manos y saltar**. Puede aceptar o rechazar; la invitación vence a los 12 segundos. Se necesita estar de pie, fuera del ascensor, a la misma altura y en un lugar despejado. Sin alguien en la mira, **G** abre **OK**, **paz** y **caerse**. **E** queda reservado para sentarte o levantarte. Los atajos figuran en Ayuda; no se muestra un aviso permanente de gestos y chat sobre la escena.

Los gestos se muestran temporalmente con una cámara exterior. Al caerte, el cuerpo tiene gravedad, articulaciones y contactos con pisos, paredes, mobiliario del editor y puertas; los impactos activan fragmentos del MP3 según su fuerza. **WASD** y **Espacio** aplican impulsos mientras dura la caída. Al terminar se busca un punto cercano donde levantarse sin atravesar sólidos. Caminar no reproduce sonidos de pasos.

El modelo y sus siete clips se regeneran con Blender: `blender --background --python /ruta/absoluta/al/repositorio/scripts/blender/campus_person.py`. El GLB ya está versionado: no hace falta instalar Blender en la nube. [Protocolo y límites](docs/arquitectura.md#chat-grupal-y-gestos).
