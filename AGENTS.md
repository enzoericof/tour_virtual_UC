# AGENTS.md — Instrucciones del proyecto

## Propósito y alcance

Estas instrucciones se aplican a todo el repositorio y orientan a colaboradores y asistentes de desarrollo. Leer también [README.md](README.md), que contiene el alcance funcional, el stack y el estado del proyecto.

Este es un proyecto nuevo del Trabajo Práctico de Informática III 2026: visita virtual de la Facultad de Ciencias y Tecnología de la Universidad Católica, Campus Santa Librada. El objetivo central es combinar computación gráfica con gestión de usuarios y contenidos.

## Colaboración

- Mantener claros el alcance, las decisiones técnicas, las tareas y los acuerdos para facilitar la integración del trabajo grupal.
- Resolver las tareas concretas solicitadas, incluidas documentación o implementación.
- Registrar objetivos, responsables, dependencias y criterios de aceptación. No inventar integrantes, asignaciones, fechas, aprobaciones docentes ni funcionalidades terminadas.
- Priorizar el alcance del TP y una solución que el equipo pueda entender, ejecutar, mantener y explicar en la defensa.
- Respetar las decisiones explícitas y las autorizaciones de la conversación. Resolver detalles rutinarios dentro de la tarea; consultar únicamente cuando falte información que impida continuar o exista una decisión sustancial fuera del alcance autorizado.

## Alcance que se debe preservar

El recorrido incluye:

1. Pasillo de acceso.
2. **Cantina de CyT.**
3. Sala Manfred.
4. Planta baja del bloque de laboratorios.
5. Primer piso de aulas.
6. Escaleras, patios y pasillos comunes.
7. Bedelía.
8. Segundo piso.
9. Tercer piso.
10. Baños.
11. Bloque G.
12. Estacionamiento.

El alcance ampliado incluye tanto Cantina de CyT como Bedelía. Conservar ambos nombres e identificadores. Horacio confirmó que el “Bloque 2” de las carpetas de referencia y de la vista aérea es el Bloque G. Las medidas de la reconstrucción y los recintos sin captura específica siguen pendientes de validación.

Se requieren primera persona, movimiento libre, acceso a los recintos, paneles informativos, biblioteca de trabajos, registro e inicio de sesión, publicación de trabajos propios y administración de paneles.

El equipo está formado por **seis integrantes**; la nómina está pendiente de registrar. La consigna exige interacción entre usuarios para **más de cuatro alumnos** y agente IA para **más de seis** (siete o más). Con seis integrantes, el chat en tiempo real es obligatorio y debe incluirse en la planificación. El agente IA y el recorrido guiado con IA no son obligatorios para este equipo y están fuera del alcance inicial; revisar el requisito si cambia el tamaño del grupo.

## Stack acordado

| Componente | Decisión |
| --- | --- |
| Escenario | Three.js utilizado directamente. |
| Frontend | TypeScript estricto, Vite, HTML y CSS. |
| Herramientas frontend | Node.js 24 LTS y npm. |
| Backend | Java 25 LTS y Spring Boot 4.1.2. |
| Construcción Java | Maven mediante Maven Wrapper. |
| Persistencia | PostgreSQL 18 y Spring Data JPA/Hibernate. |
| Esquema de datos | Migraciones Flyway versionadas. |
| Seguridad | Spring Security, sesiones de servidor y cookies `HttpOnly`. |
| Chat | WebSocket y STOMP con Spring. |
| Ejecución integrada | Docker y Docker Compose v2. |
| Colaboración | Git, GitHub, tareas y pull requests. |

- Fijar las versiones exactas del frontend al inicializarlo y conservar `package-lock.json`.
- Usar el manejo de dependencias de Spring Boot y versionar Maven Wrapper. No mezclar versiones de Spring manualmente sin una necesidad comprobada.
- Mantener las versiones de ejecución coherentes entre documentación, manifiestos y contenedores. Evitar imágenes `latest`.
- Node.js corresponde a las herramientas del frontend; el backend funcional se implementa en Java.
- Incorporar un framework de interfaz, cambiar la versión mayor de una tecnología o sustituir una pieza del stack es una decisión de arquitectura. Si la solicitud ya lo autoriza, implementarla y actualizar ambos documentos; de lo contrario, presentar el motivo y el impacto al equipo antes de efectuarla.
- Priorizar un backend monolítico organizado por funcionalidades y dependencias necesarias para el TP.

## Organización y límites entre componentes

La estructura actual se describe en el README. Mantener separados los componentes:

- `frontend/`: escenario, navegación, interacción, interfaz y clientes de API/chat.
- `backend/`: usuarios, autenticación, trabajos, paneles y chat.
- `docs/`: arquitectura, referencias del campus, tareas, decisiones y entrega.
- `compose.yaml`: servicios y volúmenes necesarios para ejecutar el conjunto.

El navegador consume REST bajo `/api/v1` y WebSocket bajo `/ws`; solo el backend accede a PostgreSQL. Documentar métodos, rutas, campos, errores y permisos al implementar cada contrato. Coordinar los cambios de contrato con los componentes afectados.

Separar la geometría 3D de los contenidos administrables. Usar identificadores estables para espacios y puntos interactivos; por ejemplo, `cantina-cyt`. Los paneles y la biblioteca deben obtener sus contenidos del backend en la versión integrada.

## Pautas para Three.js

