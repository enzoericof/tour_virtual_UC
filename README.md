# Tour virtual UC — Facultad de Ciencias y Tecnología

Visita virtual en primera persona a la Facultad de Ciencias y Tecnología de la Universidad Católica, Campus Santa Librada, Paraguay. Trabajo Práctico de **Informática III · 2026**, orientado a integrar computación gráfica, desarrollo web y gestión de contenidos.

**Estado:** planificación y documentación inicial. El repositorio todavía no contiene una aplicación ejecutable. Las funcionalidades, carpetas y servicios descritos a continuación constituyen la base acordada para su implementación.

## Equipo y colaboración

El desarrollo y la documentación se construyen entre los **seis integrantes** del grupo. La nómina y la asignación individual de tareas están pendientes de registrar.

## Objetivo

Construir un sitio web que permita recorrer libremente una representación 3D reconocible de la facultad, consultar información e interactuar con trabajos publicados por usuarios registrados. El parecido con las instalaciones reales y la posibilidad de recorrer sus interiores tienen prioridad sobre el detalle visual fino.

## Alcance funcional

### Espacios del recorrido

1. Pasillo de acceso.
2. **Cantina de CyT.**
3. Sala Manfred.
4. Planta baja del bloque de laboratorios.
5. Primer piso de aulas.
6. Áreas comunes: escaleras, patios y pasillos.

La Cantina de CyT sustituye a Bedelía en el alcance definido para este repositorio. La conformidad de este ajuste con la consigna original queda pendiente de validación docente.

### Funcionalidades previstas

| Área | Resultado esperado |
| --- | --- |
| Escenario 3D | Instalaciones reconocibles, conectadas y con interiores accesibles. |
| Navegación | Primera persona, movimiento libre por las áreas incluidas y acceso entre plantas. |
| Interacción | Selección de elementos del entorno y apertura de información contextual. |
| Paneles informativos | Contenidos consultables desde el recorrido y administrables desde el sitio. |
| Biblioteca de trabajos | Espacios dentro del recorrido para consultar documentación, presentaciones, videos y enlaces de usuarios. |
| Usuarios | Registro, inicio de sesión y gestión de los trabajos propios. |
| Administración | Gestión de los paneles informativos con permisos de administrador. |
| Chat | Mensajería en tiempo real entre visitantes conectados. |
| Entrega | Sitio publicado y/o máquina virtual operativa, con instrucciones de configuración y puesta en marcha. |

Según la consigna, la interacción entre usuarios es obligatoria cuando participan **más de cuatro alumnos**. Para este equipo de **seis integrantes**, el chat es obligatorio y se incluye en el alcance inicial. El agente IA y el recorrido guiado con IA son obligatorios únicamente cuando participan **más de seis alumnos** (siete o más), por lo que quedan fuera de esta base; si cambia la cantidad de integrantes, se revisará el alcance.

### Criterios de implementación del recorrido

- Usar cámara en primera persona y controles de teclado y mouse; informar cómo comenzar, moverse e interactuar.
- Implementar colisiones y circulación por escaleras para que el visitante pueda recorrer los espacios sin atravesar paredes o caer fuera del escenario.
- Asegurar la navegación y el parecido general antes de añadir mobiliario o efectos visuales detallados.
- Utilizar fotografías, croquis y medidas de referencia del campus; identificar las aproximaciones pendientes de verificar.
- Mantener el contenido de los paneles y los trabajos separado de la geometría 3D para poder actualizarlo desde el backend.

## Stack tecnológico

Base definida el **29 de octubre de 2026**:

| Capa | Tecnología / versión base | Uso |
| --- | --- | --- |
| Gráficos 3D | **Three.js** | Escena, cámara, iluminación, navegación e interacción con objetos. |
| Frontend | **TypeScript en modo estricto + Vite + HTML/CSS** | Código del navegador, formularios, biblioteca y administración. |
| Herramientas frontend | **Node.js 24 LTS + npm** | Instalación de dependencias y construcción del frontend. |
| Backend | **Java 25 LTS + Spring Boot 4.1.2** | API REST y lógica de negocio. |
| Construcción backend | **Maven, mediante Maven Wrapper** | Compilación y ejecución reproducibles. |
| Persistencia | **PostgreSQL 18 + Spring Data JPA/Hibernate** | Usuarios, trabajos, paneles y relaciones. |
| Migraciones | **Flyway** | Evolución versionada del esquema de base de datos. |
| Seguridad | **Spring Security** | Autenticación y autorización de usuarios y administradores. |
| Tiempo real | **WebSocket + STOMP sobre Spring** | Chat entre visitantes conectados. |
| Ejecución integrada | **Docker + Docker Compose v2** | Servicios, configuración y volúmenes persistentes. |
| Colaboración | **Git + GitHub** | Versionado, tareas, revisión de cambios y seguimiento. |

Las versiones exactas de Three.js, TypeScript, Vite y las herramientas auxiliares se fijarán al crear la aplicación y se registrarán en sus manifiestos y archivos de bloqueo. Spring Boot gestionará las versiones compatibles de sus dependencias. Se conservarán `package-lock.json`, Maven Wrapper y las versiones elegidas de las imágenes de contenedores; se evitarán etiquetas `latest`.

Three.js se utilizará directamente, con módulos separados para escena, movimiento e interacción. El frontend inicial usará HTML/CSS y TypeScript. Cualquier incorporación de un framework de interfaz se evaluará como cambio del stack.

Node.js se utiliza para las herramientas del frontend; el backend del producto se desarrolla en Java.

