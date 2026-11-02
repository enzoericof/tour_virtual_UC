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
| Plataforma de la plaza techada, el cuadrado, Bedelía, la cantina y la Sala Manfred (`PLAZA_LEVEL`) | 1,4 |
| Primer piso (`piso-1`) | 3,5 |
| Segundo piso (`piso-2`) | 7 |
| Tercer piso (`pasillo-p3`, `aula-p3`) | 10,5 |

## Plano métrico de CyT

`frontend/src/data/faculty-blueprint.ts` describe CyT en metros, en un marco propio: origen en el centro del Bloque 1, `x` a lo largo del bloque (hacia la plaza techada), `z` hacia el área común 2 (sur). `facultyToWorld` **solo gira y traslada** ese marco sobre el centro y la orientación de la huella OSM del Bloque 1: no escala, de modo que las medidas del plano son las del escenario. Edificios, colisiones, mapa y puntos de visita usan la misma transformación. Los escaneos siguen siendo escenas independientes.

Hasta el 31/10/2026 el plano se registraba sobre la imagen aérea anotada con `photoPoint` y una escala distinta por eje (×1,17 a lo largo y ×1,03 a lo ancho), lo que deformaba las proporciones; ese registro se eliminó.

### Medidas y aclaraciones del equipo (31/10/2026; las marcadas «01/11» son del 01/11/2026)