- Separar construcción del escenario, controles, colisiones, interacción, interfaz y acceso a datos.
- Usar metros como unidad y el eje `Y` vertical. Documentar el origen y la orientación común antes de combinar modelos aportados por distintos integrantes.
- Mantener un único ciclo de renderizado y adaptar cámara y renderizador al tamaño de la ventana.
- La experiencia principal es en primera persona con teclado y mouse. Resolver la captura y liberación del cursor, especialmente al abrir formularios o el chat.
- Implementar movimiento, colisiones y acceso entre niveles. Verificar que todos los recintos requeridos sean alcanzables.
- Priorizar distribución y proporciones reconocibles antes que detalles, mobiliario o efectos visuales costosos.
- Preferir geometrías y materiales reutilizables; evitar asignaciones innecesarias en cada cuadro y liberar recursos al retirar escenas o componentes.
- Si se incorporan modelos externos, preferir glTF/GLB y registrar origen y permiso de uso. Mantener recursos dentro de límites razonables de tamaño y complejidad.
- Verificar visualmente el resultado en navegador; una compilación correcta por sí sola no demuestra que el recorrido funciona.

## Backend, contenidos y seguridad

- Organizar el backend por funcionalidades; separar controladores, lógica de negocio, persistencia y DTO de entrada/salida.
- Validar entradas y permisos en el servidor. Un usuario puede gestionar sus trabajos; la actualización de paneles requiere `ADMIN`.
- Usar las capacidades de Spring Security para contraseñas y sesiones. No guardar contraseñas en texto plano ni construir mecanismos criptográficos propios.
- Mantener protección CSRF con autenticación por cookies y configurar los orígenes permitidos para HTTP y WebSocket. Usar HTTPS y cookies seguras en producción.
- Aplicar control de acceso también al chat y a las descargas que lo requieran. Validar longitud y contenido de mensajes; tratar los textos publicados como datos y evitar insertar HTML sin saneamiento.
- Guardar metadatos de trabajos y paneles en PostgreSQL. Para archivos, usar almacenamiento fuera del directorio público, nombres generados por el servidor y límites de formato y tamaño; comprobar propiedad y permisos en las operaciones correspondientes.
- Versionar cambios de esquema con Flyway. No depender de que Hibernate altere automáticamente la base de datos en el entorno de entrega.
- Distinguir conexión de visitantes en tiempo real de persistencia de mensajes. El historial de chat y los avatares sincronizados no son requisitos asumidos de esta base.
- Configurar secretos por variables de entorno. Al implementar la configuración, añadir un archivo de ejemplo sin credenciales reales e ignorar los archivos locales con secretos.

## Colaboración y documentación

- Escribir documentación y textos del producto en español. Utilizar nombres de código consistentes y comentarios que expliquen decisiones cuando sea necesario.
- Mantener los cambios limitados a la tarea; conservar el trabajo existente de otros integrantes.
- Usar ramas breves `feat/descripcion`, `fix/descripcion` o `docs/descripcion` y commits descriptivos. El README y este archivo constituyen la inicialización documental de `main`; el desarrollo posterior se revisa mediante pull requests.
- Registrar los cambios importantes de arquitectura o alcance en la documentación e informar su efecto en las tareas pendientes.
- No traer código de prototipos anteriores salvo solicitud explícita; este repositorio comienza desde cero.
- No subir `node_modules`, resultados de compilación, archivos `.env`, claves, bases de datos locales ni archivos personales.
- Mantener clara la diferencia entre previsto, implementado y verificado. No presentar rutas, carpetas, scripts o servicios planificados como si ya existieran.

## Verificación y definición de terminado

Ejecutar únicamente comandos que existan en el proyecto y documentar los comandos reales al incorporar cada componente. No inventar scripts ni afirmar que se realizaron comprobaciones que no se ejecutaron.

- **Documentación:** revisar consistencia del alcance y stack, enlaces internos y estado real de las instrucciones. Para cambios únicamente documentales no es necesario construir una aplicación inexistente ni añadir pruebas de código.
- **Frontend:** ejecutar las comprobaciones disponibles de tipos y construcción, y revisar en navegador los cambios visuales o de interacción.
- **Backend:** ejecutar las pruebas pertinentes con Maven Wrapper; comprobar reglas de negocio, validaciones y autorización cuando se modifiquen.
- **Integración:** comprobar persistencia de contenidos y, cuando corresponda, intercambio de mensajes entre dos sesiones de navegador.
- **Recorrido:** comprobar entrada a los sectores requeridos, movimiento entre plantas, colisiones e interacción con paneles y biblioteca.
- **Entrega:** verificar que una persona pueda configurar y ejecutar la versión entregada siguiendo la documentación, con datos persistentes y sin credenciales incorporadas al repositorio.

Una tarea termina cuando cumple sus criterios de aceptación, se ha verificado de manera proporcional al cambio y la documentación refleja el comportamiento real. Si una comprobación no puede ejecutarse, indicar cuál y por qué, sin confundirla con un resultado satisfactorio.

## Estado al crear este archivo

La versión 0.1.0 incluye frontend ejecutable, tres escaneos navegables, reconstrucción aproximada del campus, backend de usuarios/contenidos/chat, pruebas, Maven Wrapper y configuración de Docker Compose. Consultar `docs/verificacion.md` para distinguir pruebas ejecutadas de validaciones pendientes. PostgreSQL 18 sigue siendo la base de entrega; el perfil local H2 es una alternativa de desarrollo, no una sustitución de arquitectura. No existe todavía despliegue público ni avatares sincronizados.

Los recursos utilizados están versionados. Las fuentes de Drive se mantienen de solo lectura; no subir originales ni recursos no utilizados. `scripts/prepare-assets.py` solo escribe derivados locales y `frontend/public/assets/sources.json` registra su procedencia.
