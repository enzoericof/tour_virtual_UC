# Sector CyT: geografía y reconstrucción

Fuente única de la distribución espacial y de las medidas. Reglas de trabajo: [AGENTS.md](../AGENTS.md).

## Alcance del escenario

Decisión del equipo (31/10/2026): solo **CyT, las dos canchas vecinas y los estacionamientos cercanos**. Quedan fuera otras facultades, biblioteca, seminario y la cancha sur (`793370302`).

- `frontend/src/data/campus-geometry.ts` selecciona de `campus-layout.json` las huellas OSM `274489894` (Bloque 1, constante `FACULTY_MAIN`) y `327428698` («segundo bloque»), las canchas `793370300` y `793370301`, los estacionamientos `274489888` y `327428697` y siete calles recortadas.
- `campus-layout.json` completo (60 huellas, 32 trazados viales, 4 estacionamientos, 3 canchas) es referencia, no escenario.
- Recorte de presentación: X −140…115 m, Z −205…95 m (no es un límite de propiedad). El mapa y la cámara general usan ese recorte más 12 m de margen.
- Las huellas OSM no se dibujan como volúmenes: la de Bloque 1 fija la posición y la orientación del plano (`facultyPose`) y ambas evitan árboles de contexto. La constante `FACULTY_LABS` (`327428698`) tiene un nombre engañoso: no designa laboratorios. Su orientación (29,15° respecto de la de Bloque 1) da el giro del Bloque G; su centroide queda a unos 8 m del Bloque G ubicado con las medidas del equipo y no se usa.
- Fuera de `inFacultyZone` (zona reconstruida) se dibujan como contexto los estacionamientos y calles OSM.

## Coordenadas y pisos

Origen WGS84: latitud **−25,3251**, longitud **−57,6387**. `X` este, `Z` sur, `Y` vertical; metros.

| Nivel | Altura Y |
| --- | --- |
| Planta baja | 0 |
| Primer piso (`piso-1`) | 3,5 |
| Segundo piso (`piso-2`) | 7 |
| Tercer piso (`pasillo-p3`, `aula-p3`) | 10,5 |

## Plano métrico de CyT

`frontend/src/data/faculty-blueprint.ts` describe CyT en metros, en un marco propio: origen en el centro del Bloque 1, `x` a lo largo del bloque (hacia la plaza techada), `z` hacia el área común 2 (sur). `facultyToWorld` **solo gira y traslada** ese marco sobre el centro y la orientación de la huella OSM del Bloque 1: no escala, de modo que las medidas del plano son las del escenario. Edificios, colisiones, mapa y puntos de visita usan la misma transformación. Los escaneos siguen siendo escenas independientes.

Hasta el 31/10/2026 el plano se registraba sobre la imagen aérea anotada con `photoPoint` y una escala distinta por eje (×1,17 a lo largo y ×1,03 a lo ancho), lo que deformaba las proporciones; ese registro se eliminó.

### Medidas del equipo (31/10/2026)

| Elemento | Medida | Cómo se aplica |
| --- | --- | --- |
| Bloque 1 (techo gris) | 75 × 12 m; planta baja y tres pisos | Galería de 2,5 m al sur; módulos de 5 m |
| Bloque G (techo azul, «Bloque 2») | 65 × 12 m | Planta baja y dos pisos; galería hacia el Bloque 1 |
| Separación entre bloques | 11 m en el punto más cercano y 47 m en el más lejano | 11 m: esquina NE de G a la cara sur del Bloque 1. 47 m: esquina SO del Bloque 1 a la esquina NO de G. Con el giro de 29,15° ambas se cumplen (la esquina NE de G queda también a 11,1 m de la esquina SE del Bloque 1) |
| Plaza techada | 15 × 10 m | Pegada a toda la cabecera este del Bloque 1 (sus lados oeste pasan por las dos esquinas este), alineada con Bedelía y la cantina, no con el bloque |
| Cuadrado descubierto | — | Entre la plaza techada (oeste), Bedelía (norte) y la cantina (este); 17 × 15 m adoptados |
| Escalera del Bloque 1 | Arranca a 20 m de la esquina SE | Tipo Pompidou, por fuera de la galería: un tramo por piso hacia la torre, cada uno con descanso unido a la galería y bóveda de chapa; llega al tercer piso. Sentido confirmado por el equipo |
| Ascensor del Bloque 1 | 2 × 2 m, a 4 m de la misma esquina | Entre la esquina y la escalera, del lado de la galería; recorre todos los niveles. Es un volumen: no se puede usar |
| Torre de baños | Dos semicírculos, 10 m de punta a punta | Cilindro de 10 m en el extremo oeste, partido en mitades norte y sur por una junta blanca (forma confirmada por el equipo); acceso desde la galería en cada nivel |
| Media sombra | Sobre las barandas azules | Lamas en las galerías del Bloque 1, de 2,1 a 3,1 m sobre cada piso |

