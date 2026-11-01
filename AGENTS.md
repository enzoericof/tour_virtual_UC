# AGENTS.md — Instrucciones del proyecto

Aplican a todo el repositorio. Proyecto del TP de Informática III 2026: visita virtual de la Facultad de Ciencias y Tecnología (CyT) de la Universidad Católica, Campus Santa Librada; combina computación gráfica con gestión de usuarios y contenidos. Es un proyecto nuevo: no traer código de prototipos anteriores salvo solicitud explícita.

## Fuente única de cada tema (enlazar, no duplicar)

| Tema | Documento |
| --- | --- |
| Inicio rápido, controles, stack y **versiones exactas**, comandos | [README.md](README.md) |
| Rutas, contratos, seguridad, chat | [docs/arquitectura.md](docs/arquitectura.md) |
| Geografía, ids, coordenadas, fidelidad | [docs/base-geografica.md](docs/base-geografica.md) |
| Procedencia de fotos y escaneos | [docs/referencias.md](docs/referencias.md) |
| Pruebas ejecutadas | [docs/verificacion.md](docs/verificacion.md) |
| Incoherencias documentales halladas y corregidas (anotar aquí las nuevas) | [docs/correcciones.md](docs/correcciones.md) |
| Tareas pendientes | [docs/pendientes.md](docs/pendientes.md) |
| Última revisión visual | [design-qa.md](design-qa.md) |

## Colaboración

- No inventar integrantes, asignaciones, fechas, aprobaciones docentes ni funcionalidades terminadas. Registrar objetivos, responsables, dependencias y criterios de aceptación.
- Priorizar el alcance del TP y una solución que el equipo pueda entender, ejecutar, mantener y explicar en la defensa.
- Respetar las decisiones explícitas y las autorizaciones de la conversación. Resolver los detalles rutinarios; consultar solo si falta información bloqueante o la decisión es sustancial y no está autorizada.
- Mantener claro lo previsto, lo implementado y lo verificado; no presentar como existente lo planificado.

## Alcance que se debe preservar

El recorrido incluye estos ítems (ids estables de `frontend/src/data/places.ts`; conservar nombres e ids):

| Ítem | Id |
| --- | --- |
| Pasillo de acceso | `acceso` |
| **Cantina de CyT** | `cantina-cyt` |
| Sala Manfred | `sala-manfred` |
| Planta baja del bloque de laboratorios (Bloque 1) | `laboratorio` |
| Primer piso de aulas | `piso-1` |
| Escaleras, patios y pasillos comunes | `patio`, `jardin`, `plaza`, `plaza-abierta` (las escaleras no tienen id propio) |
| Bedelía | `bedelia` |
| Segundo piso | `piso-2` (por validar) |
| Tercer piso | `pasillo-p3`, `aula-p3` |
| Baños | `banos` (por validar) |
| Bloque G | `bloque-g` |
| Estacionamiento | `estacionamiento` |

Cantina de CyT y Bedelía están ambas en el alcance. «Bloque 2» de las carpetas y de la vista aérea es el Bloque G (confirmó Horacio). Las medidas de la reconstrucción y los recintos sin captura específica siguen pendientes de validación.

Funciones requeridas: primera persona, movimiento libre, acceso a los recintos, paneles informativos, biblioteca de trabajos, registro e inicio de sesión, publicación de trabajos propios y administración de paneles.

Equipo: **seis integrantes** (nómina pendiente de registrar). La consigna exige interacción entre usuarios para **más de cuatro alumnos** (chat en tiempo real obligatorio) y agente IA para **siete o más**: el agente IA y el recorrido guiado con IA no son obligatorios para este equipo y quedan fuera del alcance inicial (revisar si cambia el tamaño del grupo).

## Stack acordado

Versiones exactas: tabla del README (única fuente). Decisiones: Three.js directo; TypeScript estricto + Vite + HTML/CSS; Node.js 24 LTS y npm (solo herramientas del frontend); Java 25 LTS + Spring Boot con Maven Wrapper; PostgreSQL 18 con Spring Data JPA/Hibernate y migraciones Flyway; Spring Security con sesiones de servidor y cookies `HttpOnly`; WebSocket + STOMP; Docker y Compose v2; Git/GitHub con ramas y pull requests.

