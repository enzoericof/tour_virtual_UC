# Pendientes

Responsables y fechas: **sin asignar** (no se registran por suposición). Estado de las pruebas: [verificacion.md](verificacion.md).

| Tarea | Criterio de terminado |
| --- | --- |
| Confirmar las interpretaciones de las medidas del equipo: puntos de los 11 y 47 m, ancho de galería, alturas de piso y de cubierta; y de las aclaraciones del 01/11: reparto de los 10 m de la torre, acceso del núcleo y anexo, altura de los murales, escalinatas de la plataforma, flecha y pasillo en cuña de la Sala Manfred, corrimiento de la plaza (6,5 m) y del grupo que la acompaña, retiro de planta baja y primer piso, ancho, arranque y pendiente de la rampa, bodega, diámetro de las columnas y tramo de la escalera Pompidou ([base-geografica.md](base-geografica.md#límites-de-fidelidad)) | Confirmación del equipo registrada en base-geografica.md |
| Aulas: hoy son seis por piso con anchos y puertas de una variación fija, no relevados | Planos o fotos de cada piso incorporados a `rooms` en `faculty-blueprint.ts` |
| Murales del ascensor: hoy las tres caras repiten el mural de `IMG_5727` | Fotos de las caras sur y oeste incorporadas como texturas propias, con su procedencia en `sources.json` |
| Medidas de Bedelía, cantina, Sala Manfred, Electrónica, cuadrado descubierto, áreas comunes y estacionamiento | Medidas o fotos registradas en base-geografica.md e incorporadas a `faculty-blueprint.ts` |
| Cantina: fachada, forma de cubierta e interior; interior de Electrónica e Informática | Referencias recibidas e incorporadas a `faculty-blueprint.ts` / `faculty-reconstruction.ts` |
| Referencias de segundo piso y baños (distribución interior de la torre; ya se conocen su forma y qué lado es de cada baño) | `piso-2` y `banos` pasan de `pending` a `reference` en `places.ts` |
| Escaneos: huecos y alineación con el campus; recorrido por dentro de aulas, cantina y Bedelía | Recorrido sin atascos hasta todos los recintos de [AGENTS.md](../AGENTS.md); las escaleras de ambos bloques ya se recorrieron |
| Ascensor del Bloque 1: hoy es solo un volumen | Decisión del equipo sobre si debe permitir cambiar de piso |
| En pantallas angostas, el logo («Inicio») abre el panel Explorar encima de la portada y tapa «Comenzar recorrido» (comportamiento anterior a esta rama) | El botón queda visible y utilizable en 390 px de ancho |
| Rendimiento en móviles y sesión con seis usuarios simultáneos | Medición registrada en verificacion.md |
| Avatares compartidos | Decisión del equipo sobre si el alcance lo requiere; hoy no es requisito asumido |
| Docker + PostgreSQL, configuración de producción y HTTPS | `docker compose up --build` funcionando con datos persistentes tras reiniciar |
| Pruebas visuales de cuentas y biblioteca | Resultado registrado en verificacion.md (el backend ya tiene cobertura automática) |
| Registrar los seis integrantes, sus roles y fechas | Nómina aportada por el equipo, sin asignaciones supuestas |
| Higiene del repositorio | Decidir entre corregir el `.gitignore` o documentar `git add -f` como práctica; decidir qué hacer con los originales versionados en la raíz desde el commit `0017185` (`IMG_5659.HEIC`, `Pasillo - Piso 3.glb`, unos 25 MB), que AGENTS.md prohíbe subir: quitarlos deja el peso en el historial; revisar el nombre `FACULTY_LABS`. `IMG_5694.HEIC` (01/11) está en la raíz sin seguimiento: no agregarlo |
