# Sector CyT: geografía y reconstrucción

Fuente única de la distribución espacial. Reglas de trabajo: [AGENTS.md](../AGENTS.md).

## Alcance del escenario

Decisión del equipo (31/10/2026): solo **CyT, las dos canchas vecinas y los estacionamientos cercanos**. Quedan fuera otras facultades, biblioteca, seminario y la cancha sur (`793370302`).

- `frontend/src/data/campus-geometry.ts` selecciona de `campus-layout.json` las huellas OSM `274489894` (Bloque 1, constante `FACULTY_MAIN`) y `327428698` («segundo bloque»), las canchas `793370300` y `793370301`, los estacionamientos `274489888` y `327428697` y siete calles recortadas.
- `campus-layout.json` completo (60 huellas, 32 trazados viales, 4 estacionamientos, 3 canchas) es referencia, no escenario.
- Recorte de presentación: X −140…115 m, Z −205…95 m (no es un límite de propiedad). El mapa y la cámara general usan ese recorte más 12 m de margen.
- Las huellas OSM no se dibujan como volúmenes: la de Bloque 1 fija el marco de registro (`facultyPose`) y ambas evitan árboles de contexto. La constante `FACULTY_LABS` (`327428698`) tiene un nombre engañoso: no designa laboratorios. Su centroide queda a ~12 m del de Bloque G, y no se ha confirmado que sea el mismo edificio.
- Fuera de `inFacultyZone` (zona reconstruida) se dibujan como contexto los estacionamientos y calles OSM.

## Coordenadas y pisos

Origen WGS84: latitud **−25,3251**, longitud **−57,6387**. `X` este, `Z` sur, `Y` vertical; metros.

| Nivel | Altura Y |
| --- | --- |
| Planta baja | 0 |
| Primer piso (`piso-1`) | 3,5 |
| Segundo piso (`piso-2`) | 7 |
| Tercer piso (`pasillo-p3`, `aula-p3`) | 10,5 |

## Registro sobre la imagen aérea

1. `photoPoint(x, z, altura)` convierte píxeles del **marco de trabajo** al marco local del Bloque 1 (64 × 13 m, aproximado) mediante tres esquinas de su techo en la imagen anotada (560 × 508 px).
2. El marco de trabajo se extendió al este (x hasta ~760) para cantina, plaza abierta y Electrónica, tomados de la captura de 1333 × 827 px (esquinas del Bloque 1 en esa captura: (85,310), (620,352), (606,454)).
3. `facultyToWorld` gira, escala y traslada el marco local a la huella OSM. Edificios, colisiones y puntos de visita usan la misma transformación; las alturas no cambian. Los escaneos siguen siendo escenas independientes.

## Distribución (`faculty-blueprint.ts`)

Una sola geometría para «Sector CyT», «Vista de planta», «Plano de CyT», «Mi facultad» y el modo a pie, construida por `scene/faculty-reconstruction.ts` (galerías, columnas, barandas, vanos, ventanas, escaleras, techos con cerchas, bancos, rasgos de cantina y Manfred; el mural recorta en ejecución la foto `IMG_5727`).

| Elemento | Clave | Ids en `places.ts` | Posición y forma |
| --- | --- | --- | --- |
| Bloque 1 («bloque de aulas») | `main` | `laboratorio`, `piso-1`, `piso-2`, `pasillo-p3`, `aula-p3`, `banos` | Norte; planta baja y 3 pisos |
| Bloque G («Bloque 2» de las carpetas) | `block2` | `bloque-g` | Sur y oblicuo respecto de Bloque 1 (la prueba exige −0,6…−0,2 rad); planta baja y 2 pisos |
| Patio triangular (área común 2) | `courtyard` | `patio` | Entre ambos bloques |
| Área común 1 | `common1` | `jardin` (punto junto a su borde) | Al sur de la plaza |
| Sala Manfred | `manfred` | `sala-manfred` | Norte del extremo oriental de Bloque 1 |
| Bedelía | `bedelia` | `bedelia` | Noreste del mismo extremo |
| Plaza techada | `coveredPlaza` | `plaza` | Cubierta completa; continúa el bloque de aulas |
| Plaza abierta | `openPlaza` | `plaza-abierta` | Este de la techada, sin techo, pavimento compartido |
| Cantina | `cantina` | `cantina-cyt` | Girada: eje largo transversal al del bloque de aulas, fachada hacia la plaza abierta |
| Electrónica e Informática | `electronics` | — | Junto a la cantina; solo volumen de orientación, interior sin relevar |
| Estacionamiento | `parking` | `estacionamiento` | Sur de G, sobre césped; paso peatonal cubierto lateral |
| Accesos | `paths` | `acceso` | 7 caminos en una red conectada desde el acceso |