- Fijar versiones exactas del frontend y conservar `package-lock.json`. Dejar que Spring Boot gestione sus dependencias; versionar Maven Wrapper.
- Mantener las versiones coherentes entre documentación, manifiestos y contenedores. Sin imágenes `latest`.
- Incorporar un framework de interfaz, cambiar una versión mayor o sustituir una pieza del stack es una decisión de arquitectura: si la solicitud la autoriza, implementarla y actualizar AGENTS.md y README.md; si no, presentar motivo e impacto al equipo antes.
- Backend monolítico organizado por funcionalidades y limitado a las dependencias necesarias.

## Componentes

- `frontend/`: escenario, navegación, interacción, interfaz y clientes de API/chat. `backend/`: usuarios, autenticación, trabajos, paneles y chat. `docs/`: documentación. `compose.yaml`: ejecución conjunta.
- El navegador consume REST bajo `/api/v1` y WebSocket bajo `/ws`; solo el backend accede a PostgreSQL. Actualizar [docs/arquitectura.md](docs/arquitectura.md) en el mismo cambio que modifique un contrato y coordinar con los componentes afectados.
- Separar la geometría 3D de los contenidos administrables. Paneles y biblioteca salen del backend en la versión integrada.

## Three.js

### Sector CyT

Detalle y justificación: [docs/base-geografica.md](docs/base-geografica.md); consultarlo antes de mover bloques o cambiar coordenadas.

- El escenario se limita a **CyT, las dos canchas vecinas y los estacionamientos cercanos**. `campus-geometry.ts` selecciona ese sector de `campus-layout.json`, que queda como referencia. No reincorporar otras facultades ni el seminario sin nueva indicación del equipo.
- `faculty-blueprint.ts` es la única geometría de CyT para las cuatro vistas («Sector CyT», «Vista de planta», «Plano de CyT», «Mi facultad») y el modo a pie. No recuperar los bloques paralelos antiguos ni duplicar anexos con volúmenes OSM. El Bloque G es oblicuo respecto del Bloque 1.
- Secuencia: **bloque de aulas → plaza techada → plaza abierta → cantina girada**, junto al Departamento de Electrónica e Informática. La plaza abierta queda a cielo abierto y unida al pavimento de la techada. `plaza` es la techada; `plaza-abierta` es independiente. Plaza techada, cuadrado, Bedelía, cantina y Sala Manfred están sobre una plataforma a 1,40 m, entre la planta baja y el primer piso; los bloques quedan en el nivel del suelo. La aclaración del equipo y las capturas del 31/10/2026 prevalecen sobre el rótulo «Cantina» de la imagen anotada antigua.
- `X` este, `Z` sur, `Y` vertical, metros. Los puntos de visita pasan por `facultyToWorld`, que solo gira y traslada el plano métrico: no escalarlo ni volver a registrarlo sobre píxeles de imágenes. Las medidas del equipo están en base-geografica.md y las comprueba `npm test`.
- Red peatonal conectada y circulaciones despejadas. Sin bosques: 4 árboles de referencia en CyT y pocos en el contexto.
- Afinar interiores, anexos y fachadas solo con referencias identificadas. Árboles, vehículos y alturas del contexto son aproximaciones, no un relevamiento.
- Mantener la atribución de OpenStreetMap. Las capturas de Google Maps sirven para comparar, no son texturas.

### Implementación

- Separar construcción del escenario, controles, colisiones, interacción, interfaz y acceso a datos. Un único ciclo de renderizado; cámara y renderizador se adaptan a la ventana.
- Documentar origen y orientación común antes de combinar modelos de distintos integrantes.
- Experiencia principal: primera persona con teclado y mouse. Resolver captura y liberación del cursor, sobre todo al abrir formularios o el chat.
- Implementar movimiento, colisiones y acceso entre niveles; verificar que todos los recintos requeridos sean alcanzables.
- Priorizar distribución y proporciones reconocibles sobre detalle, mobiliario o efectos costosos. Reutilizar geometrías y materiales, evitar asignaciones por cuadro y liberar recursos al retirar escenas.
- Modelos externos: preferir glTF/GLB, registrar origen y permiso de uso, y acotar tamaño y complejidad.