### Medidas tomadas del escaneo del pasillo del tercer piso

El escaneo (`pasillo-p3`) cubre unos 72 m de la galería. Alineado con su eje principal da: pilastras cada 5,1 m, franjas del piso cada 1,286 m (cuatro por módulo, 5,14 m), hiladas de ladrillo de 6,6 cm con ladrillos de unos 27 cm, cara inferior de la cubierta entre 4,6 y 5,4 m sobre el piso y lamas entre 2,0 y 3,1 m. Los módulos de 5 m del plano redondean los 5,14 m para que entren 15 en los 75 m.

### Distribución (`faculty-blueprint.ts`)

Una sola geometría para «Sector CyT», «Vista de planta», «Plano de CyT», «Mi facultad» y el modo a pie, construida por `scene/faculty-reconstruction.ts` con las texturas del escaneo ([referencias](referencias.md)).

| Elemento | Clave | Ids en `places.ts` | Posición y forma |
| --- | --- | --- | --- |
| Bloque 1 («bloque de aulas») | `main` | `laboratorio`, `piso-1`, `piso-2`, `pasillo-p3`, `aula-p3` | 75 × 12 m, planta baja y 3 pisos |
| Torre de baños | `tower` | `banos` | Extremo oeste del Bloque 1, sobre la galería |
| Escalera y ascensor | `stair`, `elevator` | — | Fachada sur del Bloque 1 (medidas arriba) |
| Bloque G («Bloque 2» de las carpetas) | `block2` | `bloque-g` | 65 × 12 m, sur del Bloque 1 y girado −29,15°; escalera de ida y vuelta sobre su galería |
| Patio (área común 2) | `courtyard` | `patio` | Entre ambos bloques |
| Área común 1 | `common1` | `jardin` | Al sur de la plaza techada |
| Sala Manfred | `manfred` | `sala-manfred` | 8 × 6 m, norte del extremo oriental del Bloque 1 |
| Bedelía | `bedelia` | `bedelia` | 20 × 10 m, fachada vidriada hacia el cuadrado |
| Plaza techada | `coveredPlaza` | `plaza`, `acceso` | 15 × 10 m (medidas arriba) |
| Plaza abierta | `openPlaza` | `plaza-abierta` | El cuadrado descubierto, con pavimento propio |
| Cantina | `cantina` | `cantina-cyt` | 18 × 12 m, eje largo transversal al Bloque 1, fachada y terraza hacia el cuadrado |
| Electrónica e Informática | `electronics` | — | 26 × 10 m, junto a la cantina; solo volumen de orientación |
| Estacionamiento | `parking` | `estacionamiento` | Césped entre G y el estacionamiento OSM `274489888`; paso cubierto desde el área común 1 |
| Accesos | `paths` | — | 7 caminos en una red conectada desde la plaza techada |

- Secuencia obligatoria: **bloque de aulas → plaza techada → plaza abierta → cantina girada**.
- Vegetación: 4 árboles de referencia en CyT y hasta 4 en el contexto. No rellenar con más.
- Cada id de `places.ts` (16) tiene punto de visita en `facultyVisitPoints`; la mayoría tiene además `facultyVisitTargets` (hacia dónde mira el visitante al llegar).

