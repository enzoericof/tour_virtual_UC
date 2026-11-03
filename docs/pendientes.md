# Pendientes

Responsables y fechas: **sin asignar** (no se registran por suposición). Estado de las pruebas: [verificacion.md](verificacion.md).

## Issues principales (03/11/2026)

Prioridades indicadas por el usuario, en este orden.

| Issue | Criterio de terminado |
| --- | --- |
| 1. Plaza techada: ubicarla y renderizarla | Posición y tamaño medidos en el lugar (hoy 15 × 10 m y corrimiento de 6,5 m, de capturas); cubierta, columnas y servicios visibles desde la vista general y recorribles a pie sin atascos |
| 2. Escaleras frente a ascensores de los bloques de clases | Decisión del equipo sobre la circulación vertical del Bloque 1 y el Bloque G (hoy el ascensor del Bloque 1 es solo un volumen y la escalera del Bloque G es una interpretación) e implementación verificada piso por piso |
| 3. Bedelía, LED y los demás edificios secundarios | Medidas o fotos de cada uno registradas en base-geografica.md; volúmenes, fachadas y accesos actualizados en `faculty-blueprint.ts` / `faculty-annexes.ts` |
| 4. Camineros y árboles | Trazado y especies según referencias identificadas; red peatonal conectada (`npm test`) y árboles sin tapar accesos ni circulaciones |
| 5. Interfaz general | Revisión de la interfaz (inicio, menú de pausa, explorador, biblioteca y cuentas) en escritorio y en 390 px de ancho, con resultado registrado en verificacion.md |

## Otras tareas

| Tarea | Criterio de terminado |
| --- | --- |
| **Servidor del frontend (03/11/2026):** `backend/` fue retirado en `9c5d019` y `campus-backend/` no ofrece `/api/v1`, `/ws`, paneles ni chat; el `Dockerfile` copia la carpeta retirada. Decidir entre restaurar `backend/` (está en `fd95f87`) o adaptar frontend, Docker y documentación a `campus-backend` (rutas, CSRF, lectura pública de la biblioteca, paneles y chat) | Un único servidor acordado, consumido por el frontend y Compose, con pruebas de PostgreSQL y permisos, y AGENTS.md, README y arquitectura.md actualizados |
| Medidas: tomar en el lugar las que faltan del Bloque 1 y las de los demás edificios ([estado de las medidas](base-geografica.md#estado-de-las-medidas-03112026)) y confirmar las interpretaciones de los [límites de fidelidad](base-geografica.md#límites-de-fidelidad) | Medidas registradas en base-geografica.md e incorporadas a `faculty-blueprint.ts`, con `npm test` actualizado |
| Murales del ascensor: hoy las tres caras repiten el mural de `IMG_5727` | Fotos de las caras sur y oeste incorporadas como texturas propias, con su procedencia en `sources.json` |
| Cantina: fachada, forma de cubierta e interior; interior de Electrónica e Informática | Referencias recibidas e incorporadas a `faculty-blueprint.ts` / `faculty-reconstruction.ts` |
| Referencias de segundo piso y baños (distribución interior de la torre; ya se conocen su forma y qué lado es de cada baño) | `piso-2` y `banos` pasan de `pending` a `reference` en `places.ts` |
| Escaneos: huecos y alineación con el campus; recorrido por dentro de aulas, cantina y Bedelía | Recorrido sin atascos hasta todos los recintos de [AGENTS.md](../AGENTS.md); las escaleras de ambos bloques ya se recorrieron |
| En pantallas angostas, el logo («Inicio») abre el panel Explorar encima de la portada y tapa «Comenzar recorrido» (comportamiento anterior a esta rama) | El botón queda visible y utilizable en 390 px de ancho |
| Rendimiento en móviles y sesión con seis usuarios simultáneos | Medición registrada en verificacion.md |
| Avatares compartidos | Decisión del equipo sobre si el alcance lo requiere; hoy no es requisito asumido |
| Docker + PostgreSQL, configuración de producción y HTTPS | `docker compose up --build` funcionando con datos persistentes tras reiniciar |
| Pruebas visuales de cuentas y biblioteca | Resultado registrado en verificacion.md (el backend ya tiene cobertura automática) |
| Registrar los seis integrantes, sus roles y fechas | Nómina aportada por el equipo, sin asignaciones supuestas |
| Higiene del repositorio | Decidir entre corregir el `.gitignore` o documentar `git add -f` como práctica; decidir qué hacer con los originales versionados en la raíz desde el commit `0017185` (`IMG_5659.HEIC`, `Pasillo - Piso 3.glb`, unos 25 MB), que AGENTS.md prohíbe subir: quitarlos deja el peso en el historial; revisar el nombre `FACULTY_LABS`. `IMG_5694.HEIC` (01/11) e `IMG_5639.HEIC` (02/11) están en la raíz sin seguimiento; desde el 03/11 `.gitignore` excluye los HEIC de la raíz (el ya versionado no se ve afectado) |
