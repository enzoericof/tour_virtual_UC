# Configuración y ejecución del backend

Guía para ejecutar `campus-backend` en Windows 11 con Visual Studio Code, PowerShell y PostgreSQL local. No requiere Docker.

Este documento corresponde al módulo `campus-backend`. Las instrucciones del README general que mencionan la carpeta retirada `backend/`, Java 25 o el perfil H2 no corresponden a este módulo.

## 1. Requisitos

| Herramienta | Requisito |
| --- | --- |
| Java | JDK 21, versión declarada en [pom.xml](pom.xml) |
| Spring Boot | 4.1.2, descargado automáticamente por Maven |
| PostgreSQL | PostgreSQL 17 instalado; la versión indicada por el equipo es 17.4 |
| Maven | Usar el Wrapper incluido: Maven 3.10.0, según [maven-wrapper.properties](.mvn/wrapper/maven-wrapper.properties) |
| Visual Studio Code | Extension Pack for Java y JDK 21 para el proyecto Maven |
| DBeaver | Para crear y consultar la base de datos |
| Postman | Para utilizar la API REST |

No hace falta instalar Maven globalmente ni instalar Spring Boot por separado. La primera ejecución del Wrapper requiere acceso a Internet para descargar Maven y las dependencias que falten.

## 2. Crear la base de datos en PostgreSQL

El backend está configurado para conectarse a:

| Dato | Valor |
| --- | --- |
| Servidor | `localhost` |
| Puerto PostgreSQL | `5432` |
| Base de datos | **`TP_INFO3`** |
| URL JDBC | `jdbc:postgresql://localhost:5432/TP_INFO3` |
| Usuario | El que se configure en `DB_USER` |
| Contraseña | La que se configure en `DB_PASSWORD` |

Estos valores provienen de [application.properties](src/main/resources/application.properties).

### Crear la conexión inicial en DBeaver

1. Asegurarse de que el servicio de PostgreSQL esté iniciado. En Windows se puede comprobar desde la aplicación **Servicios**, buscando el servicio de PostgreSQL instalado.
2. Crear una conexión PostgreSQL en DBeaver con host `localhost`, puerto `5432` y base de datos `postgres`.
3. Usar el usuario `postgres` y la contraseña elegida al instalar PostgreSQL, o una cuenta propia con permiso para crear bases de datos.
4. Abrir un editor SQL sobre esa conexión.

Para saber si la base ya existe:

```sql
SELECT datname
FROM pg_database
WHERE datname = 'TP_INFO3';
```

**Si no existe**, activar el modo de confirmación automática —autocommit— en DBeaver y ejecutar esta sentencia de forma independiente:

```sql
CREATE DATABASE "TP_INFO3"
    WITH ENCODING = 'UTF8';
```

Las comillas dobles son necesarias para conservar las mayúsculas. Sin ellas, PostgreSQL crearía `tp_info3`, que no coincide con la conexión configurada. `CREATE DATABASE` no debe ejecutarse dentro de un bloque `BEGIN` / `COMMIT`.

Si `TP_INFO3` ya existe, utilizarla: no eliminarla ni volver a crearla.

### Conectarse a TP_INFO3

Crear otra conexión en DBeaver, o editar la anterior, cambiando el campo de base de datos a `TP_INFO3`. Mantener el servidor, puerto y credenciales correspondientes.

El usuario que ejecute el backend debe poder crear tablas, restricciones e índices en esa base. Para el desarrollo local descrito aquí puede usarse el mismo usuario `postgres` que creó la base. Si se utiliza otro usuario, asignarle previamente los permisos necesarios sobre la base y el esquema `public`.

**Solo hay que crear la base de datos. Las tablas y el catálogo los crea Flyway cuando arranca el backend.**

## 3. Abrir el backend en VS Code

