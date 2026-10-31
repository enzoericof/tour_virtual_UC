# Correcciones documentales

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

**Abiertas** (no corregibles solo con documentación): `.gitignore` contradice el versionado de los recursos; hay originales sin seguimiento en la raíz (`IMG_5659.HEIC`, `Pasillo - Piso 3.glb`) que AGENTS.md prohíbe subir; el nombre `FACULTY_LABS`. Seguimiento en [pendientes.md](pendientes.md).

**Reorganización**: cada hecho pasó a un único documento (tabla de AGENTS.md); se eliminaron las secciones históricas repetidas y las dos descripciones del mismo recorte.
