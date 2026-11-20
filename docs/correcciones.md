# Correcciones documentales

## Limpieza de archivos versionados

`IMG_5659.HEIC` y `Pasillo - Piso 3.glb` salen de la versión actual. Se conservan las fotos y texturas usadas por el visor y las referencias de procedencia. El extractor recibe ahora la ruta al escaneo local. Los archivos de Docker y Compose retirados pertenecían a `backend/`, que dejó de existir en `9c5d019`. La guía vigente está en [campus-backend/setup.md](../campus-backend/setup.md).

## GitGuardian — 01/11/2026

El check del PR #1 registró dos apariciones del mismo incidente (39336961), ambas en `compose.yaml`: interpretó el texto de ayuda del operador de variable obligatoria como una contraseña. Las dos asignaciones tomaban `DATABASE_PASSWORD` del entorno; no contenían una credencial literal.

Se simplificaron ambas expresiones conservando el operador `:?`: Compose sigue rechazando una variable ausente o vacía. Se comprobaron esos dos rechazos y la validación correcta con un valor temporal, mediante `docker compose config --quiet`, sin iniciar servicios ni imprimir secretos. No se añaden exclusiones de seguridad ni se reescribe el historial compartido.

El incidente histórico requiere clasificación como falso positivo en el espacio de GitGuardian. Los checks nuevos y la clasificación del incidente histórico son estados distintos; no presentar la corrección del archivo como cierre automático del incidente.

## Integración del 01/11/2026