## Fuentes y prioridad

Orden de prioridad: medidas y aclaraciones del equipo › escaneos › capturas y vista aérea anotada › polígonos OSM.

1. Medidas, capturas y fotos aportadas el 31/10/2026: vistas aéreas con los nombres de las áreas y con las dimensiones, y la foto `IMG_5659` (iPhone, 30/10/2026) desde el área común 2 hacia el Bloque 1, con la torre, la escalera y la media sombra. El HEIC original queda fuera de Git.
2. Escaneo del pasillo del tercer piso (`Pasillo - Piso 3.glb`, Scaniverse, hash en `frontend/public/assets/sources.json`): medidas de la galería y texturas.
3. Capturas satelitales anteriores (31/10/2026), fuera de Git en `.local/references/`, y la [vista aérea marcada](https://drive.google.com/file/d/1nqROQLGTXraAKXHkl4VRuzc5UGMFQnyW/view) del [Drive del TP](https://drive.google.com/drive/folders/1WIVm8i_-avD0KK45kboU60isgf9_5Z2K): posición de Manfred, Electrónica, áreas comunes, caminos y estacionamiento.
4. Fotos del mismo Drive (procedencia en `frontend/public/assets/sources.json`). Orientan: `IMG_5668` Bloque G, `IMG_5646` torre de baños, `IMG_5720` cantina, `IMG_5685` Manfred, `IMG_5693` plaza techada, `IMG_5727` pilar pintado.
5. [Google Maps: Campus Santa Librada](https://www.google.com/maps/place/Universidad+Cat%C3%B3lica+de+Asunci%C3%B3n+-+Campus+Santa+Librada/@-25.3262439,-57.6387973,16.83z/): solo comparación.
6. OSM: [área universitaria](https://www.openstreetmap.org/way/130888813), [Bloque 1](https://www.openstreetmap.org/way/274489894), [segundo bloque](https://www.openstreetmap.org/way/327428698); [atribución ODbL](https://www.openstreetmap.org/copyright).

Las imágenes aéreas son evidencia local de comparación: ni texturas ni redistribuidas. Los originales de Drive no se modifican.

## Límites de fidelidad

Las medidas de la tabla del equipo son las únicas medidas de edificios; se tomaron sobre capturas y no son un relevamiento topográfico. Interpretación propia, a confirmar: los puntos entre los que se midieron los 11 y 47 m, el ancho de la galería (2,5 m), la altura de piso (3,5 m) y del último nivel (4,1 m bajo la cubierta), el ancho de la escalera (1,8 m), la ubicación de la escalera del Bloque G y la distribución interior de la torre. Sin medida del equipo: Bedelía, cantina, Sala Manfred, Electrónica, cuadrado descubierto, áreas comunes, caminos y estacionamiento; sus tamaños y posiciones salen de las capturas y son aproximados. Número de módulos, interiores sin escaneo, mobiliario y materiales son reconstrucción; no se asignan números de aula. `piso-2` y `banos` siguen `pending` en `places.ts`. De la cantina faltan fachada, forma de cubierta e interiores. No se afirma fidelidad fotográfica.

## Actualizar el contexto cartográfico

Guardar fuera del repositorio una exportación XML de OSM con el área universitaria y edificios completos y, desde la raíz:

```shell
python scripts/import-campus-map.py ruta/al/campus.osm
```

Usa solo la biblioteca estándar de Python, descarta metadatos personales de colaboradores y **sobrescribe `frontend/src/data/campus-layout.json`**; no toca `faculty-blueprint.ts`. Después ejecutar `npm test` en `frontend/`: comprueba que siguen existiendo los ids seleccionados (2 huellas, 2 estacionamientos, 2 canchas) y que el plano conserva las medidas del equipo. Antes de cambiar el plano, contrastar medidas, fotos y escaneos; preservar ids y conectividad peatonal.