| Elemento | Medida | Cómo se aplica |
| --- | --- | --- |
| Bloque 1 (techo gris) | 75 × 12 m; planta baja y tres pisos. Columnas más gruesas, una cada 2,5 m aproximadamente, que llegan hasta arriba; seis aulas por piso, de tamaños irregulares y con las puertas desalineadas (01/11) | Galería de 2,5 m al sur; módulos de 5 m para las pilastras. Columnas de 0,5 m de diámetro en el borde de la galería, enteras hasta la cubierta. Anchos de aula y puertas con una variación fija, sin relevar: una puerta por aula, lejos de las pilastras y a más de 0,6 m de las del piso de abajo |
| Bloque G (techo azul, «Bloque 2») | 65 × 12 m; seis aulas por piso, como el Bloque 1 (01/11) | Planta baja y dos pisos; galería hacia el Bloque 1 |
| Separación entre bloques | 11 m en el punto más cercano y 47 m en el más lejano | 11 m: esquina NE de G a la cara sur del Bloque 1. 47 m: esquina SO del Bloque 1 a la esquina NO de G. Con el giro de 29,15° ambas se cumplen (la esquina NE de G queda también a 11,1 m de la esquina SE del Bloque 1) |
| Plaza techada | 15 × 10 m; más alejada del Bloque 1 (01/11) | Alineada con Bedelía y la cantina, no con el bloque. Corrida 6,5 m al este junto con Bedelía, el cuadrado, la cantina y Electrónica: su esquina oeste queda 1,4 m fuera de la cabecera este y entre ambas entran la escalera, la rampa y los escalones de la galería |
| Plataforma (01/11) | Plaza techada, Bedelía y cantina elevadas entre la planta baja y el primer piso, un 20 % por debajo de la media altura | 1,4 m (ocho escalones de 17,5 cm). El equipo eligió sumar el cuadrado, la Sala Manfred y su pasillo. Se baja por la prolongación de la galería de planta baja junto al ascensor (`IMG_5706`), por escalinatas al sur del cuadrado y al norte del pasillo de Manfred, y por la rampa |
| Cabecera este del Bloque 1 (01/11) | Planta baja y primer piso más retraídos que el resto de los pisos | Las aulas de planta baja terminan a 5,75 m de la cara este y las del primer piso a 3,75 m; los pisos 2 y 3 y la cubierta siguen hasta los 75 m. Seis columnas sostienen el voladizo |
| Escalera del primer piso a la plaza (01/11) | Por el borde noreste; la cubre el techo del Bloque 1. Es el doble de ancha y debajo hay una bodega chica (`IMG_5694`) | 2,8 m. Dentro de la cabecera este, bajo los pisos 2 y 3: sube hacia el sur desde la plataforma hasta la galería del primer piso, frente a la puerta del ascensor, que queda algo al oeste de su eje como en la foto. Bodega cerrada con ladrillo bajo los peldaños, con puerta hacia la galería de planta baja |
| Rampa (01/11) | De la plaza a la planta baja del Bloque 1, cruzada respecto de la escalera y enfrentada a Manfred; donde estaba la pared de la cabecera hay solo columnas (`IMG_5694`) | Entre las aulas de planta baja y la escalera, de 1,6 m: baja hacia el sur, en sentido contrario a la escalera, desde la explanada frente a Manfred (2 m al norte del bloque) hasta la galería de planta baja junto al ascensor. 11,5 m de largo, 12 % de pendiente y 2,1 m libres bajo el primer piso; pasamanos sobre la pared de las aulas |
| Escalera de la galería de planta baja a la plaza (01/11) | Como prolongar la escalera existente hasta la galería | Ocho escalones del ancho de la galería (2,5 m) que continúan su extremo este hasta la plataforma, junto al ascensor |
| Cuadrado descubierto | — | Entre la plaza techada (oeste), Bedelía (norte) y la cantina (este); 22 × 15 m adoptados (retiro visual de 5 m de la cantina pedido por Horacio el 02/11/2026, pendiente de medición) |
| Escalera del Bloque 1 | Arranca a 20 m de la esquina SE; la bóveda sigue a la escalera y se aplana en los descansos (01/11). Más grande y un poco más al este (01/11) | Tipo Pompidou, por fuera de la galería, de 2,4 m y arrancando a 18 m de la esquina SE (ancho y corrimiento elegidos por el equipo): un tramo por piso hacia la torre, cada uno con descanso unido a la galería; llega al tercer piso. Sentido confirmado por el equipo. Tramo de 6,5 m y descanso de 3,5 m: suman 10 m, cuatro intervalos de columna, y cada descanso llega a la galería entre dos columnas. Una sola bóveda de chapa, a 2,3 m de la pisada, sube con cada tramo y se aplana en cada descanso |
| Ascensor del Bloque 1 | 2 × 2 m, a 4 m de la misma esquina; su recubrimiento son tres murales distintos que llegan a la mitad superior entre el primer y el segundo piso (01/11). Va 1,5 m más al este y es algo más grande (01/11) | 2,5 × 2,5 m con el centro a 3,5 m de la esquina, entre la esquina y la escalera, del lado de la galería; recorre todos los niveles. Caja de hormigón con murales en las caras este, sur y oeste hasta 6,5 m; por ahora los tres repiten el único fotografiado (`IMG_5727`). Puertas con marco azul hacia la galería (`IMG_5706`); en el primer piso dan a la llegada de la escalera de la plaza (`IMG_5694`). Es un volumen: no se puede usar |
| Sala Manfred (01/11; revisado 01/11) | Aula tipo auditorio con la que forma un pasillo con Bedelía; planta cuasi-rectangular con un lado curvo. La entrada y la marquesina miran hacia la plaza techada (foto `zona_techada_y_manfred.HEIC`). Corrección: el lado este queda a **3,4 m** de la esquina NO de Bedelía (era 2 m; ajustado con mediciones del inspector de réplica, 01/11/2026) | 12 × 9 m, alineada con el Bloque 1: escenario y pizarrón contra el fondo norte, frente en arco de 1,5 m de flecha hacia la rampa. `manfredEast = bedeliaCorner[0] − 3,4`. El pasillo entre Manfred y Bedelía mide ahora 3,4 m. Marquesina (~3 m de vuelo, a PLAZA_LEVEL + 4,0 m, cuatro columnas blancas) sobre el frente curvo, orientada hacia la plaza techada. Cinco gradas, con un pasillo lateral junto a la fachada vidriada este (`IMG_5685`), donde está la puerta. Fuente: foto in situ + coordenadas de inspector de réplica (46,58; 2,88; −5,52) entrada / (44,64; 1,63; −11,13) puerta al edificio / (42,45; 1,40; −12,92) pasillo |
| Torre de baños | Dos semicírculos, 10 m de punta a punta. Salen de un rectángulo central; en planta baja, un cuadrado sobresale 2 m al sur; vistos desde el edificio, a la derecha hombres y a la izquierda mujeres en todos los pisos (01/11) | Extremo oeste. Núcleo de 2 m que sale de la galería hacia el sur y semicírculos de 4 m de radio al este y al oeste (10 m de punta a punta; disposición y reparto elegidos por el equipo). Entrando desde la galería, hombres al oeste y mujeres al este. Anexo de 8 × 8 m con portón (`IMG_5646`) |
| Media sombra | Sobre las barandas azules | Lamas en las galerías del Bloque 1, de 2,1 a 3,1 m sobre cada piso |

