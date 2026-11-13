# Tour virtual UC · Ciencias y Tecnología

Primera versión funcional del Trabajo Práctico de **Informática III 2026**, desarrollada para un equipo de seis integrantes. Representa la Facultad de Ciencias y Tecnología de la Universidad Católica con Three.js y una base de usuarios, contenidos y chat en Spring Boot.

**Atención (03/11/2026):** `backend/` fue retirado del repositorio en favor de `campus-backend/`, sin adaptar el frontend ni Docker; las instrucciones de backend y Docker de este README describen el servidor retirado. Ver [estado de ambos proyectos](docs/arquitectura.md#aporte-campus-backend) y la guía [campus-backend/setup.md](campus-backend/setup.md).

## Qué incluye esta versión

- Sector de Ciencias y Tecnología con las medidas del equipo: Bloque 1 (65 × 12 m, planta baja y tres pisos, columnas cada 4,5 m, puertas dobles numeradas y títulos en la cara este) con su escalera tipo Pompidou, ascensor con murales, cabecera este con escalera y rampa hacia la plaza techada, media sombra y torre de baños; Bloque G (65 × 12 m); patios; plazas techada y abierta, Bedelía, cantina y Sala Manfred sobre una plataforma a 1,40 m. Se excluyen las demás facultades, el seminario, las canchas y los estacionamientos cercanos.
- Paredes de ladrillo, piso de granito, hormigón, cubierta y lamas con texturas sacadas del escaneo del pasillo del tercer piso.
- Exteriores aproximados de Maquetas, Kampus Print, CTA–DICIA, DEI–LED y dependencias LED, DA/CAP, DAS y DG; accesibles desde Explorar. [Fuente y límites](docs/base-geografica.md#dependencias-del-plano-general--revisión-local-02112026).
- Todo el recorrido usa el modelo construido de la facultad. Los escaneos navegables de laboratorio, pasillo y aula del tercer piso fueron retirados; esos espacios conservan sus identificadores y fotografías de referencia.
- Primera persona, teclado y mouse, colisiones, gravedad y escaleras en el bloque principal. El recorrido captura el mouse para girar sin límites, con un punto central integrado; Esc pausa y devuelve el cursor. Requiere un navegador que permita Pointer Lock (Chrome o Edge). Si la captura falla, permanece en pausa e informa cómo continuar.
- Vista general con cámara orbital, búsqueda de espacios, filtros y fotografías ampliables. El inicio muestra el modelo a pantalla completa. Los espacios se abren desde Explorar; M recoge las herramientas.
- Registro, inicio/cierre de sesión, biblioteca de trabajos por enlace y edición/eliminación de trabajos propios.
- Paneles informativos obtenidos del servidor; creación, edición y eliminación para administradores.
- Chat STOMP entre usuarios autenticados, con identidad asignada por el servidor. No se guarda historial.
- Migración Flyway, pruebas de permisos y un contenedor de aplicación con PostgreSQL.

**Es un prototipo inicial, no una réplica terminada.** Los edificios con medida del equipo respetan esas medidas; el resto de las proporciones, la vegetación y los recintos sin escaneo son aproximados. Segundo piso y baños están señalados como pendientes de validación. Los interiores son reconstrucciones aproximadas, no capturas navegables.

El **Bloque G corresponde al “Bloque 2” de las carpetas y de la vista aérea**, confirmado por Horacio. Cantina y Bedelía están ambas en el alcance ampliado. No se incluyen todavía avatares sincronizados, una persona animada, subida de archivos, agente IA ni un despliegue público. El escaneo de persona fue inspeccionado y preparado localmente; requiere recorte, retopología y rigging antes de servir como avatar.

## Inicio rápido: recorrido 3D

Requisitos: **Node.js 24 LTS** y npm. Las fotografías y texturas utilizadas están incluidas; no hace falta conectar Drive para ejecutar la aplicación.

```sh
git clone https://github.com/enzoericof/tour_virtual_UC.git
cd tour_virtual_UC/frontend
npm ci
npm run dev
```

Abrir la dirección mostrada por Vite, normalmente `http://127.0.0.1:5173/`. Sin backend se pueden recorrer los espacios y ver las fotografías; biblioteca, cuentas y chat indican que el servicio no está disponible.

## Inicio con servicios locales

Requisitos adicionales: **JDK 25**, con `JAVA_HOME` apuntando a esa instalación. Maven Wrapper está incluido.

En una segunda terminal:

```sh
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

En PowerShell:

```powershell
cd backend
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"
```

El backend escucha en `127.0.0.1:8080`. Vite redirige `/api` y `/ws` al backend; abrir el frontend usando **127.0.0.1**, coherente con el origen permitido en el perfil local.

El perfil `local` usa H2 en modo PostgreSQL y conserva sus datos en `backend/.local/`. Es una alternativa para desarrollar sin Docker; **la base prevista para la entrega sigue siendo PostgreSQL 18**. H2 no reemplaza la validación final con PostgreSQL.

Para crear un administrador inicial, establecer `ADMIN_EMAIL` y `ADMIN_PASSWORD` antes de iniciar el backend (mínimo 12 caracteres, máximo 72 bytes; las cuentas de visitantes piden mínimo 10 caracteres y máximo 72 bytes). No hay contraseñas predeterminadas ni un administrador incorporado. El alta se realiza únicamente si ese correo no existe; no cambia permisos de cuentas existentes. Con ese usuario, ingresar a **Mi cuenta → Administrar paneles**.

## Ejecución integrada con PostgreSQL

Requisitos: Docker Engine y Compose v2 funcionando.

1. Copiar `.env.example` a `.env` y reemplazar `DATABASE_PASSWORD` por una contraseña local. Completar las variables de administrador solo si se necesita esa cuenta.
2. Desde la raíz:

```sh
docker compose up --build
```

Abrir `http://localhost:8080`. El frontend compilado y la API se sirven desde el mismo proceso y origen. Los datos de PostgreSQL quedan en el volumen `campus-data`; el servicio no publica el puerto de la base de datos.

La configuración de Compose está limitada a la máquina local. Para un despliegue real, configurar HTTPS, `COOKIE_SECURE=true`, `APP_ORIGIN` con el origen exacto, respaldo de datos y protección frente a abuso. **El arranque completo en Docker/PostgreSQL no se pudo verificar en el equipo de preparación porque el motor Docker no respondió.** Sí se compiló el backend con Java 25 y se verificó el perfil local.

## Controles

Dos modos: **vista general** al iniciar y **recorrido a pie** desde Caminar. El botón de restablecer vista permite regresar al encuadre inicial. Ambos comparten una sola distribución ([ids, fuentes, coordenadas y límites](docs/base-geografica.md)).

| Acción | Control |
| --- | --- |
| Ir al punto elegido desde la vista general | Un clic sobre el modelo; inicia el recorrido en ese punto o en un apoyo libre cercano |
| Caminar | W A S D o flechas (4,5 m/s) |
| Mirar | Mover el mouse sin mantener clic; Esc pausa y libera el cursor |
| Caminar más rápido | Shift izquierdo (8 m/s) |
| Saltar pequeños desniveles | Espacio |
| Información del espacio cercano | Menú de pausa → Información de este lugar |
| Pausar, liberar cursor y abrir opciones | Esc o botón ESC · Pausar |
| Ocultar o mostrar las herramientas en vista general | M |
| Inspeccionar el conjunto | Botón de vista general; arrastrar y rueda |

Durante el recorrido solo se muestra el botón ESC · Pausar, sin mira central ni avisos con E. Al pausar aparece un único menú con las opciones existentes; Continuar recorrido conserva la posición.

En dispositivos táctiles se pueden inspeccionar modelos y fotos. El recorrido a pie está pensado para teclado y mouse.

## Stack

| Componente | Versión / decisión |
| --- | --- |
| Gráficos | Three.js 0.187.0 directo |
| Frontend | TypeScript 5.9.3 estricto, Vite 8.3.5, HTML/CSS |
| Herramientas | Node.js 24 LTS, npm y package-lock.json |
| Backend | Java 25 LTS, Spring Boot 4.1.2, Maven 3.9.11 (vía Maven Wrapper 3.3.4) |
| Persistencia de entrega | PostgreSQL 18, JPA/Hibernate, Flyway |
| Sesiones | Spring Security, cookies HttpOnly y CSRF |
| Chat | WebSocket + STOMP, cliente @stomp/stompjs 7.5.0 |
| Integración | Docker y Compose v2 |

## Organización

```text
frontend/src/
  data/           espacios, estado de relevamiento y referencias
  scene/          campus, materiales, carga y liberación de escaneos
  navigation/     controles, cápsula de colisión y gravedad
  services/       REST y STOMP
  ui/             iconos de interfaz
  main.ts         interacción de la interfaz
frontend/public/assets/  fotos, escaneos y texturas optimizados, y su procedencia
backend/src/main/java/py/edu/uc/tour/
  users/          registro y autenticación
  security/       sesiones, permisos y alta inicial de administrador
  content/        trabajos y paneles
  chat/           WebSocket y mensajería
backend/src/main/resources/db/migration/  esquema y paneles iniciales
docs/             arquitectura y contratos de API, base geográfica, referencias, verificación, pendientes
design-qa.md      última revisión visual
scripts/          preparación de recursos, texturas del escaneo e importación del mapa OSM
```

## Verificación

```sh
cd frontend
npm ci
npm test
npm run build
```

```sh
cd backend
./mvnw verify
```

En Windows usar `mvnw.cmd`. La prueba de chat se ejecuta con el backend local encendido:

```sh
cd frontend
node tests/chat.integration.mjs
```

Esa prueba crea dos cuentas sintéticas `@example.test` en la base apuntada. Usarla únicamente sobre una instancia de desarrollo desechable, nunca producción. Ver [resultados y límites](docs/verificacion.md).

## Referencias y trabajo del equipo

El Drive compartido se consultó **solo para lectura**. Se seleccionaron 37 fotografías y tres modelos para la aplicación (aproximadamente 38 MB en total); del escaneo del pasillo se derivaron seis texturas (unos 48 KB). Para regenerarlas, con Python 3 y `scripts/requirements-assets.txt` instalados, desde la raíz: `python scripts/extract-scan-textures.py "ruta/a/Pasillo - Piso 3.glb"` (sin ruta usa la copia optimizada del repositorio). Los originales, el escaneo de persona no utilizado, datos de pruebas, herramientas locales y credenciales no se incorporan a Git.

Ver [preparación y procedencia](docs/referencias.md), [arquitectura y API](docs/arquitectura.md) y [siguientes tareas](docs/pendientes.md). La nómina, roles individuales y fechas de entrega siguen pendientes de registrar; no se asignaron responsabilidades en nombre del grupo.

Trabajar mediante ramas y pull requests. La versión inicial se integró en `main`; las mejoras posteriores se preparan en ramas para su revisión.
