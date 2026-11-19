# Pendientes

Responsables y fechas: **sin asignar** (no se registran por suposición). Estado de las pruebas: [verificacion.md](verificacion.md).

## Alcance de la entrega

La consigna incluye el recorrido libre en primera persona, el acceso a los recintos, los paneles informativos, la biblioteca de trabajos, el registro y el inicio de sesión, la publicación de trabajos propios y la administración de contenidos. El equipo tiene seis integrantes. Según la consigna, el chat en tiempo real corresponde a equipos de más de cuatro personas y el agente de IA se exige a partir de siete.

## Issues principales (03/11/2026)

Prioridades indicadas por el usuario, en este orden.

| Issue | Criterio de terminado |
| --- | --- |
| 1. Plaza techada: ubicarla y renderizarla | Posición y tamaño medidos en el lugar (hoy 15 × 10 m y corrimiento de 6,5 m, de capturas); cubierta, columnas y servicios visibles desde la vista general y recorribles a pie sin atascos |
| 2. Escaleras frente a ascensores de los bloques de clases | Decisión del equipo sobre la circulación vertical del Bloque 1 y el Bloque G (el ascensor del Bloque 1 ya funciona en los cuatro niveles; la escalera del Bloque G es una interpretación) e implementación verificada piso por piso |
| 3. Bedelía, LED y los demás edificios secundarios | Medidas o fotos de cada uno registradas en base-geografica.md; volúmenes, fachadas y accesos actualizados en `faculty-blueprint.ts` / `faculty-annexes.ts` |
| 4. Camineros y árboles | Trazado y especies según referencias identificadas; red peatonal conectada (`npm test`) y árboles sin tapar accesos ni circulaciones |
| 5. Interfaz general | Revisión de la interfaz (inicio, menú de pausa, explorador, biblioteca y cuentas) en escritorio y en 390 px de ancho, con resultado registrado en verificacion.md |

## Otras tareas

| Tarea | Criterio de terminado |
| --- | --- |
| **Servidor del frontend:** integrar la biblioteca y los paneles con `campus-backend/`. El chat ya usa presencia; falta su aceptación con PostgreSQL real en la nube. [Arquitectura](arquitectura.md#chat-grupal-y-gestos) | Biblioteca y paneles operativos; chat e interacciones verificados en despliegue real |
| Medidas: tomar en el lugar las que faltan del Bloque 1 y las de los demás edificios ([estado de las medidas](base-geografica.md#estado-de-las-medidas-03112026)) y confirmar las interpretaciones de los [límites de fidelidad](base-geografica.md#límites-de-fidelidad) | Medidas registradas en base-geografica.md e incorporadas a `faculty-blueprint.ts`, con `npm test` actualizado |
| Ascensor: confirmar en el lugar si el armario de maniobra está solo en planta baja, medir la cabina (alto interior) y la puerta, y grabar el cierre de puertas (hoy se reutiliza la apertura) | Medidas y foto registradas en base-geografica.md e incorporadas a `elevator.ts` / `elevator-shaft.ts`, con `npm test` actualizado |
| Cantina: fachada, forma de cubierta e interior; interior de Electrónica e Informática | Referencias recibidas e incorporadas a `faculty-blueprint.ts` / `faculty-reconstruction.ts` |
| Referencias de segundo piso y baños (distribución interior de la torre; ya se conocen su forma y qué lado es de cada baño) | `piso-2` y `banos` pasan de `pending` a `reference` en `places.ts` |
| Escaneos: huecos y alineación con el campus; recorrido por dentro de aulas, cantina y Bedelía | Recorrido sin atascos hasta los recintos del [catálogo de espacios](../frontend/src/data/places.ts); las escaleras de ambos bloques ya se recorrieron |
| En pantallas angostas, el logo («Inicio») abre el panel Explorar encima de la portada y tapa «Comenzar recorrido» (comportamiento anterior a esta rama) | El botón queda visible y utilizable en 390 px de ancho |
| Rendimiento en móviles y sesión con seis usuarios simultáneos | Medición registrada en verificacion.md |
| Avatares, gestos y chat grupal: aceptación en la nube | Verificar dos cuentas, consentimiento, caída en escaleras/rampas, archivo a los cinco minutos, historial y entrega entre dos instancias; implementados el 19/11/2026 |
| Empaquetado de la aplicación actual con Docker y PostgreSQL, configuración de producción y HTTPS | `docker compose up --build` funcionando con `campus-backend/` y datos persistentes tras reiniciar |
| Pruebas visuales de cuentas y biblioteca | Resultado registrado en verificacion.md (el backend ya tiene cobertura automática) |
| Registrar los seis integrantes, sus roles y fechas | Nómina aportada por el equipo, sin asignaciones supuestas |
| Nomenclatura del plano | Revisar el nombre `FACULTY_LABS` según el edificio que representa |