### Medidas tomadas del escaneo del pasillo del tercer piso

El escaneo (`pasillo-p3`) cubre unos 72 m de la galería. Alineado con su eje principal da: pilastras cada 5,1 m, franjas del piso cada 1,286 m (cuatro por módulo, 5,14 m), hiladas de ladrillo de 6,6 cm con ladrillos de unos 27 cm, cara inferior de la cubierta entre 4,6 y 5,4 m sobre el piso y lamas entre 2,0 y 3,1 m. Los módulos de 5 m del plano redondean los 5,14 m para que entren 15 en los 75 m.

### Distribución (`faculty-blueprint.ts`)

Una sola geometría para «Sector CyT», «Vista de planta», «Plano de CyT», «Mi facultad» y el modo a pie, construida por `scene/faculty-reconstruction.ts` con las texturas del escaneo ([referencias](referencias.md)).

| Elemento | Clave | Ids en `places.ts` | Posición y forma |
| --- | --- | --- | --- |
| Bloque 1 («bloque de aulas») | `main` | `laboratorio`, `piso-1`, `piso-2`, `pasillo-p3`, `aula-p3` | 75 × 12 m, planta baja y 3 pisos |
| Torre de baños | `tower` | `banos` | Extremo oeste del Bloque 1, al sur de la galería (medidas arriba) |
| Escaleras, ascensor y cabecera este | `stair`, `elevator`, `eastStair`, `eastEnd` | — | Fachada sur y cabecera este del Bloque 1: retiro de planta baja y primer piso, rampa y columnas (medidas arriba) |
| Aulas | `rooms` | — | Seis por piso en cada bloque (medidas arriba) |
| Bloque G («Bloque 2» de las carpetas) | `block2` | `bloque-g` | 65 × 12 m, sur del Bloque 1 y girado −29,15°; escalera de ida y vuelta sobre su galería |
| Patio (área común 2) | `courtyard` | `patio` | Entre ambos bloques |
| Área común 1 | `common1` | `jardin` | Al sur de la plaza techada |
| Sala Manfred | `manfred`, `corridor` | `sala-manfred` | 12 × 9 m alineada con el Bloque 1, frente curvo hacia la rampa, a 3,4 m de Bedelía; marquesina sobre el frente (medidas arriba) |
| Bedelía | `bedelia` | `bedelia` | 20 × 10 m, fachada vidriada hacia el cuadrado |
| Plaza techada | `coveredPlaza` | `plaza`, `acceso` | 15 × 10 m, separada de la cabecera este (medidas arriba); `acceso` queda en el rellano entre ambas |
| Plataforma | `platform`, `platformSteps` | — | Plaza techada, cuadrado, Bedelía, cantina, Manfred, la explanada y el rellano de la cabecera este a 1,4 m; tres escalinatas y la rampa |
| Plaza abierta | `openPlaza` | `plaza-abierta` | El cuadrado descubierto, con pavimento propio |
| Cantina | `cantina` | `cantina-cyt` | 18 × 12 m, eje largo transversal al Bloque 1, fachada y terraza hacia el cuadrado |
| Electrónica e Informática | `electronics` | — | 26 × 10 m, junto a la cantina; solo volumen de orientación |
| Estacionamiento | `parking` | `estacionamiento` | Césped entre G y el estacionamiento OSM `274489888`; paso cubierto desde el área común 1 |
| Accesos | `paths` | — | 7 caminos en una red conectada desde la plaza techada |

- Secuencia obligatoria: **bloque de aulas → plaza techada → plaza abierta → cantina girada**.
- Vegetación: 2 árboles principales identificados en el patio central según fotos in situ (`arbol_ia/árbol_1.HEIC` y `arbol_ia/árbol_2.HEIC`, ubicaciones 1 y 2 en `cómo_debe_ser.png`):
  - **Árbol 1** (`tree1` en `[21.5, 15]`): mango frondoso del patio este, ~9 m de altura, copa densa en cúpula, tronco con raíces tablares y bancos de descanso debajo.
  - **Árbol 2** (`tree2` en `[-20, 22]`): árbol autóctono alto del patio oeste, ~15,5 m de altura (supera la cubierta del Bloque 1), fuste alto despejado (~5,2 m), grandes ramas maestras y canteros de ladrillo en su base.
  - Árboles de referencia adicionales en CyT (4 puntos) y hasta 4 en el contexto. No rellenar con bosques inventados.
