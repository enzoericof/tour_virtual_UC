# Despliegue académico en Vercel Hobby y Neon

Preparación para una demostración con los recursos gratuitos disponibles al 17/11/2026. La configuración no contrata planes, no agrega métodos de pago ni crea una base de datos.

## Configuración del proyecto

Importar `enzoericof/tour_virtual_UC` en un equipo **Hobby** de Vercel. Mantener **Root Directory en la raíz del repositorio**, no en `frontend/` ni en `campus-backend/`. El archivo [vercel.json](../vercel.json) define dos servicios:

| Servicio | Construcción | Rutas públicas |
| --- | --- | --- |
| Frontend | Vite con Node.js 24.x, `npm ci`, `npm run build`, salida `dist` | Visor `/`, editor `/editor.html` y recursos estáticos |
| Backend | Java 21 con `campus-backend/Containerfile.vercel` | `/api/*` y `/ws/*`, conservando el prefijo |

El frontend se sirve como archivos estáticos. Solo el backend utiliza el contenedor. Las rutas comparten dominio para conservar las cookies de sesión y el WebSocket. `CAMPUS_API_URL` configura únicamente el proxy de desarrollo de Vite y no hace falta para esta publicación.

La compilación incluye las dos páginas HTML; el editor y sus modelos también quedan en `dist`. El modo `?local=1` del editor modifica únicamente el almacenamiento de ese navegador, no el servidor.

## Variables de entorno en Vercel

Agregar estos valores en **Settings → Environment Variables** del proyecto antes de desplegar. Copiar las credenciales desde **Connect** en Neon y marcar la contraseña como sensible. No escribir valores reales en archivos versionados, chats, capturas ni variables con prefijo `VITE_`.

| Variable | Valor |
| --- | --- |
| `DB_URL` | `jdbc:postgresql://TU_HOST.neon.tech:5432/TU_BASE?sslmode=require&channelBinding=require` |
| `DB_USER` | Rol de PostgreSQL de Neon |
| `DB_PASSWORD` | Contraseña del rol de PostgreSQL |
| `PORT` | `8080`, para coincidir con el puerto del contenedor |
| `SERVER_FORWARD_HEADERS_STRATEGY` | `framework`, para reconocer HTTPS detrás del proxy |
| `SERVER_SERVLET_SESSION_COOKIE_SECURE` | `true` |
| `CAMPUS_FRONTEND_ORIGINS` | Origen exacto del visor, por ejemplo `https://TU-PROYECTO.vercel.app`, sin barra final; separar varios con comas |
| `SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE` | `3`, para limitar conexiones por instancia |
| `SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE` | `0` |

`DB_URL` debe comenzar con `jdbc:postgresql://`; no copiar una URL `postgresql://usuario:password@host/...` sin adaptarla. Separar usuario y contraseña en sus variables. La **API key de Neon no es necesaria** para esta aplicación: Spring se conecta por JDBC, no por la API administrativa de Neon.

Para el primer arranque usar una rama/base de Neon prevista para la demostración. Flyway aplica automáticamente las migraciones pendientes al arrancar: no conectar a una base ajena ni usar credenciales de producción para previews. Si ya hay datos, respaldarlos y revisar la compatibilidad de las migraciones antes de arrancar. Limitar las credenciales al entorno Production; habilitar Preview solo con una rama/base de pruebas independiente y su propio origen permitido.

Después de cambiar variables, volver a desplegar. No hace falta poner la contraseña en el Containerfile ni usarla durante la compilación de Maven.

## Mantener el costo en cero

- Confirmar **Hobby activo** y **Payment Method → No payment methods added** en la facturación del equipo de Vercel. No activar Pro, pruebas Pro ni complementos pagos.
- Confirmar por separado que el proyecto de **Neon esté en Free** y que su cuenta no tenga un plan pago. Las credenciales por sí solas no indican el plan ni los medios de pago.
- Usar el dominio incluido `*.vercel.app`. No comprar dominios ni agregar bases, almacenamiento o integraciones pagas del Marketplace.
- Revisar Usage antes de la presentación. En Hobby los recursos tienen cuotas; al agotarlas, el servicio puede pausarse hasta su renovación. El repositorio no controla el plan ni la facturación de las cuentas.
- No agregar monitores que mantengan despierto el backend o la base. Las visitas, los arranques y el multijugador consumen cuotas aunque el proyecto sea académico.