- Secuencia obligatoria: **bloque de aulas → plaza techada → plaza abierta → cantina girada**. Tiene prioridad sobre el pequeño rótulo «Cantina» de la imagen anotada antigua.
- Vegetación: 4 árboles de referencia en CyT y hasta 4 en el contexto. No rellenar con más.
- Cada id de `places.ts` (16) tiene punto de visita en `facultyVisitPoints`; `cantina-cyt` y `plaza-abierta` tienen además `facultyVisitTargets` (dirección de mirada).

## Fuentes y prioridad

Orden de prioridad: aclaraciones del equipo y capturas recientes › vista aérea anotada › polígonos OSM dentro de CyT.

1. Capturas satelitales del usuario (31/10/2026). La tercera, de 1333 × 827 px, se guarda en `.local/references/cyt-cantina-source.png`. Fuera de Git; no es textura.
2. [Vista aérea marcada](https://drive.google.com/file/d/1nqROQLGTXraAKXHkl4VRuzc5UGMFQnyW/view) (560 × 508 px, 31/10/2026), carpeta «Vista Aerea» del [Drive del TP](https://drive.google.com/drive/folders/1WIVm8i_-avD0KK45kboU60isgf9_5Z2K). Bloques y patios.
3. Fotos del mismo Drive (procedencia en `frontend/public/assets/sources.json`). Orientan: `IMG_5668` Bloque G, `IMG_5720` cantina, `IMG_5685` Manfred, `IMG_5727` pilar pintado.
4. [Google Maps: Campus Santa Librada](https://www.google.com/maps/place/Universidad+Cat%C3%B3lica+de+Asunci%C3%B3n+-+Campus+Santa+Librada/@-25.3262439,-57.6387973,16.83z/): solo comparación.
5. OSM: [área universitaria](https://www.openstreetmap.org/way/130888813), [Bloque 1](https://www.openstreetmap.org/way/274489894), [segundo bloque](https://www.openstreetmap.org/way/327428698); [atribución ODbL](https://www.openstreetmap.org/copyright).

Las imágenes aéreas son evidencia local de comparación: ni texturas ni redistribuidas. Los originales de Drive no se modifican.

## Límites de fidelidad

No hay relevamiento topográfico ni medidas verificadas de longitudes, alturas, inclinaciones o anchos. La imagen aérea es pequeña y con perspectiva, así que el registro solo aproxima proporciones. Número de módulos, interiores sin escaneo, mobiliario y materiales son reconstrucción; no se asignan números de aula. `piso-2` y `banos` siguen `pending` en `places.ts`. Bedelía permanece por indicación del equipo. De la cantina faltan fachada, dimensiones, forma de cubierta e interiores. No se afirma fidelidad fotográfica.

## Actualizar el contexto cartográfico

Guardar fuera del repositorio una exportación XML de OSM con el área universitaria y edificios completos y, desde la raíz:

```shell
python scripts/import-campus-map.py ruta/al/campus.osm
```

Usa solo la biblioteca estándar de Python, descarta metadatos personales de colaboradores y **sobrescribe `frontend/src/data/campus-layout.json`**; no toca `faculty-blueprint.ts`. Después ejecutar `npm test` en `frontend/`: comprueba que siguen existiendo los ids seleccionados (2 huellas, 2 estacionamientos, 2 canchas). Antes de cambiar el plano, contrastar la vista aérea y las fotos; preservar ids y conectividad peatonal.
