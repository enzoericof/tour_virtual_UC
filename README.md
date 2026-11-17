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

Para caminar, elegí **Recorrer** o hacé clic en un punto del modelo. Usá **WASD** o las **flechas** para moverte, el **mouse** para mirar y **Esc** para pausar y liberar el cursor. **Más opciones → Ayuda** muestra los demás controles.

El recorrido y el editor requieren una PC o laptop. En celulares y tabletas se muestra un aviso con la tipografía del proyecto y no se inicia el motor 3D. Una ventana pequeña de escritorio no activa este bloqueo.

## Inicio con multijugador

Configurá PostgreSQL y las variables de entorno siguiendo la [guía del backend](campus-backend/setup.md). Con **Java 21**, iniciá el servidor en otra terminal desde la raíz del repositorio.

```powershell
cd campus-backend
.\mvnw.cmd spring-boot:run
```

En Linux o macOS, usá `sh ./mvnw spring-boot:run` desde el mismo directorio.

Mantené Vite en ejecución. Por defecto, redirige la API y el WebSocket al puerto `8080`. Abrí **Menú** para iniciar sesión. Podés probar la presencia con dos sesiones de navegador independientes.

Para usar un backend compartido, cada compañero configura la URL HTTPS pública del servicio Spring Boot en la terminal de PowerShell donde inicia Vite. Desde `frontend/`, ejecutá estos comandos con la URL del servicio.

```powershell
$env:CAMPUS_API_URL = 'https://TU-PROYECTO.vercel.app'
npm run dev -- --port 5173 --strictPort
```

En el backend, configurá `CAMPUS_FRONTEND_ORIGINS=http://127.0.0.1:5173,http://localhost:5173` para que ambos orígenes puedan abrir la conexión de presencia. Desde el equipo de cada compañero, `http://127.0.0.1:5173/api/health` permite comprobar la conexión al backend a través de Vite.

Cuando publiques el frontend compilado, configurá su servidor para reenviar `/api` y `/ws` al backend, con soporte de WebSocket para `/ws`. Si el frontend tiene otro dominio, agregá su origen HTTPS a `CAMPUS_FRONTEND_ORIGINS`.

La biblioteca, los paneles informativos y el chat del visor están pendientes de integración con el backend actual. [Arquitectura y contratos](docs/arquitectura.md#aporte-campus-backend).

## Editor de mapa 3D
Con el frontend en marcha, abrí `/editor.html` con una cuenta administradora. Para una prueba local sin backend, usá `/editor.html?local=1`. El editor guarda las colocaciones en el navegador y permite exportarlas o importarlas en JSON. [Modelos del editor](frontend/editor-models/LEEME.txt).

## Verificación
Desde `frontend/`, ejecutá `npm test` y `npm run build`. Para verificar el backend, configurá PostgreSQL y ejecutá `.\mvnw.cmd verify` desde `campus-backend/` en PowerShell, o `sh ./mvnw verify` en Linux o macOS. [Registro de verificación](docs/verificacion.md).

## Documentación

- [Despliegue académico en Vercel Hobby y Neon](docs/despliegue-vercel.md)
- [Arquitectura y API](docs/arquitectura.md)
- [Referencias y recursos del modelo](docs/referencias.md)
- [Pendientes del proyecto](docs/pendientes.md)

En el editor, **Eliminar objetos** activa el borrado por clic de los modelos colocados. **Esc** desactiva el modo. El cambio se guarda en este navegador; los edificios y objetos del escenario base no se eliminan con esta herramienta.

En el visor principal, **Más opciones → Eliminar objeto** permite señalar pilares y soportes verticales del escenario. Se marca la pieza y se pide confirmación; cancelar no modifica el mapa. **Restaurar objetos eliminados** recupera las piezas y sus colisiones. Los borrados son locales a este navegador, no se publican al servidor. Otros elementos agrupados aún no admiten selección individual.
