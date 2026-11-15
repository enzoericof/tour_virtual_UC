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
| **Servidor del frontend:** integrar la biblioteca, los paneles y el chat con `campus-backend/`. Los contratos anteriores están en [arquitectura](arquitectura.md#aporte-campus-backend) | Biblioteca, paneles y chat operativos en el visor con pruebas de PostgreSQL y permisos |
| Medidas: tomar en el lugar las que faltan del Bloque 1 y las de los demás edificios ([estado de las medidas](base-geografica.md#estado-de-las-medidas-03112026)) y confirmar las interpretaciones de los [límites de fidelidad](base-geografica.md#límites-de-fidelidad) | Medidas registradas en base-geografica.md e incorporadas a `faculty-blueprint.ts`, con `npm test` actualizado |
| Murales del ascensor: hoy las tres caras repiten el mural de `IMG_5727` | Fotos de las caras sur y oeste incorporadas como texturas propias, con su procedencia en `sources.json` |
| Cantina: fachada, forma de cubierta e interior; interior de Electrónica e Informática | Referencias recibidas e incorporadas a `faculty-blueprint.ts` / `faculty-reconstruction.ts` |
| Referencias de segundo piso y baños (distribución interior de la torre; ya se conocen su forma y qué lado es de cada baño) | `piso-2` y `banos` pasan de `pending` a `reference` en `places.ts` |
| Escaneos: huecos y alineación con el campus; recorrido por dentro de aulas, cantina y Bedelía | Recorrido sin atascos hasta todos los recintos de [AGENTS.md](../AGENTS.md); las escaleras de ambos bloques ya se recorrieron |
| En pantallas angostas, el logo («Inicio») abre el panel Explorar encima de la portada y tapa «Comenzar recorrido» (comportamiento anterior a esta rama) | El botón queda visible y utilizable en 390 px de ancho |
| Rendimiento en móviles y sesión con seis usuarios simultáneos | Medición registrada en verificacion.md |
| Avatares compartidos | Decisión del equipo sobre si el alcance lo requiere; hoy no es requisito asumido |
| Empaquetado de la aplicación actual con Docker y PostgreSQL, configuración de producción y HTTPS | `docker compose up --build` funcionando con `campus-backend/` y datos persistentes tras reiniciar |
| Pruebas visuales de cuentas y biblioteca | Resultado registrado en verificacion.md (el backend ya tiene cobertura automática) |
| Registrar los seis integrantes, sus roles y fechas | Nómina aportada por el equipo, sin asignaciones supuestas |
| Nomenclatura del plano | Revisar el nombre `FACULTY_LABS` según el edificio que representa |