- La documentación solo describía `backend/`; al incorporar `feature/campus-backend` se añade el estado del proyecto separado en [arquitectura.md](arquitectura.md#aporte-campus-backend). Su compilación no implica que sustituya al servidor activo ni que se hayan unificado contratos o seguridad.
- AGENTS.md aún fijaba cuatro árboles en CyT. Se sincronizó con el aporte de dos árboles principales del patio y las cuatro referencias adicionales descritas en base-geografica.md.

Incoherencias halladas al contrastar los documentos con el código y las pruebas. Una fila por error: qué decía, qué es correcto y dónde está la verdad. Añadir al final, bajo un encabezado con la fecha.

## 31/10/2026

| Documento | Incorrecto | Correcto | Fuente de verdad |
| --- | --- | --- | --- |
| `arquitectura.md` | Rutas `/api/auth`, `/api/works`, `/api/panels` | Prefijo `/api/v1`. Faltaban `logout`, `me`, `health`, CSRF en toda escritura y los límites de campos | `ContentController`, `AuthController`, `SecurityConfig` |
| `arquitectura.md` | «Permite consultar trabajos y modificar los propios», sin indicar acceso | `GET /works` es público; escribir exige sesión y ser propietario | `SecurityConfig` |
| `README.md` | «Maven Wrapper 3.9.11» | Maven 3.9.11 mediante Wrapper 3.3.4 | `maven-wrapper.properties` |
| `README.md` | `docs/` incluye «contratos» (no existían) | Contratos de API y chat en `arquitectura.md` | `docs/` |
| `README.md` | Controles: «Shift» | Solo Shift izquierdo | `walker.ts` (`ShiftLeft`) |
| `README.md` | Solo se documentaba la contraseña del administrador (≥12) | Registro: mínimo 10 caracteres y máximo 72 bytes; administrador: 12–72 | `AuthController`, `AdminBootstrap` |
| `base-geografica.md` | «El contexto OSM excluye los volúmenes de la zona reconstruida» | Ninguna huella OSM se dibuja como volumen; sirven de marco de registro y para evitar árboles | `campus-context.ts` |
| `base-geografica.md` | Esquinas (620,352) y (606,454) atribuidas a la imagen anotada de 560 × 508 px | Pertenecen a la captura de 1333 × 827 px; el marco de trabajo se extendió al este (x hasta ~760) | `faculty-blueprint.ts` |
| `base-geografica.md` | «Área común 1/2» sin correspondencia con ids | `courtyard` ↔ `patio`; `common1` ↔ `jardin` | `places.ts` |
| `AGENTS.md` | Vistas: «Sector CyT», «Mi facultad», «Plano de CyT» y modo a pie | Cuatro vistas (falta «Vista de planta») más el modo a pie | `main.ts` |
| `AGENTS.md`, `README.md` | «Recursos versionados», sin matiz | Están en Git, pero `.gitignore` excluye `photos/`, `scans/*.glb` y `manifest.json`: añadir nuevos exige `git add -f` | `.gitignore`, `git ls-files` |
| `verificacion.md` | Backend: edición de trabajos «pendiente de repetir» | Repetida: 5/5 aprobadas | `./mvnw verify` |
| `AGENTS.md`, `base-geografica.md`, código | «Bloque de laboratorios» frente a «bloque de aulas»; constante `FACULTY_LABS` | Es el Bloque 1 (el laboratorio está en su planta baja). `FACULTY_LABS` es la huella OSM `327428698`, no designa laboratorios | `places.ts`, `campus-geometry.ts` |

**Abiertas** (no corregibles solo con documentación): `.gitignore` contradice el versionado de los recursos; hay originales versionados en la raíz (`IMG_5659.HEIC`, `Pasillo - Piso 3.glb`; ver la tabla del 01/11/2026) que AGENTS.md prohíbe subir; el nombre `FACULTY_LABS`. Seguimiento en [pendientes.md](pendientes.md).

**Reorganización**: cada hecho pasó a un único documento (tabla de AGENTS.md); se eliminaron las secciones históricas repetidas y las dos descripciones del mismo recorte.

## 31/10/2026 — medidas y texturas (rama `feat/cyt-medidas-texturas`)

| Documento | Incorrecto | Correcto | Fuente de verdad |
| --- | --- | --- | --- |
| `base-geografica.md` | El Bloque 1 se describía como «marco local de 64 × 13 m» | `facultyToWorld` escalaba ×1,17 y ×1,03: en escena medía 75 × 13,4 m. El plano está ahora en metros (75 × 12, medida del equipo) y no se escala | `faculty-blueprint.ts`, `campus-geometry.ts`, `npm test` |

## 01/11/2026 — plataforma, ascensor, torre y Sala Manfred (rama `feat/cyt-plataforma-ascensor-torre`)

| Documento | Incorrecto | Correcto | Fuente de verdad |
| --- | --- | --- | --- |
| `base-geografica.md`, `design-qa.md` | Torre de baños «partida en mitades norte y sur por una junta blanca (forma confirmada por el equipo)» | Núcleo de 2 m que sale de la galería, con semicírculos al este (mujeres) y al oeste (hombres) y anexo cuadrado en planta baja | Aclaración del equipo, `faculty-blueprint.ts`, `npm test` |
| `base-geografica.md`, código | `IMG_5727` como «pilar pintado» exento junto a la escalera; ascensor con cerramiento de lamas | El bloque pintado es el recubrimiento del ascensor: tres murales hasta la mitad superior entre el primer y el segundo piso | Aclaración del equipo, `faculty-reconstruction.ts` |
| `base-geografica.md` | Sala Manfred: rectángulo de 8 × 6 m «norte del extremo oriental del Bloque 1» | Auditorio con el frente curvo hacia la plaza techada, a 2 m de Bedelía, con un pasillo entre ambas | Aclaración del equipo, `faculty-blueprint.ts` |
| `places.ts`, `base-geografica.md` | Plaza techada, cuadrado, Bedelía, cantina y Manfred en planta baja | Sobre una plataforma a 1,75 m, con escalinatas y una escalera desde el primer piso | Aclaración del equipo, `npm test` |
| `base-geografica.md`, `design-qa.md` | Bóveda de cada tramo de la escalera del Bloque 1, horizontal a la altura del piso de llegada | Una bóveda que sigue los tramos y se aplana en los descansos | Aclaración del equipo |
| `places.ts` | Baños: «Ubicación provisional, pendiente de identificar con el equipo» | Torre del extremo oeste; hombres a la derecha y mujeres a la izquierda entrando desde la galería | Aclaración del equipo |
| `base-geografica.md`, `design-qa.md` | `IMG_5659` «desde el área común 2 hacia el Bloque 1, con la torre» | El archivo `IMG_5659.HEIC` muestra la galería de planta baja del Bloque 1 con el arranque de la escalera; no se ve la torre | `IMG_5659.HEIC` |
| `base-geografica.md`, `pendientes.md`, `correcciones.md` | `IMG_5659.HEIC` y `Pasillo - Piso 3.glb` «fuera de Git» o «sin seguimiento» en la raíz | Están versionados desde el commit `0017185` (integrado en `main` con el PR #3), contra la regla de AGENTS.md de no subir originales | `git ls-files` |

## 01/11/2026 — cabecera este, rampa y aulas (rama `feat/cyt-cabecera-este-rampa`)

| Documento | Incorrecto | Correcto | Fuente de verdad |
| --- | --- | --- | --- |
| `AGENTS.md`, `README.md`, `base-geografica.md`, `places.ts` | Plataforma «a media altura» (1,75 m) | 1,4 m: el equipo la bajó un 20 % | Aclaración del equipo, `npm test` |
| `base-geografica.md`, `faculty-blueprint.ts` | Plaza techada «pegada a toda la cabecera este», con sus lados oeste por las esquinas del Bloque 1 | Separada de la cabecera: corrida 6,5 m al este con Bedelía, el cuadrado, la cantina y Electrónica | Aclaración del equipo, `npm test` |
| `base-geografica.md`, `design-qa.md` | Escalera del primer piso a la plaza «por fuera de la cabecera este», de 1,4 m, bajo el alero prolongado del Bloque 1 | De 2,8 m, dentro de la cabecera este bajo los pisos 2 y 3, frente a la puerta del ascensor, con una bodega debajo; planta baja y primer piso están retraídos | Aclaración del equipo, `IMG_5694`, captura del cruce de los toldos |
| `base-geografica.md` | Sala Manfred de 8 × 6 m con el fondo alineado con el de Bedelía y el frente curvo hacia la plaza techada | 12 × 9 m, alineada con el Bloque 1: pizarrón al norte y frente curvo hacia la rampa | Aclaración del equipo (tamaño y giro elegidos entre opciones), `npm test` |
| `base-geografica.md` | Ascensor de 2 × 2 m a 4 m de la esquina SE | 2,5 × 2,5 m, 1,5 m más al este (centro a 3,5 m de la esquina) | Aclaración del equipo, `npm test` |
| `base-geografica.md` | Escalera Pompidou de 1,8 m que arranca a 20 m de la esquina SE | 2,4 m, arranca a 18 m | Aclaración del equipo (opción elegida), `npm test` |
| `faculty-reconstruction.ts` | Columnas de 0,34 m, una por módulo de 5 m y por piso; una o dos puertas por módulo | Columnas de 0,5 m cada 2,5 m, enteras hasta la cubierta; seis aulas por piso, desiguales, con una puerta cada una | Aclaración del equipo, `npm test` |

## 01/11/2026 — Sala Manfred: distancia a Bedelía y marquesina (rama `feat/arboles-patio`)

| Documento | Incorrecto | Correcto | Fuente de verdad |
| --- | --- | --- | --- |
| `base-geografica.md`, `faculty-blueprint.ts`, prueba | Distancia entre Sala Manfred y Bedelía: 2 m (`manfredEast = bedeliaCorner[0] − 2`) | 3,4 m (`manfredEast = bedeliaCorner[0] − 3,4`); corredor más amplio y centrado | Foto `zona_techada_y_manfred.HEIC` y coordenadas del inspector de réplica (01/11/2026) |
| `base-geografica.md`, código | Marquesina sobre la entrada de Sala Manfred no modelada | Marquesina de ~3 m de vuelo hacia la plaza techada a PLAZA_LEVEL + 4,0 m, con cuatro columnas blancas (r = 0,08 m) | Foto `zona_techada_y_manfred.HEIC`, `faculty-reconstruction.ts` |

## 02/11/2026 — Bloque 1 de 65 m, estructura, puertas y cara este (rama `feat/bloque1-65m-fachada`)

| Documento | Incorrecto | Correcto | Fuente de verdad |
| --- | --- | --- | --- |
| `README.md`, `base-geografica.md`, `faculty-blueprint.ts` | Bloque 1 de 75 × 12 m | 65 × 12 m; se conserva la cabecera este y el extremo oeste, con la torre, se corre 10 m al este | Medida del equipo, `npm test` |
| `base-geografica.md`, `faculty-blueprint.ts` | Columnas de la galería cada 2,5 m y pilastras cada 5 m | Columnas y pilastras cada 4,5 m, con 1 m en voladizo en cada extremo; dos paños de lamas por módulo | Medida del equipo, `npm test` |
| `base-geografica.md`, `faculty-blueprint.ts` | Bloque G ubicado también a 47 m de la esquina SO del Bloque 1 | Se ubica por su esquina NE (11 m de la cara sur y 11,1 m de la esquina SE); la distancia a la esquina SO pasa a 43,8 m | `npm test` |
| `base-geografica.md`, `faculty-blueprint.ts` | Escalera de la plaza al primer piso de 2,8 m | 2,1 m; la rampa y la línea de columnas de la cabecera se corren 0,7 m al este | Medida del equipo, `npm test` |
| `base-geografica.md`, `faculty-blueprint.ts` | Ascensor con el centro a 3,5 m de la esquina SE | Entre las dos últimas columnas de la galería: centro a 3,25 m | Aclaración del equipo, `npm test` |
| `base-geografica.md`, `faculty-blueprint.ts` | Escalera Pompidou con tramo de 6,5 m y descanso de 3,5 m (cuatro intervalos de 2,5 m) | Tramo de 6 m y descanso de 3 m (dos módulos de 4,5 m), para que cada descanso siga entrando entre dos columnas | `npm test` |
| `base-geografica.md` | «No se asignan números de aula»; una puerta de una hoja por aula | Puerta doble de 1,7 m con hoja fija y ventana, montante y prisma con el número (10x, 20x, 30x) | Aclaración del equipo, `IMG_5639` |
| `base-geografica.md` | «Los módulos de 5 m del plano redondean los 5,14 m [del escaneo] para que entren 15 en los 75 m» | El escaneo (72 m) es un 11 % más largo que el bloque; corregido, su módulo da unos 4,6 m | Medida del equipo |
| `faculty-blueprint.test.mjs` | El vértice del frente curvo de Manfred debía quedar entre los bordes de la rampa | Con la rampa 0,7 m más al este, el vértice queda 0,12 m al oeste de su borde; se comprueba que esté a menos de 1,5 m de su eje. Manfred sigue anclado a Bedelía | `npm test` |

## 03/11/2026 — revisión general (rama `fix/puertas-placas-revision`)

| Documento | Incorrecto | Correcto | Fuente de verdad |
| --- | --- | --- | --- |
| `faculty-blueprint.test.mjs` | La Sala Manfred debía estar sobre el prisma de la plataforma (fallo arrastrado desde el 01/11) | Desde `2631f6f` es un anfiteatro con gradas que bajan: queda fuera del prisma y su frente da a la explanada. La prueba comprueba eso | `2631f6f`, `npm test`, recorrido con el caminante |
| `faculty-blueprint.ts`, `faculty-reconstruction.ts` | Escalinata recta al sur del cuadrado en `platformSteps`, salteada por índice al dibujar; su pie caía dentro de la plaza abierta (el fallo anterior lo ocultaba) | Retirada de los datos: la reemplazaron los escalones de la explanada de la cantina | `base-geografica.md` (contorno de explanada), `npm test` |
| `base-geografica.md`, código | Número de aula en un prisma triangular horizontal; montante de 0,53 m | Dos placas verticales en punta hacia afuera, una hacia cada lado; montante de 0,265 m | Aclaración del usuario |
| `README.md`, `AGENTS.md`, `arquitectura.md`, `verificacion.md` | `backend/` es el servidor activo del frontend y de Docker | Retirado en `9c5d019`; queda abierto, sin corrección de código, por decisión del usuario | `git ls-files`, `campus-backend/setup.md` |
| `faculty-blueprint.ts`, `faculty-reconstruction.ts` | Al integrar `origin/main` `849c037`, `galleryStepsTop = half.x + 2 * STEPS_RUN` y una franja del rellano en `block1.length / 2` tomaban la mitad del largo (32,5 m) como cara este; la llegada `acceso` quedó fuera de la plataforma | Cara este del plano (`east`, 37,5 m). Git las combinó sin conflicto porque usan la convención del bloque de 75 m | `npm test` |
| `faculty-blueprint.test.mjs` | La escalera de la galería debía arrancar en la cara este, a menos de 7 m del ascensor medidos desde su borde de arriba | Desde `174f9cd` un rellano rosado a nivel del piso prolonga la galería y la escalera arranca en su borde; la distancia al ascensor se mide desde el pie | `npm test` |
| `design-qa.md` | La sección «Bloque 1 de 65 m» se perdió en `main` al resolver un merge anterior (quedó debajo del encabezado de las mesas de la cantina) | Restaurada al final del documento | `git show 7f98c4a:design-qa.md` |
| `base-geografica.md` | Plataforma a 1,4 m en la tabla de niveles, en la fila de la plataforma y en la distribución | 0,9 m desde el 02/11, como `PLAZA_LEVEL` y AGENTS.md | `faculty-blueprint.ts` |
| `base-geografica.md`, `AGENTS.md` | Las «medidas del equipo» de todos los edificios se presentaban por igual como medidas | Solo el Bloque 1 tiene medidas reales; el resto sale de capturas o estimaciones. Lista de medidas faltantes en «Estado de las medidas» | Aclaración del usuario (03/11/2026) |
| `faculty-reconstruction.ts` | Foso de la Sala Manfred fijo a 1,25 m bajo la plataforma: con la plataforma a 0,9 m quedó 0,35 m bajo el terreno y el césped tapaba el escenario | Foso 0,15 m sobre el terreno, como en el diseño original, con la bajada repartida entre las cinco gradas | Recorrido con el caminante y revisión visual |

## 15/11/2026 — documentación de entrada

- El README citaba un desnivel de 1,40 m para la plataforma. La cota del modelo es de 0,90 m, indicada en `PLAZA_LEVEL` y en [Coordenadas y pisos](base-geografica.md#coordenadas-y-pisos).
- La guía geográfica indicaba que los escaneos todavía eran escenas independientes. El recorrido se construye con el modelo común y usa las texturas derivadas de los escaneos.
- La [revisión visual](../design-qa.md) resume las comprobaciones por sector. La bitácora desplegable conserva el detalle de las revisiones anteriores.

## 19/11/2026 — ascensor

| Documento | Incorrecto | Correcto | Fuente de verdad |
| --- | --- | --- | --- |
| Fotos aportadas, pedido original | `cara este.jpeg` (mural de los cascos) como cara este, y la cara oeste con el mural de `IMG_5727` | Los cascos van en la cara oeste y la computadora (`IMG_5727`) en la este. Al rodear la torre, el mural del lápiz (sur) tiene los cascos a su izquierda y la computadora a su derecha | `cara este.jpeg`, `IMG_5727` y `cara sur.jpeg`; confirmación del usuario |
| `base-geografica.md` | «Es un volumen: no se puede usar» | La cabina funciona en los cuatro niveles (`ElevatorMotion`); desde el 19/11 también con sonido | `scene/elevator.ts`, `scene/engine.ts` |
| `pendientes.md` | «Hoy el ascensor del Bloque 1 es solo un volumen» | Ídem | Ídem |


### 19/11/2026 — Ubicación del defecto de renderizado de la captura

La fachada curva con ventana horizontal y marquesina suspendida es la cocina de cantina. Se identificó inicialmente como torre de baños y se corrigió allí otra superposición real, sin resolver la captura. La revisión posterior reprodujo el defecto exacto en cantina y retranqueó su cubierta dentro del muro. La verificación correspondiente está en docs/verificacion.md.
