# Correcciones documentales

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