1. Instalar **Extension Pack for Java** de Microsoft desde la vista de extensiones (`Ctrl+Shift+X`). Incluye soporte de Java, Maven y depuración. Ver la [guía oficial de Java en VS Code](https://code.visualstudio.com/docs/java/java-tutorial).
2. Seleccionar `File → Open Folder` y abrir la carpeta **`campus-backend`**, que contiene `pom.xml`. Abrir la carpeta completa, no únicamente un archivo Java.
3. Esperar a que las extensiones importen el proyecto Maven y resuelvan sus dependencias.
4. Abrir la paleta de comandos (`Ctrl+Shift+P`) y ejecutar **Java: Configure Java Runtime** para revisar que el proyecto utilice **JDK 21**. El nivel de Java del proyecto Maven está declarado en `pom.xml`; mantenerlo en 21.
5. Abrir `Terminal → New Terminal` y seleccionar **PowerShell** como perfil para utilizar los comandos de esta guía. Los comandos con `$env:` no corresponden a Git Bash.

Para ejecutar Maven desde esa terminal se utilizará siempre el Wrapper incluido, `mvnw.cmd`.

La clase principal es:

```text
py.edu.uc.campus_backend.CampusBackendApplication
```

Su archivo está en [CampusBackendApplication.java](src/main/java/py/edu/uc/campus_backend/CampusBackendApplication.java).

Elegir **una** de las dos formas de arranque siguientes. No iniciar la aplicación simultáneamente desde la terminal y desde el botón Run: ambas intentarían utilizar el puerto 8080.

## 4. Opción A: ejecutar desde la terminal PowerShell de VS Code

### Ubicarse en el módulo

Desde la raíz del repositorio:

```powershell
cd campus-backend
```

Si la terminal ya está dentro de `campus-backend`, no repetir ese comando. En esa carpeta deben estar `pom.xml` y `mvnw.cmd`.

### Configurar Java

El proceso debe usar JDK 21. Si hace falta configurar la instalación en esa terminal, ajustar esta ruta a la ubicación real del equipo:

```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
```

### Configurar las credenciales de PostgreSQL

En la misma terminal donde se ejecutará Maven:

```powershell
$env:DB_USER = "postgres"
$securePassword = Read-Host "Introduce tu contraseña de PostgreSQL" -AsSecureString
$env:DB_PASSWORD = [System.Net.NetworkCredential]::new("", $securePassword).Password
```

Si se utiliza otro usuario de PostgreSQL, reemplazar `postgres`. La contraseña solicitada es la de **PostgreSQL**, no la de una cuenta de la aplicación.

Estas variables pertenecen a la terminal actual y a los procesos que se inicien desde ella. Al abrir otra terminal habrá que configurarlas nuevamente. No guardar la contraseña en `application.properties`, scripts versionados ni archivos compartidos.

### Arrancar

```powershell
.\mvnw.cmd spring-boot:run
```

Mantener abierta esa terminal mientras se utiliza la API. Para detener el servidor, presionar **Ctrl+C**.

Si se necesita únicamente compilar, sin iniciar el servidor:

```powershell
.\mvnw.cmd clean compile
```

La compilación no crea la base de datos ni aplica las migraciones. Las migraciones se ejecutan al arrancar la aplicación.

## 5. Opción B: ejecutar con Run and Debug en VS Code

Con `campus-backend` abierta como carpeta de trabajo, crear el archivo local `.vscode/launch.json` dentro de ella. Si ya existe, agregar la configuración y las entradas a sus listas, conservando las existentes.

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "java",
      "name": "Ejecutar campus-backend",
      "request": "launch",
      "mainClass": "py.edu.uc.campus_backend.CampusBackendApplication",
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "env": {
        "DB_USER": "${input:dbUser}",
        "DB_PASSWORD": "${input:dbPassword}"
      }
    }
  ],
  "inputs": [
    {
      "id": "dbUser",
      "type": "promptString",
      "description": "Usuario de PostgreSQL",
      "default": "postgres"
    },
    {
      "id": "dbPassword",
      "type": "promptString",
      "description": "Contraseña de PostgreSQL",
      "password": true
    }
  ]
}
```

Abrir **Run and Debug** (`Ctrl+Shift+D`), seleccionar **Ejecutar campus-backend** y presionar **F5**. VS Code pedirá el usuario y la contraseña de PostgreSQL; la contraseña se introduce de forma oculta y no queda escrita en `launch.json`. Para detener esa ejecución, usar **Stop** (`Shift+F5`).

Esta configuración utiliza las opciones del [depurador Java](https://code.visualstudio.com/docs/java/java-debugging) y las [variables de entrada de VS Code](https://code.visualstudio.com/docs/reference/variables-reference#_input-variables).

Configurar `$env:DB_USER` y `$env:DB_PASSWORD` en la terminal integrada **no modifica el entorno del proceso VS Code ya abierto**. Por eso, esta alternativa proporciona las credenciales mediante `env` en `launch.json`, independientemente de la terminal.

El proyecto no tiene configurada la carga automática de archivos `.env`: crear uno por sí solo no sustituye estos pasos.

## 6. Qué sucede durante el primer arranque

La aplicación se conecta a `TP_INFO3` y Flyway ejecuta las migraciones pendientes de [db/migration](src/main/resources/db/migration):

| Migración | Contenido |
| --- | --- |
| V1 | Usuarios |
| V2 | Trabajos |
| V3 | Metadatos de archivos asociados a trabajos |
| V4 | Materias y asociaciones con carreras |
| V5 | Catálogo de materias de las mallas curriculares aportadas por el equipo |
| V6 | Relación entre trabajos y materias |
| V7 | Materia obligatoria para cada trabajo |

En una base nueva, Flyway aplica todas en orden. En una base existente, solo aplica las pendientes. También crea `flyway_schema_history`, que registra las versiones aplicadas.

En una instalación nueva, el catálogo contiene **70 materias** y **106 asociaciones con carreras**: 52 para Ingeniería Informática y 54 para Ingeniería Electrónica. No se crean automáticamente usuarios de la aplicación ni administradores.

No ejecutar manualmente los INSERT de V5: se duplicaría el catálogo. No editar ni renombrar migraciones que ya se aplicaron; los cambios posteriores deben realizarse con nuevas migraciones.

**Si una base anterior contiene trabajos sin materia y todavía no aplicó V7**, hay que asignarles una materia válida antes de aplicar esa versión. No borrar esos trabajos ni elegirles una materia arbitraria. Este paso no es necesario para una base nueva y vacía.

Hibernate usa `spring.jpa.hibernate.ddl-auto=validate`: comprueba la correspondencia entre entidades y tablas, pero no sustituye a Flyway para crear o modificar el esquema.

## 7. Dirección del backend y primer uso

La API queda disponible en:

```text
http://localhost:8080
```

Un arranque correcto muestra en la consola el inicio de Tomcat en el puerto 8080 y el mensaje `Started CampusBackendApplication`, sin que el proceso termine inmediatamente con un error.

Este módulo es una API REST. No sirve una página de inicio en `/` y no dispone de una ruta `/health`. Abrir únicamente la dirección raíz en el navegador no es una comprobación útil de su funcionamiento.

Para probar escrituras desde Postman, primero consultá `GET /api/auth/csrf` y conservá la cookie de sesión en el mismo cliente. Enviá el valor `token` con el encabezado indicado por `headerName`. Volvé a consultar el token después de iniciar o cerrar sesión.

### Crear una cuenta desde Postman

Si ya se tiene una cuenta de la aplicación, pasar directamente al login. Para crear una nueva, enviar:

```text
POST http://localhost:8080/api/auth/registro
```

Seleccionar `Body → raw → JSON`. Reemplazar los datos del ejemplo y elegir una contraseña personal de al menos 8 caracteres:

```json
{
  "nombre": "Nombre",
  "apellido": "Apellido",
  "correo": "alumno@example.test",
  "password": "<TU_CONTRASEÑA>",
  "carrera": 1
}
```

Carreras: `1` = Ingeniería Informática; `2` = Ingeniería Electrónica. El registro asigna siempre el rol estudiante. El cliente no puede elegir el rol administrador.

Respuesta esperada: `201 Created`. Si el correo ya existe, se devuelve `409 Conflict`.

### Iniciar sesión

```text
POST http://localhost:8080/api/auth/login
```

```json
{
  "correo": "alumno@example.test",
  "password": "<TU_CONTRASEÑA>"
}
```

Usar los mismos datos del registro. Respuesta esperada: `200 OK`. Postman debe conservar la cookie `JSESSIONID`; mantener habilitado su manejo de cookies.

La autenticación usa sesiones HTTP, no JWT ni un token Bearer. Usar `localhost` de forma consistente: no alternarlo con `127.0.0.1`, porque las cookies se asocian al host.

Con esa sesión se puede consultar:

```text
GET http://localhost:8080/api/auth/me
GET http://localhost:8080/api/materias
GET http://localhost:8080/api/trabajos
```

No enviar body en estas consultas. En una base nueva, la lista de trabajos estará vacía. La consulta de materias devuelve las disponibles para la carrera del estudiante; un administrador recibe el catálogo completo.

Para cerrar la sesión:

```text
POST http://localhost:8080/api/auth/logout
```

Tras reiniciar el backend, iniciar sesión nuevamente. Las cuentas y trabajos permanecen en PostgreSQL, pero las sesiones del servidor no se conservan entre reinicios.

## 8. Problemas frecuentes

| Mensaje o síntoma | Qué revisar |
| --- | --- |
| No se reconoce `mvnw.cmd` | Estar dentro de `campus-backend` y usar `.\mvnw.cmd` en PowerShell. |
| Error de Java o `release version 21 not supported` | JDK 21, `JAVA_HOME` en la terminal y el runtime del proyecto mostrado por `Java: Configure Java Runtime` en VS Code. |
| No se resuelve `DB_USER` o `DB_PASSWORD` | Definir ambas variables en PowerShell o iniciar con la configuración `Ejecutar campus-backend` de `launch.json`. |
| `Connection refused` al conectar a PostgreSQL | Servicio de PostgreSQL iniciado, host `localhost` y puerto `5432`. |
| `database "TP_INFO3" does not exist` | Crear la base con el nombre exacto y comillas dobles; verificar que DBeaver esté conectado al mismo servidor y puerto. |
| `password authentication failed` | Usuario y contraseña de PostgreSQL correctos; no usar la contraseña del registro de la aplicación. |
| `permission denied for schema public` | Permisos del usuario configurado en `DB_USER` para aplicar las migraciones. |
| `Port 8080 was already in use` | Detener la ejecución anterior con Stop en VS Code o Ctrl+C en la terminal; no iniciar dos copias. |
| Error de checksum de Flyway | Una migración aplicada fue modificada. Recuperar su contenido original y preparar una nueva versión; no borrar el historial ni ejecutar `repair` automáticamente. |
| V7 falla porque hay valores nulos | Existen trabajos anteriores sin `materia_id`; clasificarlos antes de aplicar la restricción. |
| Tablas inexistentes o validación de esquema fallida | Leer el primer error de Flyway y comprobar la base de destino. No cambiar `ddl-auto` a `create` o `update` para ocultarlo. |
| `401` en materias o trabajos | Iniciar sesión y comprobar que Postman envíe `JSESSIONID` al mismo host. |
| `403` en contenido | Comprobar permisos, cuenta activa y correspondencia entre materia y carrera. En rutas de autenticación protegidas también puede aparecer sin sesión. |
| Error CORS desde una página con origen `null` | Una página abierta como archivo no equivale a Postman. La integración del frontend y sus orígenes todavía está pendiente. |
| Falla la descarga de Maven o dependencias | Revisar conexión a Internet y configuración de proxy de Maven si la red lo requiere. |

## 9. Alcance de esta guía

El arranque descrito corresponde a usuarios, sesiones, materias y trabajos del backend actual. La subida de imágenes y video, el alta controlada de administradores y la adaptación del frontend Three.js todavía están pendientes. Tener la tabla de archivos no significa que exista una API de subida.

El frontend conserva contratos del servidor anterior y no queda conectado automáticamente al iniciar `campus-backend`. Paneles y chat tampoco están implementados en este módulo. No utilizar los archivos históricos de Docker como alternativa a estos pasos.

La configuración actual mantiene CSRF deshabilitado y está orientada al desarrollo local; el arranque de esta guía no equivale a una configuración de despliegue público.

Esta guía no ejecuta pruebas ni cambia la configuración: describe cómo preparar y arrancar el backend existente.