## Backend, contenidos y seguridad

- Organizar por funcionalidades; separar controladores, lógica, persistencia y DTO.
- Validar entradas y permisos en el servidor. Un usuario gestiona solo sus trabajos; los paneles requieren `ADMIN`.
- Contraseñas y sesiones con Spring Security; sin texto plano ni criptografía propia.
- CSRF con autenticación por cookies; orígenes permitidos configurados para HTTP y WebSocket; HTTPS y cookies seguras en producción.
- Control de acceso también en el chat y en las descargas que lo requieran. Validar longitud y contenido de mensajes; tratar los textos publicados como datos y no insertar HTML sin sanear.
- Metadatos de trabajos y paneles en PostgreSQL. Para archivos (hoy no existen): almacenamiento fuera del directorio público, nombres generados por el servidor, límites de formato y tamaño y comprobación de propiedad.
- Cambios de esquema solo con Flyway; no depender de que Hibernate altere la base en la entrega.
- Conexión en tiempo real no implica persistencia de mensajes: historial de chat y avatares sincronizados no son requisitos asumidos.
- Secretos por variables de entorno; mantener un archivo de ejemplo sin credenciales (`.env.example`) e ignorar los locales.

## Documentación y repositorio

- Documentación y textos del producto en español; nombres de código consistentes; comentarios que expliquen decisiones.
- Cambios limitados a la tarea; conservar el trabajo de otros integrantes.
- Ramas `feat/…`, `fix/…`, `docs/…`; commits descriptivos; pull requests para el desarrollo posterior. Excepción registrada: el recorte a CyT se integró directamente en `main` por solicitud del equipo.
- Registrar en la documentación los cambios de arquitectura o alcance y su efecto en las tareas pendientes. Cada hecho vive en un solo documento (tabla anterior).
- No subir `node_modules`, resultados de compilación, `.env`, claves, bases locales ni archivos personales.
- Recursos: las fotos WebP y los GLB usados están en Git, pero `.gitignore` excluye `photos/`, `scans/*.glb` y `manifest.json`; añadir uno nuevo requiere `git add -f`. Las fuentes de Drive son de solo lectura; no subir originales (HEIC, escaneos sin optimizar) ni recursos no usados. `scripts/prepare-assets.py` y `scripts/extract-scan-textures.py` solo escriben derivados locales (las texturas de `textures/` no están excluidas); `frontend/public/assets/sources.json` registra la procedencia.

## Verificación y definición de terminado

Ejecutar solo comandos que existan (listados en el README). No inventar scripts ni afirmar comprobaciones no ejecutadas.

| Tipo | Qué comprobar |
| --- | --- |
| Documentación | Consistencia de alcance, stack y enlaces; estado real de lo descrito. No requiere pruebas de código |
| Frontend | Tipos y build; revisión en navegador de cambios visuales o de interacción |
| Backend | Pruebas con Maven Wrapper; reglas de negocio, validaciones y autorización |
| Integración | Persistencia de contenidos; chat entre dos sesiones de navegador |
| Recorrido | Entrada a los sectores requeridos, movimiento entre plantas, colisiones, paneles y biblioteca |
| Entrega | Que otra persona pueda configurar y ejecutar siguiendo la documentación, con datos persistentes y sin credenciales en el repositorio |

Una tarea termina cuando cumple sus criterios de aceptación, se verificó de forma proporcional al cambio y la documentación refleja el comportamiento real. Si una comprobación no puede ejecutarse, indicar cuál y por qué, sin presentarla como satisfactoria.

## Estado

Versión 0.1.0: frontend ejecutable, tres escaneos navegables, reconstrucción aproximada del sector CyT, backend de usuarios, contenidos y chat, pruebas, Maven Wrapper y Compose. Qué se probó y qué falta: [docs/verificacion.md](docs/verificacion.md) y [docs/pendientes.md](docs/pendientes.md). PostgreSQL 18 es la base de entrega; el perfil `local` con H2 es solo para desarrollo. Sin despliegue público ni avatares sincronizados.