Referencias oficiales: [instalación de Three.js](https://threejs.org/manual/pages/installation.html), [Java LTS](https://www.oracle.com/java/technologies/java-se-support-roadmap.html), [requisitos de Spring Boot](https://docs.spring.io/spring-boot/system-requirements.html), [Spring Boot 4.1.2](https://spring.io/blog/2026/10/23/spring-boot-4-1-2-available-now/), [versiones de Node.js](https://nodejs.org/en/about/previous-releases), [política de versiones de PostgreSQL](https://www.postgresql.org/support/versioning/).

## Arquitectura y organización prevista

Un único repositorio con frontend y backend separados, y un backend monolítico organizado por funcionalidades. El navegador consume la API REST para usuarios y contenidos, y WebSocket para el chat. Solo el backend accede a PostgreSQL.

```text
tour_virtual_UC/
├── README.md                  # Presentación y acuerdos del proyecto
├── AGENTS.md                  # Instrucciones para colaboradores y agentes
├── frontend/                  # Previsto: Three.js, TypeScript, Vite y UI
│   ├── src/
│   │   ├── scene/             # Escenario, espacios, cámara y luces
│   │   ├── navigation/        # Movimiento, colisiones y escaleras
│   │   ├── interaction/       # Detección y activación de elementos
│   │   ├── ui/                # Formularios, paneles y chat
│   │   └── services/          # API REST y conexión WebSocket
│   └── public/assets/         # Modelos, texturas y recursos estáticos
├── backend/                   # Previsto: Spring Boot y Maven Wrapper
│   └── src/                   # Usuarios, contenidos, seguridad y chat
├── docs/                      # Previsto: arquitectura, tareas y entrega
└── compose.yaml               # Previsto: ejecución integrada
```

Actualmente existen únicamente `README.md` y `AGENTS.md`; el árbol muestra la estructura objetivo.

Convenciones iniciales:

- API REST bajo `/api/v1` y conexión WebSocket bajo `/ws`.
- Roles de aplicación `USER` y `ADMIN`; los visitantes podrán consultar el recorrido y los contenidos públicos.
- Autenticación mediante sesión de servidor y cookies `HttpOnly`; en producción, frontend y API se servirán bajo un mismo origen con HTTPS.
- Los archivos de trabajos se almacenarán fuera de la base de datos, en un volumen persistente, y sus metadatos en PostgreSQL. También se admitirán enlaces externos.
- Los identificadores de espacios y elementos interactivos deben ser estables para relacionar el escenario con los contenidos del backend.
- La escena usará metros como unidad, eje `Y` vertical y un origen común que se documentará antes de integrar modelos.

## Incorporación al proyecto

Se puede obtener la documentación con:

```shell
git clone https://github.com/enzoericof/tour_virtual_UC.git
cd tour_virtual_UC
```

Leer este archivo y [AGENTS.md](AGENTS.md) antes de comenzar una tarea. Para la implementación se utilizarán Git, JDK 25, Node.js 24 con npm y Docker con Compose v2. Maven Wrapper se incorporará con el backend.

**Todavía no hay comandos para ejecutar la aplicación:** faltan los proyectos frontend/backend, los scripts y la configuración de contenedores. Las instrucciones reales de instalación, variables de entorno, ejecución y verificación se añadirán junto con esos componentes.

## Forma de trabajo

1. Registrar cada tarea con objetivo, responsable, dependencias y criterios de aceptación verificables.
2. Trabajar en una rama breve: `feat/descripcion`, `fix/descripcion` o `docs/descripcion`.
3. Mantener cambios pequeños y abrir un pull request que explique el resultado y cómo se verificó.
4. Coordinar con el equipo los cambios de alcance, stack y contratos entre frontend y backend.
5. Integrar con frecuencia y conservar `main` utilizable; actualizar la documentación cuando cambien las instrucciones o los acuerdos.

No subir contraseñas, claves, archivos `.env`, dependencias descargadas ni resultados de compilación. Los recursos visuales deberán indicar su procedencia y permiso de uso cuando corresponda.

## Hitos de implementación

| Hito | Criterio de aceptación |
| --- | --- |
| 1. Base del proyecto | Frontend, backend y PostgreSQL levantan con instrucciones reproducibles. |
| 2. Primer recorrido integrado | Se ingresa a un recinto en primera persona y se consulta un panel cuyo contenido llega del backend. |
| 3. Recorrido completo | Los seis sectores previstos son reconocibles, accesibles y están conectados, incluidos ambos niveles. |
| 4. Usuarios y contenidos | Un usuario se registra y publica un trabajo; un administrador actualiza un panel; los cambios persisten. |
| 5. Chat e integración | Dos sesiones de navegador conectadas intercambian mensajes y se comprueban los permisos y la desconexión. |
| 6. Entrega | El sistema funciona en el entorno de entrega y otra persona puede configurarlo siguiendo la documentación. |

## Pendientes de coordinación

- Registrar la nómina definitiva y asignar responsables de 3D, interfaz, backend, integración y documentación.
- Confirmar fecha de entrega e hitos intermedios.
- Reunir referencias de los espacios y validar el ajuste del recinto incluido en el recorrido.
- Definir el entorno de publicación o la máquina virtual y las condiciones de acceso.
- Acordar los formatos y límites de archivos y el comportamiento del chat para visitantes sin cuenta.

Las características descritas se considerarán implementadas únicamente cuando exista el código correspondiente y se haya verificado su funcionamiento.