- Cada id de `places.ts` (16) tiene punto de visita en `facultyVisitPoints`; la mayoría tiene además `facultyVisitTargets` (hacia dónde mira el visitante al llegar).

## Fuentes y prioridad

Orden de prioridad: medidas y aclaraciones del equipo › escaneos › capturas y vista aérea anotada › polígonos OSM.

1. Medidas, capturas y fotos aportadas el 31/10/2026: vistas aéreas con los nombres de las áreas y con las dimensiones, y la foto `IMG_5659` (iPhone, 30/10/2026) del arranque de la escalera del Bloque 1 desde la galería de planta baja. El HEIC original está versionado en la raíz del repositorio (ver [pendientes](pendientes.md)). Aclaraciones del 01/11/2026 sobre ascensor, plataforma, escalera a la plaza, Sala Manfred, bóveda y torre, con las ubicaciones elegidas entre opciones por el equipo. Otra tanda el mismo día, con la foto `IMG_5694` (iPhone, 30/10/2026, desde el pie de la escalera de la plaza al primer piso) y una captura desde el cruce de los toldos: plataforma más baja, plaza más alejada, cabecera este retraída con escalera, rampa y bodega, ascensor, Manfred, columnas, aulas y escalera Pompidou. El HEIC de `IMG_5694` está sin seguimiento en la raíz del repositorio; es un original y no se sube.
2. Escaneo del pasillo del tercer piso (`Pasillo - Piso 3.glb`, Scaniverse, hash en `frontend/public/assets/sources.json`): medidas de la galería y texturas.
3. Capturas satelitales anteriores (31/10/2026), fuera de Git en `.local/references/`, y la [vista aérea marcada](https://drive.google.com/file/d/1nqROQLGTXraAKXHkl4VRuzc5UGMFQnyW/view) del [Drive del TP](https://drive.google.com/drive/folders/1WIVm8i_-avD0KK45kboU60isgf9_5Z2K): posición de Manfred, Electrónica, áreas comunes, caminos y estacionamiento.
4. Fotos del mismo Drive (procedencia en `frontend/public/assets/sources.json`). Orientan: `IMG_5668` Bloque G, `IMG_5646` torre de baños, `IMG_5720` cantina, `IMG_5685` e `IMG_5686` pasillo de Manfred, `IMG_5693` plaza techada, `IMG_5706` ascensor y escalones desde la plaza techada, `IMG_5727` mural del ascensor.
5. [Google Maps: Campus Santa Librada](https://www.google.com/maps/place/Universidad+Cat%C3%B3lica+de+Asunci%C3%B3n+-+Campus+Santa+Librada/@-25.3262439,-57.6387973,16.83z/): solo comparación.
6. OSM: [área universitaria](https://www.openstreetmap.org/way/130888813), [Bloque 1](https://www.openstreetmap.org/way/274489894), [segundo bloque](https://www.openstreetmap.org/way/327428698); [atribución ODbL](https://www.openstreetmap.org/copyright).

Las imágenes aéreas son evidencia local de comparación: ni texturas ni redistribuidas. Los originales de Drive no se modifican.

## Límites de fidelidad

Las medidas de la tabla del equipo son las únicas medidas de edificios; se tomaron sobre capturas y no son un relevamiento topográfico. Interpretación propia, a confirmar: los puntos entre los que se midieron los 11 y 47 m, el ancho de la galería (2,5 m), la altura de piso (3,5 m) y del último nivel (4,1 m bajo la cubierta), el tramo y el descanso de la escalera Pompidou, el diámetro de las columnas (0,5 m), el reparto de las aulas y la posición de sus puertas, la ubicación de la escalera del Bloque G, el reparto de los 10 m de la torre (núcleo de 2 m y radios de 4 m), el acceso de 2 m del núcleo, el anexo de 8 × 8 m y la distribución interior de la torre, la altura de los murales (6,5 m), la ubicación de las escalinatas de la plataforma, la flecha del frente de Manfred, su interior y el pasillo en cuña con Bedelía, el corrimiento de la plaza (6,5 m) junto con Bedelía, el cuadrado, la cantina y Electrónica, el retiro de planta baja (5,75 m) y del primer piso (3,75 m), el ancho (1,6 m), el arranque y la pendiente de la rampa, y el tamaño de la bodega. Sin medida del equipo: Bedelía, cantina, Sala Manfred, Electrónica, cuadrado descubierto, áreas comunes, caminos y estacionamiento; sus tamaños y posiciones salen de las capturas y son aproximados. Número de módulos, interiores sin escaneo, mobiliario y materiales son reconstrucción; no se asignan números de aula. `piso-2` y `banos` siguen `pending` en `places.ts`. La fachada de la cantina se ajustó el 02/11/2026 con IMG_5714, IMG_5719, IMG_5720 e IMG_5721: fascia terracota modulada, marquesina con tensores, vidriera, bancos metálicos, jardineras y lamas laterales. Cubierta e interiores siguen siendo aproximaciones. Electrónica acompaña el retiro de la cantina para conservar su relación lateral. No se afirma fidelidad fotográfica.

## Actualizar el contexto cartográfico

Guardar fuera del repositorio una exportación XML de OSM con el área universitaria y edificios completos y, desde la raíz:

```shell
python scripts/import-campus-map.py ruta/al/campus.osm
```

Usa solo la biblioteca estándar de Python, descarta metadatos personales de colaboradores y **sobrescribe `frontend/src/data/campus-layout.json`**; no toca `faculty-blueprint.ts`. Después ejecutar `npm test` en `frontend/`: comprueba que siguen existiendo los ids seleccionados (2 huellas, 2 estacionamientos, 2 canchas) y que el plano conserva las medidas del equipo. Antes de cambiar el plano, contrastar medidas, fotos y escaneos; preservar ids y conectividad peatonal.


### Interior inicial de cantina — 02/11/2026

Distribución provisional solicitada por Horacio, sin fotos interiores ni medidas de mobiliario. Dos hileras de tres mesas con cuatro sillas cada una, pasillo central desde el acceso, mostrador posterior con vitrina y caja, estantes, heladera y devolución. Cielorraso claro con seis luminarias de material emisivo (no añaden luces dinámicas). Mesas, sillas y mostrador tienen cuerpos simplificados de colisión. Esta propuesta sirve para revisar circulación; no representa un relevamiento de la cantina real.


### Terraza y jardín de cantina — 02/11/2026

Ajuste según IMG_5720 y comparación aportada por Horacio: relleno sólido de la terraza y peldaños hasta el terreno para cerrar el voladizo accidental; césped lateral y delantero derecho al nivel de la plaza, enlazado al terreno mediante pendientes suaves, sin caras verticales. Cuatro hojas de blindex, la segunda corrida 2,4 m detrás de la primera para mantener el acceso. Árbol delante del paño izquierdo de ladrillo, con alcorque, piedras y arbustos. Posiciones y tamaños estimados de la fotografía; no se cambian los bloques ni sus medidas. El árbol corresponde a una nueva referencia específica de la cantina, además de los árboles del patio.

Corrección posterior de Horacio: eliminado el paredón de césped; terreno continuo con caída suavizada en 10 m. Entre jardín inmediato y terraza quedan solo tres escalones grises de 15 cm (45 cm en total). La plataforma general de CyT conserva su referencia; la pendiente absorbe la transición exterior.


Ajuste posterior: eliminado el árbol de referencia en (53 + plazaShift, -5.5) que tapaba la vista desde la plaza. El árbol con alcorque se desplazó 1,2 m a la derecha y 1,3 m hacia el visitante (marco de cantina). Se redujo 45 cm la cota máxima del césped hacia el borde sur del cuadrado y se agregaron tres peldaños grises de 15 cm a lo largo de ese borde, con rampa invisible de colisión. La pendiente exterior permanece suave.


### Contorno de explanada — 02/11/2026

La foto de Horacio sustituye el borde rectangular: explanada de seis vértices con borde frontal quebrado (tramo izquierdo, diagonal y tramo derecho), definida en cantinaForecourt. Los tres escalones siguen ese contorno y la plaza abierta se recorta para no rellenar el jardín por debajo. Árbol y arbustos sobre el sector izquierdo de la explanada, incluidos en ese mismo plano. Piso interior y explanada se unifican a PLAZA_LEVEL; jardín inmediato 45 cm por debajo, con pendiente suave hacia el terreno exterior. Se retiran las escalinatas rectas superpuestas. Dimensiones aproximadas interpretadas de la foto, pendientes de medición.

Corrección de la unión con la plaza: se restaura el cuadrado pavimentado continuo de 22 × 15 m entre la plaza techada y cantina. La explanada avanza 2 m más hacia la plaza; su recorte y escalinata quedan hacia el jardín lateral. Esta corrección reemplaza el recorte anterior que interrumpía el paso con césped.


### Unión del césped y árbol en el círculo — 02/11/2026

La malla del jardín ahora abarca la transición completa de 10 m por fuera de todas sus zonas elevadas, con bordes a la cota del terreno; antes se cortaba dentro de la pendiente. Alturas y límites en cantina-terrain.ts. Mesas del jardín ajustadas a esa superficie. Árbol y cantero trasladados al antiguo marcador beige de cantina: coordenadas locales (0, 21). Marcador retirado y llegada desplazada 2,5 m al costado para no aparecer dentro del árbol. Sustituye las ubicaciones aproximadas anteriores.

Continuación de escalones solicitada por Horacio: tres peldaños grises de 15 cm por el borde sur del cuadrado, desde el encuentro con la escalinata de cantina hasta 0,95 m antes del pilar cercano de la plaza techada. Tramo local x = 3, z = 12,9 a 27,4; salida hacia el jardín. Incluye rampa de colisión para circulación.

### Sector de ventas interior — 02/11/2026

La foto interior aportada por Horacio sitúa la venta a la izquierda al entrar. Sustituye el mostrador posterior provisional: vitrina frontal de perfiles negros y base de ladrillo hueco terracota, tres heladeras (una roja y dos oscuras), estantes con luz cálida, cafetera/molino, caja, pantalla suspendida, ventilador y rieles de focos bajo cenefa clara. No se modelan personas ni se usa la foto como textura. Las proporciones se estiman visualmente; resto de comedor y cocina siguen pendientes de relevamiento. Mesas izquierdas desplazadas hacia el centro para liberar la atención. Dos luces locales sin sombras adicionales.


## Piso y árbol según vista elevada — 02/11/2026

La vista elevada aportada por Horacio el 02/11/2026 orienta el acabado del piso: piezas rectangulares de aproximadamente 40 × 20 cm, gris cálido, juntas finas y variación mate. Textura procedural alineada entre explanada y unión con la plaza; contornos y tres escalones existentes conservados. Árbol en la posición indicada anteriormente: tronco delgado ligeramente inclinado, ramificación fina y copa de hojas pequeñas, alcorque ovalado y dos arbustos bajos. Medidas y especie siguen siendo aproximadas.


## Cantina: ventanas, salida y mostrador — 02/11/2026

Ajuste solicitado por Horacio sobre la captura interior: mostrador de 10,8 m a lo largo del lado izquierdo, caja en el extremo izquierdo bajo la TV y vitrina desplazada hacia la derecha. Pared posterior con siete paños horizontales entre 1,20 y 2,20 m sobre el piso interior. Puerta de blindex en el extremo derecho de esa pared, de 1,80 m de paso, representada abierta hacia fuera. Rellano y tres peldaños conectan con el jardín; muros y colisiones se recortan en el hueco. Dimensiones aproximadas de modelado.


## Reconstrucción interior según tres fotos — 02/11/2026

Las tres nuevas fotos interiores de Horacio corrigen la interpretación anterior: puerta junto al extremo posterior del mostrador (x local −4,30; z −6), en la pared opuesta al frente vidriado. Sustituye la puerta anterior en x +6,50. Ventana horizontal corrida desde la puerta hacia el comedor, cinco paños entre 1,03 y 1,85 m sobre el piso. Pared y viga de hormigón, cubierta oscura con estructura vista, franja inclinada de vidrio junto a fachada, tubos dobles suspendidos y tres splits. Comedor con ocho mesas cuadradas de madera, sillas negras metálicas/perforadas y tres mesas altas con banquetas bajo las ventanas. Caja conservada bajo la TV a la izquierda. Proporciones y número de muebles estimados; estas fotos sustituyen la distribución provisional anterior.


## Mostrador oblicuo y puerta al fondo — 02/11/2026

La nueva foto y aclaración de Horacio reemplazan la alineación recta anterior del sector de ventas: giro local de 0,10 rad (aprox. 5,7°), con el extremo derecho retirado. Mostrador continuo hasta el cerramiento izquierdo, con retorno y colisión que cierran ese acceso. Paso del personal únicamente por el extremo derecho, detrás del pilar. Puerta lateral llevada más al fondo, a x local −7,15 en la pared z −6, con paso de 1,40 m; sustituye la ubicación −4,30. Conjunto de atención centrado en (−6,55; −0,20), evitando intersección de su fondo con el muro exterior. Ángulo y medidas son aproximaciones visuales, pendientes de medición.


## Puerta en la pared del fondo — 02/11/2026

Corrección explícita de Horacio: puerta en la pared de ladrillo al final del pasillo, perpendicular al lateral de ventanas. Centro local (−9; −5,15), ancho 1,40 m. Se cierra el hueco anterior del lateral z = −6 y se prolonga su ventana. Recortados el muro del fondo y el respaldo del sector de ventas para liberar el acceso. Rellano y escalones girados con la puerta. Esta ubicación sustituye todas las ubicaciones anteriores sobre la pared de ventanas.


## Lateral de blindex y terraza techada — 02/11/2026

Por solicitud de Horacio, el muro opuesto al sector de ventas (x local +9) se sustituye por blindex de piso a cubierta, seis paños con una hoja corrida que abre el paso z = 2..4. Se retiran las lamas anteriores de ese lateral. Terraza de 5 × 14 m, entre x +9 y +14 y z −6..+8, a la cota del piso interior; mismo material de baldosas de la explanada, base maciza, tres mesas con seis sillas, cubierta liviana y tres columnas exteriores. Tres peldaños al jardín. Geometría aproximada para revisión, sin mover otros edificios.
## Dependencias del plano general — revisión local 02/11/2026

Fuente: plano general aportado por el usuario (`codex-clipboard-296323a6-7094-4c1f-9ab1-4e64cb8f9eec.png`). No tiene escala ni alturas. El usuario pidió incorporar los sectores faltantes y nombrar **Kampus Print** al edificio rotulado Laboratorio de Diseño. Sin confirmación de que ese sea su uso histórico.

Geometría adicional en `frontend/src/data/faculty-annexes.ts`, referida al centro actual de la cantina y al giro del conjunto. No se mueven ni reescalan Bloque 1, Bloque G, Manfred, Bedelía o cantina. Se reemplaza el antiguo volumen genérico de Electrónica por DEI–LED; no se duplica. Sus dimensiones y ubicación actualizadas quedan en `facultyBlueprint.electronics`.

| Sector | Id | Representación |
| --- | --- | --- |
| Laboratorio de Ingeniería | `lab-ingenieria` | Contorno con prolongación posterior, junto a la cantina |
| Laboratorio de Maquetas | `lab-maquetas` | Edificio separado debajo de Ingeniería en el plano |
| Kampus Print | `kampus-print` | Edificio independiente frente al lado exterior de Bloque 1 |
| CTA–DICIA | `cta-dicia` | Planta escalonada en L |
| DEI–LED | `dei-led` | Pabellón separado, con conexión cubierta al ala LED |
| LED | `led` | Primera dependencia del ala lateral |
| DA / CAP | `da-cap` | Segundo módulo; se conserva la denominación del plano |
| DAS | `das` | Tercer módulo |
| DG | `dg` | Extremo del ala lateral |

Formas y posiciones relativas interpretadas del plano; alturas, materiales, fachadas y medidas son aproximaciones. Exteriores con ventanas, accesos abiertos y rótulos; interior vacío, sin inventar mobiliario ni servicios. Todos aparecen en Explorar como «Por validar», con llegada exterior y orientación hacia su fachada. No se les asignaron fotografías de otros recintos. Caminos a nivel del suelo conectan los anexos con el sendero existente detrás de Manfred; la circulación rodea CTA–DICIA. El terreno de colisión se extiende al nuevo sector, sin añadir árboles ni recursos descargables.

El usuario autorizó integrar y subir este cambio a main el 02/11/2026.
