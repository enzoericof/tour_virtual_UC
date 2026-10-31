# Tour virtual UC · Ciencias y Tecnología

Primera versión funcional del Trabajo Práctico de **Informática III 2026**, desarrollada para un equipo de seis integrantes. Representa la Facultad de Ciencias y Tecnología de la Universidad Católica con Three.js y una base de usuarios, contenidos y chat en Spring Boot.

## Qué incluye esta versión

- Sector de Ciencias y Tecnología: bloques, galerías, patios, cantina, Bedelía, Sala Manfred, plazas techada y abierta, dos canchas vecinas y estacionamientos cercanos. Se excluyen las demás facultades y el seminario.
- Tres espacios de **escaneo real**: laboratorio de planta baja, aula del tercer piso y pasillo del tercer piso. Se cargan individualmente para limitar memoria y descarga.
- Primera persona, teclado y mouse, colisiones, gravedad y escaleras en el bloque principal. Si el navegador no permite capturar el cursor, se puede mirar arrastrando.
- Vista general con cámara orbital, búsqueda de espacios, filtros, mapa y fotografías ampliables.
- Registro, inicio/cierre de sesión, biblioteca de trabajos por enlace y edición/eliminación de trabajos propios.
- Paneles informativos obtenidos del servidor; creación, edición y eliminación para administradores.
- Chat STOMP entre usuarios autenticados, con identidad asignada por el servidor. No se guarda historial.
- Migración Flyway, pruebas de permisos y un contenedor de aplicación con PostgreSQL.

**Es un prototipo inicial, no una réplica terminada.** Las proporciones generales, la vegetación y los recintos sin escaneo son aproximados. Segundo piso y baños están señalados como pendientes de validación. Las capturas originales tienen huecos y deformaciones que siguen visibles; no se generaron detalles que no existían en las fuentes. Los escaneos se visitan como escenas independientes, todavía sin alineación continua con el campus reconstruido.

El **Bloque G corresponde al “Bloque 2” de las carpetas y de la vista aérea**, confirmado por Horacio. Cantina y Bedelía están ambas en el alcance ampliado. No se incluyen todavía avatares sincronizados, una persona animada, subida de archivos, agente IA ni un despliegue público. El escaneo de persona fue inspeccionado y preparado localmente; requiere recorte, retopología y rigging antes de servir como avatar.

## Inicio rápido: recorrido 3D

Requisitos: **Node.js 24 LTS** y npm. Los modelos y las fotografías utilizados están incluidos en esta rama; no hace falta conectar Drive para ejecutar la aplicación.

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

Cuatro vistas: **Sector CyT**, **Vista de planta**, **Plano de CyT** y **Mi facultad**. El mapa y el recorrido comparten una sola distribución ([ids, fuentes, coordenadas y límites](docs/base-geografica.md)).

| Acción | Control |
| --- | --- |
| Caminar | W A S D o flechas |
| Mirar | Mouse; arrastrar si la captura del cursor no está disponible |
| Caminar más rápido | Shift izquierdo |
| Saltar pequeños desniveles | Espacio |
| Información del espacio cercano | E |
| Pausar y liberar cursor | Esc |
| Inspeccionar el conjunto | Botón de vista general; arrastrar y rueda |

En dispositivos táctiles se pueden inspeccionar modelos, mapas y fotos. El recorrido a pie está pensado para teclado y mouse.

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
frontend/public/assets/  recursos optimizados y procedencia
backend/src/main/java/py/edu/uc/tour/
  users/          registro y autenticación
  security/       sesiones, permisos y alta inicial de administrador
  content/        trabajos y paneles
  chat/           WebSocket y mensajería
backend/src/main/resources/db/migration/  esquema y paneles iniciales
docs/             arquitectura y contratos de API, base geográfica, referencias, verificación, pendientes
design-qa.md      última revisión visual
scripts/          preparación de recursos e importación del mapa OSM
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

El Drive compartido se consultó **solo para lectura**. Se seleccionaron 37 fotografías y tres modelos para la aplicación (aproximadamente 38 MB en total). Los originales, el escaneo de persona no utilizado, datos de pruebas, herramientas locales y credenciales no se incorporan a Git.

Ver [preparación y procedencia](docs/referencias.md), [arquitectura y API](docs/arquitectura.md) y [siguientes tareas](docs/pendientes.md). La nómina, roles individuales y fechas de entrega siguen pendientes de registrar; no se asignaron responsabilidades en nombre del grupo.

Trabajar mediante ramas y pull requests. La versión inicial se integró en `main`; las mejoras posteriores se preparan en ramas para su revisión.