## Comprobación después del despliegue

1. Abrir `/`: deben cargar el campus, las fotografías y las texturas.
2. Abrir `/editor.html`: debe aparecer la puerta de acceso. `/editor.html?local=1` permite comprobar los modelos y el guardado local sin una cuenta administradora.
3. Consultar `/api/health`: debe responder JSON del backend, no el HTML del visor.
4. Registrar una cuenta de prueba, iniciar sesión, consultar `/api/auth/me` y cerrar sesión. Las escrituras conservan la protección CSRF existente.
5. Probar el recorrido con dos sesiones independientes: verificar el upgrade de `/ws/presence`, la aparición de visitantes y la reconexión. No considerar el multijugador validado solo porque el visor carga.

## Límites actuales

Vercel documenta Container Runtime en beta y WebSocket en todos los planes. Los WebSocket se cierran al alcanzar la duración máxima de la función; el cliente ya intenta reconectarse. Sin embargo, **las sesiones HTTP y la presencia del backend actual viven en memoria de una instancia**: pueden perderse al reiniciar o no compartirse entre instancias. Neon conserva usuarios y trabajos, pero no resuelve por sí solo esa coordinación. Esta configuración prepara el despliegue; no garantiza multijugador estable bajo escalado. Antes de usarlo en la exposición hay que comprobarlo con varios navegadores y después de un período de inactividad.

La biblioteca, los paneles y el chat que aún usan contratos del backend anterior continúan pendientes según [Arquitectura](arquitectura.md). Tampoco se habilitan por agregar las credenciales de Neon.

## Verificación de esta preparación (17/11/2026)

`npm test`: 40 pruebas aprobadas. La ejecución avisó que el puerto HMR 24678 estaba ocupado, sin fallar las pruebas. `npm run build`: TypeScript y Vite correctos; generados `dist/index.html`, `dist/editor.html` y los modelos del editor. Comprobada la existencia de los recursos enlazados por ambos HTML, el JSON de Vercel y los directorios/entrypoints de sus servicios. `git diff --check`: correcto.

No se modificó el backend ni se probó su arranque contra Neon. No se publicaron servicios ni se cargaron credenciales. La configuración y las rutas de Vercel deben validarse con un despliegue real antes de considerar lista la demostración.

## Ajustes de la primera publicación (17/11/2026)

La primera compilación en Vercel generó los archivos del visor y el contenedor. Se comprobó la carga de `/index.html` y los registros del backend confirmaron conexión con PostgreSQL en Neon y esquema Flyway V8 actualizado. La ruta `/` devolvía 404: se agregó una regla explícita que selecciona `/index.html` dentro del servicio frontend.

También se observó un timeout de arranque de una instancia Java. El contenedor utiliza `-XX:TieredStopAtLevel=1` para favorecer el arranque en frío de esta demostración, a cambio de limitar la optimización JIT de larga ejecución. Se conserva la verificación de bytecode. La respuesta HTTP de la API y la autenticación deben comprobarse después de desplegar este ajuste; los registros de conexión a Neon por sí solos no prueban el flujo completo.

## Referencias oficiales

- [Vercel Hobby](https://vercel.com/docs/plans/hobby)
- [Services y rutas](https://vercel.com/docs/services)
- [Configuración de servicios](https://vercel.com/docs/services/config-reference)
- [Container Runtime](https://vercel.com/docs/functions/runtimes/container)
- [WebSocket y estado entre instancias](https://vercel.com/docs/functions/websockets)
- [Conexión PostgreSQL desde Neon](https://neon.com/docs/connect/connect-from-any-app)
